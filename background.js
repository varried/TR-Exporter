// Run item saves and clears in order, including each operation's storage read.
let itemStorageQueue = Promise.resolve();

function queueItemStorageOperation(operation) {
    const result = itemStorageQueue.then(operation);
    // Keep the queue usable after a failure while returning that failure to the caller.
    itemStorageQueue = result.catch(() => {});
    return result;
}

// Map of actions to their respective handlers
const actions = {
    saveData: async (request, sendResponse) => {
        try {
            const trimmedHref = processHref(request.href);
            const status = await queueItemStorageOperation(() =>
                saveDataToStorage(trimmedHref, request.rugType, request.year)
            );
            sendResponse({ status });
        } catch (err) {
            console.error("saveData error:", err);
            sendResponse({ status: 'Error saving' });
        }
    },

    exportToCSV: async (_, sendResponse) => {
        try {
            const status = await exportToCSV();
            sendResponse({ status });
        } catch (err) {
            console.error("exportToCSV error:", err);
            sendResponse({ status: 'Export failed' });
        }
    },

    clearStorage: async (_, sendResponse) => {
        try {
            const status = await queueItemStorageOperation(clearAddedItem);
            sendResponse({ status });
        } catch (err) {
            console.error("clearStorage error:", err);
            sendResponse({ status: 'Failed to clear dataValues' });
        }
    },

    clearListingIds: async (_, sendResponse) => {
        try {
            const status = await clearUploaded();
            sendResponse({ status });
        } catch (err) {
            console.error("clearListingIds error:", err);
            sendResponse({ status: 'Failed to clear etsyListingIds' });
        }
    },
};

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received:", request);

    const actionHandler = actions[request.action];
    if (actionHandler) {
        actionHandler(request, sendResponse);
        return true; // Keep message channel open for async response
    }
});

// Function to process the href value using a regular expression
function processHref(href) {
    const trimmedHref = href.replace(/\?.*$/, '');
    console.log('Processed Href:', trimmedHref);
    return trimmedHref;
}

// Function to save href, rug type, and year value to Chrome storage
async function saveDataToStorage(href, rugType, year) {
    const result = await chrome.storage.local.get({ dataValues: [] });
    const dataValues = result.dataValues;
    const hrefExists = dataValues.some(item => item.href === href);

    // Check if href already exists in storage
    if (hrefExists) {
        return 'Data already exists';
    }

    dataValues.push({ href, rugType, year });
    await chrome.storage.local.set({ dataValues });
    console.log(`Saved Href: ${href}, Rug Type: ${rugType}, Year: ${year}`);
    return 'Data saved successfully';
}

// Function to export data to CSV file
async function exportToCSV() {
    const result = await chrome.storage.local.get({ dataValues: [] });
    const { dataValues } = result;

    if (dataValues.length === 0) {
        console.warn("No links have been captured yet.");
        return 'No links to export';
    }

    const csvContent =
        "data:text/csv;charset=utf-8," +
        "URL,Type,Year\n" +
        dataValues.map(({ href, rugType, year }) => `${href},${rugType},${year}`).join("\n");

    await chrome.downloads.download({
        url: encodeURI(csvContent),
        filename: 'tr_exported_data.csv',
        conflictAction: 'overwrite',
        saveAs: true
    });

    console.log('CSV exported successfully');
    return 'CSV exported successfully';
}

// Function to clear added rug data
async function clearAddedItem() {
    await chrome.storage.local.remove('dataValues');
    console.log('dataValues cleared');
    return 'Data cleared';
}

// Function to clear uploaded listing IDs
async function clearUploaded() {
    await chrome.storage.local.remove('etsyListingIds');
    console.log('etsyListingIds cleared');
    return 'Uploaded cleared';
}
