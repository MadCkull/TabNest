chrome.runtime.onInstalled.addListener(() => {
    console.log("TabNest installed and ready to save sessions!");
});

async function saveSession(name, saveAllTabs) {
    let windows;
    if (saveAllTabs) {
        windows = await chrome.windows.getAll({ populate: true });
    } else {
        const currentWindow = await chrome.windows.getCurrent({ populate: true });
        windows = [currentWindow];
    }

    const sessionTabs = windows.flatMap(window => window.tabs.map(tab => ({
        title: tab.title,
        url: tab.url
    })));

    const session = { name, tabs: sessionTabs, created: new Date().toISOString() };

    chrome.storage.local.get("sessions", (data) => {
        const sessions = data.sessions || [];
        sessions.push(session);
        chrome.storage.local.set({ sessions }, () => {
            // Notify popup to refresh sessions
            chrome.runtime.sendMessage({ action: "refreshSessions" });
        });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveSession") {
        const saveAllTabs = request.ctrlKey; // Check if Ctrl is pressed
        saveSession(request.name, saveAllTabs);
        sendResponse({});
    }
});
