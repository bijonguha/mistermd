document.addEventListener('DOMContentLoaded', function() {
    // Debug: Check if hljs is loaded
    console.log('DOM loaded. Checking hljs availability:', typeof hljs);
    if (typeof hljs === 'undefined') {
        console.error('hljs is not defined! highlight.js failed to load.');
    } else {
        console.log('hljs is available:', hljs);
    }
    
    // Initialize authentication
    if (typeof window.authManager !== 'undefined') {
        console.log('Initializing authentication...');
        window.authManager.initialize().then(() => {
            console.log('Authentication initialized successfully');
            
            // Don't automatically render fallback button
            // It will only show when the main button is clicked and prompt fails
            
            // Set up auth event listeners
            window.authManager.onSignIn((user) => {
                console.log('User signed in:', user.name);
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
                console.log('User signed out');
                // You can add custom logic here when user signs out
                if (typeof gtag === 'function') {
                    gtag('event', 'user_logout', {
                        method: 'Google'
                    });
                }
            });
        }).catch((error) => {
            console.error('Failed to initialize authentication:', error);
        });
    } else {
        console.error('Auth manager not found!');
    }
    
    // Initialize progress UI for exports with error handling
    try {
        console.log('Setting up progress UI...');
        if (typeof window.setupProgressUI === 'function') {
            window.setupProgressUI();
            console.log('Progress UI setup complete');
        } else {
            console.error('setupProgressUI is not a function!', typeof window.setupProgressUI);
        }
    } catch (error) {
        console.error('Error setting up progress UI:', error);
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
        
        console.log('✅ Mermaid initialized with configuration');
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