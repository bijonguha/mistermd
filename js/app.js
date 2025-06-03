document.addEventListener('DOMContentLoaded', function() {
    // Debug: Check if hljs is loaded
    console.log('DOM loaded. Checking hljs availability:', typeof hljs);
    if (typeof hljs === 'undefined') {
        console.error('hljs is not defined! highlight.js failed to load.');
    } else {
        console.log('hljs is available:', hljs);
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
    
    // Initialize mermaid with better configuration
    mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
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
    });

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