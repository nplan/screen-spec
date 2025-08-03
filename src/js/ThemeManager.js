// Theme Manager - Handles dark/light theme switching with system preference detection
// Provides persistent theme storage and automatic system preference detection

import { CONFIG } from './config.js';

export class ThemeManager {
    constructor() {
        this.currentTheme = CONFIG.THEME.DEFAULT;
        this.systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.themeChangeCallbacks = [];
        this.accessibilityManager = null; // Will be set by main.js
        
        this.init();
    }
    
    /**
     * Set accessibility manager reference for integration
     */
    setAccessibilityManager(accessibilityManager) {
        this.accessibilityManager = accessibilityManager;
    }

    /**
     * Initialize the theme manager
     * Loads saved theme preference and sets up system preference listener
     */
    init() {
        // Load saved theme preference
        this.loadThemePreference();
        
        // Apply the initial theme
        this.applyTheme();
        
        // Listen for system theme changes
        this.systemMediaQuery.addEventListener('change', () => {
            if (this.currentTheme === CONFIG.THEME.THEMES.SYSTEM) {
                this.applyTheme();
            }
        });
        
        // Create and add theme toggle button
        this.createThemeToggle();
    }

    /**
     * Load theme preference from localStorage or use default
     */
    loadThemePreference() {
        try {
            const savedTheme = localStorage.getItem(CONFIG.THEME.STORAGE_KEY);
            if (savedTheme && Object.values(CONFIG.THEME.THEMES).includes(savedTheme)) {
                this.currentTheme = savedTheme;
            }
        } catch (error) {
            console.warn('Failed to load theme preference:', error);
            this.currentTheme = CONFIG.THEME.DEFAULT;
        }
    }

    /**
     * Save current theme preference to localStorage
     */
    saveThemePreference() {
        try {
            localStorage.setItem(CONFIG.THEME.STORAGE_KEY, this.currentTheme);
        } catch (error) {
            console.warn('Failed to save theme preference:', error);
        }
    }

    /**
     * Get the effective theme (resolves 'system' to actual theme)
     * @returns {string} The effective theme ('light' or 'dark')
     */
    getEffectiveTheme() {
        if (this.currentTheme === CONFIG.THEME.THEMES.SYSTEM) {
            return this.systemMediaQuery.matches ? CONFIG.THEME.THEMES.DARK : CONFIG.THEME.THEMES.LIGHT;
        }
        return this.currentTheme;
    }

    /**
     * Apply the current theme to the document
     */
    applyTheme() {
        const effectiveTheme = this.getEffectiveTheme();
        const html = document.documentElement;
        
        // Remove existing theme classes
        html.classList.remove(
            `${CONFIG.THEME.CSS_CLASS_PREFIX}${CONFIG.THEME.THEMES.LIGHT}`,
            `${CONFIG.THEME.CSS_CLASS_PREFIX}${CONFIG.THEME.THEMES.DARK}`
        );
        
        // Add new theme class
        html.classList.add(`${CONFIG.THEME.CSS_CLASS_PREFIX}${effectiveTheme}`);
        
        // Set data attribute for CSS targeting
        html.setAttribute(CONFIG.THEME.DATA_ATTRIBUTE, effectiveTheme);
        
        // Notify listeners of theme change
        this.notifyThemeChange(effectiveTheme);
    }

    /**
     * Set a new theme
     * @param {string} theme - The theme to set ('light', 'dark', or 'system')
     */
    setTheme(theme) {
        if (!Object.values(CONFIG.THEME.THEMES).includes(theme)) {
            console.warn(`Invalid theme: ${theme}`);
            return;
        }

        this.currentTheme = theme;
        this.saveThemePreference();
        this.applyTheme();
        this.updateToggleButton();
        
        // Update accessibility
        if (this.accessibilityManager) {
            this.accessibilityManager.updateThemeButtonAria(theme);
            this.accessibilityManager.announceThemeChange(this.getThemeDisplayName(theme));
        }
    }

    /**
     * Get the current theme preference
     * @returns {string} The current theme preference
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Toggle between light and dark themes (skips system)
     */
    toggleTheme() {
        const effectiveTheme = this.getEffectiveTheme();
        const newTheme = effectiveTheme === CONFIG.THEME.THEMES.LIGHT ? 
            CONFIG.THEME.THEMES.DARK : CONFIG.THEME.THEMES.LIGHT;
        this.setTheme(newTheme);
    }

    /**
     * Cycle through all theme options: light -> dark -> system -> light
     */
    cycleTheme() {
        const themes = Object.values(CONFIG.THEME.THEMES);
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.setTheme(themes[nextIndex]);
    }

    /**
     * Add a callback to be notified when theme changes
     * @param {Function} callback - Function to call when theme changes
     */
    onThemeChange(callback) {
        if (typeof callback === 'function') {
            this.themeChangeCallbacks.push(callback);
        }
    }

    /**
     * Notify all registered callbacks of theme change
     * @param {string} effectiveTheme - The new effective theme
     */
    notifyThemeChange(effectiveTheme) {
        this.themeChangeCallbacks.forEach(callback => {
            try {
                callback(effectiveTheme, this.currentTheme);
            } catch (error) {
                console.warn('Theme change callback error:', error);
            }
        });
    }

    /**
     * Create and add the theme toggle button to the UI
     */
    createThemeToggle() {
        const toggleButton = document.createElement('button');
        toggleButton.id = 'theme-toggle';
        toggleButton.className = 'theme-toggle';
        toggleButton.setAttribute('aria-label', 'Toggle theme');
        toggleButton.setAttribute('title', 'Toggle theme (Light/Dark/System)');
        
        // Add click handler
        toggleButton.addEventListener('click', () => {
            this.cycleTheme();
        });
        
        // Insert button into the header controls container
        const headerControls = document.querySelector('.header-controls');
        if (headerControls) {
            // Add to the beginning of header controls (left side)
            headerControls.insertBefore(toggleButton, headerControls.firstChild);
        } else {
            // Fallback: add to body
            document.body.appendChild(toggleButton);
        }
        
        this.toggleButton = toggleButton;
        this.updateToggleButton();
    }

    /**
     * Update the theme toggle button appearance and text
     */
    updateToggleButton() {
        if (!this.toggleButton) return;
        
        const icons = {
            [CONFIG.THEME.THEMES.LIGHT]: 'light_mode',
            [CONFIG.THEME.THEMES.DARK]: 'dark_mode',
            [CONFIG.THEME.THEMES.SYSTEM]: 'brightness_auto'
        };
        
        const labels = {
            [CONFIG.THEME.THEMES.LIGHT]: 'Light theme',
            [CONFIG.THEME.THEMES.DARK]: 'Dark theme',
            [CONFIG.THEME.THEMES.SYSTEM]: 'System theme'
        };
        
        this.toggleButton.textContent = icons[this.currentTheme] || 'brightness_auto';
        this.toggleButton.setAttribute('aria-label', labels[this.currentTheme] || 'Toggle theme');
        this.toggleButton.setAttribute('title', `Current: ${labels[this.currentTheme] || 'System'} - Click to cycle`);
    }

    /**
     * Check if dark theme is currently active
     * @returns {boolean} True if dark theme is active
     */
    isDarkTheme() {
        return this.getEffectiveTheme() === CONFIG.THEME.THEMES.DARK;
    }

    /**
     * Check if light theme is currently active
     * @returns {boolean} True if light theme is active
     */
    isLightTheme() {
        return this.getEffectiveTheme() === CONFIG.THEME.THEMES.LIGHT;
    }

    /**
     * Get the display name for a theme
     * @param {string} theme - Theme identifier
     * @returns {string} Human-readable theme name
     */
    getThemeDisplayName(theme) {
        const names = {
            [CONFIG.THEME.THEMES.LIGHT]: 'Light',
            [CONFIG.THEME.THEMES.DARK]: 'Dark',
            [CONFIG.THEME.THEMES.SYSTEM]: 'System'
        };
        return names[theme] || 'Unknown';
    }

    /**
     * Get theme colors for the current theme
     * @returns {Object} Theme color object
     */
    getThemeColors() {
        const effectiveTheme = this.getEffectiveTheme();
        return effectiveTheme === CONFIG.THEME.THEMES.DARK ? 
            CONFIG.COLORS.DARK : CONFIG.COLORS.LIGHT;
    }
}
