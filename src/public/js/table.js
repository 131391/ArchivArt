let currentSort = { column: 'created_at', direction: 'desc' };
let currentPage = 1;
let currentSearch = '';
let currentFilters = {};
let isLoading = false;

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize table functionality
function initTable(options = {}) {
    // Get current values from URL or defaults
    const urlParams = new URLSearchParams(window.location.search);
    currentSort = options.sort || { 
        column: urlParams.get('sort') || 'created_at', 
        direction: urlParams.get('order') || 'desc' 
    };
    currentPage = options.page || parseInt(urlParams.get('page')) || 1;
    currentSearch = options.search || urlParams.get('search') || '';
    
    // Initialize filters from URL parameters
    currentFilters = options.filters || {};
    const statusFilter = urlParams.get('status') || urlParams.get('statusFilter') || '';
    const roleFilter = urlParams.get('role') || urlParams.get('roleFilter') || '';
    const moduleFilter = urlParams.get('module') || urlParams.get('moduleFilter') || '';
    
    if (statusFilter) currentFilters.status = statusFilter;
    if (roleFilter) currentFilters.role = roleFilter;
    if (moduleFilter) currentFilters.module = moduleFilter;

    // Set up event listeners
    setupEventListeners();
    
    // Set current filter values on page load
    setFilterValues();
    
    // Apply custom formatters immediately and with delay
    applyCustomFormatters();
    setTimeout(() => {
        applyCustomFormatters();
    }, 500);
}

// Set up all event listeners
function setupEventListeners() {
    // Search input with debouncing
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        
        // Debounced search function
        const debouncedSearch = debounce(function(value) {
            currentSearch = value;
            currentPage = 1;
            loadTableData();
        }, 500); // 500ms delay
        
        // Input event listener
        searchInput.addEventListener('input', function(e) {
            const value = e.target.value.trim();
            
            // Show loading indicator
            const loadingIndicator = document.getElementById('searchLoading');
            if (loadingIndicator) {
                loadingIndicator.classList.remove('hidden');
            } else {
            }
            
            // Debounced search
            debouncedSearch(value);
        });
        
        // Clear search on escape
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                this.value = '';
                currentSearch = '';
                currentPage = 1;
                loadTableData();
            }
        });
    } else {
    }

    // Filter dropdowns
    const filters = document.querySelectorAll('select[id$="Filter"]');
    
    filters.forEach(filter => {
        filter.addEventListener('change', function() {
            const filterName = this.id.replace('Filter', '');
            
            // Map filter names to backend parameter names
            if (filterName === 'status') {
                currentFilters.status = this.value;
            } else if (filterName === 'role') {
                currentFilters.role = this.value;
            } else if (filterName === 'module') {
                currentFilters.module = this.value;
            } else {
                currentFilters[filterName] = this.value;
            }
            
            currentPage = 1; // Reset to first page
            loadTableData();
        });
    });
}

// Sorting functionality
function sortTable(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    
    currentPage = 1; // Reset to first page when sorting
    loadTableData();
}

// Load table data via AJAX
async function loadTableData() {
    if (isLoading) return;
    
    isLoading = true;
    
    // Show global loader for AJAX request
    const currentPath = window.location.pathname;
    const isMediaPage = currentPath.includes('/media');
    const isModuleActionsPage = currentPath.includes('/rbac/modules') && currentPath.includes('/actions');
    const isUsersPage = currentPath.includes('/users');
    const isRolesPage = currentPath.includes('/rbac/roles');
    const isPermissionsPage = currentPath.includes('/rbac/permissions');
    const isModulesPage = currentPath.includes('/rbac/modules');
    
    let loadingTitle, loadingMessage;
    
    if (isModuleActionsPage) {
        loadingTitle = 'Loading Module Actions...';
        loadingMessage = 'Fetching module actions data from server';
    } else if (isMediaPage) {
        loadingTitle = 'Loading Media...';
        loadingMessage = 'Fetching media data from server';
    } else if (isUsersPage) {
        loadingTitle = 'Loading Users...';
        loadingMessage = 'Fetching user data from server';
    } else if (isRolesPage) {
        loadingTitle = 'Loading Roles...';
        loadingMessage = 'Fetching roles data from server';
    } else if (isPermissionsPage) {
        loadingTitle = 'Loading Permissions...';
        loadingMessage = 'Fetching permissions data from server';
    } else if (isModulesPage) {
        loadingTitle = 'Loading Modules...';
        loadingMessage = 'Fetching modules data from server';
    } else {
        loadingTitle = 'Loading Users...';
        loadingMessage = 'Fetching user data from server';
    }
    
    if (typeof showAjaxLoader === 'function') {
        showAjaxLoader({
            title: loadingTitle,
            message: loadingMessage
        });
    } else {
        showLoadingState();
    }

    try {
        const params = new URLSearchParams({
            page: currentPage,
            sort: currentSort.column,
            order: currentSort.direction,
            search: currentSearch
        });

        // Add filter parameters
        Object.keys(currentFilters).forEach(key => {
            if (currentFilters[key]) {
                params.append(key, currentFilters[key]);
            }
        });

        // Determine the correct endpoint based on current page
        const currentPath = window.location.pathname;
        let endpoint;
        
        if (currentPath.includes('/media')) {
            endpoint = '/admin/media/data';
        } else if (currentPath.includes('/rbac/roles')) {
            endpoint = '/admin/rbac/roles/data';
        } else if (currentPath.includes('/rbac/permissions')) {
            endpoint = '/admin/rbac/permissions/data';
        } else if (currentPath.includes('/rbac/modules') && currentPath.includes('/actions')) {
            // Extract module ID from URL for module actions
            const pathParts = currentPath.split('/');
            const moduleIdIndex = pathParts.findIndex(part => part === 'modules') + 1;
            const moduleId = pathParts[moduleIdIndex];
            endpoint = `/admin/rbac/modules/${moduleId}/actions/data`;
        } else if (currentPath.includes('/rbac/modules')) {
            endpoint = '/admin/rbac/modules/data';
        } else {
            endpoint = '/admin/users/data';
        }
        
        const response = await fetch(`${endpoint}?${params.toString()}`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            if (response.status === 302 || response.status === 401) {
                // Authentication issue - redirect to login
                window.location.href = '/admin/login';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        updateTableContent(data);
        
    } catch (error) {
        console.error('Error loading table data:', error);
        let errorMessage = 'Error loading table data: ' + error.message;
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error: Unable to connect to server. Please check your connection and try again.';
        } else if (error.message.includes('HTTP error')) {
            errorMessage = `Server error: ${error.message}`;
        }
        
        if (typeof showErrorModal === 'function') {
            showErrorModal(errorMessage);
        } else {
            alert(errorMessage);
        }
    } finally {
        isLoading = false;
        
        // Hide global loader
        if (typeof hideLoader === 'function') {
            hideLoader();
        } else {
            hideLoadingState();
        }
        
        // Hide search loading indicator
        const searchLoadingIndicator = document.getElementById('searchLoading');
        if (searchLoadingIndicator) {
            searchLoadingIndicator.classList.add('hidden');
        } else {
        }
    }
}

// Update table content with new data
function updateTableContent(data) {
    // Update user permissions from API response if available
    if (data.success && data.userPermissions) {
        window.userPermissions = data.userPermissions;
        console.log('Updated userPermissions from API:', window.userPermissions);
    }
    
    // Update table body
    const tbody = document.querySelector('#dataTable tbody');
    if (tbody) {
        // Check if we have data in the response
        if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
            // Generate table rows from the data
            tbody.innerHTML = generateTableRows(data.data);
            
            // Apply custom formatters after rendering
            applyCustomFormatters();
            setTimeout(() => {
                applyCustomFormatters();
            }, 300);
        } else if (data.tableRows && typeof data.tableRows === 'string' && data.tableRows.trim() !== '') {
            // Fallback for pre-rendered HTML (if any endpoints still use this)
            tbody.innerHTML = data.tableRows;
        } else {
            // Show empty state when no data - determine content based on current page
            const currentPath = window.location.pathname;
            const isMediaPage = currentPath.includes('/media');
            const isModuleActionsPage = currentPath.includes('/rbac/modules') && currentPath.includes('/actions');
            const isUsersPage = currentPath.includes('/users');
            const isRolesPage = currentPath.includes('/rbac/roles');
            const isPermissionsPage = currentPath.includes('/rbac/permissions');
            const isModulesPage = currentPath.includes('/rbac/modules');
            
            let emptyIcon, emptyTitle, emptyMessage;
            
            if (isModuleActionsPage) {
                emptyIcon = 'fas fa-cogs';
                emptyTitle = 'No Module Actions Found';
                emptyMessage = 'No module actions match your current search criteria.';
            } else if (isMediaPage) {
                emptyIcon = 'fas fa-images';
                emptyTitle = 'No Media Found';
                emptyMessage = 'No media files have been uploaded yet.';
            } else if (isUsersPage) {
                emptyIcon = 'fas fa-users';
                emptyTitle = 'No Users Found';
                emptyMessage = 'No users match your current filter criteria.';
            } else if (isRolesPage) {
                emptyIcon = 'fas fa-user-tag';
                emptyTitle = 'No Roles Found';
                emptyMessage = 'No roles match your current filter criteria.';
            } else if (isPermissionsPage) {
                emptyIcon = 'fas fa-key';
                emptyTitle = 'No Permissions Found';
                emptyMessage = 'No permissions match your current filter criteria.';
            } else if (isModulesPage) {
                emptyIcon = 'fas fa-cube';
                emptyTitle = 'No Modules Found';
                emptyMessage = 'No modules match your current filter criteria.';
            } else {
                emptyIcon = 'fas fa-users';
                emptyTitle = 'No Users Found';
                emptyMessage = 'No users match your current filter criteria.';
            }
            
            tbody.innerHTML = `
                <tr>
                    <td colspan="100%" class="px-6 py-12 text-center">
                        <div class="flex flex-col items-center justify-center">
                            <i class="${emptyIcon} text-4xl text-gray-400 mb-4"></i>
                            <h3 class="text-lg font-medium text-gray-900 mb-2">${emptyTitle}</h3>
                            <p class="text-gray-500 text-center max-w-sm">${emptyMessage}</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    // Update pagination - try multiple selectors to find the pagination container
    let paginationContainer = document.querySelector('.bg-gradient-to-r.from-gray-50.to-gray-100.px-6.py-4');
    if (!paginationContainer) {
        paginationContainer = document.querySelector('[class*="bg-gradient-to-r"][class*="px-6"][class*="py-4"]');
    }
    if (!paginationContainer) {
        paginationContainer = document.querySelector('.border-t.border-gray-200');
    }

    if (paginationContainer) {
        if (data.pagination) {
            if (typeof data.pagination === 'string' && data.pagination.trim() !== '') {
                // Handle pre-rendered HTML pagination
                paginationContainer.innerHTML = data.pagination;
            } else if (typeof data.pagination === 'object') {
                // Handle pagination object
                const pagination = data.pagination;
                const currentPage = pagination.currentPage || 1;
                const totalPages = pagination.totalPages || 1;
                const totalItems = pagination.totalItems || 0;
                const hasNext = pagination.hasNext || false;
                const hasPrev = pagination.hasPrev || false;
                
                
                // Update global currentPage variable to match the response
                window.currentPage = currentPage;
                
                const startItem = ((currentPage - 1) * 10) + 1;
                const endItem = Math.min(currentPage * 10, totalItems);
                
                // Generate page numbers
                const startPage = Math.max(1, currentPage - 2);
                const endPage = Math.min(totalPages, currentPage + 2);
                
                let paginationHTML = `
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        <!-- Results Info -->
                        <div class="flex items-center space-x-2">
                            <i class="fas fa-info-circle text-gray-400"></i>
                            <p class="text-sm text-gray-700">
                                Showing
                                <span class="font-semibold text-gray-900">${startItem}</span>
                                to
                                <span class="font-semibold text-gray-900">${endItem}</span>
                                of
                                <span class="font-semibold text-gray-900">${totalItems}</span>
                                results
                            </p>
                        </div>
                        
                        <!-- Pagination Controls -->
                        <div class="flex items-center space-x-2">
                            <!-- Mobile Pagination -->
                            <div class="flex sm:hidden space-x-2">
                                ${hasPrev ? `<button onclick="goToPage(${currentPage - 1})" class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200">
                                    <i class="fas fa-chevron-left mr-1"></i>
                                    Previous
                                </button>` : ''}
                                ${hasNext ? `<button onclick="goToPage(${currentPage + 1})" class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200">
                                    Next
                                    <i class="fas fa-chevron-right ml-1"></i>
                                </button>` : ''}
                            </div>
                            
                            <!-- Desktop Pagination -->
                            <div class="hidden sm:flex items-center space-x-1">
                                ${hasPrev ? `<button onclick="goToPage(${currentPage - 1})" class="inline-flex items-center justify-center w-10 h-10 border border-gray-300 rounded-lg bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200">
                                    <i class="fas fa-chevron-left text-sm"></i>
                                </button>` : ''}
                `;
                
                for (let i = startPage; i <= endPage; i++) {
                    const isActive = i === currentPage;
                    if (isActive) {
                        paginationHTML += `
                            <span class="inline-flex items-center justify-center w-10 h-10 border border-indigo-500 bg-indigo-500 text-white text-sm font-semibold rounded-lg">
                                ${i}
                            </span>
                        `;
                    } else {
                        paginationHTML += `
                            <button onclick="goToPage(${i})" class="inline-flex items-center justify-center w-10 h-10 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200 rounded-lg">
                                ${i}
                            </button>
                        `;
                    }
                }
                
                paginationHTML += `
                                ${hasNext ? `<button onclick="goToPage(${currentPage + 1})" class="inline-flex items-center justify-center w-10 h-10 border border-gray-300 rounded-lg bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200">
                                    <i class="fas fa-chevron-right text-sm"></i>
                                </button>` : ''}
                            </div>
                        </div>
                    </div>
                `;
                
                paginationContainer.innerHTML = paginationHTML;
            }
        } else {
            paginationContainer.innerHTML = '';
        }
    }
}

// Show loading state
function showLoadingState() {
    const tbody = document.querySelector('#dataTable tbody');
    if (tbody) {
        const currentPath = window.location.pathname;
        const isModuleActionsPage = currentPath.includes('/rbac/modules') && currentPath.includes('/actions');
        const isUsersPage = currentPath.includes('/users');
        const isMediaPage = currentPath.includes('/media');
        const isRolesPage = currentPath.includes('/rbac/roles');
        const isPermissionsPage = currentPath.includes('/rbac/permissions');
        const isModulesPage = currentPath.includes('/rbac/modules');
        
        let loadingText = 'Loading...';
        
        if (isModuleActionsPage) {
            loadingText = 'Loading module actions...';
        } else if (isUsersPage) {
            loadingText = 'Loading users...';
        } else if (isMediaPage) {
            loadingText = 'Loading media...';
        } else if (isRolesPage) {
            loadingText = 'Loading roles...';
        } else if (isPermissionsPage) {
            loadingText = 'Loading permissions...';
        } else if (isModulesPage) {
            loadingText = 'Loading modules...';
        }
        
        tbody.innerHTML = `
            <tr>
                <td colspan="100%" class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center">
                        <i class="fas fa-spinner fa-spin text-indigo-600 mr-2"></i>
                        ${loadingText}
                    </div>
                </td>
            </tr>
        `;
    }
}

// Hide loading state
function hideLoadingState() {
    // Loading state will be replaced by updateTableContent
}

// Set current filter values on page load
function setFilterValues() {
    
    // Set search value
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = currentSearch;
    }
    
    // Set filter values
    Object.keys(currentFilters).forEach(filterName => {
        const filterElement = document.getElementById(filterName + 'Filter');
        if (filterElement) {
            filterElement.value = currentFilters[filterName];
        }
    });
}

// Go to specific page
function goToPage(page) {
    currentPage = page;
    loadTableData();
}

// Generate table rows from data
function generateTableRows(data) {
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('/users')) {
        return generateUserTableRows(data);
    } else if (currentPath.includes('/rbac/roles')) {
        return generateRoleTableRows(data);
    } else if (currentPath.includes('/rbac/permissions')) {
        return generatePermissionTableRows(data);
    } else if (currentPath.includes('/rbac/modules') && currentPath.includes('/actions')) {
        return generateModuleActionTableRows(data);
    } else if (currentPath.includes('/rbac/modules')) {
        return generateModuleTableRows(data);
    } else {
        return generateMediaTableRows(data);
    }
}

// Generate user table rows
function generateUserTableRows(users) {
    console.log('generateUserTableRows called with users:', users.length);
    console.log('window.userPermissions:', window.userPermissions);
    
    return users.map(user => {
        // Check user permissions
        const hasViewPermission = window.userPermissions && window.userPermissions.some(p => p.name === 'users.view');
        const hasUpdatePermission = window.userPermissions && window.userPermissions.some(p => p.name === 'users.update');
        const hasBlockPermission = window.userPermissions && window.userPermissions.some(p => p.name === 'users.block');
        const hasDeletePermission = window.userPermissions && window.userPermissions.some(p => p.name === 'users.delete');
        
        console.log(`User ${user.id} permissions:`, {
            hasViewPermission,
            hasUpdatePermission,
            hasBlockPermission,
            hasDeletePermission
        });
        console.log(`User ${user.id} data:`, {
            is_blocked: user.is_blocked,
            is_active: user.is_active
        });
        
        // Generate action buttons based on permissions
        let actionButtons = '';
        
        if (hasViewPermission) {
            actionButtons += `<button onclick="viewUser(${user.id})" class="text-blue-600 hover:text-blue-900" title="View">
                <i class="fas fa-eye"></i>
            </button>`;
        }
        
        if (hasUpdatePermission) {
            actionButtons += `<button onclick="editUser(${user.id})" class="text-indigo-600 hover:text-indigo-900" title="Edit">
                <i class="fas fa-edit"></i>
            </button>`;
        }
        
        if (hasBlockPermission) {
            // Block/Unblock button
            const blockStatus = user.is_blocked ? 'unblock' : 'block';
            const blockClass = user.is_blocked ? 'text-green-600 hover:text-green-900' : 'text-yellow-600 hover:text-yellow-900';
            const blockIcon = user.is_blocked ? 'fas fa-check' : 'fas fa-ban';
            const blockTitle = user.is_blocked ? 'Unblock' : 'Block';
            
            actionButtons += `<button onclick="toggleUserStatus(${user.id}, '${blockStatus}')" class="${blockClass}" title="${blockTitle}">
                <i class="${blockIcon}"></i>
            </button>`;
        }
        
        if (hasDeletePermission) {
            actionButtons += `<button onclick="deleteUser(${user.id})" class="text-red-600 hover:text-red-900" title="Delete">
                <i class="fas fa-trash"></i>
            </button>`;
        }
        
        return `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatUserName" data-item='${JSON.stringify(user)}'>
                <!-- User name will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatUserEmail" data-item='${JSON.stringify(user)}'>
                <!-- User email will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatUserRole" data-item='${JSON.stringify(user)}'>
                <!-- Role will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatUserStatus" data-item='${JSON.stringify(user)}'>
                <!-- Status will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatUserDate" data-item='${JSON.stringify(user)}'>
                <!-- Date will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    ${actionButtons}
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// Generate media table rows
function generateMediaTableRows(media) {
    console.log('generateMediaTableRows called with media:', media.length);
    console.log('window.userPermissions for media:', window.userPermissions);
    
    return media.map(item => {
        // Check user permissions
        const hasViewPermission = window.userPermissions && window.userPermissions.some(p => p.name === 'media.view');
        const hasEditPermission = window.userPermissions && window.userPermissions.some(p => p.name === 'media.edit');
        const hasDeletePermission = window.userPermissions && window.userPermissions.some(p => p.name === 'media.delete');
        
        console.log(`Media ${item.id} permissions:`, {
            hasViewPermission,
            hasEditPermission,
            hasDeletePermission
        });
        
        // Generate action buttons based on permissions
        let actionButtons = '';
        
        if (hasViewPermission) {
            actionButtons += `<button onclick="window.location.href='/admin/media/view/${item.id}'" class="text-indigo-600 hover:text-indigo-900" title="View">
                <i class="fas fa-eye"></i>
            </button>`;
        }
        
        if (hasEditPermission) {
            actionButtons += `<button onclick="window.location.href='/admin/media/edit/${item.id}'" class="text-blue-600 hover:text-blue-900" title="Edit">
                <i class="fas fa-edit"></i>
            </button>`;
        }
        
        if (hasDeletePermission) {
            actionButtons += `<button onclick="deleteMedia(${item.id})" class="text-red-600 hover:text-red-900" title="Delete">
                <i class="fas fa-trash"></i>
            </button>`;
        }
        
        return `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatMediaTitle" data-item='${JSON.stringify(item)}'>
                <!-- Media title will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatScanningImage" data-item='${JSON.stringify(item)}'>
                <!-- Scanning image will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatMediaType" data-item='${JSON.stringify(item)}'>
                <!-- Media type will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatFileSize" data-item='${JSON.stringify(item)}'>
                <!-- File size will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatMediaStatus" data-item='${JSON.stringify(item)}'>
                <!-- Status will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatMediaDate" data-item='${JSON.stringify(item)}'>
                <!-- Date will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatUploadedBy" data-item='${JSON.stringify(item)}'>
                <!-- Uploaded by will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    ${actionButtons}
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// Generate role table rows
function generateRoleTableRows(roles) {
    console.log('generateRoleTableRows called with roles:', roles.length);
    console.log('window.userPermissions for roles:', window.userPermissions);
    
    return roles.map(role => {
        // Check user permissions
        const hasViewPermission = window.userPermissions && window.userPermissions.some(p => p.name === 'rbac.roles.view');
        const hasUpdatePermission = window.userPermissions && window.userPermissions.some(p => p.name === 'rbac.roles.update');
        const hasDeletePermission = window.userPermissions && window.userPermissions.some(p => p.name === 'rbac.roles.delete');
        
        console.log(`Role ${role.id} permissions:`, {
            hasViewPermission,
            hasUpdatePermission,
            hasDeletePermission
        });
        
        // Generate action buttons based on permissions
        let actionButtons = '';
        
        if (hasViewPermission) {
            actionButtons += `<button onclick="viewRole(${role.id})" class="text-blue-600 hover:text-blue-900" title="View">
                <i class="fas fa-eye"></i>
            </button>`;
        }
        
        if (hasUpdatePermission) {
            actionButtons += `<button onclick="editRole(${role.id})" class="text-indigo-600 hover:text-indigo-900" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="manageRolePermissions(${role.id})" class="text-green-600 hover:text-green-900" title="Permissions">
                <i class="fas fa-key"></i>
            </button>`;
        }
        
        if (hasDeletePermission) {
            actionButtons += `<button onclick="deleteRole(${role.id})" class="text-red-600 hover:text-red-900" title="Delete">
                <i class="fas fa-trash"></i>
            </button>`;
        }
        
        return `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${role.id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatRole" data-item='${JSON.stringify(role)}'>
                <!-- Role will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatDescription" data-item='${JSON.stringify(role)}'>
                <!-- Description will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatUserCount" data-item='${JSON.stringify(role)}'>
                <!-- User count will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatPermissionCount" data-item='${JSON.stringify(role)}'>
                <!-- Permission count will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatStatus" data-item='${JSON.stringify(role)}'>
                <!-- Status will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    ${actionButtons}
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// Generate permission table rows
function generatePermissionTableRows(permissions) {
    console.log('generatePermissionTableRows called with permissions:', permissions.length);
    console.log('window.userPermissions for permissions:', window.userPermissions);
    
    return permissions.map(permission => {
        // Check user permissions
        const hasViewPermission = window.userPermissions && window.userPermissions.some(p => p.name === 'rbac.permissions.view');
        const hasUpdatePermission = window.userPermissions && window.userPermissions.some(p => p.name === 'rbac.permissions.update');
        const hasDeletePermission = window.userPermissions && window.userPermissions.some(p => p.name === 'rbac.permissions.delete');
        
        console.log(`Permission ${permission.id} permissions:`, {
            hasViewPermission,
            hasUpdatePermission,
            hasDeletePermission
        });
        
        // Generate action buttons based on permissions
        let actionButtons = '';
        
        if (hasViewPermission) {
            actionButtons += `<button onclick="viewPermission(${permission.id})" class="text-blue-600 hover:text-blue-900" title="View">
                <i class="fas fa-eye"></i>
            </button>`;
        }
        
        if (hasUpdatePermission) {
            actionButtons += `<button onclick="editPermission(${permission.id})" class="text-indigo-600 hover:text-indigo-900" title="Edit">
                <i class="fas fa-edit"></i>
            </button>`;
        }
        
        if (hasDeletePermission) {
            actionButtons += `<button onclick="deletePermission(${permission.id})" class="text-red-600 hover:text-red-900" title="Delete">
                <i class="fas fa-trash"></i>
            </button>`;
        }
        
        return `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${permission.id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatPermission" data-item='${JSON.stringify(permission)}'>
                <!-- Permission will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatPermissionName" data-item='${JSON.stringify(permission)}'>
                <!-- Permission name will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatModule" data-item='${JSON.stringify(permission)}'>
                <!-- Module will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatAction" data-item='${JSON.stringify(permission)}'>
                <!-- Action will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatResource" data-item='${JSON.stringify(permission)}'>
                <!-- Resource will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatDescription" data-item='${JSON.stringify(permission)}'>
                <!-- Description will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    ${actionButtons}
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// Generate module table rows
function generateModuleTableRows(modules) {
    console.log('generateModuleTableRows called with modules:', modules.length);
    console.log('window.userPermissions for modules:', window.userPermissions);
    
    return modules.map(module => {
        // Check user permissions
        const hasViewPermission = window.userPermissions && window.userPermissions.some(p => p.name === 'rbac.modules.view');
        const hasUpdatePermission = window.userPermissions && window.userPermissions.some(p => p.name === 'rbac.modules.update');
        const hasDeletePermission = window.userPermissions && window.userPermissions.some(p => p.name === 'rbac.modules.delete');
        
        console.log(`Module ${module.id} permissions:`, {
            hasViewPermission,
            hasUpdatePermission,
            hasDeletePermission
        });
        
        // Generate action buttons based on permissions
        let actionButtons = '';
        
        if (hasViewPermission) {
            actionButtons += `<button onclick="viewModule(${module.id})" class="text-blue-600 hover:text-blue-900" title="View">
                <i class="fas fa-eye"></i>
            </button>`;
        }
        
        if (hasUpdatePermission) {
            actionButtons += `<button onclick="editModule(${module.id})" class="text-indigo-600 hover:text-indigo-900" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="manageModuleActions(${module.id})" class="text-green-600 hover:text-green-900" title="Actions">
                <i class="fas fa-cogs"></i>
            </button>`;
        }
        
        if (hasDeletePermission) {
            actionButtons += `<button onclick="deleteModule(${module.id})" class="text-red-600 hover:text-red-900" title="Delete">
                <i class="fas fa-trash"></i>
            </button>`;
        }
        
        return `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${module.id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatModule" data-item='${JSON.stringify(module)}'>
                <!-- Module will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatModuleName" data-item='${JSON.stringify(module)}'>
                <!-- Module name will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatModuleIcon" data-item='${JSON.stringify(module)}'>
                <!-- Icon will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatModuleRoute" data-item='${JSON.stringify(module)}'>
                <!-- Route will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatModuleOrder" data-item='${JSON.stringify(module)}'>
                <!-- Order will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatModuleActions" data-item='${JSON.stringify(module)}'>
                <!-- Action count will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatModulePermissions" data-item='${JSON.stringify(module)}'>
                <!-- Permission count will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    ${actionButtons}
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// Generate module action table rows
function generateModuleActionTableRows(actions) {
    console.log('generateModuleActionTableRows called with actions:', actions.length);
    console.log('window.userPermissions for actions:', window.userPermissions);
    
    return actions.map(action => {
        // Check user permissions
        const hasViewPermission = window.userPermissions && window.userPermissions.some(p => p.name === 'rbac.actions.view');
        const hasUpdatePermission = window.userPermissions && window.userPermissions.some(p => p.name === 'rbac.actions.update');
        const hasDeletePermission = window.userPermissions && window.userPermissions.some(p => p.name === 'rbac.actions.delete');
        
        console.log(`Action ${action.id} permissions:`, {
            hasViewPermission,
            hasUpdatePermission,
            hasDeletePermission
        });
        
        // Generate action buttons based on permissions
        let actionButtons = '';
        
        if (hasViewPermission) {
            actionButtons += `<button onclick="viewModuleAction(${action.id})" class="text-blue-600 hover:text-blue-900" title="View">
                <i class="fas fa-eye"></i>
            </button>`;
        }
        
        if (hasUpdatePermission) {
            actionButtons += `<button onclick="editModuleAction(${action.id})" class="text-indigo-600 hover:text-indigo-900" title="Edit">
                <i class="fas fa-edit"></i>
            </button>`;
        }
        
        if (hasDeletePermission) {
            actionButtons += `<button onclick="deleteModuleAction(${action.id})" class="text-red-600 hover:text-red-900" title="Delete">
                <i class="fas fa-trash"></i>
            </button>`;
        }
        
        return `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${action.id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatActionName" data-item='${JSON.stringify(action)}'>
                <!-- Action name will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatActionDisplayName" data-item='${JSON.stringify(action)}'>
                <!-- Display name will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatActionDescription" data-item='${JSON.stringify(action)}'>
                <!-- Description will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatActionStatus" data-item='${JSON.stringify(action)}'>
                <!-- Status will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    ${actionButtons}
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// Wait for formatters to be available
function waitForFormatters(formatterNames, callback, maxWait = 2000) {
    const startTime = Date.now();
    
    const checkFormatters = () => {
        const availableFormatters = formatterNames.filter(name => typeof window[name] === 'function');
        
        if (availableFormatters.length === formatterNames.length) { 
            callback();
        } else if (Date.now() - startTime < maxWait) {
            setTimeout(checkFormatters, 100);
        } else {
            callback();
        }
    };
    
    checkFormatters();
}

// Apply custom formatters
function applyCustomFormatters() {
    const customElements = document.querySelectorAll('[data-formatter]');

    if (customElements.length === 0) {
        return;
    }
    // Get unique formatter names that are needed
    const neededFormatters = [...new Set(Array.from(customElements).map(el => el.getAttribute('data-formatter')))];

    // Wait for formatters to be available before applying them
    waitForFormatters(neededFormatters, () => {
        applyFormattersToElements(customElements);
    });
}

// Apply formatters to elements (separated for reusability)
function applyFormattersToElements(customElements) {
    
    customElements.forEach(element => {
        const formatterName = element.getAttribute('data-formatter');
        const itemData = JSON.parse(element.getAttribute('data-item'));
        
        if (typeof window[formatterName] === 'function') {
            element.innerHTML = window[formatterName](itemData);
        } else {
            // Fallback: show raw data immediately
            const fallbackValue = itemData[formatterName.replace('format', '').toLowerCase()] || 
                               itemData[formatterName.replace('format', '')] || 
                               itemData[formatterName.replace('format', '').replace(/([A-Z])/g, '_$1').toLowerCase()] ||
                               'N/A';
            element.innerHTML = `<span class="text-gray-900">${fallbackValue}</span>`;
        }
    });
}

// Export functions for use in other scripts
window.TableUtils = {
    initTable,
    sortTable,
    loadTableData,
    goToPage,
    applyCustomFormatters
};

// Initialize table when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a page that uses the table component
    const tableElement = document.getElementById('dataTable');
    if (tableElement) {
        initTable();
    }
});
