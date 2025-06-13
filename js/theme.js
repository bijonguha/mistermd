/**
 * MisterMD Theme Management System
 * Handles light/dark theme switching with persistence and system preference detection
 */

class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.config = null;
        this.themeToggle = null;
        this.isInitialized = false;
        
        // Wait for configuration to be available
        this.waitForConfig();
    }

    /**
     * Wait for configuration to be loaded
     */
    waitForConfig() {
        if (typeof window.appConfig !== 'undefined') {
            this.config = window.appConfig;
            this.initialize();
        } else {
            setTimeout(() => this.waitForConfig(), 100);
        }
    }

    /**
     * Initialize theme management system
     */
    initialize() {
        if (this.isInitialized) return;
        
        if (window.log) {
            window.log.info('Initializing theme management system', 'Theme');
        }

        // Get theme toggle element
        this.themeToggle = document.getElementById('theme-toggle');
        
        if (!this.themeToggle) {
            if (window.log) {
                window.log.error('Theme toggle element not found', 'Theme');
            }
            return;
        }

        // Determine initial theme
        this.currentTheme = this.getInitialTheme();
        
        // Apply initial theme
        this.applyTheme(this.currentTheme, false);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update mermaid theme if available
        this.updateMermaidTheme();
        
        // Update highlight.js theme
        this.updateHighlightTheme();
        
        this.isInitialized = true;
        
        if (window.log) {
            window.log.info(`Theme system initialized with theme: ${this.currentTheme}`, 'Theme');
        }
    }

    /**
     * Determine the initial theme based on stored preference or system preference
     */
    getInitialTheme() {
        // Check for stored preference
        const storageKey = this.config.get('ui.themes.storageKey', 'mistermd_theme');
        const storedTheme = localStorage.getItem(storageKey);
        
        if (storedTheme && this.config.get('ui.themes.available', []).includes(storedTheme)) {
            if (window.log) {
                window.log.debug(`Using stored theme: ${storedTheme}`, 'Theme');
            }
            return storedTheme;
        }
        
        // Check system preference if enabled
        if (this.config.get('ui.themes.systemPreference', true)) {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            const systemTheme = prefersDark ? 'dark' : 'light';
            
            if (window.log) {
                window.log.debug(`Using system preference: ${systemTheme}`, 'Theme');
            }
            return systemTheme;
        }
        
        // Fallback to default theme
        const defaultTheme = this.config.get('ui.themes.default', 'light');
        if (window.log) {
            window.log.debug(`Using default theme: ${defaultTheme}`, 'Theme');
        }
        return defaultTheme;
    }

    /**
     * Apply theme to the document
     */
    applyTheme(theme, animate = true) {
        const body = document.body;
        const html = document.documentElement;
        
        if (animate) {
            // Add transition class for smooth animation
            body.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                body.style.transition = '';
            }, 300);
        }
        
        // Set data-theme attribute
        html.setAttribute('data-theme', theme);
        
        // Update toggle UI
        this.updateToggleUI(theme);
        
        // Update mermaid theme to match current theme
        this.updateMermaidTheme();
        
        // Update highlight.js theme
        this.updateHighlightTheme();
        
        // Store theme preference
        this.saveTheme(theme);
        
        // Update current theme
        this.currentTheme = theme;
        
        if (window.log) {
            window.log.debug(`Applied theme: ${theme}`, 'Theme');
        }
        
        // Track theme change with analytics
        if (typeof gtag === 'function') {
            gtag('event', 'theme_change', {
                theme: theme,
                source: 'user_toggle'
            });
        }
    }

    /**
     * Update the theme toggle UI
     */
    updateToggleUI(theme) {
        if (!this.themeToggle) return;
        
        const icon = this.themeToggle.querySelector('.theme-toggle-icon');
        
        if (theme === 'dark') {
            if (icon) icon.textContent = '☀️';
            this.themeToggle.title = 'Switch to light theme';
        } else {
            if (icon) icon.textContent = '🌙';
            this.themeToggle.title = 'Switch to dark theme';
        }
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        
        if (window.log) {
            window.log.info(`Theme toggled to: ${newTheme}`, 'Theme');
        }
    }

    /**
     * Set specific theme
     */
    setTheme(theme) {
        const availableThemes = this.config.get('ui.themes.available', ['light', 'dark']);
        
        if (!availableThemes.includes(theme)) {
            if (window.log) {
                window.log.warn(`Invalid theme: ${theme}. Available themes: ${availableThemes.join(', ')}`, 'Theme');
            }
            return false;
        }
        
        this.applyTheme(theme);
        return true;
    }

    /**
     * Save theme to localStorage
     */
    saveTheme(theme) {
        try {
            const storageKey = this.config.get('ui.themes.storageKey', 'mistermd_theme');
            localStorage.setItem(storageKey, theme);
        } catch (error) {
            if (window.log) {
                window.log.error('Failed to save theme to localStorage', 'Theme', error);
            }
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Theme toggle click
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        // Listen for system theme changes
        if (window.matchMedia && this.config.get('ui.themes.systemPreference', true)) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                // Only auto-switch if no user preference is stored
                const storageKey = this.config.get('ui.themes.storageKey', 'mistermd_theme');
                const storedTheme = localStorage.getItem(storageKey);
                
                if (!storedTheme) {
                    const systemTheme = e.matches ? 'dark' : 'light';
                    if (window.log) {
                        window.log.debug(`System theme changed to: ${systemTheme}`, 'Theme');
                    }
                    this.applyTheme(systemTheme);
                }
            });
        }
        
        // Keyboard shortcut (Ctrl/Cmd + Shift + T)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    /**
     * Update mermaid theme to match current theme
     */
    updateMermaidTheme() {
        if (typeof mermaid !== 'undefined') {
            const mermaidTheme = this.currentTheme === 'dark' ? 'dark' : 'default';
            
            try {
                mermaid.initialize({
                    theme: mermaidTheme,
                    securityLevel: 'loose',
                    startOnLoad: false
                });
                
                if (window.log) {
                    window.log.debug(`Updated mermaid theme to: ${mermaidTheme}`, 'Theme');
                }
            } catch (error) {
                if (window.log) {
                    window.log.warn('Failed to update mermaid theme', 'Theme', error);
                }
            }
        }
    }

    /**
     * Update highlight.js theme to match current theme
     */
    updateHighlightTheme() {
        const lightTheme = document.getElementById('hljs-light');
        const darkTheme = document.getElementById('hljs-dark');
        
        if (lightTheme && darkTheme) {
            if (this.currentTheme === 'dark') {
                lightTheme.disabled = true;
                darkTheme.disabled = false;
            } else {
                lightTheme.disabled = false;
                darkTheme.disabled = true;
            }
            
            if (window.log) {
                window.log.debug(`Updated highlight.js theme for: ${this.currentTheme}`, 'Theme');
            }
        }
    }

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Check if dark theme is active
     */
    isDarkTheme() {
        return this.currentTheme === 'dark';
    }

    /**
     * Check if light theme is active
     */
    isLightTheme() {
        return this.currentTheme === 'light';
    }

    /**
     * Get available themes
     */
    getAvailableThemes() {
        return this.config ? this.config.get('ui.themes.available', ['light', 'dark']) : ['light', 'dark'];
    }

    /**
     * Reset theme to system preference or default
     */
    resetTheme() {
        // Clear stored preference
        const storageKey = this.config.get('ui.themes.storageKey', 'mistermd_theme');
        localStorage.removeItem(storageKey);
        
        // Reapply initial theme
        const initialTheme = this.getInitialTheme();
        this.applyTheme(initialTheme);
        
        if (window.log) {
            window.log.info(`Theme reset to: ${initialTheme}`, 'Theme');
        }
    }

    /**
     * Export theme configuration
     */
    exportThemeConfig() {
        return {
            currentTheme: this.currentTheme,
            availableThemes: this.getAvailableThemes(),
            isDarkMode: this.isDarkTheme(),
            hasSystemPreference: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
            isFeatureEnabled: this.config ? this.config.isFeatureEnabled('darkMode') : false
        };
    }
}

// Create global theme manager instance
window.themeManager = new ThemeManager();

// Convenient global functions
window.toggleTheme = () => window.themeManager.toggleTheme();
window.setTheme = (theme) => window.themeManager.setTheme(theme);
window.getCurrentTheme = () => window.themeManager.getCurrentTheme();
window.resetTheme = () => window.themeManager.resetTheme();

// Debug function
window.debugTheme = () => {
    if (window.log) {
        window.log.group('Theme Debug Information', 'Theme');
        window.log.info('Theme Manager Status:', 'Theme', window.themeManager.exportThemeConfig());
        window.log.info('Current CSS variables:', 'Theme', {
            primaryColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color'),
            textColor: getComputedStyle(document.documentElement).getPropertyValue('--text-color'),
            bgColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-color'),
            cardBg: getComputedStyle(document.documentElement).getPropertyValue('--card-bg')
        });
        window.log.groupEnd();
    }
};

if (window.log) {
    window.log.debug('Theme management module loaded', 'Theme');
}