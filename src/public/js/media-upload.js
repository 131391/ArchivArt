console.log('Media Upload Script loading...');
console.log('Script loaded at:', new Date().toISOString());

// Global variables
let currentMediaType = 'video';
let selectedFile = null;
let selectedScanningImage = null;

// Immediately make function available
function switchMediaType(mediaType) {
    console.log('switchMediaType called with:', mediaType);
    try {
        // Remove active from all tabs
        const allTabs = document.querySelectorAll('.media-tab');
        console.log('Found tabs:', allTabs.length);
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
        console.log('Updated currentMediaType to:', currentMediaType);
        
        // Clear form data on tab change
        clearFormData();
        
        // Update content
        updateContentForMediaType(mediaType);
        updateFormPlaceholders(mediaType);
    } catch (error) {
        console.error('Error in switchMediaType:', error);
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
        
        console.log('Form data cleared on tab change');
    } catch (error) {
        console.error('Error clearing form data:', error);
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
        console.error('Error in updateContentForMediaType:', error);
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
            case 'image':
                titleInput.placeholder = 'Enter image title';
                descriptionTextarea.placeholder = 'Enter image description';
                break;
        }
    } catch (error) {
        console.error('Error in updateFormPlaceholders:', error);
    }
}

// Make functions immediately available
window.switchMediaType = switchMediaType;
window.updateContentForMediaType = updateContentForMediaType;
window.updateFormPlaceholders = updateFormPlaceholders;
window.saveMedia = saveMedia;
console.log('switchMediaType function loaded and available globally');
console.log('Functions available:', {
    switchMediaType: typeof window.switchMediaType,
    updateContentForMediaType: typeof window.updateContentForMediaType,
    updateFormPlaceholders: typeof window.updateFormPlaceholders,
    saveMedia: typeof window.saveMedia
});

// Save Media Function
function saveMedia(event) {
    event.preventDefault();
    console.log('=== SAVE MEDIA FUNCTION CALLED ===');
    
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
    
    console.log('Form Data:', {
        mediaType: mediaType,
        title: title,
        description: description,
        mainFile: mainFile ? {
            name: mainFile.name,
            size: mainFile.size,
            type: mainFile.type
        } : null,
        scanningImage: scanningImage ? {
            name: scanningImage.name,
            size: scanningImage.size,
            type: scanningImage.type
        } : null
    });
    
    // Validation
    if (!title.trim()) {
        console.error('❌ Title is required');
        showNotification('Please enter a title for your media', 'error');
        return;
    }
    
    if (!mainFile) {
        console.error('❌ Main file is required');
        showNotification('Please select a file to upload', 'error');
        return;
    }
    
    if (!scanningImage) {
        console.error('❌ Scanning image is required');
        showNotification('Please select a scanning image', 'error');
        return;
    }
    
    console.log('✅ All validation passed');
    console.log('📤 Starting media upload process...');
    
    // Here you would typically send the data to your server
    // For now, we'll just log the success
    console.log('🎉 Media saved successfully!');
    console.log('📊 Upload Summary:', {
        mediaType: mediaType,
        title: title,
        description: description,
        mainFileSize: (mainFile.size / 1024 / 1024).toFixed(2) + ' MB',
        scanningImageSize: (scanningImage.size / 1024 / 1024).toFixed(2) + ' MB'
    });
    
    // Success message removed - no alert should appear after save media
}

// Test function to verify global scope
window.testFunction = function() {
    console.log('Global function test successful!');
};





document.addEventListener('DOMContentLoaded', function() {
    console.log('=== UPLOAD MEDIA SYSTEM INITIALIZED ===');
    console.log('DOM Content Loaded at:', new Date().toISOString());
    
    // Add a visual indicator that JavaScript is working
    const pageTitle = document.querySelector('h1');
    if (pageTitle) {
        pageTitle.style.borderLeft = '4px solid #7c3aed';
        pageTitle.style.paddingLeft = '12px';
        console.log('Page title found and styled');
    } else {
        console.log('Page title not found');
    }
    
    // Get elements first
    const mediaTabs = document.querySelectorAll('.media-tab');
    
    // Test if JavaScript is working
    console.log('JavaScript is running!');
    console.log('Found tabs:', mediaTabs.length);
    console.log('Tab elements:', mediaTabs);
    
    // Check if we're on the media upload page
    if (mediaTabs.length === 0) {
        console.log('Media tabs not found - not on media upload page');
        return;
    }
    
    // Add event listeners to tabs
    mediaTabs.forEach((tab, index) => {
        console.log(`Adding event listener to tab ${index}:`, tab);
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const mediaType = this.getAttribute('data-type');
            console.log('Tab clicked:', mediaType);
            console.log('Calling switchMediaType with:', mediaType);
            if (typeof switchMediaType === 'function') {
                switchMediaType(mediaType);
            } else {
                console.error('switchMediaType is not a function!');
            }
        });
    });
    
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    
    // Check if we're on the media upload page
    if (!dropZone || !fileInput) {
        console.log('Media upload elements not found - not on media upload page');
        return;
    }

    // Scanning image elements
    const scanningImageDropZone = document.getElementById('scanning-image-drop-zone');
    const scanningImageInput = document.getElementById('scanning-image-input');

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

    // Global variables are already declared at the top of the file

    // Tab switching functionality
    function switchTab(activeTab) {
        const mediaType = activeTab.getAttribute('data-type');
        currentMediaType = mediaType;
        
        console.log('Switching to tab:', mediaType);
        console.log('Active tab element:', activeTab);
        
        // Update tab appearance - remove active class from all tabs
        mediaTabs.forEach(tab => {
            tab.classList.remove('active');
            console.log('Removed active from tab:', tab.getAttribute('data-type'));
        });
        
        // Add active class to clicked tab
        activeTab.classList.add('active');
        console.log('Added active to tab:', mediaType);
        console.log('Active tab classes after:', activeTab.className);
        
        // Update content based on media type
        updateContentForMediaType(mediaType);
        
        // Update form placeholders based on media type
        updateFormPlaceholders(mediaType);
        
        console.log('Switched to tab:', mediaType);
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
            case 'image':
                titleInput.placeholder = 'Enter image title';
                descriptionTextarea.placeholder = 'Enter image description';
                break;
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
            case 'image':
                dropZone.querySelector('p:last-of-type').textContent = 'Drag and drop your image files here, or click to browse';
                chooseFilesBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>Choose Files';
                break;
        }
    }

    // Add click event listeners to tabs - Simplified approach
    mediaTabs.forEach((tab, index) => {
        console.log(`Adding click listener to tab ${index}:`, tab);
        
        // Remove any existing event listeners
        tab.onclick = null;
        
        // Add simple click handler
        tab.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Tab clicked:', this.getAttribute('data-type'));
            
            // Simple tab switching
            const mediaType = this.getAttribute('data-type');
            
            // Remove active from all tabs
            mediaTabs.forEach(t => t.classList.remove('active'));
            
            // Add active to clicked tab
            this.classList.add('active');
            
            // Update content
            updateContentForMediaType(mediaType);
            updateFormPlaceholders(mediaType);
            
            console.log('Tab switched to:', mediaType);
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
            
            console.log('Video tab set as active:', videoTab.classList.contains('active'));
            console.log('Video tab classes:', videoTab.className);
            console.log('Current media type:', currentMediaType);
        } else {
            console.error('Video tab not found!');
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
        console.log('handleFileSelection called with file:', file.name, 'type:', file.type);
        console.log('currentMediaType is:', currentMediaType);
        
        // Validate file type
        const config = mediaConfigs[currentMediaType];
        const isValidType = file.type.startsWith(currentMediaType + '/');
        
        console.log('File type check:', file.type, 'startsWith', currentMediaType + '/', '=', isValidType);
        
        if (!isValidType) {
            showNotification(`Please select a valid ${currentMediaType} file.`, 'error');
            return;
        }

        // Validate file size (100MB)
        const maxSize = 100 * 1024 * 1024; // 100MB in bytes
        if (file.size > maxSize) {
            showNotification('File size must be less than 100MB.', 'error');
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
    document.getElementById('remove-file').addEventListener('click', function() {
        clearFileSelection();
    });

    // Scanning image drag and drop functionality
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
        scanningImageInput.click();
    });

    document.getElementById('choose-scanning-image-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        scanningImageInput.click();
    });

    // Scanning image input change handler
    scanningImageInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleScanningImageSelection(e.target.files[0]);
        }
    });

    // Handle scanning image selection
    function handleScanningImageSelection(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showNotification('Please select a valid image file.', 'error');
            return;
        }

        // Validate file size (10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
            showNotification('Scanning image size must be less than 10MB.', 'error');
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
    document.getElementById('remove-scanning-image').addEventListener('click', function() {
        clearScanningImageSelection();
    });

    // Format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Form submission with AJAX
    document.getElementById('media-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form elements
        const submitButton = document.getElementById('submit-button');
        const originalButtonText = submitButton.innerHTML;
        const title = document.getElementById('media-title').value.trim();
        const description = document.getElementById('media-description').value.trim();
        
        // Validate required fields
        if (!title) {
            showNotification('Please enter a title', 'error');
            document.getElementById('media-title').focus();
            return;
        }
        
        if (!selectedFile) {
            showNotification('Please select a media file', 'error');
            return;
        }
        
        if (!selectedScanningImage) {
            showNotification('Please select a scanning image', 'error');
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
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            const result = await response.json();
            
            // Hide loader immediately after API response
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            
            if (response.ok && result.success) {
                showNotification('Media uploaded successfully!', 'success');
                
                // Reset form
                document.getElementById('media-form').reset();
                clearFileSelection();
                clearScanningImageSelection();
                
                // Reset to video tab
                document.querySelectorAll('.media-tab').forEach(tab => {
                    tab.classList.remove('active');
                    tab.style.backgroundColor = '#f9fafb';
                    tab.style.color = '#6b7280';
                    tab.style.border = '1px solid #e5e7eb';
                    tab.style.boxShadow = 'none';
                    tab.style.transform = 'none';
                    tab.style.fontWeight = '500';
                });
                
                const videoTab = document.querySelector('[data-type="video"]');
                videoTab.classList.add('active');
                videoTab.style.backgroundColor = '#ffffff';
                videoTab.style.color = '#374151';
                videoTab.style.border = '1px solid #e5e7eb';
                videoTab.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.06)';
                videoTab.style.transform = 'translateY(-1px)';
                videoTab.style.fontWeight = '600';
                
                updateContentForMediaType('video');
                updateFormPlaceholders('video');
                
            } else {
                showNotification('Error: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            
            // Hide loader on error
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            
            showNotification('Error uploading media. Please try again.', 'error');
        } finally {
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });

    // Notification system
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification fixed top-4 right-4 z-50 max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-300 ease-in-out`;
        
        // Set colors based on type
        let bgColor = 'bg-blue-50';
        let textColor = 'text-blue-800';
        let iconColor = 'text-blue-400';
        let icon = 'fas fa-info-circle';
        
        if (type === 'success') {
            bgColor = 'bg-green-50';
            textColor = 'text-green-800';
            iconColor = 'text-green-400';
            icon = 'fas fa-check-circle';
        } else if (type === 'error') {
            bgColor = 'bg-red-50';
            textColor = 'text-red-800';
            iconColor = 'text-red-400';
            icon = 'fas fa-exclamation-circle';
        } else if (type === 'warning') {
            bgColor = 'bg-yellow-50';
            textColor = 'text-yellow-800';
            iconColor = 'text-yellow-400';
            icon = 'fas fa-exclamation-triangle';
        }
        
        notification.innerHTML = `
            <div class="p-4">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <i class="${icon} ${iconColor}"></i>
                    </div>
                    <div class="ml-3 w-0 flex-1 pt-0.5">
                        <p class="text-sm font-medium ${textColor}">${message}</p>
                    </div>
                    <div class="ml-4 flex-shrink-0 flex">
                        <button class="bg-white rounded-md inline-flex ${textColor} hover:${textColor.replace('800', '600')} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()">
                            <span class="sr-only">Close</span>
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.transform = 'translateX(100%)';
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }

    // Add form submission event listener
    const mediaForm = document.getElementById('media-form');
    if (mediaForm) {
        console.log('Adding form submission event listener');
        mediaForm.addEventListener('submit', function(event) {
            console.log('Form submit event triggered');
            if (typeof saveMedia === 'function') {
                saveMedia(event);
            } else {
                console.error('saveMedia function not available');
            }
        });
    } else {
        console.log('Media form not found');
    }

    console.log('=== UPLOAD MEDIA SYSTEM READY ===');
});