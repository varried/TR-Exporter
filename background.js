// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("Message received:", request);
    if (request.action === "saveData") {
        // Process the href before saving it
        let trimmedHref = processHref(request.href);
        saveDataToStorage(trimmedHref, request.rugType, request.year, sendResponse);
        return true;  // Keep message channel open for async response
    } else if (request.action === "exportToCSV") {
        exportToCSV(sendResponse);
        return true;
    } else if (request.action === "clearStorage") {
        clearStorage(sendResponse);
        return true;
    }
});

// Function to process the href value using a regular expression
function processHref(href) {
    // Remove query parameters
    let trimmedHref = href.replace(/\?.*$/, '');
    console.log('Processed Href:', trimmedHref);
    return trimmedHref;
}

// Function to save href, rug type, and year value to Chrome storage
function saveDataToStorage(href, rugType, year, sendResponse) {
    chrome.storage.local.get({ dataValues: [] }, function(result) {
        let dataValues = result.dataValues;

        // Check if href already exists in storage
        let hrefExists = dataValues.some(item => item.href === href);

        if (!hrefExists) {
            dataValues.push({ href: href, rugType: rugType, year: year });

            chrome.storage.local.set({ dataValues: dataValues }, function() {
                if (chrome.runtime.lastError) {
                    console.error("Error saving:", chrome.runtime.lastError);
                    sendResponse({ status: 'Error saving' });
                } else {
                    console.log(`Saved Href: ${href}, Rug Type: ${rugType}, Year: ${year}`);
                    sendResponse({ status: 'Data saved successfully' });
                }
            });
        } else {
          sendResponse({ status: 'Data already exists' });
        }
    });
}

// Function to export data to CSV file
function exportToCSV(sendResponse) {
    chrome.storage.local.get({ dataValues: [] }, function(result) {
        let dataValues = result.dataValues;

        if (dataValues.length === 0) {
            console.warn("No links have been captured yet.");
            sendResponse({ status: 'No links to export' });
            return;
        }

        // Create CSV content with headers and rows for each entry
        let csvContent = "data:text/csv;charset=utf-8," + 
                         "URL,Type,Year\n" +  // Adding headers
                         dataValues.map(item => `${item.href},${item.rugType},${item.year}`).join("\n");

        // Use chrome.downloads API to download the CSV file
        chrome.downloads.download({
            url: encodeURI(csvContent),
            filename: 'tr_exported_data.csv',
            conflictAction: 'overwrite',
            saveAs: true
        }, function(downloadId) {
            if (chrome.runtime.lastError) {
                console.error("Download error:", chrome.runtime.lastError);
                sendResponse({ status: 'Download failed' });
            } else {
                console.log('CSV exported successfully');
                sendResponse({ status: 'CSV exported successfully' });
            }
        });
    });
}

// Function to clear stored data
function clearStorage(sendResponse) {
    chrome.storage.local.clear(function() {
        if (chrome.runtime.lastError) {
            console.error("Error clearing storage:", chrome.runtime.lastError);
            sendResponse({ status: 'Failed to clear storage' });
        } else {
            console.log('All storage cleared');
            sendResponse({ status: 'Storage cleared' });
        }
    });
}