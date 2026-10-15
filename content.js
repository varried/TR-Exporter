// Cached uploaded listing IDs Set (for fast O(1) lookup)
let cachedListingIdSet = null;

const listingCardSelector = "div[data-listings-container] div.wt-grid .v2-listing-card";

function refreshListingCards() {
    addCustomOption(document.querySelectorAll(`${listingCardSelector} .v2-listing-card__info`));
    updatePageItemNumbers();
}

// Count every card, including inventory matches and skipped items, in page order.
// No shop-wide offset or saved-export count participates in these numbers.
function updatePageItemNumbers() {
    document.querySelectorAll('div[data-listings-container]').forEach(container => {
        container.querySelectorAll('div.wt-grid .v2-listing-card').forEach((card, index) => {
            let label = card.querySelector('.tr-exporter-item-number');
            if (index >= 36) {
                label?.remove();
                card.classList.remove('tr-exporter-numbered-card');
                return;
            }
            const number = String(index + 1);
            if (!label) {
                label = document.createElement('span');
                label.classList.add('tr-exporter-item-number');
                card.appendChild(label);
            }
            card.classList.add('tr-exporter-numbered-card');
            if (label.textContent !== number) label.textContent = number;
            label.setAttribute('aria-label', `Item ${number} on this page`);
        });
    });
}

refreshListingCards();

// Set up a MutationObserver to detect changes (for next/prev Etsy AJAX pages)
let refreshScheduled = false;
const observer = new MutationObserver(mutationsList => {
    // Include removals and individual card insertions, not only whole-grid replacements.
    const elementsChanged = mutationsList.some(mutation =>
        [...mutation.addedNodes, ...mutation.removedNodes].some(node => node.nodeType === Node.ELEMENT_NODE));
    if (!elementsChanged || refreshScheduled) return;
    refreshScheduled = true;
    requestAnimationFrame(() => {
        refreshScheduled = false;
        refreshListingCards();
    });
});

// Start observing the document body for changes in child elements
observer.observe(document.body, { childList: true, subtree: true });

// Function to add custom 'Add to export' option to page
function addCustomOption(elements) {
    if (!elements || elements.length === 0) return;

    // If not cached yet, get from Chrome storage
    if (cachedListingIdSet === null) {
        chrome.storage.local.get('etsyListingIds', ({ etsyListingIds }) => {
            cachedListingIdSet = new Set(Array.isArray(etsyListingIds) ? etsyListingIds : []);
            processElements(elements);
        });
    } else {
        processElements(elements);
    }

    elements.forEach(function(element) {

         // Check if the container already exists to avoid duplicates
        if (!element.querySelector('.tr-exporter-container')) {

            // Create containers
            let container = document.createElement("div");
            container.classList.add("tr-exporter-container");

            let containerT = document.createElement("div");
            containerT.classList.add("turkish-container");

            let containerK = document.createElement("div");
            containerK.classList.add("kilim-container");

            let containerO = document.createElement("div");
            containerO.classList.add("overdyed-container");

            let containerP = document.createElement("div");
            containerP.classList.add("patchwork-container");

            // Create "button" options (rug type)
            let spanText_T = document.createElement("span");
            spanText_T.classList.add("turkish");
            spanText_T.textContent = "Turkish";

            let spanText_K = document.createElement("span");
            spanText_K.classList.add("kilim");
            spanText_K.textContent = "Kilim";

            let spanText_O = document.createElement("span");
            spanText_O.classList.add("overdyed");
            spanText_O.textContent = "Overdyed";

            let spanText_P = document.createElement("span");
            spanText_P.classList.add("patchwork");
            spanText_P.textContent = "Patchwork";

            // Create sub-options (year)
            let yearList = document.createElement('ul');
            yearList.classList.add("year-list");

            let sixties = document.createElement('li');
            sixties.classList.add("sixties");
            sixties.textContent = "1960";

            let seventies = document.createElement('li');
            seventies.classList.add("seventies");
            seventies.textContent = "1970";

            let eighties = document.createElement('li');
            eighties.classList.add("eighties");
            eighties.textContent = "1980";

            let nineties = document.createElement('li');
            nineties.classList.add("nineties");
            nineties.textContent = "1990";

            // Append everything
            yearList.appendChild(sixties);
            yearList.appendChild(seventies);
            yearList.appendChild(eighties);
            yearList.appendChild(nineties);

            containerT.appendChild(spanText_T);
            containerK.appendChild(spanText_K);
            containerO.appendChild(spanText_O);
            containerP.appendChild(spanText_P);

            //container.appendChild(checkmark);

            container.appendChild(containerT);
            container.appendChild(containerK);
            container.appendChild(containerO);
            container.appendChild(containerP);

            element.appendChild(container);

            // Variable to track the currently appended year list
            let currentYearListParent = null;

            // Function to handle span clicks and append year list
            function handleSpanClick(event) {
                event.preventDefault();
                // Get the parent div of the clicked span
                let parentDiv = event.target.parentNode;

                // If there is already a year list appended somewhere, remove it
                if (currentYearListParent && currentYearListParent !== parentDiv) {
                    let existingYearList = currentYearListParent.querySelector('.year-list');
                    if (existingYearList) {
                        currentYearListParent.removeChild(existingYearList);
                    }
                }

                // Check if the year list already exists in this parent div
                if (!parentDiv.querySelector('.year-list')) {
                    // Clone the year list so each span gets its own copy
                    let clonedYearList = yearList.cloneNode(true);

                    // Append the cloned year list to the parent div
                    parentDiv.appendChild(clonedYearList);

                    // Update the current parent div that holds the year list
                    currentYearListParent = parentDiv;

                    // Add event listener for each list item in the cloned year list
                    clonedYearList.querySelectorAll('li').forEach(listItem => {
                        listItem.addEventListener('click', function(event) {
                            event.preventDefault();
                            handleYearClick(event, element);  // Pass element for href and closest span retrieval
                        });
                    });
                }

                return;
            }

            async function handleYearClick(event, element) {
                const clickedYearItem = event.target;  // The clicked <li> element
 
                // (1) Get text content of clicked <li> item (year)
                const yearValue = clickedYearItem.textContent;
 
                // (2) Find the listing link within the surrounding card.
                const parentCard = element.closest('.v2-listing-card');
                const anchor = parentCard?.querySelector('a[href*="/listing/"]');
                const hrefValue = anchor ? anchor.href : null;
 
                // (3) Get text content of closest <span> (rug type) under same <div> as clicked <li>
                const closestSpanInDiv = clickedYearItem.closest('div').querySelector('span');
                const rugTypeValue = closestSpanInDiv ? closestSpanInDiv.textContent : null;
 
                if (hrefValue && rugTypeValue && yearValue) {
                    try {
                        const response = await chrome.runtime.sendMessage({
                            action: "saveData",
                            href: hrefValue,
                            rugType: rugTypeValue,
                            year: yearValue
                        });
                        console.log(response.status);
                        if (response.status === 'Data saved successfully') {
                            tempAlert(`Added - ${yearValue} ${rugTypeValue} Rug`, 1000);
                        } else if (response.status === 'Data already exists') {
                            tempAlert(`Data already exists!`, 1000);
                        }
                    } catch (err) {
                        console.error("sendMessage error:", err);
                    }
                }
            }

            // Disable redirect when clicking anywhere within main container
            container.addEventListener("click", function(event) {
                event.preventDefault();
            });

            // Add event listeners to each span for click events
            spanText_T.addEventListener('click', handleSpanClick);
            spanText_K.addEventListener('click', handleSpanClick);
            spanText_O.addEventListener('click', handleSpanClick);
            spanText_P.addEventListener('click', handleSpanClick);          
        }
    });
}

// Processes each listing card: highlight item already in CSV upload listing IDs
function processElements(elements) {
    elements.forEach(element => {
        // Climb up from .v2-listing-card__info to the nearest parent with a listing URL
        const parentCard = element.closest('.v2-listing-card');
        const anchor = parentCard ? parentCard.querySelector('a') : null;
        if (!anchor) return;

        const href = anchor.getAttribute('href');
        const match = href && href.match(/\/listing\/(\d+)/);
        const listingId = match ? match[1] : null;

        if (listingId && cachedListingIdSet.has(listingId)) {
            parentCard.classList.add('highlighted-etsy-item');
        }
    });
}

function tempAlert(msg,duration) {
    const el = document.createElement("div");
    el.classList.add("tr-custom-alert");
    el.innerHTML = msg;
    setTimeout(() => {
        el.parentNode.removeChild(el);
    }, duration);
    document.body.appendChild(el);
}
