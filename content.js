// Initial setup: Add custom option (Add to export option) on initial page load
let initialElements = document.querySelectorAll("div[data-listings-container] div.wt-grid .v2-listing-card .v2-listing-card__info");
addCustomOption(initialElements);

// Set up a MutationObserver to watch for changes in the DOM
const observer = new MutationObserver((mutationsList, observer) => {
    mutationsList.forEach(mutation => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    let newElements = node.querySelectorAll("div[data-listings-container] div.wt-grid .v2-listing-card .v2-listing-card__info");
                    addCustomOption(newElements);
                }
            });
        }
    });
});

// Start observing the document body for changes in child elements
observer.observe(document.body, { childList: true, subtree: true });

// Function to add custom 'Add to export' option to page
function addCustomOption(elements) {

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

            // Create an image element for the checkmark icon
            /*
            let checkmark = document.createElement("img");
            checkmark.src = chrome.runtime.getURL("checkmark-24.png");
            checkmark.classList.add("tr-checkmark");
            */

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

            function handleYearClick(event, element) {
                const clickedYearItem = event.target;  // The clicked <li> element
 
                // (1) Get text content of clicked <li> item (year)
                const yearValue = clickedYearItem.textContent;
 
                // (2) Get href value from closest <a> tag of this element's parent <div>
                const parentWithHref = element.closest('a');
                const hrefValue = parentWithHref ? parentWithHref.href : null;
 
                // (3) Get text content of closest <span> (rug type) under same <div> as clicked <li>
                const closestSpanInDiv = clickedYearItem.closest('div').querySelector('span');
                const rugTypeValue = closestSpanInDiv ? closestSpanInDiv.textContent : null;
 
                if (hrefValue && rugTypeValue && yearValue) {
                    chrome.runtime.sendMessage({
                        action: "saveData",
                        href: hrefValue,
                        rugType: rugTypeValue,
                        year: yearValue
                    }, function(response) {
                        console.log(response.status);
                        if (response.status === 'Data saved successfully') {
                            tempAlert(`Added - ${yearValue} ${rugTypeValue} Rug`, 1000);
                        } else if (response.status === 'Data already exists') {
                            tempAlert(`Data already exists!`, 1000);
                        }
                    });
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

function tempAlert(msg,duration) {
    var el = document.createElement("div");
    el.classList.add("tr-custom-alert");
    el.innerHTML = msg;
    setTimeout(function(){
        el.parentNode.removeChild(el);
    },duration);
     document.body.appendChild(el);
}