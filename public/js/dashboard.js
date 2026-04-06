console.log("✅ Dashboard JS Loaded");

// Get token
const token = localStorage.getItem("token");

// Redirect if not logged in
document.addEventListener("DOMContentLoaded", () => {
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    loadUserInfo();
    loadVaultItems();
    initializeUploadHandler();

    // Auto refresh vault items
    setInterval(loadVaultItems, 3000);
});

/* ============================================================
   ✅ LOAD USER INFO
============================================================ */
async function loadUserInfo() {
    try {
        const response = await fetch("/api/auth/user", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            const user = await response.json();
            const userInfo = document.getElementById("userInfo");
            userInfo.innerHTML = `
                <strong>Logged in as:</strong> ${user.username} (${user.email})<br>
                <strong>Subscription Status:</strong> ${user.isSubscribed ? 'Active ✅' : 'Inactive ❌'}
            `;
        }
    } catch (err) {
        console.error("❌ Error loading user info:", err);
    }
}

/* ============================================================
   ✅ UPLOAD HANDLER
============================================================ */
function initializeUploadHandler() {
    const uploadForm = document.getElementById("uploadForm");
    const fileInput = document.getElementById("document");

    uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const file = fileInput.files[0];
        if (!file) {
            showUploadStatus("❌ Please select a file first", "danger");
            return;
        }

        const formData = new FormData();
        formData.append("document", file);

        setUploadLoading(true);
        showUploadStatus("Uploading and processing document...", "info");

        try {
            const res = await fetch("/api/vault/upload", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();
            if (res.ok && data.status === "success") {
                showUploadStatus("✅ " + data.message, "success");
                resetUploadForm();
                loadVaultItems();
            } else {
                showUploadStatus("❌ " + (data.message || "Upload failed"), "danger");
            }
        } catch (err) {
            console.error("❌ Upload error:", err);
            showUploadStatus("❌ " + err.message, "danger");
        } finally {
            setUploadLoading(false);
        }
    });
}

/* ============================================================
   ✅ LOAD VAULT ITEMS
============================================================ */
async function loadVaultItems() {
    const container = document.getElementById("vaultItems");
    const countLabel = document.getElementById("itemsCount");
    
    // ✅ Read search + filter values
    const searchValue = document.getElementById("searchInput")?.value || "";
    const statusValue = document.getElementById("statusFilter")?.value || "all";

    container.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary"></div>
            <div class="text-muted mt-2">Loading documents...</div>
        </div>
    `;

    try {
        const url = `/api/vault/items?search=${encodeURIComponent(searchValue)}&status=${encodeURIComponent(statusValue)}`;

        const res = await fetch(url, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const items = await res.json();

        // update count
        countLabel.textContent = `${items.length} document${items.length !== 1 ? "s" : ""}`;

        if (items.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    No documents uploaded yet.<br>
                    <small>Upload a property grant document to begin.</small>
                </div>
            `;
            return;
        }

        // Render cards
        container.innerHTML = `
            <div class="vault-grid">
                ${items.map(createVaultCard).join("")}
            </div>
        `;

        attachViewButtons();

    } catch (err) {
        console.error("❌ Error fetching items:", err);
        container.innerHTML = `
            <div class="alert alert-danger">
                Failed to load items. Please try again.
            </div>
        `;
    }
}

/* ============================================================
   ✅ CARD TEMPLATE
============================================================ */
function createVaultCard(item) {
    const status = item.ocrStatus || "pending";
    const badgeClass = status.toLowerCase();

    const preview = item.extractedText
        ? escapeHtml(item.extractedText.substring(0, 120)) + "..."
        : "<em>Processing OCR...</em>";

    const fileIcon = item.fileType.includes("pdf")
        ? "file-earmark-pdf text-danger"
        : "file-earmark-image text-primary";

    return `
        <div class="vault-card">
            <h5><i class="bi bi-${fileIcon} me-1"></i> ${item.originalName}</h5>

            <div class="vault-meta">
                Size: ${(item.fileSize / 1024).toFixed(1)} KB<br>
                Uploaded: ${new Date(item.createdAt).toLocaleString()}
            </div>

            <span class="badge ${badgeClass}">${status}</span>

            <p class="mt-2" style="font-size:14px;">${preview}</p>

            <button 
                class="btn btn-sm btn-outline-primary w-100 view-text"
                data-text="${escapeHtml(item.extractedText || '')}"
                data-filename="${item.originalName}">
                <i class="bi bi-eye"></i> View Extracted Text
            </button>
        </div>
    `;
}

/* ============================================================
   ✅ Attach event listeners to "View Text" buttons
============================================================ */
function attachViewButtons() {
    document.querySelectorAll(".view-text").forEach(btn => {
        btn.addEventListener("click", () => {
            const text = btn.getAttribute("data-text");
            const file = btn.getAttribute("data-filename");

            alert(`📄 Extracted text from ${file}:\n\n${text || "No text extracted yet."}`);
        });
    });
}

/* ============================================================
   ✅ Utility functions
============================================================ */
function showUploadStatus(message, type) {
    const div = document.getElementById("uploadStatus");
    div.innerHTML = `
        <div class="alert alert-${type}">${message}</div>
    `;
}

function setUploadLoading(isLoading) {
    const btn = document.getElementById("uploadButton");
    const spinner = document.getElementById("uploadSpinner");

    btn.disabled = isLoading;

    if (isLoading) {
        spinner.classList.remove("d-none");
        btn.innerHTML = "Processing...";
    } else {
        spinner.classList.add("d-none");
        btn.innerHTML = 'Upload & Process Document';
    }
}

function resetUploadForm() {
    document.getElementById("document").value = "";
    document.getElementById("fileInfo").style.display = "none";
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

/* ============================================================
   ✅ File selection helpers
============================================================ */
function triggerFileInput() {
    document.getElementById("document").click();
}

function handleFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    document.getElementById("fileName").textContent = file.name;
    document.getElementById("fileSize").textContent = (file.size / 1024).toFixed(1) + " KB";
    document.getElementById("fileInfo").style.display = "block";
}

function clearFile() {
    resetUploadForm();
}

// Expose functions globally (used by HTML)
window.triggerFileInput = triggerFileInput;
window.handleFileSelect = handleFileSelect;
window.clearFile = clearFile;


document.getElementById("searchInput").addEventListener("keyup", () => {
    loadVaultItems();
});

document.getElementById("statusFilter").addEventListener("change", () => {
    loadVaultItems();
});
