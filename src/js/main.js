// Main entry point for Screen Spec Calculator
// Initializes the application with ES6 modules

import { ScreenManager } from './ScreenManager.js';
import { ThemeManager } from './ThemeManager.js';

// Initialize the theme system first
const themeManager = new ThemeManager();

// Initialize the application
const screenManager = new ScreenManager();

// Make globally accessible for any external access if needed
// (though with modules, this should be minimized)
window.screenManager = screenManager;
window.themeManager = themeManager;
