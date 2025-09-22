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
    // Fetch role details and show modal
    fetch(`/admin/api/rbac/roles/${roleId}`, {
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const role = data.data;
                const roleDetailsEl = document.getElementById('roleDetails');
                if (roleDetailsEl) {
                    roleDetailsEl.innerHTML = `
                        <div class="space-y-4">
                            <div class="flex items-center space-x-4">
                                <div class="flex-shrink-0 h-16 w-16">
                                    <div class="h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                                        <span class="text-xl font-medium text-white">${role.display_name.charAt(0).toUpperCase()}</span>
                                    </div>
                                </div>
                                <div>
                                    <h4 class="text-lg font-semibold text-gray-900">${role.display_name}</h4>
                                    <p class="text-sm text-gray-500">${role.name}</p>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Users</label>
                                    <p class="mt-1 text-sm text-gray-900">${role.user_count || 0}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Permissions</label>
                                    <p class="mt-1 text-sm text-gray-900">${role.permission_count || 0}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Status</label>
                                    <p class="mt-1 text-sm text-gray-900">${role.is_active ? 'Active' : 'Inactive'}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Created</label>
                                    <p class="mt-1 text-sm text-gray-900">${new Date(role.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Description</label>
                                <p class="mt-1 text-sm text-gray-900">${role.description || 'No description provided'}</p>
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
            console.error('Error:', error);
            showErrorToast('Error loading role details');
        });
}

function editRole(roleId) {
    // Fetch role details and show edit modal
    fetch(`/admin/api/rbac/roles/${roleId}`, {
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
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
    fetch(`/admin/api/rbac/roles/${roleId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
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
document.addEventListener('click', function(event) {
    // Close view modal
    const viewModal = document.getElementById('viewRoleModal');
    const viewModalContainer = document.getElementById('viewRoleModalContainer');
    if (viewModal && !viewModal.classList.contains('hidden') && 
        !viewModalContainer.contains(event.target) && event.target === viewModal) {
        closeViewModal();
    }
    
    // Close edit modal
    const editModal = document.getElementById('editRoleModal');
    const editModalContainer = document.getElementById('editRoleModalContainer');
    if (editModal && !editModal.classList.contains('hidden') && 
        !editModalContainer.contains(event.target) && event.target === editModal) {
        closeEditModal();
    }
    
    // Close create modal
    const createModal = document.getElementById('createRoleModal');
    const createModalContainer = document.getElementById('createRoleModalContainer');
    if (createModal && !createModal.classList.contains('hidden') && 
        !createModalContainer.contains(event.target) && event.target === createModal) {
        closeCreateModal();
    }
});

// Form submission handlers
document.addEventListener('DOMContentLoaded', function() {
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
