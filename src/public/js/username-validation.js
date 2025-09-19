// Username Validation JavaScript
// Provides real-time username availability checking and suggestions

class UsernameValidator {
    constructor(options = {}) {
        this.apiEndpoint = options.apiEndpoint || '/api/auth/check-username';
        this.debounceDelay = options.debounceDelay || 500;
        this.minLength = options.minLength || 3;
        this.maxLength = options.maxLength || 50;
        this.pendingRequests = new Map();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Find all username input fields
        const usernameInputs = document.querySelectorAll('input[name="username"], input[id*="username"], input[type="text"][placeholder*="username" i]');
        
        usernameInputs.forEach(input => {
            this.attachValidation(input);
        });

        // Also watch for dynamically added username inputs
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const usernameInputs = node.querySelectorAll ? 
                            node.querySelectorAll('input[name="username"], input[id*="username"], input[type="text"][placeholder*="username" i]') : [];
                        usernameInputs.forEach(input => {
                            if (!input.hasAttribute('data-username-validator-attached')) {
                                this.attachValidation(input);
                            }
                        });
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    attachValidation(input) {
        // Mark as attached to prevent duplicate listeners
        input.setAttribute('data-username-validator-attached', 'true');

        // Create validation container
        const container = this.createValidationContainer(input);
        
        // Add event listeners
        input.addEventListener('input', this.debounce((e) => {
            this.validateUsername(e.target, container);
        }, this.debounceDelay));

        input.addEventListener('blur', (e) => {
            if (e.target.value.trim()) {
                this.validateUsername(e.target, container);
            }
        });

        input.addEventListener('focus', () => {
            if (input.value.trim()) {
                this.validateUsername(input, container);
            }
        });
    }

    createValidationContainer(input) {
        // Create container for validation messages
        const container = document.createElement('div');
        container.className = 'username-validation-container mt-2';
        container.style.display = 'none';

        // Insert after the input field
        input.parentNode.insertBefore(container, input.nextSibling);

        return container;
    }

    async validateUsername(input, container) {
        const username = input.value.trim();
        
        // Clear previous validation state
        this.clearValidationState(input, container);

        // Basic client-side validation
        if (username.length === 0) {
            this.hideValidationContainer(container);
            return;
        }

        if (username.length < this.minLength) {
            this.showValidationMessage(container, 'error', `Username must be at least ${this.minLength} characters long`);
            return;
        }

        if (username.length > this.maxLength) {
            this.showValidationMessage(container, 'error', `Username must be no more than ${this.maxLength} characters long`);
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.showValidationMessage(container, 'error', 'Username can only contain letters, numbers, and underscores');
            return;
        }

        // Show loading state
        this.showValidationMessage(container, 'loading', 'Checking username availability...');

        try {
            const result = await this.checkUsernameAvailability(username);
            this.handleValidationResult(input, container, result);
        } catch (error) {
            console.error('Username validation error:', error);
            this.showValidationMessage(container, 'error', 'Error checking username availability');
        }
    }

    async checkUsernameAvailability(username) {
        // Cancel any pending request for this username
        if (this.pendingRequests.has(username)) {
            this.pendingRequests.get(username).abort();
        }

        // Create new request
        const controller = new AbortController();
        this.pendingRequests.set(username, controller);

        try {
            const response = await fetch(`${this.apiEndpoint}?username=${encodeURIComponent(username)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } finally {
            this.pendingRequests.delete(username);
        }
    }

    handleValidationResult(input, container, result) {
        if (result.available) {
            this.showValidationMessage(container, 'success', 'Username is available!');
            this.setInputState(input, 'valid');
        } else {
            this.showValidationMessage(container, 'error', 'Username is already taken');
            this.setInputState(input, 'invalid');
            
            // Show suggestions if available
            if (result.suggestions && result.suggestions.length > 0) {
                this.showSuggestions(container, result.suggestions);
            }
        }
    }

    showSuggestions(container, suggestions) {
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'username-suggestions mt-2';
        
        const suggestionsTitle = document.createElement('p');
        suggestionsTitle.className = 'text-sm text-gray-600 mb-2';
        suggestionsTitle.textContent = 'Suggested usernames:';
        
        const suggestionsList = document.createElement('div');
        suggestionsList.className = 'flex flex-wrap gap-2';
        
        suggestions.forEach(suggestion => {
            const suggestionButton = document.createElement('button');
            suggestionButton.type = 'button';
            suggestionButton.className = 'px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors';
            suggestionButton.textContent = suggestion;
            suggestionButton.addEventListener('click', () => {
                this.useSuggestion(suggestion);
            });
            suggestionsList.appendChild(suggestionButton);
        });
        
        suggestionsContainer.appendChild(suggestionsTitle);
        suggestionsContainer.appendChild(suggestionsList);
        container.appendChild(suggestionsContainer);
    }

    useSuggestion(suggestion) {
        // Find the username input that this suggestion belongs to
        const validationContainers = document.querySelectorAll('.username-validation-container');
        validationContainers.forEach(container => {
            const input = container.previousElementSibling;
            if (input && input.tagName === 'INPUT') {
                input.value = suggestion;
                this.validateUsername(input, container);
                
                // Trigger change event
                const event = new Event('change', { bubbles: true });
                input.dispatchEvent(event);
            }
        });
    }

    showValidationMessage(container, type, message) {
        container.innerHTML = '';
        container.style.display = 'block';

        const messageDiv = document.createElement('div');
        messageDiv.className = `username-validation-message text-sm flex items-center gap-2`;

        const icon = document.createElement('i');
        icon.className = this.getIconClass(type);

        const text = document.createElement('span');
        text.textContent = message;

        messageDiv.appendChild(icon);
        messageDiv.appendChild(text);

        // Add appropriate styling based on type
        if (type === 'success') {
            messageDiv.classList.add('text-green-600');
        } else if (type === 'error') {
            messageDiv.classList.add('text-red-600');
        } else if (type === 'loading') {
            messageDiv.classList.add('text-blue-600');
        }

        container.appendChild(messageDiv);
    }

    getIconClass(type) {
        const iconClasses = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            loading: 'fas fa-spinner fa-spin'
        };
        return iconClasses[type] || 'fas fa-info-circle';
    }

    setInputState(input, state) {
        // Remove previous state classes
        input.classList.remove('border-green-500', 'border-red-500', 'border-blue-500');
        
        // Add new state class
        if (state === 'valid') {
            input.classList.add('border-green-500');
        } else if (state === 'invalid') {
            input.classList.add('border-red-500');
        } else {
            input.classList.add('border-blue-500');
        }
    }

    clearValidationState(input, container) {
        input.classList.remove('border-green-500', 'border-red-500', 'border-blue-500');
        container.innerHTML = '';
        container.style.display = 'none';
    }

    hideValidationContainer(container) {
        container.style.display = 'none';
    }

    debounce(func, wait) {
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
}

// Initialize username validator when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the username validator
    window.usernameValidator = new UsernameValidator({
        apiEndpoint: '/api/auth/check-username',
        debounceDelay: 500,
        minLength: 3,
        maxLength: 50
    });
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UsernameValidator;
}
