// Common Table JavaScript Functions - AJAX Based

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

    console.log('Table initialized with:', {
        currentSort,
        currentPage,
        currentSearch,
        currentFilters
    });

    // Set up event listeners
    setupEventListeners();
    
    // Set current filter values on page load
    setFilterValues();
    
    // Apply custom formatters
    applyCustomFormatters();
}

// Set up all event listeners
function setupEventListeners() {
    // Search input with debouncing
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        console.log('Table.js: Search input found, setting up event listeners');
        
        // Debounced search function
        const debouncedSearch = debounce(function(value) {
            console.log('Table.js: Debounced search triggered with value:', value);
            currentSearch = value;
            currentPage = 1;
            console.log('Table.js: About to call loadTableData');
            loadTableData();
        }, 500); // 500ms delay
        
        // Input event listener
        searchInput.addEventListener('input', function(e) {
            const value = e.target.value.trim();
            console.log('Table.js: Search input changed:', value);
            
            // Show loading indicator
            const loadingIndicator = document.getElementById('searchLoading');
            if (loadingIndicator) {
                console.log('Table.js: Showing search loading indicator');
                loadingIndicator.classList.remove('hidden');
            } else {
                console.log('Table.js: Search loading indicator not found');
            }
            
            // Debounced search
            debouncedSearch(value);
        });
        
        // Clear search on escape
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                console.log('Table.js: Escape key pressed, clearing search');
                this.value = '';
                currentSearch = '';
                currentPage = 1;
                loadTableData();
            }
        });
    } else {
        console.log('Table.js: Search input not found');
    }

    // Filter dropdowns
    const filters = document.querySelectorAll('select[id$="Filter"]');
    console.log('Table.js: Found filter elements:', filters.length);
    
    filters.forEach(filter => {
        console.log('Table.js: Setting up filter listener for:', filter.id);
        filter.addEventListener('change', function() {
            const filterName = this.id.replace('Filter', '');
            console.log('Table.js: Filter changed:', filterName, '=', this.value);
            
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
            console.log('Table.js: Updated filters:', currentFilters);
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
            console.log('Table.js: Hiding search loading indicator');
            searchLoadingIndicator.classList.add('hidden');
        } else {
            console.log('Table.js: Search loading indicator not found for hiding');
        }
    }
}

// Update table content with new data
function updateTableContent(data) {
    console.log('updateTableContent called with data:', data);
    
    // Update table body
    const tbody = document.querySelector('#dataTable tbody');
    if (tbody) {
        // Check if we have data in the response
        if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
            console.log('Rendering table rows for', data.data.length, 'items');
            // Generate table rows from the data
            tbody.innerHTML = generateTableRows(data.data);
            
            // Apply custom formatters after rendering
            setTimeout(() => {
                applyCustomFormatters();
            }, 100);
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
            
            console.log('Showing empty state:', emptyTitle);
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

    // Update pagination
    const paginationContainer = document.querySelector('.bg-white.px-4.py-3');
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
                
                const startItem = ((currentPage - 1) * 10) + 1;
                const endItem = Math.min(currentPage * 10, totalItems);
                
                let paginationHTML = `
                    <div class="flex items-center justify-between">
                        <div class="flex-1 flex justify-between sm:hidden">
                            ${hasPrev ? `<button onclick="goToPage(${currentPage - 1})" class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Previous</button>` : ''}
                            ${hasNext ? `<button onclick="goToPage(${currentPage + 1})" class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Next</button>` : ''}
                        </div>
                        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p class="text-sm text-gray-700">
                                    Showing <span class="font-medium">${startItem}</span> to <span class="font-medium">${endItem}</span> of <span class="font-medium">${totalItems}</span> results
                                </p>
                            </div>
                            <div>
                                <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    ${hasPrev ? `<button onclick="goToPage(${currentPage - 1})" class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                                        <span class="sr-only">Previous</span>
                                        <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                                        </svg>
                                    </button>` : ''}
                `;
                
                // Generate page numbers
                const startPage = Math.max(1, currentPage - 2);
                const endPage = Math.min(totalPages, currentPage + 2);
                
                for (let i = startPage; i <= endPage; i++) {
                    const isActive = i === currentPage;
                    paginationHTML += `
                        <button onclick="goToPage(${i})" class="relative inline-flex items-center px-4 py-2 border text-sm font-medium ${isActive ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}">
                            ${i}
                        </button>
                    `;
                }
                
                paginationHTML += `
                                    ${hasNext ? `<button onclick="goToPage(${currentPage + 1})" class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                                        <span class="sr-only">Next</span>
                                        <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                                        </svg>
                                    </button>` : ''}
                                </nav>
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
    console.log('Table.js: Setting filter values:', currentFilters);
    
    // Set search value
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = currentSearch;
        console.log('Table.js: Set search input value to:', currentSearch);
    }
    
    // Set filter values
    Object.keys(currentFilters).forEach(filterName => {
        const filterElement = document.getElementById(filterName + 'Filter');
        if (filterElement) {
            filterElement.value = currentFilters[filterName];
            console.log('Table.js: Set filter', filterName, 'to value:', currentFilters[filterName]);
        } else {
            console.log('Table.js: Filter element not found:', filterName + 'Filter');
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
    return users.map(user => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.name || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.email || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatRole" data-item='${JSON.stringify(user)}'>
                <!-- Role will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatStatus" data-item='${JSON.stringify(user)}'>
                <!-- Status will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatDate" data-item='${JSON.stringify(user)}'>
                <!-- Date will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    <button onclick="viewUser(${user.id})" class="text-blue-600 hover:text-blue-900" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editUser(${user.id})" class="text-indigo-600 hover:text-indigo-900" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="toggleUserStatus(${user.id}, '${user.is_blocked ? 'unblock' : 'block'}')" class="text-${user.is_blocked ? 'green' : 'yellow'}-600 hover:text-${user.is_blocked ? 'green' : 'yellow'}-900" title="${user.is_blocked ? 'Unblock' : 'Block'}">
                        <i class="fas fa-${user.is_blocked ? 'check' : 'ban'}"></i>
                    </button>
                    <button onclick="deleteUser(${user.id})" class="text-red-600 hover:text-red-900" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Generate media table rows
function generateMediaTableRows(media) {
    return media.map(item => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-12 w-12">
                        ${item.media_type === 'image' ? 
                            `<img class="h-12 w-12 rounded-lg object-cover" src="/uploads/media/${item.file_path}" alt="${item.title}">` :
                            `<div class="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                                <i class="fas fa-${item.media_type === 'video' ? 'video' : 'music'} text-gray-500"></i>
                            </div>`
                        }
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${item.title || ''}</div>
                        <div class="text-sm text-gray-500">${item.media_type || ''}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.description || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.scanning_image || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${item.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${new Date(item.created_at).toLocaleDateString()}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.uploaded_by_name || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    <button onclick="window.location.href='/admin/media/view/${item.id}'" class="text-indigo-600 hover:text-indigo-900" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="window.location.href='/admin/media/edit/${item.id}'" class="text-blue-600 hover:text-blue-900" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteMedia(${item.id})" class="text-red-600 hover:text-red-900" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Generate role table rows
function generateRoleTableRows(roles) {
    return roles.map(role => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${role.id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${role.display_name || role.name || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${role.description || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${role.user_count || 0}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${role.permission_count || 0}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatStatus" data-item='${JSON.stringify(role)}'>
                <!-- Status will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    <button onclick="viewRole(${role.id})" class="text-blue-600 hover:text-blue-900" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editRole(${role.id})" class="text-indigo-600 hover:text-indigo-900" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="manageRolePermissions(${role.id})" class="text-green-600 hover:text-green-900" title="Permissions">
                        <i class="fas fa-key"></i>
                    </button>
                    <button onclick="deleteRole(${role.id})" class="text-red-600 hover:text-red-900" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Generate permission table rows
function generatePermissionTableRows(permissions) {
    return permissions.map(permission => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${permission.id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${permission.display_name || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${permission.name || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${permission.module || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${permission.action || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${permission.resource || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${permission.description || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    <button onclick="viewPermission(${permission.id})" class="text-blue-600 hover:text-blue-900" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editPermission(${permission.id})" class="text-indigo-600 hover:text-indigo-900" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deletePermission(${permission.id})" class="text-red-600 hover:text-red-900" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Generate module table rows
function generateModuleTableRows(modules) {
    return modules.map(module => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${module.id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${module.name || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${module.display_name || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${module.route || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${module.order_index || 0}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${module.action_count || 0}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${module.permission_count || 0}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatStatus" data-item='${JSON.stringify(module)}'>
                <!-- Status will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    <button onclick="viewModule(${module.id})" class="text-blue-600 hover:text-blue-900" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editModule(${module.id})" class="text-indigo-600 hover:text-indigo-900" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="manageModuleActions(${module.id})" class="text-green-600 hover:text-green-900" title="Actions">
                        <i class="fas fa-cogs"></i>
                    </button>
                    <button onclick="deleteModule(${module.id})" class="text-red-600 hover:text-red-900" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Generate module table rows
function generateModuleTableRows(modules) {
    return modules.map(module => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${module.id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${module.display_name || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${module.name || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatIcon" data-item='${JSON.stringify(module)}'>
                <!-- Icon will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatRoute" data-item='${JSON.stringify(module)}'>
                <!-- Route will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatOrderIndex" data-item='${JSON.stringify(module)}'>
                <!-- Order will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatActionCount" data-item='${JSON.stringify(module)}'>
                <!-- Action count will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatPermissionCount" data-item='${JSON.stringify(module)}'>
                <!-- Permission count will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    <button onclick="viewModule(${module.id})" class="text-blue-600 hover:text-blue-900" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editModule(${module.id})" class="text-indigo-600 hover:text-indigo-900" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="manageModuleActions(${module.id})" class="text-green-600 hover:text-green-900" title="Actions">
                        <i class="fas fa-cogs"></i>
                    </button>
                    <button onclick="deleteModule(${module.id})" class="text-red-600 hover:text-red-900" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Generate module action table rows
function generateModuleActionTableRows(actions) {
    return actions.map(action => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${action.id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${action.name || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${action.display_name || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${action.description || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-formatter="formatStatus" data-item='${JSON.stringify(action)}'>
                <!-- Status will be formatted by JavaScript -->
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    <button onclick="viewModuleAction(${action.id})" class="text-blue-600 hover:text-blue-900" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editModuleAction(${action.id})" class="text-indigo-600 hover:text-indigo-900" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteModuleAction(${action.id})" class="text-red-600 hover:text-red-900" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Apply custom formatters
function applyCustomFormatters() {
    console.log('applyCustomFormatters called');
    const customElements = document.querySelectorAll('[data-formatter]');
    console.log('Found custom elements:', customElements.length);
    
    customElements.forEach(element => {
        const formatterName = element.getAttribute('data-formatter');
        const itemData = JSON.parse(element.getAttribute('data-item'));
        
        console.log('Processing element with formatter:', formatterName, 'data:', itemData);
        
        if (typeof window[formatterName] === 'function') {
            console.log('Calling formatter function:', formatterName);
            element.innerHTML = window[formatterName](itemData);
        } else {
            console.log('Formatter function not found:', formatterName, 'available functions:', Object.keys(window).filter(k => k.startsWith('format')));
            // If formatter is not available, try again in 100ms
            if (window.location.pathname.includes('/users') && formatterName.startsWith('format')) {
                setTimeout(() => {
                    if (typeof window[formatterName] === 'function') {
                        console.log('Retrying formatter:', formatterName);
                        element.innerHTML = window[formatterName](itemData);
                    } else {
                        element.innerHTML = itemData[formatterName] || '';
                    }
                }, 100);
            } else {
                element.innerHTML = itemData[formatterName] || '';
            }
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
    console.log('Table.js: DOM loaded, initializing table');
    
    // Check if we're on a page that uses the table component
    const tableElement = document.getElementById('dataTable');
    if (tableElement) {
        console.log('Table.js: Table element found, initializing');
        initTable();
    } else {
        console.log('Table.js: No table element found, skipping initialization');
    }
});
