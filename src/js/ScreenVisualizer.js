// Import configuration constants
import { CONFIG } from './config.js';

// Screen Visualizer - Handles the visual comparison of screens
class ScreenVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.screens = [];
        this.viewMode = CONFIG.DEFAULTS.VIEW_MODE;
        this.viewDistance = CONFIG.DEFAULTS.VIEW_DISTANCE;
        this.colors = CONFIG.COLORS.SCREEN_COLORS;
        
        // Theme awareness
        this.currentTheme = this.getEffectiveTheme();
        
        // Optimization: Cache previous state for change detection
        this.lastScreensHash = null;
        this.lastViewMode = null;
        this.lastCanvasSize = { width: 0, height: 0 };
        this.lastTheme = this.currentTheme;
        
        this.setupHiDPI();
        this.resizeCanvas();
        
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.render();
        });
        
        // Listen for theme changes
        this.setupThemeListener();
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
        const themeChanged = this.hasThemeChanged();
        
        if (this.lastScreensHash !== currentHash || sizeChanged || themeChanged) {
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

    /**
     * Get the effective theme from the document
     * @returns {string} Current effective theme ('light' or 'dark')
     */
    getEffectiveTheme() {
        const html = document.documentElement;
        const themeAttribute = html.getAttribute(CONFIG.THEME.DATA_ATTRIBUTE);
        return themeAttribute || CONFIG.THEME.THEMES.LIGHT;
    }

    /**
     * Setup theme change listener
     */
    setupThemeListener() {
        // Create a MutationObserver to watch for theme changes
        this.themeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === CONFIG.THEME.DATA_ATTRIBUTE) {
                    this.handleThemeChange();
                }
            });
        });

        // Start observing theme changes
        this.themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: [CONFIG.THEME.DATA_ATTRIBUTE]
        });
    }

    /**
     * Handle theme change events
     */
    handleThemeChange() {
        const newTheme = this.getEffectiveTheme();
        if (this.currentTheme !== newTheme) {
            this.currentTheme = newTheme;
            this.lastTheme = newTheme;
            this.forceRender(); // Force re-render on theme change
        }
    }

    /**
     * Get theme-appropriate colors
     * @returns {Object} Theme colors object
     */
    getThemeColors() {
        return this.currentTheme === CONFIG.THEME.THEMES.DARK ? 
            CONFIG.COLORS.DARK : CONFIG.COLORS.LIGHT;
    }

    /**
     * Check if we need to re-render due to theme change
     * @returns {boolean} True if theme has changed
     */
    hasThemeChanged() {
        const currentTheme = this.getEffectiveTheme();
        if (this.lastTheme !== currentTheme) {
            this.lastTheme = currentTheme;
            this.currentTheme = currentTheme;
            return true;
        }
        return false;
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
                const fovH = screen.fov_horizontal * CONFIG.PHYSICS.DEGREES_TO_RADIANS;
                const fovV = screen.fov_vertical * CONFIG.PHYSICS.DEGREES_TO_RADIANS;
                width = 2 * avgDistance * Math.tan(fovH / 2);
                height = 2 * avgDistance * Math.tan(fovV / 2);
            }
            maxWidth = Math.max(maxWidth, width);
            maxHeight = Math.max(maxHeight, height);
            return { width, height, screen };
        });

        const margin = CONFIG.UI.CANVAS_MARGIN;
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
            
            this.ctx.font = `bold ${CONFIG.UI.FONT_SIZE_LABEL_NUMBER}px ${CONFIG.UI.FONT_FAMILY_MONO}`;
            const textMetrics = this.ctx.measureText(labelText);
            const labelWidth = textMetrics.width + CONFIG.UI.LABEL_PADDING; // more padding
            const labelHeight = CONFIG.UI.LABEL_HEIGHT; // slightly taller
            
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
                    const padding = CONFIG.UI.LABEL_SPACING; // pixels between labels
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
        this.ctx.lineWidth = CONFIG.UI.SCREEN_STROKE_WIDTH;
        this.ctx.strokeRect(x, y, width, height);

        this.ctx.fillStyle = color + CONFIG.COLORS.SCREEN_FILL_OPACITY;
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
        this.drawRoundedRect(labelX, labelY, labelWidth, labelHeight, CONFIG.UI.LABEL_BORDER_RADIUS, {
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
        
        let textX = labelX + CONFIG.UI.LABEL_TEXT_PADDING;
        const textY = labelY + labelHeight / 2;
        
        // Screen labels need high contrast against colored backgrounds
        // Use white for primary text and semi-transparent white for secondary
        // This ensures readability regardless of screen color or theme
        
        // Draw number (more pronounced) - always white for contrast
        this.ctx.fillStyle = 'white';
        this.ctx.font = `bold ${CONFIG.UI.FONT_SIZE_LABEL_NUMBER}px ${CONFIG.UI.FONT_FAMILY_MONO}`;
        this.ctx.fillText(number, textX, textY);
        
        // Calculate width of number to position inches
        const numberWidth = this.ctx.measureText(number).width;
        textX += numberWidth + CONFIG.UI.LABEL_NUMBER_SPACING; // small gap
        
        // Draw inches (less pronounced) - semi-transparent white for contrast
        this.ctx.fillStyle = CONFIG.COLORS.LABEL_TEXT_SECONDARY;
        this.ctx.font = `${CONFIG.UI.FONT_SIZE_LABEL_INCHES}px ${CONFIG.UI.FONT_FAMILY_MONO}`;
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
        const themeColors = this.getThemeColors();
        this.ctx.fillStyle = themeColors.TEXT_TERTIARY;
        this.ctx.font = `${CONFIG.UI.FONT_SIZE_NO_SCREENS}px ${CONFIG.UI.FONT_FAMILY_MONO}`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(CONFIG.MESSAGES.NO_SCREENS_MESSAGE, 
                        this.logicalWidth / 2, this.logicalHeight / 2);
    }
}

// Export for ES6 modules
export { ScreenVisualizer };
