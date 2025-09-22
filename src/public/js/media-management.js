// Media Management JavaScript Functions

// Media management functions
function viewMedia(mediaId) {
    console.log('viewMedia called with mediaId:', mediaId);
    
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
    console.log('editMedia called with mediaId:', mediaId);
    // Redirect to dedicated edit page
    window.location.href = `/admin/media/edit/${mediaId}`;
}

function toggleMediaStatus(mediaId) {
    console.log('toggleMediaStatus called with mediaId:', mediaId);
    
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
    console.log('deleteMedia called with mediaId:', mediaId);
    
    if (typeof showConfirmModal === 'function') {
        showConfirmModal(
            'Delete Media',
            'Are you sure you want to delete this media? This action cannot be undone.',
            () => performDeleteMedia(mediaId)
        );
    } else if (confirm('Are you sure you want to delete this media? This action cannot be undone.')) {
        performDeleteMedia(mediaId);
    }
}

function performDeleteMedia(mediaId) {
    // Show loader
    if (typeof showFormLoader === 'function') {
        showFormLoader({
            title: 'Deleting Media...',
            message: 'Please wait while we delete the media'
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
            console.log('Delete response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Hide loader
            if (typeof hideLoader === 'function') {
                hideLoader();
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
            // Hide loader
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            console.error('Delete media error:', error);
            
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
