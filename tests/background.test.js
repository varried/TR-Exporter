const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));

function createBackground({ failFirstWrite = false } = {}) {
    let listener;
    const storage = {};
    const context = vm.createContext({
        console: { log() {}, warn() {}, error() {} },
        chrome: {
            runtime: { onMessage: { addListener(fn) { listener = fn; } } },
            storage: {
                local: {
                    async get(defaults) {
                        // Chrome returns a separate snapshot, not a shared array.
                        const snapshot = structuredClone({ ...defaults, ...storage });
                        await tick();
                        return snapshot;
                    },
                    async set(values) {
                        await tick();
                        if (failFirstWrite) {
                            failFirstWrite = false;
                            throw new Error('Simulated storage failure');
                        }
                        Object.assign(storage, structuredClone(values));
                    },
                    async remove(key) {
                        await tick();
                        delete storage[key];
                    }
                }
            }
        }
    });
    vm.runInContext(source, context);
    return {
        storage,
        send(request) {
            return new Promise(resolve => {
                assert.equal(listener(request, {}, resolve), true);
            });
        }
    };
}

const saveRequest = id => ({
    action: 'saveData',
    href: `https://www.etsy.com/listing/${id}/rug?ref=shop`,
    rugType: 'Turkish',
    year: '1960'
});

test('rapid saves retain every selected item', async () => {
    const background = createBackground();
    const requests = Array.from({ length: 50 }, (_, i) => saveRequest(i + 1));
    const responses = await Promise.all(requests.map(request => background.send(request)));
    assert.ok(responses.every(response => response.status === 'Data saved successfully'));
    assert.deepEqual(
        background.storage.dataValues.map(item => item.href),
        requests.map(request => request.href.split('?')[0])
    );
});

test('overlapping saves of the same item do not create duplicates', async () => {
    const background = createBackground();
    const responses = await Promise.all([
        background.send(saveRequest(1)),
        background.send(saveRequest(1))
    ]);
    assert.deepEqual(responses.map(response => response.status), [
        'Data saved successfully', 'Data already exists'
    ]);
    assert.equal(background.storage.dataValues.length, 1);
});

test('clear between saves removes earlier items and preserves later selections', async () => {
    const background = createBackground();
    const responses = await Promise.all([
        background.send(saveRequest(1)),
        background.send({ action: 'clearStorage' }),
        background.send(saveRequest(2))
    ]);
    assert.deepEqual(responses.map(response => response.status), [
        'Data saved successfully', 'Data cleared', 'Data saved successfully'
    ]);
    assert.deepEqual(background.storage.dataValues.map(item => item.href), [
        'https://www.etsy.com/listing/2/rug'
    ]);
});

test('a failed save reports an error without blocking later saves', async () => {
    const background = createBackground({ failFirstWrite: true });
    const responses = await Promise.all([
        background.send(saveRequest(1)),
        background.send(saveRequest(2))
    ]);
    assert.deepEqual(responses.map(response => response.status), [
        'Error saving', 'Data saved successfully'
    ]);
    assert.deepEqual(background.storage.dataValues.map(item => item.href), [
        'https://www.etsy.com/listing/2/rug'
    ]);
});
