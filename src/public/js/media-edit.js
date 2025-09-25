// Global variables
let newScanningImageFile = null;

// Initialize media edit functionality
document.addEventListener('DOMContentLoaded', function() {
    
    const form = document.getElementById('edit-media-form');
    const submitBtn = document.getElementById('edit-submit-button');
    const submitText = document.getElementById('edit-submit-text');
    const cancelBtn = document.getElementById('edit-cancel-button');
    const mediaIdElement = document.getElementById('media-id');
    const mediaId = mediaIdElement ? mediaIdElement.value : null;

    // Scanning image upload handling
    const scanningImageInput = document.getElementById('edit-scanning-image-input');
    const scanningImageDropZone = document.getElementById('edit-scanning-image-drop-zone');
    const scanningImagePreview = document.getElementById('edit-scanning-image-preview');
    const scanningImageThumbnail = document.getElementById('edit-scanning-image-thumbnail');
    const scanningImageName = document.getElementById('edit-scanning-image-name');
    const scanningImageSize = document.getElementById('edit-scanning-image-size');
    const removeScanningImageBtn = document.getElementById('remove-edit-scanning-image');

    // Check if all required elements exist
    if (!form || !submitBtn || !submitText || !cancelBtn || !mediaId) {
        return;
    }

    // Click to upload
    if (scanningImageDropZone && scanningImageInput) {
        scanningImageDropZone.addEventListener('click', () => {
            scanningImageInput.click();
        });
    }

    // File input change
    if (scanningImageInput) {
        scanningImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleScanningImageFile(file);
            }
        });
    }

    // Drag and drop
    if (scanningImageDropZone) {
        scanningImageDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            scanningImageDropZone.classList.add('border-blue-400', 'bg-blue-50');
        });

        scanningImageDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            scanningImageDropZone.classList.remove('border-blue-400', 'bg-blue-50');
        });

        scanningImageDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            scanningImageDropZone.classList.remove('border-blue-400', 'bg-blue-50');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleScanningImageFile(files[0]);
            }
        });
    }

    function handleScanningImageFile(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showErrorToast('Please select an image file');
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            showErrorToast('File size must be less than 10MB');
            return;
        }

        newScanningImageFile = file;

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            if (scanningImageThumbnail) scanningImageThumbnail.src = e.target.result;
            if (scanningImageName) scanningImageName.textContent = file.name;
            if (scanningImageSize) scanningImageSize.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
            if (scanningImagePreview) scanningImagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    // Remove scanning image
    if (removeScanningImageBtn) {
        removeScanningImageBtn.addEventListener('click', () => {
            newScanningImageFile = null;
            if (scanningImageInput) scanningImageInput.value = '';
            if (scanningImagePreview) scanningImagePreview.classList.add('hidden');
        });
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        

        const errors = validateEditForm();
        if (errors.length > 0) {
            showErrorToast(errors.join(', '));
            return;
        }

        const originalText = submitText.textContent;
        submitBtn.disabled = true;
        submitText.textContent = 'Updating...';

        const formData = new FormData();
        const titleElement = document.getElementById('edit-title');
        const descriptionElement = document.getElementById('edit-description');
        const mediaTypeElement = document.getElementById('edit-media-type');
        const isActiveElement = document.getElementById('edit-is-active');
        
        formData.append('title', titleElement ? titleElement.value : '');
        formData.append('description', descriptionElement ? descriptionElement.value : '');
        formData.append('media_type', mediaTypeElement ? mediaTypeElement.value : '');
        formData.append('is_active', isActiveElement ? (isActiveElement.checked ? 'true' : 'false') : 'false');

        // Add new scanning image if selected
        if (newScanningImageFile) {
            formData.append('scanning_image', newScanningImageFile);
        }


        try {
            const response = await fetch(`/admin/media/${mediaId}/text`, {
                method: 'PUT',
                body: formData,
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });


            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                showSuccessToast('Media updated successfully!');
                setTimeout(() => {
                    window.location.href = `/admin/media/view/${mediaId}`;
                }, 1500);
            } else {
                showErrorToast(data.message || 'Error updating media');
            }
        } catch (error) {
            showErrorToast(`Error updating media: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitText.textContent = originalText;
        }
    });

    // Submit button click handler - manually trigger form submission
    submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Manually trigger the form submission
        const submitEvent = new Event('submit', {
            bubbles: true,
            cancelable: true
        });
        form.dispatchEvent(submitEvent);
    });

    // Cancel button
    cancelBtn.addEventListener('click', () => {
        window.location.href = `/admin/media/view/${mediaId}`;
    });

    function validateEditForm() {
        const errors = [];
        const titleElement = document.getElementById('edit-title');
        const mediaTypeElement = document.getElementById('edit-media-type');
        
        const title = titleElement ? titleElement.value.trim() : '';
        const mediaType = mediaTypeElement ? mediaTypeElement.value : '';

        if (!title) {
            errors.push('Title is required');
        }

        if (!mediaType) {
            errors.push('Media type is required');
        }

        return errors;
    }
});

