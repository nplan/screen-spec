// Configuration constants for Screen Spec Calculator
// Centralized location for all colors, sizes, limits, and magic numbers

const CONFIG = {
    // Color Palette
    COLORS: {
        SCREEN_COLORS: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'],
        
        // CSS Colors (for reference, actual usage remains in CSS)
        PRIMARY_BLUE: '#007bff',
        PRIMARY_BLUE_HOVER: '#0056b3',
        SUCCESS_GREEN: '#28a745',
        DANGER_RED: '#f44336',
        WARNING_ORANGE: '#ffc107',
        TEXT_DARK: '#333',
        TEXT_MEDIUM: '#666',
        TEXT_LIGHT: '#999',
        BORDER_LIGHT: '#e9ecef',
        BACKGROUND_LIGHT: '#f8f9fa',
        
        // Transparency levels
        SCREEN_FILL_OPACITY: '15', // Used as hex suffix for screen fill colors
        LABEL_SHADOW: 'rgba(0, 0, 0, 0.7)',
        LABEL_TEXT_SECONDARY: 'rgba(255, 255, 255, 0.8)'
    },

    // Screen Validation Limits
    LIMITS: {
        DIAGONAL: {
            MIN: 1,
            MAX: 100 // inches
        },
        RESOLUTION: {
            MIN: 1,
            MAX: 16384 // pixels
        },
        DISTANCE: {
            MIN: 100,
            MAX: 3000 // millimeters
        },
        CURVATURE: {
            MIN: 500,
            MAX: 10000 // millimeters
        },
        SCALING: {
            MIN: 25,
            MAX: 500, // percent
            DEFAULT: 100
        }
    },

    // Physical Constants
    PHYSICS: {
        INCHES_TO_MM: 25.4,
        DEGREES_TO_RADIANS: Math.PI / 180,
        RADIANS_TO_DEGREES: 180 / Math.PI
    },

    // Timing Constants
    TIMING: {
        DEBOUNCE_DELAY: 100, // milliseconds
        ANIMATION_DURATION: 200, // milliseconds
        TOOLTIP_DELAY: 500, // milliseconds
        AUTO_SAVE_DELAY: 500 // milliseconds for auto-save debouncing
    },

    // Storage Configuration
    STORAGE: {
        KEY: 'screen-spec-calculator-state',
        VERSION: '1.0',
        AUTO_SAVE: true
    },

    // UI Dimensions and Spacing
    UI: {
        // Canvas and Visualizer
        CANVAS_MARGIN: 40, // pixels around screen visualizations
        SCREEN_STROKE_WIDTH: 2,
        
        // Label dimensions and positioning
        LABEL_HEIGHT: 30, // pixels
        LABEL_PADDING: 5, // extra padding for label width
        LABEL_SPACING: 4, // pixels between overlapping labels
        LABEL_BORDER_RADIUS: 4,
        LABEL_TEXT_PADDING: 10, // padding inside label
        LABEL_NUMBER_SPACING: 5, // gap between number and inches
        
        // Font sizes
        FONT_SIZE_LABEL_NUMBER: 16, // pixels
        FONT_SIZE_LABEL_INCHES: 14, // pixels
        FONT_SIZE_NO_SCREENS: 14, // pixels
        
        // Font families
        FONT_FAMILY_MONO: 'Roboto Mono, monospace',
        
        // Screen number badge
        SCREEN_NUMBER_HEIGHT: 28, // pixels
        SCREEN_NUMBER_MIN_WIDTH: 32, // pixels
        SCREEN_NUMBER_PADDING: 12, // pixels horizontal
        SCREEN_NUMBER_RIGHT_OFFSET: 16, // pixels from right edge
        
        // Container dimensions
        CONTAINER_MAX_WIDTH: 400, // pixels
        CONTAINER_MIN_WIDTH: 280, // pixels
        VISUALIZER_MAX_WIDTH: 1000, // pixels
        VISUALIZER_MIN_WIDTH: 280, // pixels
        VISUALIZER_HEIGHT: 400, // pixels
        
        // Form spacing
        FIELD_MARGIN_BOTTOM: 0.75, // rem
        LABEL_MARGIN_BOTTOM: 0.3, // rem
        RESOLUTION_GAP: 0.4, // rem
        
        // Border radius
        BORDER_RADIUS_SMALL: 4, // pixels
        BORDER_RADIUS_MEDIUM: 6, // pixels
        BORDER_RADIUS_LARGE: 8, // pixels
        BORDER_RADIUS_XLARGE: 12, // pixels
        
        // Shadows
        BOX_SHADOW_LIGHT: '0 1px 3px rgba(0, 0, 0, 0.1)',
        BOX_SHADOW_MEDIUM: '0 2px 4px rgba(0, 0, 0, 0.1)',
        BOX_SHADOW_HEAVY: '0 4px 12px rgba(0, 0, 0, 0.1)',
        
        // Transitions
        TRANSITION_FAST: 'all 0.2s',
        TRANSITION_MEDIUM: 'all 0.3s ease-out'
    },

    // Default Values
    DEFAULTS: {
        VIEW_DISTANCE: 800, // millimeters
        VIEW_MODE: 'realSize',
        PRESET_DIAGONAL: 24, // inches
        PRESET_RESOLUTION: [1920, 1080], // pixels
        PRESET_DISTANCE: 600, // millimeters
        PRESET_CURVATURE: null, // flat screen
        PRESET_SCALING: 100, // percent
        
        // Test screen values
        TEST_SCREEN: {
            DIAGONAL: 24,
            RESOLUTION: [1920, 1080],
            DISTANCE: 800,
            CURVATURE: 800
        }
    },

    // Error Messages
    MESSAGES: {
        CALCULATION_ERROR: 'Calculation Error',
        CALCULATION_ERROR_SHORT: 'Error',
        NO_SCREENS_MESSAGE: 'Add screens to see comparison',
        
        // Validation error templates
        VALIDATION_ERRORS: {
            REQUIRED: 'This field is required',
            MIN_VALUE: (min, unit) => `Minimum value is ${min}${unit ? ' ' + unit : ''}`,
            MAX_VALUE: (max, unit) => `Maximum value is ${max}${unit ? ' ' + unit : ''}`,
            INVALID_NUMBER: 'Please enter a valid number',
            INVALID_INTEGER: 'Please enter a whole number',
            UNREALISTIC_SIZE: 'Screen size appears unrealistic for given dimensions'
        }
    },

    // Element IDs and Selectors
    SELECTORS: {
        CANVAS_ID: 'screenCanvas',
        SCREENS_CONTAINER_ID: 'screens-container',
        ADD_WRAPPER_ID: 'add-wrapper',
        ADD_SCREEN_BUTTON_ID: 'add-screen',
        
        // CSS Classes
        CLASSES: {
            SCREEN_NUMBER: 'screen-number',
            NUMBER_TEXT: 'number-text',
            NO_CLOSE: 'no-close',
            INPUT_ERROR: 'input-error',
            VALIDATION_ERRORS: 'validation-errors',
            ERROR_LIST: 'error-list',
            OUTPUT_UNIT: 'output-unit',
            CONTAINER: 'container'
        }
    },

    // Field Configuration
    FIELDS: {
        NAMES: ['preset', 'diagonal', 'width', 'height', 'distance', 'curvature', 'scaling'],
        VALIDATION_FIELD_NAMES: {
            diagonal: 'Screen Diagonal',
            width: 'Width',
            height: 'Height', 
            distance: 'Viewing Distance',
            curvature: 'Curvature Radius',
            scaling: 'Scaling'
        }
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Export for ES6 modules
export { CONFIG };
