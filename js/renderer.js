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
    breaks: true,
    gfm: true,
    headerIds: true,
    mangle: false
});

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

// Enhanced render function
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
        } catch (error) {
            console.error('Rendering error:', error);
            preview.innerHTML = `<div style="color: #ef4444; padding: 20px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
                <strong>Rendering Error:</strong> ${error.message}
            </div>`;
            loadingIndicator.style.display = 'none';
        }
    }, 100);
}