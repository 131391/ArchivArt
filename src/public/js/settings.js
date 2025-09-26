// Global variables
let currentSettings = {};

// Immediately make functions available
function previewLogo(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const currentLogo = document.getElementById('currentLogo');
            currentLogo.innerHTML = `<img src="${e.target.result}" alt="Logo Preview" class="w-full h-full object-contain rounded-lg">`;
            
            // Update the upload area to show file is selected
            const uploadLabel = document.querySelector('label[for="logo"]');
            if (uploadLabel) {
                uploadLabel.innerHTML = `
                    <i class="fas fa-check-circle mr-2 text-green-500"></i>
                    <span class="text-sm text-green-600">File selected: ${input.files[0].name}</span>
                `;
            }
        };
        reader.onerror = function(error) {
            showErrorToast('Error reading file: ' + error.message);
        };
        reader.readAsDataURL(input.files[0]);
    }
}


function validateForm(form, type) {
    const errors = [];
    
    if (type === 'brand') {
        const siteName = form.querySelector('#site_name').value.trim();
        const primaryColor = form.querySelector('#primary_color').value;
        
        if (!siteName) {
            errors.push('Application name is required');
        }
        
        if (!/^#[0-9A-F]{6}$/i.test(primaryColor)) {
            errors.push('Please enter a valid hex color code');
        }
        
        // Validate logo file if uploaded
        const logoFile = form.querySelector('#logo').files[0];
        if (logoFile) {
            const maxSize = 5 * 1024 * 1024; // 5MB
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
            
            if (logoFile.size > maxSize) {
                errors.push('Logo file size must be less than 5MB');
            }
            
            if (!allowedTypes.includes(logoFile.type)) {
                errors.push('Logo must be a JPEG, PNG, or SVG file');
            }
        }
    } else if (type === 'system') {
        const maxFileSize = parseInt(form.querySelector('#max_file_size').value);
        const maxUploads = parseInt(form.querySelector('#max_uploads_per_day').value);
        
        if (maxFileSize < 1 || maxFileSize > 1000) {
            errors.push('Max file size must be between 1 and 1000 MB');
        }
        
        if (maxUploads < 1 || maxUploads > 1000) {
            errors.push('Max uploads per day must be between 1 and 1000');
        }
    } else if (type === 'security') {
        const jwtExpiry = parseInt(form.querySelector('#jwt_expiry').value);
        const sessionTimeout = parseInt(form.querySelector('#session_timeout').value);
        
        if (jwtExpiry < 1 || jwtExpiry > 168) {
            errors.push('JWT expiry must be between 1 and 168 hours');
        }
        
        if (sessionTimeout < 1 || sessionTimeout > 168) {
            errors.push('Session timeout must be between 1 and 168 hours');
        }
    } else if (type === 'email') {
        const smtpHost = form.querySelector('#smtp_host').value.trim();
        const smtpPort = form.querySelector('#smtp_port').value;
        const smtpUser = form.querySelector('#smtp_user').value.trim();
        
        if (smtpHost && !smtpPort) {
            errors.push('SMTP port is required when SMTP host is provided');
        }
        
        if (smtpPort && (!smtpPort.match(/^\d+$/) || parseInt(smtpPort) < 1 || parseInt(smtpPort) > 65535)) {
            errors.push('SMTP port must be a valid port number (1-65535)');
        }
        
        if (smtpUser && !smtpUser.includes('@')) {
            errors.push('SMTP username must be a valid email address');
        }
    }
    
    return errors;
}

// Function to clean URL parameters
function cleanUrlParameters() {
    try {
        // Get current URL without query parameters
        const url = new URL(window.location);
        const cleanUrl = url.origin + url.pathname;
        
        // Only update URL if there are query parameters
        if (url.search) {
            // Use history.replaceState to update URL without page reload
            window.history.replaceState({}, document.title, cleanUrl);
        }
    } catch (error) {
        // Silently handle URL cleaning errors
    }
}

async function handleFormSubmission(form, type) {
    // Check if submit button is disabled (no permission)
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn || submitBtn.disabled) {
        showErrorToast('You do not have permission to update settings');
        return;
    }
    
    // Validate form
    const errors = validateForm(form, type);
    if (errors.length > 0) {
        showErrorToast(errors.join(', '));
        return;
    }
    
    // Show loading state
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
    
    // Create FormData
    const formData = new FormData(form);
    
    try {
        const response = await fetch('/admin/settings', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin',
            headers: {
                'X-Settings-Type': type,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            showSuccessToast(`${type.charAt(0).toUpperCase() + type.slice(1)} settings saved successfully!`);
            
            // Clean URL parameters to prevent query string buildup
            cleanUrlParameters();
            
            // If brand settings were updated, reload the page to show new logo/name
            if (type === 'brand') {
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        } else {
            showErrorToast(data.message || 'Error saving settings');
        }
    } catch (error) {
        showErrorToast(`Error saving settings: ${error.message}`);
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Make functions immediately available globally
window.previewLogo = previewLogo;
window.validateForm = validateForm;
window.cleanUrlParameters = cleanUrlParameters;
window.handleFormSubmission = handleFormSubmission;

document.addEventListener('DOMContentLoaded', function() {
    // Clean URL parameters on page load
    cleanUrlParameters();
    
    // Color picker synchronization
    const colorPicker = document.getElementById('primary_color');
    const colorText = document.getElementById('primary_color_text');
    
    if (colorPicker && colorText) {
        colorPicker.addEventListener('input', function() {
            colorText.value = this.value;
        });
        
        colorText.addEventListener('input', function() {
            if (/^#[0-9A-F]{6}$/i.test(this.value)) {
                colorPicker.value = this.value;
            }
        });
    }
    
    // Logo file input event listener
    const logoInput = document.getElementById('logo');
    if (logoInput) {
        logoInput.addEventListener('change', function() {
            previewLogo(this);
        });
    }
    
    // Form submissions - prevent default and use AJAX
    const brandForm = document.getElementById('brandForm');
    const systemForm = document.getElementById('systemForm');
    const awsForm = document.getElementById('awsForm');
    const securityForm = document.getElementById('securityForm');
    const emailForm = document.getElementById('emailForm');
    
    if (brandForm) {
        brandForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Check if form is disabled (no permission)
            if (this.classList.contains('form-disabled')) {
                showErrorToast('You do not have permission to update settings');
                return false;
            }
            
            await handleFormSubmission(this, 'brand');
            return false;
        });
    }
    
    if (systemForm) {
        systemForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Check if form is disabled (no permission)
            if (this.classList.contains('form-disabled')) {
                showErrorToast('You do not have permission to update settings');
                return false;
            }
            
            await handleFormSubmission(this, 'system');
            return false;
        });
    }
    
    if (awsForm) {
        awsForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Check if form is disabled (no permission)
            if (this.classList.contains('form-disabled')) {
                showErrorToast('You do not have permission to update settings');
                return false;
            }
            
            await handleFormSubmission(this, 'aws');
            return false;
        });
    }
    
    if (securityForm) {
        securityForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Check if form is disabled (no permission)
            if (this.classList.contains('form-disabled')) {
                showErrorToast('You do not have permission to update settings');
                return false;
            }
            
            await handleFormSubmission(this, 'security');
            return false;
        });
    }
    
    if (emailForm) {
        emailForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Check if form is disabled (no permission)
            if (this.classList.contains('form-disabled')) {
                showErrorToast('You do not have permission to update settings');
                return false;
            }
            
            await handleFormSubmission(this, 'email');
            return false;
        });
    }
});
