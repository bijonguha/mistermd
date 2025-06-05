/**
 * Production-grade logging system for MisterMD
 * Environment-aware logging with proper log levels
 */

class Logger {
    constructor() {
        this.config = null;
        this.logLevel = 'info'; // default
        this.isProduction = false;
        this.logs = [];
        this.maxLogs = 100; // Keep last 100 logs in memory
        
        this.LOG_LEVELS = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            trace: 4
        };
        
        this.waitForConfig();
    }

    waitForConfig() {
        if (typeof window.appConfig !== 'undefined') {
            this.config = window.appConfig;
            this.isProduction = this.config.get('app.environment') === 'production';
            this.logLevel = this.isProduction ? 'warn' : 'debug';
            
            // In production, only show errors and warnings
            if (this.isProduction) {
                this.setupProductionLogging();
            }
        } else {
            setTimeout(() => this.waitForConfig(), 100);
        }
    }

    setupProductionLogging() {
        // Override console methods in production to reduce noise
        const originalConsole = {
            log: console.log,
            info: console.info,
            debug: console.debug,
            trace: console.trace
        };

        // Silence non-critical logs in production
        console.log = this.isDebugEnabled() ? originalConsole.log : () => {};
        console.info = this.isDebugEnabled() ? originalConsole.info : () => {};
        console.debug = () => {}; // Always silence debug in production
        console.trace = () => {}; // Always silence trace in production
        
        // Keep errors and warnings
        // console.error and console.warn remain unchanged
    }

    shouldLog(level) {
        const levelValue = this.LOG_LEVELS[level] || 2;
        const currentLevelValue = this.LOG_LEVELS[this.logLevel] || 2;
        return levelValue <= currentLevelValue;
    }

    isDebugEnabled() {
        return this.config?.get('development.debug', false) && !this.isProduction;
    }

    formatMessage(level, module, message, data = null) {
        const timestamp = new Date().toISOString();
        const prefix = this.isProduction ? '' : `[${timestamp}] `;
        const modulePrefix = module ? `[${module}] ` : '';
        
        return {
            formatted: `${prefix}${modulePrefix}${message}`,
            raw: { timestamp, level, module, message, data }
        };
    }

    storeLog(logEntry) {
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    }

    error(message, module = null, data = null) {
        const formatted = this.formatMessage('error', module, message, data);
        this.storeLog(formatted.raw);
        
        if (data) {
            console.error(formatted.formatted, data);
        } else {
            console.error(formatted.formatted);
        }
        
        // Send critical errors to analytics in production
        if (this.isProduction && typeof gtag === 'function') {
            gtag('event', 'exception', {
                description: message,
                fatal: false
            });
        }
    }

    warn(message, module = null, data = null) {
        if (!this.shouldLog('warn')) return;
        
        const formatted = this.formatMessage('warn', module, message, data);
        this.storeLog(formatted.raw);
        
        if (data) {
            console.warn(formatted.formatted, data);
        } else {
            console.warn(formatted.formatted);
        }
    }

    info(message, module = null, data = null) {
        if (!this.shouldLog('info')) return;
        
        const formatted = this.formatMessage('info', module, message, data);
        this.storeLog(formatted.raw);
        
        if (this.isDebugEnabled()) {
            if (data) {
                console.info(formatted.formatted, data);
            } else {
                console.info(formatted.formatted);
            }
        }
    }

    debug(message, module = null, data = null) {
        if (!this.shouldLog('debug')) return;
        
        const formatted = this.formatMessage('debug', module, message, data);
        this.storeLog(formatted.raw);
        
        if (this.isDebugEnabled()) {
            if (data) {
                console.debug(formatted.formatted, data);
            } else {
                console.debug(formatted.formatted);
            }
        }
    }

    trace(message, module = null, data = null) {
        if (!this.shouldLog('trace')) return;
        
        const formatted = this.formatMessage('trace', module, message, data);
        this.storeLog(formatted.raw);
        
        if (this.isDebugEnabled()) {
            if (data) {
                console.trace(formatted.formatted, data);
            } else {
                console.trace(formatted.formatted);
            }
        }
    }

    // Grouped logging for related operations
    group(title, module = null) {
        if (this.isDebugEnabled()) {
            const formatted = this.formatMessage('debug', module, title);
            console.group(formatted.formatted);
        }
    }

    groupEnd() {
        if (this.isDebugEnabled()) {
            console.groupEnd();
        }
    }

    // Performance timing
    time(label) {
        if (this.isDebugEnabled()) {
            console.time(label);
        }
    }

    timeEnd(label) {
        if (this.isDebugEnabled()) {
            console.timeEnd(label);
        }
    }

    // Get recent logs for debugging
    getRecentLogs(count = 10) {
        return this.logs.slice(-count);
    }

    // Clear stored logs
    clearLogs() {
        this.logs = [];
    }

    // Export logs for debugging
    exportLogs() {
        return {
            timestamp: new Date().toISOString(),
            environment: this.config?.get('app.environment'),
            logLevel: this.logLevel,
            logs: this.logs
        };
    }

    // Initialize module - called once when logger is ready
    initialize() {
        if (this.isProduction) {
            // Silent initialization in production
            this.info('Logger initialized in production mode', 'Logger');
        } else {
            this.info('Logger initialized in development mode', 'Logger');
            this.debug('Debug logging enabled', 'Logger');
        }
    }
}

// Create global logger instance
window.logger = new Logger();

// Convenience methods for common use cases
window.log = {
    error: (msg, module, data) => window.logger.error(msg, module, data),
    warn: (msg, module, data) => window.logger.warn(msg, module, data),
    info: (msg, module, data) => window.logger.info(msg, module, data),
    debug: (msg, module, data) => window.logger.debug(msg, module, data),
    trace: (msg, module, data) => window.logger.trace(msg, module, data),
    group: (title, module) => window.logger.group(title, module),
    groupEnd: () => window.logger.groupEnd(),
    time: (label) => window.logger.time(label),
    timeEnd: (label) => window.logger.timeEnd(label)
};

// Initialize logger when config is ready
setTimeout(() => {
    if (window.logger.config) {
        window.logger.initialize();
    }
}, 500);

// Production-friendly startup message
if (typeof window.appConfig !== 'undefined') {
    const env = window.appConfig.get('app.environment');
    const version = window.appConfig.get('app.version');
    
    if (env === 'production') {
        console.log(`MisterMD v${version} - Production`);
    } else {
        console.log(`🚀 MisterMD v${version} - ${env.toUpperCase()} mode`);
        console.log('💡 Call debugMisterMD() for debug information');
    }
}