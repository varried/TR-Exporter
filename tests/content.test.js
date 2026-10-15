const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');

// Small DOM fixture for card ordering and observer lifecycle, without Chrome storage.
function element() {
    const classes = new Set();
    return {
        nodeType: 1,
        children: [],
        attributes: {},
        textContent: '',
        classList: {
            add: name => classes.add(name),
            remove: name => classes.delete(name),
            contains: name => classes.has(name)
        },
        setAttribute(name, value) { this.attributes[name] = value; },
        appendChild(child) { child.parent = this; this.children.push(child); },
        remove() { this.parent.children.splice(this.parent.children.indexOf(this), 1); },
        querySelector(selector) {
            return this.children.find(child => child.classList.contains(selector.slice(1))) || null;
        }
    };
}

function setup(count = 36) {
    const container = { cards: Array.from({ length: count }, element) };
    container.querySelectorAll = () => container.cards;
    let observe;
    const frames = [];
    const context = vm.createContext({
        document: {
            body: {},
            createElement: element,
            querySelectorAll: selector => selector === 'div[data-listings-container]' ? [container] : []
        },
        Node: { ELEMENT_NODE: 1 },
        MutationObserver: class {
            constructor(callback) { observe = callback; }
            observe() {}
        },
        requestAnimationFrame: callback => frames.push(callback)
    });
    vm.runInContext(source, context);
    return {
        container,
        refresh: () => vm.runInContext('updatePageItemNumbers()', context),
        mutate(addedNodes = [], removedNodes = []) { observe([{ addedNodes, removedNodes }]); },
        flush() { frames.splice(0).forEach(callback => callback()); },
        frames,
        numbers: () => container.cards.map(card => card.querySelector('.tr-exporter-item-number')?.textContent)
    };
}

test('page positions include inventory matches, cap at 36, and do not duplicate on refresh', () => {
    const page = setup(37);
    page.container.cards[4].classList.add('highlighted-etsy-item');
    page.refresh();
    assert.deepEqual(page.numbers(), [...Array.from({ length: 36 }, (_, i) => String(i + 1)), undefined]);
    assert.ok(page.container.cards[4].classList.contains('highlighted-etsy-item'));
    assert.ok(page.container.cards.slice(0, 36).every(card => card.children.length === 1));
    assert.equal(page.container.cards[0].children[0].attributes['aria-label'], 'Item 1 on this page');
});

test('AJAX replacement restarts at 1, including a short final page', () => {
    const page = setup();
    const oldCards = page.container.cards;
    page.container.cards = Array.from({ length: 7 }, element);
    page.mutate(page.container.cards, oldCards);
    page.flush();
    assert.deepEqual(page.numbers(), ['1', '2', '3', '4', '5', '6', '7']);
});

test('single-card insertion, removal, and reorder renumber existing cards', () => {
    const page = setup(3);
    const inserted = element();
    page.container.cards.unshift(inserted);
    page.mutate([inserted]);
    page.flush();
    assert.deepEqual(page.numbers(), ['1', '2', '3', '4']);
    const removed = page.container.cards.splice(1, 1);
    page.container.cards.reverse();
    page.mutate([], removed);
    page.flush();
    assert.deepEqual(page.numbers(), ['1', '2', '3']);
    assert.equal(inserted.children[0].textContent, '3');
});

test('mutation batches schedule one refresh and label text changes do not loop', () => {
    const page = setup(2);
    page.mutate([element()]);
    page.mutate([element()]);
    assert.equal(page.frames.length, 1);
    page.flush();
    page.mutate([{ nodeType: 3 }], [{ nodeType: 3 }]);
    assert.equal(page.frames.length, 0);
});
