/**
 * Integration Manager for Search Pro Settings
 * 
 * Serves as the bridge between the settings panel and the active search plugin:
 * - Applies configuration to the search plugin
 * - Monitors search plugin for external changes
 * - Handles initialization and cleanup
 * - Provides debounced updates for performance
 * - Supports target mode for different tour contexts
 */

import { getSchemaVersion } from './settings-schema.js';
import StateManager from './state-manager.js';

class IntegrationManager {
    /**
     * Creates a new IntegrationManager instance
     * @param {Object} options Configuration options
     */
    constructor(options = {}) {
        // Default configuration
        this._options = {
            stateManager: null,              // StateManager instance
            updateDelay: 300,                // Debounce delay for updates (ms)
            targetMode: 'auto',              // Target mode: 'auto', 'window', 'parent', 'opener', 'iframe', 'custom'
            targetElement: null,             // Custom target element (for iframe mode)
            targetFunction: null,            // Custom target function
            validateBeforeApply: true,       // Validate settings before applying
            autoReconnect: true,             // Auto reconnect if target changes
            reconnectInterval: 2000,         // Reconnect interval (ms)
            applyOnConnect: true,            // Apply settings when connecting
            monitorExternalChanges: false,   // Monitor for external changes
            monitorInterval: 5000,           // Interval for monitoring (ms)
            ...options
        };
        
        // Internal state
        this._stateManager = null;           // StateManager instance
        this._connected = false;             // Whether connected to search plugin
        this._target = null;                 // Target window/context
        this._updateTimer = null;            // Timer for debounced updates
        this._reconnectTimer = null;         // Timer for reconnection
        this._monitorTimer = null;           // Timer for external change monitoring
        this._initialConnectionAttempts = 0; // Connection attempt counter
        this._lastAppliedState = null;       // Last state applied to search plugin
        
        // Initialize
        this._initialize();
    }
    
    /**
     * Initialize the integration manager
     * @private
     */
    _initialize() {
        // Set up state manager
        if (this._options.stateManager instanceof StateManager) {
            this._stateManager = this._options.stateManager;
        } else {
            this._stateManager = new StateManager();
        }
        
        // Subscribe to state changes
        this._stateManager.subscribe(this._handleStateChange.bind(this));
        
        // Connect to search plugin
        this._connect();
        
        // Set up monitoring if enabled
        if (this._options.monitorExternalChanges) {
            this._startMonitoring();
        }
    }
    
    /**
     * Connect to search plugin
     * @returns {boolean} True if connection was successful
     * @private
     */
    _connect() {
        // Find target based on mode
        const target = this._findTarget();
        
        if (!target) {
            this._connected = false;
            
            // Schedule reconnect if configured
            if (this._options.autoReconnect && this._initialConnectionAttempts < 10) {
                this._initialConnectionAttempts++;
                
                if (this._reconnectTimer) {
                    clearTimeout(this._reconnectTimer);
                }
                
                this._reconnectTimer = setTimeout(() => {
                    this._connect();
                }, this._options.reconnectInterval);
            }
            
            return false;
        }
        
        // Check if target has search plugin
        if (!this._hasSearchPlugin(target)) {
            this._connected = false;
            
            // Schedule reconnect if configured
            if (this._options.autoReconnect && this._initialConnectionAttempts < 10) {
                this._initialConnectionAttempts++;
                
                if (this._reconnectTimer) {
                    clearTimeout(this._reconnectTimer);
                }
                
                this._reconnectTimer = setTimeout(() => {
                    this._connect();
                }, this._options.reconnectInterval);
            }
            
            return false;
        }
        
        // Store target
        this._target = target;
        this._connected = true;
        this._initialConnectionAttempts = 0;
        
        console.info('[IntegrationManager] Connected to search plugin');
        
        // Apply current settings if configured
        if (this._options.applyOnConnect) {
            this.applySettings();
        }
        
        return true;
    }
    
    /**
     * Find target based on mode
     * @returns {Object|null} Target window/context or null if not found
     * @private
     */
    _findTarget() {
        switch (this._options.targetMode) {
            case 'window':
                return window;
                
            case 'parent':
                return window.parent !== window ? window.parent : null;
                
            case 'opener':
                return window.opener || null;
                
            case 'iframe':
                if (this._options.targetElement instanceof HTMLIFrameElement) {
                    try {
                        return this._options.targetElement.contentWindow || null;
                    } catch (e) {
                        console.error('[IntegrationManager] Error accessing iframe:', e);
                        return null;
                    }
                }
                return null;
                
            case 'custom':
                if (typeof this._options.targetFunction === 'function') {
                    try {
                        return this._options.targetFunction() || null;
                    } catch (e) {
                        console.error('[IntegrationManager] Error in custom target function:', e);
                        return null;
                    }
                }
                return null;
                
            case 'auto':
            default:
                // Try various targets in order
                return window.opener || 
                       (window.parent !== window ? window.parent : null) || 
                       window;
        }
    }
    
    /**
     * Check if target has search plugin
     * @param {Object} target Target to check
     * @returns {boolean} True if target has search plugin
     * @private
     */
    _hasSearchPlugin(target) {
        try {
            return Boolean(
                target.tourSearchFunctions && 
                typeof target.tourSearchFunctions.updateConfig === 'function'
            );
        } catch (e) {
            // Handle cross-origin errors
            console.error('[IntegrationManager] Error checking search plugin:', e);
            return false;
        }
    }
    
    /**
     * Handle state change
     * @param {Object} state Current state
     * @param {Object} changes Changes since last state
     * @private
     */
    _handleStateChange(state, changes) {
        // Schedule update if connected
        if (this._connected) {
            this._scheduleUpdate();
        }
    }
    
    /**
     * Schedule update with debounce
     * @private
     */
    _scheduleUpdate() {
        // Clear existing timer
        if (this._updateTimer) {
            clearTimeout(this._updateTimer);
        }
        
        // Set new timer
        this._updateTimer = setTimeout(() => {
            this.applySettings();
        }, this._options.updateDelay);
    }
    
    /**
     * Apply current settings to search plugin
     * @param {Object} options Application options
     * @returns {boolean} True if settings were applied
     */
    applySettings(options = {}) {
        const applyOptions = {
            force: false,           // Force apply even if not changed
            validate: this._options.validateBeforeApply,
            ...options
        };
        
        // Check if connected
        if (!this._connected || !this._target) {
            if (this._options.autoReconnect) {
                this._connect();
            }
            
            if (!this._connected) {
                console.warn('[IntegrationManager] Not connected to search plugin');
                return false;
            }
        }
        
        // Get current state
        const state = this._stateManager.getState();
        
        // Skip if not changed and not forced
        if (!applyOptions.force && 
            this._lastAppliedState && 
            JSON.stringify(state) === JSON.stringify(this._lastAppliedState)) {
            return true;
        }
        
        try {
            // Apply to search plugin
            if (this._target.tourSearchFunctions && 
                typeof this._target.tourSearchFunctions.updateConfig === 'function') {
                this._target.tourSearchFunctions.updateConfig(state);
                
                // Store last applied state
                this._lastAppliedState = JSON.parse(JSON.stringify(state));
                
                console.info('[IntegrationManager] Settings applied to search plugin');
                return true;
            } else {
                console.warn('[IntegrationManager] Search plugin not available');
                
                // Connection lost, try to reconnect
                this._connected = false;
                
                if (this._options.autoReconnect) {
                    this._connect();
                }
                
                return false;
            }
        } catch (error) {
            console.error('[IntegrationManager] Error applying settings:', error);
            
            // Connection might be lost, try to reconnect
            this._connected = false;
            
            if (this._options.autoReconnect) {
                this._connect();
            }
            
            return false;
        }
    }
    
    /**
     * Check if connected to search plugin
     * @returns {boolean} True if connected
     */
    isConnected() {
        return this._connected;
    }
    
    /**
     * Get the target window/context
     * @returns {Object|null} Target or null if not connected
     */
    getTarget() {
        return this._target;
    }
    
    /**
     * Try to reconnect to search plugin
     * @returns {boolean} True if reconnection was successful
     */
    reconnect() {
        return this._connect();
    }
    
    /**
     * Start monitoring for external changes
     * @private
     */
    _startMonitoring() {
        // Clear existing timer
        if (this._monitorTimer) {
            clearInterval(this._monitorTimer);
        }
        
        // Set new timer
        this._monitorTimer = setInterval(() => {
            this._checkExternalChanges();
        }, this._options.monitorInterval);
    }
    
    /**
     * Stop monitoring for external changes
     */
    stopMonitoring() {
        if (this._monitorTimer) {
            clearInterval(this._monitorTimer);
            this._monitorTimer = null;
        }
    }
    
    /**
     * Check for external changes to search plugin configuration
     * @private
     */
    _checkExternalChanges() {
        if (!this._connected || !this._target) {
            return;
        }
        
        try {
            // Get current configuration from search plugin
            if (this._target.tourSearchFunctions && 
                typeof this._target.tourSearchFunctions.getConfig === 'function') {
                const externalConfig = this._target.tourSearchFunctions.getConfig();
                
                // Compare with current state
                const currentState = this._stateManager.getState();
                
                // Skip if same as last applied state
                if (this._lastAppliedState && 
                    JSON.stringify(externalConfig) === JSON.stringify(this._lastAppliedState)) {
                    return;
                }
                
                // Check if different from current state
                if (JSON.stringify(externalConfig) !== JSON.stringify(currentState)) {
                    console.info('[IntegrationManager] External configuration change detected');
                    
                    // Update state manager
                    this._stateManager.setState(externalConfig, {
                        notifyListeners: true,
                        recordHistory: true
                    });
                    
                    // Update last applied state
                    this._lastAppliedState = JSON.parse(JSON.stringify(externalConfig));
                }
            }
        } catch (error) {
            console.error('[IntegrationManager] Error checking external changes:', error);
        }
    }
    
    /**
     * Execute a method on the search plugin
     * @param {string} method Method name
     * @param {...any} args Method arguments
     * @returns {*} Method result or null if failed
     */
    executeMethod(method, ...args) {
        if (!this._connected || !this._target) {
            console.warn('[IntegrationManager] Not connected to search plugin');
            return null;
        }
        
        try {
            if (this._target.tourSearchFunctions && 
                typeof this._target.tourSearchFunctions[method] === 'function') {
                return this._target.tourSearchFunctions[method](...args);
            } else {
                console.warn(`[IntegrationManager] Method not available: ${method}`);
                return null;
            }
        } catch (error) {
            console.error(`[IntegrationManager] Error executing method ${method}:`, error);
            return null;
        }
    }
    
    /**
     * Get information about the connected search plugin
     * @returns {Object|null} Plugin info or null if not connected
     */
    getPluginInfo() {
        if (!this._connected || !this._target) {
            return null;
        }
        
        try {
            const config = this.executeMethod('getConfig');
            
            return {
                connected: true,
                version: config?.version || 'unknown',
                currentSchemaVersion: getSchemaVersion(),
                compatibilityCheck: config?.version === getSchemaVersion(),
                methods: this._getAvailableMethods()
            };
        } catch (error) {
            console.error('[IntegrationManager] Error getting plugin info:', error);
            return null;
        }
    }
    
    /**
     * Get available methods in the search plugin
     * @returns {string[]} Array of available method names
     * @private
     */
    _getAvailableMethods() {
        if (!this._connected || !this._target || !this._target.tourSearchFunctions) {
            return [];
        }
        
        const methods = [];
        
        for (const key in this._target.tourSearchFunctions) {
            if (typeof this._target.tourSearchFunctions[key] === 'function') {
                methods.push(key);
            }
        }
        
        return methods;
    }
    
    /**
     * Dispose resources
     */
    dispose() {
        // Stop timers
        if (this._updateTimer) {
            clearTimeout(this._updateTimer);
        }
        
        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
        }
        
        if (this._monitorTimer) {
            clearInterval(this._monitorTimer);
        }
        
        // Clear references
        this._target = null;
        this._connected = false;
        this._lastAppliedState = null;
    }
}

// For CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntegrationManager;
}

// For ES modules environments
export default IntegrationManager;