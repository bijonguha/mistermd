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
        this.browserInfo = this.detectBrowser();
        
        // Wait for config to be available
        this.waitForConfig();
    }

    /**
     * Detect browser for Chrome-specific fixes
     */
    detectBrowser() {
        const userAgent = navigator.userAgent;
        const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
        const isEdge = /Edg/.test(userAgent);
        const isFirefox = /Firefox/.test(userAgent);
        const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
        
        return {
            isChrome,
            isEdge,
            isFirefox,
            isSafari,
            userAgent
        };
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
                // Chrome-specific configuration
                const initConfig = {
                    client_id: clientId,
                    callback: (response) => this.handleCredentialResponse(response),
                    auto_select: this.browserInfo.isChrome ? false : autoSelect, // Disable auto-select in Chrome
                    cancel_on_tap_outside: cancelOnTapOutside
                };

                // Add Chrome-specific settings
                if (this.browserInfo.isChrome) {
                    initConfig.use_fedcm_for_prompt = false; // Disable FedCM which can cause issues
                    initConfig.itp_support = true; // Enable Intelligent Tracking Prevention support
                }

                if (window.log) {
                    window.log.debug(`Browser detected: ${this.browserInfo.isChrome ? 'Chrome' : 'Other'}`, 'Auth');
                    window.log.debug('Auth config:', 'Auth', initConfig);
                }

                google.accounts.id.initialize(initConfig);

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

    // Show Google sign-in prompt with Chrome-specific handling
    signIn() {
        if (window.log) {
            window.log.debug('signIn() called', 'Auth');
            window.log.debug(`Auth initialized: ${this.isInitialized}, Google available: ${typeof google !== 'undefined'}`, 'Auth');
            window.log.debug(`Browser: ${this.browserInfo.isChrome ? 'Chrome' : 'Other'}`, 'Auth');
        }
        
        if (!this.isInitialized) {
            if (window.log) {
                window.log.error('Authentication not initialized', 'Auth');
            }
            this.showUserFriendlyError('Authentication not ready. Please refresh the page.');
            return;
        }

        if (typeof google === 'undefined' || typeof google.accounts === 'undefined') {
            if (window.log) {
                window.log.error('Google Identity Services not loaded', 'Auth');
            }
            this.showUserFriendlyError('Google services not loaded. Please refresh the page.');
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

        // Chrome-specific approach: Skip the prompt and go directly to button
        if (this.browserInfo.isChrome) {
            if (window.log) {
                window.log.debug('Chrome detected - using direct button approach', 'Auth');
            }
            setTimeout(() => this.renderSignInButton(), 50);
            return;
        }

        // For non-Chrome browsers, try the prompt first
        try {
            google.accounts.id.prompt((notification) => {
                if (window.log) {
                    window.log.debug('Google prompt result received', 'Auth');
                    window.log.debug('Notification details:', 'Auth', {
                        isNotDisplayed: notification.isNotDisplayed(),
                        isSkippedMoment: notification.isSkippedMoment(),
                        isDismissedMoment: notification.isDismissedMoment()
                    });
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
                } else if (notification.isDismissedMoment()) {
                    if (window.log) {
                        window.log.debug('User dismissed popup', 'Auth');
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

    /**
     * Show user-friendly error message
     */
    showUserFriendlyError(message) {
        if (this.browserInfo.isChrome) {
            // For Chrome, show more specific guidance
            const chromeMessage = message + '\n\nChrome users: Please make sure third-party cookies are enabled and popup blockers are disabled for this site.';
            alert(chromeMessage);
        } else {
            alert(message);
        }
    }

    // Render sign-in button with Chrome-specific handling
    renderSignInButton() {
        const authContainer = document.getElementById('auth-container');
        if (authContainer && !this.user) {
            try {
                authContainer.innerHTML = '';
                
                // Chrome-specific button configuration
                const buttonConfig = {
                    theme: 'outline',
                    size: 'medium',
                    text: 'signin_with',
                    width: 200
                };

                // Add Chrome-specific settings
                if (this.browserInfo.isChrome) {
                    buttonConfig.type = 'standard'; // Use standard type for better Chrome compatibility
                    buttonConfig.shape = 'rectangular';
                    buttonConfig.logo_alignment = 'left';
                }

                if (window.log) {
                    window.log.debug('Rendering Google sign-in button', 'Auth', buttonConfig);
                }
                
                google.accounts.id.renderButton(authContainer, buttonConfig);
                
                authContainer.style.display = 'block';

                // Add Chrome-specific event listeners
                if (this.browserInfo.isChrome) {
                    // Monitor for button click to provide better UX feedback
                    authContainer.addEventListener('click', () => {
                        if (window.log) {
                            window.log.debug('Google sign-in button clicked in Chrome', 'Auth');
                        }
                        // Show loading state or helpful message
                        this.showChromeSignInFeedback();
                    });
                }
                
            } catch (error) {
                if (window.log) {
                    window.log.error('Error rendering Google button', 'Auth', error);
                }
                // Fallback: Create a manual sign-in button
                this.createFallbackSignInButton(authContainer);
            }
        }
    }

    /**
     * Show Chrome-specific sign-in feedback
     */
    showChromeSignInFeedback() {
        if (this.browserInfo.isChrome) {
            // Create a temporary status message
            const authContainer = document.getElementById('auth-container');
            if (authContainer) {
                const statusDiv = document.createElement('div');
                statusDiv.style.cssText = `
                    position: absolute;
                    background: #333;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    top: 100%;
                    left: 0;
                    margin-top: 5px;
                    white-space: nowrap;
                    z-index: 1000;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                `;
                statusDiv.textContent = 'Opening Google sign-in...';
                authContainer.appendChild(statusDiv);
                
                // Remove after 3 seconds
                setTimeout(() => {
                    if (statusDiv.parentNode) {
                        statusDiv.parentNode.removeChild(statusDiv);
                    }
                }, 3000);
            }
        }
    }

    /**
     * Create fallback sign-in button if Google button fails
     */
    createFallbackSignInButton(container) {
        container.innerHTML = `
            <button class="google-signin-fallback" onclick="window.authManager.handleFallbackSignIn()">
                <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
            </button>
        `;
        
        container.style.display = 'block';
    }

    /**
     * Handle fallback sign-in when Google button fails
     */
    handleFallbackSignIn() {
        if (window.log) {
            window.log.debug('Fallback sign-in initiated', 'Auth');
        }
        
        // Open Google OAuth in a new window
        const clientId = this.config.get('google.clientId');
        const redirectUri = encodeURIComponent(window.location.origin);
        const scope = encodeURIComponent('openid email profile');
        
        const googleAuthUrl = `https://accounts.google.com/oauth/v2/auth?` +
            `client_id=${clientId}&` +
            `redirect_uri=${redirectUri}&` +
            `scope=${scope}&` +
            `response_type=code&` +
            `access_type=offline`;
            
        // Open in popup
        const popup = window.open(
            googleAuthUrl,
            'google-signin',
            'width=500,height=600,scrollbars=yes,resizable=yes'
        );
        
        if (!popup) {
            alert('Popup was blocked. Please allow popups for this site and try again.');
            return;
        }
        
        // Monitor popup
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed);
                if (window.log) {
                    window.log.debug('Sign-in popup closed', 'Auth');
                }
            }
        }, 1000);
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