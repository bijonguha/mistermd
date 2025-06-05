// Enhanced file upload handler
function handleFileUpload(event) {
    const fileInput = document.getElementById('file-input');
    const fileName = document.getElementById('file-name');
    const markdownInput = document.getElementById('markdown-input');
    
    // Get configuration
    const config = window.appConfig;
    
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type using configuration
    const validTypes = config ? config.get('files.allowedTypes', ['.md', '.markdown', '.txt']) : ['.md', '.markdown', '.txt'];
    const maxSize = config ? config.get('files.maxSize', 10 * 1024 * 1024) : 10 * 1024 * 1024;
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(fileExtension)) {
        alert(`Please select a valid markdown file (${validTypes.join(', ')})`);
        fileInput.value = '';
        return;
    }
    
    // Validate file size
    if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        alert(`File too large. Maximum size allowed is ${maxSizeMB}MB`);
        fileInput.value = '';
        return;
    }
    
    fileName.textContent = file.name;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        markdownInput.value = e.target.result;
        
        // Track file upload with Google Analytics
        if (typeof trackFileUpload === 'function') {
            trackFileUpload(fileExtension, file.size);
        }
        
        renderMarkdown();
    };
    reader.onerror = function() {
        alert('Error reading file. Please try again.');
        fileName.textContent = 'Choose markdown file...';
    };
    reader.readAsText(file);
}