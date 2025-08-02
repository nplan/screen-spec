// Screen Visualizer - Handles the visual comparison of screens
class ScreenVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.screens = [];
        this.viewMode = 'realSize';
        this.viewDistance = 800;
        this.colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
        
        // Optimization: Cache previous state for change detection
        this.lastScreensHash = null;
        this.lastViewMode = null;
        this.lastCanvasSize = { width: 0, height: 0 };
        
        this.setupHiDPI();
        this.resizeCanvas();
        
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.render();
        });
    }

    setupHiDPI() {
        this.pixelRatio = window.devicePixelRatio || 1;
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.canvas.width = rect.width * this.pixelRatio;
        this.canvas.height = rect.height * this.pixelRatio;
        
        this.ctx.scale(this.pixelRatio, this.pixelRatio);
        
        this.logicalWidth = rect.width;
        this.logicalHeight = rect.height;
        
        // Reset cache when canvas size changes
        this.lastCanvasSize = { width: rect.width, height: rect.height };
        this.lastScreensHash = null;
    }

    /**
     * Generate a hash of the screen data for change detection
     * @param {Array} screens - Array of screen objects
     * @returns {string} Hash string representing current screen state
     */
    generateScreensHash(screens) {
        if (!screens || screens.length === 0) {
            return 'empty';
        }
        
        return screens.map(screen => {
            return `${screen.diagonal}-${screen.resolution[0]}x${screen.resolution[1]}-${screen.distance}-${screen.curvature}-${screen.scaling}-${screen.screenNumber}`;
        }).sort().join('|') + `|${this.viewMode}`;
    }

    /**
     * Check if screen data has changed since last render
     * @param {Array} screens - Array of screen objects  
     * @returns {boolean} True if data has changed
     */
    hasScreenDataChanged(screens) {
        const currentHash = this.generateScreensHash(screens);
        const sizeChanged = this.lastCanvasSize.width !== this.logicalWidth || 
                          this.lastCanvasSize.height !== this.logicalHeight;
        
        if (this.lastScreensHash !== currentHash || sizeChanged) {
            this.lastScreensHash = currentHash;
            this.lastCanvasSize = { width: this.logicalWidth, height: this.logicalHeight };
            return true;
        }
        
        return false;
    }

    updateScreens(screens) {
        this.screens = screens || [];
        
        // Only render if screen data has actually changed
        if (this.hasScreenDataChanged(this.screens)) {
            this.render();
        }
    }

    setViewMode(mode) {
        if (this.viewMode !== mode) {
            this.viewMode = mode;
            this.lastScreensHash = null; // Force re-render on view mode change
            this.render();
        }
    }

    /**
     * Force a re-render regardless of change detection
     * Use this method when you need to ensure the canvas is redrawn
     */
    forceRender() {
        this.lastScreensHash = null;
        this.render();
    }

    render() {
        this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
        
        if (this.screens.length === 0) {
            this.drawNoScreensMessage();
            return;
        }

        let maxWidth = 0;
        let maxHeight = 0;

        // Calculate average distance for FOV-based comparison
        const avgDistance = this.screens.reduce((sum, screen) => sum + screen.distance, 0) / this.screens.length;

        const screenDimensions = this.screens.map(screen => {
            let width, height;
            if (this.viewMode === 'realSize') {
                width = screen.width;
                height = screen.height;
            } else {
                // Use average distance for FOV-based comparison
                const fovH = screen.fov_horizontal * Math.PI / 180;
                const fovV = screen.fov_vertical * Math.PI / 180;
                width = 2 * avgDistance * Math.tan(fovH / 2);
                height = 2 * avgDistance * Math.tan(fovV / 2);
            }
            maxWidth = Math.max(maxWidth, width);
            maxHeight = Math.max(maxHeight, height);
            return { width, height, screen };
        });

        const margin = 40;
        const availableWidth = this.logicalWidth - 2 * margin;
        const availableHeight = this.logicalHeight - 2 * margin;
        const scale = Math.min(availableWidth / maxWidth, availableHeight / maxHeight);

        // Collect all screen rectangles for label positioning
        const screenRects = screenDimensions.map(({ width, height, screen }, index) => {
            const screenWidth = width * scale;
            const screenHeight = height * scale;
            
            const x = (this.logicalWidth - screenWidth) / 2;
            const y = (this.logicalHeight - screenHeight) / 2;

            return { x, y, width: screenWidth, height: screenHeight, screen, index, screenNumber: screen.screenNumber || (index + 1) };
        });

        // Calculate label positions and resolve overlaps
        const labelPositions = this.calculateLabelPositions(screenRects);
        
        // Draw all screens with resolved label positioning
        screenRects.forEach(rect => {
            const labelPos = labelPositions[rect.index];
            this.drawScreen(rect.x, rect.y, rect.width, rect.height, rect.screen, rect.screenNumber, labelPos);
        });
    }

    calculateLabelPositions(screenRects) {
        // First pass: calculate initial label positions and dimensions
        const labels = screenRects.map(rect => {
            const screenNumber = rect.screenNumber;
            const labelText = `${screenNumber} ${rect.screen.diagonal}"`;
            
            this.ctx.font = 'bold 16px Roboto Mono, monospace';
            const textMetrics = this.ctx.measureText(labelText);
            const labelWidth = textMetrics.width + 5; // more padding
            const labelHeight = 30; // slightly taller
            
            return {
                index: rect.index,
                x: rect.x,
                y: rect.y,
                width: labelWidth,
                height: labelHeight,
                text: labelText,
                screenRect: rect
            };
        });

        // Second pass: detect and resolve overlaps
        const resolvedLabels = [...labels];
        
        // Sort labels by y position, then by x position for consistent processing
        const sortedIndices = labels
            .map((label, i) => ({ label, originalIndex: i }))
            .sort((a, b) => a.label.y - b.label.y || a.label.x - b.label.x)
            .map(item => item.originalIndex);

        // Process each label and check for overlaps with previously processed labels
        for (let i = 0; i < sortedIndices.length; i++) {
            const currentIndex = sortedIndices[i];
            const currentLabel = resolvedLabels[currentIndex];
            
            // Check overlap with all previously processed labels
            for (let j = 0; j < i; j++) {
                const otherIndex = sortedIndices[j];
                const otherLabel = resolvedLabels[otherIndex];
                
                if (this.labelsOverlap(currentLabel, otherLabel)) {
                    // Move current label to the right of the overlapping label with padding
                    const padding = 4; // pixels between labels
                    currentLabel.x = otherLabel.x + otherLabel.width + padding;
                    
                    // If moved label goes beyond screen bounds, try to fit it within screen width
                    const maxX = currentLabel.screenRect.x + currentLabel.screenRect.width - currentLabel.width;
                    if (currentLabel.x > maxX) {
                        currentLabel.x = maxX;
                        
                        // If still overlapping after constraining to screen, move other label left
                        if (this.labelsOverlap(currentLabel, otherLabel)) {
                            const shiftAmount = (otherLabel.x + otherLabel.width + padding) - currentLabel.x;
                            otherLabel.x = Math.max(otherLabel.screenRect.x, otherLabel.x - shiftAmount);
                        }
                    }
                    
                    // Recheck this label against all previously processed labels
                    j = -1; // Will be incremented to 0 in next iteration
                }
            }
        }

        // Convert back to indexed object
        const result = {};
        resolvedLabels.forEach(label => {
            result[label.index] = {
                x: label.x,
                y: label.y,
                width: label.width,
                height: label.height,
                text: label.text
            };
        });

        return result;
    }

    labelsOverlap(label1, label2) {
        return !(label1.x + label1.width <= label2.x || 
                 label2.x + label2.width <= label1.x || 
                 label1.y + label1.height <= label2.y || 
                 label2.y + label2.height <= label1.y);
    }

    drawScreen(x, y, width, height, screen, screenNumber, labelPosition) {
        const color = this.colors[(screenNumber - 1) % this.colors.length];
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        this.ctx.fillStyle = color + '15';
        this.ctx.fillRect(x, y, width, height);

        // Use pre-calculated label position
        const labelX = labelPosition.x;
        const labelY = labelPosition.y;
        const labelWidth = labelPosition.width;
        const labelHeight = labelPosition.height;
        const labelText = labelPosition.text;
        
        // Determine which corners should be rounded based on label position relative to screen
        const isAtScreenLeft = labelX <= x + 1;
        const isAtScreenTop = labelY <= y + 1;
        const isAtScreenRight = labelX + labelWidth >= x + width - 1;
        const isAtScreenBottom = labelY + labelHeight >= y + height - 1;
        
        // Draw rounded rectangle with selective corners
        this.drawRoundedRect(labelX, labelY, labelWidth, labelHeight, 4, {
            topLeft: !isAtScreenLeft && !isAtScreenTop,
            topRight: !isAtScreenRight && !isAtScreenTop,
            bottomLeft: !isAtScreenLeft && !isAtScreenBottom,
            bottomRight: !isAtScreenRight && !isAtScreenBottom
        }, color);
        
        // Draw text with emphasized number
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        
        // Split text to style number and inches differently
        const parts = labelText.split(' ');
        const number = parts[0];
        const inches = parts[1];
        
        let textX = labelX + 10;
        const textY = labelY + labelHeight / 2;
        
        // Draw number (more pronounced)
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 16px Roboto Mono, monospace';
        this.ctx.fillText(number, textX, textY);
        
        // Calculate width of number to position inches
        const numberWidth = this.ctx.measureText(number).width;
        textX += numberWidth + 5; // small gap
        
        // Draw inches (less pronounced)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '14px Roboto Mono, monospace';
        this.ctx.fillText(inches, textX, textY);
    }

    drawRoundedRect(x, y, width, height, radius, corners, fillColor) {
        this.ctx.fillStyle = fillColor;
        this.ctx.beginPath();
        
        // Start from top-left, moving clockwise
        this.ctx.moveTo(x + (corners.topLeft ? radius : 0), y);
        
        // Top edge and top-right corner
        this.ctx.lineTo(x + width - (corners.topRight ? radius : 0), y);
        if (corners.topRight) {
            this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        }
        
        // Right edge and bottom-right corner
        this.ctx.lineTo(x + width, y + height - (corners.bottomRight ? radius : 0));
        if (corners.bottomRight) {
            this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        }
        
        // Bottom edge and bottom-left corner
        this.ctx.lineTo(x + (corners.bottomLeft ? radius : 0), y + height);
        if (corners.bottomLeft) {
            this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        }
        
        // Left edge and top-left corner
        this.ctx.lineTo(x, y + (corners.topLeft ? radius : 0));
        if (corners.topLeft) {
            this.ctx.quadraticCurveTo(x, y, x + radius, y);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawNoScreensMessage() {
        this.ctx.fillStyle = '#999';
        this.ctx.font = '14px Roboto Mono, monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Add screens to see comparison', 
                        this.logicalWidth / 2, this.logicalHeight / 2);
    }
}
