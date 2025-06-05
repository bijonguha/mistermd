/**
 * SEO Analytics Module
 * Tracks user interactions for SEO insights without changing UI
 */

class SEOAnalytics {
    constructor() {
        this.events = [];
        this.sessionStart = Date.now();
        this.pageLoadTime = null;
        this.userAgent = navigator.userAgent;
        this.referrer = document.referrer;
        this.init();
    }

    init() {
        // Track page load performance
        this.trackPageLoad();
        
        // Track user engagement
        this.trackUserEngagement();
        
        // Track feature usage
        this.trackFeatureUsage();
        
        // Track search engine visibility signals
        this.trackSEOSignals();
    }

    trackPageLoad() {
        window.addEventListener('load', () => {
            this.pageLoadTime = Date.now() - this.sessionStart;
            
            // Track Core Web Vitals for SEO
            if ('web-vital' in window) {
                // Track LCP, FID, CLS if available
                this.trackWebVitals();
            }
            
            // Send page load event to Google Analytics
            if (typeof gtag === 'function') {
                gtag('event', 'page_load_complete', {
                    custom_parameter_load_time: this.pageLoadTime,
                    custom_parameter_referrer: this.referrer
                });
            }
        });
    }

    trackUserEngagement() {
        let scrollDepth = 0;
        let timeOnPage = 0;
        let interactionCount = 0;

        // Track scroll depth
        window.addEventListener('scroll', () => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
            );
            if (scrollPercent > scrollDepth) {
                scrollDepth = scrollPercent;
                
                // Track scroll milestones
                if (scrollDepth >= 25 && scrollDepth < 50) {
                    this.trackEvent('scroll_depth', '25_percent');
                } else if (scrollDepth >= 50 && scrollDepth < 75) {
                    this.trackEvent('scroll_depth', '50_percent');
                } else if (scrollDepth >= 75) {
                    this.trackEvent('scroll_depth', '75_percent');
                }
            }
        });

        // Track time on page
        setInterval(() => {
            timeOnPage += 15; // Track every 15 seconds
            if (timeOnPage % 60 === 0) { // Send every minute
                this.trackEvent('time_on_page', timeOnPage + '_seconds');
            }
        }, 15000);

        // Track interactions
        ['click', 'keydown', 'touchstart'].forEach(eventType => {
            document.addEventListener(eventType, () => {
                interactionCount++;
                if (interactionCount === 1) {
                    this.trackEvent('first_interaction', eventType);
                }
            });
        });
    }

    trackFeatureUsage() {
        // Track markdown rendering
        const originalRenderFunction = window.renderMarkdown;
        if (originalRenderFunction) {
            window.renderMarkdown = (...args) => {
                this.trackEvent('feature_usage', 'markdown_render');
                return originalRenderFunction.apply(this, args);
            };
        }

        // Track file uploads
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', () => {
                this.trackEvent('feature_usage', 'file_upload');
            });
        }

        // Track example loads
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const exampleType = e.target.id.replace('example-', '');
                this.trackEvent('feature_usage', `example_${exampleType}`);
            });
        });

        // Track export usage
        const pdfBtn = document.getElementById('download-pdf-btn');
        const pngBtn = document.getElementById('download-png-btn');
        
        if (pdfBtn) {
            pdfBtn.addEventListener('click', () => {
                this.trackEvent('feature_usage', 'export_pdf');
            });
        }
        
        if (pngBtn) {
            pngBtn.addEventListener('click', () => {
                this.trackEvent('feature_usage', 'export_png');
            });
        }
    }

    trackSEOSignals() {
        // Track bounce rate signals
        let hasEngaged = false;
        
        // User engagement indicators
        const engagementEvents = ['scroll', 'click', 'keydown', 'touchstart'];
        engagementEvents.forEach(event => {
            document.addEventListener(event, () => {
                if (!hasEngaged) {
                    hasEngaged = true;
                    this.trackEvent('seo_signal', 'user_engaged');
                }
            }, { once: true });
        });

        // Track if user stays more than 30 seconds
        setTimeout(() => {
            if (hasEngaged) {
                this.trackEvent('seo_signal', 'quality_visit');
            }
        }, 30000);

        // Track search engine traffic
        if (this.referrer) {
            const searchEngines = ['google', 'bing', 'yahoo', 'duckduckgo'];
            const isFromSearch = searchEngines.some(engine => 
                this.referrer.toLowerCase().includes(engine)
            );
            
            if (isFromSearch) {
                this.trackEvent('traffic_source', 'search_engine');
            }
        }

        // Track direct traffic (potential for branded searches)
        if (!this.referrer) {
            this.trackEvent('traffic_source', 'direct');
        }
    }

    trackWebVitals() {
        // Core Web Vitals tracking for SEO
        if ('performance' in window && 'getEntriesByType' in performance) {
            // Track Largest Contentful Paint (LCP)
            new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                this.trackEvent('web_vital', 'lcp', Math.round(lastEntry.startTime));
            }).observe({entryTypes: ['largest-contentful-paint']});

            // Track First Input Delay (FID)
            new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                entries.forEach(entry => {
                    this.trackEvent('web_vital', 'fid', Math.round(entry.processingStart - entry.startTime));
                });
            }).observe({entryTypes: ['first-input']});

            // Track Cumulative Layout Shift (CLS)
            let clsValue = 0;
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
                this.trackEvent('web_vital', 'cls', Math.round(clsValue * 1000));
            }).observe({entryTypes: ['layout-shift']});
        }
    }

    trackEvent(category, action, value = null) {
        const event = {
            category,
            action,
            value,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: this.userAgent
        };

        this.events.push(event);

        // Send to Google Analytics if available
        if (typeof gtag === 'function') {
            const eventData = {
                event_category: category,
                event_label: action
            };
            
            if (value !== null) {
                eventData.value = value;
            }
            
            gtag('event', action, eventData);
        }

        // Log for debugging in development
        if (window.appConfig?.get('development.debug')) {
            console.log('SEO Analytics Event:', event);
        }
    }

    // Generate SEO performance report
    generateSEOReport() {
        const report = {
            sessionDuration: Date.now() - this.sessionStart,
            pageLoadTime: this.pageLoadTime,
            totalEvents: this.events.length,
            featureUsage: this.events.filter(e => e.category === 'feature_usage'),
            seoSignals: this.events.filter(e => e.category === 'seo_signal'),
            trafficSource: this.events.find(e => e.category === 'traffic_source'),
            webVitals: this.events.filter(e => e.category === 'web_vital'),
            userAgent: this.userAgent,
            referrer: this.referrer
        };

        return report;
    }

    // Send SEO data to analytics (called on page unload)
    sendSEOData() {
        const report = this.generateSEOReport();
        
        if (typeof gtag === 'function') {
            gtag('event', 'seo_session_end', {
                custom_parameter_session_duration: report.sessionDuration,
                custom_parameter_events_count: report.totalEvents,
                custom_parameter_features_used: report.featureUsage.length
            });
        }
    }
}

// Initialize SEO Analytics
document.addEventListener('DOMContentLoaded', () => {
    window.seoAnalytics = new SEOAnalytics();
    
    // Send data before page unload
    window.addEventListener('beforeunload', () => {
        if (window.seoAnalytics) {
            window.seoAnalytics.sendSEOData();
        }
    });
});

// Export for debugging
window.getSEOReport = () => {
    return window.seoAnalytics ? window.seoAnalytics.generateSEOReport() : null;
};