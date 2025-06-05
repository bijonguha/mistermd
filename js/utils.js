/**
 * Utility functions for MisterMD
 * Helper functions and debugging tools
 */

// Configuration validator and debugging utilities
class ConfigValidator {
    constructor() {
        this.config = window.appConfig;
    }

    /**
     * Run comprehensive configuration validation
     */
    validateConfiguration() {
        console.group('🔧 Configuration Validation');
        
        try {
            // Check if config is loaded
            if (!this.config) {
                console.error('❌ Configuration not loaded');
                return false;
            }
            
            console.log('✅ Configuration object loaded');
            
            // Validate Google services
            this.validateGoogleServices();
            
            // Validate export settings
            this.validateExportSettings();
            
            // Validate file settings
            this.validateFileSettings();
            
            // Validate features
            this.validateFeatures();
            
            console.log('✅ All configuration validations passed');
            return true;
            
        } catch (error) {
            console.error('❌ Configuration validation failed:', error);
            return false;
        } finally {
            console.groupEnd();
        }
    }

    validateGoogleServices() {
        const clientId = this.config.get('google.clientId');
        const trackingId = this.config.get('google.analytics.trackingId');
        
        if (!clientId || clientId.length < 10) {
            throw new Error('Invalid Google Client ID');
        }
        
        if (!trackingId || !trackingId.startsWith('G-')) {
            throw new Error('Invalid Google Analytics Tracking ID');
        }
        
        console.log('✅ Google services configuration valid');
    }

    validateExportSettings() {
        const pngQuality = this.config.get('export.png.quality');
        const pdfQuality = this.config.get('export.pdf.quality');
        const pngScale = this.config.get('export.png.scale');
        
        if (pngQuality < 0 || pngQuality > 1) {
            throw new Error('PNG quality must be between 0 and 1');
        }
        
        if (pdfQuality < 0 || pdfQuality > 1) {
            throw new Error('PDF quality must be between 0 and 1');
        }
        
        if (pngScale < 1 || pngScale > 5) {
            console.warn('⚠️ PNG scale outside recommended range (1-5)');
        }
        
        console.log('✅ Export settings valid');
    }

    validateFileSettings() {
        const allowedTypes = this.config.get('files.allowedTypes');
        const maxSize = this.config.get('files.maxSize');
        
        if (!Array.isArray(allowedTypes) || allowedTypes.length === 0) {
            throw new Error('File allowed types must be a non-empty array');
        }
        
        if (maxSize <= 0) {
            throw new Error('Maximum file size must be greater than 0');
        }
        
        console.log('✅ File settings valid');
    }

    validateFeatures() {
        const features = this.config.get('features');
        
        if (typeof features !== 'object') {
            throw new Error('Features must be an object');
        }
        
        console.log('✅ Feature flags valid');
    }

    /**
     * Get system information for debugging
     */
    getSystemInfo() {
        return {
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            location: {
                hostname: window.location.hostname,
                pathname: window.location.pathname
            },
            config: {
                environment: this.config?.get('app.environment'),
                version: this.config?.get('app.version'),
                debug: this.config?.get('development.debug')
            },
            dependencies: {
                marked: typeof marked !== 'undefined',
                mermaid: typeof mermaid !== 'undefined',
                hljs: typeof hljs !== 'undefined',
                html2canvas: typeof html2canvas !== 'undefined',
                jsPDF: typeof window.jspdf !== 'undefined',
                google: typeof google !== 'undefined',
                gtag: typeof gtag !== 'undefined'
            }
        };
    }

    /**
     * Log system information
     */
    logSystemInfo() {
        console.group('🖥️ System Information');
        const info = this.getSystemInfo();
        
        console.log('Environment:', info.config.environment);
        console.log('Version:', info.config.version);
        console.log('Debug Mode:', info.config.debug);
        console.log('Viewport:', `${info.viewport.width}x${info.viewport.height}`);
        console.log('Location:', info.location.hostname + info.location.pathname);
        
        console.group('📦 Dependencies');
        Object.entries(info.dependencies).forEach(([name, available]) => {
            console.log(`${available ? '✅' : '❌'} ${name}`);
        });
        console.groupEnd();
        
        console.groupEnd();
    }
}

// Performance monitoring utilities
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            renderTimes: [],
            exportTimes: [],
            loadTimes: []
        };
    }

    /**
     * Start timing an operation
     */
    startTimer(operationName) {
        const start = performance.now();
        return {
            end: () => {
                const duration = performance.now() - start;
                this.recordMetric(operationName, duration);
                return duration;
            }
        };
    }

    recordMetric(operation, duration) {
        if (!this.metrics[operation]) {
            this.metrics[operation] = [];
        }
        this.metrics[operation].push(duration);
        
        // Keep only last 100 measurements
        if (this.metrics[operation].length > 100) {
            this.metrics[operation].shift();
        }
    }

    getAverageTime(operation) {
        const times = this.metrics[operation] || [];
        if (times.length === 0) return 0;
        
        const sum = times.reduce((a, b) => a + b, 0);
        return sum / times.length;
    }

    getPerformanceReport() {
        const report = {};
        
        Object.keys(this.metrics).forEach(operation => {
            const times = this.metrics[operation];
            if (times.length > 0) {
                report[operation] = {
                    count: times.length,
                    average: Math.round(this.getAverageTime(operation)),
                    min: Math.round(Math.min(...times)),
                    max: Math.round(Math.max(...times))
                };
            }
        });
        
        return report;
    }

    logPerformanceReport() {
        console.group('⚡ Performance Report');
        const report = this.getPerformanceReport();
        
        Object.entries(report).forEach(([operation, stats]) => {
            console.log(`${operation}:`, 
                `${stats.count} operations, ` +
                `avg: ${stats.average}ms, ` +
                `min: ${stats.min}ms, ` +
                `max: ${stats.max}ms`
            );
        });
        
        console.groupEnd();
    }
}

// Error tracking and reporting
class ErrorTracker {
    constructor() {
        this.errors = [];
        this.setupErrorHandling();
    }

    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            this.recordError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack,
                timestamp: new Date().toISOString()
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.recordError({
                type: 'promise',
                message: event.reason?.message || 'Unhandled promise rejection',
                stack: event.reason?.stack,
                timestamp: new Date().toISOString()
            });
        });
    }

    recordError(errorInfo) {
        this.errors.push(errorInfo);
        
        // Keep only last 50 errors
        if (this.errors.length > 50) {
            this.errors.shift();
        }
        
        // Log error in development
        if (window.appConfig?.get('development.debug')) {
            console.error('🐛 Error recorded:', errorInfo);
        }
    }

    getErrorReport() {
        return {
            totalErrors: this.errors.length,
            recentErrors: this.errors.slice(-10),
            errorTypes: this.errors.reduce((acc, error) => {
                acc[error.type] = (acc[error.type] || 0) + 1;
                return acc;
            }, {})
        };
    }

    logErrorReport() {
        console.group('🐛 Error Report');
        const report = this.getErrorReport();
        
        console.log('Total errors:', report.totalErrors);
        console.log('Error types:', report.errorTypes);
        
        if (report.recentErrors.length > 0) {
            console.group('Recent errors:');
            report.recentErrors.forEach(error => {
                console.log(`[${error.type}] ${error.message}`);
            });
            console.groupEnd();
        }
        
        console.groupEnd();
    }
}

// Create global utility instances
window.configValidator = new ConfigValidator();
window.performanceMonitor = new PerformanceMonitor();
window.errorTracker = new ErrorTracker();

// Utility functions
window.debugMisterMD = function() {
    const isProduction = window.appConfig?.get('app.environment') === 'production';
    
    if (isProduction) {
        console.log('MisterMD Debug (Production Mode - Limited Output)');
        console.log('Environment:', window.appConfig?.get('app.environment'));
        console.log('Version:', window.appConfig?.get('app.version'));
        
        // Only show errors in production
        const errorReport = window.errorTracker.getErrorReport();
        if (errorReport.totalErrors > 0) {
            console.warn('Total errors:', errorReport.totalErrors);
            console.warn('Recent errors:', errorReport.recentErrors.slice(-3));
        }
        return;
    }
    
    // Full debug in development
    console.clear();
    console.log('🚀 MisterMD Debug Information');
    console.log('=====================================');
    
    window.configValidator.logSystemInfo();
    window.configValidator.validateConfiguration();
    window.performanceMonitor.logPerformanceReport();
    window.errorTracker.logErrorReport();
    
    console.log('=====================================');
    console.log('💡 Tip: Call debugMisterMD() anytime for debug info');
};

// Auto-run validation in development
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.appConfig?.get('development.debug')) {
            window.configValidator.validateConfiguration();
        }
    }, 1000);
});

if (window.log && window.appConfig?.get('development.debug')) {
    window.log.debug('Utilities loaded. Call debugMisterMD() for debug information.', 'Utils');
}