chrome.runtime.onInstalled.addListener(() => {
    console.log("TabNest installed and ready to save sessions!");
});

async function saveSession(name) {
    const windows = await chrome.windows.getAll({ populate: true });
    const sessionTabs = windows.flatMap(window => window.tabs.map(tab => ({
        title: tab.title,
        url: tab.url
    })));

    const session = { name, tabs: sessionTabs, created: new Date().toISOString() };

    chrome.storage.local.get("sessions", (data) => {
        const sessions = data.sessions || [];
        sessions.push(session);
        chrome.storage.local.set({ sessions });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveSession") {
        saveSession(request.name);
        sendResponse({});
    }
});