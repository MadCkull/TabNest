document.addEventListener("DOMContentLoaded", () => {
    const saveSessionButton = document.getElementById("save-session");
    const sessionsList = document.getElementById("sessions-list");
    let contextMenu;

    // Save the current session when the button is clicked
    saveSessionButton.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "saveSession" }, () => {
            loadSessions();
        });
    });

    // Load saved sessions and display them
    function loadSessions() {
        sessionsList.innerHTML = "";
        chrome.storage.local.get("sessions", (data) => {
            const sessions = data.sessions || [];
            sessions.forEach((session, index) => {
                const listItem = document.createElement("li");
                listItem.textContent = session.name;
                const openButton = document.createElement("button");
                openButton.textContent = "Open";
                openButton.addEventListener("click", (e) => openSession(e, session));
                listItem.appendChild(openButton);
                listItem.addEventListener("contextmenu", (e) => showContextMenu(e, index));
                sessionsList.appendChild(listItem);
            });
        });
    }

    // Open the saved session
    function openSession(e, session) {
        if (e.ctrlKey) {
            // Add to current window
            session.tabs.forEach((tab) => {
                chrome.tabs.create({ url: tab.url });
            });
        } else {
            // Replace current window
            chrome.tabs.query({ currentWindow: true }, (tabs) => {
                const tabIds = tabs.map(tab => tab.id);
                chrome.tabs.remove(tabIds);
                session.tabs.forEach((tab) => {
                    chrome.tabs.create({ url: tab.url });
                });
            });
        }
    }

    // Show context menu
    function showContextMenu(e, index) {
        e.preventDefault();
        if (contextMenu) contextMenu.remove();

        contextMenu = document.createElement("div");
        contextMenu.className = "context-menu";
        contextMenu.innerHTML = `
            <ul>
                <li data-action="rename">Rename</li>
                <li data-action="delete">Delete</li>
            </ul>
        `;
        document.body.appendChild(contextMenu);

        contextMenu.style.top = `${e.clientY}px`;
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.display = "block";

        contextMenu.addEventListener("click", (event) => {
            const action = event.target.dataset.action;
            if (action === "rename") {
                renameSession(index);
            } else if (action === "delete") {
                deleteSession(index);
            }
            contextMenu.remove();
        });

        document.addEventListener("click", () => {
            if (contextMenu) contextMenu.remove();
        }, { once: true });
    }

    // Rename session
    function renameSession(index) {
        chrome.storage.local.get("sessions", (data) => {
            const sessions = data.sessions || [];
            const newName = prompt("Enter new session name:", sessions[index].name);
            if (newName) {
                sessions[index].name = newName;
                chrome.storage.local.set({ sessions }, loadSessions);
            }
        });
    }

    // Delete session
    function deleteSession(index) {
        if (confirm("Are you sure you want to delete this session?")) {
            chrome.storage.local.get("sessions", (data) => {
                const sessions = data.sessions || [];
                sessions.splice(index, 1);
                chrome.storage.local.set({ sessions }, loadSessions);
            });
        }
    }

    loadSessions(); // Load sessions on popup open
});