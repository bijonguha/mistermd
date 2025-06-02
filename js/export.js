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
        
        try {
            // Use a lower quality and JPEG format for better compatibility
            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = imgWidth / pdfWidth;
            const scaledHeight = imgHeight / ratio;
            
            console.log('PDF export dimensions:', {
                canvasWidth: imgWidth,
                canvasHeight: imgHeight,
                pdfWidth,
                pdfHeight,
                ratio,
                scaledHeight
            });
            
            if (scaledHeight <= pdfHeight) {
                // Single page - use try/catch for better error handling
                try {
                    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, scaledHeight);
                } catch (imageError) {
                    console.error('Error adding image to PDF:', imageError);
                    // Fallback: Try with even lower quality
                    const fallbackImgData = canvas.toDataURL('image/jpeg', 0.5);
                    pdf.addImage(fallbackImgData, 'JPEG', 0, 0, pdfWidth, scaledHeight);
                }
            } else {
                // Multiple pages with better error handling
                let remainingHeight = scaledHeight;
                let currentPosition = 0;
                let pageCount = 0;
                
                try {
                    // First page
                    pdf.addImage(imgData, 'JPEG', 0, currentPosition, pdfWidth, scaledHeight);
                    remainingHeight -= pdfHeight;
                    pageCount++;
                    
                    // Additional pages if needed
                    while (remainingHeight > 0 && pageCount < 20) { // Limit to 20 pages as safety
                        currentPosition -= pdfHeight;
                        pdf.addPage();
                        pdf.addImage(imgData, 'JPEG', 0, currentPosition, pdfWidth, scaledHeight);
                        remainingHeight -= pdfHeight;
                        pageCount++;
                    }
                } catch (multiPageError) {
                    console.error('Error in multi-page PDF generation:', multiPageError);
                    // Fallback: Try chunked approach with lower quality
                    pdf.deletePage(1); // Remove potentially corrupted page
                    pdf.addPage(); // Add fresh page
                    
                    // Use lower quality and scale
                    const fallbackImgData = canvas.toDataURL('image/jpeg', 0.5);
                    const reducedHeight = Math.min(scaledHeight, pdfHeight * 0.9);
                    pdf.addImage(fallbackImgData, 'JPEG', 0, 0, pdfWidth, reducedHeight);
                    
                    // Add note about truncation if needed
                    if (scaledHeight > pdfHeight) {
                        pdf.setFontSize(10);
                        pdf.setTextColor(100, 100, 100);
                        pdf.text('Note: Content was truncated due to size limitations.', 10, pdfHeight - 10);
                    }
                }
            }
        } catch (error) {
            console.error('Critical error in PDF generation:', error);
            // Last resort fallback - create a simple PDF with error message
            pdf.setFontSize(16);
            pdf.setTextColor(255, 0, 0);
            pdf.text('Error generating PDF from content.', 20, 30);
            pdf.setFontSize(12);
            pdf.setTextColor(0, 0, 0);
            pdf.text('The content may be too large or complex to render as PDF.', 20, 50);
            pdf.text('Please try exporting a smaller section or use PNG export instead.', 20, 70);
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

/**
 * Advanced Export System for PNG and PDF
 * Handles large content, multiple strategies, progress tracking, and error recovery
 */
class AdvancedExportSystem {
    constructor(options = {}) {
        this.options = {
            // Export strategies
            pdfStrategy: options.pdfStrategy || 'smart', // 'single', 'chunked', 'smart', 'css-print'
            pngStrategy: options.pngStrategy || 'smart', // 'single', 'tiled', 'smart', 'native'
            
            // Quality settings
            pngQuality: options.pngQuality || 0.9, // Reduced from 1.0 for better compatibility
            pdfQuality: options.pdfQuality || 0.85, // Reduced from 0.95 for better compatibility
            scale: options.scale || 2, // Reduced from 3 to prevent canvas size issues
            
            // Canvas limits
            maxCanvasSize: options.maxCanvasSize || 16384, // Reduced from 32767 to prevent memory issues
            maxMemoryUsage: options.maxMemoryUsage || 256 * 1024 * 1024, // Reduced from 512MB to 256MB
            
            // PDF settings
            pdfFormat: options.pdfFormat || 'a4',
            pdfOrientation: options.pdfOrientation || 'portrait',
            pdfMargin: options.pdfMargin || { top: 15, bottom: 15, left: 15, right: 15 },
            
            // PNG settings
            backgroundColor: options.backgroundColor || '#ffffff',
            tileSize: options.tileSize || 4096, // For tiled rendering
            
            // Performance
            timeout: options.timeout || 45000,
            retryAttempts: options.retryAttempts || 3,
            chunkDelay: options.chunkDelay || 100, // Delay between chunks
            
            // Callbacks
            onProgress: options.onProgress || null,
            onError: options.onError || null,
            onSuccess: options.onSuccess || null
        };
        
        this.abortController = null;
        this.isExporting = false;
        this.exportStats = {};
    }

    /**
     * Main PNG export function with strategy selection
     */
    async exportToPNG(element, filename = 'export.png') {
        if (this.isExporting) {
            throw new Error('Export already in progress');
        }

        this.isExporting = true;
        this.abortController = new AbortController();
        this.exportStats = { startTime: Date.now(), format: 'PNG' };

        try {
            const strategy = await this.selectPNGStrategy(element);
            this.reportProgress('Initializing PNG export...', 0);
            
            switch (strategy) {
                case 'native':
                    return await this.exportPNGNative(element, filename);
                case 'tiled':
                    return await this.exportPNGTiled(element, filename);
                case 'single':
                    return await this.exportPNGSingle(element, filename);
                case 'smart':
                default:
                    return await this.exportPNGSmart(element, filename);
            }
        } catch (error) {
            this.handleError(error);
            throw error;
        } finally {
            this.cleanup();
        }
    }

    /**
     * Main PDF export function with strategy selection
     */
    async exportToPDF(element, filename = 'export.pdf') {
        if (this.isExporting) {
            throw new Error('Export already in progress');
        }

        this.isExporting = true;
        this.abortController = new AbortController();
        this.exportStats = { startTime: Date.now(), format: 'PDF' };

        try {
            const strategy = await this.selectPDFStrategy(element);
            this.reportProgress('Initializing PDF export...', 0);
            
            switch (strategy) {
                case 'direct':
                    return await this.exportPDFDirect(element, filename);
                case 'css-print':
                    return await this.exportPDFCSSPrint(element, filename);
                case 'chunked':
                    return await this.exportPDFChunked(element, filename);
                case 'single':
                    return await this.exportPDFSingle(element, filename);
                case 'smart':
                default:
                    return await this.exportPDFSmart(element, filename);
            }
        } catch (error) {
            this.handleError(error);
            throw error;
        } finally {
            this.cleanup();
        }
    }

    /**
     * Analyze content and select optimal PNG strategy
     */
    async selectPNGStrategy(element) {
        const analysis = this.analyzeContent(element);
        
        // For very large content, use tiled rendering
        if (analysis.estimatedCanvasSize > this.options.maxCanvasSize) {
            return 'tiled';
        }
        
        // For high memory usage, use smart chunking
        if (analysis.estimatedMemory > this.options.maxMemoryUsage) {
            return 'smart';
        }
        
        // For simple content, use single capture
        if (analysis.height < 5000 && !analysis.hasComplexElements) {
            return 'single';
        }
        
        return 'smart';
    }

    /**
     * Analyze content and select optimal PDF strategy
     */
    async selectPDFStrategy(element) {
        const analysis = this.analyzeContent(element);
        
        // For very small content, use single direct approach
        if (analysis.height < 1500 && analysis.complexity < 5) {
            return 'direct';
        }
        
        // For simple content, try CSS print
        if (analysis.height < 3000 && analysis.imageCount < 3) {
            return 'css-print';
        }
        
        // For very large content, use chunked approach
        if (analysis.height > 10000 || analysis.estimatedPages > 10) {
            return 'chunked';
        }
        
        // For medium content, use smart approach
        return 'smart';
    }

    /**
     * Content analysis for strategy selection
     */
    analyzeContent(element) {
        const rect = element.getBoundingClientRect();
        const images = element.querySelectorAll('img, svg, canvas, .mermaid');
        const tables = element.querySelectorAll('table');
        const codeBlocks = element.querySelectorAll('pre, code');
        
        const scale = this.options.scale;
        const estimatedCanvasSize = Math.max(rect.width * scale, rect.height * scale);
        const estimatedMemory = rect.width * scale * rect.height * scale * 4; // RGBA
        
        return {
            width: rect.width,
            height: rect.height,
            imageCount: images.length,
            tableCount: tables.length,
            codeBlockCount: codeBlocks.length,
            hasLargeTables: Array.from(tables).some(table => table.rows.length > 20),
            hasComplexElements: images.length > 5 || codeBlocks.length > 10,
            estimatedPages: Math.ceil(rect.height / 800),
            estimatedCanvasSize,
            estimatedMemory,
            complexity: this.calculateComplexity(element)
        };
    }

    /**
     * Calculate content complexity score
     */
    calculateComplexity(element) {
        let score = 0;
        
        // Base score from dimensions
        const rect = element.getBoundingClientRect();
        score += Math.min(rect.height / 1000, 10); // Height factor
        
        // Add complexity for different elements
        score += element.querySelectorAll('img').length * 2;
        score += element.querySelectorAll('.mermaid').length * 3;
        score += element.querySelectorAll('table').length * 1.5;
        score += element.querySelectorAll('pre').length * 1;
        
        // Add complexity for nested structures
        const maxDepth = this.getMaxNestingDepth(element);
        score += maxDepth * 0.5;
        
        return Math.min(score, 50); // Cap at 50
    }

    /**
     * Get maximum nesting depth of elements
     */
    getMaxNestingDepth(element, depth = 0) {
        if (!element.children.length) return depth;
        
        let maxChildDepth = depth;
        for (const child of element.children) {
            const childDepth = this.getMaxNestingDepth(child, depth + 1);
            maxChildDepth = Math.max(maxChildDepth, childDepth);
        }
        
        return maxChildDepth;
    }

    // ========== PNG EXPORT STRATEGIES ==========

    /**
     * PNG Strategy 1: Single high-quality capture
     */
    async exportPNGSingle(element, filename) {
        this.reportProgress('Preparing single PNG capture...', 20);
        
        const clonedElement = await this.prepareElementForCapture(element);
        
        try {
            this.reportProgress('Capturing PNG...', 50);
            
            const canvas = await this.captureWithRetry(clonedElement, {
                scale: this.options.scale,
                backgroundColor: this.options.backgroundColor,
                useCORS: true,
                allowTaint: true,
                width: clonedElement.scrollWidth,
                height: clonedElement.scrollHeight,
                onclone: (clonedDoc) => this.optimizeForPNG(clonedDoc)
            });
            
            this.reportProgress('Converting to PNG...', 80);
            await this.downloadCanvas(canvas, filename, 'png');
            
            this.reportProgress('PNG export complete!', 100);
            this.reportSuccess(filename);
            return filename;
        } finally {
            this.cleanupElement(clonedElement);
        }
    }

    /**
     * PNG Strategy 2: Tiled rendering for very large content
     */
    async exportPNGTiled(element, filename) {
        this.reportProgress('Preparing tiled PNG export...', 10);
        
        const rect = element.getBoundingClientRect();
        const tileSize = this.options.tileSize;
        const scale = Math.min(this.options.scale, 2); // Reduce scale for tiled
        
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = rect.width * scale;
        finalCanvas.height = rect.height * scale;
        const finalCtx = finalCanvas.getContext('2d');
        
        // Fill background
        finalCtx.fillStyle = this.options.backgroundColor;
        finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        
        const tilesX = Math.ceil(rect.width / tileSize);
        const tilesY = Math.ceil(rect.height / tileSize);
        const totalTiles = tilesX * tilesY;
        
        this.reportProgress(`Processing ${totalTiles} tiles...`, 15);
        
        for (let y = 0; y < tilesY; y++) {
            for (let x = 0; x < tilesX; x++) {
                if (this.abortController?.signal.aborted) {
                    throw new Error('Export cancelled');
                }
                
                const tileIndex = y * tilesX + x + 1;
                const progress = 15 + (tileIndex / totalTiles) * 70;
                this.reportProgress(`Processing tile ${tileIndex}/${totalTiles}...`, progress);
                
                try {
                    const tileCanvas = await this.captureTile(element, x * tileSize, y * tileSize, tileSize, tileSize, scale);
                    finalCtx.drawImage(tileCanvas, x * tileSize * scale, y * tileSize * scale);
                    
                    // Small delay to prevent UI blocking
                    await this.delay(this.options.chunkDelay);
                } catch (error) {
                    console.warn(`Failed to capture tile ${tileIndex}:`, error);
                    // Continue with other tiles
                }
            }
        }
        
        this.reportProgress('Finalizing PNG...', 90);
        await this.downloadCanvas(finalCanvas, filename, 'png');
        
        this.reportProgress('Tiled PNG export complete!', 100);
        this.reportSuccess(filename);
        return filename;
    }

    /**
     * PNG Strategy 3: Smart adaptive rendering
     */
    async exportPNGSmart(element, filename) {
        this.reportProgress('Analyzing content for smart PNG export...', 10);
        
        const analysis = this.analyzeContent(element);
        
        // If content is manageable, use single capture with optimizations
        if (analysis.estimatedMemory < this.options.maxMemoryUsage / 2) {
            return this.exportPNGSingle(element, filename);
        }
        
        // For large content, use progressive rendering
        return this.exportPNGProgressive(element, filename);
    }

    /**
     * PNG Strategy 4: Progressive rendering for large content
     */
    async exportPNGProgressive(element, filename) {
        this.reportProgress('Preparing progressive PNG rendering...', 15);
        
        const sections = await this.createLogicalSections(element);
        const rect = element.getBoundingClientRect();
        const scale = Math.min(this.options.scale, 2); // Adjust scale for performance
        
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = rect.width * scale;
        finalCanvas.height = rect.height * scale;
        const finalCtx = finalCanvas.getContext('2d');
        
        // Fill background
        finalCtx.fillStyle = this.options.backgroundColor;
        finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        
        let currentY = 0;
        
        for (let i = 0; i < sections.length; i++) {
            if (this.abortController?.signal.aborted) {
                throw new Error('Export cancelled');
            }
            
            const progress = 15 + (i / sections.length) * 70;
            this.reportProgress(`Rendering section ${i + 1}/${sections.length}...`, progress);
            
            try {
                const sectionCanvas = await this.captureWithRetry(sections[i].element, {
                    scale: scale,
                    backgroundColor: 'transparent',
                    useCORS: true,
                    allowTaint: true,
                    onclone: (clonedDoc) => this.optimizeForPNG(clonedDoc)
                });
                
                finalCtx.drawImage(sectionCanvas, 0, currentY * scale);
                currentY += sections[i].height;
                
                await this.delay(this.options.chunkDelay);
            } catch (error) {
                console.warn(`Failed to render section ${i + 1}:`, error);
            } finally {
                this.cleanupElement(sections[i].element);
            }
        }
        
        this.reportProgress('Finalizing progressive PNG...', 90);
        await this.downloadCanvas(finalCanvas, filename, 'png');
        
        this.reportProgress('Progressive PNG export complete!', 100);
        this.reportSuccess(filename);
        return filename;
    }

    // ========== PDF EXPORT STRATEGIES ==========

    /**
     * PDF Strategy 1: Single page capture
     */
    async exportPDFSingle(element, filename) {
        this.reportProgress('Preparing single PDF capture...', 20);
        
        const clonedElement = await this.prepareElementForCapture(element);
        
        try {
            this.reportProgress('Capturing for PDF...', 50);
            
            const canvas = await this.captureWithRetry(clonedElement, {
                scale: 2, // Lower scale for PDF to balance quality and file size
                backgroundColor: this.options.backgroundColor,
                useCORS: true,
                allowTaint: true,
                onclone: (clonedDoc) => this.optimizeForPDF(clonedDoc)
            });
            
            this.reportProgress('Generating PDF...', 80);
            
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: this.options.pdfOrientation,
                unit: 'mm',
                format: this.options.pdfFormat,
                compress: true
            });
            
            await this.addCanvasToPDF(pdf, canvas, filename);
            
            this.reportProgress('PDF export complete!', 100);
            return filename;
        } finally {
            this.cleanupElement(clonedElement);
        }
    }

    /**
     * PDF Strategy 2: CSS Print Media
     */
    async exportPDFCSSPrint(element, filename) {
        this.reportProgress('Using CSS print for PDF...', 20);
        
        return new Promise((resolve, reject) => {
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            
            if (!printWindow) {
                reject(new Error('Popup blocked. Please enable popups and try again.'));
                return;
            }

            const content = this.prepareContentForPrint(element);
            const css = this.generateAdvancedPrintCSS();
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>PDF Export</title>
                    <style>${css}</style>
                    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.2.3/dist/mermaid.min.js"></script>
                </head>
                <body>
                    <div class="export-content">${content}</div>
                    <script>
                        // Initialize Mermaid
                        if (typeof mermaid !== 'undefined') {
                            mermaid.initialize({ 
                                startOnLoad: true, 
                                theme: 'default',
                                themeVariables: { 
                                    primaryColor: '#ffffff',
                                    primaryTextColor: '#000000'
                                }
                            });
                        }
                        
                        // Auto-print after content loads
                        window.onload = function() {
                            setTimeout(() => {
                                window.print();
                                setTimeout(() => window.close(), 1000);
                            }, 1500);
                        };
                    </script>
                </body>
                </html>
            `);
            
            printWindow.document.close();
            this.reportProgress('Print dialog opened - choose "Save as PDF"', 100);
            resolve(filename);
        });
    }

    /**
     * PDF Strategy 3: Smart chunked PDF
     */
    async exportPDFSmart(element, filename) {
        this.reportProgress('Preparing smart PDF export...', 10);
        
        const sections = await this.createLogicalSections(element);
        const { jsPDF } = window.jspdf;
        
        const pdf = new jsPDF({
            orientation: this.options.pdfOrientation,
            unit: 'mm',
            format: this.options.pdfFormat,
            compress: true
        });
        
        const pageHeight = pdf.internal.pageSize.getHeight() - this.options.pdfMargin.top - this.options.pdfMargin.bottom;
        let currentY = this.options.pdfMargin.top;
        let isFirstPage = true;
        
        for (let i = 0; i < sections.length; i++) {
            if (this.abortController?.signal.aborted) {
                throw new Error('Export cancelled');
            }
            
            const progress = 10 + (i / sections.length) * 80;
            this.reportProgress(`Processing section ${i + 1}/${sections.length}...`, progress);
            
            try {
                const canvas = await this.captureWithRetry(sections[i].element, {
                    scale: 2,
                    backgroundColor: 'transparent',
                    useCORS: true,
                    allowTaint: true,
                    onclone: (clonedDoc) => this.optimizeForPDF(clonedDoc)
                });
                
                const imgData = canvas.toDataURL('image/png', this.options.pdfQuality);
                const dimensions = this.calculatePDFDimensions(pdf, canvas, pageHeight - currentY);
                
                // Check if we need a new page
                if (!isFirstPage && currentY + dimensions.height > pageHeight) {
                    pdf.addPage();
                    currentY = this.options.pdfMargin.top;
                }
                
                pdf.addImage(
                    imgData,
                    'PNG',
                    this.options.pdfMargin.left,
                    currentY,
                    dimensions.width,
                    dimensions.height
                );
                
                currentY += dimensions.height + 5; // Small gap between sections
                isFirstPage = false;
                
                await this.delay(this.options.chunkDelay);
            } catch (error) {
                console.warn(`Failed to process section ${i + 1}:`, error);
            } finally {
                this.cleanupElement(sections[i].element);
            }
        }
        
        this.reportProgress('Finalizing PDF...', 95);
        pdf.save(filename);
        this.reportProgress('Smart PDF export complete!', 100);
        
        // Explicitly call reportSuccess to ensure UI cleanup
        setTimeout(() => {
            this.reportSuccess(filename);
        }, 1500);
        
        return filename;
    }

    /**
     * PDF Strategy 4: Advanced chunked with page awareness
     */
    async exportPDFChunked(element, filename) {
        this.reportProgress('Preparing advanced chunked PDF...', 10);
        
        const chunks = await this.createPageAwareChunks(element);
        const { jsPDF } = window.jspdf;
        
        const pdf = new jsPDF({
            orientation: this.options.pdfOrientation,
            unit: 'mm',
            format: this.options.pdfFormat,
            compress: true
        });
        
        // Remove the first empty page
        pdf.deletePage(1);
        
        for (let i = 0; i < chunks.length; i++) {
            if (this.abortController?.signal.aborted) {
                throw new Error('Export cancelled');
            }
            
            const progress = 10 + (i / chunks.length) * 80;
            this.reportProgress(`Processing chunk ${i + 1}/${chunks.length}...`, progress);
            
            try {
                pdf.addPage();
                
                const canvas = await this.captureWithRetry(chunks[i].element, {
                    scale: 2,
                    backgroundColor: this.options.backgroundColor,
                    useCORS: true,
                    allowTaint: true,
                    onclone: (clonedDoc) => this.optimizeForPDF(clonedDoc)
                });
                
                const imgData = canvas.toDataURL('image/png', this.options.pdfQuality);
                const pdfWidth = pdf.internal.pageSize.getWidth() - this.options.pdfMargin.left - this.options.pdfMargin.right;
                const pdfHeight = pdf.internal.pageSize.getHeight() - this.options.pdfMargin.top - this.options.pdfMargin.bottom;
                
                const ratio = canvas.width / pdfWidth;
                const scaledHeight = Math.min(canvas.height / ratio, pdfHeight);
                
                pdf.addImage(
                    imgData,
                    'PNG',
                    this.options.pdfMargin.left,
                    this.options.pdfMargin.top,
                    pdfWidth,
                    scaledHeight
                );
                
                await this.delay(this.options.chunkDelay);
            } catch (error) {
                console.warn(`Failed to process chunk ${i + 1}:`, error);
            } finally {
                this.cleanupElement(chunks[i].element);
            }
        }
        
        this.reportProgress('Finalizing chunked PDF...', 95);
        pdf.save(filename);
        this.reportProgress('Chunked PDF export complete!', 100);
        
        // Explicitly call reportSuccess to ensure UI cleanup
        setTimeout(() => {
            this.reportSuccess(filename);
        }, 1500);
        
        return filename;
    }

    // ========== UTILITY FUNCTIONS ==========

    /**
     * Capture with retry logic and enhanced error handling
     */
    async captureWithRetry(element, options = {}, attempts = 0) {
        try {
            if (this.abortController?.signal.aborted) {
                throw new Error('Operation cancelled');
            }
            
            const defaultOptions = {
                scale: this.options.scale,
                useCORS: true,
                allowTaint: true,
                backgroundColor: this.options.backgroundColor,
                width: element.scrollWidth,
                height: element.scrollHeight,
                scrollX: 0,
                scrollY: 0,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
                timeout: this.options.timeout / this.options.retryAttempts,
                logging: false, // Reduce console spam
                ...options
            };
            
            return await html2canvas(element, defaultOptions);
        } catch (error) {
            if (attempts < this.options.retryAttempts - 1) {
                console.warn(`Capture attempt ${attempts + 1} failed, retrying...`, error.message);
                await this.delay(1000 * (attempts + 1));
                return this.captureWithRetry(element, options, attempts + 1);
            }
            throw new Error(`Capture failed after ${this.options.retryAttempts} attempts: ${error.message}`);
        }
    }

    /**
     * Capture a specific tile of the element
     */
    async captureTile(element, x, y, width, height, scale) {
        const tileElement = await this.createTileElement(element, x, y, width, height);
        
        try {
            return await this.captureWithRetry(tileElement, {
                scale: scale,
                width: width,
                height: height,
                scrollX: 0,
                scrollY: 0,
                backgroundColor: 'transparent'
            });
        } finally {
            this.cleanupElement(tileElement);
        }
    }

    /**
     * Create a tile element with specific viewport
     */
    async createTileElement(element, x, y, width, height) {
        const tileContainer = document.createElement('div');
        tileContainer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            width: ${width}px;
            height: ${height}px;
            overflow: hidden;
            background: ${this.options.backgroundColor};
        `;
        
        const clonedElement = element.cloneNode(true);
        clonedElement.style.cssText = `
            position: relative;
            left: ${-x}px;
            top: ${-y}px;
            width: ${element.scrollWidth}px;
            height: ${element.scrollHeight}px;
        `;
        
        tileContainer.appendChild(clonedElement);
        document.body.appendChild(tileContainer);
        
        await this.waitForContentLoad(tileContainer);
        return tileContainer;
    }

    /**
     * Create logical sections for progressive rendering
     */
    async createLogicalSections(element) {
        const sections = [];
        const children = Array.from(element.children);
        
        for (const child of children) {
            const section = await this.createSectionElement(child);
            const rect = child.getBoundingClientRect();
            
            sections.push({
                element: section,
                height: rect.height,
                type: child.tagName.toLowerCase()
            });
        }
        
        return sections;
    }

    /**
     * Create page-aware chunks for PDF
     */
    async createPageAwareChunks(element) {
        const chunks = [];
        const pageHeight = 800; // Approximate page height in pixels
        const children = Array.from(element.children);
        
        let currentChunk = [];
        let currentHeight = 0;
        
        for (const child of children) {
            const childHeight = child.getBoundingClientRect().height;
            
            // If child is larger than page, create dedicated chunk
            if (childHeight > pageHeight * 0.9) {
                if (currentChunk.length > 0) {
                    chunks.push(await this.createChunkElement(currentChunk));
                    currentChunk = [];
                    currentHeight = 0;
                }
                chunks.push(await this.createChunkElement([child]));
            }
            // If adding child would exceed page height
            else if (currentHeight + childHeight > pageHeight && currentChunk.length > 0) {
                chunks.push(await this.createChunkElement(currentChunk));
                currentChunk = [child];
                currentHeight = childHeight;
            }
            // Add to current chunk
            else {
                currentChunk.push(child);
                currentHeight += childHeight;
            }
        }
        
        // Add remaining elements
        if (currentChunk.length > 0) {
            chunks.push(await this.createChunkElement(currentChunk));
        }
        
        return chunks.map(element => ({ element }));
    }

    /**
     * Create section element for rendering
     */
    async createSectionElement(element) {
        const container = document.createElement('div');
        container.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            width: ${element.getBoundingClientRect().width}px;
            background: transparent;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
        `;
        
        container.appendChild(element.cloneNode(true));
        document.body.appendChild(container);
        
        await this.waitForContentLoad(container);
        return container;
    }

    /**
     * Create chunk element with multiple children
     */
    async createChunkElement(elements) {
        const container = document.createElement('div');
        container.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            width: ${this.getOriginalWidth()}px;
            background: ${this.options.backgroundColor};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
            line-height: 1.8;
            color: #333;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        elements.forEach(el => {
            container.appendChild(el.cloneNode(true));
        });
        
        document.body.appendChild(container);
        await this.waitForContentLoad(container);
        
        return container;
    }

    /**
     * Optimize cloned document for PNG export
     */
    optimizeForPNG(clonedDoc) {
        // Ensure high contrast and visibility
        const elements = clonedDoc.querySelectorAll('*');
        elements.forEach(el => {
            const style = clonedDoc.defaultView.getComputedStyle(el);
            
            // Fix transparent backgrounds
            if (style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent') {
                el.style.backgroundColor = 'inherit';
            }
            
            // Ensure text is visible
            if (style.color === 'transparent') {
                el.style.color = '#333333';
            }
            
            // Fix font loading
            if (style.fontFamily.includes('system-ui')) {
                el.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            }
        });
        
        // Handle Mermaid diagrams
        const mermaidElements = clonedDoc.querySelectorAll('.mermaid');
        mermaidElements.forEach(el => {
            el.style.backgroundColor = 'white';
            el.style.border = '1px solid #e2e8f0';
            el.style.borderRadius = '8px';
            el.style.padding = '15px';
            el.style.margin = '10px 0';
        });
        
        // Fix code blocks
        const codeBlocks = clonedDoc.querySelectorAll('pre, code');
        codeBlocks.forEach(el => {
            if (el.tagName === 'PRE') {
                el.style.backgroundColor = '#f8f9fa';
                el.style.border = '1px solid #e9ecef';
                el.style.padding = '15px';
                el.style.borderRadius = '6px';
            }
        });
    }

    /**
     * Optimize cloned document for PDF export
     */
    optimizeForPDF(clonedDoc) {
        // PDF-specific optimizations
        const elements = clonedDoc.querySelectorAll('*');
        elements.forEach(el => {
            const style = clonedDoc.defaultView.getComputedStyle(el);
            
            // Remove shadows for cleaner PDF
            el.style.boxShadow = 'none';
            el.style.textShadow = 'none';
            
            // Ensure solid backgrounds
            if (style.backgroundImage && style.backgroundImage !== 'none') {
                el.style.backgroundImage = 'none';
                el.style.backgroundColor = '#ffffff';
            }
            
            // Fix gradients
            if (style.background.includes('gradient')) {
                el.style.background = '#ffffff';
            }
            
            // Ensure print-friendly colors
            if (style.color === 'white' || style.color === '#ffffff') {
                el.style.color = '#000000';
            }
        });
        
        // Optimize tables for PDF
        const tables = clonedDoc.querySelectorAll('table');
        tables.forEach(table => {
            table.style.pageBreakInside = 'avoid';
            table.style.borderCollapse = 'collapse';
            table.style.width = '100%';
            
            const cells = table.querySelectorAll('th, td');
            cells.forEach(cell => {
                cell.style.border = '1px solid #333';
                cell.style.padding = '8px';
            });
        });
        
        // Optimize headings for PDF
        const headings = clonedDoc.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(heading => {
            heading.style.pageBreakAfter = 'avoid';
            heading.style.pageBreakInside = 'avoid';
            heading.style.background = 'none';
            heading.style.color = '#000000';
        });
    }

    /**
     * Download canvas as image
     */
    async downloadCanvas(canvas, filename, format = 'png') {
        return new Promise((resolve, reject) => {
            try {
                // Store this for use in callbacks
                const self = this;
                
                // For very large canvases, use a different approach
                if (canvas.width * canvas.height > 16777216) { // 4096 x 4096 threshold
                    console.log('Large canvas detected, using alternative export method');
                    // Show a message to the user suggesting PDF export for large content
                    setTimeout(() => {
                        alert('Large content detected. If the PNG export quality is not satisfactory, try exporting to PDF instead for better results with large documents.');
                    }, 1000);
                    try {
                        // Try using dataURL with reduced quality for large canvases
                        const quality = format === 'png' ? 0.9 : 0.7; // Increased quality for PNG
                        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
                        
                        // Use dataURL instead of blob for large canvases
                        const dataUrl = canvas.toDataURL(mimeType, quality);
                        
                        // Verify dataUrl is not empty
                        if (dataUrl.length <= 22) { // "data:image/png;base64," is 22 chars
                            throw new Error("Generated dataURL is empty");
                        }
                        
                        const link = document.createElement('a');
                        link.download = filename;
                        link.href = dataUrl;
                        document.body.appendChild(link); // Append to body for Firefox
                        link.click();
                        
                        // Cleanup
                        setTimeout(() => {
                            document.body.removeChild(link);
                            // Report success after download starts
                            if (self.reportSuccess) {
                                self.reportSuccess(filename);
                            }
                        }, 1000);
                        
                        resolve(filename);
                    } catch (dataUrlError) {
                        console.error('DataURL method failed:', dataUrlError);
                        // Fall back to JPEG with even lower quality
                        self.fallbackImageDownload(canvas, filename);
                        resolve(filename);
                    }
                    return;
                }
                
                // Standard approach for normal-sized canvases
                const quality = format === 'png' ? (this.options?.pngQuality || 0.9) : 0.9;
                const mimeType = `image/${format}`;
                
                canvas.toBlob(function(blob) {
                    if (!blob || blob.size === 0) {
                        console.warn('Blob creation failed or empty blob, trying alternative method');
                        self.fallbackImageDownload(canvas, filename);
                        resolve(filename);
                        return;
                    }
                    
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = filename;
                    link.href = url;
                    document.body.appendChild(link); // Append to body for Firefox
                    link.click();
                    
                    // Cleanup
                    setTimeout(() => {
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        if (self.reportSuccess) {
                            self.reportSuccess(filename);
                        }
                    }, 1000);
                    resolve(filename);
                }, mimeType, quality);
            } catch (error) {
                console.error('Canvas download error:', error);
                // Try fallback method
                this.fallbackImageDownload(canvas, filename);
                resolve(filename);
            }
        });
    }
    
    /**
     * Fallback method for downloading images when standard methods fail
     */
    fallbackImageDownload(canvas, filename) {
        try {
            // Store this for use in callbacks
            const self = this;
            
            // Try a direct approach with PNG first at lower quality
            try {
                const pngDataUrl = canvas.toDataURL('image/png', 0.7);
                if (pngDataUrl.length > 22) { // Check if not empty
                    const link = document.createElement('a');
                    link.download = filename;
                    link.href = pngDataUrl;
                    document.body.appendChild(link);
                    link.click();
                    
                    setTimeout(() => {
                        document.body.removeChild(link);
                        if (self.reportSuccess) {
                            self.reportSuccess(filename);
                        }
                    }, 1000);
                    
                    console.log("Used fallback PNG method");
                    return true;
                }
            } catch (pngError) {
                console.warn("Fallback PNG failed:", pngError);
            }
            
            // Last resort: Use JPEG with medium quality
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            if (dataUrl.length <= 22) {
                throw new Error("Generated JPEG dataURL is empty");
            }
            
            const link = document.createElement('a');
            link.download = filename.replace(/\.png$/, '.jpg');
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            
            alert('PNG export failed due to image size. A lower-quality JPEG has been downloaded instead.');
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                if (self.reportSuccess) {
                    self.reportSuccess(filename);
                }
            }, 1000);
            return true;
        } catch (fallbackError) {
            console.error('All export methods failed:', fallbackError);
            alert('Export failed. The image may be too large to process. Try exporting a smaller section or reducing content.');
            return false;
        }
    }

    /**
     * Add canvas to PDF with proper scaling
     */
    async addCanvasToPDF(pdf, canvas, filename) {
        try {
            // Use JPEG format instead of PNG for better compatibility
            const imgData = canvas.toDataURL('image/jpeg', this.options.pdfQuality);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = imgWidth / pdfWidth;
            const scaledHeight = imgHeight / ratio;
            
            // Log dimensions for debugging
            console.log('Advanced PDF export dimensions:', {
                canvasWidth: imgWidth,
                canvasHeight: imgHeight,
                pdfWidth,
                pdfHeight,
                ratio,
                scaledHeight,
                quality: this.options.pdfQuality
            });
            
            if (scaledHeight <= pdfHeight) {
                // Single page with error handling
                try {
                    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, scaledHeight);
                } catch (imageError) {
                    console.warn('Error adding image to PDF, trying with lower quality:', imageError);
                    // Fallback to lower quality
                    const fallbackImgData = canvas.toDataURL('image/jpeg', 0.5);
                    pdf.addImage(fallbackImgData, 'JPEG', 0, 0, pdfWidth, scaledHeight);
                }
            } else {
                // Check if content is too large
                if (scaledHeight > pdfHeight * 20) {
                    console.warn('Content too large for PDF, using chunked approach');
                    // Use chunked approach for very large content
                    await this.addLargeCanvasToPDF(pdf, canvas, filename);
                    return;
                }
                
                // Multiple pages with error handling
                let remainingHeight = scaledHeight;
                let currentPosition = 0;
                let pageCount = 0;
                const maxPages = 20; // Safety limit
                
                try {
                    // First page
                    pdf.addImage(imgData, 'JPEG', 0, currentPosition, pdfWidth, scaledHeight);
                    remainingHeight -= pdfHeight;
                    pageCount++;
                    
                    // Additional pages if needed
                    while (remainingHeight > 0 && pageCount < maxPages) {
                        currentPosition -= pdfHeight;
                        pdf.addPage();
                        pdf.addImage(imgData, 'JPEG', 0, currentPosition, pdfWidth, scaledHeight);
                        remainingHeight -= pdfHeight;
                        pageCount++;
                    }
                    
                    // Add warning if content was truncated
                    if (pageCount >= maxPages && remainingHeight > 0) {
                        pdf.addPage();
                        pdf.setFontSize(12);
                        pdf.setTextColor(100, 100, 100);
                        pdf.text('Note: Content was truncated due to size limitations.', 10, 20);
                    }
                } catch (multiPageError) {
                    console.error('Error in multi-page PDF generation:', multiPageError);
                    // Fallback to chunked approach
                    await this.addLargeCanvasToPDF(pdf, canvas, filename);
                    return;
                }
            }
            
            pdf.save(filename);
        } catch (error) {
            console.error('Critical error in PDF generation:', error);
            // Create a simple PDF with error message
            pdf.setFontSize(16);
            pdf.setTextColor(255, 0, 0);
            pdf.text('Error generating PDF from content.', 20, 30);
            pdf.setFontSize(12);
            pdf.setTextColor(0, 0, 0);
            pdf.text('The content may be too large or complex to render as PDF.', 20, 50);
            pdf.text('Please try exporting a smaller section or use PNG export instead.', 20, 70);
            pdf.save(filename);
        }
    }

    /**
     * Handle very large canvas content by breaking it into chunks
     * This is a fallback method for when the standard approach fails
     */
    async addLargeCanvasToPDF(pdf, canvas, filename) {
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight() - 20; // Leave margin
        const chunkHeight = 800; // Height of each chunk in pixels
        
        // Calculate dimensions
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / pdfWidth;
        const scaledTotalHeight = imgHeight / ratio;
        
        // Create temporary canvas for chunks
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = Math.min(chunkHeight * ratio, canvas.height);
        
        // Process in chunks
        let processedHeight = 0;
        let isFirstPage = true;
        
        this.reportProgress('Processing large content in chunks...', 50);
        
        while (processedHeight < imgHeight) {
            // Clear temp canvas
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            // Calculate chunk size
            const sourceHeight = Math.min(chunkHeight * ratio, imgHeight - processedHeight);
            tempCanvas.height = sourceHeight;
            
            // Draw portion of original canvas to temp canvas
            tempCtx.drawImage(
                canvas,
                0, processedHeight, // Source x, y
                imgWidth, sourceHeight, // Source width, height
                0, 0, // Dest x, y
                imgWidth, sourceHeight // Dest width, height
            );
            
            // Add new page if not first chunk
            if (!isFirstPage) {
                pdf.addPage();
            }
            
            try {
                // Convert chunk to image and add to PDF
                const chunkImgData = tempCanvas.toDataURL('image/jpeg', 0.7);
                const scaledHeight = sourceHeight / ratio;
                
                pdf.addImage(
                    chunkImgData,
                    'JPEG',
                    0, 0, // Position
                    pdfWidth, scaledHeight // Dimensions
                );
                
                // Update progress
                processedHeight += sourceHeight;
                const progress = Math.min(50 + (processedHeight / imgHeight) * 40, 90);
                this.reportProgress(`Processing chunk ${Math.ceil(processedHeight / sourceHeight)}...`, progress);
                
                isFirstPage = false;
                
                // Small delay to prevent UI blocking
                await this.delay(50);
            } catch (error) {
                console.error('Error processing chunk:', error);
                // If a chunk fails, add an error message and continue
                pdf.setFontSize(10);
                pdf.setTextColor(255, 0, 0);
                pdf.text('Error rendering this section of content.', 10, 10);
            }
        }
        
        // Add final note
        pdf.addPage();
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Note: This PDF was generated using chunked rendering due to the large content size.', 10, 20);
        pdf.text('Some quality reduction may have occurred in the process.', 10, 35);
        
        this.reportProgress('Finalizing chunked PDF...', 95);
        pdf.save(filename);
    }

    /**
     * Calculate PDF dimensions maintaining aspect ratio
     */
    calculatePDFDimensions(pdf, canvas, availableHeight) {
        const pdfWidth = pdf.internal.pageSize.getWidth() - this.options.pdfMargin.left - this.options.pdfMargin.right;
        const ratio = canvas.width / pdfWidth;
        const scaledHeight = canvas.height / ratio;
        
        return {
            width: pdfWidth,
            height: Math.min(scaledHeight, availableHeight)
        };
    }

    /**
     * Prepare element for capture
     */
    async prepareElementForCapture(element) {
        const clone = element.cloneNode(true);
        clone.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            width: ${element.scrollWidth}px;
            background: ${this.options.backgroundColor};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
        `;
        
        document.body.appendChild(clone);
        await this.waitForContentLoad(clone);
        
        return clone;
    }

    /**
     * Wait for content to load (images, fonts, etc.)
     */
    async waitForContentLoad(element) {
        // Wait for images
        const images = element.querySelectorAll('img');
        const imagePromises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve; // Don't fail on broken images
                setTimeout(resolve, 3000); // Timeout after 3 seconds
            });
        });
        
        await Promise.all(imagePromises);
        
        // Wait for fonts
        if (document.fonts) {
            await document.fonts.ready;
        }
        
        // Wait for Mermaid diagrams
        const mermaidElements = element.querySelectorAll('.mermaid');
        if (mermaidElements.length > 0) {
            await this.delay(1000); // Extra time for Mermaid
        }
        
        // Additional delay for complex content
        await this.delay(500);
    }

    /**
     * Prepare content for CSS print
     */
    prepareContentForPrint(element) {
        const clone = element.cloneNode(true);
        
        // Remove non-printable elements
        const elementsToRemove = clone.querySelectorAll('button, .no-print, .toolbar, .controls');
        elementsToRemove.forEach(el => el.remove());
        
        // Optimize for print
        const headings = clone.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(heading => {
            heading.style.background = 'none';
            heading.style.color = '#000000';
            heading.style.pageBreakAfter = 'avoid';
        });
        
        return clone.innerHTML;
    }

    /**
     * Generate advanced CSS for print
     */
    generateAdvancedPrintCSS() {
        return `
            @page {
                size: ${this.options.pdfFormat};
                margin: ${this.options.pdfMargin.top}mm ${this.options.pdfMargin.right}mm ${this.options.pdfMargin.bottom}mm ${this.options.pdfMargin.left}mm;
                @bottom-right {
                    content: counter(page) " / " counter(pages);
                    font-size: 10px;
                    color: #666;
                }
            }
            
            * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                background: white;
                margin: 0;
                padding: 0;
                font-size: 12pt;
            }
            
            .export-content {
                max-width: none;
                padding: 0;
            }
            
            h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
                break-after: avoid;
                page-break-inside: avoid;
                break-inside: avoid;
                margin-top: 1.5em;
                margin-bottom: 0.5em;
                color: #000 !important;
                background: none !important;
            }
            
            h1 { font-size: 24pt; }
            h2 { font-size: 20pt; }
            h3 { font-size: 16pt; }
            h4 { font-size: 14pt; }
            h5 { font-size: 12pt; }
            h6 { font-size: 11pt; }
            
            p {
                margin: 0.5em 0;
                orphans: 2;
                widows: 2;
            }
            
            pre, table, .mermaid, blockquote, img {
                page-break-inside: avoid;
                break-inside: avoid;
                margin: 1em 0;
            }
            
            pre {
                background: #f8f9fa !important;
                border: 1px solid #e9ecef !important;
                padding: 12pt;
                border-radius: 4pt;
                font-size: 10pt;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
            
            code {
                background: #f8f9fa !important;
                padding: 2pt 4pt;
                border-radius: 2pt;
                font-size: 10pt;
                border: 1px solid #e9ecef;
            }
            
            pre code {
                background: none !important;
                border: none !important;
                padding: 0;
            }
            
            table {
                border-collapse: collapse;
                width: 100%;
                font-size: 10pt;
            }
            
            th, td {
                border: 1px solid #333 !important;
                padding: 6pt;
                text-align: left;
                vertical-align: top;
            }
            
            th {
                background: #f5f5f5 !important;
                font-weight: bold;
            }
            
            blockquote {
                border-left: 3pt solid #333;
                margin: 1em 0;
                padding: 0.5em 1em;
                background: #f9f9f9 !important;
                font-style: italic;
            }
            
            img {
                max-width: 100%;
                height: auto;
                page-break-inside: avoid;
            }
            
            .mermaid {
                background: white !important;
                border: 1pt solid #ddd !important;
                padding: 12pt;
                margin: 1em 0;
                text-align: center;
                page-break-inside: avoid;
            }
            
            ul, ol {
                margin: 0.5em 0;
                padding-left: 2em;
            }
            
            li {
                margin: 0.25em 0;
            }
            
            a {
                color: #0066cc;
                text-decoration: underline;
            }
            
            a[href^="http"]:after {
                content: " (" attr(href) ")";
                font-size: 9pt;
                color: #666;
            }
            
            strong, b {
                font-weight: bold;
            }
            
            em, i {
                font-style: italic;
            }
            
            .page-break {
                page-break-before: always;
                break-before: page;
            }
            
            @media print {
                body { font-size: 12pt; }
                .no-print { display: none !important; }
            }
        `;
    }

    /**
     * Get original element width
     */
    getOriginalWidth() {
        const preview = document.getElementById('preview');
        return preview ? preview.scrollWidth : 800;
    }

    /**
     * Report progress to callback
     */
    reportProgress(message, percentage) {
        if (this.options.onProgress) {
            this.options.onProgress({ 
                message, 
                percentage,
                format: this.exportStats.format,
                elapsed: Date.now() - this.exportStats.startTime
            });
        }
        console.log(`${this.exportStats.format} Export: ${message} (${percentage}%)`);
    }

    /**
     * Handle errors
     */
    handleError(error) {
        if (this.options.onError) {
            this.options.onError(error);
        }
        console.error(`${this.exportStats.format} Export Error:`, error);
    }

    /**
     * Success callback
     */
    reportSuccess(filename) {
        const stats = {
            filename,
            format: this.exportStats?.format || 'Unknown',
            duration: this.exportStats ? (Date.now() - this.exportStats.startTime) : 0
        };
        
        if (this.options && this.options.onSuccess) {
            this.options.onSuccess(stats);
        }
        
        // Also handle the progress UI directly as a fallback
        const progressModal = document.getElementById('exportProgress');
        const progressOverlay = document.getElementById('exportOverlay');
        const loadingIndicator = document.getElementById('loading');
        
        if (progressModal) progressModal.style.display = 'none';
        if (progressOverlay) progressOverlay.style.display = 'none';
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        console.log(`${stats.format} Export completed:`, stats);
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.isExporting = false;
        this.abortController = null;
        
        // Cleanup any temporary elements
        const tempElements = document.querySelectorAll('.pdf-chunk, .export-temp');
        tempElements.forEach(el => this.cleanupElement(el));
    }

    /**
     * Clean up a specific element
     */
    cleanupElement(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }

    /**
     * Cancel current export
     */
    cancel() {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.reportProgress('Export cancelled', 0);
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ========== ENHANCED EXPORT FUNCTIONS ==========

/**
 * Enhanced PNG download function using the advanced system with progress UI
 */
async function downloadAsPngAdvanced() {
    const preview = document.getElementById('preview');
    const fileInput = document.getElementById('file-input');
    const loadingIndicator = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    const downloadPngBtn = document.getElementById('download-png-btn');
    
    // Get progress UI elements if they exist
    const progressModal = document.getElementById('exportProgress');
    const progressOverlay = document.getElementById('exportOverlay');
    const progressBar = document.getElementById('exportProgressBar');
    const statusText = document.getElementById('exportStatus');
    const titleText = document.getElementById('exportTitle');
    const cancelBtn = document.getElementById('exportCancel');
    
    // Check if progress UI is available
    const useProgressUI = progressModal && progressOverlay && progressBar &&
                          statusText && titleText && cancelBtn;

    if (!preview.innerHTML || preview.innerHTML.includes('Preview will appear here')) {
        alert('Please render some content first before downloading');
        return;
    }

    let filename = 'markdown-export.png';
    if (fileInput.files.length > 0) {
        const originalName = fileInput.files[0].name.split('.')[0];
        filename = `${originalName}.png`;
    }

    // Show appropriate loading UI
    if (useProgressUI) {
        // Show progress UI
        progressModal.style.display = 'block';
        progressOverlay.style.display = 'block';
        titleText.textContent = 'Exporting PNG...';
        progressBar.style.width = '0%';
        statusText.textContent = 'Initializing...';
    } else {
        // Fallback to simple loading indicator
        loadingIndicator.style.display = 'block';
        loadingText.textContent = 'Generating high-quality PNG...';
    }

    const exporter = new AdvancedExportSystem({
        pngStrategy: 'smart', // Auto-select best strategy
        pngQuality: 0.9, // Reduced from 1.0 to improve compatibility
        scale: 2, // Reduced from 3 to prevent canvas size issues
        backgroundColor: '#ffffff',
        maxMemoryUsage: 256 * 1024 * 1024, // Reduced memory limit for better stability
        onProgress: ({ message, percentage }) => {
            if (useProgressUI) {
                progressBar.style.width = percentage + '%';
                statusText.textContent = message;
            } else {
                loadingText.textContent = message;
            }
        },
        onError: (error) => {
            console.error('PNG export failed:', error);
            alert('PNG export failed: ' + error.message);
            if (useProgressUI) {
                progressModal.style.display = 'none';
                progressOverlay.style.display = 'none';
            } else {
                loadingIndicator.style.display = 'none';
                loadingText.textContent = 'Processing...';
            }
        },
        onSuccess: (stats) => {
            console.log('PNG export successful:', stats);
            if (useProgressUI) {
                statusText.textContent = 'PNG export successful!';
                progressBar.style.width = '100%';
                setTimeout(() => {
                    progressModal.style.display = 'none';
                    progressOverlay.style.display = 'none';
                }, 2000);
            } else {
                loadingText.textContent = 'PNG export successful!';
                setTimeout(() => {
                    loadingIndicator.style.display = 'none';
                    loadingText.textContent = 'Processing...';
                }, 2000);
            }
        }
    });

    // Setup cancel functionality if progress UI is available
    if (useProgressUI && cancelBtn) {
        cancelBtn.onclick = () => {
            exporter.cancel();
            progressModal.style.display = 'none';
            progressOverlay.style.display = 'none';
        };
    }

    try {
        await exporter.exportToPNG(preview, filename);
        downloadPngBtn.blur();
        
        // Ensure UI is cleaned up
        setTimeout(() => {
            if (useProgressUI) {
                progressModal.style.display = 'none';
                progressOverlay.style.display = 'none';
            } else {
                loadingIndicator.style.display = 'none';
            }
        }, 2000);
    } catch (error) {
        // Error already handled in onError callback
        if (useProgressUI) {
            progressModal.style.display = 'none';
            progressOverlay.style.display = 'none';
        } else {
            loadingIndicator.style.display = 'none';
        }
    }
}

/**
 * Enhanced PDF download function using the advanced system with progress UI
 */
async function downloadAsPdfAdvanced() {
    const preview = document.getElementById('preview');
    const fileInput = document.getElementById('file-input');
    const loadingIndicator = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    
    // Get progress UI elements if they exist
    const progressModal = document.getElementById('exportProgress');
    const progressOverlay = document.getElementById('exportOverlay');
    const progressBar = document.getElementById('exportProgressBar');
    const statusText = document.getElementById('exportStatus');
    const titleText = document.getElementById('exportTitle');
    const cancelBtn = document.getElementById('exportCancel');
    
    // Check if progress UI is available
    const useProgressUI = progressModal && progressOverlay && progressBar &&
                          statusText && titleText && cancelBtn;

    if (!preview.innerHTML || preview.innerHTML.includes('Preview will appear here')) {
        alert('Please render some content first before downloading');
        return;
    }

    let filename = 'markdown-export.pdf';
    if (fileInput.files.length > 0) {
        const originalName = fileInput.files[0].name.split('.')[0];
        filename = `${originalName}.pdf`;
    }

    // Check if content is large and complex enough to require advanced approach
    const contentHeight = preview.scrollHeight;
    const complexElementCount = preview.querySelectorAll('img, svg, canvas, .mermaid, table, iframe').length;
    const isLargeContent = contentHeight > 8000 || complexElementCount > 10;
    
    console.log('PDF Export Content Analysis:', {
        height: contentHeight,
        complexElements: complexElementCount,
        isLargeContent: isLargeContent
    });
    
    // Use simple direct approach by default unless content is very large
    if (!isLargeContent) {
        console.log('Using simple PDF export approach');
        await downloadAsPdfSimple(preview, filename, useProgressUI, {
            progressModal, progressOverlay, progressBar, statusText, titleText, loadingIndicator, loadingText
        });
        downloadPdfBtn.blur();
        return;
    }
    
    console.log('Using advanced PDF export approach for large content');

    // Show appropriate loading UI
    if (useProgressUI) {
        // Show progress UI
        progressModal.style.display = 'block';
        progressOverlay.style.display = 'block';
        titleText.textContent = 'Exporting PDF...';
        progressBar.style.width = '0%';
        statusText.textContent = 'Initializing...';
    } else {
        // Fallback to simple loading indicator
        loadingIndicator.style.display = 'block';
        loadingText.textContent = 'Generating high-quality PDF...';
    }

    const exporter = new AdvancedExportSystem({
        pdfStrategy: 'smart', // Auto-select best strategy
        pdfQuality: 0.85, // Lower quality for better compatibility
        scale: 2, // Balanced for PDF
        pdfFormat: 'a4',
        pdfOrientation: 'portrait',
        pdfMargin: { top: 15, bottom: 15, left: 15, right: 15 },
        backgroundColor: '#ffffff',
        maxMemoryUsage: 256 * 1024 * 1024, // Lower memory limit for better stability
        onProgress: ({ message, percentage }) => {
            if (useProgressUI) {
                progressBar.style.width = percentage + '%';
                statusText.textContent = message;
            } else {
                loadingText.textContent = message;
            }
        },
        onError: (error) => {
            console.error('PDF export failed:', error);
            alert('PDF export failed: ' + error.message);
            if (useProgressUI) {
                progressModal.style.display = 'none';
                progressOverlay.style.display = 'none';
            } else {
                loadingIndicator.style.display = 'none';
                loadingText.textContent = 'Processing...';
            }
        },
        onSuccess: (stats) => {
            console.log('PDF export successful:', stats);
            if (useProgressUI) {
                statusText.textContent = 'PDF export successful!';
                progressBar.style.width = '100%';
                setTimeout(() => {
                    progressModal.style.display = 'none';
                    progressOverlay.style.display = 'none';
                }, 2000);
            } else {
                loadingText.textContent = 'PDF export successful!';
                setTimeout(() => {
                    loadingIndicator.style.display = 'none';
                    loadingText.textContent = 'Processing...';
                }, 2000);
            }
        }
    });

    // Setup cancel functionality if progress UI is available
    if (useProgressUI && cancelBtn) {
        cancelBtn.onclick = () => {
            exporter.cancel();
            progressModal.style.display = 'none';
            progressOverlay.style.display = 'none';
        };
    }

    try {
        await exporter.exportToPDF(preview, filename);
        downloadPdfBtn.blur();
        
        // Ensure UI is cleaned up
        setTimeout(() => {
            if (useProgressUI) {
                progressModal.style.display = 'none';
                progressOverlay.style.display = 'none';
            } else {
                loadingIndicator.style.display = 'none';
            }
        }, 2000);
    } catch (error) {
        // Error already handled in onError callback
        if (useProgressUI) {
            progressModal.style.display = 'none';
            progressOverlay.style.display = 'none';
        } else {
            loadingIndicator.style.display = 'none';
        }
    }
}

/**
 * Simple direct PDF export for small content
 * This uses the original approach that worked well for small PDFs
 */
async function downloadAsPdfSimple(preview, filename, useProgressUI, ui) {
    // Update UI
    if (useProgressUI) {
        ui.progressModal.style.display = 'block';
        ui.progressOverlay.style.display = 'block';
        ui.titleText.textContent = 'Exporting PDF...';
        ui.progressBar.style.width = '0%';
        ui.statusText.textContent = 'Initializing simple PDF export...';
    } else {
        ui.loadingIndicator.style.display = 'block';
        ui.loadingText.textContent = 'Generating PDF...';
    }
    
    try {
        // Update progress
        const updateProgress = (message, percentage) => {
            if (useProgressUI) {
                ui.progressBar.style.width = percentage + '%';
                ui.statusText.textContent = message;
            } else {
                ui.loadingText.textContent = message;
            }
            console.log(`PDF Export: ${message} (${percentage}%)`);
        };
        
        updateProgress('Capturing content...', 20);
        
        // Use html2canvas with balanced quality settings
        const canvas = await html2canvas(preview, {
            scale: 2, // Good balance between quality and file size
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: preview.scrollWidth,
            height: preview.scrollHeight,
            onclone: function(clonedDoc) {
                const clonedPreview = clonedDoc.querySelector('.preview');
                if (clonedPreview) {
                    clonedPreview.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, sans-serif';
                    clonedPreview.style.fontSize = '16px';
                    clonedPreview.style.lineHeight = '1.8';
                }
            }
        });
        
        updateProgress('Creating PDF...', 60);
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });
        
        // Convert to high-quality PNG then to PDF
        const imgData = canvas.toDataURL('image/png', 0.95);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / pdfWidth;
        const scaledHeight = imgHeight / ratio;
        
        updateProgress('Adding content to PDF...', 80);
        
        if (scaledHeight <= pdfHeight) {
            // Single page PDF
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, scaledHeight);
        } else {
            // Multi-page PDF
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
        
        updateProgress('Saving PDF...', 90);
        pdf.save(filename);
        
        updateProgress('PDF export complete!', 100);
        
        // Clean up UI
        setTimeout(() => {
            if (useProgressUI) {
                ui.progressModal.style.display = 'none';
                ui.progressOverlay.style.display = 'none';
            } else {
                ui.loadingIndicator.style.display = 'none';
                ui.loadingText.textContent = 'Processing...';
            }
        }, 2000);
        
        console.log('PDF export successful:', { filename, approach: 'simple' });
        return true;
    } catch (error) {
        console.error('Simple PDF export failed:', error);
        
        // Clean up UI
        if (useProgressUI) {
            ui.progressModal.style.display = 'none';
            ui.progressOverlay.style.display = 'none';
        } else {
            ui.loadingIndicator.style.display = 'none';
            ui.loadingText.textContent = 'Processing...';
        }
        
        // Show error
        alert('PDF export failed: ' + error.message);
        return false;
    }
}

// ========== INTEGRATION EXAMPLES ==========

/**
 * Setup progress UI for exports
 * This function creates a modal dialog with progress bar for export operations
 */
window.setupProgressUI = function() {
    // Add this HTML to your page for enhanced progress tracking
    const progressHTML = `
        <div id="exportProgress" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
             background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 10000;">
            <h3 id="exportTitle">Exporting...</h3>
            <div style="width: 300px; height: 8px; background: #e2e8f0; border-radius: 4px; margin: 15px 0;">
                <div id="exportProgressBar" style="height: 100%; background: #4A76C4; border-radius: 4px; width: 0%; transition: width 0.3s ease;"></div>
            </div>
            <p id="exportStatus">Initializing...</p>
            <button id="exportCancel" style="margin-top: 15px; padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
        </div>
        <div id="exportOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;"></div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', progressHTML);
}

/**
 * Example: Enhanced export with progress UI
 */
async function exportWithProgressUI(format = 'pdf') {
    const progressModal = document.getElementById('exportProgress');
    const progressOverlay = document.getElementById('exportOverlay');
    const progressBar = document.getElementById('exportProgressBar');
    const statusText = document.getElementById('exportStatus');
    const titleText = document.getElementById('exportTitle');
    const cancelBtn = document.getElementById('exportCancel');
    
    // Show progress UI
    progressModal.style.display = 'block';
    progressOverlay.style.display = 'block';
    titleText.textContent = `Exporting ${format.toUpperCase()}...`;
    
    const exporter = new AdvancedExportSystem({
        [format + 'Strategy']: 'smart',
        onProgress: ({ message, percentage }) => {
            progressBar.style.width = percentage + '%';
            statusText.textContent = message;
        },
        onError: (error) => {
            alert('Export failed: ' + error.message);
            progressModal.style.display = 'none';
            progressOverlay.style.display = 'none';
        },
        onSuccess: () => {
            progressModal.style.display = 'none';
            progressOverlay.style.display = 'none';
        }
    });
    
    // Setup cancel functionality
    cancelBtn.onclick = () => {
        exporter.cancel();
        progressModal.style.display = 'none';
        progressOverlay.style.display = 'none';
    };
    
    try {
        const preview = document.getElementById('preview');
        const filename = `export.${format}`;
        
        if (format === 'png') {
            await exporter.exportToPNG(preview, filename);
        } else {
            await exporter.exportToPDF(preview, filename);
        }
    } catch (error) {
        console.error('Export failed:', error);
    }
}