// RBAC Module Actions Management JavaScript Functions

// Format status for table display
function formatStatus(item) {
    return item.is_active ? 
        '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>' : 
        '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Inactive</span>';
}

// Enhanced formatter functions for module action table

function formatActionName(item) {
    const actionName = typeof item === 'object' ? item.name : item;
    if (!actionName) return '<span class="text-gray-400 italic">No name</span>';
    
    // Get appropriate icon based on action type
    let iconClass = 'fas fa-cog';
    let iconColor = 'text-blue-600';
    let bgColor = 'bg-blue-100';
    
    if (actionName) {
        switch (actionName.toLowerCase()) {
            case 'view':
            case 'read':
                iconClass = 'fas fa-eye';
                iconColor = 'text-blue-600';
                bgColor = 'bg-blue-100';
                break;
            case 'create':
            case 'add':
                iconClass = 'fas fa-plus';
                iconColor = 'text-green-600';
                bgColor = 'bg-green-100';
                break;
            case 'update':
            case 'edit':
                iconClass = 'fas fa-edit';
                iconColor = 'text-yellow-600';
                bgColor = 'bg-yellow-100';
                break;
            case 'delete':
            case 'remove':
                iconClass = 'fas fa-trash';
                iconColor = 'text-red-600';
                bgColor = 'bg-red-100';
                break;
            case 'manage':
                iconClass = 'fas fa-cogs';
                iconColor = 'text-indigo-600';
                bgColor = 'bg-indigo-100';
                break;
            case 'upload':
                iconClass = 'fas fa-upload';
                iconColor = 'text-purple-600';
                bgColor = 'bg-purple-100';
                break;
            case 'download':
                iconClass = 'fas fa-download';
                iconColor = 'text-orange-600';
                bgColor = 'bg-orange-100';
                break;
            default:
                iconClass = 'fas fa-cog';
                iconColor = 'text-blue-600';
                bgColor = 'bg-blue-100';
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
                <p class="text-sm font-semibold text-gray-900 truncate">${actionName}</p>
                <p class="text-xs text-gray-500 font-mono">${actionName}</p>
            </div>
        </div>
    `;
}

function formatActionDisplayName(item) {
    const displayName = typeof item === 'object' ? item.display_name : item;
    if (!displayName) return '<span class="text-gray-400 italic">No display name</span>';
    
    return `
        <div class="max-w-xs">
            <p class="text-sm font-medium text-gray-700 bg-gray-50 px-2 py-1 rounded">${displayName}</p>
        </div>
    `;
}

function formatActionDescription(item) {
    const description = typeof item === 'object' ? item.description : item;
    if (!description) return '<span class="text-gray-400 italic">No description</span>';
    
    // Truncate long descriptions
    const truncatedDesc = description.length > 50 ? description.substring(0, 50) + '...' : description;
    
    return `
        <div class="max-w-xs">
            <p class="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded" title="${description}">${truncatedDesc}</p>
        </div>
    `;
}

function formatActionStatus(item) {
    const isActive = typeof item === 'object' ? item.is_active : item;
    
    if (isActive === 1 || isActive === true) {
        return `
            <div class="flex items-center space-x-2">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    <i class="fas fa-check-circle mr-1"></i>
                    Active
                </span>
            </div>
        `;
    } else {
        return `
            <div class="flex items-center space-x-2">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    <i class="fas fa-times-circle mr-1"></i>
                    Inactive
                </span>
            </div>
        `;
    }
}

// Module action functions
function viewModuleAction(actionId) {
    // Show loader while fetching data
    if (typeof window.GlobalLoader !== 'undefined') {
        window.GlobalLoader.show({
            title: 'Loading Action Details...',
            message: 'Please wait while we fetch the action information',
            showProgress: false
        });
    }
    
    // Fetch module action details and show modal
    fetch(`/admin/api/rbac/module-actions/${actionId}`, {
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            // Hide loader
            if (typeof window.GlobalLoader !== 'undefined') {
                window.GlobalLoader.hide();
            }
            
            if (data.success) {
                const action = data.data;
                const actionDetailsEl = document.getElementById('moduleActionDetails');
                if (actionDetailsEl) {
                    actionDetailsEl.innerHTML = `
                        <!-- Action Header -->
                        <div class="flex items-center space-x-4 mb-6">
                            <div class="flex-shrink-0">
                                <div class="w-16 h-16 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                                    <i class="fas fa-cog text-white text-2xl"></i>
                                </div>
                            </div>
                            <div class="flex-1">
                                <h4 class="text-xl font-bold text-gray-900">${action.display_name}</h4>
                                <p class="text-sm text-gray-500 font-mono">${action.name}</p>
                            </div>
                        </div>

                        <!-- Action Details Grid -->
                        <div class="grid grid-cols-1 gap-6">
                            <!-- Action Name -->
                            <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <div class="flex items-center space-x-3 mb-2">
                                    <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <i class="fas fa-tag text-blue-600 text-sm"></i>
                                    </div>
                                    <label class="text-sm font-semibold text-gray-700">Action Name</label>
                                </div>
                                <p class="text-sm text-gray-900 font-mono bg-white rounded-lg px-3 py-2 border">${action.name}</p>
                            </div>

                            <!-- Display Name -->
                            <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <div class="flex items-center space-x-3 mb-2">
                                    <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <i class="fas fa-eye text-purple-600 text-sm"></i>
                                    </div>
                                    <label class="text-sm font-semibold text-gray-700">Display Name</label>
                                </div>
                                <p class="text-sm text-gray-900 bg-white rounded-lg px-3 py-2 border">${action.display_name}</p>
                            </div>

                            <!-- Description -->
                            <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <div class="flex items-center space-x-3 mb-2">
                                    <div class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                        <i class="fas fa-align-left text-indigo-600 text-sm"></i>
                                    </div>
                                    <label class="text-sm font-semibold text-gray-700">Description</label>
                                </div>
                                <p class="text-sm text-gray-900 bg-white rounded-lg px-3 py-2 border min-h-[2.5rem]">${action.description || 'No description provided'}</p>
                            </div>

                            <!-- Status -->
                            <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <div class="flex items-center space-x-3 mb-2">
                                    <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <i class="fas fa-toggle-on text-orange-600 text-sm"></i>
                                    </div>
                                    <label class="text-sm font-semibold text-gray-700">Status</label>
                                </div>
                                <div class="bg-white rounded-lg px-3 py-2 border">
                                    ${action.is_active ? 
                                        '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800"><i class="fas fa-check-circle mr-1"></i>Active</span>' : 
                                        '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800"><i class="fas fa-times-circle mr-1"></i>Inactive</span>'
                                    }
                                </div>
                            </div>
                        </div>
                    `;
                }
                
                const modal = document.getElementById('viewModuleActionModal');
                const modalContainer = document.getElementById('viewModuleActionModalContainer');
                if (modal && modalContainer) {
                    modal.classList.remove('hidden');
                    document.body.style.overflow = 'hidden'; // Prevent background scrolling
                    
                    // Remove initial animation classes
                    modalContainer.classList.remove('scale-95', 'opacity-0');
                    // Add final animation classes with a small delay to trigger CSS transition
                    setTimeout(() => {
                        modalContainer.classList.add('scale-100', 'opacity-100');
                    }, 10);
                }
            } else {
                showErrorToast('Error loading module action details');
            }
        })
        .catch(error => {
            // Hide loader on error
            if (typeof window.GlobalLoader !== 'undefined') {
                window.GlobalLoader.hide();
            }
            console.error('Error:', error);
            showErrorToast('Error loading module action details');
        });
}

function editModuleAction(actionId) {
    // Show loader while fetching data
    if (typeof window.GlobalLoader !== 'undefined') {
        window.GlobalLoader.show({
            title: 'Loading Action Details...',
            message: 'Please wait while we fetch the action information',
            showProgress: false
        });
    }
    
    // Fetch module action details and show edit modal
    fetch(`/admin/api/rbac/module-actions/${actionId}`, {
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            // Hide loader
            if (typeof window.GlobalLoader !== 'undefined') {
                window.GlobalLoader.hide();
            }
            
            if (data.success) {
                const action = data.data;
                document.getElementById('editModuleActionId').value = action.id;
                document.getElementById('editModuleActionName').value = action.name;
                document.getElementById('editModuleActionDisplayName').value = action.display_name;
                document.getElementById('editModuleActionDescription').value = action.description || '';
                document.getElementById('editModuleActionStatus').value = action.is_active;
                
                const modal = document.getElementById('editModuleActionModal');
                const modalContainer = document.getElementById('editModuleActionModalContainer');
                if (modal && modalContainer) {
                    modal.classList.remove('hidden');
                    document.body.style.overflow = 'hidden'; // Prevent background scrolling
                    
                    // Remove initial animation classes
                    modalContainer.classList.remove('scale-95', 'opacity-0');
                    // Add final animation classes with a small delay to trigger CSS transition
                    setTimeout(() => {
                        modalContainer.classList.add('scale-100', 'opacity-100');
                    }, 10);
                    
                    // Focus on first input
                    setTimeout(() => {
                        const firstInput = document.getElementById('editModuleActionName');
                        if (firstInput) {
                            firstInput.focus();
                        }
                    }, 300);
                }
            } else {
                showErrorToast('Error loading module action details');
            }
        })
        .catch(error => {
            // Hide loader on error
            if (typeof window.GlobalLoader !== 'undefined') {
                window.GlobalLoader.hide();
            }
            console.error('Error:', error);
            showErrorToast('Error loading module action details');
        });
}

function deleteModuleAction(actionId) {
    // Show custom warning modal instead of browser confirm
    if (typeof showDeleteModal !== 'undefined') {
        showDeleteModal(
            'Are you sure you want to delete this module action? This action cannot be undone.',
            'Delete Module Action',
            function() {
                // Show loader while deleting
                if (typeof window.GlobalLoader !== 'undefined') {
                    window.GlobalLoader.show({
                        title: 'Deleting Action...',
                        message: 'Please wait while we delete the module action',
                        showProgress: false
                    });
                }
                
                fetch(`/admin/api/rbac/module-actions/${actionId}`, {
                    method: 'DELETE',
                    credentials: 'same-origin'
                })
                    .then(response => response.json())
                    .then(data => {
                        // Hide loader
                        if (typeof window.GlobalLoader !== 'undefined') {
                            window.GlobalLoader.hide();
                        }
                        
                        if (data.success) {
                            showSuccessToast('Module action deleted successfully');
                            location.reload();
                        } else {
                            showErrorToast(data.message || 'Error deleting module action');
                        }
                    })
                    .catch(error => {
                        // Hide loader on error
                        if (typeof window.GlobalLoader !== 'undefined') {
                            window.GlobalLoader.hide();
                        }
                        console.error('Error:', error);
                        showErrorToast('Error deleting module action');
                    });
            }
        );
    } else {
        // Fallback to browser confirm if custom modal not available
        if (confirm('Are you sure you want to delete this module action?')) {
            fetch(`/admin/api/rbac/module-actions/${actionId}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showSuccessToast('Module action deleted successfully');
                        location.reload();
                    } else {
                        showErrorToast(data.message || 'Error deleting module action');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showErrorToast('Error deleting module action');
                });
        }
    }
}

function createModuleAction() {
    const modal = document.getElementById('createModuleActionModal');
    const modalContainer = document.getElementById('createModuleActionModalContainer');
    if (modal && modalContainer) {
        // Reset form
        const form = document.getElementById('createModuleActionForm');
        if (form) {
            form.reset();
        }
        
        // Show modal with animation
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Remove initial animation classes
        modalContainer.classList.remove('scale-95', 'opacity-0');
        // Add final animation classes with a small delay to trigger CSS transition
        setTimeout(() => {
            modalContainer.classList.add('scale-100', 'opacity-100');
        }, 10);
        
        // Focus on first input
        setTimeout(() => {
            const firstInput = document.getElementById('createModuleActionName');
            if (firstInput) {
                firstInput.focus();
            }
        }, 300);
    }
}

function closeViewModuleActionModal() {
    const modal = document.getElementById('viewModuleActionModal');
    const modalContainer = document.getElementById('viewModuleActionModalContainer');
    if (modal && modalContainer) {
        // Animate out
        modalContainer.classList.remove('scale-100', 'opacity-100');
        modalContainer.classList.add('scale-95', 'opacity-0');
        // Hide modal after animation
        setTimeout(() => {
            modal.classList.add('hidden');
            document.body.style.overflow = ''; // Restore background scrolling
        }, 300);
    }
}

function closeEditModuleActionModal() {
    const modal = document.getElementById('editModuleActionModal');
    const modalContainer = document.getElementById('editModuleActionModalContainer');
    if (modal && modalContainer) {
        // Animate out
        modalContainer.classList.remove('scale-100', 'opacity-100');
        modalContainer.classList.add('scale-95', 'opacity-0');
        // Hide modal after animation
        setTimeout(() => {
            modal.classList.add('hidden');
            document.body.style.overflow = ''; // Restore background scrolling
        }, 300);
    }
}

function closeCreateModuleActionModal() {
    const modal = document.getElementById('createModuleActionModal');
    const modalContainer = document.getElementById('createModuleActionModalContainer');
    if (modal && modalContainer) {
        // Animate out
        modalContainer.classList.remove('scale-100', 'opacity-100');
        modalContainer.classList.add('scale-95', 'opacity-0');
        // Hide modal after animation
        setTimeout(() => {
            modal.classList.add('hidden');
            document.body.style.overflow = ''; // Restore background scrolling
        }, 300);
    }
}

// Add click-outside-to-close functionality
document.addEventListener('DOMContentLoaded', function() {
    // View modal click outside to close
    document.getElementById('viewModuleActionModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeViewModuleActionModal();
        }
    });
    
    // Edit modal click outside to close
    document.getElementById('editModuleActionModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeEditModuleActionModal();
        }
    });
    
    // Create modal click outside to close
    document.getElementById('createModuleActionModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeCreateModuleActionModal();
        }
    });
    
    // Edit module action form
    const editModuleActionForm = document.getElementById('editModuleActionForm');
    if (editModuleActionForm) {
        editModuleActionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const actionId = formData.get('id');
            
            fetch(`/admin/api/rbac/module-actions/${actionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    name: formData.get('name'),
                    display_name: formData.get('display_name'),
                    description: formData.get('description'),
                    is_active: formData.get('is_active')
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showSuccessToast('Module action updated successfully');
                    closeEditModuleActionModal();
                    location.reload();
                } else {
                    showErrorToast(data.message || 'Error updating module action');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showErrorToast('Error updating module action');
            });
        });
    }
    
    // Create module action form
    const createModuleActionForm = document.getElementById('createModuleActionForm');
    if (createModuleActionForm) {
        createModuleActionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const moduleId = window.location.pathname.split('/')[4]; // Extract module ID from URL
            
            fetch(`/admin/api/rbac/module-actions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    module_id: moduleId,
                    name: formData.get('name'),
                    display_name: formData.get('display_name'),
                    description: formData.get('description')
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showSuccessToast('Module action created successfully');
                    closeCreateModuleActionModal();
                    location.reload();
                } else {
                    showErrorToast(data.message || 'Error creating module action');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showErrorToast('Error creating module action');
            });
        });
    }
    
    // Add real-time validation for create form
    const nameInput = document.getElementById('createModuleActionName');
    const displayNameInput = document.getElementById('createModuleActionDisplayName');
    
    if (nameInput) {
        nameInput.addEventListener('input', function() {
            // Convert to lowercase and replace spaces with underscores
            this.value = this.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            validateField(this, 'Action name must be lowercase with underscores only');
        });
    }
    
    if (displayNameInput) {
        displayNameInput.addEventListener('input', function() {
            validateField(this, 'Display name is required');
        });
    }
    
    // Add ESC key support
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const createModal = document.getElementById('createModuleActionModal');
            if (createModal && !createModal.classList.contains('hidden')) {
                closeCreateModuleActionModal();
            }
        }
    });
});

// Helper function for field validation
function validateField(field, message) {
    const isValid = field.value.trim() !== '';
    field.classList.toggle('border-red-300', !isValid);
    field.classList.toggle('border-green-300', isValid);
    
    // Remove existing error message
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    if (!isValid) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message text-red-500 text-xs mt-1';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    }
}

// Restore module action
function restoreModuleAction(actionId) {
    if (typeof window.GlobalLoader !== 'undefined') {
        window.GlobalLoader.show({
            title: 'Restoring Action...',
            message: 'Please wait while we restore the action',
            showProgress: false
        });
    }
    
    fetch(`/admin/api/rbac/module-actions/${actionId}/restore`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (typeof window.GlobalLoader !== 'undefined') {
            window.GlobalLoader.hide();
        }
        
        if (data.success) {
            if (typeof showSuccessToast !== 'undefined') {
                showSuccessToast(data.message);
            } else {
                alert(data.message);
            }
            
            // Reload the table
            if (typeof window.reloadTable === 'function') {
                window.reloadTable();
            } else {
                location.reload();
            }
        } else {
            if (typeof showErrorToast !== 'undefined') {
                showErrorToast(data.message);
            } else {
                alert('Error: ' + data.message);
            }
        }
    })
    .catch(error => {
        if (typeof window.GlobalLoader !== 'undefined') {
            window.GlobalLoader.hide();
        }
        
        console.error('Error:', error);
        if (typeof showErrorToast !== 'undefined') {
            showErrorToast('An error occurred while restoring the action');
        } else {
            alert('An error occurred while restoring the action');
        }
    });
}

// Make sure all formatters are available globally
window.formatStatus = formatStatus;
window.formatActionName = formatActionName;
window.formatActionDisplayName = formatActionDisplayName;
window.formatActionDescription = formatActionDescription;
window.formatActionStatus = formatActionStatus;
