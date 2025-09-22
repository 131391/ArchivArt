// RBAC Dashboard JavaScript Functions

// Dashboard functions
function refreshDashboard() {
    loadDashboardStats();
    if (typeof showSuccessToast === 'function') {
        showSuccessToast('Dashboard refreshed');
    }
}

function createRole() {
    window.location.href = '/admin/rbac/roles';
}

function createPermission() {
    window.location.href = '/admin/rbac/permissions';
}

function loadDashboardStats() {
    // Load RBAC dashboard stats
    fetch('/admin/api/rbac/dashboard')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Hide loader and show data
                const rolesLoader = document.getElementById('rolesLoader');
                const permissionsLoader = document.getElementById('permissionsLoader');
                
                if (rolesLoader) rolesLoader.style.display = 'none';
                if (permissionsLoader) permissionsLoader.style.display = 'none';
                
                const totalRolesEl = document.getElementById('totalRoles');
                const totalPermissionsEl = document.getElementById('totalPermissions');
                
                if (totalRolesEl) totalRolesEl.innerHTML = data.data.totalRoles || 0;
                if (totalPermissionsEl) totalPermissionsEl.innerHTML = data.data.totalPermissions || 0;
            } else {
                console.error('RBAC dashboard API returned error:', data.message);
                loadIndividualStats();
            }
        })
        .catch(error => {
            console.error('Error loading RBAC stats:', error);
            // Fallback to individual API calls
            loadIndividualStats();
        });

    // Load active users count
    fetch('/admin/users/data')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Hide loader and show data
                const usersLoader = document.getElementById('usersLoader');
                if (usersLoader) usersLoader.style.display = 'none';
                
                const activeUsersEl = document.getElementById('activeUsers');
                if (activeUsersEl) {
                    const activeUsers = data.data?.filter(user => user.is_active && !user.is_blocked).length || 0;
                    activeUsersEl.innerHTML = activeUsers;
                }
            } else {
                console.error('Users API returned error:', data.message);
                const usersLoader = document.getElementById('usersLoader');
                const activeUsersEl = document.getElementById('activeUsers');
                
                if (usersLoader) usersLoader.style.display = 'none';
                if (activeUsersEl) activeUsersEl.innerHTML = '0';
            }
        })
        .catch(error => {
            console.error('Error loading users:', error);
            const usersLoader = document.getElementById('usersLoader');
            const activeUsersEl = document.getElementById('activeUsers');
            
            if (usersLoader) usersLoader.style.display = 'none';
            if (activeUsersEl) activeUsersEl.innerHTML = '0';
        });
}

// Fallback function to load individual stats
function loadIndividualStats() {
    // Load roles count
    fetch('/admin/api/rbac/roles')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const rolesLoader = document.getElementById('rolesLoader');
                const totalRolesEl = document.getElementById('totalRoles');
                
                if (rolesLoader) rolesLoader.style.display = 'none';
                if (totalRolesEl) totalRolesEl.innerHTML = data.pagination?.totalItems || data.data?.length || 0;
            } else {
                const rolesLoader = document.getElementById('rolesLoader');
                const totalRolesEl = document.getElementById('totalRoles');
                
                if (rolesLoader) rolesLoader.style.display = 'none';
                if (totalRolesEl) totalRolesEl.innerHTML = '0';
            }
        })
        .catch(error => {
            console.error('Error loading roles:', error);
            const rolesLoader = document.getElementById('rolesLoader');
            const totalRolesEl = document.getElementById('totalRoles');
            
            if (rolesLoader) rolesLoader.style.display = 'none';
            if (totalRolesEl) totalRolesEl.innerHTML = '0';
        });

    // Load permissions count
    fetch('/admin/api/rbac/permissions')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const permissionsLoader = document.getElementById('permissionsLoader');
                const totalPermissionsEl = document.getElementById('totalPermissions');
                
                if (permissionsLoader) permissionsLoader.style.display = 'none';
                if (totalPermissionsEl) totalPermissionsEl.innerHTML = data.data?.length || 0;
            } else {
                const permissionsLoader = document.getElementById('permissionsLoader');
                const totalPermissionsEl = document.getElementById('totalPermissions');
                
                if (permissionsLoader) permissionsLoader.style.display = 'none';
                if (totalPermissionsEl) totalPermissionsEl.innerHTML = '0';
            }
        })
        .catch(error => {
            console.error('Error loading permissions:', error);
            const permissionsLoader = document.getElementById('permissionsLoader');
            const totalPermissionsEl = document.getElementById('totalPermissions');
            
            if (permissionsLoader) permissionsLoader.style.display = 'none';
            if (totalPermissionsEl) totalPermissionsEl.innerHTML = '0';
        });
}

// Load dashboard stats on page load
document.addEventListener('DOMContentLoaded', function() {
    // Only load stats if we're on the RBAC dashboard page
    if (window.location.pathname.includes('/admin/rbac') && !window.location.pathname.includes('/roles') && !window.location.pathname.includes('/permissions')) {
        loadDashboardStats();
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
