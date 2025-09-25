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

// Enhanced formatter functions for module table

function formatModule(item) {
    const moduleName = typeof item === 'object' ? item.display_name : item;
    const moduleKey = typeof item === 'object' ? item.name : '';
    const moduleIcon = typeof item === 'object' ? item.icon : '';
    
    if (!moduleName) return '<span class="text-gray-400 italic">No module</span>';
    
    // Get appropriate icon based on module type
    let iconClass = 'fas fa-puzzle-piece';
    let iconColor = 'text-indigo-600';
    let bgColor = 'bg-indigo-100';
    
    if (moduleIcon) {
        iconClass = moduleIcon;
    } else if (moduleKey) {
        switch (moduleKey.toLowerCase()) {
            case 'dashboard':
                iconClass = 'fas fa-tachometer-alt';
                iconColor = 'text-blue-600';
                bgColor = 'bg-blue-100';
                break;
            case 'users':
                iconClass = 'fas fa-users';
                iconColor = 'text-green-600';
                bgColor = 'bg-green-100';
                break;
            case 'media':
                iconClass = 'fas fa-images';
                iconColor = 'text-purple-600';
                bgColor = 'bg-purple-100';
                break;
            case 'rbac':
                iconClass = 'fas fa-shield-alt';
                iconColor = 'text-orange-600';
                bgColor = 'bg-orange-100';
                break;
            case 'settings':
                iconClass = 'fas fa-cog';
                iconColor = 'text-gray-600';
                bgColor = 'bg-gray-100';
                break;
            case 'modules':
                iconClass = 'fas fa-cubes';
                iconColor = 'text-indigo-600';
                bgColor = 'bg-indigo-100';
                break;
            default:
                iconClass = 'fas fa-puzzle-piece';
                iconColor = 'text-indigo-600';
                bgColor = 'bg-indigo-100';
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
                <p class="text-sm font-semibold text-gray-900 truncate">${moduleName}</p>
                <p class="text-xs text-gray-500 font-mono">${moduleKey}</p>
            </div>
        </div>
    `;
}

function formatModuleName(item) {
    const name = typeof item === 'object' ? item.name : item;
    if (!name) return '<span class="text-gray-400 italic">No name</span>';
    
    return `
        <div class="max-w-xs">
            <p class="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">${name}</p>
        </div>
    `;
}

function formatModuleIcon(item) {
    const icon = typeof item === 'object' ? item.icon : item;
    if (!icon) return '<span class="text-gray-400 italic">No icon</span>';
    
    return `
        <div class="flex items-center justify-center">
            <div class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <i class="${icon} text-indigo-600 text-sm"></i>
            </div>
        </div>
    `;
}

function formatModuleRoute(item) {
    const route = typeof item === 'object' ? item.route : item;
    if (!route) return '<span class="text-gray-400 italic">No route</span>';
    
    return `
        <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <i class="fas fa-link text-blue-600 text-xs"></i>
            </div>
            <span class="text-sm font-mono text-gray-700">${route}</span>
        </div>
    `;
}

function formatModuleOrder(item) {
    const order = typeof item === 'object' ? item.order_index : item;
    if (order === null || order === undefined) return '<span class="text-gray-400 italic">No order</span>';
    
    // Get position text
    let positionText = '';
    switch (order) {
        case 1:
            positionText = 'First';
            break;
        case 2:
            positionText = 'Second';
            break;
        case 3:
            positionText = 'Third';
            break;
        case 4:
            positionText = 'Fourth';
            break;
        case 5:
            positionText = 'Fifth';
            break;
        default:
            positionText = `Position ${order}`;
    }
    
    return `
        <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <i class="fas fa-sort-numeric-up text-yellow-600 text-xs"></i>
            </div>
            <div class="text-sm">
                <p class="font-medium text-gray-700">${positionText}</p>
                <p class="text-xs text-gray-500">(${order})</p>
            </div>
        </div>
    `;
}

function formatModuleActions(item) {
    const actionCount = typeof item === 'object' ? item.action_count : item;
    const count = actionCount || 0;
    
    if (count === 0) {
        return `
            <div class="flex items-center space-x-2">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                    <i class="fas fa-ban mr-1"></i>
                    No actions
                </span>
            </div>
        `;
    }
    
    return `
        <div class="flex items-center space-x-2">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                <i class="fas fa-cogs mr-1"></i>
                ${count} Action${count !== 1 ? 's' : ''}
            </span>
        </div>
    `;
}

function formatModulePermissions(item) {
    const permissionCount = typeof item === 'object' ? item.permission_count : item;
    const count = permissionCount || 0;
    
    if (count === 0) {
        return `
            <div class="flex items-center space-x-2">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                    <i class="fas fa-ban mr-1"></i>
                    No permissions
                </span>
            </div>
        `;
    }
    
    return `
        <div class="flex items-center space-x-2">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                <i class="fas fa-key mr-1"></i>
                ${count} Permission${count !== 1 ? 's' : ''}
            </span>
        </div>
    `;
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
                        <div class="space-y-6">
                            <!-- Module Icon and Title Section -->
                            <div class="flex items-center space-x-6">
                                <div class="flex-shrink-0">
                                    <div class="h-20 w-20 rounded-full module-icon-container flex items-center justify-center" style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); box-shadow: 0 10px 25px -5px rgba(139, 92, 246, 0.3);">
                                        <i class="${module.icon || 'fas fa-tachometer-alt'} text-white text-3xl"></i>
                                    </div>
                                </div>
                                <div class="flex-1">
                                    <h4 class="text-2xl font-bold text-gray-900 mb-1">${module.display_name}</h4>
                                    <p class="text-sm text-gray-500 font-medium">${module.name}</p>
                                </div>
                            </div>
                            
                            <!-- Module Details Grid -->
                            <div class="grid grid-cols-2 gap-8">
                                <!-- Left Column -->
                                <div class="space-y-4">
                                    <div class="detail-card rounded-xl p-4" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                                        <label class="block text-sm font-semibold text-gray-600 mb-2">Actions</label>
                                        <p class="text-2xl font-bold text-gray-900">${module.action_count || 0}</p>
                                    </div>
                                    <div class="detail-card rounded-xl p-4" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                                        <label class="block text-sm font-semibold text-gray-600 mb-2">Route</label>
                                        <p class="text-sm font-mono text-gray-700">${module.route || 'N/A'}</p>
                                    </div>
                                    <div class="detail-card rounded-xl p-4" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                                        <label class="block text-sm font-semibold text-gray-600 mb-2">Description</label>
                                        <p class="text-sm text-gray-700">${module.description || 'No description provided'}</p>
                                    </div>
                                </div>
                                
                                <!-- Right Column -->
                                <div class="space-y-4">
                                    <div class="detail-card rounded-xl p-4" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                                        <label class="block text-sm font-semibold text-gray-600 mb-2">Permissions</label>
                                        <p class="text-2xl font-bold text-gray-900">${module.permission_count || 0}</p>
                                    </div>
                                    <div class="detail-card rounded-xl p-4" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                                        <label class="block text-sm font-semibold text-gray-600 mb-2">Order</label>
                                        <p class="text-2xl font-bold text-gray-900">${module.order_index || 0}</p>
                                    </div>
                                </div>
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
    // First check the deletion impact
    fetch(`/admin/api/rbac/modules/${moduleId}/deletion-impact`, {
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let message = `Are you sure you want to delete the module "${data.module.display_name}"? This action cannot be undone.`;
            
            if (data.willDeleteData) {
                message += '\n\nThis will also delete:';
                if (data.relatedData.actions > 0) {
                    message += `\n• ${data.relatedData.actions} module action(s)`;
                }
                if (data.relatedData.permissions > 0) {
                    message += `\n• ${data.relatedData.permissions} permission(s)`;
                }
                if (data.relatedData.rolePermissions > 0) {
                    message += `\n• ${data.relatedData.rolePermissions} role permission assignment(s)`;
                }
            }
            
            if (typeof showDeleteModal === 'function') {
                showDeleteModal(
                    message,
                    'Confirm Delete',
                    function() {
                        performDeleteModule(moduleId);
                    }
                );
            } else if (confirm(message)) {
                performDeleteModule(moduleId);
            }
        } else {
            if (data.isSystemModule) {
                alert('Cannot delete system modules.');
            } else {
                alert('Error: ' + data.message);
            }
        }
    })
    .catch(error => {
        console.error('Error checking deletion impact:', error);
        // Fallback to simple confirmation
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
    });
}

function performDeleteModule(moduleId) {
    // Show loader
    if (typeof window.GlobalLoader !== 'undefined') {
        window.GlobalLoader.show({
            title: 'Deleting Module...',
            message: 'Please wait while we delete the module',
            showProgress: false
        });
    }
    
    fetch(`/admin/api/rbac/modules/${moduleId}`, {
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
                // Show detailed success message
                if (typeof showSuccessToast !== 'undefined') {
                    showSuccessToast(data.message);
                } else {
                    alert(data.message);
                }
                location.reload();
            } else {
                if (typeof showErrorToast !== 'undefined') {
                    showErrorToast(data.message || 'Error deleting module');
                } else {
                    alert('Error: ' + (data.message || 'Error deleting module'));
                }
            }
        })
        .catch(error => {
            // Hide loader on error
            if (typeof window.GlobalLoader !== 'undefined') {
                window.GlobalLoader.hide();
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
window.formatModule = formatModule;
window.formatModuleName = formatModuleName;
window.formatModuleIcon = formatModuleIcon;
window.formatModuleRoute = formatModuleRoute;
window.formatModuleOrder = formatModuleOrder;
window.formatModuleActions = formatModuleActions;
window.formatModulePermissions = formatModulePermissions;
