/**
 * Search Pro Initialization
 * 
 * This script initializes the Search Pro configuration panel and exposes
 * the managers to the global window object for debugging and external access.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Import required modules
    import('./settings-schema.js')
        .then(module => {
            // Create the main managers
            const stateManager = new StateManager();
            const storageManager = new StorageManager('searchPro.config');
            const uiManager = new UIManager(stateManager, storageManager);
            
            // Initialize the UI
            uiManager.initialize();
            
            // Expose the managers globally for external access
            window.searchProManagers = { stateManager, uiManager, storageManager };
            
            console.log('[SearchPro] Initialization complete, managers exposed to window.searchProManagers');
        })
        .catch(error => {
            console.error('[SearchPro] Failed to initialize:', error);
        });
});

/**
 * The StateManager handles application state and notifies listeners of changes
 */
class StateManager {
    constructor(initialState = {}) {
        this.state = initialState;
        this.listeners = [];
        this._tabScrollPositions = new Map();
    }
    
    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }
    
    setState(newState, path = null) {
        if (path) {
            const parts = path.split('.');
            let current = this.state;
            
            // Navigate to the parent object
            for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) {
                    current[parts[i]] = {};
                }
                current = current[parts[i]];
            }
            
            // Set the value at the final path
            current[parts[parts.length - 1]] = newState;
        } else {
            this.state = {...this.state, ...newState};
        }
        
        this.notifyListeners();
    }
    
    subscribe(listener) {
        this.listeners.push(listener);
        return () => this.listeners = this.listeners.filter(l => l !== listener);
    }
    
    notifyListeners() {
        this.listeners.forEach(listener => listener(this.state));
    }
    
    saveTabScrollPosition(tabId, position) {
        this._tabScrollPositions.set(tabId, position);
    }
    
    getTabScrollPosition(tabId) {
        return this._tabScrollPositions.get(tabId) || 0;
    }
}

/**
 * The StorageManager handles persistence of settings
 */
class StorageManager {
    constructor(key = 'searchPro.config') {
        this.storageKey = key;
    }
    
    save(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('[SearchPro] Failed to save settings:', e);
            return false;
        }
    }
    
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.error('[SearchPro] Failed to load settings:', e);
            return null;
        }
    }
    
    clear() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (e) {
            console.error('[SearchPro] Failed to clear settings:', e);
            return false;
        }
    }
    
    exportForServer(data) {
        try {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'search-config.json';
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            return true;
        } catch (e) {
            console.error('[SearchPro] Failed to export server configuration:', e);
            return false;
        }
    }
    
    validateImport(data) {
        const result = {
            valid: false,
            settings: null,
            warnings: [],
            errors: []
        };
        
        try {
            // Check basic structure
            if (!data) {
                result.errors.push('Import data is empty or null');
                return result;
            }
            
            // If data is directly a settings object (no wrapper)
            const settingsObj = data.settings || data;
            
            // Check for required top-level sections
            const requiredSections = ['display', 'appearance', 'includeContent', 'searchBar'];
            const missingSections = requiredSections.filter(section => !settingsObj[section]);
            
            if (missingSections.length > 0) {
                result.warnings.push(`Missing required sections: ${missingSections.join(', ')}`);
            }
            
            // Simple validation
            if (settingsObj.minSearchChars !== undefined && 
                (typeof settingsObj.minSearchChars !== 'number' || 
                 settingsObj.minSearchChars < 1 || 
                 settingsObj.minSearchChars > 10)) {
                result.warnings.push('minSearchChars should be a number between 1 and 10');
            }
            
            // If we have settings and no critical errors, mark as valid
            if (settingsObj) {
                result.valid = true;
                result.settings = settingsObj;
            }
            
            return result;
        } catch (error) {
            result.errors.push(`Validation error: ${error.message}`);
            return result;
        }
    }
}