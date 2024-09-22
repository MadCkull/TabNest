document.addEventListener("DOMContentLoaded", () => {
    const saveSessionButton = document.getElementById("save-session");
    const importButton = document.getElementById("import-sessions");
    const exportButton = document.getElementById("export-sessions");
    const fileInput = document.getElementById("file-input");
    const sessionsList = document.getElementById("sessions-list");
    let contextMenu;
    let sessionCounter = 0;

    saveSessionButton.addEventListener("click", saveSession);
    importButton.addEventListener("click", () => fileInput.click());
    exportButton.addEventListener("click", exportSessions);
    fileInput.addEventListener("change", importSessions);

    function saveSession() {
        chrome.runtime.sendMessage({ action: "saveSession", name: `Session ${String(++sessionCounter).padStart(3, '0')}` }, () => {
            loadSessions();
        });
    }

    function loadSessions() {
        sessionsList.innerHTML = "";
        chrome.storage.local.get("sessions", (data) => {
            const sessions = data.sessions || [];
            sessionCounter = sessions.length;
            sessions.reverse().forEach((session, index) => {
                const listItem = createSessionListItem(session, index);
                sessionsList.appendChild(listItem);
            });
        });
    }

    function createSessionListItem(session, index) {
        const listItem = document.createElement("li");
        listItem.innerHTML = `
            <div class="session-header">
                <span>${session.name}</span>
                <button class="open-button">Open</button>
            </div>
            <div class="session-details">
                <p>Tabs: ${session.tabs.length}</p>
                <p>Created: ${new Date(session.created).toLocaleString()}</p>
            </div>
        `;

        const openButton = listItem.querySelector(".open-button");
        openButton.addEventListener("click", (e) => openSession(e, session));

        listItem.querySelector(".session-header").addEventListener("click", (e) => {
            if (e.target !== openButton) {
                listItem.classList.toggle("expanded");
            }
        });

        listItem.addEventListener("contextmenu", (e) => showContextMenu(e, index));

        listItem.setAttribute("title", new Date(session.created).toLocaleTimeString());

        return listItem;
    }

    function openSession(e, session) {
        if (e.ctrlKey) {
            session.tabs.forEach((tab) => {
                chrome.tabs.create({ url: tab.url });
            });
        } else {
            chrome.tabs.query({ currentWindow: true }, (tabs) => {
                const tabIds = tabs.map(tab => tab.id);
                chrome.tabs.remove(tabIds);
                session.tabs.forEach((tab) => {
                    chrome.tabs.create({ url: tab.url });
                });
            });
        }
    }

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

    function deleteSession(index) {
        chrome.storage.local.get("sessions", (data) => {
            const sessions = data.sessions || [];
            sessions.splice(index, 1);
            chrome.storage.local.set({ sessions }, loadSessions);
        });
    }

    function importSessions(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedSessions = JSON.parse(e.target.result);
                    chrome.storage.local.get("sessions", (data) => {
                        const currentSessions = data.sessions || [];
                        const updatedSessions = [...currentSessions, ...importedSessions];
                        chrome.storage.local.set({ sessions: updatedSessions }, loadSessions);
                    });
                } catch (error) {
                    console.error("Error importing sessions:", error);
                    alert("Error importing sessions. Please check the file format.");
                }
            };
            reader.readAsText(file);
        }
    }

    function exportSessions() {
        chrome.storage.local.get("sessions", (data) => {
            const sessions = data.sessions || [];
            const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            chrome.downloads.download({
                url: url,
                filename: "tabnest_sessions.TabNest",
                saveAs: true
            });
        });
    }

    loadSessions();
});