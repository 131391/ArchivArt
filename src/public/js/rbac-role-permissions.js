// RBAC Role Permissions Management JavaScript Functions

let currentRoleId = null;
let currentRole = null;
let allPermissions = [];
let rolePermissions = [];

// Get role ID from URL
function getRoleIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/admin\/rbac\/roles\/(\d+)\/permissions/);
    return match ? parseInt(match[1]) : null;
}

// Load data on page load
document.addEventListener('DOMContentLoaded', function() {
    currentRoleId = getRoleIdFromUrl();
    if (!currentRoleId) {
        showErrorToast('Invalid role ID');
        window.location.href = '/admin/rbac/roles';
        return;
    }
    
    loadRoleData();
    loadPermissions();
});

function loadRoleData() {
    fetch(`/admin/api/rbac/roles/${currentRoleId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentRole = data.data;
                const roleNameEl = document.getElementById('roleName');
                const roleDisplayNameEl = document.getElementById('roleDisplayName');
                const roleDescriptionEl = document.getElementById('roleDescription');
                const roleStatusEl = document.getElementById('roleStatus');
                
                if (roleNameEl) roleNameEl.textContent = currentRole.display_name;
                if (roleDisplayNameEl) roleDisplayNameEl.textContent = currentRole.display_name;
                if (roleDescriptionEl) roleDescriptionEl.textContent = currentRole.description || 'No description';
                if (roleStatusEl) {
                    roleStatusEl.textContent = currentRole.is_active ? 'Active' : 'Inactive';
                    roleStatusEl.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentRole.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`;
                }
            } else {
                showErrorToast('Failed to load role data');
            }
        })
        .catch(error => {
            console.error('Error loading role data:', error);
            showErrorToast('Error loading role data');
        });
}

function loadPermissions() {
    const loadingStateEl = document.getElementById('loadingState');
    if (loadingStateEl) loadingStateEl.classList.remove('hidden');
    
    Promise.all([
        fetch('/admin/api/rbac/permissions').then(response => response.json()),
        fetch(`/admin/api/rbac/roles/${currentRoleId}/permissions`).then(response => response.json())
    ])
    .then(([permissionsData, rolePermissionsData]) => {
        if (loadingStateEl) loadingStateEl.classList.add('hidden');
        
        if (permissionsData.success) {
            allPermissions = permissionsData.data || [];
        } else {
            showErrorToast('Failed to load permissions');
            return;
        }
        
        if (rolePermissionsData.success) {
            rolePermissions = rolePermissionsData.data || [];
        } else {
            showErrorToast('Failed to load role permissions');
            return;
        }
        
        renderPermissions();
    })
    .catch(error => {
        if (loadingStateEl) loadingStateEl.classList.add('hidden');
        console.error('Error loading permissions:', error);
        showErrorToast('Error loading permissions');
    });
}

function renderPermissions() {
    const container = document.getElementById('permissionsContainer');
    if (!container) return;
    
    // Group permissions by module
    const permissionsByModule = {};
    allPermissions.forEach(permission => {
        if (!permissionsByModule[permission.module]) {
            permissionsByModule[permission.module] = [];
        }
        permissionsByModule[permission.module].push(permission);
    });
    
    // Create HTML for each module
    const modulesHtml = Object.keys(permissionsByModule).map(module => {
        const modulePermissions = permissionsByModule[module];
        const modulePermissionsHtml = modulePermissions.map(permission => {
            const isAssigned = rolePermissions.some(rp => rp.permission_id === permission.id);
            return `
                <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-8 w-8">
                            <div class="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                <i class="fas fa-key text-green-600 text-sm"></i>
                            </div>
                        </div>
                        <div class="ml-3">
                            <div class="text-sm font-medium text-gray-900">${permission.display_name}</div>
                            <div class="text-sm text-gray-500">${permission.name}</div>
                        </div>
                    </div>
                    <div class="flex items-center">
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" 
                                   class="sr-only peer" 
                                   ${isAssigned ? 'checked' : ''}
                                   onchange="togglePermission(${permission.id}, this.checked)">
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="bg-white shadow rounded-lg mb-6">
                <div class="px-4 py-5 sm:p-6">
                    <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4 capitalize">${module} Permissions</h3>
                    <div class="space-y-2">
                        ${modulePermissionsHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = modulesHtml;
}

function togglePermission(permissionId, isChecked) {
    if (isChecked) {
        // Add permission to role
        if (!rolePermissions.some(rp => rp.permission_id === permissionId)) {
            rolePermissions.push({ permission_id: permissionId });
        }
    } else {
        // Remove permission from role
        rolePermissions = rolePermissions.filter(rp => rp.permission_id !== permissionId);
    }
}

function savePermissions() {
    const permissionIds = rolePermissions.map(rp => rp.permission_id);
    
    fetch(`/admin/api/rbac/roles/${currentRoleId}/permissions`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ permission_ids: permissionIds })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessToast('Role permissions updated successfully');
        } else {
            showErrorToast('Error: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showErrorToast('Error: ' + error.message);
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
