// Validation Manager - Centralized input validation and error handling
class ValidationManager {
    constructor() {
        this.validationRules = {
            diagonal: {
                min: 1,
                max: 100,
                type: 'number',
                required: true,
                unit: 'inches'
            },
            width: {
                min: 1,
                max: 16384,
                type: 'integer',
                required: true,
                unit: 'pixels'
            },
            height: {
                min: 1,
                max: 16384,
                type: 'integer',
                required: true,
                unit: 'pixels'
            },
            distance: {
                min: 100,
                max: 3000,
                type: 'number',
                required: true,
                unit: 'mm'
            },
            curvature: {
                min: 500,
                max: 10000,
                type: 'number',
                required: false,
                unit: 'mm'
            },
            scaling: {
                min: 25,
                max: 500,
                type: 'number',
                required: true,
                unit: '%'
            }
        };
        
        // Debounced error display update to prevent flickering
        this.debouncedErrorUpdates = new Map();
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

        // Additional cross-field validations
        const crossValidation = this.validateCrossFields(validatedData);
        if (!crossValidation.isValid) {
            Object.assign(errors, crossValidation.errors);
            isValid = false;
        }

        return { isValid, errors, validatedData };
    }

    /**
     * Validate relationships between fields
     * @param {Object} data - Validated field data
     * @returns {Object} Cross-validation result
     */
    validateCrossFields(data) {
        const errors = {};
        let isValid = true;

        // Check aspect ratio reasonableness
        if (data.width && data.height) {
            const aspectRatio = data.width / data.height;
            if (aspectRatio < 0.1 || aspectRatio > 10) {
                errors.aspectRatio = 'Aspect ratio seems unusual - please check width and height values';
                isValid = false;
            }
        }

        // Check if curvature makes sense for screen size
        if (data.curvature && data.diagonal) {
            const screenWidth = this.estimateScreenWidth(data.diagonal, data.width, data.height);
            if (data.curvature < screenWidth * 0.5) {
                errors.curvature = 'Curvature radius seems too tight for this screen size';
                isValid = false;
            }
        }

        // Check viewing distance vs screen size
        if (data.distance && data.diagonal) {
            const minDistance = data.diagonal * 25.4 * 0.5; // At least 0.5x diagonal in mm
            const maxDistance = data.diagonal * 25.4 * 5;   // At most 5x diagonal in mm
            
            if (data.distance < minDistance) {
                errors.distance = `Viewing distance seems too close for a ${data.diagonal}" screen`;
                isValid = false;
            } else if (data.distance > maxDistance) {
                errors.distance = `Viewing distance seems too far for a ${data.diagonal}" screen`;
                isValid = false;
            }
        }

        return { isValid, errors };
    }

    /**
     * Estimate screen width in mm for validation purposes
     * @param {number} diagonal - Diagonal in inches
     * @param {number} width - Width in pixels
     * @param {number} height - Height in pixels
     * @returns {number} Estimated width in mm
     */
    estimateScreenWidth(diagonal, width, height) {
        if (!diagonal || !width || !height) return 0;
        const ratio = width / height;
        const heightMm = diagonal / Math.sqrt(ratio ** 2 + 1) * 25.4;
        return ratio * heightMm;
    }

    /**
     * Get user-friendly display name for a field
     * @param {string} fieldName - Internal field name
     * @returns {string} Display name
     */
    getFieldDisplayName(fieldName) {
        const displayNames = {
            diagonal: 'Diagonal',
            width: 'Width',
            height: 'Height',
            distance: 'Distance',
            curvature: 'Curvature',
            scaling: 'Scaling'
        };
        return displayNames[fieldName] || fieldName;
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
            input.classList.remove('input-error');
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
        }, 150); // 150ms debounce delay
        
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
        
        // Only update if errors have actually changed
        const errorsChanged = currentErrors.length !== newErrors.length || 
                             !currentErrors.every((error, index) => error === newErrors[index]);
        
        if (!errorsChanged) return; // Prevent unnecessary updates
        
        if (validation.isValid) {
            // Hide error container if no errors
            if (errorContainer.style.display !== 'none') {
                errorContainer.style.display = 'none';
            }
        } else {
            // Update errors with smooth transition
            errorList.innerHTML = '';
            Object.entries(validation.errors).forEach(([field, error]) => {
                const errorItem = document.createElement('div');
                errorItem.className = 'error-item';
                errorItem.textContent = error;
                errorList.appendChild(errorItem);
            });
            
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
