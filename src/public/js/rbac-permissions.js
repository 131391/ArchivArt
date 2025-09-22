// RBAC Permissions Management JavaScript Functions

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

// Global variables for modules and actions
let availableModules = [];
let availableActions = [];

// Load modules and actions on page load
async function loadModulesAndActions() {
    try {
            // Load modules
            const modulesResponse = await fetch('/admin/api/rbac/modules-list', {
                credentials: 'same-origin'
            });
        const modulesData = await modulesResponse.json();
        if (modulesData.success) {
            availableModules = modulesData.data;
            populateModuleDropdowns();
        }

        // Load actions
        const actionsResponse = await fetch('/admin/api/rbac/module-actions', {
            credentials: 'same-origin'
        });
        const actionsData = await actionsResponse.json();
        if (actionsData.success) {
            availableActions = actionsData.data;
            populateActionDropdowns();
        }
    } catch (error) {
        console.error('Error loading modules and actions:', error);
    }
}

// Populate module dropdowns
function populateModuleDropdowns() {
    const editModuleSelect = document.getElementById('editPermissionModule');
    const createModuleSelect = document.getElementById('createPermissionModule');
    
    if (editModuleSelect) {
        // Clear existing options except the first one
        editModuleSelect.innerHTML = '<option value="">Select Module</option>';
        availableModules.forEach(module => {
            const option = document.createElement('option');
            option.value = module.name;
            option.textContent = module.display_name || module.name.charAt(0).toUpperCase() + module.name.slice(1);
            editModuleSelect.appendChild(option);
        });
        
        // Add event listener for auto-generating permission name
        editModuleSelect.addEventListener('change', generateEditPermissionName);
    }
    
    if (createModuleSelect) {
        // Clear existing options except the first one
        createModuleSelect.innerHTML = '<option value="">Select Module</option>';
        availableModules.forEach(module => {
            const option = document.createElement('option');
            option.value = module.name;
            option.textContent = module.display_name || module.name.charAt(0).toUpperCase() + module.name.slice(1);
            createModuleSelect.appendChild(option);
        });
        
        // Add event listener for auto-generating permission name
        createModuleSelect.addEventListener('change', generateCreatePermissionName);
    }
}

// Populate action dropdowns
function populateActionDropdowns() {
    const editActionSelect = document.getElementById('editPermissionAction');
    const createActionSelect = document.getElementById('createPermissionAction');
    
    if (editActionSelect) {
        // Clear existing options except the first one
        editActionSelect.innerHTML = '<option value="">Select Action</option>';
        availableActions.forEach(action => {
            const option = document.createElement('option');
            option.value = action.name;
            option.textContent = action.display_name || action.name.charAt(0).toUpperCase() + action.name.slice(1);
            editActionSelect.appendChild(option);
        });
        
        // Add event listener for auto-generating permission name
        editActionSelect.addEventListener('change', generateEditPermissionName);
    }
    
    if (createActionSelect) {
        // Clear existing options except the first one
        createActionSelect.innerHTML = '<option value="">Select Action</option>';
        availableActions.forEach(action => {
            const option = document.createElement('option');
            option.value = action.name;
            option.textContent = action.display_name || action.name.charAt(0).toUpperCase() + action.name.slice(1);
            createActionSelect.appendChild(option);
        });
        
        // Add event listener for auto-generating permission name
        createActionSelect.addEventListener('change', generateCreatePermissionName);
    }
}

// Auto-generate permission name for edit form
function generateEditPermissionName() {
    const moduleSelect = document.getElementById('editPermissionModule');
    const actionSelect = document.getElementById('editPermissionAction');
    const nameInput = document.getElementById('editPermissionName');
    const displayNameInput = document.getElementById('editPermissionDisplayName');
    
    if (moduleSelect && actionSelect && nameInput) {
        const module = moduleSelect.value;
        const action = actionSelect.value;
        
        if (module && action) {
            const permissionName = `${module}.${action}`;
            nameInput.value = permissionName;
            
            // Auto-generate display name if empty
            if (displayNameInput && !displayNameInput.value) {
                const displayName = `${module.charAt(0).toUpperCase() + module.slice(1)} ${action.charAt(0).toUpperCase() + action.slice(1)}`;
                displayNameInput.value = displayName;
            }
            
            // Check for duplicates (only if it's a different permission)
            const currentPermissionId = document.getElementById('editPermissionId').value;
            if (currentPermissionId) {
                checkDuplicatePermissionForEdit(permissionName, currentPermissionId);
            }
        } else {
            nameInput.value = '';
        }
    }
}

// Auto-generate permission name for create form
function generateCreatePermissionName() {
    const moduleSelect = document.getElementById('createPermissionModule');
    const actionSelect = document.getElementById('createPermissionAction');
    const nameInput = document.getElementById('createPermissionName');
    const displayNameInput = document.getElementById('createPermissionDisplayName');
    
    if (moduleSelect && actionSelect && nameInput) {
        const module = moduleSelect.value;
        const action = actionSelect.value;
        
        if (module && action) {
            const permissionName = `${module}.${action}`;
            nameInput.value = permissionName;
            
            // Auto-generate display name if empty
            if (displayNameInput && !displayNameInput.value) {
                const displayName = `${module.charAt(0).toUpperCase() + module.slice(1)} ${action.charAt(0).toUpperCase() + action.slice(1)}`;
                displayNameInput.value = displayName;
            }
            
            // Check for duplicates
            checkDuplicatePermission(permissionName, 'create');
        } else {
            nameInput.value = '';
        }
    }
}

// Check for duplicate permissions
async function checkDuplicatePermission(permissionName, formType) {
    try {
        // Show loader
        if (typeof showLoader === 'function') {
            showLoader({ message: 'Checking for duplicates...' });
        }
        
        const response = await fetch(`/admin/api/rbac/permissions/check-duplicate?name=${encodeURIComponent(permissionName)}`, {
            credentials: 'same-origin'
        });
        
        // Hide loader
        if (typeof hideLoader === 'function') {
            hideLoader();
        }
        
        if (!response.ok) {
            console.error('API error:', response.status, response.statusText);
            return false;
        }
        
        const data = await response.json();
        
        if (data.success && data.exists) {
            const nameInput = document.getElementById(`${formType}PermissionName`);
            if (nameInput) {
                nameInput.style.borderColor = '#ef4444';
                nameInput.style.backgroundColor = '#fef2f2';
                
                // Show error message
                showErrorToast(`Permission "${permissionName}" already exists!`);
            }
            return true;
        } else {
            const nameInput = document.getElementById(`${formType}PermissionName`);
            if (nameInput) {
                nameInput.style.borderColor = '#d1d5db';
                nameInput.style.backgroundColor = '#f9fafb';
            }
            return false;
        }
    } catch (error) {
        // Hide loader on error
        if (typeof hideLoader === 'function') {
            hideLoader();
        }
        console.error('Error checking duplicate permission:', error);
        return false;
    }
}

// Check for duplicate permissions for edit form (excluding current permission)
async function checkDuplicatePermissionForEdit(permissionName, currentPermissionId) {
    try {
        // Show loader
        if (typeof showLoader === 'function') {
            showLoader({ message: 'Checking for duplicates...' });
        }
        
        const response = await fetch(`/admin/api/rbac/permissions/check-duplicate?name=${encodeURIComponent(permissionName)}&exclude=${currentPermissionId}`, {
            credentials: 'same-origin'
        });
        
        // Hide loader
        if (typeof hideLoader === 'function') {
            hideLoader();
        }
        
        if (!response.ok) {
            console.error('API error:', response.status, response.statusText);
            return false;
        }
        
        const data = await response.json();
        
        if (data.success && data.exists) {
            const nameInput = document.getElementById('editPermissionName');
            if (nameInput) {
                nameInput.style.borderColor = '#ef4444';
                nameInput.style.backgroundColor = '#fef2f2';
                
                // Show error message
                showErrorToast(`Permission "${permissionName}" already exists!`);
            }
            return true;
        } else {
            const nameInput = document.getElementById('editPermissionName');
            if (nameInput) {
                nameInput.style.borderColor = '#d1d5db';
                nameInput.style.backgroundColor = '#f9fafb';
            }
            return false;
        }
    } catch (error) {
        // Hide loader on error
        if (typeof hideLoader === 'function') {
            hideLoader();
        }
        console.error('Error checking duplicate permission:', error);
        return false;
    }
}

// Permission action functions
function viewPermission(permissionId) {
    // Show loader
    if (typeof showLoader === 'function') {
        showLoader({ message: 'Loading permission details...' });
    }
    
    // Fetch permission details and show modal
    fetch(`/admin/api/rbac/permissions/${permissionId}`, {
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            // Hide loader
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            
            if (data.success) {
                const permission = data.data;
                const permissionDetailsEl = document.getElementById('permissionDetails');
                if (permissionDetailsEl) {
                    permissionDetailsEl.innerHTML = `
                        <div class="space-y-4">
                            <div class="flex items-center space-x-4">
                                <div class="flex-shrink-0 h-16 w-16">
                                    <div class="h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                                        <span class="text-xl font-medium text-white">${permission.display_name.charAt(0).toUpperCase()}</span>
                                    </div>
                                </div>
                                <div>
                                    <h4 class="text-lg font-semibold text-gray-900">${permission.display_name}</h4>
                                    <p class="text-sm text-gray-500">${permission.name}</p>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Module</label>
                                    <p class="mt-1 text-sm text-gray-900">${permission.module || 'N/A'}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Action</label>
                                    <p class="mt-1 text-sm text-gray-900">${permission.action || 'N/A'}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Resource</label>
                                    <p class="mt-1 text-sm text-gray-900">${permission.resource || 'N/A'}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Created</label>
                                    <p class="mt-1 text-sm text-gray-900">${new Date(permission.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Description</label>
                                <p class="mt-1 text-sm text-gray-900">${permission.description || 'No description provided'}</p>
                            </div>
                        </div>
                    `;
                }
                
                const modal = document.getElementById('viewPermissionModal');
                const modalContainer = document.getElementById('viewPermissionModalContainer');
                if (modal && modalContainer) {
                    modal.classList.remove('hidden');
                    // Trigger animation by removing initial classes and adding visible classes
                    setTimeout(() => {
                        modalContainer.classList.remove('scale-95', 'opacity-0');
                        modalContainer.classList.add('scale-100', 'opacity-100');
                    }, 10);
                }
            } else {
                showErrorToast('Error loading permission details');
            }
        })
        .catch(error => {
            // Hide loader on error
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            console.error('Error:', error);
            showErrorToast('Error loading permission details');
        });
}

function editPermission(permissionId) {
    // Show loader
    if (typeof showLoader === 'function') {
        showLoader({ message: 'Loading permission details...' });
    }
    
    // Fetch permission details and show edit modal
    fetch(`/admin/api/rbac/permissions/${permissionId}`, {
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            // Hide loader
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            
            if (data.success) {
                const permission = data.data;
                document.getElementById('editPermissionId').value = permission.id;
                document.getElementById('editPermissionName').value = permission.name;
                document.getElementById('editPermissionDisplayName').value = permission.display_name;
                
                // Set module dropdown value
                const moduleSelect = document.getElementById('editPermissionModule');
                if (moduleSelect) {
                    moduleSelect.value = permission.module || '';
                }
                
                // Set action dropdown value
                const actionSelect = document.getElementById('editPermissionAction');
                if (actionSelect) {
                    actionSelect.value = permission.action || '';
                }
                document.getElementById('editPermissionResource').value = permission.resource;
                document.getElementById('editPermissionDescription').value = permission.description || '';
                
                // Generate permission name after setting module and action
                generateEditPermissionName();
                
                const modal = document.getElementById('editPermissionModal');
                const modalContainer = document.getElementById('editPermissionModalContainer');
                if (modal && modalContainer) {
                    modal.classList.remove('hidden');
                    // Trigger animation by removing initial classes and adding visible classes
                    setTimeout(() => {
                        modalContainer.classList.remove('scale-95', 'opacity-0');
                        modalContainer.classList.add('scale-100', 'opacity-100');
                    }, 10);
                }
            } else {
                showErrorToast('Error loading permission details');
            }
        })
        .catch(error => {
            // Hide loader on error
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            console.error('Error:', error);
            showErrorToast('Error loading permission details');
        });
}

function deletePermission(permissionId) {
    if (typeof showConfirmModal === 'function') {
        showConfirmModal(
            'Are you sure you want to delete this permission? This action cannot be undone.',
            'Confirm Delete',
            function() {
                performDeletePermission(permissionId);
            }
        );
    } else if (confirm('Are you sure you want to delete this permission? This action cannot be undone.')) {
        performDeletePermission(permissionId);
    }
}

function performDeletePermission(permissionId) {
    // Show loader
    if (typeof showLoader === 'function') {
        showLoader({ message: 'Deleting permission...' });
    }
    
    fetch(`/admin/api/rbac/permissions/${permissionId}`, {
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
            showSuccessToast('Permission deleted successfully');
            // Refresh the table
            if (typeof refreshTable === 'function') {
                refreshTable();
            } else if (typeof TableUtils !== 'undefined' && typeof TableUtils.loadTableData === 'function') {
                TableUtils.loadTableData();
            } else {
                location.reload();
            }
        } else {
            showErrorToast('Error: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        // Hide loader on error
        if (typeof hideLoader === 'function') {
            hideLoader();
        }
        console.error('Error:', error);
        showErrorToast('Error deleting permission');
    });
}

function createPermission() {
    const form = document.getElementById('createPermissionForm');
    const modal = document.getElementById('createPermissionModal');
    const modalContainer = document.getElementById('createPermissionModalContainer');
    
    if (form) form.reset();
    if (modal && modalContainer) {
        modal.classList.remove('hidden');
        // Trigger animation by removing initial classes and adding visible classes
        setTimeout(() => {
            modalContainer.classList.remove('scale-95', 'opacity-0');
            modalContainer.classList.add('scale-100', 'opacity-100');
        }, 10);
    }
}

// Modal functions
function closeViewModal() {
    const modal = document.getElementById('viewPermissionModal');
    const modalContainer = document.getElementById('viewPermissionModalContainer');
    if (modal && modalContainer) {
        // Animate out
        modalContainer.classList.remove('scale-100', 'opacity-100');
        modalContainer.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

function closeEditModal() {
    const modal = document.getElementById('editPermissionModal');
    const modalContainer = document.getElementById('editPermissionModalContainer');
    if (modal && modalContainer) {
        // Animate out
        modalContainer.classList.remove('scale-100', 'opacity-100');
        modalContainer.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

function closeCreateModal() {
    const modal = document.getElementById('createPermissionModal');
    const modalContainer = document.getElementById('createPermissionModalContainer');
    if (modal && modalContainer) {
        // Animate out
        modalContainer.classList.remove('scale-100', 'opacity-100');
        modalContainer.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

// Form submission handlers
document.addEventListener('DOMContentLoaded', function() {
    // Load modules and actions on page load
    loadModulesAndActions();
    
    // Edit form submission
    const editForm = document.getElementById('editPermissionForm');
    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(editForm);
            const permissionId = formData.get('id');
            const permissionName = formData.get('name');
            
            // Check for duplicates before submitting
            const isDuplicate = await checkDuplicatePermissionForEdit(permissionName, permissionId);
            if (isDuplicate) {
                return; // Stop submission if duplicate exists
            }
            
            // Show loader for form submission
            if (typeof showLoader === 'function') {
                showLoader({ message: 'Updating permission...' });
            }
            
            fetch(`/admin/api/rbac/permissions/${permissionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    name: formData.get('name'),
                    display_name: formData.get('display_name'),
                    module: formData.get('module'),
                    action: formData.get('action'),
                    resource: formData.get('resource'),
                    description: formData.get('description')
                })
            })
            .then(response => response.json())
            .then(data => {
                // Hide loader
                if (typeof hideLoader === 'function') {
                    hideLoader();
                }
                
                if (data.success) {
                    showSuccessToast('Permission updated successfully');
                    closeEditModal();
                    // Refresh the table
                    if (typeof refreshTable === 'function') {
                        refreshTable();
                    } else if (typeof TableUtils !== 'undefined' && typeof TableUtils.loadTableData === 'function') {
                        TableUtils.loadTableData();
                    } else {
                        location.reload();
                    }
                } else {
                    showErrorToast('Error: ' + (data.message || 'Unknown error'));
                }
            })
            .catch(error => {
                // Hide loader on error
                if (typeof hideLoader === 'function') {
                    hideLoader();
                }
                console.error('Error:', error);
                showErrorToast('Error updating permission');
            });
        });
    }

    // Create form submission
    const createForm = document.getElementById('createPermissionForm');
    if (createForm) {
        createForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(createForm);
            const permissionName = formData.get('name');
            
            // Check for duplicates before submitting
            const isDuplicate = await checkDuplicatePermission(permissionName, 'create');
            if (isDuplicate) {
                return; // Stop submission if duplicate exists
            }
            
            // Show loader for form submission
            if (typeof showLoader === 'function') {
                showLoader({ message: 'Creating permission...' });
            }
            
            fetch('/admin/api/rbac/permissions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    name: formData.get('name'),
                    display_name: formData.get('display_name'),
                    module: formData.get('module'),
                    action: formData.get('action'),
                    resource: formData.get('resource'),
                    description: formData.get('description')
                })
            })
            .then(response => response.json())
            .then(data => {
                // Hide loader
                if (typeof hideLoader === 'function') {
                    hideLoader();
                }
                
                if (data.success) {
                    showSuccessToast('Permission created successfully');
                    closeCreateModal();
                    // Refresh the table
                    if (typeof refreshTable === 'function') {
                        refreshTable();
                    } else if (typeof TableUtils !== 'undefined' && typeof TableUtils.loadTableData === 'function') {
                        TableUtils.loadTableData();
                    } else {
                        location.reload();
                    }
                } else {
                    showErrorToast('Error: ' + (data.message || 'Unknown error'));
                }
            })
            .catch(error => {
                // Hide loader on error
                if (typeof hideLoader === 'function') {
                    hideLoader();
                }
                console.error('Error:', error);
                showErrorToast('Error creating permission');
            });
        });
    }
});

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

// Click outside to close modals
document.addEventListener('click', function(event) {
    // Close view modal
    const viewModal = document.getElementById('viewPermissionModal');
    const viewModalContainer = document.getElementById('viewPermissionModalContainer');
    if (viewModal && !viewModal.classList.contains('hidden') && 
        !viewModalContainer.contains(event.target) && event.target === viewModal) {
        closeViewModal();
    }
    
    // Close edit modal
    const editModal = document.getElementById('editPermissionModal');
    const editModalContainer = document.getElementById('editPermissionModalContainer');
    if (editModal && !editModal.classList.contains('hidden') && 
        !editModalContainer.contains(event.target) && event.target === editModal) {
        closeEditModal();
    }
    
    // Close create modal
    const createModal = document.getElementById('createPermissionModal');
    const createModalContainer = document.getElementById('createPermissionModalContainer');
    if (createModal && !createModal.classList.contains('hidden') && 
        !createModalContainer.contains(event.target) && event.target === createModal) {
        closeCreateModal();
    }
});

// Make sure formatters are available globally
window.formatStatus = formatStatus;
