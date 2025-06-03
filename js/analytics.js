/**
 * Google Analytics tracking functions for MisterMD
 */

// Track rendering of markdown
function trackRendering(source, contentLength) {
  if (typeof gtag !== 'function') return;
  
  gtag('event', 'render_markdown', {
    'event_category': 'content',
    'event_label': source,
    'value': Math.round(contentLength / 100) // Round to nearest 100 chars
  });
}

// Track file uploads
function trackFileUpload(fileType, fileSize) {
  if (typeof gtag !== 'function') return;
  
  gtag('event', 'file_upload', {
    'event_category': 'content',
    'event_label': fileType,
    'value': Math.round(fileSize / 1024) // Convert to KB
  });
}

// Track exports (PDF/PNG)
function trackExport(format, filename) {
  if (typeof gtag !== 'function') return;
  
  gtag('event', 'export', {
    'event_category': 'content',
    'event_label': format,
    'value': 1
  });
}

// Track example loading
function trackExampleLoad(exampleType) {
  if (typeof gtag !== 'function') return;
  
  gtag('event', 'load_example', {
    'event_category': 'content',
    'event_label': exampleType,
    'value': 1
  });
}

// Track generic actions
function trackAction(action, source) {
  if (typeof gtag !== 'function') return;
  
  gtag('event', action, {
    'event_category': 'ui',
    'event_label': source,
    'value': 1
  });
}

// Track page view (call this on initial load)
function trackPageView() {
  if (typeof gtag !== 'function') return;
  
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