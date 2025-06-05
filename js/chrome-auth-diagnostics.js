/**
 * Chrome Authentication Diagnostics
 * Helps diagnose Chrome-specific authentication issues
 */

class ChromeAuthDiagnostics {
    constructor() {
        this.isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        this.diagnostics = [];
    }

    /**
     * Run comprehensive Chrome authentication diagnostics
     */
    async runDiagnostics() {
        console.group('🔍 Chrome Authentication Diagnostics');
        
        this.diagnostics = [];
        
        // 1. Browser Detection
        this.checkBrowserCompatibility();
        
        // 2. Third-party Cookies
        this.checkThirdPartyCookies();
        
        // 3. Popup Blockers
        this.checkPopupBlockers();
        
        // 4. HTTPS/Security
        this.checkSecurityContext();
        
        // 5. Google Services Loading
        this.checkGoogleServicesLoading();
        
        // 6. Console Errors
        this.checkConsoleErrors();
        
        // 7. Local Storage
        this.checkLocalStorage();
        
        // Generate report
        this.generateReport();
        
        console.groupEnd();
        
        return this.diagnostics;
    }

    checkBrowserCompatibility() {
        const result = {
            test: 'Browser Compatibility',
            status: 'info',
            message: '',
            details: {}
        };

        result.details = {
            userAgent: navigator.userAgent,
            isChrome: this.isChrome,
            chromeVersion: this.getChromeVersion(),
            cookiesEnabled: navigator.cookieEnabled,
            javascriptEnabled: true
        };

        if (this.isChrome) {
            const version = this.getChromeVersion();
            if (version && version >= 80) {
                result.status = 'success';
                result.message = `Chrome ${version} - Compatible`;
            } else {
                result.status = 'warning';
                result.message = `Chrome ${version} - May have compatibility issues`;
            }
        } else {
            result.status = 'info';
            result.message = 'Not Chrome - Should work fine';
        }

        this.diagnostics.push(result);
        console.log(`✓ ${result.test}: ${result.message}`);
    }

    checkThirdPartyCookies() {
        const result = {
            test: 'Third-party Cookies',
            status: 'unknown',
            message: 'Checking third-party cookie support...',
            details: {}
        };

        try {
            // Try to detect third-party cookie blocking
            const testCookie = 'test_3p_cookie=1; SameSite=None; Secure';
            
            // In Chrome, third-party cookies are often blocked
            if (this.isChrome) {
                result.status = 'warning';
                result.message = 'Chrome may block third-party cookies - This can affect Google authentication';
                result.details.solution = 'Enable third-party cookies for accounts.google.com';
            } else {
                result.status = 'success';
                result.message = 'Non-Chrome browser - Third-party cookies likely work';
            }
        } catch (error) {
            result.status = 'error';
            result.message = 'Cannot test third-party cookies';
            result.details.error = error.message;
        }

        this.diagnostics.push(result);
        console.log(`${result.status === 'success' ? '✓' : '⚠'} ${result.test}: ${result.message}`);
    }

    checkPopupBlockers() {
        const result = {
            test: 'Popup Blockers',
            status: 'unknown',
            message: 'Testing popup functionality...',
            details: {}
        };

        try {
            // Test if popups are blocked
            const testPopup = window.open('', 'test', 'width=1,height=1');
            
            if (testPopup) {
                testPopup.close();
                result.status = 'success';
                result.message = 'Popups are allowed';
            } else {
                result.status = 'error';
                result.message = 'Popups are blocked - This will prevent Google authentication';
                result.details.solution = 'Allow popups for this site in browser settings';
            }
        } catch (error) {
            result.status = 'error';
            result.message = 'Cannot test popup functionality';
            result.details.error = error.message;
        }

        this.diagnostics.push(result);
        console.log(`${result.status === 'success' ? '✓' : '❌'} ${result.test}: ${result.message}`);
    }

    checkSecurityContext() {
        const result = {
            test: 'Security Context',
            status: 'info',
            message: '',
            details: {}
        };

        const isHTTPS = window.location.protocol === 'https:';
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        result.details = {
            protocol: window.location.protocol,
            hostname: window.location.hostname,
            isHTTPS,
            isLocalhost,
            origin: window.location.origin
        };

        if (isHTTPS || isLocalhost) {
            result.status = 'success';
            result.message = 'Secure context - Good for authentication';
        } else {
            result.status = 'error';
            result.message = 'Insecure context - Google authentication may fail';
            result.details.solution = 'Use HTTPS or localhost for development';
        }

        this.diagnostics.push(result);
        console.log(`${result.status === 'success' ? '✓' : '❌'} ${result.test}: ${result.message}`);
    }

    checkGoogleServicesLoading() {
        const result = {
            test: 'Google Identity Services',
            status: 'unknown',
            message: 'Checking Google services...',
            details: {}
        };

        result.details = {
            googleDefined: typeof google !== 'undefined',
            accountsDefined: typeof google !== 'undefined' && typeof google.accounts !== 'undefined',
            idDefined: typeof google !== 'undefined' && typeof google.accounts !== 'undefined' && typeof google.accounts.id !== 'undefined'
        };

        if (result.details.idDefined) {
            result.status = 'success';
            result.message = 'Google Identity Services loaded successfully';
        } else if (result.details.googleDefined) {
            result.status = 'warning';
            result.message = 'Google object exists but Identity Services not fully loaded';
        } else {
            result.status = 'error';
            result.message = 'Google Identity Services not loaded';
            result.details.solution = 'Check network connectivity and script loading';
        }

        this.diagnostics.push(result);
        console.log(`${result.status === 'success' ? '✓' : '❌'} ${result.test}: ${result.message}`);
    }

    checkConsoleErrors() {
        const result = {
            test: 'Console Errors',
            status: 'info',
            message: 'Check browser console for authentication-related errors',
            details: {
                commonErrors: [
                    'third-party cookie',
                    'cross-origin',
                    'popup blocked',
                    'fedcm',
                    'accounts.google.com'
                ]
            }
        };

        this.diagnostics.push(result);
        console.log(`ℹ ${result.test}: ${result.message}`);
    }

    checkLocalStorage() {
        const result = {
            test: 'Local Storage',
            status: 'unknown',
            message: 'Testing local storage functionality...',
            details: {}
        };

        try {
            const testKey = 'test_ls_' + Date.now();
            localStorage.setItem(testKey, 'test');
            const retrieved = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);

            if (retrieved === 'test') {
                result.status = 'success';
                result.message = 'Local storage working correctly';
            } else {
                result.status = 'error';
                result.message = 'Local storage not working properly';
            }
        } catch (error) {
            result.status = 'error';
            result.message = 'Local storage blocked or unavailable';
            result.details.error = error.message;
        }

        this.diagnostics.push(result);
        console.log(`${result.status === 'success' ? '✓' : '❌'} ${result.test}: ${result.message}`);
    }

    getChromeVersion() {
        if (!this.isChrome) return null;
        
        const match = navigator.userAgent.match(/Chrome\/(\d+)/);
        return match ? parseInt(match[1]) : null;
    }

    generateReport() {
        console.log('\n📊 DIAGNOSTIC SUMMARY:');
        
        const errors = this.diagnostics.filter(d => d.status === 'error');
        const warnings = this.diagnostics.filter(d => d.status === 'warning');
        const success = this.diagnostics.filter(d => d.status === 'success');

        console.log(`✅ Passed: ${success.length}`);
        console.log(`⚠️  Warnings: ${warnings.length}`);
        console.log(`❌ Errors: ${errors.length}`);

        if (errors.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES:');
            errors.forEach(error => {
                console.log(`❌ ${error.test}: ${error.message}`);
                if (error.details.solution) {
                    console.log(`   💡 Solution: ${error.details.solution}`);
                }
            });
        }

        if (warnings.length > 0) {
            console.log('\n⚠️  POTENTIAL ISSUES:');
            warnings.forEach(warning => {
                console.log(`⚠️  ${warning.test}: ${warning.message}`);
                if (warning.details.solution) {
                    console.log(`   💡 Solution: ${warning.details.solution}`);
                }
            });
        }

        // Chrome-specific recommendations
        if (this.isChrome) {
            console.log('\n🔧 CHROME-SPECIFIC RECOMMENDATIONS:');
            console.log('1. Enable third-party cookies: Settings → Privacy → Cookies → Allow all cookies');
            console.log('2. Disable popup blocker for this site: Address bar → Site settings → Popups');
            console.log('3. Clear browser cache and cookies if issues persist');
            console.log('4. Try incognito mode to test without extensions');
        }
    }

    /**
     * Get user-friendly solutions for common issues
     */
    getSolutions() {
        const solutions = [];
        
        this.diagnostics.forEach(diagnostic => {
            if (diagnostic.status === 'error' || diagnostic.status === 'warning') {
                if (diagnostic.details.solution) {
                    solutions.push({
                        problem: diagnostic.message,
                        solution: diagnostic.details.solution
                    });
                }
            }
        });

        return solutions;
    }
}

// Make it globally available
window.ChromeAuthDiagnostics = ChromeAuthDiagnostics;

// Convenience function
window.diagnoseAuth = async () => {
    const diagnostics = new ChromeAuthDiagnostics();
    return await diagnostics.runDiagnostics();
};

console.log('🔧 Chrome Auth Diagnostics loaded. Run diagnoseAuth() to check for issues.');