// Import configuration constants
import { CONFIG } from './config.js';

// Validation Manager - Centralized input validation and error handling
class ValidationManager {
    constructor() {
        this.accessibilityManager = null; // Will be set by ScreenManager
        this.validationRules = {
            diagonal: {
                min: CONFIG.LIMITS.DIAGONAL.MIN,
                max: CONFIG.LIMITS.DIAGONAL.MAX,
                type: 'number',
                required: true,
                unit: 'inches'
            },
            width: {
                min: CONFIG.LIMITS.RESOLUTION.MIN,
                max: CONFIG.LIMITS.RESOLUTION.MAX,
                type: 'integer',
                required: true,
                unit: 'pixels'
            },
            height: {
                min: CONFIG.LIMITS.RESOLUTION.MIN,
                max: CONFIG.LIMITS.RESOLUTION.MAX,
                type: 'integer',
                required: true,
                unit: 'pixels'
            },
            distance: {
                min: CONFIG.LIMITS.DISTANCE.MIN,
                max: CONFIG.LIMITS.DISTANCE.MAX,
                type: 'number',
                required: true,
                unit: 'mm'
            },
            curvature: {
                min: CONFIG.LIMITS.CURVATURE.MIN,
                max: CONFIG.LIMITS.CURVATURE.MAX,
                type: 'number',
                required: false,
                unit: 'mm'
            },
            scaling: {
                min: CONFIG.LIMITS.SCALING.MIN,
                max: CONFIG.LIMITS.SCALING.MAX,
                type: 'number',
                required: true,
                unit: '%'
            }
        };
        
        // Debounced error display update to prevent flickering
        this.debouncedErrorUpdates = new Map(); // Track pending error updates
    }
    
    /**
     * Set accessibility manager reference for integration
     */
    setAccessibilityManager(accessibilityManager) {
        this.accessibilityManager = accessibilityManager;
    }

    /**
     * Validate a single field value
     * @param {string} fieldName - Name of the field to validate
     * @param {*} value - Value to validate
     * @returns {Object} Validation result with isValid, error, and sanitizedValue
     */
    validateField(fieldName, value) {
        const rule = this.validationRules[fieldName];
        if (!rule) {
            return { isValid: false, error: 'Unknown field', sanitizedValue: null };
        }

        // Handle empty values
        if (value === '' || value === null || value === undefined) {
            if (rule.required) {
                return { 
                    isValid: false, 
                    error: `${this.getFieldDisplayName(fieldName)} is required`, 
                    sanitizedValue: null 
                };
            }
            return { isValid: true, error: null, sanitizedValue: null };
        }

        // Convert to number if needed
        let numValue = value;
        if (typeof value === 'string') {
            numValue = parseFloat(value);
        }

        // Check if it's a valid number
        if (isNaN(numValue)) {
            return { 
                isValid: false, 
                error: `${this.getFieldDisplayName(fieldName)} must be a valid number`, 
                sanitizedValue: null 
            };
        }

        // Check for integer requirement
        if (rule.type === 'integer' && !Number.isInteger(numValue)) {
            return { 
                isValid: false, 
                error: `${this.getFieldDisplayName(fieldName)} must be a whole number`, 
                sanitizedValue: null 
            };
        }

        // Check minimum value
        if (numValue < rule.min) {
            return { 
                isValid: false, 
                error: `${this.getFieldDisplayName(fieldName)} must be at least ${rule.min} ${rule.unit}`, 
                sanitizedValue: null 
            };
        }

        // Check maximum value
        if (numValue > rule.max) {
            return { 
                isValid: false, 
                error: `${this.getFieldDisplayName(fieldName)} must be no more than ${rule.max} ${rule.unit}`, 
                sanitizedValue: null 
            };
        }

        return { isValid: true, error: null, sanitizedValue: numValue };
    }

    /**
     * Validate all fields for a screen
     * @param {Object} screenData - Screen data object to validate
     * @returns {Object} Validation result with overall validity and field-specific errors
     */
    validateScreen(screenData) {
        const errors = {};
        let isValid = true;
        const validatedData = {};

        // Validate each field
        Object.keys(this.validationRules).forEach(fieldName => {
            const result = this.validateField(fieldName, screenData[fieldName]);
            if (!result.isValid) {
                errors[fieldName] = result.error;
                isValid = false;
            }
            validatedData[fieldName] = result.sanitizedValue;
        });

        return { isValid, errors, validatedData };
    }

    /**
     * Get user-friendly display name for a field
     * @param {string} fieldName - Internal field name
     * @returns {string} Display name
     */
    getFieldDisplayName(fieldName) {
        return CONFIG.FIELDS.VALIDATION_FIELD_NAMES[fieldName] || fieldName;
    }

    /**
     * Show error message for a specific field
     * @param {string} screenId - Screen ID
     * @param {string} fieldName - Field name
     * @param {string} errorMessage - Error message to display
     */
    showFieldError(screenId, fieldName, errorMessage) {
        const container = document.querySelector(`[data-screen-id="${screenId}"]`);
        if (!container) return;

        const input = container.querySelector(`#${fieldName}-${screenId}`);
        if (input) {
            input.classList.add('input-error');
        }

        // Use debounced error display update
        this.debouncedUpdateErrorDisplay(screenId);
    }

    /**
     * Clear error message for a specific field
     * @param {string} screenId - Screen ID
     * @param {string} fieldName - Field name
     */
    clearFieldError(screenId, fieldName) {
        const container = document.querySelector(`[data-screen-id="${screenId}"]`);
        if (!container) return;

        const input = container.querySelector(`#${fieldName}-${screenId}`);
        if (input) {
            input.classList.remove(CONFIG.SELECTORS.CLASSES.INPUT_ERROR);
        }

        // Use debounced error display update
        this.debouncedUpdateErrorDisplay(screenId);
    }

    /**
     * Debounced error display update to prevent flickering
     * @param {string} screenId - Screen ID
     */
    debouncedUpdateErrorDisplay(screenId) {
        // Clear existing timeout for this screen
        if (this.debouncedErrorUpdates.has(screenId)) {
            clearTimeout(this.debouncedErrorUpdates.get(screenId));
        }
        
        // Set new timeout
        const timeoutId = setTimeout(() => {
            this.updateErrorDisplay(screenId);
            this.debouncedErrorUpdates.delete(screenId);
        }, CONFIG.TIMING.DEBOUNCE_DELAY); // debounce delay
        
        this.debouncedErrorUpdates.set(screenId, timeoutId);
    }

    /**
     * Update the consolidated error display for a screen
     * @param {string} screenId - Screen ID
     */
    updateErrorDisplay(screenId) {
        const container = document.querySelector(`[data-screen-id="${screenId}"]`);
        if (!container) return;

        const errorContainer = container.querySelector(`#validation-errors-${screenId}`);
        const errorList = container.querySelector(`#error-list-${screenId}`);
        
        if (!errorContainer || !errorList) return;

        // Get current screen data
        const screenManager = window.screenManager; // Access global instance
        if (!screenManager) return;

        const screen = screenManager.screens.find(s => s.id == screenId);
        if (!screen) return;

        // Validate current screen data
        const validation = this.validateScreen(screen);
        
        // Get current error content to compare
        const currentErrors = Array.from(errorList.children).map(child => child.textContent);
        const newErrors = Object.values(validation.errors || {});
        
        // Check if errors have actually changed - simplified logic
        const errorsChanged = 
            currentErrors.length !== newErrors.length ||
            !currentErrors.every((error, index) => error === newErrors[index]) ||
            !newErrors.every((error, index) => error === currentErrors[index]);
        
        if (!errorsChanged) return; // Prevent unnecessary updates
        
        if (validation.isValid) {
            // Hide error container if no errors
            if (errorContainer.style.display !== 'none') {
                errorContainer.style.display = 'none';
            }
            
            // IMPORTANT: Clear the error list when hiding to ensure clean state
            errorList.innerHTML = '';
            
            // Clear accessibility errors for all valid fields
            if (this.accessibilityManager) {
                Object.keys(this.validationRules).forEach(field => {
                    const fieldId = `${field}-${screenId}`;
                    this.accessibilityManager.updateValidationAria(fieldId, true);
                });
            }
        } else {
            // Update errors with smooth transition
            errorList.innerHTML = '';
            Object.entries(validation.errors).forEach(([field, error]) => {
                const errorItem = document.createElement('div');
                errorItem.className = 'error-item';
                errorItem.textContent = error;
                errorList.appendChild(errorItem);
                
                // Update accessibility for the field
                if (this.accessibilityManager) {
                    const fieldId = `${field}-${screenId}`;
                    this.accessibilityManager.updateValidationAria(fieldId, false, error);
                }
            });
            
            // Clear accessibility errors for fields that are now valid
            if (this.accessibilityManager) {
                Object.keys(this.validationRules).forEach(field => {
                    if (!validation.errors[field]) {
                        const fieldId = `${field}-${screenId}`;
                        this.accessibilityManager.updateValidationAria(fieldId, true);
                    }
                });
            }
            
            if (errorContainer.style.display === 'none') {
                errorContainer.style.display = 'block';
            }
        }
    }

    /**
     * Clear all error messages for a screen
     * @param {string} screenId - Screen ID
     */
    clearAllErrors(screenId) {
        Object.keys(this.validationRules).forEach(fieldName => {
            this.clearFieldError(screenId, fieldName);
        });
        
        // Hide error container
        const container = document.querySelector(`[data-screen-id="${screenId}"]`);
        if (container) {
            const errorContainer = container.querySelector(`#validation-errors-${screenId}`);
            if (errorContainer) {
                errorContainer.style.display = 'none';
            }
        }
    }

    /**
     * Display validation errors for a screen
     * @param {string} screenId - Screen ID
     * @param {Object} errors - Errors object from validation
     */
    displayErrors(screenId, errors) {
        // Use debounced error display update
        this.debouncedUpdateErrorDisplay(screenId);
    }

    /**
     * Get validation summary for debugging
     * @param {Object} screenData - Screen data to validate
     * @returns {string} Validation summary
     */
    getValidationSummary(screenData) {
        const result = this.validateScreen(screenData);
        if (result.isValid) {
            return 'All fields are valid';
        }

        const errorCount = Object.keys(result.errors).length;
        const errorList = Object.entries(result.errors)
            .map(([field, error]) => `${field}: ${error}`)
            .join('; ');
        
        return `${errorCount} validation error(s): ${errorList}`;
    }
}

// Export for ES6 modules
export { ValidationManager };
