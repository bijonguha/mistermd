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
            console.log('✅ Auth: Configuration loaded');
        } else {
            setTimeout(() => this.waitForConfig(), 100);
        }
    }

    // Initialize Google Identity Services
    async initialize() {
        console.log('🚀 Starting authentication initialization...');
        return new Promise((resolve, reject) => {
            // Wait for configuration and Google Identity Services to load
            if (!this.config || typeof google === 'undefined') {
                console.log('⏳ Waiting for configuration and Google Identity Services...');
                setTimeout(() => this.initialize().then(resolve).catch(reject), 500);
                return;
            }

            const clientId = this.config.get('google.clientId');
            const autoSelect = this.config.get('google.auth.autoSelect');
            const cancelOnTapOutside = this.config.get('google.auth.cancelOnTapOutside');

            console.log('✅ Google object found');
            console.log('🔧 Client ID:', clientId);
            console.log('🔧 Environment:', this.config.get('app.environment'));

            try {
                google.accounts.id.initialize({
                    client_id: clientId,
                    callback: (response) => this.handleCredentialResponse(response),
                    auto_select: autoSelect,
                    cancel_on_tap_outside: cancelOnTapOutside
                });

                this.isInitialized = true;
                console.log('✅ Google Identity Services initialized');
                
                // Check for existing session and update UI
                this.loadUserFromStorage();
                this.updateUI();
                
                resolve();
            } catch (error) {
                console.error('💥 Failed to initialize Google Identity Services:', error);
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

            console.log('User signed in:', user.name);
            
            // Track sign-in with Google Analytics
            if (typeof gtag === 'function') {
                gtag('event', 'login', {
                    method: 'Google',
                    user_id: user.id
                });
            }
        } catch (error) {
            console.error('Error handling credential response:', error);
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
            console.error('Error parsing JWT:', error);
            return null;
        }
    }

    // Show Google sign-in prompt
    signIn() {
        console.log('🔐 signIn() called');
        console.log('🔍 Auth initialized:', this.isInitialized);
        console.log('🌐 Google available:', typeof google !== 'undefined');
        
        if (!this.isInitialized) {
            console.error('❌ Auth not initialized');
            alert('Authentication not ready. Please refresh the page.');
            return;
        }

        if (typeof google === 'undefined' || typeof google.accounts === 'undefined') {
            console.error('❌ Google Identity Services not loaded');
            alert('Google services not loaded. Please refresh the page.');
            return;
        }

        console.log('✅ Attempting Google sign-in...');

        // Always clear auth container first
        const authContainer = document.getElementById('auth-container');
        if (authContainer) {
            authContainer.innerHTML = '';
            authContainer.style.display = 'none';
        }

        // Try to show the prompt
        try {
            google.accounts.id.prompt((notification) => {
                console.log('📱 Google prompt result:', notification);
                if (notification.isNotDisplayed()) {
                    console.log('🚫 Prompt blocked - showing fallback');
                    setTimeout(() => this.renderSignInButton(), 100);
                } else if (notification.isSkippedMoment()) {
                    console.log('👤 User dismissed prompt');
                } else {
                    console.log('✅ Prompt shown successfully');
                }
            });
        } catch (error) {
            console.error('💥 Error with Google prompt:', error);
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
                console.error('Error rendering Google button:', error);
            }
        }
    }

    // Sign out user
    signOut() {
        this.user = null;
        this.clearUserFromStorage();
        this.updateUI();
        this.triggerCallbacks('onSignOut');

        console.log('User signed out');
        
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
            console.error('Error saving user to storage:', error);
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
                    console.log('User loaded from storage:', user.name);
                } else {
                    console.log('Stored user token expired');
                    this.clearUserFromStorage();
                }
            }
        } catch (error) {
            console.error('Error loading user from storage:', error);
        }
    }

    // Clear user from localStorage
    clearUserFromStorage() {
        try {
            const storageKey = this.config.get('google.auth.storageKey', 'mistermd_user');
            localStorage.removeItem(storageKey);
        } catch (error) {
            console.error('Error clearing user from storage:', error);
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
                authButton.innerHTML = `
                    <img src="${this.user.picture}" alt="${this.user.name}" class="user-avatar">
                `;
                authButton.className = 'auth-button signed-in';
                authButton.onclick = () => this.toggleDropdown();
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
                console.error(`Error in ${event} callback:`, error);
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

console.log('Auth module loaded');