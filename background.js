chrome.runtime.onInstalled.addListener(() => {
    console.log("Session Saver installed and ready to save sessions!");
});

// Function to save the current session
async function saveSession() {
    const windows = await chrome.windows.getAll({ populate: true });
    const sessionTabs = windows.flatMap(window => window.tabs.map(tab => ({
        title: tab.title,
        url: tab.url
    })));

    const sessionName = `Session - ${new Date().toLocaleString()}`;
    const session = { name: sessionName, tabs: sessionTabs };

    chrome.storage.local.get("sessions", (data) => {
        const sessions = data.sessions || [];
        sessions.push(session);
        chrome.storage.local.set({ sessions });
    });
}

// Listen for messages to save the session
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveSession") {
        saveSession();
        sendResponse({}); // Send an empty response
    }
});