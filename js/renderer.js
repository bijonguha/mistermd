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
            if (typeof hljs === 'undefined') {
                if (window.log) {
                    window.log.warn('hljs is undefined in highlight function', 'Renderer');
                }
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
    
    if (window.log) {
        window.log.info('Marked initialized with configuration', 'Renderer');
    }
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
    if (language === 'math' || language === 'latex') {
        return `<div class="math-block">$$${code}$$</div>`;
    }
    return originalCodeRenderer(code, language);
};

marked.use({ renderer });

// Math preprocessing function
function preprocessMath(text) {
    // Protect display math blocks ($$...$$) first
    const displayMathBlocks = [];
    text = text.replace(/\$\$([^$]+)\$\$/g, (match, math) => {
        const placeholder = `__DISPLAY_MATH_${displayMathBlocks.length}__`;
        displayMathBlocks.push(math.trim());
        return placeholder;
    });
    
    // Protect inline math ($...$)
    const inlineMathBlocks = [];
    text = text.replace(/\$([^$\n]+)\$/g, (match, math) => {
        const placeholder = `__INLINE_MATH_${inlineMathBlocks.length}__`;
        inlineMathBlocks.push(math.trim());
        return placeholder;
    });
    
    return { text, displayMathBlocks, inlineMathBlocks };
}

// Math postprocessing function
function postprocessMath(html, displayMathBlocks, inlineMathBlocks) {
    // Restore display math blocks
    html = html.replace(/__DISPLAY_MATH_(\d+)__/g, (match, index) => {
        return `<div class="math-display">$$${displayMathBlocks[index]}$$</div>`;
    });
    
    // Restore inline math blocks
    html = html.replace(/__INLINE_MATH_(\d+)__/g, (match, index) => {
        return `<span class="math-inline">$${inlineMathBlocks[index]}$</span>`;
    });
    
    return html;
}

// Debug function to test authentication status
window.testAuth = function() {
    if (window.log) {
        window.log.group('Authentication Test', 'Renderer');
        window.log.debug(`authManager exists: ${typeof window.authManager !== 'undefined'}`, 'Renderer');
        if (typeof window.authManager !== 'undefined') {
            window.log.debug(`isAuthenticated method exists: ${typeof window.authManager.isAuthenticated === 'function'}`, 'Renderer');
            window.log.debug(`User authenticated: ${window.authManager.isAuthenticated()}`, 'Renderer');
            window.log.debug('Current user', 'Renderer', window.authManager.getCurrentUser());
            window.log.debug(`User ID: ${window.authManager.getUserId()}`, 'Renderer');
        }
        window.log.groupEnd();
    }
};

// Enhanced render function with authentication check
function renderMarkdown() {
    const markdownInput = document.getElementById('markdown-input');
    const preview = document.getElementById('preview');
    const loadingIndicator = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    
    // Validate input element exists
    if (!markdownInput) {
        if (window.log) {
            window.log.error('Markdown input element not found', 'Renderer');
        }
        return;
    }
    
    const markdownText = markdownInput.value;
    
    // Validate content
    if (!markdownText || typeof markdownText !== 'string') {
        if (window.log) {
            window.log.warn('No markdown text to render', 'Renderer');
        }
        preview.innerHTML = '<p style="color: #64748b; text-align: center; font-style: italic;">Preview will appear here...</p>';
        return;
    }
    
    if (!markdownText.trim()) {
        preview.innerHTML = '<p style="color: #64748b; text-align: center; font-style: italic;">Preview will appear here...</p>';
        return;
    }

    // Force authentication check every time
    if (window.log) {
        window.log.debug('Checking authentication status', 'Renderer');
        window.log.debug(`authManager available: ${typeof window.authManager !== 'undefined'}`, 'Renderer');
    }
    
    // Check authentication status
    let isAuthenticated = false;
    if (typeof window.authManager !== 'undefined' && window.authManager.isAuthenticated) {
        isAuthenticated = window.authManager.isAuthenticated();
        if (window.log) {
            window.log.debug(`User authenticated: ${isAuthenticated}`, 'Renderer');
        }
    } else {
        if (window.log) {
            window.log.warn('AuthManager not properly initialized', 'Renderer');
        }
    }
    
    // If not authenticated, force sign-in
    if (!isAuthenticated) {
        if (window.log) {
            window.log.info('User not authenticated - triggering sign-in for render', 'Renderer');
        }
        
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
            if (window.log) {
                window.log.info('User signed in, proceeding with render', 'Renderer');
            }
            loadingIndicator.style.display = 'none';
            
            // Proceed with rendering the stored markdown with validation
            if (window.pendingRender && typeof window.pendingRender === 'string' && window.pendingRender.trim()) {
                setTimeout(() => {
                    actualRenderMarkdown(window.pendingRender);
                    window.pendingRender = null;
                }, 500);
            } else {
                if (window.log) {
                    window.log.warn('No valid pending render content after sign-in', 'Renderer');
                }
                window.pendingRender = null;
            }
        });
        
        // Handle cancellation - set a timeout to check if sign-in was cancelled
        setTimeout(() => {
            if (window.pendingRender && !window.authManager.isAuthenticated()) {
                if (window.log) {
                    window.log.debug('Sign-in timed out or was cancelled', 'Renderer');
                }
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
            if (window.log) {
                window.log.error('Cannot trigger sign-in - authManager.signIn not available', 'Renderer');
            }
            alert('Authentication system not ready. Please refresh the page.');
        }
        
        return;
    }
    
    // User is authenticated, proceed with normal rendering
    if (window.log) {
        window.log.debug('User is authenticated, proceeding with render', 'Renderer');
    }
    actualRenderMarkdown(markdownText);
}

// Actual rendering function (extracted from original)
function actualRenderMarkdown(markdownText) {
    const preview = document.getElementById('preview');
    const loadingIndicator = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    
    // Validate input
    if (!markdownText || typeof markdownText !== 'string') {
        if (window.log) {
            window.log.error('Invalid markdown text provided to actualRenderMarkdown', 'Renderer', {
                markdownText: markdownText,
                type: typeof markdownText
            });
        }
        preview.innerHTML = '<p style="color: #ef4444; text-align: center; font-style: italic;">No content to render</p>';
        loadingIndicator.style.display = 'none';
        return;
    }
    
    // Trim whitespace and check if empty
    const trimmedText = markdownText.trim();
    if (!trimmedText) {
        preview.innerHTML = '<p style="color: #64748b; text-align: center; font-style: italic;">Preview will appear here...</p>';
        loadingIndicator.style.display = 'none';
        return;
    }
    
    loadingIndicator.style.display = 'block';
    loadingText.textContent = 'Rendering markdown...';
    
    setTimeout(() => {
        try {
            // Check if marked is available
            if (typeof marked === 'undefined' || typeof marked.parse !== 'function') {
                throw new Error('Markdown parser (marked.js) is not loaded. Please refresh the page.');
            }
            
            // Preprocess math expressions
            const { text: preprocessedText, displayMathBlocks, inlineMathBlocks } = preprocessMath(trimmedText);
            
            // Convert markdown to HTML with validated input
            let html = marked.parse(preprocessedText);
            
            // Restore math expressions
            html = postprocessMath(html, displayMathBlocks, inlineMathBlocks);
            preview.innerHTML = html;
            
            // Render math expressions with KaTeX
            const mathElements = document.querySelectorAll('.math-display, .math-inline');
            if (mathElements.length > 0 && typeof katex !== 'undefined') {
                loadingText.textContent = 'Rendering math expressions...';
                mathElements.forEach(element => {
                    try {
                        const mathText = element.textContent;
                        const isDisplay = element.classList.contains('math-display');
                        const cleanMath = mathText.replace(/^\$+|\$+$/g, ''); // Remove $ symbols
                        
                        katex.render(cleanMath, element, {
                            displayMode: isDisplay,
                            throwOnError: false,
                            errorColor: '#cc0000',
                            strict: 'warn'
                        });
                    } catch (error) {
                        if (window.log) {
                            window.log.warn('KaTeX rendering error', 'Renderer', error);
                        }
                        element.innerHTML = `<span style="color: #cc0000; font-style: italic;">Math Error: ${error.message}</span>`;
                    }
                });
            }
            
            // Render mermaid diagrams
            const mermaidElements = document.querySelectorAll('.mermaid');
            if (mermaidElements.length > 0) {
                loadingText.textContent = 'Rendering diagrams...';
                mermaid.init(undefined, mermaidElements);
            }
            
            // Debug heading styles in development only
            if (window.log && window.appConfig?.get('development.debug')) {
                window.log.group('Render Debug - Heading Styles', 'Renderer');
                const headings = preview.querySelectorAll('h1, h2, h3, h4, h5, h6');
                headings.forEach((heading, index) => {
                    const computedStyle = window.getComputedStyle(heading);
                    window.log.trace(`Heading ${heading.tagName} #${index}`, 'Renderer', {
                        background: computedStyle.background,
                        backgroundColor: computedStyle.backgroundColor,
                        backgroundImage: computedStyle.backgroundImage,
                        textContent: heading.textContent.substring(0, 50)
                    });
                });
                window.log.groupEnd();
            }
            
            loadingIndicator.style.display = 'none';
            
            // Track successful rendering with Google Analytics
            if (typeof trackRendering === 'function') {
                trackRendering('button', trimmedText.length);
            }
            
            // Track authenticated rendering
            if (typeof window.authManager !== 'undefined' && window.authManager.isAuthenticated()) {
                if (window.log) {
                    window.log.debug('Authenticated user rendered markdown', 'Renderer');
                }
                if (typeof gtag === 'function') {
                    gtag('event', 'authenticated_render', {
                        user_id: window.authManager.getUserId(),
                        content_length: trimmedText.length
                    });
                }
            }
        } catch (error) {
            if (window.log) {
                window.log.error('Rendering error', 'Renderer', error);
            }
            
            let errorMessage = 'Unknown rendering error';
            if (error.message) {
                if (error.message.includes('marked(): input parameter is undefined or null')) {
                    errorMessage = 'No content provided to render. Please enter some markdown text.';
                } else if (error.message.includes('marked')) {
                    errorMessage = 'Markdown parsing error: ' + error.message.replace(/marked\(\): /, '');
                } else {
                    errorMessage = error.message;
                }
            }
            
            preview.innerHTML = `<div style="color: #ef4444; padding: 20px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
                <strong>Rendering Error:</strong> ${errorMessage}
                <br><br>
                <small style="color: #7f1d1d;">
                    If this error persists, try refreshing the page or check the console for more details.
                </small>
            </div>`;
            loadingIndicator.style.display = 'none';
        }
    }, 100);
}