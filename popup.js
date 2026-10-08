// Utilities: Promisify Chrome APIs
const sendMessage = (message) =>
    new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });

const getStorage = (keys) =>
    new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(result);
            }
        });
    });

const setStorage = (items) =>
    new Promise((resolve, reject) => {
        chrome.storage.local.set(items, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(result);
            }
        });
    });

// Export to CSV 
document.getElementById('export-btn').addEventListener('click', async () => {
    // Send a message to the background script to export href values to CSV
    const response = await sendMessage({ action: "exportToCSV" });
    if (response.status === 'CSV exported successfully') {
        alert("CSV exported successfully!");
    } else {
        alert("Failed to export CSV: " + response.status);
    }
});

// Clear added rug data
document.getElementById('clear-storage-btn').addEventListener('click', async () => {
    // Send a message to the background script to clear Chrome storage for added rug data
    const response = await sendMessage({ action: "clearStorage" });
    if (response.status === 'Data cleared') {
        alert("Data cleared successfully!");
    } else {
        alert("Failed to clear data: " + response.status);
    }
});

// Clear uploaded Listing IDs
document.getElementById('clear-listing-ids').addEventListener('click', async () => {
    // Send a message to the background script to clear Chrome storage for uploaded listing IDs
    const response = await sendMessage({ action: "clearListingIds" });
    if (response.status === 'Uploaded cleared') {
        alert("Uploaded IDs cleared successfully!");
    } else {
        alert("Failed to clear data: " + response.status);
    }
});

// DOM Ready 
document.addEventListener('DOMContentLoaded', () => {
    const counterElement = document.getElementById('storage-counter');
    const uploadStatus = document.getElementById('upload-status');

    // Function to fetch and update the added rug data counter
    async function updateCounter() {
        const result = await getStorage({ dataValues: [] });
        const count = result.dataValues.length || 0;
        counterElement.textContent = count;
    }

    // Function to fetch and update the uploaded listing ID count
    async function updateUploadedCount() {
        const result = await getStorage({ etsyListingIds: [] });
        const count = result.etsyListingIds.length || 0;
        uploadStatus.textContent = `Stored ${count} listing ID(s).`;
    }

    // Initial updates on popup load
    updateCounter();
    updateUploadedCount();

    // Live updates when storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.dataValues) updateCounter();
            if (changes.etsyListingIds) updateUploadedCount();
        }
    });
});

// Handle CSV file upload and parsing
document.getElementById('parse-upload-btn').addEventListener('click', function () {
    const fileInput = document.getElementById('csv-upload');
    const file = fileInput.files[0];

    // Show an error message if no file is selected
    if (!file) {
        document.getElementById('upload-status').textContent = 'Please select a file first.';
        return;
    }

    // Parse the CSV file using PapaParse
    Papa.parse(file, {
        header: false,         // Assume no headers in CSV
        skipEmptyLines: true,  // Ignore blank lines

        complete: async function (results) {
            try {
                // Extract the first column of each row and keep only numeric values
                const listingIds = results.data
                    .map(row => Array.isArray(row) ? row[0] : null)  // Get first column
                    .filter(id => /^\d+$/.test(id));                 // Keep only digits (valid Etsy listing IDs)

                // If no valid IDs found, show an error message
                if (listingIds.length === 0) {
                    document.getElementById('upload-status').textContent = 'No valid listing IDs found.';
                    return;
                }

                // Store the listing IDs in Chrome's local storage
                await setStorage({ etsyListingIds: listingIds });
            } catch (error) {
                console.error('Error storing listing IDs:', error);
                document.getElementById('upload-status').textContent = 'Failed to store listing IDs.';
            }
        },

        // Show an error if parsing fails
        error: function (error) {
            console.error('CSV parse error:', error);
            document.getElementById('upload-status').textContent = 'Failed to parse the file.';
        }
    });
});
