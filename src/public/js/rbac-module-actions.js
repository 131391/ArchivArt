// RBAC Module Actions Management JavaScript Functions

// Format status for table display
function formatStatus(value, item) {
    return item.is_active ? 
        '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>' : 
        '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Inactive</span>';
}

// Module action functions
function viewModuleAction(actionId) {
    // Fetch module action details and show modal
    fetch(`/admin/api/rbac/module-actions/${actionId}`, {
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const action = data.data;
                const actionDetailsEl = document.getElementById('moduleActionDetails');
                if (actionDetailsEl) {
                    actionDetailsEl.innerHTML = `
                        <div class="space-y-4">
                            <div class="flex items-center space-x-4">
                                <div class="flex-shrink-0 h-16 w-16">
                                    <div class="h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                                        <i class="fas fa-cog text-white text-2xl"></i>
                                    </div>
                                </div>
                                <div>
                                    <h4 class="text-lg font-semibold text-gray-900">${action.display_name}</h4>
                                    <p class="text-sm text-gray-500">${action.name}</p>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Action Name</label>
                                    <p class="mt-1 text-sm text-gray-900">${action.name}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Display Name</label>
                                    <p class="mt-1 text-sm text-gray-900">${action.display_name}</p>
                                </div>
                                <div class="col-span-2">
                                    <label class="block text-sm font-medium text-gray-700">Description</label>
                                    <p class="mt-1 text-sm text-gray-900">${action.description || 'No description provided'}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Status</label>
                                    <p class="mt-1 text-sm text-gray-900">
                                        ${action.is_active ? 
                                            '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>' : 
                                            '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactive</span>'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    `;
                }
                
                const modal = document.getElementById('viewModuleActionModal');
                const modalContainer = document.getElementById('viewModuleActionModalContainer');
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
                showErrorToast('Error loading module action details');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showErrorToast('Error loading module action details');
        });
}

function editModuleAction(actionId) {
    // Fetch module action details and show edit modal
    fetch(`/admin/api/rbac/module-actions/${actionId}`, {
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
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
            console.error('Error:', error);
            showErrorToast('Error loading module action details');
        });
}

function deleteModuleAction(actionId) {
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
