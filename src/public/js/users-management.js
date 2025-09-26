function formatUserName(item) {
    const name = typeof item === 'object' ? item.name : item;
    const email = typeof item === 'object' ? item.email : '';
    
    if (!name) return '<span class="text-gray-400 italic">No name</span>';
    
    // Get user initials
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    
    return `
        <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
                <div class="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span class="text-white font-semibold text-sm">${initials}</span>
                </div>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900 truncate">${name}</p>
                <p class="text-xs text-gray-500 truncate">${email}</p>
            </div>
        </div>
    `;
}

function formatUserEmail(item) {
    const email = typeof item === 'object' ? item.email : item;
    if (!email) return '<span class="text-gray-400 italic">No email</span>';
    
    return `
        <div class="max-w-xs">
            <p class="text-sm text-gray-700 bg-gray-50 px-2 py-1 rounded font-mono">${email}</p>
        </div>
    `;
}

function formatUserRole(item) {
    const roleDisplayName = typeof item === 'object' ? item.role_display_name : item;
    const roleKey = typeof item === 'object' ? item.role : '';
    
    if (!roleDisplayName || roleDisplayName === 'null') {
        return `
            <div class="flex items-center space-x-2">
                <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <i class="fas fa-user-slash text-gray-600 text-xs"></i>
                </div>
                <span class="text-sm font-medium text-gray-700">No Role</span>
            </div>
        `;
    }
    
    // Get appropriate icon based on role
    let iconClass = 'fas fa-user';
    let iconColor = 'text-blue-600';
    let bgColor = 'bg-blue-100';
    
    if (roleKey) {
        switch (roleKey.toLowerCase()) {
            case 'admin':
            case 'administrator':
            case 'super administrator':
                iconClass = 'fas fa-crown';
                iconColor = 'text-purple-600';
                bgColor = 'bg-purple-100';
                break;
            case 'moderator':
                iconClass = 'fas fa-shield-alt';
                iconColor = 'text-orange-600';
                bgColor = 'bg-orange-100';
                break;
            case 'editor':
            case 'content editor':
                iconClass = 'fas fa-edit';
                iconColor = 'text-green-600';
                bgColor = 'bg-green-100';
                break;
            case 'viewer':
                iconClass = 'fas fa-eye';
                iconColor = 'text-indigo-600';
                bgColor = 'bg-indigo-100';
                break;
            case 'user':
            case 'regular user':
                iconClass = 'fas fa-user';
                iconColor = 'text-gray-600';
                bgColor = 'bg-gray-100';
                break;
            default:
                iconClass = 'fas fa-user-tag';
                iconColor = 'text-blue-600';
                bgColor = 'bg-blue-100';
        }
    }
    
    return `
        <div class="flex items-center space-x-2">
            <div class="w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center">
                <i class="${iconClass} ${iconColor} text-xs"></i>
            </div>
            <span class="text-sm font-medium text-gray-700">${roleDisplayName}</span>
        </div>
    `;
}

function formatUserStatus(item) {
    const isActive = typeof item === 'object' ? item.is_active : item;
    const isBlocked = typeof item === 'object' ? item.is_blocked : false;
    
    if (isBlocked) {
        return `
            <div class="flex items-center space-x-2">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    <i class="fas fa-ban mr-1"></i>
                    Blocked
                </span>
            </div>
        `;
    } else if (isActive === 1 || isActive === true) {
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
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                    <i class="fas fa-pause-circle mr-1"></i>
                    Inactive
                </span>
            </div>
        `;
    }
}

function formatUserDate(item) {
    const dateString = typeof item === 'object' ? item.created_at : item;
    if (!dateString) return '<span class="text-gray-400 italic">N/A</span>';
    
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    
    return `
        <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <i class="fas fa-calendar text-blue-600 text-xs"></i>
            </div>
            <span class="text-sm font-medium text-gray-700">${formattedDate}</span>
        </div>
    `;
}

function formatAvatar(item) {
    if (item && item.name) {
        const initials = item.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        return `<div class="flex items-center justify-center">
            <div class="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
                ${initials}
            </div>
        </div>`;
    }
    return `<div class="flex items-center justify-center">
        <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold text-sm">
            ?
        </div>
    </div>`;
}

// User management functions
function viewUser(userId) {
    // Show loader immediately without delay
    if (typeof showLoader === 'function') {
        showLoader({
            title: 'Loading User Details...',
            message: 'Fetching user information',
            delay: 0 // No delay
        });
    }
    
    fetch(`/admin/users/${userId}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            // Hide loader immediately
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            
            
            if (data.success && data.data) {
                const user = data.data;
                
                // Check if user has required properties
                if (!user.name) {
                    showErrorToast('User data is incomplete');
                    return;
                }
                
                const userDetails = `
                    <div class="space-y-8">
                        <!-- User Profile Header -->
                        <div class="text-center">
                            <div class="relative inline-block">
                                <img class="h-24 w-24 rounded-full mx-auto shadow-lg" src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=ffffff&size=96" alt="${user.name}">
                                <div class="absolute -bottom-2 -right-2 w-8 h-8 ${getStatusText(user) === 'Active' ? 'bg-green-500' : 'bg-red-500'} border-4 border-white rounded-full flex items-center justify-center">
                                    <i class="fas fa-check text-white text-xs"></i>
                                </div>
                            </div>
                            <h3 class="text-2xl font-bold text-gray-900 mt-4 mb-1">${user.name}</h3>
                            <p class="text-gray-600 mb-4">${user.email}</p>
                            <span class="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusText(user) === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                <div class="w-2 h-2 rounded-full mr-2 ${getStatusText(user) === 'Active' ? 'bg-green-500' : 'bg-red-500'}"></div>
                                ${getStatusText(user)}
                            </span>
                        </div>

                        <!-- User Information -->
                        <div class="space-y-4">
                            <div class="flex items-center justify-between py-3 border-b border-gray-100">
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                        <i class="fas fa-user-tag text-blue-600 text-sm"></i>
                                    </div>
                                    <span class="text-sm font-medium text-gray-700">Role</span>
                                </div>
                                <span class="text-sm font-semibold text-gray-900 capitalize">${user.role}</span>
                            </div>

                            <div class="flex items-center justify-between py-3 border-b border-gray-100">
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                        <i class="fas fa-calendar-plus text-green-600 text-sm"></i>
                                    </div>
                                    <span class="text-sm font-medium text-gray-700">Created</span>
                                </div>
                                <span class="text-sm font-semibold text-gray-900">${new Date(user.created_at).toLocaleDateString()}</span>
                            </div>

                            <div class="flex items-center justify-between py-3 border-b border-gray-100">
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                        <i class="fas fa-clock text-purple-600 text-sm"></i>
                                    </div>
                                    <span class="text-sm font-medium text-gray-700">Last Updated</span>
                                </div>
                                <span class="text-sm font-semibold text-gray-900">${new Date(user.updated_at).toLocaleDateString()}</span>
                            </div>

                            <div class="flex items-center justify-between py-3">
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                                        <i class="fas fa-hashtag text-gray-600 text-sm"></i>
                                    </div>
                                    <span class="text-sm font-medium text-gray-700">User ID</span>
                                </div>
                                <span class="text-sm font-semibold text-gray-900">#${user.id}</span>
                            </div>
                        </div>

                        <!-- Member Since Info -->
                        <div class="bg-gray-50 rounded-lg p-4 text-center">
                            <div class="flex items-center justify-center mb-2">
                                <i class="fas fa-calendar-alt text-gray-400 mr-2"></i>
                                <span class="text-sm font-medium text-gray-700">Member Since</span>
                            </div>
                            <p class="text-lg font-bold text-gray-900">${Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24))} days</p>
                        </div>
                    </div>
                `;
                const userDetailsEl = document.getElementById('userDetails');
                if (userDetailsEl) {
                    userDetailsEl.innerHTML = userDetails;
                }
                
                // Show modal with animation
                const modal = document.getElementById('viewUserModal');
                const modalContainer = document.getElementById('viewUserModalContainer');
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
                const errorMessage = data.message || 'Error loading user details';
                showErrorToast(errorMessage);
            }
        })
        .catch(error => {
            // Hide loader
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
            showErrorToast('Error loading user details: ' + error.message);
        });
}

function editUser(userId) {
    fetch(`/admin/users/${userId}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data) {
                const user = data.data;
                
                // Set form values with null checks
                const editUserId = document.getElementById('editUserId');
                const editUserName = document.getElementById('editUserName');
                const editUserEmail = document.getElementById('editUserEmail');
                const editUserRole = document.getElementById('editUserRole');
                const editUserActive = document.getElementById('editUserActive');
                
                if (editUserId) editUserId.value = user.id || '';
                if (editUserName) editUserName.value = user.name || '';
                if (editUserEmail) editUserEmail.value = user.email || '';
                if (editUserRole) editUserRole.value = user.role_id || '';
                if (editUserActive) editUserActive.checked = user.is_active == 1 || user.is_active === true;
                
                // Show modal with animation
                const modal = document.getElementById('editUserModal');
                const modalContainer = document.getElementById('editUserModalContainer');
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
                const errorMessage = data.message || 'Error loading user details';
                showErrorToast(errorMessage);
            }
        })
        .catch(error => {
            showErrorToast('Error loading user details: ' + error.message);
        });
}

function closeEditModal() {
    const modal = document.getElementById('editUserModal');
    const modalContainer = document.getElementById('editUserModalContainer');
    
    if (modal) {
        if (modalContainer) {
            // Trigger closing animation
            modalContainer.classList.remove('scale-100', 'opacity-100');
            modalContainer.classList.add('scale-95', 'opacity-0');
            
            // Hide modal after animation
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        } else {
            modal.classList.add('hidden');
        }
    }
}

function closeViewModal() {
    const modal = document.getElementById('viewUserModal');
    const modalContainer = document.getElementById('viewUserModalContainer');
    
    if (modal) {
        if (modalContainer) {
            // Trigger closing animation
            modalContainer.classList.remove('scale-100', 'opacity-100');
            modalContainer.classList.add('scale-95', 'opacity-0');
            
            // Hide modal after animation
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        } else {
            modal.classList.add('hidden');
        }
    }
}

// Generic modal close function
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const modalContainer = document.getElementById(modalId + 'Container');
    
    if (modal) {
        if (modalContainer) {
            // Trigger closing animation
            modalContainer.classList.remove('scale-100', 'opacity-100');
            modalContainer.classList.add('scale-95', 'opacity-0');
            
            // Hide modal after animation
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        } else {
            modal.classList.add('hidden');
        }
    }
}

// Add click-outside-to-close functionality for all modals
document.addEventListener('click', function(event) {
    // Check if clicked element is a modal backdrop
    if (event.target.classList.contains('fixed') && 
        event.target.classList.contains('inset-0') && 
        event.target.classList.contains('bg-gray-600')) {
        // Close the modal
        event.target.classList.add('hidden');
    }
});

function getStatusText(user) {
    if (user.is_blocked == 1 || user.is_blocked === true) return 'Blocked';
    if (user.is_active == 1 || user.is_active === true) return 'Active';
    return 'Inactive';
}

// Handle edit form submission
document.addEventListener('DOMContentLoaded', function() {
    const editForm = document.getElementById('editUserForm');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show loader
            if (typeof showLoader === 'function') {
                showLoader({
                    title: 'Updating User...',
                    message: 'Please wait while we update the user information',
                    delay: 0
                });
            }
            
            const formData = new FormData(this);
            const userId = formData.get('id');
           
            fetch(`/admin/users/${userId}`, {
                method: 'PUT',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    name: formData.get('name'),
                    email: formData.get('email'),
                    role_id: formData.get('role_id'),
                    status: formData.get('is_active') === 'on' ? 'active' : 'inactive'
                })
            })
                .then(response => {
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
                        showSuccessToast('User updated successfully');
                        closeEditModal();
                        setTimeout(() => location.reload(), 1000);
                    } else {
                        showErrorToast(`Error updating user: ${data.message || 'Unknown error'}`);
                    }
                })
                .catch(error => {
                    // Hide loader
                    if (typeof hideLoader === 'function') {
                        hideLoader();
                    }
                    
                    showErrorToast(`Error updating user: ${error.message}`);
                });
        });
    }
});

function toggleUserStatus(userId, action) {
    const actionText = action === 'block' ? 'block' : 'unblock';
    
    if (typeof showConfirmModal === 'function') {
        showConfirmModal(
            `Are you sure you want to ${actionText} this user?`,
            'Confirm Action',
            function() {
                performToggleUserStatus(userId, action, actionText);
            }
        );
    } else if (confirm(`Are you sure you want to ${actionText} this user?`)) {
        performToggleUserStatus(userId, action, actionText);
    }
}

function performToggleUserStatus(userId, action, actionText) {
    // Show loader
    if (typeof showLoader === 'function') {
        showLoader({
            title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)}ing User...`,
            message: `Please wait while we ${actionText} the user`,
            delay: 0
        });
    }
    
    fetch(`/admin/users/${userId}/${action}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
    })
    .then(response => {
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
            showSuccessToast(`User ${actionText}ed successfully`);
            // Refresh the table instead of full page reload
            if (typeof loadTableData === 'function') {
                loadTableData();
            } else {
                setTimeout(() => location.reload(), 1000);
            }
        } else {
            showErrorToast(`Error ${actionText}ing user: ${data.message || 'Unknown error'}`);
        }
    })
    .catch(error => {
        // Hide loader on error
        if (typeof hideLoader === 'function') {
            hideLoader();
        }
        showErrorToast(`Error ${actionText}ing user: ${error.message}`);
    });
}

function deleteUser(userId) {
    
    if (typeof showDeleteModal === 'function') {
        showDeleteModal(
            'Are you sure you want to delete this user? This action cannot be undone.',
            'Confirm Delete',
            function() {
                performDeleteUser(userId);
            }
        );
    } else if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        performDeleteUser(userId);
    }
}

function performDeleteUser(userId) {
    // Show loader
    if (typeof window.GlobalLoader !== 'undefined') {
        window.GlobalLoader.show({
            title: 'Deleting User...',
            message: 'Please wait while we delete the user',
            showProgress: false
        });
    }
    
    fetch(`/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
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
            showSuccessToast('User deleted successfully');
            setTimeout(() => location.reload(), 1000);
        } else {
            showErrorToast(`Error deleting user: ${data.message || 'Unknown error'}`);
        }
    })
    .catch(error => {
        // Hide loader on error
        if (typeof window.GlobalLoader !== 'undefined') {
            window.GlobalLoader.hide();
        }
        showErrorToast(`Error deleting user: ${error.message}`);
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

// Make sure all formatters are available globally
window.formatUserName = formatUserName;
window.formatUserEmail = formatUserEmail;
window.formatUserRole = formatUserRole;
window.formatUserStatus = formatUserStatus;
window.formatUserDate = formatUserDate;
window.formatAvatar = formatAvatar;

// Apply formatters immediately after loading
if (typeof TableUtils !== 'undefined' && TableUtils.applyCustomFormatters) {
    TableUtils.applyCustomFormatters();
}

// Also apply formatters after a short delay to catch any timing issues
setTimeout(() => {
    if (typeof TableUtils !== 'undefined' && TableUtils.applyCustomFormatters) {
        TableUtils.applyCustomFormatters();
    }
}, 500);
