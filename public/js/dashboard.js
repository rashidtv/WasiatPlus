console.log('Dashboard JavaScript loaded');

// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const uploadStatus = document.getElementById('uploadStatus');
const vaultItems = document.getElementById('vaultItems');
const fileInput = document.getElementById('document');

// Get token from localStorage
const dashboardToken = localStorage.getItem('token');
console.log('Token exists:', !!dashboardToken);

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM fully loaded');
    
    if (!dashboardToken) {
        console.log('No token, redirecting to home');
        window.location.href = '/';
        return;
    }
    
    // Load user info
    loadUserInfo();
    
    // Initialize everything
    initializeUploadHandler();
    loadVaultItems();
    
    console.log('✅ Dashboard initialized');
});

// Load user information
async function loadUserInfo() {
    try {
        const response = await fetch('/api/auth/user', {
            headers: {
                'Authorization': `Bearer ${dashboardToken}`
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            const userInfo = document.getElementById('userInfo');
            if (userInfo) {
                userInfo.innerHTML = `
                    <strong>Logged in as:</strong> ${user.username} (${user.email})<br>
                    <strong>Subscription Status:</strong> ${user.isSubscribed ? 'Active' : 'Inactive'}
                `;
            }
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

function initializeUploadHandler() {
    if (!uploadForm) {
        console.error('Upload form not found');
        return;
    }

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('📤 Upload form submitted');
        
        const file = fileInput.files[0];
        console.log('Selected file:', file);
        
        if (!file) {
            console.log('❌ No file selected');
            showUploadStatus('Please select a file first', 'danger');
            return;
        }

        console.log('File details:', {
            name: file.name,
            size: file.size,
            type: file.type
        });

        const formData = new FormData();
        formData.append('document', file);
        console.log('FormData created');

        setUploadLoading(true);
        showUploadStatus('Uploading and processing document...', 'info');
        console.log('Sending upload request...');

        try {
            const response = await fetch('/api/vault/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${dashboardToken}`
                },
                body: formData
            });

            console.log('Response status:', response.status);
            
            if (response.status === 502) {
                throw new Error('Server is temporarily unavailable');
            }
            
            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok && data.status === 'success') {
                console.log('✅ Upload successful');
                showUploadStatus('✅ ' + data.message, 'success');
                resetUploadForm();
                loadVaultItems();
            } else {
                console.log('❌ Upload failed:', data.message);
                showUploadStatus('❌ ' + (data.message || 'Upload failed'), 'danger');
            }
        } catch (error) {
            console.error('❌ Upload error:', error);
            if (error.message.includes('502')) {
                showUploadStatus('🚨 Server unavailable. Try again soon.', 'warning');
            } else {
                showUploadStatus('❌ Error: ' + error.message, 'danger');
            }
        } finally {
            setUploadLoading(false);
            console.log('Upload process completed');
        }
    });
}

// Load user's vault items
async function loadVaultItems() {
    const vaultItemsContainer = document.getElementById('vaultItems');
    const itemsCount = document.getElementById('itemsCount');
    
    if (!vaultItemsContainer) {
        console.error('❌ vaultItems container not found');
        return;
    }

    try {
        // Show loading state
        vaultItemsContainer.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="text-muted mt-2">Loading documents...</div>
            </div>
        `;

        const response = await fetch('/api/vault/items', {
            headers: {
                'Authorization': `Bearer ${dashboardToken}`
            }
        });

        if (response.status === 502) {
            throw new Error('Server is temporarily unavailable');
        }

        if (!response.ok) {
            throw new Error(`Server returned ${response.status} status`);
        }

        const items = await response.json();
        displayVaultItems(items);
        
    } catch (error) {
        console.error('❌ Error loading vault items:', error);
        displayErrorState(error.message);
    }
}

// Display vault items safely
function displayVaultItems(items) {
  const vaultItemsContainer = document.getElementById('vaultItems');
  const itemsCount = document.getElementById('itemsCount');

  if (!vaultItemsContainer) return;

  // Update count
  if (itemsCount) {
    itemsCount.textContent = `${items.length} document${items.length !== 1 ? 's' : ''}`;
  }

  if (items.length === 0) {
    vaultItemsContainer.innerHTML = `
      <div class="text-center py-4">
        <div class="text-muted">No documents uploaded yet.</div>
        <small class="text-muted">Upload your first property grant to get started!</small>
      </div>
    `;
    return;
  }

    // Safely create HTML content
   // Create grid of cards
  vaultItemsContainer.innerHTML = `
    <div class="row g-3">
      ${items.map(item => `
        <div class="col-md-6 col-lg-4">
          <div class="card h-100 shadow-sm vault-item border-0">
            <div class="card-body d-flex flex-column">
              <div class="d-flex align-items-start mb-2">
                <i class="bi bi-file-earmark-${item.fileType?.includes('pdf') ? 'pdf text-danger' : 'image text-primary'} fs-3 me-2"></i>
                <div>
                  <h6 class="mb-1">${item.originalName || item.name}</h6>
                  <small class="text-muted">
                    <i class="bi bi-calendar me-1"></i>
                    ${new Date(item.createdAt).toLocaleDateString()}
                  </small>
                </div>
              </div>

              <div class="mt-auto">
                <div class="mb-2">
                  <span class="badge rounded-pill bg-${getStatusColor(item.ocrStatus)} me-1">
                    ${item.ocrStatus || 'completed'}
                  </span>
                  ${item.isProcessed ? `<span class="badge rounded-pill bg-success">Processed</span>` : ''}
                </div>
                <div class="d-flex gap-2">
                  ${item.extractedText ? `
                    <button class="btn btn-sm btn-outline-primary flex-grow-1 view-text"
                            data-text="${escapeHtml(item.extractedText)}" 
                            data-filename="${item.originalName}">
                      <i class="bi bi-eye me-1"></i>View
                    </button>
                  ` : ''}
                  <a href="${item.fileUrl || '#'}" target="_blank" class="btn btn-sm btn-outline-secondary flex-grow-1">
                    <i class="bi bi-download me-1"></i>Download
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;


  // Attach view text handlers
  setTimeout(() => {
    const viewButtons = vaultItemsContainer.querySelectorAll('.view-text');
    viewButtons.forEach(button => {
      button.addEventListener('click', () => {
        const text = button.getAttribute('data-text');
        const filename = button.getAttribute('data-filename');
        alert(`📄 Extracted text from ${filename}:\n\n${text}`);
      });
    });
  }, 100);
}

// Display error state
function displayErrorState(errorMessage) {
    const vaultItemsContainer = document.getElementById('vaultItems');
    
    if (!vaultItemsContainer) return;

    vaultItemsContainer.innerHTML = `
        <div class="alert alert-warning">
            <h6><i class="bi bi-exclamation-triangle me-2"></i>Unable to load documents</h6>
            <p class="mb-1">${errorMessage || 'Please try again later'}</p>
            <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadVaultItems()">
                <i class="bi bi-arrow-clockwise me-1"></i>Try Again
            </button>
        </div>
    `;
}

// File handling functions
function triggerFileInput() {
    const fileInput = document.getElementById('document');
    if (fileInput) fileInput.click();
}

function handleFileSelect(input) {
    const file = input.files[0];
    const fileInfo = document.getElementById('fileInfo');
    const uploadButton = document.getElementById('uploadButton');
    
    if (file && fileInfo && uploadButton) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = formatFileSize(file.size);
        fileInfo.style.display = 'block';
        uploadButton.disabled = false;
    }
}

function clearFile() {
    const fileInput = document.getElementById('document');
    const fileInfo = document.getElementById('fileInfo');
    const uploadButton = document.getElementById('uploadButton');
    
    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.style.display = 'none';
    if (uploadButton) uploadButton.disabled = true;
}

// Helper functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatusColor(status) {
    const colors = {
        'completed': 'success',
        'processing': 'warning',
        'pending': 'secondary',
        'failed': 'danger'
    };
    return colors[status] || 'success';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function resetUploadForm() {
    const fileInput = document.getElementById('document');
    const fileInfo = document.getElementById('fileInfo');
    
    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.style.display = 'none';
}

function showUploadStatus(message, type = 'info') {
    const statusDiv = document.getElementById('uploadStatus');
    if (statusDiv) {
        statusDiv.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }
}

function setUploadLoading(isLoading) {
    const button = document.getElementById('uploadButton');
    const spinner = document.getElementById('uploadSpinner');
    
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        if (spinner) spinner.classList.remove('d-none');
        button.innerHTML = 'Processing...';
    } else {
        button.disabled = false;
        if (spinner) spinner.classList.add('d-none');
        button.innerHTML = 'Upload & Process Document';
    }
}

// Logout functionality
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutBtnBottom = document.getElementById('logoutBtnBottom');
    
    function handleLogout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
    
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (logoutBtnBottom) logoutBtnBottom.addEventListener('click', handleLogout);
}

// Make functions globally available
window.loadVaultItems = loadVaultItems;
window.triggerFileInput = triggerFileInput;
window.handleFileSelect = handleFileSelect;
window.clearFile = clearFile;

// Setup logout on load
document.addEventListener('DOMContentLoaded', setupLogout);