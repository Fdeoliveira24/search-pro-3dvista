/**
 * Search Pro Configuration Panel Initialization
 * 
 * This script initializes the configuration panel with all required components:
 * - Imports the required modules
 * - Creates instances of StateManager, StorageManager, and UIManager
 * - Initializes the UI and applies settings
 * 
 * Usage: Include this script after all component scripts are loaded
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Search Pro Configuration Panel...');
    
    // Import modules (using dynamic import for compatibility)
    Promise.all([
        import('./js/settings-schema.js'),
        import('./js/state-manager.js'),
        import('./js/storage-manager.js'),
        import('./js/ui-manager.js')
    ])
    .then(([
        { getDefaultSettings },
        { default: StateManager },
        { default: StorageManager },
        { default: UIManager }
    ]) => {
        console.log('All modules loaded successfully');
        
        // Initialize managers
        const stateManager = new StateManager(getDefaultSettings());
        const storageManager = new StorageManager('searchPro.config');
        
        // Create UI Manager with container
        const uiManager = new UIManager({
            container: document.getElementById('app') || document.body,
            stateManager: stateManager,
            storageManager: storageManager,
            showPreviewToggle: true,
            autoSave: false,
            showUnsavedChanges: true,
            mobileBreakpoint: 768
        });
        
        // Initialize UI
        uiManager.init();
        
        // Export managers to window for debugging
        window.searchProManagers = {
            stateManager,
            storageManager,
            uiManager
        };
        
        console.log('Search Pro Configuration Panel initialized');
        
        // Debug: Check if tour search functions are available
        if (window.opener && window.opener.tourSearchFunctions) {
            console.log('Tour search functions available in opener window');
        } else if (window.parent !== window && window.parent.tourSearchFunctions) {
            console.log('Tour search functions available in parent frame');
        } else if (window.tourSearchFunctions) {
            console.log('Tour search functions available in current window');
        } else {
            console.warn('Tour search functions not found in any context');
        }
    })
    .catch(error => {
        console.error('Failed to initialize Search Pro Configuration Panel:', error);
        
        // Show error message in the UI
        const container = document.getElementById('app') || document.body;
        container.innerHTML = 
            <div style="padding: 20px; background-color: #fef2f2; border-left: 4px solid #ef4444; color: #b91c1c;">
                <h2>Error Loading Configuration Panel</h2>
                <p>${error.message}</p>
                <p>Please check the console for more details.</p>
            </div>
        ;
    });
});

// Alternative initialization using classic script loading pattern
function initSearchProConfigPanel() {
    try {
        console.log('Initializing Search Pro Configuration Panel (classic)...');
        
        // Check if required modules are loaded
        if (!window.StateManager || !window.StorageManager || !window.UIManager) {
            throw new Error('Required modules not loaded. Check script tags.');
        }
        
        // Initialize managers
        const stateManager = new window.StateManager(window.getDefaultSettings());
        const storageManager = new window.StorageManager('searchPro.config');
        
        // Create UI Manager with container
        const uiManager = new window.UIManager({
            container: document.getElementById('app') || document.body,
            stateManager: stateManager,
            storageManager: storageManager,
            showPreviewToggle: true,
            autoSave: false,
            showUnsavedChanges: true,
            mobileBreakpoint: 768
        });
        
        // Initialize UI
        uiManager.init();
        
        // Export managers to window for debugging
        window.searchProManagers = {
            stateManager,
            storageManager,
            uiManager
        };
        
        console.log('Search Pro Configuration Panel initialized (classic)');
    } catch (error) {
        console.error('Failed to initialize Search Pro Configuration Panel:', error);
        
        // Show error message in the UI
        const container = document.getElementById('app') || document.body;
        container.innerHTML = 
            <div style="padding: 20px; background-color: #fef2f2; border-left: 4px solid #ef4444; color: #b91c1c;">
                <h2>Error Loading Configuration Panel</h2>
                <p>${error.message}</p>
                <p>Please check the console for more details.</p>
            </div>
        ;
    }
}

// Run initialization if modules are loaded via script tags
if (typeof StateManager !== 'undefined' && 
    typeof StorageManager !== 'undefined' && 
    typeof UIManager !== 'undefined') {
    window.addEventListener('load', initSearchProConfigPanel);
}