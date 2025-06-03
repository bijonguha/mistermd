// Enhanced file upload handler
function handleFileUpload(event) {
    const fileInput = document.getElementById('file-input');
    const fileName = document.getElementById('file-name');
    const markdownInput = document.getElementById('markdown-input');
    
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['.md', '.markdown', '.txt'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(fileExtension)) {
        alert('Please select a valid markdown file (.md, .markdown, .txt)');
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