// Wait for configuration to load before setting up marked
function initializeMarked() {
    if (typeof window.appConfig === 'undefined') {
        setTimeout(initializeMarked, 100);
        return;
    }
    
    const config = window.appConfig;
    const markdownOptions = config.get('markdown.options');
    
    // Enhanced marked configuration with safety check
    marked.setOptions({
        highlight: function(code, lang) {
            console.log('Highlight function called. hljs available:', typeof hljs !== 'undefined');
            if (typeof hljs === 'undefined') {
                console.error('hljs is undefined in highlight function');
                return code; // Return unhighlighted code as fallback
            }
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: markdownOptions.breaks,
        gfm: markdownOptions.gfm,
        headerIds: markdownOptions.headerIds,
        mangle: markdownOptions.mangle
    });
    
    console.log('✅ Marked initialized with configuration');
}

// Initialize marked when page loads
initializeMarked();

// Custom renderer for better styling
const renderer = new marked.Renderer();
const originalCodeRenderer = renderer.code.bind(renderer);

renderer.code = function(code, language) {
    if (language === 'mermaid') {
        return `<div class="mermaid">${code}</div>`;
    }
    return originalCodeRenderer(code, language);
};

marked.use({ renderer });

// Debug function to test authentication status
window.testAuth = function() {
    console.log('=== AUTHENTICATION TEST ===');
    console.log('🔧 authManager exists:', typeof window.authManager !== 'undefined');
    if (typeof window.authManager !== 'undefined') {
        console.log('🔧 isAuthenticated method exists:', typeof window.authManager.isAuthenticated === 'function');
        console.log('🔐 User authenticated:', window.authManager.isAuthenticated());
        console.log('👤 Current user:', window.authManager.getCurrentUser());
        console.log('🆔 User ID:', window.authManager.getUserId());
    }
    console.log('=== END TEST ===');
};

// Enhanced render function with authentication check
function renderMarkdown() {
    const markdownInput = document.getElementById('markdown-input');
    const preview = document.getElementById('preview');
    const loadingIndicator = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    
    const markdownText = markdownInput.value;
    if (!markdownText.trim()) {
        preview.innerHTML = '<p style="color: #64748b; text-align: center; font-style: italic;">Preview will appear here...</p>';
        return;
    }

    // Force authentication check every time
    console.log('🔍 Checking authentication status...');
    console.log('🔧 authManager available:', typeof window.authManager !== 'undefined');
    
    // Check authentication status
    let isAuthenticated = false;
    if (typeof window.authManager !== 'undefined' && window.authManager.isAuthenticated) {
        isAuthenticated = window.authManager.isAuthenticated();
        console.log('🔐 User authenticated:', isAuthenticated);
        console.log('👤 Current user:', window.authManager.getCurrentUser());
    } else {
        console.log('⚠️ AuthManager not properly initialized');
    }
    
    // If not authenticated, force sign-in
    if (!isAuthenticated) {
        console.log('🚨 User NOT authenticated - triggering sign-in for render');
        
        // Show user-friendly message in preview area
        preview.innerHTML = `
            <div style="
                text-align: center; 
                padding: 40px 20px; 
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                border-radius: 16px; 
                border: 2px dashed #cbd5e1;
                margin: 20px 0;
            ">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5" style="margin-bottom: 16px;">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <h3 style="color: #334155; margin: 16px 0 8px 0; font-size: 18px;">Sign in to render your markdown</h3>
                <p style="color: #64748b; margin: 0 0 20px 0; font-size: 14px; line-height: 1.5;">
                    To use the markdown renderer, please sign in with your Google account.<br>
                    This helps us provide better service and track your usage.
                </p>
                <div style="
                    display: inline-flex; 
                    align-items: center; 
                    gap: 8px; 
                    padding: 8px 16px; 
                    background: #3b82f6; 
                    color: white; 
                    border-radius: 8px; 
                    font-size: 14px;
                    animation: pulse 2s infinite;
                ">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    Google sign-in popup opening...
                </div>
            </div>
            <style>
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
            </style>
        `;
        
        // Also show loading indicator
        loadingIndicator.style.display = 'block';
        loadingText.textContent = 'Waiting for authentication...';
        
        // Store the markdown text to render after sign-in
        window.pendingRender = markdownText;
        
        // Add one-time callback for after sign-in
        window.authManager.onSignIn(function(user) {
            console.log('✅ User signed in, proceeding with render');
            loadingIndicator.style.display = 'none';
            
            // Proceed with rendering the stored markdown
            if (window.pendingRender) {
                setTimeout(() => {
                    actualRenderMarkdown(window.pendingRender);
                    window.pendingRender = null;
                }, 500);
            }
        });
        
        // Handle cancellation - set a timeout to check if sign-in was cancelled
        setTimeout(() => {
            if (window.pendingRender && !window.authManager.isAuthenticated()) {
                console.log('⏰ Sign-in timed out or was cancelled');
                loadingIndicator.style.display = 'none';
                preview.innerHTML = `
                    <div style="
                        text-align: center; 
                        padding: 40px 20px; 
                        background: #fef2f2;
                        border-radius: 16px; 
                        border: 2px dashed #fca5a5;
                        margin: 20px 0;
                    ">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5" style="margin-bottom: 16px;">
                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                        </svg>
                        <h3 style="color: #dc2626; margin: 16px 0 8px 0; font-size: 18px;">Authentication Required</h3>
                        <p style="color: #7f1d1d; margin: 0 0 20px 0; font-size: 14px; line-height: 1.5;">
                            Sign in was cancelled or timed out.<br>
                            Please click the render button again to try signing in.
                        </p>
                        <button onclick="renderMarkdown()" style="
                            padding: 10px 20px; 
                            background: #3b82f6; 
                            color: white; 
                            border: none; 
                            border-radius: 8px; 
                            cursor: pointer;
                            font-size: 14px;
                        ">Try Again</button>
                    </div>
                `;
                window.pendingRender = null;
            }
        }, 30000); // 30 second timeout
        
        // Trigger sign-in
        if (typeof window.authManager !== 'undefined' && window.authManager.signIn) {
            window.authManager.signIn();
        } else {
            console.error('❌ Cannot trigger sign-in - authManager.signIn not available');
            alert('Authentication system not ready. Please refresh the page.');
        }
        
        return;
    }
    
    // User is authenticated, proceed with normal rendering
    console.log('✅ User is authenticated, proceeding with render');
    actualRenderMarkdown(markdownText);
}

// Actual rendering function (extracted from original)
function actualRenderMarkdown(markdownText) {
    const preview = document.getElementById('preview');
    const loadingIndicator = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    
    loadingIndicator.style.display = 'block';
    loadingText.textContent = 'Rendering markdown...';
    
    setTimeout(() => {
        try {
            // Convert markdown to HTML
            const html = marked.parse(markdownText);
            preview.innerHTML = html;
            
            // Render mermaid diagrams
            const mermaidElements = document.querySelectorAll('.mermaid');
            if (mermaidElements.length > 0) {
                loadingText.textContent = 'Rendering diagrams...';
                mermaid.init(undefined, mermaidElements);
            }
            
            // Debug: Log current heading styles after rendering
            console.log('=== After Render Debug ===');
            const headings = preview.querySelectorAll('h1, h2, h3, h4, h5, h6');
            headings.forEach((heading, index) => {
                const computedStyle = window.getComputedStyle(heading);
                console.log(`Rendered Heading ${heading.tagName} #${index}:`, {
                    background: computedStyle.background,
                    backgroundColor: computedStyle.backgroundColor,
                    backgroundImage: computedStyle.backgroundImage,
                    backgroundClip: computedStyle.backgroundClip,
                    webkitBackgroundClip: computedStyle.webkitBackgroundClip,
                    color: computedStyle.color,
                    textContent: heading.textContent.substring(0, 50)
                });
            });
            
            loadingIndicator.style.display = 'none';
            
            // Track successful rendering with Google Analytics
            if (typeof trackRendering === 'function') {
                trackRendering('button', markdownText.length);
            }
            
            // Track authenticated rendering
            if (typeof window.authManager !== 'undefined' && window.authManager.isAuthenticated()) {
                console.log('📊 Authenticated user rendered markdown');
                if (typeof gtag === 'function') {
                    gtag('event', 'authenticated_render', {
                        user_id: window.authManager.getUserId(),
                        content_length: markdownText.length
                    });
                }
            }
        } catch (error) {
            console.error('Rendering error:', error);
            preview.innerHTML = `<div style="color: #ef4444; padding: 20px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
                <strong>Rendering Error:</strong> ${error.message}
            </div>`;
            loadingIndicator.style.display = 'none';
        }
    }, 100);
}