/**
 * MisterMD Configuration System
 * Centralized configuration for all application settings
 */

class AppConfig {
    constructor() {
        this.config = {
            // Application metadata
            app: {
                name: 'MisterMD',
                version: '1.0.0',
                description: 'Enhanced Markdown and Mermaid Viewer',
                environment: this.detectEnvironment()
            },

            // Google Services Configuration
            google: {
                // OAuth Client ID
                clientId: '416699519304-7n5488jfl10dv2sjjdonmc7sbf09vobn.apps.googleusercontent.com',
                
                // Google Analytics
                analytics: {
                    trackingId: 'G-VKVMPPBDQL',
                    enabled: true,
                    debug: false
                },

                // Authentication settings
                auth: {
                    autoSelect: false,
                    cancelOnTapOutside: true,
                    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
                    storageKey: 'mistermd_user'
                }
            },

            // Export Configuration
            export: {
                png: {
                    quality: 0.9, // Reduced from 1.0 for better compatibility with large files
                    scale: 2, // Reduced from 3 to prevent canvas memory issues
                    backgroundColor: '#ffffff',
                    maxCanvasSize: 16384, // Reduced from 32767 to prevent browser crashes
                    maxMemoryUsage: 256 * 1024 * 1024, // 256MB limit for canvas operations
                    useCORS: true,
                    allowTaint: true,
                    chunkSize: 2048, // For tiled rendering of very large content
                    fallbackFormat: 'jpeg', // Format to use when PNG fails
                    fallbackQuality: 0.7 // Quality for fallback format
                },
                pdf: {
                    quality: 0.95,
                    scale: 2,
                    format: 'a4',
                    orientation: 'portrait',
                    backgroundColor: '#ffffff',
                    compress: true,
                    margin: {
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0
                    }
                },
                // Advanced export settings
                advanced: {
                    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
                    timeout: 60000, // 60 seconds
                    retryAttempts: 3,
                    chunkSize: 4096,
                    chunkDelay: 100
                }
            },

            // UI Configuration
            ui: {
                loading: {
                    defaultText: 'Processing...',
                    renderText: 'Rendering markdown...',
                    exportText: 'Generating export...'
                },
                themes: {
                    default: 'light',
                    available: ['light', 'dark']
                },
                animation: {
                    duration: 300,
                    easing: 'ease-in-out'
                }
            },

            // Markdown Configuration
            markdown: {
                options: {
                    breaks: true,
                    gfm: true,
                    headerIds: true,
                    mangle: false
                },
                mermaid: {
                    theme: 'default',
                    securityLevel: 'loose',
                    startOnLoad: false,
                    flowchart: {
                        useMaxWidth: true,
                        htmlLabels: true,
                        curve: 'basis'
                    },
                    sequence: {
                        diagramMarginX: 50,
                        diagramMarginY: 10,
                        actorMargin: 50,
                        width: 150,
                        height: 65,
                        boxMargin: 10,
                        boxTextMargin: 5,
                        noteMargin: 10,
                        messageMargin: 35
                    },
                    gantt: {
                        titleTopMargin: 25,
                        barHeight: 20,
                        fontFamily: '"Inter", sans-serif',
                        fontSize: 11,
                        gridLineStartPadding: 35,
                        bottomPadding: 25,
                        leftPadding: 75,
                        rightPadding: 35
                    }
                }
            },

            // File handling
            files: {
                allowedTypes: ['.md', '.markdown', '.txt'],
                maxSize: 10 * 1024 * 1024, // 10MB
                encoding: 'utf-8'
            },

            // Analytics Configuration
            analytics: {
                enabled: true,
                trackErrors: true,
                trackPerformance: true,
                trackUserBehavior: true,
                sessionTimeout: 30 * 60 * 1000, // 30 minutes
                batchSize: 10,
                flushInterval: 5000 // 5 seconds
            },

            // Development settings
            development: {
                debug: false, // Set to true only in development
                verbose: false,
                mockAuth: false,
                skipAnalytics: false
            },

            // Logging configuration
            logging: {
                level: 'info', // error, warn, info, debug, trace
                enableConsole: true,
                enableStorage: true,
                maxStoredLogs: 100,
                enableAnalytics: true, // Send errors to analytics
                production: {
                    level: 'warn',
                    enableConsole: false, // Disable most console logs in production
                    silentStart: true // Minimal startup messages
                }
            },

            // Feature flags
            features: {
                advancedExport: true,
                progressUI: true,
                autoSave: false,
                darkMode: false,
                collaborativeEditing: false
            },

            // Security settings
            security: {
                validateFileTypes: true,
                sanitizeInput: true,
                csrfProtection: false,
                contentSecurityPolicy: false
            },

            // Performance settings
            performance: {
                renderDelay: 100,
                debounceDelay: 300,
                lazyLoading: true,
                cacheEnabled: true,
                compressionEnabled: true
            }
        };

        // Validate configuration
        this.validateConfig();
    }

    /**
     * Detect the current environment
     */
    detectEnvironment() {
        // Check for URL parameter override
        const urlParams = new URLSearchParams(window.location.search);
        const envParam = urlParams.get('env');
        if (envParam && ['development', 'staging', 'production'].includes(envParam)) {
            return envParam;
        }
        
        // Check for localStorage override (persistent)
        const storedEnv = localStorage.getItem('mistermd_env');
        if (storedEnv && ['development', 'staging', 'production'].includes(storedEnv)) {
            return storedEnv;
        }
        
        // Automatic detection based on hostname
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('local')) {
            return 'development';
        } else if (hostname.includes('staging') || hostname.includes('test')) {
            return 'staging';
        } else {
            return 'production';
        }
    }

    /**
     * Get configuration value by path
     * @param {string} path - Dot notation path (e.g., 'google.auth.clientId')
     * @param {any} defaultValue - Default value if path not found
     */
    get(path, defaultValue = null) {
        return this.getNestedValue(this.config, path, defaultValue);
    }

    /**
     * Set configuration value by path
     * @param {string} path - Dot notation path
     * @param {any} value - Value to set
     */
    set(path, value) {
        this.setNestedValue(this.config, path, value);
    }

    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path, defaultValue) {
        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current === null || current === undefined || !current.hasOwnProperty(key)) {
                return defaultValue;
            }
            current = current[key];
        }

        return current;
    }

    /**
     * Set nested value in object using dot notation
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = value;
    }

    /**
     * Validate configuration
     */
    validateConfig() {
        const errors = [];

        // Validate Google Client ID
        if (!this.get('google.clientId')) {
            errors.push('Google Client ID is required');
        }

        // Validate Analytics Tracking ID
        if (this.get('analytics.enabled') && !this.get('google.analytics.trackingId')) {
            errors.push('Google Analytics Tracking ID is required when analytics is enabled');
        }

        // Validate export settings
        const pngQuality = this.get('export.png.quality');
        if (pngQuality < 0 || pngQuality > 1) {
            errors.push('PNG quality must be between 0 and 1');
        }

        const pdfQuality = this.get('export.pdf.quality');
        if (pdfQuality < 0 || pdfQuality > 1) {
            errors.push('PDF quality must be between 0 and 1');
        }

        // Validate file size limits
        const maxFileSize = this.get('files.maxSize');
        if (maxFileSize <= 0) {
            errors.push('Maximum file size must be greater than 0');
        }

        if (errors.length > 0) {
            console.error('Configuration validation errors:', errors);
            throw new Error('Invalid configuration: ' + errors.join(', '));
        }

        console.log('✅ Configuration validated successfully');
    }

    /**
     * Get environment-specific configuration
     */
    getEnvironmentConfig() {
        const env = this.get('app.environment');
        const baseConfig = { ...this.config };

        // Apply environment-specific overrides
        switch (env) {
            case 'development':
                baseConfig.development.debug = true;
                baseConfig.development.verbose = true;
                baseConfig.google.analytics.debug = true;
                break;
            case 'staging':
                baseConfig.development.debug = true;
                baseConfig.google.analytics.debug = false;
                break;
            case 'production':
                baseConfig.development.debug = false;
                baseConfig.development.verbose = false;
                baseConfig.google.analytics.debug = false;
                break;
        }

        return baseConfig;
    }

    /**
     * Check if feature is enabled
     */
    isFeatureEnabled(featureName) {
        return this.get(`features.${featureName}`, false);
    }

    /**
     * Get all configuration
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * Reset configuration to defaults
     */
    reset() {
        this.config = this.getEnvironmentConfig();
    }

    /**
     * Export configuration as JSON
     */
    export() {
        return JSON.stringify(this.config, null, 2);
    }

    /**
     * Import configuration from JSON
     */
    import(configJson) {
        try {
            const importedConfig = JSON.parse(configJson);
            this.config = { ...this.config, ...importedConfig };
            this.validateConfig();
        } catch (error) {
            console.error('Failed to import configuration:', error);
            throw new Error('Invalid configuration JSON');
        }
    }

    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            environment: this.get('app.environment'),
            version: this.get('app.version'),
            features: this.get('features'),
            debug: this.get('development.debug'),
            logging: {
                level: this.get('logging.level'),
                console: this.get('logging.enableConsole')
            },
            analytics: {
                enabled: this.get('analytics.enabled'),
                trackingId: this.get('google.analytics.trackingId')
            }
        };
    }

    /**
     * Set environment (with persistence)
     */
    setEnvironment(env) {
        if (!['development', 'staging', 'production'].includes(env)) {
            throw new Error('Invalid environment. Must be: development, staging, or production');
        }
        
        // Store in localStorage for persistence
        localStorage.setItem('mistermd_env', env);
        
        // Update config
        this.set('app.environment', env);
        
        // Apply environment-specific settings
        this.applyEnvironmentSettings(env);
        
        console.log(`Environment changed to: ${env}`);
        console.log('Reload the page to apply all changes.');
    }

    /**
     * Set debug mode
     */
    setDebugMode(enabled) {
        this.set('development.debug', enabled);
        
        if (window.logger) {
            window.logger.logLevel = enabled ? 'debug' : 'info';
        }
        
        console.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set log level
     */
    setLogLevel(level) {
        const validLevels = ['error', 'warn', 'info', 'debug', 'trace'];
        if (!validLevels.includes(level)) {
            throw new Error(`Invalid log level. Must be one of: ${validLevels.join(', ')}`);
        }
        
        this.set('logging.level', level);
        
        if (window.logger) {
            window.logger.logLevel = level;
        }
        
        console.log(`Log level set to: ${level}`);
    }

    /**
     * Apply environment-specific settings
     */
    applyEnvironmentSettings(env) {
        switch (env) {
            case 'development':
                this.set('development.debug', true);
                this.set('logging.level', 'debug');
                this.set('logging.enableConsole', true);
                break;
            case 'staging':
                this.set('development.debug', true);
                this.set('logging.level', 'info');
                this.set('logging.enableConsole', true);
                break;
            case 'production':
                this.set('development.debug', false);
                this.set('logging.level', 'warn');
                this.set('logging.enableConsole', false);
                break;
        }
    }
}

// Create global configuration instance
window.appConfig = new AppConfig();

// Export for ES6 modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
}

// Convenient global functions for runtime configuration
window.setEnvironment = (env) => window.appConfig.setEnvironment(env);
window.setDebugMode = (enabled) => window.appConfig.setDebugMode(enabled);
window.setLogLevel = (level) => window.appConfig.setLogLevel(level);
window.getEnvironment = () => window.appConfig.get('app.environment');
window.getLogLevel = () => window.appConfig.get('logging.level');

// Help system
window.showLoggingHelp = () => {
    console.clear();
    console.log('%c🚀 MisterMD Logging System - Quick Reference', 'font-size: 16px; font-weight: bold; color: #4A76C4;');
    console.log('');
    
    console.log('%c📊 Current Status', 'font-weight: bold; color: #059669;');
    console.log(`Environment: ${window.getEnvironment()}`);
    console.log(`Log Level: ${window.getLogLevel()}`);
    console.log(`Debug Mode: ${window.appConfig.get('development.debug')}`);
    console.log('');
    
    console.log('%c🎯 Change Environment', 'font-weight: bold; color: #DC2626;');
    console.log('setEnvironment("development")  // Full debug mode');
    console.log('setEnvironment("staging")      // Testing mode');
    console.log('setEnvironment("production")   // Minimal logging');
    console.log('');
    
    console.log('%c📈 Change Log Level', 'font-weight: bold; color: #7C2D12;');
    console.log('setLogLevel("error")    // Only errors');
    console.log('setLogLevel("warn")     // Errors + warnings');
    console.log('setLogLevel("info")     // Errors + warnings + info');
    console.log('setLogLevel("debug")    // Everything except trace');
    console.log('setLogLevel("trace")    // Everything');
    console.log('');
    
    console.log('%c🔧 Debug Commands', 'font-weight: bold; color: #7C3AED;');
    console.log('setDebugMode(true)      // Enable debug output');
    console.log('debugMisterMD()         // Full application debug');
    console.log('debugRenderer()         // Renderer-specific debug');
    console.log('showLoggingHelp()       // Show this help');
    console.log('');
    
    console.log('%c🚨 Quick Fixes', 'font-weight: bold; color: #EA580C;');
    console.log('// No logs showing?');
    console.log('setLogLevel("debug"); setDebugMode(true);');
    console.log('');
    console.log('// Too many logs?');
    console.log('setLogLevel("warn"); setEnvironment("production");');
    console.log('');
    console.log('// Need full debug?');
    console.log('setEnvironment("development"); debugMisterMD();');
    console.log('');
    
    console.log('%c💡 Pro Tips', 'font-style: italic; color: #6B7280;');
    console.log('• All changes persist across page reloads');
    console.log('• Use URL parameter ?env=development for temporary testing');
    console.log('• Production mode automatically reports errors to analytics');
    console.log('• See LOGGING.md for complete documentation');
};

// Alias for convenience
window.logHelp = window.showLoggingHelp;

console.log('🔧 Application configuration loaded');

// Show current environment info
const env = window.appConfig.get('app.environment');
const version = window.appConfig.get('app.version');

if (env === 'production') {
    console.log(`MisterMD v${version} - Production`);
} else {
    console.log(`🚀 MisterMD v${version} - ${env.toUpperCase()}`);
    console.log('📊 Debug Info:', window.appConfig.getDebugInfo());
    console.log('💡 Runtime commands available:');
    console.log('  - setEnvironment("development|staging|production")');
    console.log('  - setDebugMode(true|false)');
    console.log('  - setLogLevel("error|warn|info|debug|trace")');
    console.log('  - debugMisterMD() for full debug info');
    console.log('  - showLoggingHelp() or logHelp() for quick reference');
}