# Common Table Component

A reusable table component with built-in pagination, sorting, and filtering functionality.

## Usage

### 1. In Controller

```javascript
const TableUtils = require('../utils/tableUtils');

// Generate table data
const tableData = TableUtils.generateTableData({
    data: users, // Array of data objects
    columns: TableUtils.generateColumns([
        {
            key: 'name',
            label: 'User',
            type: 'avatar',
            subtitle: (user) => user.email
        },
        {
            key: 'role',
            label: 'Role',
            type: 'badge',
            badgeClass: (user) => user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
        },
        {
            key: 'status',
            label: 'Status',
            type: 'badge',
            formatter: (user) => user.is_active ? 'Active' : 'Inactive',
            badgeClass: (user) => user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        },
        {
            key: 'created_at',
            label: 'Created',
            type: 'date'
        }
    ]),
    actions: TableUtils.generateActions([
        {
            onclick: (user) => `viewUser(${user.id})`,
            class: 'text-indigo-600 hover:text-indigo-900',
            title: 'View Details',
            icon: 'fas fa-eye'
        },
        {
            onclick: (user) => `editUser(${user.id})`,
            class: 'text-blue-600 hover:text-blue-900',
            title: 'Edit User',
            icon: 'fas fa-edit'
        }
    ]),
    pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalUsers,
        limit: 10
    },
    search,
    filters: TableUtils.generateFilters([
        {
            id: 'statusFilter',
            label: 'Status',
            allText: 'All Status',
            options: [
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
            ]
        }
    ], { statusFilter: status }),
    sort,
    order,
    title: 'Users Management',
    searchPlaceholder: 'Search users...',
    emptyIcon: 'users',
    emptyTitle: 'No users found',
    emptyMessage: 'No users have been registered yet.',
    emptySearchMessage: 'No users match your search criteria.'
});

res.render('admin/users', tableData);
```

### 2. In EJS Template

```ejs
<!-- Include Common Table Component -->
<%- include('../components/table', {
    title: title,
    data: data,
    columns: columns,
    actions: actions,
    pagination: pagination,
    search: search,
    filters: filters,
    showSearch: showSearch,
    searchPlaceholder: searchPlaceholder,
    emptyIcon: emptyIcon,
    emptyTitle: emptyTitle,
    emptyMessage: emptyMessage,
    emptySearchMessage: emptySearchMessage
}) %>
```

### 3. In Layout (for JavaScript)

```ejs
<!-- Common Table JavaScript -->
<script src="/js/table.js"></script>

<!-- Page specific JavaScript -->
<% if (typeof title !== 'undefined' && title.includes('Users')) { %>
    <script>
    // Initialize table with common functions
    TableUtils.initTable({
        sort: { column: 'created_at', direction: 'desc' },
        page: <%= pagination ? pagination.currentPage : 1 %>,
        search: '<%= search || "" %>',
        filters: [
            { id: 'statusFilter' },
            { id: 'roleFilter' }
        ]
    });
    </script>
<% } %>
```

## Column Types

### 1. Text (default)
```javascript
{
    key: 'name',
    label: 'Name',
    type: 'text'
}
```

### 2. Avatar
```javascript
{
    key: 'name',
    label: 'User',
    type: 'avatar',
    subtitle: (user) => user.email,
    avatarUrl: (user) => user.avatar_url // Optional custom avatar URL
}
```

### 3. Badge
```javascript
{
    key: 'status',
    label: 'Status',
    type: 'badge',
    formatter: (user) => user.is_active ? 'Active' : 'Inactive',
    badgeClass: (user) => user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
}
```

### 4. Date
```javascript
{
    key: 'created_at',
    label: 'Created',
    type: 'date'
}
```

### 5. Custom
```javascript
{
    key: 'custom_field',
    label: 'Custom',
    type: 'custom',
    formatter: (item) => `<span class="font-bold">${item.custom_field}</span>`
}
```

## Actions

```javascript
{
    onclick: (item) => `viewItem(${item.id})`,
    class: 'text-indigo-600 hover:text-indigo-900',
    title: 'View Details',
    icon: 'fas fa-eye',
    condition: (item) => item.status === 'active' // Optional condition
}
```

## Filters

```javascript
{
    id: 'statusFilter',
    label: 'Status',
    allText: 'All Status',
    options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
    ]
}
```

## Features

- ✅ **Pagination**: Automatic pagination with page numbers
- ✅ **Sorting**: Click column headers to sort
- ✅ **Search**: Built-in search functionality
- ✅ **Filtering**: Dropdown filters for data
- ✅ **Responsive**: Mobile-friendly design
- ✅ **Customizable**: Flexible column types and actions
- ✅ **Empty States**: Customizable empty state messages
- ✅ **Accessibility**: Proper ARIA labels and keyboard support

## JavaScript Functions

The common table component provides these utility functions:

- `TableUtils.initTable(options)` - Initialize table functionality
- `TableUtils.sortTable(column)` - Sort table by column
- `TableUtils.applyFilters()` - Apply current filters
- `TableUtils.buildPaginationUrl(page, params)` - Build pagination URLs
- `TableUtils.buildFilterUrl(filters)` - Build filter URLs
