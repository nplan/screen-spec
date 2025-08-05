// Unit Manager - Handles conversion between metric (cm) and imperial (inches) units
// Manages unit preferences and updates UI accordingly

import { CONFIG } from './config.js';

export class UnitManager {
    constructor() {
        this.currentUnit = 'cm'; // Default to centimeters
        this.storageKey = 'screen-spec-unit-preference';
        
        // Load saved preference or detect from locale
        this.loadUnitPreference();
        
        // Unit conversion constants
        this.conversions = {
            MM_TO_INCHES: 1 / CONFIG.PHYSICS.INCHES_TO_MM,
            INCHES_TO_MM: CONFIG.PHYSICS.INCHES_TO_MM,
            MM_TO_CM: CONFIG.PHYSICS.MM_TO_CM,
            CM_TO_MM: CONFIG.PHYSICS.CM_TO_MM
        };
        
        this.accessibilityManager = null;
    }

    /**
     * Set accessibility manager reference
     */
    setAccessibilityManager(accessibilityManager) {
        this.accessibilityManager = accessibilityManager;
    }

    /**
     * Load unit preference from localStorage or detect from user's locale
     */
    loadUnitPreference() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved && ['cm', 'in'].includes(saved)) {
                this.currentUnit = saved;
                console.log(`Loaded saved unit preference: ${saved}`);
            } else {
                // Auto-detect based on user's locale if no saved preference
                this.currentUnit = this.detectUnitFromLocale();
                console.log(`Auto-detected unit from locale: ${this.currentUnit}`);
            }
        } catch (error) {
            console.warn('Failed to load unit preference:', error);
            // Fallback to locale detection
            this.currentUnit = this.detectUnitFromLocale();
            console.log(`Fallback auto-detected unit: ${this.currentUnit}`);
        }
    }

    /**
     * Detect appropriate unit system based on user's locale
     * Returns 'in' for countries that use imperial system, 'cm' for metric
     */
    detectUnitFromLocale() {
        try {
            // Get user's locale
            const locale = navigator.language || navigator.languages?.[0] || 'en-US';
            
            // Countries/regions that primarily use imperial system (inches/feet)
            const imperialRegions = [
                'US', // United States
                'LR', // Liberia  
                'MM'  // Myanmar (mixed system but often uses imperial for some measurements)
            ];
            
            // Extract country code from locale (e.g., 'en-US' -> 'US')
            const countryCode = locale.split('-')[1]?.toUpperCase();
            
            // Check if country uses imperial system
            if (countryCode && imperialRegions.includes(countryCode)) {
                console.log(`Detected imperial locale: ${locale}, setting units to inches`);
                return 'in';
            }
            
            // Special handling for locales without country codes
            if (!countryCode) {
                // For English without country code, default to metric (most English-speaking countries use metric)
                // Exception: if the primary language suggests US English, use imperial
                if (locale.toLowerCase() === 'en' || locale.toLowerCase() === 'en-us') {
                    console.log(`Detected US English locale: ${locale}, setting units to inches`);
                    return 'in';
                }
            }
            
            console.log(`Detected metric locale: ${locale}, setting units to centimeters`);
            return 'cm';
            
        } catch (error) {
            console.warn('Failed to detect locale for unit preference:', error);
            return 'cm'; // Default to metric
        }
    }

    /**
     * Save unit preference to localStorage
     */
    saveUnitPreference() {
        try {
            localStorage.setItem(this.storageKey, this.currentUnit);
        } catch (error) {
            console.warn('Failed to save unit preference:', error);
        }
    }

    /**
     * Get current unit
     */
    getCurrentUnit() {
        return this.currentUnit;
    }

    /**
     * Check if current unit preference is auto-detected (not manually set)
     */
    isAutoDetected() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return !saved || saved === null; // If no saved preference, it's auto-detected
        } catch (error) {
            console.warn('Failed to check auto-detection status:', error);
            return true; // Default to auto-detected if can't access storage
        }
    }

    /**
     * Reset to auto-detected units based on locale
     */
    resetToAutoDetected() {
        try {
            localStorage.removeItem(this.storageKey);
            const oldUnit = this.currentUnit;
            this.currentUnit = this.detectUnitFromLocale();
            
            if (oldUnit !== this.currentUnit) {
                this.updateUI();
                console.log(`Units reset to auto-detected: ${this.currentUnit}`);
                
                // Announce unit change to accessibility manager
                if (this.accessibilityManager) {
                    const unitName = this.currentUnit === 'cm' ? 'centimeters' : 'inches';
                    this.accessibilityManager.announceUnitChange(`distance units reset to auto-detected ${unitName}`);
                }
            }
        } catch (error) {
            console.warn('Failed to reset to auto-detected units:', error);
        }
    }

    /**
     * Toggle between cm and inches
     */
    toggleUnit() {
        const oldUnit = this.currentUnit;
        this.currentUnit = this.currentUnit === 'cm' ? 'in' : 'cm';
        this.saveUnitPreference(); // This marks it as user preference
        this.updateUI();
        
        console.log(`Unit toggled from ${oldUnit} to ${this.currentUnit}`);
        
        // Announce unit change to accessibility manager
        if (this.accessibilityManager) {
            const unitName = this.currentUnit === 'cm' ? 'centimeters' : 'inches';
            this.accessibilityManager.announceUnitChange(`distance units changed to ${unitName}`);
        }
    }

    /**
     * Convert millimeters to current unit
     */
    convertFromMm(mmValue) {
        if (typeof mmValue !== 'number' || isNaN(mmValue)) {
            return mmValue;
        }
        if (this.currentUnit === 'in') {
            return mmValue * this.conversions.MM_TO_INCHES;
        } else if (this.currentUnit === 'cm') {
            return mmValue * this.conversions.MM_TO_CM;
        }
        return mmValue;
    }

    /**
     * Convert current unit to millimeters
     */
    convertToMm(value) {
        if (typeof value !== 'number' || isNaN(value)) {
            return value;
        }
        if (this.currentUnit === 'in') {
            return value * this.conversions.INCHES_TO_MM;
        } else if (this.currentUnit === 'cm') {
            return value * this.conversions.CM_TO_MM;
        }
        return value;
    }

    /**
     * Format value for display with appropriate precision
     */
    formatValue(mmValue) {
        if (typeof mmValue !== 'number' || isNaN(mmValue)) {
            return mmValue;
        }
        const convertedValue = this.convertFromMm(mmValue);
        if (this.currentUnit === 'in') {
            return convertedValue.toFixed(1);
        } else if (this.currentUnit === 'cm') {
            return convertedValue.toFixed(1);
        }
        return convertedValue.toFixed(1);
    }

    /**
     * Get unit label for display
     */
    getUnitLabel() {
        return this.currentUnit;
    }

    /**
     * Get descriptive unit name
     */
    getUnitName() {
        return this.currentUnit === 'cm' ? 'centimeters' : 'inches';
    }

    /**
     * Update all UI elements that display units
     */
    updateUI() {
        this.updateInputUnits();
        this.updateOutputUnits();
        this.updateAriaLabels();
        this.updateToggleButton();
    }

    /**
     * Update unit labels in input fields
     */
    updateInputUnits() {
        // Update distance input units only
        document.querySelectorAll('input[id*="distance-"]').forEach(input => {
            const container = input.closest('.input-wrapper');
            if (container) {
                const unitSpan = container.querySelector('.unit');
                if (unitSpan) {
                    unitSpan.textContent = this.getUnitLabel();
                }
            }
        });

        // Curvature always stays in mm
        document.querySelectorAll('input[id*="curvature-"]').forEach(input => {
            const container = input.closest('.input-wrapper');
            if (container) {
                const unitSpan = container.querySelector('.unit');
                if (unitSpan) {
                    unitSpan.textContent = 'mm';
                }
            }
        });
    }

    /**
     * Update unit labels in output areas
     */
    updateOutputUnits() {
        // This will be handled by the ScreenManager when it re-renders outputs
        // The ScreenManager should call this.getUnitLabel() when formatting dimensions
    }

    /**
     * Update aria-labels for accessibility
     */
    updateAriaLabels() {
        const unitName = this.getUnitName();
        
        // Update distance input aria-labels
        document.querySelectorAll('input[id*="distance-"]').forEach(input => {
            input.setAttribute('aria-label', `Viewing distance in ${unitName}`);
        });

        // Curvature always stays in millimeters
        document.querySelectorAll('input[id*="curvature-"]').forEach(input => {
            input.setAttribute('aria-label', `Screen curvature radius in millimeters (leave empty for flat screen)`);
        });
    }

    /**
     * Update the toggle button icon and tooltip
     */
    updateToggleButton() {
        const button = document.getElementById('unit-toggle');
        if (button) {
            const currentUnit = this.getUnitLabel();
            const otherUnit = this.currentUnit === 'cm' ? 'in' : 'cm';
            
            // Show current unit as button text
            button.textContent = currentUnit;
            button.title = `Toggle distance units (${currentUnit}/switch to ${otherUnit})`;
            button.setAttribute('aria-label', `Toggle distance units between centimeters and inches (currently ${this.getUnitName()})`);
        }
    }

    /**
     * Convert input values when switching units
     */
    convertInputValues() {
        const previousUnit = this.currentUnit; // Store current unit (will be previous after toggle)
        
        // Convert distance values only (curvature stays in mm)
        document.querySelectorAll('input[id*="distance-"]').forEach(input => {
            if (input.value && !isNaN(input.value)) {
                let valueInMm;
                if (previousUnit === 'cm') {
                    // Previous unit was cm, current value is in cm
                    valueInMm = parseFloat(input.value) * this.conversions.CM_TO_MM;
                } else if (previousUnit === 'in') {
                    // Previous unit was inches, current value is in inches
                    valueInMm = parseFloat(input.value) * this.conversions.INCHES_TO_MM;
                } else {
                    // Fallback - assume mm (shouldn't happen with new system)
                    valueInMm = parseFloat(input.value);
                }
                
                // Will format based on new unit after toggle
                input.dataset.pendingValue = valueInMm;
            }
        });

        // Curvature values don't need conversion - they stay in mm
    }

    /**
     * Apply converted values after unit toggle
     */
    applyConvertedValues() {
        // Apply distance values only
        document.querySelectorAll('input[id*="distance-"]').forEach(input => {
            if (input.dataset.pendingValue) {
                const valueInMm = parseFloat(input.dataset.pendingValue);
                input.value = this.formatInputValue(valueInMm);
                delete input.dataset.pendingValue;
            }
        });

        // Curvature values stay as they are (always in mm)
    }

    /**
     * Format input value with appropriate precision
     */
    formatInputValue(mmValue) {
        if (typeof mmValue !== 'number' || isNaN(mmValue)) {
            return '';
        }
        const convertedValue = this.convertFromMm(mmValue);
        if (this.currentUnit === 'in') {
            return Math.round(convertedValue).toString();
        } else if (this.currentUnit === 'cm') {
            return Math.round(convertedValue).toString();
        }
        return Math.round(convertedValue).toString();
    }

    /**
     * Get locale information for debugging or display
     */
    getLocaleInfo() {
        const locale = navigator.language || navigator.languages?.[0] || 'Unknown';
        const countryCode = locale.split('-')[1]?.toUpperCase() || 'Unknown';
        const autoDetectedUnit = this.detectUnitFromLocale();
        
        return {
            locale,
            countryCode,
            autoDetectedUnit,
            currentUnit: this.currentUnit,
            isAutoDetected: this.isAutoDetected()
        };
    }

    /**
     * Initialize the unit manager
     */
    init() {
        // Setup the toggle button
        const toggleButton = document.getElementById('unit-toggle');
        if (toggleButton) {
            console.log('Unit toggle button found and event listener attached');
            toggleButton.addEventListener('click', () => {
                console.log('Unit toggle button clicked');
                
                // Convert input values BEFORE toggling units
                this.convertInputValues();
                
                // Now toggle the unit
                this.toggleUnit();
                
                // Apply the converted values with new unit formatting
                this.applyConvertedValues();
                
                // Trigger input events to update screen data with converted values
                this.triggerInputUpdates();
                
                // Trigger re-calculation of all screens
                if (window.screenManager) {
                    window.screenManager.recalculateAllScreens();
                }
            });
        } else {
            console.error('Unit toggle button not found');
        }

        // Initialize UI based on current unit
        this.updateUI();
    }

    /**
     * Trigger input events for distance fields only (curvature stays in mm)
     */
    triggerInputUpdates() {
        document.querySelectorAll('input[id*="distance-"]').forEach(input => {
            // Trigger an input event to make the ScreenManager update the screen data
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }
}
