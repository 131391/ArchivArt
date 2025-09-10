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
    currentSort = options.sort || { column: 'created_at', direction: 'desc' };
    currentPage = options.page || 1;
    currentSearch = options.search || '';
    currentFilters = options.filters || {};

    // Set up event listeners
    setupEventListeners();
    
    // Set current filter values on page load
    setFilterValues();
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
    filters.forEach(filter => {
        filter.addEventListener('change', function() {
            const filterName = this.id.replace('Filter', '');
            currentFilters[filterName] = this.value;
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
    const loadingTitle = isMediaPage ? 'Loading Media...' : 'Loading Users...';
    const loadingMessage = isMediaPage ? 'Fetching media data from server' : 'Fetching user data from server';
    
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
        const endpoint = currentPath.includes('/media') ? '/admin/media/data' : '/admin/users/data';
        
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
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        updateTableContent(data);
        
    } catch (error) {
        console.error('Error loading table data:', error);
        if (typeof showErrorModal === 'function') {
            showErrorModal('Error loading table data: ' + error.message);
        } else {
            alert('Error loading table data: ' + error.message);
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
    // Update table body
    const tbody = document.querySelector('#dataTable tbody');
    if (tbody) {
        if (data.tableRows && typeof data.tableRows === 'string' && data.tableRows.trim() !== '') {
            tbody.innerHTML = data.tableRows;
        } else {
            // Show empty state when no data - determine content based on current page
            const currentPath = window.location.pathname;
            const isMediaPage = currentPath.includes('/media');
            
            const emptyIcon = isMediaPage ? 'fas fa-images' : 'fas fa-users';
            const emptyTitle = isMediaPage ? 'No Media Found' : 'No Users Found';
            const emptyMessage = isMediaPage ? 
                'No media files have been uploaded yet.' : 
                'No users match your current filter criteria.';
            
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
        if (data.pagination && typeof data.pagination === 'string' && data.pagination.trim() !== '') {
            paginationContainer.innerHTML = data.pagination;
        } else {
            paginationContainer.innerHTML = '';
        }
    }
}

// Show loading state
function showLoadingState() {
    const tbody = document.querySelector('#dataTable tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="100%" class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center">
                        <i class="fas fa-spinner fa-spin text-indigo-600 mr-2"></i>
                        Loading...
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

// Export functions for use in other scripts
window.TableUtils = {
    initTable,
    sortTable,
    loadTableData,
    goToPage
};
