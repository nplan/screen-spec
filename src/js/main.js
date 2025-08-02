// Main entry point for Screen Spec Calculator
// Initializes the application with ES6 modules

import { ScreenManager } from './ScreenManager.js';

// Initialize the application
const screenManager = new ScreenManager();

// Make it globally accessible for any external access if needed
// (though with modules, this should be minimized)
window.screenManager = screenManager;
