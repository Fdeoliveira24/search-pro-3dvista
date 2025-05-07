/**
 * Search Pro Initialization
 * 
 * This script initializes the Search Pro configuration panel and exposes
 * the managers to the global window object for debugging and external access.
 * 
 * IMPORTANT: Maintains backward compatibility with 3DVista tours that use:
 * window.tourSearchFunctions.initializeSearch(this);
 */

// Import with correct paths (no '/js/' prefix)
import StateManager from './state-manager.js';
import StorageManager from './storage-manager.js';
import UIManager from './ui-manager.js';

// Set global class references ONCE, immediately after import
window.StateManager = StateManager;
window.StorageManager = StorageManager;

// Centralized initializer for Search Pro
class SearchProInitializer {
    constructor() {
        this._initialized = false;
        this.stateManager = null;
        this.storageManager = null;
        this.uiManager = null;
    }

    initialize(tourInstance) {
        if (this._initialized) {
            console.info('[SearchProInitializer] Already initialized.');
            return;
        }
        this._initialized = true;
        console.info('[SearchProInitializer] Initializing Search Pro...');

        // Create managers
        this.stateManager = new StateManager();
        this.storageManager = new StorageManager('searchPro.config');
        this.uiManager = new UIManager(this.stateManager, this.storageManager);

        // Store instances globally for debug and legacy compatibility
        window.searchProManagers = {
            stateManager: this.stateManager,
            uiManager: this.uiManager,
            storageManager: this.storageManager
        };

        // Initialize the UI (settings panel or tour)
        this.uiManager.initialize();

        // Run debug diagnostics if available
        if (window.searchProDebugTools) {
            setTimeout(() => window.searchProDebugTools.runDiagnostics(), 1000);
        }

        // Any additional DOM event handlers or global assignments
        this._setupDomEventHandlers();

        // For backward compatibility, expose tourSearchFunctions if needed
        if (!window.tourSearchFunctions) {
            window.tourSearchFunctions = {};
        }

        // Provide all required functions for compatibility
        window.tourSearchFunctions.initializeSearch = this.initialize.bind(this);
        window.tourSearchFunctions.toggleSearch = (show) => {
            if (this.uiManager && typeof this.uiManager.toggleSearch === 'function') {
                return this.uiManager.toggleSearch(show);
            }
        };
        window.tourSearchFunctions.getConfig = () => {
            if (this.stateManager && typeof this.stateManager.getState === 'function') {
                return this.stateManager.getState();
            }
            return null;
        };
        window.tourSearchFunctions.updateConfig = (config) => {
            if (this.stateManager && typeof this.stateManager.setState === 'function') {
                this.stateManager.setState(config);
                if (this.uiManager && typeof this.uiManager.applyStateToControls === 'function') {
                    this.uiManager.applyStateToControls(true);
                }
            }
        };

        // Handle legacy flag for searchListInitiinitialized
        if (typeof window.searchListInitiinitialized === 'undefined') {
            window.searchListInitiinitialized = true;
        }

        // Logging for tracking
        console.info('[SearchProInitializer] Initialization complete.');
    }

    _setupDomEventHandlers() {
        // Move any DOMContentLoaded or other event logic here if needed
        // Example: Incognito warning, import/export, etc.
        // ...existing code from settings.html event listeners...
    }
}

// Singleton instance for global access
window.SearchProInitializer = window.SearchProInitializer || new SearchProInitializer();

// Auto-initialize on DOMContentLoaded for settings panel
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.SearchProInitializer.initialize();
    });
} else {
    window.SearchProInitializer.initialize();
}

// Ensure we don't overwrite existing tourSearchFunctions if they exist
if (!window.tourSearchFunctions) {
  console.warn('[SearchPro] tourSearchFunctions not found, search functionality may be limited');
}

// Make sure the proper window interfaces for 3DVista are maintained
// These MUST remain for compatibility with 3DVista tour buttons
SearchProInitializer.ensureTourFunctionsExist = function() {
  if (!window.tourSearchFunctions || !window.tourSearchFunctions.initializeSearch) {
    console.info('[SearchPro] Setting up tourSearchFunctions interface');
    // We're creating a reference, not replacing existing functions
    window.tourSearchFunctions = window.tourSearchFunctions || {};
    
    // Only add methods if they don't already exist
    if (!window.tourSearchFunctions.initializeSearch) {
      window.tourSearchFunctions.initializeSearch = function(tour) {
        console.info('[SearchPro] initializeSearch called with tour object');
        window.tourInstance = tour;
        return true;
      };
    }
    
    if (!window.tourSearchFunctions.toggleSearch) {
      window.tourSearchFunctions.toggleSearch = function(show) {
        console.info('[SearchPro] toggleSearch called with show:', show);
        const searchContainer = document.getElementById('searchContainer');
        if (searchContainer) {
          searchContainer.style.display = show ? 'block' : 'none';
          searchContainer.classList.toggle('visible', show);
        }
        return true;
      };
    }
  }
};

// Call this function to ensure the interface exists
SearchProInitializer.ensureTourFunctionsExist();

// Export the initializer for ES modules
export default SearchProInitializer;