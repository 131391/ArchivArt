// Table Utilities for generating table data and pagination

class TableUtils {
    static generateTableData(options) {
        const {
            data,
            columns,
            actions,
            pagination,
            search,
            filters,
            sort,
            order,
            title,
            showSearch = true,
            searchPlaceholder = 'Search...',
            emptyIcon = 'inbox',
            emptyTitle = 'No data found',
            emptyMessage = 'No items have been added yet.',
            emptySearchMessage = 'No items match your search criteria.'
        } = options;

        // Generate pagination URLs
        const urlParams = { search, sort, order };
        if (filters) {
            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                    urlParams[key] = filters[key];
                }
            });
        }
        const paginationData = this.generatePaginationData(pagination, urlParams);

        return {
            title,
            data,
            columns,
            actions,
            pagination: paginationData,
            search,
            filters,
            showSearch,
            searchPlaceholder,
            emptyIcon,
            emptyTitle,
            emptyMessage,
            emptySearchMessage
        };
    }

    static generatePaginationData(pagination, params = {}) {
        if (!pagination || pagination.totalPages <= 1) {
            return null;
        }

        const { currentPage, totalPages, totalItems, limit } = pagination;
        const startItem = (currentPage - 1) * limit + 1;
        const endItem = Math.min(currentPage * limit, totalItems);
        
        // Calculate page range
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        return {
            currentPage,
            totalPages,
            totalItems,
            startItem,
            endItem,
            hasPrev: currentPage > 1,
            hasNext: currentPage < totalPages,
            startPage,
            endPage,
            prevUrl: this.buildUrl({ ...params, page: currentPage - 1 }),
            nextUrl: this.buildUrl({ ...params, page: currentPage + 1 }),
            getPageUrl: (page) => this.buildUrl({ ...params, page })
        };
    }

    static buildUrl(params) {
        const currentPath = params.path || '/admin/users';
        const url = new URL(currentPath, 'http://localhost:3000');
        
        Object.keys(params).forEach(key => {
            if (key !== 'path' && params[key] !== undefined && params[key] !== null && params[key] !== '') {
                url.searchParams.set(key, params[key]);
            }
        });
        
        return url.pathname + url.search;
    }

    static generateColumns(columnConfigs) {
        return columnConfigs.map(config => ({
            key: config.key,
            label: config.label,
            type: config.type || 'text',
            sortable: config.sortable !== false,
            formatter: config.formatter,
            badgeClass: config.badgeClass,
            avatarUrl: config.avatarUrl,
            subtitle: config.subtitle
        }));
    }

    static generateActions(actionConfigs) {
        return actionConfigs.map(config => ({
            onclick: config.onclick,
            class: config.class,
            title: config.title,
            icon: config.icon,
            condition: config.condition
        }));
    }

    static generateFilters(filterConfigs, currentValues = {}) {
        return filterConfigs.map(config => ({
            id: config.id,
            label: config.label,
            allText: config.allText,
            options: config.options,
            selected: currentValues[config.id] || ''
        }));
    }
}

module.exports = TableUtils;
