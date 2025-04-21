/**
 * State Manager for Search Pro Settings
 * 
 * Handles the current state of all settings, including:
 * - State updates with validation
 * - Event notifications
 * - Path-based value access and modification
 * - Diffing between states
 * - Change history for undo/redo
 */

import { 
    getDefaultSettings, 
    validateSettings, 
    getValueFromPath, 
    setValueAtPath,
    getSchemaVersion
} from './settings-schema.js';

class StateManager {
    /**
     * Creates a new StateManager instance
     * @param {Object} initialState Initial state (falls back to defaults)
     * @param {Object} options Configuration options
     */
    constructor(initialState = null, options = {}) {
        // Configuration options
        this._options = {
            maxHistoryStates: 20,       // Maximum number of history states to keep
            validateOnChange: true,     // Whether to validate state on every change
            notifyOnlyOnChange: true,   // Only notify listeners if state actually changed
            ...options
        };
        
        // State information
        this._state = null;             // Current state
        this._previousState = null;     // Previous state for change detection
        this._stateVersion = getSchemaVersion(); // Schema version of current state
        
        // History for undo/redo
        this._history = [];             // Past states
        this._historyPosition = -1;     // Current position in history (-1 = no history)
        this._historyLock = false;      // Lock to prevent history from being recorded during undo/redo
        
        // Event handling
        this._listeners = [];           // Change listeners
        this._pathListeners = new Map(); // Path-specific listeners
        
        // Initialize state with either provided state, localStorage, or defaults
        this.initialize(initialState);
    }
    
    /**
     * Initialize the state manager with the given state or defaults
     * @param {Object} initialState Initial state (falls back to defaults)
     * @returns {boolean} True if initialization was successful
     */
    initialize(initialState = null) {
        let state = initialState;
        
        // If no initialState, fall back to defaults
        if (!state) {
            state = getDefaultSettings();
        }
        
        // Validate initial state (but don't fail on invalid - just warn)
        const validation = validateSettings(state);
        if (!validation.isValid) {
            console.warn('[StateManager] Initial state validation warnings:', validation.errors);
        }
        
        // Set initial state (clone to prevent modification)
        this._state = JSON.parse(JSON.stringify(state));
        
        // Clear history
        this._history = [];
        this._historyPosition = -1;
        
        // Notify listeners of initialization
        this._notifyListeners(null, { type: 'initialize' });
        
        return true;
    }
    
    /**
     * Get the complete current state
     * @returns {Object} Full state object (deep clone)
     */
    getState() {
        return JSON.parse(JSON.stringify(this._state));
    }
    
    /**
     * Get the version of the current state schema
     * @returns {string} Schema version
     */
    getStateVersion() {
        return this._stateVersion;
    }
    
    /**
     * Get value at a specific path in the state
     * @param {string} path Dot-notation path to the desired value
     * @param {*} defaultValue Optional default value if path doesn't exist
     * @returns {*} Value at path or defaultValue if not found
     */
    getValue(path, defaultValue = undefined) {
        const value = getValueFromPath(this._state, path);
        return value === undefined ? defaultValue : value;
    }
    
    /**
     * Check if path exists in the current state
     * @param {string} path Dot-notation path
     * @returns {boolean} True if path exists
     */
    hasPath(path) {
        return getValueFromPath(this._state, path) !== undefined;
    }
    
    /**
     * Set entire state object with validation
     * @param {Object} newState New state object
     * @param {Object} options Options for this specific update
     * @returns {boolean} True if state was updated, false if invalid
     */
    setState(newState, options = {}) {
        if (!newState) return false;
        
        const updateOptions = {
            validate: this._options.validateOnChange,
            recordHistory: true,
            notifyListeners: true,
            ...options
        };
        
        // Validate new state if configured
        if (updateOptions.validate) {
            const validation = validateSettings(newState);
            if (!validation.isValid) {
                console.error('[StateManager] Invalid state:', validation.errors);
                return false;
            }
        }
        
        // Check if state actually changed
        if (this._options.notifyOnlyOnChange) {
            const currentStateStr = JSON.stringify(this._state);
            const newStateStr = JSON.stringify(newState);
            
            if (currentStateStr === newStateStr) {
                // No change, return true but don't update or notify
                return true;
            }
        }
        
        // Store previous state for diffing
        this._previousState = this._state;
        
        // Update state (clone to prevent external modification)
        this._state = JSON.parse(JSON.stringify(newState));
        
        // Record in history if not locked and if configured
        if (!this._historyLock && updateOptions.recordHistory) {
            this._addToHistory(this._previousState);
        }
        
        // Notify listeners if configured
        if (updateOptions.notifyListeners) {
            this._notifyListeners(this._previousState);
        }
        
        return true;
    }
    
    /**
     * Set value at a specific path in the state
     * @param {string} path Dot-notation path to set
     * @param {*} value Value to set at path
     * @param {Object} options Options for this specific update
     * @returns {boolean} True if state was updated, false if invalid
     */
    setValue(path, value, options = {}) {
        if (!path) return false;
        
        // Create a new state with the updated value
        const newState = this.getState();
        setValueAtPath(newState, path, value);
        
        // Apply the updated state
        const result = this.setState(newState, options);
        
        // Notify path listeners if state was updated
        if (result && options.notifyListeners !== false) {
            this._notifyPathListeners(path, value);
        }
        
        return result;
    }
    
    /**
     * Reset state to default values
     * @param {Object} options Options for this reset
     * @returns {boolean} True if state was reset
     */
    resetToDefaults(options = {}) {
        const defaults = getDefaultSettings();
        return this.setState(defaults, { 
            recordHistory: true, 
            notifyListeners: true, 
            ...options 
        });
    }
    
    /**
     * Get changes between current state and previous state
     * @returns {Object|null} Object with changes or null if no previous state
     */
    getChanges() {
        if (!this._previousState) return null;
        
        const changes = {};
        
        const findChanges = (current, previous, path = '') => {
            // Handle case where entire objects are different types
            if (typeof current !== typeof previous) {
                changes[path || 'root'] = { 
                    type: 'changed', 
                    value: current, 
                    oldValue: previous 
                };
                return;
            }
            
            // Handle non-object types
            if (typeof current !== 'object' || current === null || previous === null) {
                if (current !== previous) {
                    changes[path || 'root'] = { 
                        type: 'changed', 
                        value: current, 
                        oldValue: previous 
                    };
                }
                return;
            }
            
            // Handle arrays differently
            if (Array.isArray(current)) {
                if (!Array.isArray(previous) || 
                    current.length !== previous.length || 
                    JSON.stringify(current) !== JSON.stringify(previous)) {
                    changes[path || 'root'] = { 
                        type: 'changed', 
                        value: current, 
                        oldValue: previous 
                    };
                }
                return;
            }
            
            // Handle regular objects - find added, changed properties
            for (const key in current) {
                const currentPath = path ? `${path}.${key}` : key;
                
                // If key doesn't exist in previous, it's a new key
                if (!(key in previous)) {
                    changes[currentPath] = { 
                        type: 'added', 
                        value: current[key] 
                    };
                    continue;
                }
                
                // If both values are objects, recurse
                if (typeof current[key] === 'object' && current[key] !== null && 
                    typeof previous[key] === 'object' && previous[key] !== null) {
                    findChanges(current[key], previous[key], currentPath);
                } 
                // Otherwise compare directly
                else if (current[key] !== previous[key]) {
                    changes[currentPath] = { 
                        type: 'changed', 
                        value: current[key], 
                        oldValue: previous[key] 
                    };
                }
            }
            
            // Find deleted properties
            for (const key in previous) {
                const currentPath = path ? `${path}.${key}` : key;
                if (!(key in current)) {
                    changes[currentPath] = { 
                        type: 'deleted', 
                        oldValue: previous[key] 
                    };
                }
            }
        };
        
        findChanges(this._state, this._previousState);
        
        return Object.keys(changes).length > 0 ? changes : null;
    }
    
    /**
     * Subscribe to state changes
     * @param {Function} listener Function to call when state changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener) {
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }
        
        this._listeners.push(listener);
        
        // Return unsubscribe function
        return () => {
            this._listeners = this._listeners.filter(l => l !== listener);
        };
    }
    
    /**
     * Subscribe to changes at a specific path
     * @param {string} path Dot-notation path
     * @param {Function} listener Function to call when value at path changes
     * @returns {Function} Unsubscribe function
     */
    subscribePath(path, listener) {
        if (!path || typeof listener !== 'function') {
            throw new Error('Path and listener function are required');
        }
        
        if (!this._pathListeners.has(path)) {
            this._pathListeners.set(path, []);
        }
        
        this._pathListeners.get(path).push(listener);
        
        // Return unsubscribe function
        return () => {
            const listeners = this._pathListeners.get(path);
            if (listeners) {
                this._pathListeners.set(
                    path, 
                    listeners.filter(l => l !== listener)
                );
                
                // Clean up empty path listeners
                if (this._pathListeners.get(path).length === 0) {
                    this._pathListeners.delete(path);
                }
            }
        };
    }
    
    /**
     * Check if undo is available
     * @returns {boolean} True if undo is available
     */
    canUndo() {
        return this._historyPosition > 0;
    }
    
    /**
     * Check if redo is available
     * @returns {boolean} True if redo is available
     */
    canRedo() {
        return this._historyPosition < this._history.length - 1;
    }
    
    /**
     * Undo the last state change
     * @returns {boolean} True if undo was successful
     */
    undo() {
        if (!this.canUndo()) return false;
        
        this._historyLock = true;
        
        // Move back in history
        this._historyPosition--;
        const previousState = this._history[this._historyPosition];
        
        // Apply previous state
        const result = this.setState(previousState, { 
            recordHistory: false,
            notifyListeners: true 
        });
        
        this._historyLock = false;
        
        // Notify of undo
        if (result) {
            this._notifyListeners(null, { type: 'undo' });
        }
        
        return result;
    }
    
    /**
     * Redo the last undone state change
     * @returns {boolean} True if redo was successful
     */
    redo() {
        if (!this.canRedo()) return false;
        
        this._historyLock = true;
        
        // Move forward in history
        this._historyPosition++;
        const nextState = this._history[this._historyPosition];
        
        // Apply next state
        const result = this.setState(nextState, { 
            recordHistory: false,
            notifyListeners: true 
        });
        
        this._historyLock = false;
        
        // Notify of redo
        if (result) {
            this._notifyListeners(null, { type: 'redo' });
        }
        
        return result;
    }
    
    /**
     * Clear change history
     */
    clearHistory() {
        this._history = [];
        this._historyPosition = -1;
    }
    
    /**
     * Add current state to history
     * @private
     */
    _addToHistory(state) {
        // If we're not at the end of history, remove future states
        if (this._historyPosition < this._history.length - 1) {
            this._history = this._history.slice(0, this._historyPosition + 1);
        }
        
        // Add state to history (clone to prevent modification)
        this._history.push(JSON.parse(JSON.stringify(state)));
        
        // Move history position
        this._historyPosition = this._history.length - 1;
        
        // Limit history size
        if (this._history.length > this._options.maxHistoryStates) {
            this._history = this._history.slice(
                this._history.length - this._options.maxHistoryStates
            );
            this._historyPosition = this._history.length - 1;
        }
    }
    
    /**
     * Notify all listeners of state change
     * @param {Object} previousState Previous state for comparison
     * @param {Object} metadata Additional metadata about the change
     * @private
     */
    _notifyListeners(previousState, metadata = { type: 'change' }) {
        const state = this.getState();
        const changes = previousState ? this.getChanges() : null;
        
        // Notify all general listeners
        this._listeners.forEach(listener => {
            try {
                listener(state, changes, metadata);
            } catch (error) {
                console.error('[StateManager] Error in listener:', error);
            }
        });
    }
    
    /**
     * Notify path-specific listeners of value change
     * @param {string} path Path that changed
     * @param {*} value New value at path
     * @private
     */
    _notifyPathListeners(path, value) {
        if (!this._pathListeners.has(path)) return;
        
        // Notify all listeners for this path
        this._pathListeners.get(path).forEach(listener => {
            try {
                listener(value, path);
            } catch (error) {
                console.error(`[StateManager] Error in path listener for "${path}":`, error);
            }
        });
        
        // Also notify parent path listeners
        const parts = path.split('.');
        while (parts.length > 1) {
            parts.pop();
            const parentPath = parts.join('.');
            
            if (this._pathListeners.has(parentPath)) {
                const parentValue = this.getValue(parentPath);
                
                this._pathListeners.get(parentPath).forEach(listener => {
                    try {
                        listener(parentValue, parentPath);
                    } catch (error) {
                        console.error(`[StateManager] Error in parent path listener for "${parentPath}":`, error);
                    }
                });
            }
        }
    }
}

// For CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
}

// For ES modules environments
export default StateManager;