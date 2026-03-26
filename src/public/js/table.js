let currentSort = { column: 'created_at', direction: 'desc' };
let currentPage = 1;
let currentSearch = '';
let currentFilters = {};
let isLoading = false;

function getTablePageType(pathname = window.location.pathname) {
    if (pathname.includes('/rbac/modules') && pathname.includes('/actions')) return 'moduleActions';
    if (pathname.includes('/rbac/roles')) return 'roles';
    if (pathname.includes('/rbac/permissions')) return 'permissions';
    if (pathname.includes('/rbac/modules')) return 'modules';
    if (pathname.includes('/media')) return 'media';
    if (pathname.includes('/users')) return 'users';
    return 'users';
}

function getTablePageUi(pageType) {
    const uiByType = {
        moduleActions: {
            loadingTitle: 'Loading Module Actions...',
            loadingMessage: 'Fetching module actions data from server',
            loadingText: 'Loading module actions...',
            emptyIcon: 'fas fa-cogs',
            emptyTitle: 'No Module Actions Found',
            emptyMessage: 'No module actions match your current search criteria.'
        },
        media: {
            loadingTitle: 'Loading Media...',
            loadingMessage: 'Fetching media data from server',
            loadingText: 'Loading media...',
            emptyIcon: 'fas fa-images',
            emptyTitle: 'No Media Found',
            emptyMessage: 'No media files have been uploaded yet.'
        },
        users: {
            loadingTitle: 'Loading Users...',
            loadingMessage: 'Fetching user data from server',
            loadingText: 'Loading users...',
            emptyIcon: 'fas fa-users',
            emptyTitle: 'No Users Found',
            emptyMessage: 'No users match your current filter criteria.'
        },
        roles: {
            loadingTitle: 'Loading Roles...',
            loadingMessage: 'Fetching roles data from server',
            loadingText: 'Loading roles...',
            emptyIcon: 'fas fa-user-tag',
            emptyTitle: 'No Roles Found',
            emptyMessage: 'No roles match your current filter criteria.'
        },
        permissions: {
            loadingTitle: 'Loading Permissions...',
            loadingMessage: 'Fetching permissions data from server',
            loadingText: 'Loading permissions...',
            emptyIcon: 'fas fa-key',
            emptyTitle: 'No Permissions Found',
            emptyMessage: 'No permissions match your current filter criteria.'
        },
        modules: {
            loadingTitle: 'Loading Modules...',
            loadingMessage: 'Fetching modules data from server',
            loadingText: 'Loading modules...',
            emptyIcon: 'fas fa-cube',
            emptyTitle: 'No Modules Found',
            emptyMessage: 'No modules match your current filter criteria.'
        }
    };

    return uiByType[pageType] || uiByType.users;
}

function getTableEndpoint(pathname, pageType) {
    if (pageType === 'moduleActions') {
        const pathParts = pathname.split('/');
        const moduleIdIndex = pathParts.findIndex(part => part === 'modules') + 1;
        const moduleId = pathParts[moduleIdIndex];
        return `/admin/rbac/modules/${moduleId}/actions/data`;
    }

    const endpointByType = {
        media: '/admin/media/data',
        roles: '/admin/rbac/roles/data',
        permissions: '/admin/rbac/permissions/data',
        modules: '/admin/rbac/modules/data',
        users: '/admin/users/data'
    };

    return endpointByType[pageType] || endpointByType.users;
}

function hasPermission(permissionName) {
    return Array.isArray(window.userPermissions) && window.userPermissions.some(p => p.name === permissionName);
}

function renderActionButton({ onclick, icon, className, title, extraAttributes = '' }) {
    return `<button onclick="${onclick}" ${extraAttributes} class="${className}" title="${title}">
        <i class="${icon}"></i>
    </button>`;
}

const ACTION_BTN_BASE = 'inline-flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2';
const ACTION_BTN_TONE = {
    blue: `${ACTION_BTN_BASE} text-blue-600 hover:text-blue-900`,
    indigo: `${ACTION_BTN_BASE} text-indigo-600 hover:text-indigo-900`,
    green: `${ACTION_BTN_BASE} text-green-600 hover:text-green-900`,
    yellow: `${ACTION_BTN_BASE} text-yellow-600 hover:text-yellow-900`,
    red: `${ACTION_BTN_BASE} text-red-600 hover:text-red-900`
};

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
    
    // Apply custom formatters immediately and with multiple delays to ensure they load
    applyCustomFormatters();
    setTimeout(() => {
        applyCustomFormatters();
    }, 100);
    setTimeout(() => {
        applyCustomFormatters();
    }, 500);
    setTimeout(() => {
        applyCustomFormatters();
    }, 1000);
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
    const pageType = getTablePageType(currentPath);
    const pageUi = getTablePageUi(pageType);
    
    if (typeof showAjaxLoader === 'function') {
        showAjaxLoader({
            title: pageUi.loadingTitle,
            message: pageUi.loadingMessage
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

        const endpoint = getTableEndpoint(currentPath, pageType);
        
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
        
        // Update user permissions if provided in response
        if (data.userPermissions) {
            window.userPermissions = data.userPermissions;
        }
        
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
    }
    
    // Update table body
    const tbody = document.querySelector('#dataTable tbody');
    if (tbody) {
        // Check if we have data in the response
        if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
            // Generate table rows from the data
            tbody.innerHTML = generateTableRows(data.data);
            
            // Apply custom formatters after rendering with multiple attempts
            applyCustomFormatters();
            setTimeout(() => {
                applyCustomFormatters();
            }, 100);
            setTimeout(() => {
                applyCustomFormatters();
            }, 300);
            setTimeout(() => {
                applyCustomFormatters();
            }, 600);
        } else if (data.tableRows && typeof data.tableRows === 'string' && data.tableRows.trim() !== '') {
            // Fallback for pre-rendered HTML (if any endpoints still use this)
            tbody.innerHTML = data.tableRows;
        } else {
            const pageUi = getTablePageUi(getTablePageType(window.location.pathname));
            
            tbody.innerHTML = `
                <tr>
                    <td colspan="100%" class="px-6 py-12 text-center">
                        <div class="flex flex-col items-center justify-center">
                            <i class="${pageUi.emptyIcon} text-4xl text-gray-400 mb-4"></i>
                            <h3 class="text-lg font-medium text-gray-900 mb-2">${pageUi.emptyTitle}</h3>
                            <p class="text-gray-500 text-center max-w-sm">${pageUi.emptyMessage}</p>
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
        const pageUi = getTablePageUi(getTablePageType(window.location.pathname));
        
        tbody.innerHTML = `
            <tr>
                <td colspan="100%" class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center">
                        <i class="fas fa-spinner fa-spin text-indigo-600 mr-2"></i>
                        ${pageUi.loadingText}
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
    const pageType = getTablePageType(window.location.pathname);

    if (pageType === 'users') {
        return generateUserTableRows(data);
    } else if (pageType === 'roles') {
        return generateRoleTableRows(data);
    } else if (pageType === 'permissions') {
        return generatePermissionTableRows(data);
    } else if (pageType === 'moduleActions') {
        return generateModuleActionTableRows(data);
    } else if (pageType === 'modules') {
        return generateModuleTableRows(data);
    } else {
        return generateMediaTableRows(data);
    }
}

// Generate user table rows
function generateUserTableRows(users) {
    return users.map(user => {
        // Check user permissions
        const hasViewPermission = hasPermission('users.view');
        const hasUpdatePermission = hasPermission('users.update');
        const hasBlockPermission = hasPermission('users.block');
        const hasDeletePermission = hasPermission('users.delete');
        
        // Generate action buttons based on permissions
        let actionButtons = '';
        
        if (hasViewPermission) {
            actionButtons += renderActionButton({
                onclick: `viewUser(${user.id})`,
                icon: 'fas fa-eye',
                className: ACTION_BTN_TONE.blue,
                title: 'View'
            });
        }
        
        if (hasUpdatePermission) {
            actionButtons += renderActionButton({
                onclick: `editUser(${user.id})`,
                icon: 'fas fa-edit',
                className: ACTION_BTN_TONE.indigo,
                title: 'Edit'
            });
        }
        
        if (hasBlockPermission) {
            // Show only one button based on user status
            if (user.is_blocked == 1 || user.is_blocked === true) {
                // User is blocked - show unblock button
                actionButtons += renderActionButton({
                    onclick: `toggleUserStatus(${user.id}, 'unblock')`,
                    icon: 'fas fa-check',
                    className: ACTION_BTN_TONE.green,
                    title: 'Unblock User'
                });
            } else {
                // User is active - show block button
                actionButtons += renderActionButton({
                    onclick: `toggleUserStatus(${user.id}, 'block')`,
                    icon: 'fas fa-ban',
                    className: ACTION_BTN_TONE.yellow,
                    title: 'Block User'
                });
            }
        }
        
        if (hasDeletePermission) {
            actionButtons += renderActionButton({
                onclick: `deleteUser(${user.id})`,
                icon: 'fas fa-trash',
                className: ACTION_BTN_TONE.red,
                title: 'Delete'
            });
        }
        
        return `
        <tr class="hover:bg-gray-50">
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatUserName" data-item='${JSON.stringify(user)}'>
                <!-- User name will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatUserEmail" data-item='${JSON.stringify(user)}'>
                <!-- User email will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatUserRole" data-item='${JSON.stringify(user)}'>
                <!-- Role will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatUserStatus" data-item='${JSON.stringify(user)}'>
                <!-- Status will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatUserDate" data-item='${JSON.stringify(user)}'>
                <!-- Date will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex flex-wrap gap-2">
                    ${actionButtons}
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// Generate media table rows
function generateMediaTableRows(media) {
    return media.map(item => {
        // Check user permissions - use correct specific permissions
        const hasViewPermission = hasPermission('media.view');
        const hasEditPermission = hasPermission('media.edit');
        const hasDeletePermission = hasPermission('media.delete');
        
        // Generate action buttons based on permissions - use correct specific permissions
        let actionButtons = '';
        
        if (hasViewPermission) {
            actionButtons += renderActionButton({
                onclick: `window.location.href='/admin/media/view/${item.id}'`,
                icon: 'fas fa-eye',
                className: ACTION_BTN_TONE.indigo,
                title: 'View',
                extraAttributes: 'data-no-loader="true"'
            });
        }
        
        if (hasEditPermission) {
            actionButtons += renderActionButton({
                onclick: `window.location.href='/admin/media/edit/${item.id}'`,
                icon: 'fas fa-edit',
                className: ACTION_BTN_TONE.blue,
                title: 'Edit',
                extraAttributes: 'data-no-loader="true"'
            });
            
            // Add activate/deactivate button
            if (item.is_active == 1 || item.is_active === true) {
                actionButtons += renderActionButton({
                    onclick: `toggleMediaStatus(${item.id})`,
                    icon: 'fas fa-pause',
                    className: ACTION_BTN_TONE.yellow,
                    title: 'Deactivate'
                });
            } else {
                actionButtons += renderActionButton({
                    onclick: `toggleMediaStatus(${item.id})`,
                    icon: 'fas fa-play',
                    className: ACTION_BTN_TONE.green,
                    title: 'Activate'
                });
            }
        }
        
        if (hasDeletePermission) {
            actionButtons += renderActionButton({
                onclick: `deleteMedia(${item.id})`,
                icon: 'fas fa-trash',
                className: ACTION_BTN_TONE.red,
                title: 'Delete'
            });
        }
        
        return `
        <tr class="hover:bg-gray-50">
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatMediaTitle" data-item='${JSON.stringify(item)}'>
                <!-- Media title will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatScanningImage" data-item='${JSON.stringify(item)}'>
                <!-- Scanning image will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatMediaType" data-item='${JSON.stringify(item)}'>
                <!-- Media type will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatFileSize" data-item='${JSON.stringify(item)}'>
                <!-- File size will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatMediaStatus" data-item='${JSON.stringify(item)}'>
                <!-- Status will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatMediaDate" data-item='${JSON.stringify(item)}'>
                <!-- Date will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatUploadedBy" data-item='${JSON.stringify(item)}'>
                <!-- Uploaded by will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex flex-wrap gap-2">
                    ${actionButtons}
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// Generate role table rows
function generateRoleTableRows(roles) {
    return roles.map(role => {
        // Check user permissions
        const hasViewPermission = hasPermission('rbac.view');
        const hasCreatePermission = hasPermission('rbac.create');
        const hasAssignRolesPermission = hasPermission('rbac.assign_roles');
        const hasDeletePermission = hasPermission('rbac.delete');
        
        // Generate action buttons based on permissions
        let actionButtons = '';
        
        if (hasViewPermission) {
            actionButtons += `<button onclick="viewRole(${role.id})" class="text-blue-600 hover:text-blue-900" title="View">
                <i class="fas fa-eye"></i>
            </button>`;
        }
        
        if (hasCreatePermission) {
            actionButtons += `<button onclick="editRole(${role.id})" class="text-indigo-600 hover:text-indigo-900" title="Edit">
                <i class="fas fa-edit"></i>
            </button>`;
        }
        
        if (hasAssignRolesPermission) {
            actionButtons += `<button onclick="manageRolePermissions(${role.id})" class="text-green-600 hover:text-green-900" title="Permissions">
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
            <td class="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">${role.id}</td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatRole" data-item='${JSON.stringify(role)}'>
                <!-- Role will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatDescription" data-item='${JSON.stringify(role)}'>
                <!-- Description will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatUserCount" data-item='${JSON.stringify(role)}'>
                <!-- User count will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatPermissionCount" data-item='${JSON.stringify(role)}'>
                <!-- Permission count will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatStatus" data-item='${JSON.stringify(role)}'>
                <!-- Status will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex flex-wrap gap-2">
                    ${actionButtons}
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// Generate permission table rows
function generatePermissionTableRows(permissions) {
    return permissions.map(permission => {
        // Check user permissions
        const hasViewPermission = hasPermission('rbac.view');
        const hasUpdatePermission = hasPermission('rbac.update');
        const hasDeletePermission = hasPermission('rbac.delete');
        
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
            <td class="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">${permission.id}</td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatPermission" data-item='${JSON.stringify(permission)}'>
                <!-- Permission will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatPermissionName" data-item='${JSON.stringify(permission)}'>
                <!-- Permission name will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatModule" data-item='${JSON.stringify(permission)}'>
                <!-- Module will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatAction" data-item='${JSON.stringify(permission)}'>
                <!-- Action will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatResource" data-item='${JSON.stringify(permission)}'>
                <!-- Resource will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatDescription" data-item='${JSON.stringify(permission)}'>
                <!-- Description will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex flex-wrap gap-2">
                    ${actionButtons}
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// Generate module table rows
function generateModuleTableRows(modules) {
    return modules.map(module => {
        // Check user permissions
        const hasViewPermission = hasPermission('rbac.view');
        const hasUpdatePermission = hasPermission('rbac.update');
        const hasDeletePermission = hasPermission('rbac.delete');
        
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
            <td class="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">${module.id}</td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatModule" data-item='${JSON.stringify(module)}'>
                <!-- Module will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatModuleName" data-item='${JSON.stringify(module)}'>
                <!-- Module name will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatModuleIcon" data-item='${JSON.stringify(module)}'>
                <!-- Icon will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatModuleRoute" data-item='${JSON.stringify(module)}'>
                <!-- Route will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatModuleOrder" data-item='${JSON.stringify(module)}'>
                <!-- Order will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatModuleActions" data-item='${JSON.stringify(module)}'>
                <!-- Action count will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatModulePermissions" data-item='${JSON.stringify(module)}'>
                <!-- Permission count will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex flex-wrap gap-2">
                    ${actionButtons}
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// Generate module action table rows
function generateModuleActionTableRows(actions) {
    return actions.map(action => {
        // Check user permissions
        const hasViewPermission = hasPermission('rbac.view');
        const hasUpdatePermission = hasPermission('rbac.update');
        const hasDeletePermission = hasPermission('rbac.delete');
        
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
            <td class="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">${action.id}</td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatActionName" data-item='${JSON.stringify(action)}'>
                <!-- Action name will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatActionDisplayName" data-item='${JSON.stringify(action)}'>
                <!-- Display name will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 align-top table-cell-wrap" data-formatter="formatActionDescription" data-item='${JSON.stringify(action)}'>
                <!-- Description will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatActionStatus" data-item='${JSON.stringify(action)}'>
                <!-- Status will be formatted by JavaScript -->
            </td>
            <td class="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex flex-wrap gap-2">
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
