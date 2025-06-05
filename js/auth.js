// Google Authentication Module for MisterMD
// Minimal implementation using Google Identity Services

class AuthManager {
    constructor() {
        this.user = null;
        this.isInitialized = false;
        this.config = null;
        this.callbacks = {
            onSignIn: [],
            onSignOut: []
        };
        
        // Wait for config to be available
        this.waitForConfig();
    }
    
    /**
     * Wait for configuration to be loaded
     */
    waitForConfig() {
        if (typeof window.appConfig !== 'undefined') {
            this.config = window.appConfig;
            if (window.log) {
                window.log.info('Configuration loaded', 'Auth');
            }
        } else {
            setTimeout(() => this.waitForConfig(), 100);
        }
    }

    // Initialize Google Identity Services
    async initialize() {
        if (window.log) {
            window.log.info('Starting authentication initialization', 'Auth');
        }
        return new Promise((resolve, reject) => {
            // Wait for configuration and Google Identity Services to load
            if (!this.config || typeof google === 'undefined') {
                if (window.log) {
                    window.log.debug('Waiting for configuration and Google Identity Services', 'Auth');
                }
                setTimeout(() => this.initialize().then(resolve).catch(reject), 500);
                return;
            }

            const clientId = this.config.get('google.clientId');
            const autoSelect = this.config.get('google.auth.autoSelect');
            const cancelOnTapOutside = this.config.get('google.auth.cancelOnTapOutside');

            if (window.log) {
                window.log.debug('Google Identity Services available', 'Auth');
                window.log.debug(`Environment: ${this.config.get('app.environment')}`, 'Auth');
            }

            try {
                google.accounts.id.initialize({
                    client_id: clientId,
                    callback: (response) => this.handleCredentialResponse(response),
                    auto_select: autoSelect,
                    cancel_on_tap_outside: cancelOnTapOutside
                });

                this.isInitialized = true;
                if (window.log) {
                    window.log.info('Google Identity Services initialized', 'Auth');
                }
                
                // Check for existing session and update UI
                this.loadUserFromStorage();
                this.updateUI();
                
                resolve();
            } catch (error) {
                if (window.log) {
                    window.log.error('Failed to initialize Google Identity Services', 'Auth', error);
                }
                reject(error);
            }
        });
    }

    // Handle credential response from Google
    handleCredentialResponse(response) {
        try {
            // Decode JWT token to get user info
            const payload = this.parseJWT(response.credential);
            const user = {
                id: payload.sub,
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                token: response.credential
            };

            this.user = user;
            this.saveUserToStorage(user);
            this.updateUI();
            this.triggerCallbacks('onSignIn', user);

            if (window.log) {
                window.log.info(`User signed in: ${user.name}`, 'Auth');
            }
            
            // Track sign-in with Google Analytics
            if (typeof gtag === 'function') {
                gtag('event', 'login', {
                    method: 'Google',
                    user_id: user.id
                });
            }
        } catch (error) {
            if (window.log) {
                window.log.error('Error handling credential response', 'Auth', error);
            }
        }
    }

    // Parse JWT token (simple implementation)
    parseJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            if (window.log) {
                window.log.error('Error parsing JWT', 'Auth', error);
            }
            return null;
        }
    }

    // Show Google sign-in prompt
    signIn() {
        if (window.log) {
            window.log.debug('signIn() called', 'Auth');
            window.log.debug(`Auth initialized: ${this.isInitialized}, Google available: ${typeof google !== 'undefined'}`, 'Auth');
        }
        
        if (!this.isInitialized) {
            if (window.log) {
                window.log.error('Authentication not initialized', 'Auth');
            }
            alert('Authentication not ready. Please refresh the page.');
            return;
        }

        if (typeof google === 'undefined' || typeof google.accounts === 'undefined') {
            if (window.log) {
                window.log.error('Google Identity Services not loaded', 'Auth');
            }
            alert('Google services not loaded. Please refresh the page.');
            return;
        }

        if (window.log) {
            window.log.debug('Attempting Google sign-in', 'Auth');
        }

        // Always clear auth container first
        const authContainer = document.getElementById('auth-container');
        if (authContainer) {
            authContainer.innerHTML = '';
            authContainer.style.display = 'none';
        }

        // Try to show the prompt
        try {
            google.accounts.id.prompt((notification) => {
                if (window.log) {
                    window.log.debug('Google prompt result received', 'Auth');
                }
                if (notification.isNotDisplayed()) {
                    if (window.log) {
                        window.log.debug('Prompt blocked - showing fallback', 'Auth');
                    }
                    setTimeout(() => this.renderSignInButton(), 100);
                } else if (notification.isSkippedMoment()) {
                    if (window.log) {
                        window.log.debug('User dismissed prompt', 'Auth');
                    }
                } else {
                    if (window.log) {
                        window.log.debug('Prompt shown successfully', 'Auth');
                    }
                }
            });
        } catch (error) {
            if (window.log) {
                window.log.error('Error with Google prompt', 'Auth', error);
            }
            setTimeout(() => this.renderSignInButton(), 100);
        }
    }

    // Render sign-in button as fallback
    renderSignInButton() {
        const authContainer = document.getElementById('auth-container');
        if (authContainer && !this.user) {
            try {
                authContainer.innerHTML = '';
                
                google.accounts.id.renderButton(
                    authContainer,
                    {
                        theme: 'outline',
                        size: 'medium',
                        text: 'signin_with',
                        width: 200
                    }
                );
                
                authContainer.style.display = 'block';
            } catch (error) {
                if (window.log) {
                    window.log.error('Error rendering Google button', 'Auth', error);
                }
            }
        }
    }

    // Sign out user
    signOut() {
        this.user = null;
        this.clearUserFromStorage();
        this.updateUI();
        this.triggerCallbacks('onSignOut');

        if (window.log) {
            window.log.info('User signed out', 'Auth');
        }
        
        // Track sign-out with Google Analytics
        if (typeof gtag === 'function') {
            gtag('event', 'logout', {
                method: 'Google'
            });
        }
    }

    // Save user to localStorage
    saveUserToStorage(user) {
        try {
            const userData = {
                ...user,
                timestamp: Date.now()
            };
            const storageKey = this.config.get('google.auth.storageKey', 'mistermd_user');
            localStorage.setItem(storageKey, JSON.stringify(userData));
        } catch (error) {
            if (window.log) {
                window.log.error('Error saving user to storage', 'Auth', error);
            }
        }
    }

    // Load user from localStorage
    loadUserFromStorage() {
        try {
            const storageKey = this.config.get('google.auth.storageKey', 'mistermd_user');
            const userData = localStorage.getItem(storageKey);
            if (userData) {
                const user = JSON.parse(userData);
                // Check if token is not too old
                const sessionTimeout = this.config.get('google.auth.sessionTimeout', 24 * 60 * 60 * 1000);
                const tokenAge = Date.now() - user.timestamp;
                if (tokenAge < sessionTimeout) {
                    this.user = user;
                    this.updateUI();
                    if (window.log) {
                        window.log.info(`User loaded from storage: ${user.name}`, 'Auth');
                    }
                } else {
                    if (window.log) {
                        window.log.debug('Stored user token expired', 'Auth');
                    }
                    this.clearUserFromStorage();
                }
            }
        } catch (error) {
            if (window.log) {
                window.log.error('Error loading user from storage', 'Auth', error);
            }
        }
    }

    // Clear user from localStorage
    clearUserFromStorage() {
        try {
            const storageKey = this.config.get('google.auth.storageKey', 'mistermd_user');
            localStorage.removeItem(storageKey);
        } catch (error) {
            if (window.log) {
                window.log.error('Error clearing user from storage', 'Auth', error);
            }
        }
    }

    // Update UI based on authentication state
    updateUI() {
        const authButton = document.getElementById('auth-button');
        const userInfo = document.getElementById('user-info');
        const authContainer = document.getElementById('auth-container');

        if (this.user) {
            // User is signed in - show only avatar in circular button
            if (authButton) {
                // Debug: Log the picture URL
                if (window.log) {
                    window.log.debug(`Profile picture URL: ${this.user.picture}`, 'Auth');
                }
                
                authButton.innerHTML = `
                    <img src="${this.user.picture}" alt="${this.user.name}" class="user-avatar">
                `;
                authButton.className = 'auth-button signed-in';
                authButton.onclick = () => this.toggleDropdown();
                
                // Add error handling after the element is created
                const avatarImg = authButton.querySelector('.user-avatar');
                if (avatarImg) {
                    avatarImg.onload = () => {
                        if (window.log) {
                            window.log.debug('Profile image loaded successfully', 'Auth');
                        }
                    };
                    avatarImg.onerror = () => {
                        if (window.log) {
                            window.log.warn('Profile image failed to load, showing fallback', 'Auth');
                        }
                        authButton.innerHTML = `
                            <div class="user-avatar-fallback">
                                <span class="user-initials">${this.getUserInitials(this.user.name)}</span>
                            </div>
                        `;
                        authButton.onclick = () => this.toggleDropdown();
                    };
                }
            }

            if (userInfo) {
                userInfo.innerHTML = `
                    <div class="user-dropdown">
                        <div class="user-details">
                            <img src="${this.user.picture}" alt="${this.user.name}" class="user-avatar-large">
                            <div class="user-text">
                                <div class="user-name-large">${this.user.name}</div>
                                <div class="user-email">${this.user.email}</div>
                            </div>
                        </div>
                        <hr class="dropdown-divider">
                        <button class="dropdown-item" onclick="authManager.signOut()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            Sign out
                        </button>
                    </div>
                `;
                
                // Add error handling for dropdown avatar
                const dropdownAvatar = userInfo.querySelector('.user-avatar-large');
                if (dropdownAvatar) {
                    dropdownAvatar.onerror = () => {
                        dropdownAvatar.style.display = 'none';
                        const userDetails = userInfo.querySelector('.user-details');
                        if (userDetails) {
                            const fallback = document.createElement('div');
                            fallback.className = 'user-avatar-large-fallback';
                            fallback.innerHTML = `<span class="user-initials-large">${this.getUserInitials(this.user.name)}</span>`;
                            userDetails.insertBefore(fallback, userDetails.querySelector('.user-text'));
                        }
                    };
                }
            }

            // Clear any Google button in auth container when signed in
            if (authContainer) {
                authContainer.innerHTML = '';
                authContainer.style.display = 'none';
            }
        } else {
            // User is not signed in
            if (authButton) {
                authButton.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                `;
                authButton.className = 'auth-button';
                authButton.onclick = () => this.signIn();
            }

            if (userInfo) {
                userInfo.innerHTML = '';
                userInfo.style.display = 'none';
            }

            // Clear auth container
            if (authContainer) {
                authContainer.innerHTML = '';
                authContainer.style.display = 'none';
            }
        }
    }

    // Toggle dropdown menu
    toggleDropdown() {
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.style.display = userInfo.style.display === 'block' ? 'none' : 'block';
        }
    }

    // Add event callbacks
    onSignIn(callback) {
        this.callbacks.onSignIn.push(callback);
    }

    onSignOut(callback) {
        this.callbacks.onSignOut.push(callback);
    }

    // Trigger callbacks
    triggerCallbacks(event, data) {
        this.callbacks[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                if (window.log) {
                    window.log.error(`Error in ${event} callback`, 'Auth', error);
                }
            }
        });
    }

    // Public API methods
    getCurrentUser() {
        return this.user;
    }

    isAuthenticated() {
        return this.user !== null;
    }

    getUserId() {
        return this.user ? this.user.id : null;
    }

    getUserEmail() {
        return this.user ? this.user.email : null;
    }

    getUserName() {
        return this.user ? this.user.name : null;
    }

    // Get user initials for avatar fallback
    getUserInitials(name) {
        if (!name) return '?';
        const names = name.split(' ');
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    }
}

// Create global instance
window.authManager = new AuthManager();

// Close dropdown and hide Google button when clicking outside
document.addEventListener('click', function(event) {
    const authButton = document.getElementById('auth-button');
    const userInfo = document.getElementById('user-info');
    const authContainer = document.getElementById('auth-container');
    const headerAuth = document.getElementById('auth-button')?.closest('.header-auth');
    
    // Close user dropdown if clicking outside
    if (authButton && userInfo && !authButton.contains(event.target) && !userInfo.contains(event.target)) {
        userInfo.style.display = 'none';
    }
    
    // Hide Google button if clicking outside auth area and user is not signed in
    if (headerAuth && authContainer && !headerAuth.contains(event.target) && window.authManager && !window.authManager.isAuthenticated()) {
        authContainer.innerHTML = '';
        authContainer.style.display = 'none';
    }
});

// Hide Google button when mouse leaves auth area
document.addEventListener('DOMContentLoaded', function() {
    const headerAuth = document.querySelector('.header-auth');
    if (headerAuth) {
        headerAuth.addEventListener('mouseleave', function() {
            const authContainer = document.getElementById('auth-container');
            if (authContainer && window.authManager && !window.authManager.isAuthenticated()) {
                // Small delay to allow for Google popup interaction
                setTimeout(() => {
                    if (authContainer && !authContainer.matches(':hover')) {
                        authContainer.innerHTML = '';
                        authContainer.style.display = 'none';
                    }
                }, 200);
            }
        });
    }
});

if (window.log) {
    window.log.debug('Auth module loaded', 'Auth');
}