// Global variables
let currentMediaType = 'video';
let selectedFile = null;
let selectedScanningImage = null;

// Immediately make function available
function switchMediaType(mediaType) {
    try {
        // Remove active from all tabs
        const allTabs = document.querySelectorAll('.media-tab');    
        allTabs.forEach(tab => {
            tab.classList.remove('active');
            tab.style.setProperty('background-color', '#f9fafb', 'important');
            tab.style.setProperty('color', '#6b7280', 'important');
            tab.style.setProperty('border', '1px solid #e5e7eb', 'important');
            tab.style.setProperty('box-shadow', 'none', 'important');
            tab.style.setProperty('transform', 'none', 'important');
            tab.style.setProperty('font-weight', '500', 'important');
        });
        
        // Add active to clicked tab
        const activeTab = document.querySelector(`[data-type="${mediaType}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.style.setProperty('background-color', '#ffffff', 'important');
            activeTab.style.setProperty('color', '#374151', 'important');
            activeTab.style.setProperty('border', '1px solid #e5e7eb', 'important');
            activeTab.style.setProperty('box-shadow', '0 2px 4px -1px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.06)', 'important');
            activeTab.style.setProperty('transform', 'translateY(-1px)', 'important');
            activeTab.style.setProperty('font-weight', '600', 'important');
        }
        
        // Update current media type
        currentMediaType = mediaType;
        
        // Clear form data on tab change
        clearFormData();
        
        // Update content
        updateContentForMediaType(mediaType);
        updateFormPlaceholders(mediaType);
    } catch (error) {
    }
}

// Clear form data function
function clearFormData() {
    try {
        // Clear form inputs
        const titleInput = document.getElementById('media-title');
        const descriptionInput = document.getElementById('media-description');
        
        if (titleInput) titleInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
        
        // Clear file selections
        const fileInput = document.getElementById('file-input');
        const scanningImageInput = document.getElementById('scanning-image-input');
        
        if (fileInput) fileInput.value = '';
        if (scanningImageInput) scanningImageInput.value = '';
        
        // Clear file previews
        const filePreview = document.getElementById('file-preview');
        const scanningImagePreview = document.getElementById('scanning-image-preview');
        
        if (filePreview) filePreview.classList.add('hidden');
        if (scanningImagePreview) scanningImagePreview.classList.add('hidden');
        
        // Reset global variables
        selectedFile = null;
        selectedScanningImage = null;
        
    } catch (error) {
    }
}

// Helper functions (make them available immediately)
function updateContentForMediaType(mediaType) {
    try {
        const configs = {
            video: {
                title: 'Upload Video',
                subtitle: 'Supported formats: MP4, AVI, MOV (Max: 100MB)',
                icon: 'fas fa-camera',
                accept: 'video/*',
                detailsTitle: 'Video Details',
                detailsSubtitle: 'Additional information for your video',
                submitText: 'Save Media'
            },
            audio: {
                title: 'Upload Audio',
                subtitle: 'Supported formats: MP3, WAV, M4A, OGG (Max: 100MB)',
                icon: 'fas fa-music',
                accept: 'audio/*',
                detailsTitle: 'Audio Details',
                detailsSubtitle: 'Additional information for your audio',
                submitText: 'Save Media'
            },
            image: {
                title: 'Upload Image',
                subtitle: 'Supported formats: JPEG, PNG, GIF, WebP (Max: 100MB)',
                icon: 'fas fa-image',
                accept: 'image/*',
                detailsTitle: 'Image Details',
                detailsSubtitle: 'Additional information for your image',
                submitText: 'Save Media'
            }
        };
        
        const config = configs[mediaType];
        if (!config) return;
        
        // Update upload section
        const uploadTitle = document.getElementById('upload-title');
        const uploadSubtitle = document.getElementById('upload-subtitle');
        const uploadIcon = document.getElementById('upload-icon');
        const uploadText = document.getElementById('upload-text');
        
        if (uploadTitle) uploadTitle.textContent = config.title;
        if (uploadSubtitle) uploadSubtitle.textContent = config.subtitle;
        if (uploadIcon) uploadIcon.className = config.icon + ' text-2xl text-blue-600';
        if (uploadText) uploadText.textContent = config.title;
        
        // Update details section
        const detailsTitle = document.getElementById('details-title');
        const detailsSubtitle = document.getElementById('details-subtitle');
        const submitText = document.getElementById('submit-text');
        
        if (detailsTitle) detailsTitle.textContent = config.detailsTitle;
        if (detailsSubtitle) detailsSubtitle.textContent = config.detailsSubtitle;
        if (submitText) submitText.textContent = config.submitText;
    } catch (error) {
    }
}

function updateFormPlaceholders(mediaType) {
    try {
        const titleInput = document.getElementById('media-title');
        const descriptionTextarea = document.getElementById('media-description');
        
        if (!titleInput || !descriptionTextarea) return;
        
        switch(mediaType) {
            case 'video':
                titleInput.placeholder = 'Enter video title';
                descriptionTextarea.placeholder = 'Enter video description';
                break;
            case 'audio':
                titleInput.placeholder = 'Enter audio title';
                descriptionTextarea.placeholder = 'Enter audio description';
                break;
            // Image case removed - only video and audio are needed
            // case 'image':
            //     titleInput.placeholder = 'Enter image title';
            //     descriptionTextarea.placeholder = 'Enter image description';
            //     break;
        }
    } catch (error) {
    }
}

// Make functions immediately available
window.switchMediaType = switchMediaType;
window.updateContentForMediaType = updateContentForMediaType;
window.updateFormPlaceholders = updateFormPlaceholders;
window.saveMedia = saveMedia;

// Save Media Function
function saveMedia(event) {
    event.preventDefault();
    
    // Get form data
    const form = document.getElementById('media-form');
    const formData = new FormData(form);
    
    // Get current media type
    const activeTab = document.querySelector('.media-tab.active');
    const mediaType = activeTab ? activeTab.getAttribute('data-type') : 'video';
    
    // Get form values
    const title = document.getElementById('media-title').value;
    const description = document.getElementById('media-description').value;
    const mainFile = document.getElementById('file-input').files[0];
    const scanningImage = document.getElementById('scanning-image-input').files[0];
    
    
    
    // Validation
    if (!title.trim()) {
        showErrorToast('Please enter a title for your media');
        return;
    }
    
    if (!mainFile) {
        showErrorToast('Please select a file to upload');
        return;
    }
    
    if (!scanningImage) {
        showErrorToast('Please select a scanning image');
        return;
    }
}

document.addEventListener('DOMContentLoaded', function() {

    
    // Add a visual indicator that JavaScript is working
    const pageTitle = document.querySelector('h1');
    if (pageTitle) {
        pageTitle.style.borderLeft = '4px solid #7c3aed';
        pageTitle.style.paddingLeft = '12px';
    } else {
    }
    
    // Get elements first
    const mediaTabs = document.querySelectorAll('.media-tab');
    
    // Test if JavaScript is working
    
    // Check if we're on the media upload page
    if (mediaTabs.length === 0) {
        return;
    }
    
    // Add event listeners to tabs
    mediaTabs.forEach((tab, index) => {
        if (tab) {
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                const mediaType = this.getAttribute('data-type');
                if (typeof switchMediaType === 'function') {
                    switchMediaType(mediaType);
                }
            });
        }
    });
    
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    
    // Check if we're on the media upload page
    if (!dropZone || !fileInput) {
        console.warn('Media upload elements not found, skipping event listeners');
        return;
    }

    // Scanning image elements
    const scanningImageDropZone = document.getElementById('scanning-image-drop-zone');
    const scanningImageInput = document.getElementById('scanning-image-input');
    
    // Check if scanning image elements exist
    if (!scanningImageDropZone || !scanningImageInput) {
        console.warn('Scanning image elements not found, skipping scanning image event listeners');
    }

    // Media type configurations
    const mediaConfigs = {
        video: {
            title: 'Upload Video',
            subtitle: 'Supported formats: MP4, AVI, MOV (Max: 100MB)',
            icon: 'fas fa-camera',
            accept: 'video/*',
            detailsTitle: 'Video Details',
            detailsSubtitle: 'Additional information for your video',
            submitText: 'Save Media'
        },
        audio: {
            title: 'Upload Audio',
            subtitle: 'Supported formats: MP3, WAV, M4A, OGG (Max: 100MB)',
            icon: 'fas fa-music',
            accept: 'audio/*',
            detailsTitle: 'Audio Details',
            detailsSubtitle: 'Additional information for your audio',
            submitText: 'Save Media'
        },
        // Image configuration removed - only video and audio are needed
        // image: {
        //     title: 'Upload Image',
        //     subtitle: 'Supported formats: JPEG, PNG, GIF, WebP (Max: 100MB)',
        //     icon: 'fas fa-image',
        //     accept: 'image/*',
        //     detailsTitle: 'Image Details',
        //     detailsSubtitle: 'Additional information for your image',
        //     submitText: 'Save Media'
        // }
    };

    // Global variables are already declared at the top of the file

    // Tab switching functionality
    function switchTab(activeTab) {
        const mediaType = activeTab.getAttribute('data-type');
        currentMediaType = mediaType;
        
        
        // Update tab appearance - remove active class from all tabs
        mediaTabs.forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Add active class to clicked tab
        activeTab.classList.add('active');
        
        // Update content based on media type
        updateContentForMediaType(mediaType);
        
        // Update form placeholders based on media type
        updateFormPlaceholders(mediaType);
    }

    // Update form placeholders based on media type
    function updateFormPlaceholders(mediaType) {
        const titleInput = document.getElementById('media-title');
        const descriptionTextarea = document.getElementById('media-description');
        
        switch(mediaType) {
            case 'video':
                titleInput.placeholder = 'Enter video title';
                descriptionTextarea.placeholder = 'Enter video description';
                break;
            case 'audio':
                titleInput.placeholder = 'Enter audio title';
                descriptionTextarea.placeholder = 'Enter audio description';
                break;
            // Image case removed - only video and audio are needed
            // case 'image':
            //     titleInput.placeholder = 'Enter image title';
            //     descriptionTextarea.placeholder = 'Enter image description';
            //     break;
        }
    }

    // Update content based on media type
    function updateContentForMediaType(mediaType) {
        const config = mediaConfigs[mediaType];
        
        // Update upload section
        document.getElementById('upload-title').textContent = config.title;
        document.getElementById('upload-subtitle').textContent = config.subtitle;
        document.getElementById('upload-icon').className = config.icon + ' text-2xl text-blue-600';
        document.getElementById('upload-text').textContent = config.title;
        
        // Update details section
        document.getElementById('details-title').textContent = config.detailsTitle;
        document.getElementById('details-subtitle').textContent = config.detailsSubtitle;
        document.getElementById('submit-text').textContent = config.submitText;
        
        // Update file input accept
        fileInput.accept = config.accept;
        
        // Update drag and drop text based on media type
        updateDragDropText(mediaType);
        
        // Clear previous file selection
        clearFileSelection();
        clearScanningImageSelection();
    }

    // Update drag and drop text based on media type
    function updateDragDropText(mediaType) {
        const dropZone = document.getElementById('drop-zone');
        const uploadText = document.getElementById('upload-text');
        const chooseFilesBtn = document.getElementById('choose-files-btn');
        
        switch(mediaType) {
            case 'video':
                dropZone.querySelector('p:last-of-type').textContent = 'Drag and drop your video files here, or click to browse';
                chooseFilesBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>Choose Files';
                break;
            case 'audio':
                dropZone.querySelector('p:last-of-type').textContent = 'Drag and drop your audio files here, or click to browse';
                chooseFilesBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>Choose Files';
                break;
            // Image case removed - only video and audio are needed
            // case 'image':
            //     dropZone.querySelector('p:last-of-type').textContent = 'Drag and drop your image files here, or click to browse';
            //     chooseFilesBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>Choose Files';
            //     break;
        }
    }

    // Add click event listeners to tabs - Simplified approach
    mediaTabs.forEach((tab, index) => {
        
        // Remove any existing event listeners
        tab.onclick = null;
        
        // Add simple click handler
        tab.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Simple tab switching
            const mediaType = this.getAttribute('data-type');
            
            // Remove active from all tabs
            mediaTabs.forEach(t => t.classList.remove('active'));
            
            // Add active to clicked tab
            this.classList.add('active');
            
            // Update content
            updateContentForMediaType(mediaType);
            updateFormPlaceholders(mediaType);
            
        };
    });

    // Set video as default active tab
    setTimeout(() => {
        const videoTab = document.querySelector('[data-type="video"]');
        if (videoTab) {
            // Remove active class from all tabs first
            mediaTabs.forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Add active class to video tab
            videoTab.classList.add('active');
            
            // Update content
            updateContentForMediaType('video');
            // Update form placeholders
            updateFormPlaceholders('video');
            
        } else {
        }
    }, 200);

    // Add keyboard navigation for tabs
    mediaTabs.forEach((tab, index) => {
        tab.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                switchTab(this);
            }
        });
        
        // Add tabindex for keyboard navigation
        tab.setAttribute('tabindex', '0');
    });

    // Drag and drop functionality
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelection(files[0]);
        }
    });

    // Click to browse functionality
    dropZone.addEventListener('click', function() {
        fileInput.click();
    });

    document.getElementById('choose-files-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        fileInput.click();
    });

    // File input change handler
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });

    // Handle file selection
    function handleFileSelection(file) {
        
        // Validate file type
        const config = mediaConfigs[currentMediaType];
        const isValidType = file.type.startsWith(currentMediaType + '/');
        
        
        if (!isValidType) {
            showErrorToast(`Please select a valid ${currentMediaType} file.`);
            return;
        }

        // Validate file size (100MB)
        const maxSize = 100 * 1024 * 1024; // 100MB in bytes
        if (file.size > maxSize) {
            showErrorToast('File size must be less than 100MB.');
            return;
        }

        selectedFile = file;
        showFilePreview(file);
    }

    // Show file preview
    function showFilePreview(file) {
        const preview = document.getElementById('file-preview');
        const fileName = document.getElementById('file-name');
        const fileSize = document.getElementById('file-size');
        const fileIcon = document.getElementById('file-icon');
        
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        
        // Set appropriate icon based on file type
        const config = mediaConfigs[currentMediaType];
        fileIcon.className = config.icon + ' text-2xl text-gray-400';
        
        preview.classList.remove('hidden');
    }

    // Clear file selection
    function clearFileSelection() {
        selectedFile = null;
        document.getElementById('file-preview').classList.add('hidden');
        fileInput.value = '';
    }

    // Remove file handler
    const removeFileBtn = document.getElementById('remove-file');
    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', function() {
            clearFileSelection();
        });
    }

    // Scanning image drag and drop functionality
    if (scanningImageDropZone) {
        scanningImageDropZone.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });

        scanningImageDropZone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });

        scanningImageDropZone.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleScanningImageSelection(files[0]);
            }
        });

        // Click to browse scanning image
        scanningImageDropZone.addEventListener('click', function() {
            if (scanningImageInput) {
                scanningImageInput.click();
            }
        });
    }

    const chooseScanningImageBtn = document.getElementById('choose-scanning-image-btn');
    if (chooseScanningImageBtn && scanningImageInput) {
        chooseScanningImageBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            scanningImageInput.click();
        });
    }

    // Scanning image input change handler
    if (scanningImageInput) {
        scanningImageInput.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                handleScanningImageSelection(e.target.files[0]);
            }
        });
    }

    // Handle scanning image selection
    function handleScanningImageSelection(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showErrorToast('Please select a valid image file.');
            return;
        }

        // Validate file size (10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
            showErrorToast('Scanning image size must be less than 10MB.');
            return;
        }

        selectedScanningImage = file;
        showScanningImagePreview(file);
    }

    // Show scanning image preview
    function showScanningImagePreview(file) {
        const preview = document.getElementById('scanning-image-preview');
        const fileName = document.getElementById('scanning-image-name');
        const fileSize = document.getElementById('scanning-image-size');
        const thumbnail = document.getElementById('scanning-image-thumbnail');
        
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        
        // Create thumbnail
        const reader = new FileReader();
        reader.onload = function(e) {
            thumbnail.src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        preview.classList.remove('hidden');
    }

    // Clear scanning image selection
    function clearScanningImageSelection() {
        selectedScanningImage = null;
        document.getElementById('scanning-image-preview').classList.add('hidden');
        scanningImageInput.value = '';
    }

    // Remove scanning image handler
    const removeScanningImageBtn = document.getElementById('remove-scanning-image');
    if (removeScanningImageBtn) {
        removeScanningImageBtn.addEventListener('click', function() {
            clearScanningImageSelection();
        });
    }

    // Format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Form submission with AJAX
    const mediaForm = document.getElementById('media-form');
    if (mediaForm) {
        mediaForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form elements
        const submitButton = document.getElementById('submit-button');
        const originalButtonText = submitButton.innerHTML;
        const title = document.getElementById('media-title').value.trim();
        const description = document.getElementById('media-description').value.trim();
        
        // Validate required fields
        if (!title) {
            showErrorToast('Please enter a title');
            document.getElementById('media-title').focus();
            return;
        }
        
        if (!selectedFile) {
            showErrorToast('Please select a media file');
            return;
        }
        
        if (!selectedScanningImage) {
            showErrorToast('Please select a scanning image');
            return;
        }
        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Uploading...';
        
        // Create FormData
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('media_type', currentMediaType);
        formData.append('media_file', selectedFile);
        formData.append('scanning_image', selectedScanningImage);
        
        try {
            const response = await fetch('/admin/media/upload', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            // Hide loader immediately after API response
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Upload error:', errorText);
                
                // Try to parse JSON error response for user-friendly message
                let errorMessage = `Upload failed (${response.status})`;
                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                } catch (parseError) {
                    // If JSON parsing fails, use the raw error text but truncate if too long
                    errorMessage = errorText.length > 100 ? errorText.substring(0, 100) + '...' : errorText;
                }
                
                showErrorToast(errorMessage);
                return;
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Show success notification using global toaster
                showSuccessToast('Media uploaded successfully!', 2000);
                
                // Wait a moment for the notification to show, then redirect
                setTimeout(() => {
                    window.location.href = '/admin/media';
                }, 1500);
                
            } else {
                // Handle error response
                const errorMessage = result.message || 'Upload failed. Please try again.';
                showErrorToast('Error: ' + errorMessage);
            }
        } catch (error) {
            
            // Hide loader on error
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            
            showErrorToast('Error uploading media. Please try again.');
        } finally {
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
    }

    // Back button functionality
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', function() {
            // Go back to media list page
            window.location.href = '/admin/media';
        });
    }

    // Using global toaster system for notifications

    // Form submission is already handled above at line 714
    // No need for duplicate handlers

});