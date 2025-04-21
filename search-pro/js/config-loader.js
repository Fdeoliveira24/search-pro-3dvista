/**
 * Search Pro Configuration Loader
 * This script handles loading configuration from different sources with proper priority:
 * 1. Server-side configuration file
 * 2. localStorage configuration
 * 3. Default configuration
 * 
 * Version: 1.3.0
 */

console.debug('[ConfigLoader] ✅ Script loaded');
document.addEventListener('DOMContentLoaded', () => {
  console.debug('[ConfigLoader] DOMContentLoaded fired');
});

window.addEventListener('load', () => {
  console.debug('[ConfigLoader] Window load event fired');
});

setTimeout(() => {
  console.debug('[ConfigLoader] tourSearchFunctions?', {
    exists: !!window.tourSearchFunctions,
    hasUpdateConfig: typeof window.tourSearchFunctions?.updateConfig === 'function'
  });
}, 3000);
 
(function () {
    // Path to configuration file - will try both locations
    const CONFIG_FILE_PATH = '../search-pro/config/search-config.json'; // Outside /search/ directory
    const ALT_CONFIG_PATH = 'search-pro/config/search-config.json';    // Inside current directory
    const STORAGE_KEY = 'searchPro.config';
    const DEBUG = true;
  
    // Debug logging helper
    function log(...args) {
        if (DEBUG || window.__searchProDebug) console.log('[ConfigLoader]', ...args);
    }
  
    // Check if localStorage is available (for incognito detection)
    function isStorageAvailable() {
        try {
            localStorage.setItem('__test__', '1');
            localStorage.removeItem('__test__');
            return true;
        } catch {
            return false;
        }
    }
  
    // Apply settings to the search plugin
    function applySettings(settings) {
        try {
            if (
                window.tourSearchFunctions &&
                typeof window.tourSearchFunctions.updateConfig === 'function'
            ) {
                window.tourSearchFunctions.updateConfig(settings);
                log('Settings applied to search plugin');
                return true;
            }
        } catch (err) {
            console.warn('[ConfigLoader] Failed to apply settings:', err);
        }
        return false;
    }
  
    // Load settings from localStorage
    function loadFromLocalStorage() {
        try {
            if (!isStorageAvailable()) return null;
            
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            
            try {
                const parsed = JSON.parse(raw);
                // Handle both formats (wrapped and direct)
                return parsed.settings || parsed;
            } catch (e) {
                log('Error parsing localStorage settings:', e);
                return null;
            }
        } catch (e) {
            log('Error accessing localStorage:', e);
            return null;
        }
    }
  
    // Load settings from server config file
    async function loadFromServer() {
        try {
            // First check if search-loader already loaded the server config
            if (window.SERVER_SEARCH_CONFIG) {
                log('Using pre-loaded server configuration');
                return window.SERVER_SEARCH_CONFIG;
            }
            
            // Try primary path first
            console.debug(`[ConfigLoader] Fetching configuration from ${CONFIG_FILE_PATH}`);
            try {
                const response = await fetch(CONFIG_FILE_PATH, { 
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                });
                
                console.debug('[ConfigLoader] Fetched config JSON response:', response);
                
                if (response.ok) {
                    const data = await response.json();
                    console.debug('[ConfigLoader] Successfully parsed JSON config:', data);
                    log('Successfully loaded server configuration');
                    return data.settings || data;
                } else {
                    log(`Primary config path returned ${response.status}, trying alternative...`);
                }
            } catch (primaryError) {
                log('Primary config path failed:', primaryError);
            }
            
            // Try alternative path
            console.debug(`[ConfigLoader] Trying alternative path: ${ALT_CONFIG_PATH}`);
            try {
                const altResponse = await fetch(ALT_CONFIG_PATH, { 
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                });
                
                console.debug('[ConfigLoader] Fetched alt config JSON response:', altResponse);
                
                if (altResponse.ok) {
                    const data = await altResponse.json();
                    console.debug('[ConfigLoader] Successfully parsed JSON from alt path:', data);
                    log('Successfully loaded server configuration from alternative path');
                    return data.settings || data;
                } else {
                    log(`Alternative config path returned ${altResponse.status}`);
                }
            } catch (altError) {
                log('Alternative config path failed:', altError);
            }
            
            // If we got here, both paths failed
            log('No server configuration found at either location');
            return null;
        } catch (e) {
            log('Failed to load server configuration:', e);
            return null;
        }
    }
  
    // Watch for search functions to become available
    function watchForSearchFunctions(settings, attempts = 0, maxAttempts = 20) {
        console.debug('[ConfigLoader] Starting to watch for search functions. Settings:', settings);
        
        const interval = setInterval(() => {
            // Check if tourSearchFunctions exists
            if (attempts % 3 === 0) {
                console.debug(`[ConfigLoader] Waiting for tourSearchFunctions (attempt ${attempts}/${maxAttempts})`, {
                    exists: !!window.tourSearchFunctions,
                    hasUpdateConfig: window.tourSearchFunctions && typeof window.tourSearchFunctions.updateConfig === 'function'
                });
            }
            
            if (
                window.tourSearchFunctions &&
                typeof window.tourSearchFunctions.updateConfig === 'function'
            ) {
                clearInterval(interval);
                console.debug('[ConfigLoader] updateConfig now ready. Applying settings...');
                applySettings(settings);
                console.info('[ConfigLoader] Settings applied to search plugin after waiting');
                
                // Save reference for potential future use
                window.searchProSettings = settings;
            } else if (++attempts >= maxAttempts) {
                clearInterval(interval);
                console.error('[ConfigLoader] Search functions not available after max attempts');
            }
        }, 300); // Check every 300ms
        
        return interval;
    }
  
    // Main initialization function
    async function initialize() {
        log('Initializing config loader...');
        
        // Try to load settings from different sources in priority order
        let settings = null;
        
        // 1. Try server config first
        settings = await loadFromServer();
        if (settings) {
            console.debug('[ConfigLoader] Using server-side configuration:', settings);
        } else {
            // 2. Try localStorage next
            settings = loadFromLocalStorage();
            if (settings) {
                console.debug('[ConfigLoader] Using localStorage configuration:', settings);
            } else {
                // 3. Fall back to default config if available
                settings = window.DEFAULT_SEARCH_CONFIG || null;
                if (settings) {
                    console.debug('[ConfigLoader] Using default configuration:', settings);
                } else {
                    console.warn('[ConfigLoader] No configuration found, search will use built-in defaults');
                }
            }
        }
        
        // Enable debug mode if specified
        if (settings && settings.debug === true) {
            window.__searchProDebug = true;
            console.info('[SearchPro] Debug mode is ON');
        }
        
        if (window.__searchProDebug) console.log('[Search] Initialized with:', settings);
        
        // Save a reference to the loaded settings
        window.searchProSettings = settings;
        
        // Check if tourSearchFunctions is ready
        const hasTourSearchFunctions = window.tourSearchFunctions && 
                                      typeof window.tourSearchFunctions.updateConfig === 'function';
        
        console.debug('[ConfigLoader] Search functions ready?', hasTourSearchFunctions);
        
        // Try to apply settings immediately
        if (hasTourSearchFunctions) {
            console.debug('[ConfigLoader] updateConfig exists. Applying...');
            const applied = applySettings(settings);
            console.debug('[ConfigLoader] Settings applied successfully:', applied);
        } else {
            // If not ready, watch for search functions to become available
            console.warn('[ConfigLoader] updateConfig not ready yet. Setting up watcher...');
            watchForSearchFunctions(settings);
        }
        
        return settings;
    }
  
    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
        console.debug('[ConfigLoader] Set up DOMContentLoaded listener');
    } else {
        // Page already loaded, initialize now
        console.debug('[ConfigLoader] Document already loaded, initializing immediately');
        initialize();
    }
  
    // Public API
    window.SearchProConfig = {
        reload: initialize,
        getCurrent: () => window.searchProSettings || {},
        apply: applySettings,
        version: '1.3.0',
        path: CONFIG_FILE_PATH,
        debug: (enable) => {
            window.__searchProDebug = enable === true;
            console.info(`[SearchPro] Debug mode ${window.__searchProDebug ? 'ON' : 'OFF'}`);
            return window.__searchProDebug;
        }
    };
})();