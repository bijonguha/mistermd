// Enhanced PNG download with higher quality
function downloadAsPng() {
    const preview = document.getElementById('preview');
    const fileInput = document.getElementById('file-input');
    const loadingIndicator = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    const downloadPngBtn = document.getElementById('download-png-btn');
    
    if (!preview.innerHTML || preview.innerHTML.includes('Preview will appear here')) {
        alert('Please render some content first before downloading');
        return;
    }

    loadingIndicator.style.display = 'block';
    loadingText.textContent = 'Generating high-quality PNG...';

    let filename = 'markdown-export.png';
    if (fileInput.files.length > 0) {
        const originalName = fileInput.files[0].name.split('.')[0];
        filename = `${originalName}.png`;
    }

    // Use html2canvas with high-quality settings
    html2canvas(preview, {
        scale: 3, // Higher scale for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: preview.scrollWidth,
        height: preview.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: preview.scrollWidth,
        windowHeight: preview.scrollHeight,
        onclone: function(clonedDoc) {
            // Debug: Log heading styles before export
            console.log('=== PNG Export Debug ===');
            const clonedPreview = clonedDoc.querySelector('.preview');
            if (clonedPreview) {
                clonedPreview.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, sans-serif';
                clonedPreview.style.fontSize = '16px';
                clonedPreview.style.lineHeight = '1.8';
                
                // Debug: Check heading styles in cloned document
                const headings = clonedPreview.querySelectorAll('h1, h2, h3, h4, h5, h6');
                headings.forEach((heading, index) => {
                    const computedStyle = clonedDoc.defaultView.getComputedStyle(heading);
                    console.log(`Heading ${heading.tagName} #${index}:`, {
                        background: computedStyle.background,
                        backgroundColor: computedStyle.backgroundColor,
                        backgroundImage: computedStyle.backgroundImage,
                        backgroundClip: computedStyle.backgroundClip,
                        webkitBackgroundClip: computedStyle.webkitBackgroundClip,
                        color: computedStyle.color
                    });
                });
            }
        }
    }).then(function(canvas) {
        // Convert to high-quality PNG
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png', 1.0); // Maximum quality
        link.click();
        
        loadingIndicator.style.display = 'none';
        loadingText.textContent = 'Processing...';
    }).catch(function(error) {
        console.error('Error generating PNG:', error);
        alert('Error generating PNG: ' + error.message);
        loadingIndicator.style.display = 'none';
        loadingText.textContent = 'Processing...';
    });
    downloadPngBtn.blur();
}

// Enhanced PDF download
function downloadAsPdf() {
    const preview = document.getElementById('preview');
    const fileInput = document.getElementById('file-input');
    const loadingIndicator = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    
    if (!preview.innerHTML || preview.innerHTML.includes('Preview will appear here')) {
        alert('Please render some content first before downloading');
        return;
    }

    loadingIndicator.style.display = 'block';
    loadingText.textContent = 'Generating high-quality PDF...';

    let filename = 'markdown-export.pdf';
    if (fileInput.files.length > 0) {
        const originalName = fileInput.files[0].name.split('.')[0];
        filename = `${originalName}.pdf`;
    }

    html2canvas(preview, {
        scale: 2, // Good balance between quality and file size
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: preview.scrollWidth,
        height: preview.scrollHeight,
        onclone: function(clonedDoc) {
            // Debug: Log heading styles before PDF export
            console.log('=== PDF Export Debug ===');
            const clonedPreview = clonedDoc.querySelector('.preview');
            if (clonedPreview) {
                // Debug: Check heading styles in cloned document
                const headings = clonedPreview.querySelectorAll('h1, h2, h3, h4, h5, h6');
                headings.forEach((heading, index) => {
                    const computedStyle = clonedDoc.defaultView.getComputedStyle(heading);
                    console.log(`PDF Heading ${heading.tagName} #${index}:`, {
                        background: computedStyle.background,
                        backgroundColor: computedStyle.backgroundColor,
                        backgroundImage: computedStyle.backgroundImage,
                        backgroundClip: computedStyle.backgroundClip,
                        webkitBackgroundClip: computedStyle.webkitBackgroundClip,
                        color: computedStyle.color
                    });
                });
            }
        }
    }).then(function(canvas) {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });
        
        const imgData = canvas.toDataURL('image/png', 0.95);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / pdfWidth;
        const scaledHeight = imgHeight / ratio;
        
        if (scaledHeight <= pdfHeight) {
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, scaledHeight);
        } else {
            let remainingHeight = scaledHeight;
            let currentPosition = 0;
            
            pdf.addImage(imgData, 'PNG', 0, currentPosition, pdfWidth, scaledHeight);
            remainingHeight -= pdfHeight;
            
            while (remainingHeight > 0) {
                currentPosition -= pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, currentPosition, pdfWidth, scaledHeight);
                remainingHeight -= pdfHeight;
            }
        }
        
        pdf.save(filename);
        loadingIndicator.style.display = 'none';
        loadingText.textContent = 'Processing...';
    }).catch(function(error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF: ' + error.message);
        loadingIndicator.style.display = 'none';
        loadingText.textContent = 'Processing...';
    });
    downloadPdfBtn.blur();
}