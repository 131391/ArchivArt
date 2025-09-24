// RBAC Modules Management JavaScript Functions

// Status formatter for table
function formatStatus(item) {
    // Handle both direct value and item object
    const value = typeof item === 'object' ? item.is_active : item;
    if (value === 1 || value === '1' || value === true) {
        return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>';
    } else {
        return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactive</span>';
    }
}

// Module action functions
function viewModule(moduleId) {
    // Show loader
    if (typeof showLoader === 'function') {
        showLoader({ message: 'Loading module details...' });
    }
    
    // Fetch module details and show modal
    fetch(`/admin/api/rbac/modules/${moduleId}`, {
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            // Hide loader
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            
            if (data.success) {
                const module = data.data;
                const moduleDetailsEl = document.getElementById('moduleDetails');
                if (moduleDetailsEl) {
                    moduleDetailsEl.innerHTML = `
                        <div class="space-y-4">
                            <div class="flex items-center space-x-4">
                                <div class="flex-shrink-0 h-16 w-16">
                                    <div class="h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                                        <i class="${module.icon || 'fas fa-puzzle-piece'} text-white text-2xl"></i>
                                    </div>
                                </div>
                                <div>
                                    <h4 class="text-lg font-semibold text-gray-900">${module.display_name}</h4>
                                    <p class="text-sm text-gray-500">${module.name}</p>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Actions</label>
                                    <p class="mt-1 text-sm text-gray-900">${module.action_count || 0}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Permissions</label>
                                    <p class="mt-1 text-sm text-gray-900">${module.permission_count || 0}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Route</label>
                                    <p class="mt-1 text-sm text-gray-900">${module.route || 'N/A'}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Order</label>
                                    <p class="mt-1 text-sm text-gray-900">${module.order_index || 0}</p>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Description</label>
                                <p class="mt-1 text-sm text-gray-900">${module.description || 'No description provided'}</p>
                            </div>
                        </div>
                    `;
                }
                
                const modal = document.getElementById('viewModuleModal');
                const modalContainer = document.getElementById('viewModuleModalContainer');
                if (modal && modalContainer) {
                    modal.classList.remove('hidden');
                    // Remove initial animation classes
                    modalContainer.classList.remove('scale-95', 'opacity-0');
                    // Add final animation classes with a small delay to trigger CSS transition
                    setTimeout(() => {
                        modalContainer.classList.add('scale-100', 'opacity-100');
                    }, 10);
                }
            } else {
                showErrorToast('Error loading module details');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showErrorToast('Error loading module details');
        });
}

function editModule(moduleId) {
    // Show loader
    if (typeof showLoader === 'function') {
        showLoader({ message: 'Loading module details...' });
    }
    
    // Fetch module details and show edit modal
    fetch(`/admin/api/rbac/modules/${moduleId}`, {
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            // Hide loader
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            
            if (data.success) {
                const module = data.data;
                document.getElementById('editModuleId').value = module.id;
                document.getElementById('editModuleName').value = module.name;
                document.getElementById('editModuleDisplayName').value = module.display_name;
                document.getElementById('editModuleDescription').value = module.description || '';
                document.getElementById('editModuleIcon').value = module.icon || '';
                document.getElementById('editModuleRoute').value = module.route || '';
                document.getElementById('editModuleOrder').value = module.order_index || 0;
                const modal = document.getElementById('editModuleModal');
                const modalContainer = document.getElementById('editModuleModalContainer');
                if (modal && modalContainer) {
                    modal.classList.remove('hidden');
                    // Remove initial animation classes
                    modalContainer.classList.remove('scale-95', 'opacity-0');
                    // Add final animation classes with a small delay to trigger CSS transition
                    setTimeout(() => {
                        modalContainer.classList.add('scale-100', 'opacity-100');
                    }, 10);
                }
            } else {
                showErrorToast('Error loading module details');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showErrorToast('Error loading module details');
        });
}

function deleteModule(moduleId) {
    if (typeof showConfirmModal === 'function') {
        showConfirmModal(
            'Are you sure you want to delete this module? This action cannot be undone.',
            'Confirm Delete',
            function() {
                performDeleteModule(moduleId);
            }
        );
    } else if (confirm('Are you sure you want to delete this module? This action cannot be undone.')) {
        performDeleteModule(moduleId);
    }
}

function performDeleteModule(moduleId) {
    // Show loader
    if (typeof showLoader === 'function') {
        showLoader({ message: 'Deleting module...' });
    }
    
    fetch(`/admin/api/rbac/modules/${moduleId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            // Hide loader
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            
            if (data.success) {
                showSuccessToast('Module deleted successfully');
                location.reload();
            } else {
                showErrorToast(data.message || 'Error deleting module');
            }
        })
        .catch(error => {
            // Hide loader on error
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            console.error('Error:', error);
            showErrorToast('Error deleting module');
        });
}

function manageModuleActions(moduleId) {
    window.location.href = `/admin/rbac/modules/${moduleId}/actions`;
}

function createModule() {
    const modal = document.getElementById('createModuleModal');
    const modalContainer = document.getElementById('createModuleModalContainer');
    if (modal && modalContainer) {
        modal.classList.remove('hidden');
        // Remove initial animation classes
        modalContainer.classList.remove('scale-95', 'opacity-0');
        // Add final animation classes with a small delay to trigger CSS transition
        setTimeout(() => {
            modalContainer.classList.add('scale-100', 'opacity-100');
        }, 10);
    }
}

function closeViewModal() {
    const modal = document.getElementById('viewModuleModal');
    const modalContainer = document.getElementById('viewModuleModalContainer');
    if (modal && modalContainer) {
        // Animate out
        modalContainer.classList.remove('scale-100', 'opacity-100');
        modalContainer.classList.add('scale-95', 'opacity-0');
        // Hide modal after animation
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

function closeEditModal() {
    const modal = document.getElementById('editModuleModal');
    const modalContainer = document.getElementById('editModuleModalContainer');
    if (modal && modalContainer) {
        // Animate out
        modalContainer.classList.remove('scale-100', 'opacity-100');
        modalContainer.classList.add('scale-95', 'opacity-0');
        // Hide modal after animation
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

function closeCreateModal() {
    const modal = document.getElementById('createModuleModal');
    const modalContainer = document.getElementById('createModuleModalContainer');
    if (modal && modalContainer) {
        // Animate out
        modalContainer.classList.remove('scale-100', 'opacity-100');
        modalContainer.classList.add('scale-95', 'opacity-0');
        // Hide modal after animation
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

// Add click-outside-to-close functionality
document.addEventListener('DOMContentLoaded', function() {
    // View modal click outside to close
    document.getElementById('viewModuleModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeViewModal();
        }
    });
    
    // Edit modal click outside to close
    document.getElementById('editModuleModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeEditModal();
        }
    });
    
    // Create modal click outside to close
    document.getElementById('createModuleModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeCreateModal();
        }
    });
    // Edit module form
    const editModuleForm = document.getElementById('editModuleForm');
    if (editModuleForm) {
        editModuleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show loader
            if (typeof showLoader === 'function') {
                showLoader({ message: 'Updating module...' });
            }
            
            const formData = new FormData(this);
            const moduleId = formData.get('id');
            
            fetch(`/admin/api/rbac/modules/${moduleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    name: formData.get('name'),
                    display_name: formData.get('display_name'),
                    description: formData.get('description'),
                    icon: formData.get('icon'),
                    route: formData.get('route'),
                    order_index: parseInt(formData.get('order_index'))
                })
            })
            .then(response => response.json())
            .then(data => {
                // Hide loader
                if (typeof hideLoader === 'function') {
                    hideLoader();
                }
                
                if (data.success) {
                    showSuccessToast('Module updated successfully');
                    closeEditModal();
                    location.reload();
                } else {
                    showErrorToast(data.message || 'Error updating module');
                }
            })
            .catch(error => {
                // Hide loader on error
                if (typeof hideLoader === 'function') {
                    hideLoader();
                }
                console.error('Error:', error);
                showErrorToast('Error updating module');
            });
        });
    }
    
    // Create module form
    const createModuleForm = document.getElementById('createModuleForm');
    if (createModuleForm) {
        createModuleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show loader
            if (typeof showLoader === 'function') {
                showLoader({ message: 'Creating module...' });
            }
            
            const formData = new FormData(this);
            
            fetch('/admin/api/rbac/modules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    name: formData.get('name'),
                    display_name: formData.get('display_name'),
                    description: formData.get('description'),
                    icon: formData.get('icon'),
                    route: formData.get('route'),
                    order_index: parseInt(formData.get('order_index'))
                })
            })
            .then(response => response.json())
            .then(data => {
                // Hide loader
                if (typeof hideLoader === 'function') {
                    hideLoader();
                }
                
                if (data.success) {
                    showSuccessToast('Module created successfully');
                    closeCreateModal();
                    location.reload();
                } else {
                    showErrorToast(data.message || 'Error creating module');
                }
            })
            .catch(error => {
                // Hide loader on error
                if (typeof hideLoader === 'function') {
                    hideLoader();
                }
                console.error('Error:', error);
                showErrorToast('Error creating module');
            });
        });
    }
});

// Toast notification functions
function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 ease-out';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
    }, 2500);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showErrorToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 ease-out';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
    }, 2500);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Additional formatter functions for module table
function formatIcon(item) {
    const iconPath = item.icon || item;
    if (!iconPath) return '<span class="text-gray-400 italic">No icon</span>';
    return `<div class="flex items-center space-x-2">
        <i class="${iconPath} text-indigo-600 text-sm"></i>
        <span class="text-xs text-gray-500 font-mono">${iconPath}</span>
    </div>`;
}

function formatRoute(item) {
    const route = item.route || item;
    if (!route) return '<span class="text-gray-400 italic">No route</span>';
    return `<div class="flex items-center space-x-2">
        <i class="fas fa-link text-blue-600 text-xs"></i>
        <span class="text-sm font-mono text-gray-700">${route}</span>
    </div>`;
}

function formatOrderIndex(item) {
    const orderIndex = item.order_index !== undefined ? item.order_index : item;
    if (orderIndex === null || orderIndex === undefined) return '<span class="text-gray-400 italic">No order</span>';
    const orderText = orderIndex === 0 ? 'First' : 
                     orderIndex === 1 ? 'Second' : 
                     orderIndex === 2 ? 'Third' : 
                     orderIndex === 3 ? 'Fourth' : 
                     orderIndex === 4 ? 'Fifth' : 
                     `Position ${orderIndex}`;
    return `<div class="flex items-center space-x-2">
        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <i class="fas fa-sort-numeric-up mr-1"></i>
            ${orderText}
        </span>
        <span class="text-xs text-gray-500">(${orderIndex})</span>
    </div>`;
}

function formatActionCount(item) {
    const count = item.action_count !== undefined ? item.action_count : item;
    if (!count || count === 0) return '<span class="text-gray-400 italic">No actions</span>';
    const actionText = count === 1 ? '1 Action' : `${count} Actions`;
    return `<div class="flex items-center space-x-2">
        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            <i class="fas fa-cogs mr-1"></i>
            ${actionText}
        </span>
    </div>`;
}

function formatPermissionCount(item) {
    const count = item.permission_count !== undefined ? item.permission_count : item;
    if (!count || count === 0) return '<span class="text-gray-400 italic">No permissions</span>';
    const permissionText = count === 1 ? '1 Permission' : `${count} Permissions`;
    return `<div class="flex items-center space-x-2">
        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            <i class="fas fa-key mr-1"></i>
            ${permissionText}
        </span>
    </div>`;
}

// Make sure all formatters are available globally
window.formatStatus = formatStatus;
window.formatIcon = formatIcon;
window.formatRoute = formatRoute;
window.formatOrderIndex = formatOrderIndex;
window.formatActionCount = formatActionCount;
window.formatPermissionCount = formatPermissionCount;
