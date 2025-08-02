// Import dependencies
import { CONFIG } from './config.js';

// Storage Manager - Handles localStorage operations for state persistence
class StorageManager {
    constructor() {
        this.storageKey = CONFIG.STORAGE.KEY;
        this.version = CONFIG.STORAGE.VERSION;
        this.isSupported = this.checkStorageSupport();
    }

    /**
     * Check if localStorage is supported and available
     * @returns {boolean} True if localStorage is available
     */
    checkStorageSupport() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.warn('localStorage is not available:', error);
            return false;
        }
    }

    /**
     * Save application state to localStorage
     * @param {Object} state - State object to save
     * @returns {boolean} True if save was successful
     */
    save(state) {
        if (!this.isSupported) {
            console.warn('Cannot save state: localStorage not supported');
            return false;
        }

        try {
            const stateToSave = {
                version: this.version,
                timestamp: Date.now(),
                ...state
            };

            const serialized = JSON.stringify(stateToSave);
            localStorage.setItem(this.storageKey, serialized);
            
            console.log('State saved successfully');
            return true;
        } catch (error) {
            console.error('Failed to save state:', error);
            
            // Handle storage quota exceeded
            if (error.name === 'QuotaExceededError') {
                console.warn('Storage quota exceeded. Attempting to clear old data...');
                this.clear();
                // Try saving again after clearing
                try {
                    const stateToSave = {
                        version: this.version,
                        timestamp: Date.now(),
                        ...state
                    };
                    const serialized = JSON.stringify(stateToSave);
                    localStorage.setItem(this.storageKey, serialized);
                    console.log('State saved successfully after clearing old data');
                    return true;
                } catch (retryError) {
                    console.error('Failed to save state even after clearing:', retryError);
                }
            }
            
            return false;
        }
    }

    /**
     * Load application state from localStorage
     * @returns {Object|null} Loaded state object or null if not found/invalid
     */
    load() {
        if (!this.isSupported) {
            console.warn('Cannot load state: localStorage not supported');
            return null;
        }

        try {
            const serialized = localStorage.getItem(this.storageKey);
            if (!serialized) {
                console.log('No saved state found');
                return null;
            }

            const state = JSON.parse(serialized);
            
            // Validate the loaded state
            if (!this.validateState(state)) {
                console.warn('Invalid state data found, ignoring');
                this.clear(); // Remove corrupted data
                return null;
            }

            // Handle version compatibility
            if (state.version !== this.version) {
                console.log(`State version mismatch (saved: ${state.version}, current: ${this.version})`);
                const migrated = this.migrateState(state);
                if (migrated) {
                    console.log('State migrated successfully');
                    return migrated;
                } else {
                    console.warn('Could not migrate state, using defaults');
                    this.clear();
                    return null;
                }
            }

            console.log('State loaded successfully');
            return state;
        } catch (error) {
            console.error('Failed to load state:', error);
            this.clear(); // Remove corrupted data
            return null;
        }
    }

    /**
     * Clear saved state from localStorage
     * @returns {boolean} True if clear was successful
     */
    clear() {
        if (!this.isSupported) {
            return false;
        }

        try {
            localStorage.removeItem(this.storageKey);
            console.log('State cleared successfully');
            return true;
        } catch (error) {
            console.error('Failed to clear state:', error);
            return false;
        }
    }

    /**
     * Validate the structure and content of loaded state
     * @param {Object} state - State to validate
     * @returns {boolean} True if state is valid
     */
    validateState(state) {
        try {
            // Check required properties
            if (!state || typeof state !== 'object') {
                return false;
            }

            if (!state.version || !state.timestamp) {
                return false;
            }

            // Check screens array
            if (!Array.isArray(state.screens)) {
                return false;
            }

            // Validate each screen object
            for (const screen of state.screens) {
                if (!this.validateScreen(screen)) {
                    return false;
                }
            }

            // Check UI state
            if (state.uiState && typeof state.uiState !== 'object') {
                return false;
            }

            return true;
        } catch (error) {
            console.error('State validation error:', error);
            return false;
        }
    }

    /**
     * Validate individual screen data
     * @param {Object} screen - Screen object to validate
     * @returns {boolean} True if screen is valid
     */
    validateScreen(screen) {
        const requiredFields = ['id', 'screenNumber', 'diagonal', 'width', 'height', 'distance', 'scaling'];
        
        for (const field of requiredFields) {
            if (!(field in screen)) {
                return false;
            }
        }

        // Validate field types and ranges
        if (typeof screen.id !== 'number' || screen.id <= 0) return false;
        if (typeof screen.screenNumber !== 'number' || screen.screenNumber <= 0) return false;
        if (typeof screen.diagonal !== 'number' || screen.diagonal <= 0) return false;
        if (typeof screen.width !== 'number' || screen.width <= 0) return false;
        if (typeof screen.height !== 'number' || screen.height <= 0) return false;
        if (typeof screen.distance !== 'number' || screen.distance <= 0) return false;
        if (typeof screen.scaling !== 'number' || screen.scaling <= 0) return false;

        // Validate curvature (can be null or positive number)
        if (screen.curvature !== null && (typeof screen.curvature !== 'number' || screen.curvature <= 0)) {
            return false;
        }

        // Validate preset (can be string or empty)
        if (screen.preset !== undefined && typeof screen.preset !== 'string') {
            return false;
        }

        return true;
    }

    /**
     * Migrate state from older versions
     * @param {Object} oldState - State from older version
     * @returns {Object|null} Migrated state or null if migration failed
     */
    migrateState(oldState) {
        try {
            // For now, we only have version 1.0, so no migration needed
            // Future versions would add migration logic here
            console.log('No migration needed for version', oldState.version);
            return null;
        } catch (error) {
            console.error('State migration failed:', error);
            return null;
        }
    }

    /**
     * Get storage usage information
     * @returns {Object} Storage usage stats
     */
    getStorageInfo() {
        if (!this.isSupported) {
            return { supported: false };
        }

        try {
            const serialized = localStorage.getItem(this.storageKey);
            const size = serialized ? new Blob([serialized]).size : 0;
            
            return {
                supported: true,
                hasData: !!serialized,
                sizeBytes: size,
                sizeKB: Math.round(size / 1024 * 100) / 100,
                timestamp: serialized ? JSON.parse(serialized).timestamp : null
            };
        } catch (error) {
            return {
                supported: true,
                hasData: false,
                error: error.message
            };
        }
    }
}

// Export for ES6 modules
export { StorageManager };
