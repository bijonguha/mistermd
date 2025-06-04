document.addEventListener('DOMContentLoaded', function() {
    // Check if hljs is loaded
    if (typeof hljs === 'undefined') {
        if (window.log) {
            window.log.error('hljs is not defined! highlight.js failed to load.', 'App');
        }
    } else if (window.log && window.appConfig?.get('development.debug')) {
        window.log.debug('hljs is available', 'App');
    }
    
    // Initialize authentication
    if (typeof window.authManager !== 'undefined') {
        if (window.log) {
            window.log.info('Initializing authentication', 'App');
        }
        window.authManager.initialize().then(() => {
            if (window.log) {
                window.log.info('Authentication initialized successfully', 'App');
            }
            
            // Don't automatically render fallback button
            // It will only show when the main button is clicked and prompt fails
            
            // Set up auth event listeners
            window.authManager.onSignIn((user) => {
                if (window.log) {
                    window.log.info(`User signed in: ${user.name}`, 'App');
                }
                // You can add custom logic here when user signs in
                // For example, track in analytics or show welcome message
                if (typeof gtag === 'function') {
                    gtag('event', 'user_login', {
                        method: 'Google',
                        user_id: user.id
                    });
                }
            });
            
            window.authManager.onSignOut(() => {
                if (window.log) {
                    window.log.info('User signed out', 'App');
                }
                // You can add custom logic here when user signs out
                if (typeof gtag === 'function') {
                    gtag('event', 'user_logout', {
                        method: 'Google'
                    });
                }
            });
        }).catch((error) => {
            if (window.log) {
                window.log.error('Failed to initialize authentication', 'App', error);
            }
        });
    } else {
        if (window.log) {
            window.log.error('Auth manager not found!', 'App');
        }
    }
    
    // Initialize progress UI for exports with error handling
    try {
        if (window.log) {
            window.log.debug('Setting up progress UI', 'App');
        }
        if (typeof window.setupProgressUI === 'function') {
            window.setupProgressUI();
            if (window.log) {
                window.log.debug('Progress UI setup complete', 'App');
            }
        } else if (window.log) {
            window.log.warn('setupProgressUI is not a function', 'App');
        }
    } catch (error) {
        if (window.log) {
            window.log.error('Error setting up progress UI', 'App', error);
        }
    }
    
    // Initialize mermaid with configuration-based settings
    function initializeMermaid() {
        if (typeof window.appConfig === 'undefined') {
            setTimeout(initializeMermaid, 100);
            return;
        }
        
        const config = window.appConfig;
        const mermaidConfig = config.get('markdown.mermaid');
        
        mermaid.initialize({
            startOnLoad: mermaidConfig.startOnLoad,
            theme: mermaidConfig.theme,
            securityLevel: mermaidConfig.securityLevel,
            flowchart: mermaidConfig.flowchart,
            sequence: mermaidConfig.sequence,
            gantt: mermaidConfig.gantt
        });
        
        if (window.log) {
            window.log.info('Mermaid initialized with configuration', 'App');
        }
    }
    
    initializeMermaid();

    // Get DOM elements
    const markdownInput = document.getElementById('markdown-input');
    const preview = document.getElementById('preview');
    const renderBtn = document.getElementById('render-btn');
    const clearBtn = document.getElementById('clear-btn');
    const fileInput = document.getElementById('file-input');
    const fileName = document.getElementById('file-name');
    const loadingIndicator = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const downloadPngBtn = document.getElementById('download-png-btn');

    // Event listeners
    renderBtn.addEventListener('click', renderMarkdown);
    clearBtn.addEventListener('click', clearContent);
    fileInput.addEventListener('change', handleFileUpload);
    downloadPdfBtn.addEventListener('click', downloadAsPdfAdvanced);
    downloadPngBtn.addEventListener('click', downloadAsPngAdvanced);
    
    // Auto-render on Ctrl+Enter
    markdownInput.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            renderMarkdown();
        }
    });

    // Example buttons
    document.getElementById('example-flowchart').addEventListener('click', () => {
        loadExample('flowchart');
        // Track example loading with Google Analytics
        if (typeof trackExampleLoad === 'function') {
            trackExampleLoad('flowchart');
        }
    });

    document.getElementById('example-sequence').addEventListener('click', () => {
        loadExample('sequence');
        // Track example loading with Google Analytics
        if (typeof trackExampleLoad === 'function') {
            trackExampleLoad('sequence');
        }
    });

    document.getElementById('example-gantt').addEventListener('click', () => {
        loadExample('gantt');
        // Track example loading with Google Analytics
        if (typeof trackExampleLoad === 'function') {
            trackExampleLoad('gantt');
        }
    });

    document.getElementById('example-code').addEventListener('click', () => {
        loadExample('code');
        // Track example loading with Google Analytics
        if (typeof trackExampleLoad === 'function') {
            trackExampleLoad('code');
        }
    });

    document.getElementById('example-md').addEventListener('click', () => {
        loadExample('complete');
        // Track example loading with Google Analytics
        if (typeof trackExampleLoad === 'function') {
            trackExampleLoad('complete');
        }
    });

    // Clear content function
    function clearContent() {
        markdownInput.value = '';
        preview.innerHTML = '<p style="color: #64748b; text-align: center; font-style: italic;">Preview will appear here...</p>';
        fileInput.value = '';
        fileName.textContent = 'Choose markdown file...';
        
        // Track content clearing with Google Analytics
        if (typeof trackAction === 'function') {
            trackAction('clear', 'button');
        }
    }
});