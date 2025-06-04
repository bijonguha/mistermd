/**
 * Google Analytics tracking functions for MisterMD
 * Enhanced with configuration support
 */

// Configuration-aware analytics class
class Analytics {
    constructor() {
        this.config = null;
        this.isEnabled = true;
        this.waitForConfig();
    }
    
    waitForConfig() {
        if (typeof window.appConfig !== 'undefined') {
            this.config = window.appConfig;
            this.isEnabled = this.config.get('analytics.enabled', true);
            console.log('✅ Analytics: Configuration loaded, enabled:', this.isEnabled);
        } else {
            setTimeout(() => this.waitForConfig(), 100);
        }
    }
    
    isAnalyticsEnabled() {
        return this.isEnabled && typeof gtag === 'function';
    }
}

// Create global analytics instance
const analytics = new Analytics();

// Track rendering of markdown
function trackRendering(source, contentLength) {
  if (!analytics.isAnalyticsEnabled()) return;
  
  gtag('event', 'render_markdown', {
    'event_category': 'content',
    'event_label': source,
    'value': Math.round(contentLength / 100) // Round to nearest 100 chars
  });
}

// Track file uploads
function trackFileUpload(fileType, fileSize) {
  if (!analytics.isAnalyticsEnabled()) return;
  
  gtag('event', 'file_upload', {
    'event_category': 'content',
    'event_label': fileType,
    'value': Math.round(fileSize / 1024) // Convert to KB
  });
}

// Track exports (PDF/PNG)
function trackExport(format, filename) {
  if (!analytics.isAnalyticsEnabled()) return;
  
  gtag('event', 'export', {
    'event_category': 'content',
    'event_label': format,
    'value': 1
  });
}

// Track example loading
function trackExampleLoad(exampleType) {
  if (!analytics.isAnalyticsEnabled()) return;
  
  gtag('event', 'load_example', {
    'event_category': 'content',
    'event_label': exampleType,
    'value': 1
  });
}

// Track generic actions
function trackAction(action, source) {
  if (!analytics.isAnalyticsEnabled()) return;
  
  gtag('event', action, {
    'event_category': 'ui',
    'event_label': source,
    'value': 1
  });
}

// Track page view (call this on initial load)
function trackPageView() {
  if (!analytics.isAnalyticsEnabled()) return;
  
  gtag('event', 'page_view', {
    'page_title': document.title,
    'page_location': window.location.href,
    'page_path': window.location.pathname
  });
}

// Initialize analytics tracking
document.addEventListener('DOMContentLoaded', function() {
  // Track initial page view
  trackPageView();
  
  console.log('Analytics tracking initialized');
});