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
                <input type="checkbox" class="session-checkbox" id="session-${index}">
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
            if (e.target !== openButton && !e.target.classList.contains("session-checkbox")) {
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

    let isExporting = false;

    function exportSessions() {
        const checkboxes = document.querySelectorAll('.session-checkbox');
        const openButton = document.querySelectorAll('.open-button');

        if (!isExporting) {
            // First click: Show checkboxes and change button text
            checkboxes.forEach(checkbox => {
                checkbox.style.display = 'inline';
            });
            openButton.forEach(openButton => {
                openButton.style.display = 'none';
            });
            document.getElementById('export-sessions').innerHTML = "Done";
            isExporting = true; // Set flag to indicate the button is in "Done" mode
        } else {
            // Second click: Export selected sessions
            const selectedCheckboxes = document.querySelectorAll('.session-checkbox:checked');
            const selectedIndices = Array.from(selectedCheckboxes).map(checkbox =>
                parseInt(checkbox.id.split('-')[1])
            );

            if (selectedIndices.length === 0) {
                ResetExportButton()
                return;
            }

            chrome.storage.local.get("sessions", (data) => {
                const sessions = data.sessions || [];
                const selectedSessions = selectedIndices.map(index => sessions[sessions.length - 1 - index]);
                const blob = new Blob([JSON.stringify(selectedSessions, null, 2)], { type: "application/octet-stream" });
                const url = URL.createObjectURL(blob);
                chrome.downloads.download({
                    url: url,
                    filename: "tabnest_sessions.TabNest",
                    saveAs: true
                });
                ResetExportButton()
            });
        }
    }


    // Reset button and state
    function ResetExportButton() {
        const checkboxes = document.querySelectorAll('.session-checkbox');
        const openButton = document.querySelectorAll('.open-button');
        checkboxes.forEach(checkbox => {
            checkbox.style.display = 'none';
        });
        openButton.forEach(openButton => {
            openButton.style.display = 'inline';
        });
        document.getElementById('export-sessions').innerHTML = "Export";
        isExporting = false;
    }

    loadSessions();
});