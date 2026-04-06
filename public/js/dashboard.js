console.log("✅ Dashboard JS Loaded");

// Get token
const token = localStorage.getItem("token");

// Redirect if not logged in
if (!token) {
    window.location.href = "/login.html";
}

/* ============================================================
   ✅ INITIAL LOAD
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
    loadUserInfo();
    loadVaultItems();

    // Live updates every 10s (pauses while typing)
    setInterval(() => {
        if (!isTyping) loadVaultItems();
    }, 10000);
});

/* Typing pause detection */
let isTyping = false;
document.addEventListener("input", (e) => {
    if (e.target.id === "searchInput") {
        isTyping = true;
        setTimeout(() => (isTyping = false), 1500);
    }
});

/* ============================================================
   ✅ LOAD USER INFO
============================================================ */
async function loadUserInfo() {
    try {
        const res = await fetch("/api/auth/user", {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) return;

        const user = await res.json();
        document.getElementById("userInfo").innerHTML = `
            <strong>Logged In As:</strong> ${user.username} (${user.email})<br>
            <strong>Subscription:</strong> ${user.isSubscribed ? "Active ✅" : "Inactive ❌"}
        `;
    } catch (err) {
        console.error("❌ Error loading user info:", err);
    }
}

/* ============================================================
   ✅ LOAD VAULT ITEMS (supports search + filter)
============================================================ */
async function loadVaultItems() {
    const container = document.getElementById("vaultItems");
    const countLabel = document.getElementById("itemsCount");

    const search = document.getElementById("searchInput").value;
    const status = document.getElementById("statusFilter").value;

    container.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary"></div>
            <div class="text-muted mt-2">Loading documents...</div>
        </div>
    `;

    try {
        const url = `/api/vault/items?search=${encodeURIComponent(search)}&status=${status}`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to load vault items");

        const items = await res.json();
        countLabel.textContent = `${items.length} document${items.length !== 1 ? "s" : ""}`;

        // Render card grid
        container.innerHTML = `
            <div class="vault-grid">
                ${items.map(buildCard).join("")}
            </div>
        `;

        attachViewButtons();
        attachNomineeButtons();

    } catch (err) {
        console.error("❌ Error fetching items:", err);
        container.innerHTML = `<div class="alert alert-danger">Failed to load documents.</div>`;
    }
}

/* ============================================================
   ✅ BUILD DOCUMENT CARD
============================================================ */
function buildCard(item) {
    const preview = item.extractedText
        ? escapeHtml(item.extractedText.substring(0, 120)) + "..."
        : "<em>Processing OCR...</em>";

    return `
        <div class="vault-card">
            <h5><i class="bi bi-file-earmark"></i> ${item.originalName}</h5>

            <div class="vault-meta">
                Size: ${(item.fileSize / 1024).toFixed(1)} KB<br>
                Uploaded: ${new Date(item.createdAt).toLocaleString()}
            </div>

            <span class="badge ${item.ocrStatus}">${item.ocrStatus}</span>

            <p class="mt-2" style="font-size:14px;">${preview}</p>

            <button 
                class="btn btn-sm btn-outline-primary w-100 mb-2 view-text"
                data-text="${escapeHtml(item.extractedText || "")}"
                data-filename="${item.originalName}">
                <i class="bi bi-eye"></i> View Extracted Text
            </button>

            <button 
                class="btn btn-sm btn-outline-success w-100 manage-nominee"
                data-id="${item._id}">
                <i class="bi bi-people"></i> Manage Nominees
            </button>
        </div>
    `;
}

/* ============================================================
   ✅ VIEW TEXT BUTTONS
============================================================ */
function attachViewButtons() {
    document.querySelectorAll(".view-text").forEach(btn => {
        btn.addEventListener("click", () => {
            alert(`📄 Extracted text from ${btn.dataset.filename}:\n\n${btn.dataset.text || "No text available yet."}`);
        });
    });
}

/* ============================================================
   ✅ NOMINEE MANAGEMENT BUTTONS
============================================================ */
function attachNomineeButtons() {
    document.querySelectorAll(".manage-nominee").forEach(btn => {
        btn.addEventListener("click", () => {
            const vaultId = btn.dataset.id;
            loadNominees(vaultId);

            const modal = new bootstrap.Modal(document.getElementById("nomineeModal"));
            modal.show();

            document.getElementById("addNomineeBtn").onclick = () => addNominee(vaultId);
        });
    });
}

/* ============================================================
   ✅ LOAD NOMINEES
============================================================ */
async function loadNominees(vaultId) {
    const listBox = document.getElementById("nomineeList");
    listBox.innerHTML = "Loading...";

    const res = await fetch(`/api/nominee/${vaultId}/list`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const nominees = await res.json();

    if (nominees.length === 0) {
        listBox.innerHTML = "<em>No nominees added yet.</em>";
        return;
    }

    listBox.innerHTML = nominees.map(n => `
        <div class="border rounded p-2 d-flex justify-content-between mb-2">
            <div>
                <strong>${n.name}</strong><br>
                <small>${n.relationship} • ${n.sharePercentage}%</small>
            </div>

            <button class="btn btn-sm btn-danger" onclick="removeNominee('${vaultId}','${n._id}')">
              <i class="bi bi-trash"></i>
            </button>
        </div>
    `).join("");
}

/* ============================================================
   ✅ ADD NOMINEE
============================================================ */
async function addNominee(vaultId) {
    const name = document.getElementById("nomineeName").value.trim();
    const email = document.getElementById("nomineeEmail").value.trim();
    const relationship = document.getElementById("nomineeRelationship").value.trim();
    const share = document.getElementById("nomineeShare").value.trim();

    if (!name || !email || !relationship || !share) {
        alert("All fields are required");
        return;
    }

    const res = await fetch(`/api/nominee/${vaultId}/add`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name,
            email,
            relationship,
            sharePercentage: share
        })
    });

    if (res.ok) {
        alert("✅ Nominee added");
        loadNominees(vaultId);
    }
}

/* ============================================================
   ✅ REMOVE NOMINEE
============================================================ */
async function removeNominee(vaultId, nomineeId) {
    if (!confirm("Are you sure you want to remove this nominee?")) return;

    const res = await fetch(`/api/nominee/${vaultId}/remove/${nomineeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
        loadNominees(vaultId);
    }
}

/* ============================================================
   ✅ FILE UPLOAD HANDLING
============================================================ */
document.getElementById("uploadForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById("document");
    const file = fileInput.files[0];

    if (!file) {
        showUploadStatus("❌ Please select a file", "danger");
        return;
    }

    const formData = new FormData();
    formData.append("document", file);

    setUploadLoading(true);
    showUploadStatus("Uploading & processing document...", "info");

    try {
        const res = await fetch("/api/vault/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        });

        const data = await res.json();
        if (res.ok) {
            showUploadStatus("✅ Document uploaded successfully!", "success");
            clearFile();
            loadVaultItems();
        } else {
            showUploadStatus("❌ " + data.message, "danger");
        }

    } catch (err) {
        showUploadStatus("❌ Upload failed: " + err.message, "danger");
    }

    setUploadLoading(false);
});

/* Upload UI Helpers */
function setUploadLoading(state) {
    const btn = document.getElementById("uploadButton");
    const spinner = document.getElementById("uploadSpinner");
    btn.disabled = state;
    spinner.classList.toggle("d-none", !state);
}

function showUploadStatus(message, type) {
    document.getElementById("uploadStatus").innerHTML = `
        <div class="alert alert-${type}">${message}</div>
    `;
}

function triggerFileInput() {
    document.getElementById("document").click();
}

function handleFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    document.getElementById("fileInfo").style.display = "block";
    document.getElementById("fileName").textContent = file.name;
    document.getElementById("fileSize").textContent = (file.size / 1024).toFixed(1) + " KB";
}

function clearFile() {
    document.getElementById("fileInfo").style.display = "none";
    document.getElementById("document").value = "";
}

/* HTML Escape Utility */
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

/* Expose nominee functions globally */
window.removeNominee = removeNominee;
window.triggerFileInput = triggerFileInput;
window.handleFileSelect = handleFileSelect;
window.clearFile = clearFile;