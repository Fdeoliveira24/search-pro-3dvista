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
        this._history = [];             // Past state diffs (not full states)
        this._historyPosition = -1;     // Current position in history (-1 = no history)
        this._historyLock = false;      // Lock to prevent history from being recorded during undo/redo
        
        // Event handling
        this._listeners = [];           // Change listeners
        this._pathListeners = new Map(); // Path-specific listeners
        
        // Initialize state with either provided state, localStorage, or defaults
        this.initialize(initialState);
    }
    
    /**
     * Deep clone an object using structuredClone with fallback
     * @param {*} obj Object to clone
     * @returns {*} Cloned object
     * @private
     */
    _deepClone(obj) {
        // Use native structuredClone if available
        if (typeof structuredClone === 'function') {
            return structuredClone(obj);
        }
        
        // Fallback to custom implementation
        return this._deepCloneFallback(obj);
    }
    
    /**
     * Fallback deep clone implementation using WeakMap for circular references
     * @param {*} obj Object to clone
     * @param {WeakMap} seen WeakMap for tracking circular references
     * @returns {*} Cloned object
     * @private
     */
    _deepCloneFallback(obj, seen = new WeakMap()) {
        // Handle primitives and null
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        // Handle Date objects
        if (obj instanceof Date) {
            return new Date(obj);
        }
        
        // Handle RegExp objects
        if (obj instanceof RegExp) {
            return new RegExp(obj);
        }
        
        // Handle Array objects
        if (Array.isArray(obj)) {
            // Check for circular reference
            if (seen.has(obj)) {
                return seen.get(obj);
            }
            
            const clone = [];
            seen.set(obj, clone);
            
            for (let i = 0; i < obj.length; i++) {
                clone[i] = this._deepCloneFallback(obj[i], seen);
            }
            
            return clone;
        }
        
        // Handle plain objects
        if (Object.getPrototypeOf(obj) === Object.prototype) {
            // Check for circular reference
            if (seen.has(obj)) {
                return seen.get(obj);
            }
            
            const clone = {};
            seen.set(obj, clone);
            
            for (const key of Object.keys(obj)) {
                clone[key] = this._deepCloneFallback(obj[key], seen);
            }
            
            return clone;
        }
        
        // For other complex objects, fall back to JSON clone
        // This won't handle circular references or non-JSON objects
        return JSON.parse(JSON.stringify(obj));
    }
    
    /**
     * Generate diff between two objects
     * @param {Object} current Current object
     * @param {Object} previous Previous object
     * @returns {Object} Diff object with changes
     * @private
     */
    _createDiff(current, previous) {
        const diff = {};
        
        // Function to recursively find and record changes
        const findChanges = (curr, prev, path = '') => {
            // Handle case where types differ
            if (typeof curr !== typeof prev) {
                diff[path || '/'] = { type: 'replace', value: curr };
                return;
            }
            
            // Handle null values
            if (curr === null || prev === null) {
                if (curr !== prev) {
                    diff[path || '/'] = { type: 'replace', value: curr };
                }
                return;
            }
            
            // Handle primitives
            if (typeof curr !== 'object') {
                if (curr !== prev) {
                    diff[path || '/'] = { type: 'replace', value: curr };
                }
                return;
            }
            
            // Handle arrays
            if (Array.isArray(curr)) {
                if (!Array.isArray(prev) || curr.length !== prev.length) {
                    diff[path || '/'] = { type: 'replace', value: curr };
                    return;
                }
                
                // Check array contents
                let hasChanges = false;
                for (let i = 0; i < curr.length; i++) {
                    const itemPath = path ? `${path}/${i}` : `${i}`;
                    findChanges(curr[i], prev[i], itemPath);
                    
                    // If at least one item changed, mark as having changes
                    if (diff[itemPath]) {
                        hasChanges = true;
                    }
                }
                
                // If no individual items changed but arrays are different, replace whole array
                if (!hasChanges && !this._areObjectsEqual(curr, prev)) {
                    diff[path || '/'] = { type: 'replace', value: curr };
                }
                return;
            }
            
            // Handle objects - look for added or modified properties
            for (const key in curr) {
                const propPath = path ? `${path}/${key}` : key;
                
                if (!(key in prev)) {
                    // Added property
                    diff[propPath] = { type: 'add', value: curr[key] };
                } else {
                    // Potentially modified property - recurse
                    findChanges(curr[key], prev[key], propPath);
                }
            }
            
            // Look for deleted properties
            for (const key in prev) {
                if (!(key in curr)) {
                    const propPath = path ? `${path}/${key}` : key;
                    diff[propPath] = { type: 'delete' };
                }
            }
        };
        
        // Find all changes
        findChanges(current, previous);
        
        return diff;
    }
    
    /**
     * Apply a diff to the given state
     * @param {Object} state State to apply diff to
     * @param {Object} diff Diff to apply
     * @returns {Object} Updated state
     * @private
     */
    _applyDiff(state, diff) {
        const result = this._deepClone(state);
        
        for (const path in diff) {
            const change = diff[path];
            
            // Handle root path
            if (path === '/') {
                if (change.type === 'replace') {
                    return this._deepClone(change.value);
                }
                continue;
            }
            
            // Split path into segments (skip leading slash if present)
            const segments = path.split('/').filter(s => s !== '');
            
            // Apply the change
            if (change.type === 'replace' || change.type === 'add') {
                this._setPathValue(result, segments, change.value);
            } else if (change.type === 'delete') {
                this._deletePath(result, segments);
            }
        }
        
        return result;
    }
    
    /**
     * Set value at a path within an object
     * @param {Object} obj Object to modify
     * @param {Array<string>} segments Path segments
     * @param {*} value Value to set
     * @private
     */
    _setPathValue(obj, segments, value) {
        if (segments.length === 0) return;
        
        let current = obj;
        const lastIndex = segments.length - 1;
        
        // Navigate to parent of target
        for (let i = 0; i < lastIndex; i++) {
            const segment = segments[i];
            
            // Create parent if it doesn't exist
            if (current[segment] === undefined) {
                current[segment] = {};
            }
            
            current = current[segment];
        }
        
        // Set the value
        current[segments[lastIndex]] = this._deepClone(value);
    }
    
    /**
     * Delete value at a path within an object
     * @param {Object} obj Object to modify
     * @param {Array<string>} segments Path segments
     * @private
     */
    _deletePath(obj, segments) {
        if (segments.length === 0) return;
        
        let current = obj;
        const lastIndex = segments.length - 1;
        
        // Navigate to parent of target
        for (let i = 0; i < lastIndex; i++) {
            const segment = segments[i];
            if (current[segment] === undefined) {
                return; // Path doesn't exist, nothing to delete
            }
            current = current[segment];
        }
        
        // Delete the property
        delete current[segments[lastIndex]];
    }
    
    /**
     * Check if two objects are equal using field comparison
     * @param {Object} a First object
     * @param {Object} b Second object
     * @returns {boolean} True if objects are equal
     * @private
     */
    _areObjectsEqual(a, b) {
        // Handle primitives and nulls
        if (a === b) return true;
        if (a === null || b === null) return false;
        if (typeof a !== 'object' || typeof b !== 'object') return false;
        
        // Check if array types match
        const aIsArray = Array.isArray(a);
        const bIsArray = Array.isArray(b);
        if (aIsArray !== bIsArray) return false;
        
        // Handle arrays
        if (aIsArray) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (!this._areObjectsEqual(a[i], b[i])) return false;
            }
            return true;
        }
        
        // Get keys of both objects
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        
        // Check if they have the same number of keys
        if (aKeys.length !== bKeys.length) return false;
        
        // Check if all keys in a exist in b and have equal values
        for (const key of aKeys) {
            if (!b.hasOwnProperty(key)) return false;
            if (!this._areObjectsEqual(a[key], b[key])) return false;
        }
        
        return true;
    }
    
    /**
     * Check if state has changes compared to previous state (shallow comparison)
     * @param {Object} newState New state
     * @returns {boolean} True if state has changes
     * @private
     */
    _hasChanges(newState) {
        if (!this._previousState) return true;
        
        return !this._areObjectsEqual(newState, this._previousState);
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
        this._state = this._deepClone(state);
        
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
        return this._deepClone(this._state);
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
        if (this._options.notifyOnlyOnChange && !this._hasChanges(newState)) {
            // No change, return true but don't update or notify
            return true;
        }
        
        // Store previous state for diffing
        this._previousState = this._state;
        
        // Update state (clone to prevent external modification)
        this._state = this._deepClone(newState);
        
        // Record in history if not locked and if configured
        if (!this._historyLock && updateOptions.recordHistory) {
            // Create and store diff instead of full state
            const diff = this._createDiff(this._state, this._previousState);
            if (Object.keys(diff).length > 0) {
                this._addToHistory(diff);
            }
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
                    !this._areObjectsEqual(current, previous)) {
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
        
        // Reconstruct state by working backwards through diffs
        let reconstructedState = this._deepClone(this._state);
        
        // Get all diffs from current position back to the beginning
        for (let i = this._historyPosition; i >= 0; i--) {
            const diff = this._history[i];
            const invertedDiff = this._invertDiff(diff);
            reconstructedState = this._applyDiff(reconstructedState, invertedDiff);
        }
        
        // Apply reconstructed state
        const result = this.setState(reconstructedState, { 
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
        
        // Apply the next diff
        this._historyPosition++;
        const diff = this._history[this._historyPosition];
        
        // Apply diff to current state
        const newState = this._applyDiff(this._state, diff);
        
        // Apply new state
        const result = this.setState(newState, { 
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
     * Invert a diff for undo operations
     * @param {Object} diff Diff to invert
     * @returns {Object} Inverted diff
     * @private
     */
    _invertDiff(diff) {
        const inverted = {};
        
        for (const path in diff) {
            const change = diff[path];
            
            if (change.type === 'replace' || change.type === 'add') {
                // For add operations, we need to delete
                // For replace, we need the old value (need to apply previous diffs to get this)
                inverted[path] = { type: 'delete' };
            } else if (change.type === 'delete') {
                // For delete operations, we need to add back what was there
                // But we don't have this info in the current diff format
                // We'd need to either store old values or calculate them
                inverted[path] = { type: 'restore' };
            }
        }
        
        return inverted;
    }
    
    /**
     * Add diff to history
     * @param {Object} diff State diff to add to history
     * @private
     */
    _addToHistory(diff) {
        // If we're not at the end of history, remove future diffs
        if (this._historyPosition < this._history.length - 1) {
            this._history = this._history.slice(0, this._historyPosition + 1);
        }
        
        // Add diff to history
        this._history.push(diff);
        
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