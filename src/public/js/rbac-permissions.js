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

// Permission formatter with consistent icon styling
function formatPermission(item) {
    const permissionName = typeof item === 'object' ? item.display_name : item;
    const permissionKey = typeof item === 'object' ? item.name : '';
    
    // Get appropriate icon based on action type - consistent styling without background squares
    let iconClass = 'fas fa-key';
    let iconColor = 'text-purple-600';
    
    if (permissionKey) {
        const action = permissionKey.split('.').pop() || '';
        switch (action.toLowerCase()) {
            case 'view':
            case 'read':
                iconClass = 'fas fa-eye';
                iconColor = 'text-blue-600';
                break;
            case 'create':
            case 'add':
                iconClass = 'fas fa-plus';
                iconColor = 'text-green-600';
                break;
            case 'update':
            case 'edit':
                iconClass = 'fas fa-edit';
                iconColor = 'text-yellow-600';
                break;
            case 'delete':
            case 'remove':
                iconClass = 'fas fa-trash';
                iconColor = 'text-red-600';
                break;
            case 'manage':
                iconClass = 'fas fa-cogs';
                iconColor = 'text-indigo-600';
                break;
            case 'assign_roles':
                iconClass = 'fas fa-key';
                iconColor = 'text-purple-600';
                break;
            default:
                iconClass = 'fas fa-key';
                iconColor = 'text-purple-600';
        }
    }
    
    return `
        <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
                <i class="${iconClass} ${iconColor} text-lg"></i>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900 truncate">${permissionName}</p>
                <p class="text-xs text-gray-500 font-mono">${permissionKey}</p>
            </div>
        </div>
    `;
}

// Permission name formatter
function formatPermissionName(item) {
    const name = typeof item === 'object' ? item.name : item;
    if (!name) return '<span class="text-gray-400 italic">No name</span>';
    
    return `
        <div class="max-w-xs">
            <p class="text-sm font-mono text-gray-700">${name}</p>
        </div>
    `;
}

// Module formatter
function formatModule(item) {
    const module = typeof item === 'object' ? item.module : item;
    if (!module) return '<span class="text-gray-400 italic">No module</span>';
    
    // Get module icon based on module name - consistent styling without background squares
    let iconClass = 'fas fa-puzzle-piece';
    let iconColor = 'text-indigo-600';
    
    switch (module.toLowerCase()) {
        case 'dashboard':
            iconClass = 'fas fa-tachometer-alt';
            iconColor = 'text-blue-600';
            break;
        case 'users':
            iconClass = 'fas fa-users';
            iconColor = 'text-green-600';
            break;
        case 'media':
            iconClass = 'fas fa-images';
            iconColor = 'text-purple-600';
            break;
        case 'rbac':
            iconClass = 'fas fa-shield-alt';
            iconColor = 'text-orange-600';
            break;
        case 'settings':
            iconClass = 'fas fa-cog';
            iconColor = 'text-gray-600';
            break;
        case 'modules':
            iconClass = 'fas fa-cubes';
            iconColor = 'text-indigo-600';
            break;
        default:
            iconClass = 'fas fa-puzzle-piece';
            iconColor = 'text-indigo-600';
    }
    
    return `
        <div class="flex items-center space-x-2">
            <i class="${iconClass} ${iconColor} text-sm"></i>
            <span class="text-sm font-medium text-gray-700 capitalize">${module}</span>
        </div>
    `;
}

// Action formatter
function formatAction(item) {
    const action = typeof item === 'object' ? item.action : item;
    if (!action) return '<span class="text-gray-400 italic">No action</span>';
    
    // Get action icon and color - consistent styling without background squares
    let iconClass = 'fas fa-circle';
    let iconColor = 'text-gray-600';
    
    switch (action.toLowerCase()) {
        case 'view':
        case 'read':
            iconClass = 'fas fa-eye';
            iconColor = 'text-blue-600';
            break;
        case 'create':
        case 'add':
            iconClass = 'fas fa-plus';
            iconColor = 'text-green-600';
            break;
        case 'update':
        case 'edit':
            iconClass = 'fas fa-edit';
            iconColor = 'text-yellow-600';
            break;
        case 'delete':
        case 'remove':
            iconClass = 'fas fa-trash';
            iconColor = 'text-red-600';
            break;
        case 'manage':
            iconClass = 'fas fa-cogs';
            iconColor = 'text-indigo-600';
            break;
        default:
            iconClass = 'fas fa-circle';
            iconColor = 'text-gray-600';
    }
    
    return `
        <div class="flex items-center space-x-2">
            <i class="${iconClass} ${iconColor} text-sm mr-1"></i>
            <span class="text-sm font-medium text-gray-700 capitalize">${action}</span>
        </div>
    `;
}

// Resource formatter
function formatResource(item) {
    const resource = typeof item === 'object' ? item.resource : item;
    if (!resource) return '<span class="text-gray-400 italic">No resource</span>';
    
    return `
        <div class="max-w-xs">
            <p class="text-sm text-gray-700 font-mono">${resource}</p>
        </div>
    `;
}

// Description formatter
function formatDescription(item) {
    const description = typeof item === 'object' ? item.description : item;
    if (!description || description.trim() === '') {
        return '<span class="text-gray-400 italic">No description</span>';
    }
    
    // Truncate long descriptions
    const truncated = description.length > 40 ? description.substring(0, 40) + '...' : description;
    
    return `
        <div class="max-w-xs">
            <p class="text-sm text-gray-700" title="${description}">${truncated}</p>
        </div>
    `;
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
            // Initially populate with all actions (no filtering)
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
        
        // Add event listener for filtering actions and auto-generating permission name
        editModuleSelect.addEventListener('change', function() {
            const selectedModule = this.value;
            // Filter actions based on selected module
            populateActionDropdowns(selectedModule);
            // Clear action selection when module changes
            const actionSelect = document.getElementById('editPermissionAction');
            if (actionSelect) {
                actionSelect.value = '';
            }
            generateEditPermissionName();
        });
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
        
        // Add event listener for filtering actions and auto-generating permission name
        createModuleSelect.addEventListener('change', function() {
            const selectedModule = this.value;
            // Filter actions based on selected module
            populateActionDropdowns(selectedModule);
            // Clear action selection when module changes
            const actionSelect = document.getElementById('createPermissionAction');
            if (actionSelect) {
                actionSelect.value = '';
            }
            generateCreatePermissionName();
        });
    }
}

// Populate action dropdowns based on selected module
function populateActionDropdowns(moduleName = null) {
    const editActionSelect = document.getElementById('editPermissionAction');
    const createActionSelect = document.getElementById('createPermissionAction');
    
    // Filter actions based on selected module
    let filteredActions = availableActions;
    if (moduleName && moduleName !== '') {
        filteredActions = availableActions.filter(action => action.module_name === moduleName);
    }
    
    if (editActionSelect) {
        // Clear existing options except the first one
        editActionSelect.innerHTML = '<option value="">Select Action</option>';
        
        if (filteredActions.length === 0 && moduleName) {
            // No actions available for this module
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No actions available for this module';
            option.disabled = true;
            editActionSelect.appendChild(option);
        } else {
            filteredActions.forEach(action => {
                const option = document.createElement('option');
                option.value = action.name;
                option.textContent = action.display_name || action.name.charAt(0).toUpperCase() + action.name.slice(1);
                editActionSelect.appendChild(option);
            });
        }
        
        // Add event listener for auto-generating permission name
        editActionSelect.addEventListener('change', generateEditPermissionName);
    }
    
    if (createActionSelect) {
        // Clear existing options except the first one
        createActionSelect.innerHTML = '<option value="">Select Action</option>';
        
        if (filteredActions.length === 0 && moduleName) {
            // No actions available for this module
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No actions available for this module';
            option.disabled = true;
            createActionSelect.appendChild(option);
        } else {
            filteredActions.forEach(action => {
                const option = document.createElement('option');
                option.value = action.name;
                option.textContent = action.display_name || action.name.charAt(0).toUpperCase() + action.name.slice(1);
                createActionSelect.appendChild(option);
            });
        }
        
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
                    // Get appropriate icon based on action type
                    let iconClass = 'fas fa-key';
                    if (permission.name) {
                        const action = permission.name.split('.').pop() || '';
                        switch (action.toLowerCase()) {
                            case 'view':
                            case 'read':
                                iconClass = 'fas fa-eye';
                                break;
                            case 'create':
                            case 'add':
                                iconClass = 'fas fa-plus';
                                break;
                            case 'update':
                            case 'edit':
                                iconClass = 'fas fa-edit';
                                break;
                            case 'delete':
                            case 'remove':
                                iconClass = 'fas fa-trash';
                                break;
                            case 'manage':
                                iconClass = 'fas fa-cogs';
                                break;
                            default:
                                iconClass = 'fas fa-key';
                        }
                    }

                    permissionDetailsEl.innerHTML = `
                        <div class="space-y-6">
                            <!-- Permission Icon and Title -->
                            <div class="flex items-center justify-center">
                                <div class="h-20 w-20 rounded-full module-icon-container flex items-center justify-center" style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); box-shadow: 0 10px 25px -5px rgba(139, 92, 246, 0.3);">
                                    <i class="${iconClass} text-white text-3xl"></i>
                                </div>
                            </div>
                            
                            <div class="text-center">
                                <h4 class="text-2xl font-bold text-gray-900 mb-2">${permission.display_name}</h4>
                                <p class="text-sm text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded-full inline-block">${permission.name}</p>
                            </div>
                            
                            <!-- Permission Details Grid -->
                            <div class="grid grid-cols-2 gap-4">
                                <div class="detail-card rounded-xl p-4" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                                    <label class="block text-sm font-semibold text-gray-600 mb-2">Module</label>
                                    <p class="text-lg font-bold text-gray-900">${permission.module || 'N/A'}</p>
                                </div>
                                <div class="detail-card rounded-xl p-4" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                                    <label class="block text-sm font-semibold text-gray-600 mb-2">Action</label>
                                    <p class="text-lg font-bold text-gray-900">${permission.action || 'N/A'}</p>
                                </div>
                                <div class="detail-card rounded-xl p-4" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                                    <label class="block text-sm font-semibold text-gray-600 mb-2">Resource</label>
                                    <p class="text-lg font-bold text-gray-900">${permission.resource || 'N/A'}</p>
                                </div>
                                <div class="detail-card rounded-xl p-4" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                                    <label class="block text-sm font-semibold text-gray-600 mb-2">Created</label>
                                    <p class="text-lg font-bold text-gray-900">${new Date(permission.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            
                            <!-- Description -->
                            <div class="detail-card rounded-xl p-4" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                                <label class="block text-sm font-semibold text-gray-600 mb-2">Description</label>
                                <p class="text-sm text-gray-700 leading-relaxed">${permission.description || 'No description provided'}</p>
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
                
                // Set module dropdown value and filter actions
                const moduleSelect = document.getElementById('editPermissionModule');
                if (moduleSelect) {
                    moduleSelect.value = permission.module || '';
                    // Filter actions based on selected module
                    if (permission.module) {
                        populateActionDropdowns(permission.module);
                    }
                }
                
                // Set action dropdown value after filtering
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
    if (typeof showDeleteModal === 'function') {
        showDeleteModal(
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
    if (typeof window.GlobalLoader !== 'undefined') {
        window.GlobalLoader.show({
            title: 'Deleting Permission...',
            message: 'Please wait while we delete the permission',
            showProgress: false
        });
    }
    
    fetch(`/admin/api/rbac/permissions/${permissionId}`, {
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
        if (typeof window.GlobalLoader !== 'undefined') {
            window.GlobalLoader.hide();
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

// Make sure all formatters are available globally
window.formatStatus = formatStatus;
window.formatPermission = formatPermission;
window.formatPermissionName = formatPermissionName;
window.formatModule = formatModule;
window.formatAction = formatAction;
window.formatResource = formatResource;
window.formatDescription = formatDescription;
