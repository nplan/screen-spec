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
        
        // Get the actual displayed size of the canvas element
        const canvasRect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = canvasRect.width * this.pixelRatio;
        this.canvas.height = canvasRect.height * this.pixelRatio;
        
        this.ctx.scale(this.pixelRatio, this.pixelRatio);
        
        this.logicalWidth = canvasRect.width;
        this.logicalHeight = canvasRect.height;
        
        // Reset cache when canvas size changes
        this.lastCanvasSize = { width: canvasRect.width, height: canvasRect.height };
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

        // Collect all screen rectangles
        const screenRects = screenDimensions.map(({ width, height, screen }, index) => {
            const screenWidth = width * scale;
            const screenHeight = height * scale;
            
            const x = (this.logicalWidth - screenWidth) / 2;
            const y = (this.logicalHeight - screenHeight) / 2;

            return { x, y, width: screenWidth, height: screenHeight, screen, index, screenNumber: screen.screenNumber || (index + 1) };
        });
        
        // Draw all screens with labels in top-left corner
        screenRects.forEach(rect => {
            this.drawScreen(rect.x, rect.y, rect.width, rect.height, rect.screen, rect.screenNumber);
        });
    }

    drawScreen(x, y, width, height, screen, screenNumber) {
        const color = this.colors[(screenNumber - 1) % this.colors.length];
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = CONFIG.UI.SCREEN_STROKE_WIDTH;
        this.ctx.strokeRect(x, y, width, height);

        this.ctx.fillStyle = color + CONFIG.COLORS.SCREEN_FILL_OPACITY;
        this.ctx.fillRect(x, y, width, height);

        // Draw label in top-left corner with transparency
        const labelText = `${screenNumber} ${screen.diagonal}"`;
        
        this.ctx.font = `bold ${CONFIG.UI.FONT_SIZE_LABEL_NUMBER}px ${CONFIG.UI.FONT_FAMILY_MONO}`;
        const textMetrics = this.ctx.measureText(labelText);
        const labelWidth = textMetrics.width + CONFIG.UI.LABEL_PADDING;
        const labelHeight = CONFIG.UI.LABEL_HEIGHT;
        
        const labelX = x;
        const labelY = y;
        
        // Draw semi-transparent rounded rectangle background
        this.drawRoundedRect(labelX, labelY, labelWidth, labelHeight, CONFIG.UI.LABEL_BORDER_RADIUS, {
            topLeft: false,
            topRight: false,
            bottomLeft: false,
            bottomRight: true
        }, color + '80'); // 50% transparency
        
        // Draw text with emphasized number
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        
        // Split text to style number and inches differently
        const parts = labelText.split(' ');
        const number = parts[0];
        const inches = parts[1];
        
        let textX = labelX + CONFIG.UI.LABEL_TEXT_PADDING;
        const textY = labelY + labelHeight / 2;
        
        // Draw number (more pronounced) - pure white for visibility
        this.ctx.fillStyle = 'white';
        this.ctx.font = `bold ${CONFIG.UI.FONT_SIZE_LABEL_NUMBER}px ${CONFIG.UI.FONT_FAMILY_MONO}`;
        this.ctx.fillText(number, textX, textY);
        
        // Calculate width of number to position inches
        const numberWidth = this.ctx.measureText(number).width;
        textX += numberWidth + CONFIG.UI.LABEL_NUMBER_SPACING; // small gap
        
        // Draw inches (less pronounced) - pure white for visibility
        this.ctx.fillStyle = 'white';
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
