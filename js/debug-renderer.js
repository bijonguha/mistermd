/**
 * Debug utilities for renderer issues
 */

// Debug function to check renderer state
window.debugRenderer = function() {
    console.group('🔍 Renderer Debug Information');
    
    // Check basic dependencies
    console.log('Dependencies:');
    console.log('  marked:', typeof marked !== 'undefined' ? '✅ Available' : '❌ Missing');
    console.log('  marked.parse:', typeof marked?.parse === 'function' ? '✅ Available' : '❌ Missing');
    console.log('  mermaid:', typeof mermaid !== 'undefined' ? '✅ Available' : '❌ Missing');
    console.log('  hljs:', typeof hljs !== 'undefined' ? '✅ Available' : '❌ Missing');
    
    // Check DOM elements
    console.log('\nDOM Elements:');
    const markdownInput = document.getElementById('markdown-input');
    const preview = document.getElementById('preview');
    console.log('  markdown-input:', markdownInput ? '✅ Found' : '❌ Missing');
    console.log('  preview:', preview ? '✅ Found' : '❌ Missing');
    
    // Check current content
    if (markdownInput) {
        const content = markdownInput.value;
        console.log('\nCurrent Content:');
        console.log('  Length:', content?.length || 0);
        console.log('  Type:', typeof content);
        console.log('  Empty:', !content || !content.trim());
        console.log('  First 100 chars:', content ? content.substring(0, 100) + '...' : 'No content');
    }
    
    // Check authentication state
    console.log('\nAuthentication:');
    console.log('  authManager:', typeof window.authManager !== 'undefined' ? '✅ Available' : '❌ Missing');
    if (typeof window.authManager !== 'undefined') {
        console.log('  isAuthenticated:', window.authManager.isAuthenticated());
        console.log('  currentUser:', window.authManager.getCurrentUser()?.name || 'None');
    }
    
    // Check pending render
    console.log('\nPending Render:');
    console.log('  pendingRender:', typeof window.pendingRender);
    console.log('  pendingRender value:', window.pendingRender ? window.pendingRender.substring(0, 50) + '...' : 'None');
    
    console.groupEnd();
    
    // Test render with sample content
    console.log('\n🧪 Testing render with sample content...');
    testRender();
};

// Test render function
function testRender() {
    const testContent = '# Test Heading\n\nThis is a test paragraph with **bold text** and *italic text*.\n\n- List item 1\n- List item 2\n\n```javascript\nconsole.log("Hello, World!");\n```';
    
    try {
        console.log('Testing marked.parse with sample content...');
        if (typeof marked === 'undefined') {
            console.error('❌ marked is not defined');
            return;
        }
        
        if (typeof marked.parse !== 'function') {
            console.error('❌ marked.parse is not a function');
            return;
        }
        
        const result = marked.parse(testContent);
        console.log('✅ marked.parse test successful');
        console.log('Result length:', result.length);
        console.log('First 200 chars:', result.substring(0, 200) + '...');
        
    } catch (error) {
        console.error('❌ marked.parse test failed:', error);
    }
}

// Auto-check if there are issues
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        // Only auto-run in development
        if (window.appConfig?.get('development.debug')) {
            const hasIssues = typeof marked === 'undefined' || 
                            typeof marked?.parse !== 'function' ||
                            !document.getElementById('markdown-input') ||
                            !document.getElementById('preview');
            
            if (hasIssues) {
                console.warn('🚨 Renderer issues detected. Run debugRenderer() for details.');
            }
        }
    }, 2000);
});

console.log('🔍 Renderer debug utilities loaded. Call debugRenderer() to diagnose issues.');