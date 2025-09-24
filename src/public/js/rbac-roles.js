// RBAC Roles Management JavaScript Functions

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

// Role action functions
function viewRole(roleId) {
    // Show loader
    if (typeof GlobalLoader !== 'undefined') {
        GlobalLoader.show({
            title: 'Loading Role Details...',
            message: 'Fetching role information from server',
            showProgress: false
        });
    }
    
    // Fetch role details and show modal
    fetch(`/admin/api/rbac/roles/${roleId}`, {
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            // Hide loader
            if (typeof GlobalLoader !== 'undefined') {
                GlobalLoader.hide();
            }
            
            if (data.success) {
                const role = data.data;
                const roleDetailsEl = document.getElementById('roleDetails');
                if (roleDetailsEl) {
                    roleDetailsEl.innerHTML = `
                        <div class="space-y-6">
                            <!-- Role Header -->
                            <div class="flex items-center space-x-6">
                                <div class="flex-shrink-0 h-20 w-20">
                                    <div class="h-20 w-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                                        <span class="text-2xl font-bold text-white">${role.display_name.charAt(0).toUpperCase()}</span>
                                    </div>
                                </div>
                                <div class="flex-1">
                                    <h4 class="text-2xl font-bold text-gray-900 mb-1">${role.display_name}</h4>
                                    <p class="text-sm text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded-full inline-block">${role.name}</p>
                                </div>
                            </div>
                            
                            <!-- Role Stats -->
                            <div class="grid grid-cols-2 gap-6">
                                <div class="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0">
                                            <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                                <i class="fas fa-users text-white text-sm"></i>
                                            </div>
                                        </div>
                                        <div class="ml-4">
                                            <p class="text-sm font-medium text-blue-600">Users</p>
                                            <p class="text-2xl font-bold text-blue-900">${role.user_count || 0}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0">
                                            <div class="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                                                <i class="fas fa-key text-white text-sm"></i>
                                            </div>
                                        </div>
                                        <div class="ml-4">
                                            <p class="text-sm font-medium text-green-600">Permissions</p>
                                            <p class="text-2xl font-bold text-green-900">${role.permission_count || 0}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0">
                                            <div class="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                                                <i class="fas fa-info-circle text-white text-sm"></i>
                                            </div>
                                        </div>
                                        <div class="ml-4">
                                            <p class="text-sm font-medium text-purple-600">Status</p>
                                            <p class="text-lg font-bold ${role.is_active ? 'text-green-600' : 'text-red-600'}">
                                                ${role.is_active ? 'Active' : 'Inactive'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0">
                                            <div class="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                                                <i class="fas fa-calendar text-white text-sm"></i>
                                            </div>
                                        </div>
                                        <div class="ml-4">
                                            <p class="text-sm font-medium text-orange-600">Created</p>
                                            <p class="text-lg font-bold text-orange-900">${new Date(role.created_at).toLocaleDateString('en-GB')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Description -->
                            <div class="bg-gray-50 p-6 rounded-xl border border-gray-200">
                                <h5 class="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                    <i class="fas fa-align-left mr-2 text-gray-500"></i>
                                    Description
                                </h5>
                                <p class="text-sm text-gray-900 leading-relaxed">${role.description || 'No description provided for this role.'}</p>
                            </div>
                        </div>
                    `;
                }
                
                const modal = document.getElementById('viewRoleModal');
                const modalContainer = document.getElementById('viewRoleModalContainer');
                if (modal && modalContainer) {
                    modal.classList.remove('hidden');
                    // Trigger animation by removing initial classes and adding visible classes
                    setTimeout(() => {
                        modalContainer.classList.remove('scale-95', 'opacity-0');
                        modalContainer.classList.add('scale-100', 'opacity-100');
                    }, 10);
                }
            } else {
                showErrorToast('Error loading role details');
            }
        })
        .catch(error => {
            // Hide loader on error
            if (typeof GlobalLoader !== 'undefined') {
                GlobalLoader.hide();
            }
            console.error('Error:', error);
            showErrorToast('Error loading role details');
        });
}

function editRole(roleId) {
    // Show loader
    if (typeof GlobalLoader !== 'undefined') {
        GlobalLoader.show({
            title: 'Loading Role Details...',
            message: 'Fetching role information for editing',
            showProgress: false
        });
    }
    
    // Fetch role details and show edit modal
    fetch(`/admin/api/rbac/roles/${roleId}`, {
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            // Hide loader
            if (typeof GlobalLoader !== 'undefined') {
                GlobalLoader.hide();
            }
            
            if (data.success) {
                const role = data.data;
                document.getElementById('editRoleId').value = role.id;
                document.getElementById('editRoleName').value = role.name;
                document.getElementById('editRoleDisplayName').value = role.display_name;
                document.getElementById('editRoleDescription').value = role.description || '';
                document.getElementById('editRoleActive').checked = role.is_active;
                
                const modal = document.getElementById('editRoleModal');
                const modalContainer = document.getElementById('editRoleModalContainer');
                if (modal && modalContainer) {
                    modal.classList.remove('hidden');
                    // Trigger animation by removing initial classes and adding visible classes
                    setTimeout(() => {
                        modalContainer.classList.remove('scale-95', 'opacity-0');
                        modalContainer.classList.add('scale-100', 'opacity-100');
                    }, 10);
                }
            } else {
                showErrorToast('Error loading role details');
            }
        })
        .catch(error => {
            // Hide loader on error
            if (typeof GlobalLoader !== 'undefined') {
                GlobalLoader.hide();
            }
            console.error('Error:', error);
            showErrorToast('Error loading role details');
        });
}

function deleteRole(roleId) {
    if (typeof showConfirmModal === 'function') {
        showConfirmModal(
            'Are you sure you want to delete this role? This action cannot be undone.',
            'Confirm Delete',
            function() {
                performDeleteRole(roleId);
            }
        );
    } else if (confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
        performDeleteRole(roleId);
    }
}

function performDeleteRole(roleId) {
    // Show loader
    if (typeof GlobalLoader !== 'undefined') {
        GlobalLoader.show({
            title: 'Deleting Role...',
            message: 'Removing role from system',
            showProgress: false
        });
    }
    
    fetch(`/admin/api/rbac/roles/${roleId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        // Hide loader
        if (typeof GlobalLoader !== 'undefined') {
            GlobalLoader.hide();
        }
        
        if (data.success) {
            showSuccessToast('Role deleted successfully');
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
        if (typeof GlobalLoader !== 'undefined') {
            GlobalLoader.hide();
        }
        console.error('Error:', error);
        showErrorToast('Error deleting role');
    });
}

function manageRolePermissions(roleId) {
    window.location.href = `/admin/rbac/roles/${roleId}/permissions`;
}

function createRole() {
    const form = document.getElementById('createRoleForm');
    const modal = document.getElementById('createRoleModal');
    const modalContainer = document.getElementById('createRoleModalContainer');
    
    if (form) form.reset();
    if (document.getElementById('createRoleActive')) {
        document.getElementById('createRoleActive').checked = true;
    }
    
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
    const modal = document.getElementById('viewRoleModal');
    const modalContainer = document.getElementById('viewRoleModalContainer');
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
    const modal = document.getElementById('editRoleModal');
    const modalContainer = document.getElementById('editRoleModalContainer');
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
    const modal = document.getElementById('createRoleModal');
    const modalContainer = document.getElementById('createRoleModalContainer');
    if (modal && modalContainer) {
        // Animate out
        modalContainer.classList.remove('scale-100', 'opacity-100');
        modalContainer.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

// Click outside modal to close
document.addEventListener('DOMContentLoaded', function() {
    // View modal click outside to close
    const viewModal = document.getElementById('viewRoleModal');
    if (viewModal) {
        viewModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeViewModal();
            }
        });
    }
    
    // Edit modal click outside to close
    const editModal = document.getElementById('editRoleModal');
    if (editModal) {
        editModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeEditModal();
            }
        });
    }
    
    // Create modal click outside to close
    const createModal = document.getElementById('createRoleModal');
    if (createModal) {
        createModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeCreateModal();
            }
        });
    }
    
    // ESC key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const viewModal = document.getElementById('viewRoleModal');
            const editModal = document.getElementById('editRoleModal');
            const createModal = document.getElementById('createRoleModal');
            
            if (viewModal && !viewModal.classList.contains('hidden')) {
                closeViewModal();
            } else if (editModal && !editModal.classList.contains('hidden')) {
                closeEditModal();
            } else if (createModal && !createModal.classList.contains('hidden')) {
                closeCreateModal();
            }
        }
    });
});

    // Form submission handlers
    // Edit form submission
    const editForm = document.getElementById('editRoleForm');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(editForm);
            const roleId = formData.get('id');
            
            fetch(`/admin/api/rbac/roles/${roleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.get('name'),
                    display_name: formData.get('display_name'),
                    description: formData.get('description'),
                    is_active: formData.get('is_active') === 'on' ? 1 : 0
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showSuccessToast('Role updated successfully');
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
                console.error('Error:', error);
                showErrorToast('Error updating role');
            });
        });
    }

    // Create form submission
    const createForm = document.getElementById('createRoleForm');
    if (createForm) {
        createForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(createForm);
            
            fetch('/admin/api/rbac/roles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.get('name'),
                    display_name: formData.get('display_name'),
                    description: formData.get('description'),
                    is_active: formData.get('is_active') === 'on' ? 1 : 0
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showSuccessToast('Role created successfully');
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
                console.error('Error:', error);
                showErrorToast('Error creating role');
            });
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
