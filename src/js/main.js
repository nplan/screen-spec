// Main entry point for Screen Spec Calculator
// Initializes the application with ES6 modules

import { ScreenManager } from './ScreenManager.js';
import { ThemeManager } from './ThemeManager.js';
import { AccessibilityManager } from './AccessibilityManager.js';

// Initialize the accessibility system first
const accessibilityManager = new AccessibilityManager();

// Initialize the theme system
const themeManager = new ThemeManager();

// Initialize the main application
const screenManager = new ScreenManager();

// Connect accessibility manager to other managers
screenManager.setAccessibilityManager(accessibilityManager);
themeManager.setAccessibilityManager(accessibilityManager);

// Make globally accessible for any external access if needed
// (though with modules, this should be minimized)
window.screenManager = screenManager;
window.themeManager = themeManager;
window.accessibilityManager = accessibilityManager;
