// Global Loader JavaScript Functions

class GlobalLoader {
    constructor() {
        this.loader = document.getElementById('globalLoader');
        this.fullScreenLoader = document.getElementById('fullScreenLoader');
        this.isVisible = false;
        this.progressInterval = null;
        this.minShowTime = 500; // Minimum time to show loader (ms)
        this.showTimeout = null;
    }

    // Show the main loader
    show(options = {}) {
        const {
            title = 'Loading...',
            message = 'Please wait while we process your request',
            showProgress = false,
            progress = 0,
            delay = 100 // Delay before showing (ms) - reduced to prevent flash
        } = options;

        // Clear any existing timeout
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
        }

        // Show immediately if already visible
        if (this.isVisible) {
            this.updateContent(options);
            return;
        }

        // Delay showing to prevent flash for quick operations
        this.showTimeout = setTimeout(() => {
            if (this.loader) {
                this.updateContent(options);

                // Show loader with smooth transition
                this.loader.classList.remove('pointer-events-none');
                this.loader.style.opacity = '0';
                this.loader.style.display = 'flex';
                
                // Force reflow
                this.loader.offsetHeight;
                
                // Animate in
                this.loader.style.opacity = '1';
                this.isVisible = true;
            }
        }, delay);
    }

    // Update loader content
    updateContent(options = {}) {
        const {
            title = 'Loading...',
            message = 'Please wait while we process your request',
            showProgress = false,
            progress = 0
        } = options;

        if (this.loader) {
            // Update content
            const titleEl = document.getElementById('loaderTitle');
            const messageEl = document.getElementById('loaderMessage');
            const progressContainer = document.getElementById('loaderProgress');

            if (titleEl) titleEl.textContent = title;
            if (messageEl) messageEl.textContent = message;

            // Handle progress
            if (showProgress) {
                if (progressContainer) progressContainer.classList.remove('hidden');
                this.updateProgress(progress);
            } else {
                if (progressContainer) progressContainer.classList.add('hidden');
            }
        }
    }

    // Show full screen loader
    showFullScreen(options = {}) {
        const {
            message = 'Loading your experience...',
            showProgress = true,
            progress = 0
        } = options;

        if (this.fullScreenLoader) {
            // Update content
            const messageEl = document.getElementById('fullScreenLoaderMessage');
            const progressBar = document.getElementById('fullScreenProgressBar');

            if (messageEl) messageEl.textContent = message;

            // Handle progress
            if (showProgress) {
                this.updateFullScreenProgress(progress);
            }

            // Show loader with smooth transition
            this.fullScreenLoader.classList.remove('pointer-events-none');
            this.fullScreenLoader.style.opacity = '0';
            this.fullScreenLoader.style.display = 'flex';
            
            // Force reflow
            this.fullScreenLoader.offsetHeight;
            
            // Animate in
            this.fullScreenLoader.style.opacity = '1';
            this.isVisible = true;
        }
    }

    // Hide loader
    hide() {
        // Clear any pending show timeout
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }

        if (this.loader && this.isVisible) {
            // Animate out
            this.loader.style.opacity = '0';
            
            // Hide after transition completes
            setTimeout(() => {
                this.loader.style.display = 'none';
                this.loader.classList.add('pointer-events-none');
            }, 300);
        }
        
        if (this.fullScreenLoader && this.isVisible) {
            // Animate out
            this.fullScreenLoader.style.opacity = '0';
            
            // Hide after transition completes
            setTimeout(() => {
                this.fullScreenLoader.style.display = 'none';
                this.fullScreenLoader.classList.add('pointer-events-none');
            }, 500);
        }
        
        this.isVisible = false;
        this.clearProgressInterval();
    }

    // Update progress for main loader
    updateProgress(progress) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        
        if (progressBar) {
            progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }
        if (progressText) {
            progressText.textContent = `${Math.min(100, Math.max(0, progress))}%`;
        }
    }

    // Update progress for full screen loader
    updateFullScreenProgress(progress) {
        const progressBar = document.getElementById('fullScreenProgressBar');
        
        if (progressBar) {
            progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }
    }

    // Animate progress from 0 to 100
    animateProgress(duration = 2000, callback = null) {
        let progress = 0;
        const increment = 100 / (duration / 50); // Update every 50ms

        this.progressInterval = setInterval(() => {
            progress += increment;
            if (progress >= 100) {
                progress = 100;
                this.clearProgressInterval();
                if (callback) callback();
            }
            this.updateProgress(progress);
            this.updateFullScreenProgress(progress);
        }, 50);
    }

    // Clear progress interval
    clearProgressInterval() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    // Show loader with auto-hide after delay
    showTemporary(options = {}) {
        const {
            duration = 2000,
            title = 'Processing...',
            message = 'Please wait',
            showProgress = true
        } = options;

        this.show({ title, message, showProgress });
        
        if (showProgress) {
            this.animateProgress(duration, () => {
                this.hide();
            });
        } else {
            setTimeout(() => {
                this.hide();
            }, duration);
        }
    }

    // Show loader for AJAX request
    showForAjax(options = {}) {
        const {
            title = 'Loading...',
            message = 'Fetching data from server'
        } = options;

        this.show({ title, message, showProgress: false, delay: 100 });
    }

    // Show loader for form submission
    showForForm(options = {}) {
        const {
            title = 'Submitting...',
            message = 'Please wait while we process your form'
        } = options;

        this.show({ title, message, showProgress: false });
    }

    // Show loader for file upload
    showForUpload(options = {}) {
        const {
            title = 'Uploading...',
            message = 'Please wait while we upload your file',
            showProgress = true
        } = options;

        this.show({ title, message, showProgress });
    }
}

// Create global instance
window.GlobalLoader = new GlobalLoader();

// COMPLETELY DISABLE LOADER - Override all methods to do nothing
window.GlobalLoader.show = function() { 
    console.log('Loader show() called but disabled');
    return; 
};
window.GlobalLoader.hide = function() { 
    console.log('Loader hide() called but disabled');
    return; 
};
window.GlobalLoader.showFullScreen = function() { 
    console.log('Loader showFullScreen() called but disabled');
    return; 
};
window.GlobalLoader.showTemporary = function() { 
    console.log('Loader showTemporary() called but disabled');
    return; 
};
window.GlobalLoader.showForAjax = function() { 
    console.log('Loader showForAjax() called but disabled');
    return; 
};
window.GlobalLoader.showForForm = function() { 
    console.log('Loader showForForm() called but disabled');
    return; 
};
window.GlobalLoader.showForUpload = function() { 
    console.log('Loader showForUpload() called but disabled');
    return; 
};

// Convenience functions - ALL DISABLED
window.showLoader = function() { 
    console.log('showLoader() called but disabled');
    return; 
};
window.hideLoader = function() { 
    console.log('hideLoader() called but disabled');
    return; 
};
window.showFullScreenLoader = function() { 
    console.log('showFullScreenLoader() called but disabled');
    return; 
};
window.showTemporaryLoader = function() { 
    console.log('showTemporaryLoader() called but disabled');
    return; 
};
window.showAjaxLoader = function() { 
    console.log('showAjaxLoader() called but disabled');
    return; 
};
window.showFormLoader = function() { 
    console.log('showFormLoader() called but disabled');
    return; 
};
window.showUploadLoader = function() { 
    console.log('showUploadLoader() called but disabled');
    return; 
};

// Auto-hide loader on page unload
window.addEventListener('beforeunload', () => {
    window.GlobalLoader.hide();
});

// Prevent loader from showing during normal page navigation
let isPageNavigating = false;

// Track page navigation
window.addEventListener('beforeunload', () => {
    isPageNavigating = true;
});

// Auto-hide loader on page load (only if not navigating)
document.addEventListener('DOMContentLoaded', () => {
    // Hide the initial page loader if it exists
    const initialLoader = document.getElementById('initialPageLoader');
    if (initialLoader) {
        // Add fade out animation
        initialLoader.style.transition = 'opacity 0.5s ease-out';
        initialLoader.style.opacity = '0';
        
        // Remove from DOM after animation
        setTimeout(() => {
            initialLoader.remove();
        }, 500);
    }
    
    // Force hide all loaders immediately on page load
    const globalLoader = document.getElementById('globalLoader');
    const fullScreenLoader = document.getElementById('fullScreenLoader');
    
    if (globalLoader) {
        globalLoader.style.display = 'none';
        globalLoader.style.opacity = '0';
        globalLoader.classList.add('pointer-events-none');
    }
    
    if (fullScreenLoader) {
        fullScreenLoader.style.display = 'none';
        fullScreenLoader.style.opacity = '0';
        fullScreenLoader.classList.add('pointer-events-none');
    }
    
    // Only hide if we're not in the middle of a navigation
    if (!isPageNavigating) {
        // Ensure loader is hidden on page load
        window.GlobalLoader.hide();
    }
    isPageNavigating = false;
});

// Add a small delay to prevent flash on page load
window.addEventListener('load', () => {
    // Final cleanup - ensure loader is hidden
    setTimeout(() => {
        window.GlobalLoader.hide();
    }, 100);
});

// Intercept form submissions to show loader
document.addEventListener('submit', function(event) {
    const form = event.target;
    
    // Skip if it's an AJAX form or has data-ajax attribute
    if (form.hasAttribute('data-ajax') || form.hasAttribute('data-no-loader')) {
        return;
    }
    
    // Show form loader
    window.GlobalLoader.showForForm({
        title: 'Submitting...',
        message: 'Please wait while we process your form'
    });
});

// Intercept link clicks for navigation - DISABLED to prevent loader flash
// document.addEventListener('click', function(event) {
//     const link = event.target.closest('a');
//     
//     if (link && link.href && !link.hasAttribute('data-no-loader')) {
//         // Check if it's an internal link
//         const currentDomain = window.location.origin;
//         const linkDomain = new URL(link.href).origin;
//         
//         if (linkDomain === currentDomain && !link.hasAttribute('target')) {
//             // Only show loader if explicitly requested with data-show-loader attribute
//             if (link.hasAttribute('data-show-loader')) {
//                 // Show navigation loader with longer delay to prevent flash
//                 window.GlobalLoader.show({
//                     title: 'Loading...',
//                     message: 'Please wait while we load the page',
//                     showProgress: false,
//                     delay: 500 // Increased delay to prevent flash for quick navigation
//                 });
//             }
//         }
//     }
// });
