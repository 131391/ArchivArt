(function() {
    
    const fileInput = document.getElementById('profilePictureInput');
    const uploadButton = document.getElementById('uploadProfilePicture');
    const removeButton = document.getElementById('removeProfilePicture');
    const progressContainer = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const currentProfileImage = document.getElementById('currentProfileImage');
    const headerProfileImage = document.getElementById('profileImage');
    
    let selectedFile = null;

    if (!fileInput || !uploadButton || !removeButton || !currentProfileImage || !headerProfileImage) {
        return;
    }
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                showModal('Error', 'Please select a valid image file (JPEG, PNG, or WebP).', 'error');
                fileInput.value = ''; // Clear the input
                return;
            }

            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                showModal('Error', 'File size must be less than 5MB.', 'error');
                fileInput.value = ''; // Clear the input
                return;
            }

            selectedFile = file;
            uploadButton.disabled = false;
            removeButton.classList.remove('hidden');

            // Show preview by updating current profile image temporarily
            const reader = new FileReader();
            reader.onload = function(e) {
                // Update the current profile image temporarily for preview
                currentProfileImage.src = e.target.result;
            };
            reader.onerror = function(error) {
                showModal('Error', 'Failed to read the selected file.', 'error');
            };
            reader.readAsDataURL(file);
        } else {
            // No file selected
            selectedFile = null;
            uploadButton.disabled = true;
            removeButton.classList.add('hidden');
        }
    });

    uploadButton.addEventListener('click', async function() {
        if (!selectedFile) return;

        uploadButton.disabled = true;
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = 'Preparing upload...';

        try {
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('profile_picture', selectedFile);
            
            progressBar.style.width = '30%';
            progressText.textContent = 'Uploading to cloud storage...';

            
            // Upload to server using proper file upload endpoint
            const response = await fetch('/admin/profile/picture', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin' // Include session cookies
            });


            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                progressBar.style.width = '100%';
                progressText.textContent = 'Upload complete!';
                
                // Update profile images
                currentProfileImage.src = result.user.profile_picture;
                headerProfileImage.src = result.user.profile_picture;
                
                // Update header and sidebar profile pictures globally
                updateGlobalProfilePictures(result.user.profile_picture);
                
                showModal('Success', 'Profile picture updated successfully!', 'success');
                
                // Reset form
                resetForm();
                
                setTimeout(() => {
                    progressContainer.classList.add('hidden');
                    progressBar.style.width = '0%';
                }, 2000);
            } else {
                throw new Error(result.message || 'Failed to upload profile picture');
            }
        } catch (error) {
            showModal('Error', error.message || 'Failed to upload profile picture. Please try again.', 'error');
            uploadButton.disabled = false;
            progressContainer.classList.add('hidden');
        }
    });

    // Remove button functionality
    removeButton.addEventListener('click', function() {
        if (typeof showConfirmModal === 'function') {
            showConfirmModal(
                'Are you sure you want to remove the selected image?',
                'Confirm Remove',
                function() {
                    resetForm();
                }
            );
        } else {
            // Fallback to browser confirm if showConfirmModal is not available
            if (confirm('Are you sure you want to remove the selected image?')) {
                resetForm();
            }
        }
    });

    // Function to update header profile picture globally
    function updateGlobalProfilePictures(profilePictureUrl) {
        // Update header profile picture
        const headerProfileImg = document.querySelector('#user-menu-button img');
        if (headerProfileImg) {
            headerProfileImg.src = profilePictureUrl;
            headerProfileImg.classList.add('object-cover');
        }
        
    }

    // Function to reset the form
    function resetForm() {
        fileInput.value = '';
        selectedFile = null;
        uploadButton.disabled = true;
        removeButton.classList.add('hidden');
        
        // Reset current profile image to original (if available)
        const originalSrc = currentProfileImage.dataset.originalSrc || 'https://ui-avatars.com/api/?name=Test%20User1&background=6366f1&color=ffffff&size=80&bold=true';
        currentProfileImage.src = originalSrc;
    }

    function showModal(title, message, type) {
        // Create modal HTML
        const modalHtml = `
            <div id="customModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
                    <div class="flex items-center mb-4">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center mr-4 ${type === 'success' ? 'bg-green-100' : 'bg-red-100'}">
                            <i class="fas ${type === 'success' ? 'fa-check text-green-600' : 'fa-exclamation-triangle text-red-600'}"></i>
                        </div>
                        <h3 class="text-lg font-semibold text-gray-900">${title}</h3>
                    </div>
                    <p class="text-gray-600 mb-6">${message}</p>
                    <div class="flex justify-end">
                        <button onclick="closeModal()" class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('customModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    window.closeModal = function() {
        const modal = document.getElementById('customModal');
        if (modal) {
            modal.remove();
        }
    };
})(); // End of IIFE

// Password toggle functionality
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const icon = field.nextElementSibling.querySelector('i');
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        field.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}
