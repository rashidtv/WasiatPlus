console.log("✅ Dashboard JS Loaded");

const token = localStorage.getItem("token");

// Redirect if not logged in
if (!token) window.location.href = "/login.html";

/* ============================================================
   ✅ Load User Info
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
   ✅ Load Vault Items (search + filter enabled)
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

        const items = await res.json();
        countLabel.textContent = `${items.length} document${items.length !== 1 ? "s" : ""}`;

        container.innerHTML = `
            <div class="vault-grid">
                ${items.map(buildCard).join("")}
            </div>
        `;

        attachViewButtons();

    } catch (err) {
        console.error("❌ Error fetching items:", err);
        container.innerHTML = `<div class="alert alert-danger">Failed to load items.</div>`;
    }
}

/* ============================================================
   ✅ Build Vault Card
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

            <button class="btn btn-sm btn-outline-primary w-100 view-text"
                data-text="${escapeHtml(item.extractedText || "")}"
                data-filename="${item.originalName}">
                <i class="bi bi-eye"></i> View Extracted Text
            </button>
        </div>
    `;
}

function attachViewButtons() {
    document.querySelectorAll(".view-text").forEach(btn => {
        btn.addEventListener("click", () => {
            alert(`📄 Extracted text from ${btn.dataset.filename}:\n\n${btn.dataset.text || "No text available yet."}`);
        });
    });
}

/* ============================================================
   ✅ Upload Handler
============================================================ */
document.getElementById("uploadForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById("document");
    const file = fileInput.files[0];

    if (!file) {
        showUploadStatus("❌ No file selected", "danger");
        return;
    }

    const formData = new FormData();
    formData.append("document", file);

    setUploadLoading(true);
    showUploadStatus("Uploading & processing...", "info");

    try {
        const res = await fetch("/api/vault/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        });

        const data = await res.json();
        if (res.ok) {
            showUploadStatus("✅ File uploaded successfully!", "success");
            clearFile();
            loadVaultItems();
        } else {
            showUploadStatus("❌ Upload failed: " + data.message, "danger");
        }
    } catch (err) {
        showUploadStatus("❌ Error: " + err.message, "danger");
    }

    setUploadLoading(false);
});

function setUploadLoading(loading) {
    const btn = document.getElementById("uploadButton");
    const spinner = document.getElementById("uploadSpinner");

    btn.disabled = loading;
    spinner.classList.toggle("d-none", !loading);
}

function showUploadStatus(msg, type) {
    document.getElementById("uploadStatus").innerHTML = `
        <div class="alert alert-${type}">${msg}</div>
    `;
}

/* ============================================================
   ✅ File Input Helpers
============================================================ */
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
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

/* ============================================================
   ✅ Auto-Refresh (Smart)
============================================================ */
let isTyping = false;
document.getElementById("searchInput").addEventListener("input", () => {
    isTyping = true;
    setTimeout(() => (isTyping = false), 1500);
});

setInterval(() => {
    if (!isTyping) loadVaultItems();
}, 10000);

/* INITIAL LOAD */
loadUserInfo();
loadVaultItems();