// Media Management JavaScript Functions

// Enhanced formatter functions for custom columns
function formatMediaTitle(item) {
    const title = typeof item === 'object' ? item.title : item;
    const mediaType = typeof item === 'object' ? item.media_type : '';
    const filePath = typeof item === 'object' ? item.file_path : '';
    
    if (!title) return '<span class="text-gray-400 italic">No title</span>';
    
    // Get appropriate icon based on media type
    let iconClass = 'fas fa-file';
    let iconColor = 'text-gray-600';
    let bgColor = 'bg-gray-100';
    
    if (mediaType) {
        switch (mediaType.toLowerCase()) {
            case 'image':
                iconClass = 'fas fa-image';
                iconColor = 'text-blue-600';
                bgColor = 'bg-blue-100';
                break;
            case 'video':
                iconClass = 'fas fa-video';
                iconColor = 'text-purple-600';
                bgColor = 'bg-purple-100';
                break;
            case 'audio':
                iconClass = 'fas fa-music';
                iconColor = 'text-green-600';
                bgColor = 'bg-green-100';
                break;
            case 'document':
                iconClass = 'fas fa-file-alt';
                iconColor = 'text-yellow-600';
                bgColor = 'bg-yellow-100';
                break;
            default:
                iconClass = 'fas fa-file';
                iconColor = 'text-gray-600';
                bgColor = 'bg-gray-100';
        }
    }
    
    return `
        <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
                <div class="w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center">
                    <i class="${iconClass} ${iconColor} text-sm"></i>
                </div>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate" title="${title}">${title}</p>
            </div>
        </div>
    `;
}

function formatMediaDescription(item) {
    const description = typeof item === 'object' ? item.description : item;
    
    if (!description) return '<span class="text-gray-400 italic">No description</span>';
    
    // Truncate long descriptions
    const truncated = description.length > 50 ? description.substring(0, 50) + '...' : description;
    
    return `
        <div class="max-w-xs">
            <p class="text-sm text-gray-900" title="${description}">${truncated}</p>
        </div>
    `;
}

function formatScanningImage(item) {
    const scanningImage = typeof item === 'object' ? item.scanning_image : item;
    
    if (!scanningImage) {
        return `
            <div class="flex items-center space-x-2">
                <i class="fas fa-image text-gray-400 text-xs"></i>
                <span class="text-gray-400 italic text-xs">No image</span>
            </div>
        `;
    }
    
    return `
        <div class="flex items-center space-x-2">
            <i class="fas fa-image text-blue-500 text-xs"></i>
            <span class="text-xs text-gray-500 truncate max-w-20">${scanningImage.split('/').pop()}</span>
        </div>
    `;
}

function formatMediaType(item) {
    const mediaType = typeof item === 'object' ? item.media_type : item;
    
    if (!mediaType) return '<span class="text-gray-400 italic">Unknown</span>';
    
    const typeConfig = {
        'image': { icon: 'fas fa-image', color: 'text-blue-600', bg: 'bg-blue-100' },
        'video': { icon: 'fas fa-video', color: 'text-purple-600', bg: 'bg-purple-100' },
        'audio': { icon: 'fas fa-music', color: 'text-green-600', bg: 'bg-green-100' },
        'document': { icon: 'fas fa-file-alt', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    };
    
    const config = typeConfig[mediaType.toLowerCase()] || { icon: 'fas fa-file', color: 'text-gray-600', bg: 'bg-gray-100' };
    
    return `
        <div class="flex items-center space-x-2">
            <div class="w-6 h-6 ${config.bg} rounded flex items-center justify-center">
                <i class="${config.icon} ${config.color} text-xs"></i>
            </div>
            <span class="text-sm font-medium text-gray-900 capitalize">${mediaType}</span>
        </div>
    `;
}

function formatFileSize(item) {
    const fileSize = typeof item === 'object' ? item.file_size : item;
    
    if (!fileSize || fileSize === 0) return '<span class="text-gray-400 italic">Unknown</span>';
    
    const sizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
    
    return `
        <div class="flex items-center space-x-2">
            <i class="fas fa-hdd text-gray-500 text-xs"></i>
            <span class="text-sm text-gray-900 font-mono">${sizeInMB} MB</span>
        </div>
    `;
}

function formatMediaStatus(item) {
    const isActive = typeof item === 'object' ? item.is_active : item;
    
    if (isActive) {
        return `
            <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                <span class="text-sm font-medium text-green-800">Active</span>
            </div>
        `;
    } else {
        return `
            <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-red-400 rounded-full"></div>
                <span class="text-sm font-medium text-red-800">Inactive</span>
            </div>
        `;
    }
}

function formatMediaDate(item) {
    const date = typeof item === 'object' ? item.created_at : item;
    
    if (!date) return '<span class="text-gray-400 italic">Unknown</span>';
    
    const dateObj = new Date(date);
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `
        <div class="flex items-center space-x-2">
            <i class="fas fa-calendar text-gray-500 text-xs"></i>
            <span class="text-sm text-gray-900 font-mono">${day}/${month}/${year}</span>
        </div>
    `;
}

function formatUploadedBy(item) {
    const uploadedBy = typeof item === 'object' ? item.uploaded_by_name : item;
    
    if (!uploadedBy) return '<span class="text-gray-400 italic">Unknown</span>';
    
    // Get user initials - handle edge cases
    const nameParts = uploadedBy.trim().split(' ').filter(part => part.length > 0);
    const initials = nameParts.length > 0 
        ? nameParts.map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : uploadedBy.substring(0, 2).toUpperCase();
    
    return `
        <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span class="text-white font-semibold text-xs">${initials}</span>
                </div>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">${uploadedBy}</p>
            </div>
        </div>
    `;
}

// Make sure all formatters are available globally
window.formatMediaTitle = formatMediaTitle;
window.formatMediaDescription = formatMediaDescription;
window.formatScanningImage = formatScanningImage;
window.formatMediaType = formatMediaType;
window.formatFileSize = formatFileSize;
window.formatMediaStatus = formatMediaStatus;
window.formatMediaDate = formatMediaDate;
window.formatUploadedBy = formatUploadedBy;

// Trigger formatter application immediately if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof window.TableUtils !== 'undefined' && typeof window.TableUtils.applyCustomFormatters === 'function') {
            setTimeout(() => {
                window.TableUtils.applyCustomFormatters();
            }, 100);
        }
    });
} else {
    // DOM is already ready
    if (typeof window.TableUtils !== 'undefined' && typeof window.TableUtils.applyCustomFormatters === 'function') {
        setTimeout(() => {
            window.TableUtils.applyCustomFormatters();
        }, 100);
    }
}

// Media management functions
function viewMedia(mediaId) {
    
    // Show loader
    if (typeof showAjaxLoader === 'function') {
        showAjaxLoader({
            title: 'Loading Media Details...',
            message: 'Fetching media information'
        });
    }
    
    fetch(`/admin/media/${mediaId}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            // Hide loader
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            
            if (data.success) {
                const media = data.media;
                const mediaDetails = `
                    <div class="space-y-4">
                        <div class="flex items-center space-x-4">
                            ${media.media_type === 'image' ? 
                                `<img class=\"h-16 w-16 rounded-lg object-cover\" src=\"${typeof mediaUrl === 'function' ? '${mediaUrl("' + media.file_path + '")}' : '/uploads/media/' + media.file_path}\" alt=\"${media.title}\">` :
                                `<div class="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                                    <i class="fas fa-${media.media_type === 'video' ? 'video' : 'music'} text-gray-500"></i>
                                </div>`
                            }
                            <div>
                                <h4 class="text-lg font-medium text-gray-900">${media.title}</h4>
                                <p class="text-sm text-gray-500">${media.media_type}</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Description</label>
                                <p class="mt-1 text-sm text-gray-900">${media.description || 'No description'}</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Scanning Image</label>
                                <p class="mt-1 text-sm text-gray-900">${media.scanning_image}</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Status</label>
                                <p class="mt-1 text-sm text-gray-900">${media.is_active ? 'Active' : 'Inactive'}</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">File Size</label>
                                <p class="mt-1 text-sm text-gray-900">${(media.file_size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Created</label>
                                <p class="mt-1 text-sm text-gray-900">${new Date(media.created_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Uploaded By</label>
                                <p class="mt-1 text-sm text-gray-900">${media.uploaded_by_name || 'Unknown'}</p>
                            </div>
                        </div>
                    </div>
                `;
                const mediaDetailsEl = document.getElementById('mediaDetails');
                if (mediaDetailsEl) {
                    mediaDetailsEl.innerHTML = mediaDetails;
                }
                
                // Show modal with animation
                const modal = document.getElementById('viewMediaModal');
                const modalContainer = document.getElementById('viewMediaModalContainer');
                if (modal) {
                    modal.classList.remove('hidden');
                    
                    // Trigger animation
                    setTimeout(() => {
                        if (modalContainer) {
                            modalContainer.classList.remove('scale-95', 'opacity-0');
                            modalContainer.classList.add('scale-100', 'opacity-100');
                        }
                    }, 10);
                }
            } else {
                showErrorToast('Error loading media details');
            }
        })
        .catch(error => {
            // Hide loader
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            console.error('Error in viewMedia:', error);
            showErrorToast('Error loading media details: ' + error.message);
        });
}

function editMedia(mediaId) {
    // Redirect to dedicated edit page
    window.location.href = `/admin/media/edit/${mediaId}`;
}

function toggleMediaStatus(mediaId) {
    
    if (typeof showConfirmModal === 'function') {
        showConfirmModal(
            'Toggle Media Status',
            'Are you sure you want to toggle the status of this media?',
            () => performToggleMediaStatus(mediaId)
        );
    } else if (confirm('Are you sure you want to toggle the status of this media?')) {
        performToggleMediaStatus(mediaId);
    }
}

function performToggleMediaStatus(mediaId) {
    // Show loader
    if (typeof showFormLoader === 'function') {
        showFormLoader({
            title: 'Updating Status...',
            message: 'Please wait while we update the media status'
        });
    }
    
    fetch(`/admin/media/${mediaId}/toggle`, {
        method: 'PATCH',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            // Hide loader
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            
            if (data.success) {
                showSuccessToast(data.message);
                // Reload table data
                if (typeof TableUtils !== 'undefined' && typeof TableUtils.loadTableData === 'function') {
                    TableUtils.loadTableData();
                } else {
                    location.reload();
                }
            } else {
                showErrorToast('Error updating media status: ' + data.message);
            }
        })
        .catch(error => {
            // Hide loader
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            console.error('Toggle media status error:', error);
            showErrorToast('Error updating media status: ' + error.message);
        });
}

function deleteMedia(mediaId) {
    
    if (typeof showDeleteModal === 'function') {
        showDeleteModal(
            'Are you sure you want to delete this media? This action cannot be undone.',
            'Confirm Delete',
            function() {
                performDeleteMedia(mediaId);
            }
        );
    } else if (confirm('Are you sure you want to delete this media? This action cannot be undone.')) {
        performDeleteMedia(mediaId);
    }
}

function performDeleteMedia(mediaId) {
    // Show loader
    if (typeof window.GlobalLoader !== 'undefined') {
        window.GlobalLoader.show({
            title: 'Deleting Media...',
            message: 'Please wait while we delete the media',
            showProgress: false
        });
    }
    
    fetch(`/admin/media/${mediaId}`, {
        method: 'DELETE',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Hide loader
            if (typeof window.GlobalLoader !== 'undefined') {
                window.GlobalLoader.hide();
            }
            
            if (data.success) {
                showSuccessToast('Media deleted successfully');
                // Reload table data
                if (typeof TableUtils !== 'undefined' && typeof TableUtils.loadTableData === 'function') {
                    TableUtils.loadTableData();
                } else {
                    location.reload();
                }
            } else {
                showErrorToast('Error deleting media: ' + data.message);
            }
        })
        .catch(error => {
            // Hide loader on error
            if (typeof window.GlobalLoader !== 'undefined') {
                window.GlobalLoader.hide();
            }
            
            // Better error message handling
            let errorMessage = 'Unknown error occurred';
            if (error.message) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error.response && error.response.data && error.response.data.message) {
                errorMessage = error.response.data.message;
            }
            
            showErrorToast('Error deleting media: ' + errorMessage);
        });
}

// Toast notification functions (fallback if not available globally)
if (typeof showSuccessToast === 'undefined') {
    window.showSuccessToast = function(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    };
}

if (typeof showErrorToast === 'undefined') {
    window.showErrorToast = function(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    };
}
