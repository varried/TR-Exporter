document.getElementById('export-btn').addEventListener('click', function() {
    // Send a message to the background script to export href values to CSV
    chrome.runtime.sendMessage({ action: "exportToCSV" }, function(response) {
        if (response.status === 'CSV exported successfully') {
            alert("CSV exported successfully!");
        } else {
            alert("Failed to export CSV: " + response.status);
        }
    });
});

document.getElementById('clear-storage-btn').addEventListener('click', function() {
    // Send a message to the background script to clear Chrome storage
    chrome.runtime.sendMessage({ action: "clearStorage" }, function(response) {
        if (response.status === 'Storage cleared') {
            alert("Storage cleared successfully!");
        } else {
            alert("Failed to clear storage: " + response.status);
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const counterElement = document.getElementById('storage-counter');
    const clearButton = document.getElementById('clear-storage-btn');

    // Function to fetch and update the counter
    function updateCounter() {
        chrome.storage.local.get({ dataValues: [] }, (result) => {
            const count = result.dataValues.length || 0; // Count the number of items
            counterElement.textContent = count; // Update the counter in the popup
        });
    }

    // Clear storage and reset counter
    clearButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "clearStorage" }, (response) => {
            if (response.status === 'Storage cleared') {
                updateCounter(); // Reset counter to zero
            } else {
                alert("Failed to clear storage.");
            }
        });
    });

    // Update the counter on popup load
    updateCounter();

    // Listen for changes in Chrome storage and update the counter dynamically
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.dataValues) {
            updateCounter();
        }
    });
});