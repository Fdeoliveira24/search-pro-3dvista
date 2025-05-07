/**
 * Storage Manager for Search Pro Settings
 * 
 * Handles:
 * - Saving and loading settings to local storage
 * - Import/export of settings to files
 * - Detecting storage availability (incognito detection)
 */

import { getDefaultSettings, getSchemaVersion, validateSettings } from './settings-schema.js';

class StorageManager {
    /**
     * Creates a new StorageManager
     * @param {string} storageKey Key to use for local storage
     */
    constructor(storageKey = 'searchPro.config') {
        this.storageKey = storageKey;
        this.isIncognito = !this.isStorageAvailable();
        
        if (this.isIncognito) {
            console.warn('[StorageManager] Running in incognito/private mode. Settings will not persist.');
        }
    }
    
    /**
     * Save settings to storage
     * @param {Object} settings Settings to save
     * @returns {boolean} True if save was successful
     */
    save(settings) {
        if (!settings || typeof settings !== 'object') {
            console.error('[StorageManager] Invalid settings object');
            return false;
        }
        
        try {
            // Don't attempt to save if in incognito mode
            if (this.isIncognito) {
                console.warn('[StorageManager] Cannot save in incognito mode');
                return false;
            }
            
            // Validate settings first
            settings = this.validatePositionSettings(settings);
            
            const data = {
                version: "2.0.1", // HARD CODE VERSION HERE - MUST MATCH JS FILES
                timestamp: new Date().toISOString(),
                settings: settings
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }
    
    /**
     * Load settings from storage
     * @returns {Object|null} Settings object or null if not found
     */
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            const parsedSettings = saved ? JSON.parse(saved) : null;
            
            // Apply position validation when loading settings
            return parsedSettings ? this.validatePositionSettings(parsedSettings) : null;
        } catch (e) {
            console.error('[SearchPro] Failed to load settings:', e);
            return null;
        }
    }
    
    /**
     * Clear settings from storage
     * @returns {boolean} True if clear was successful
     */
    clear() {
        if (!this.isStorageAvailable()) {
            return false;
        }
        
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('Failed to clear settings:', error);
            return false;
        }
    }
    
    /**
     * Check if storage is available
     * @returns {boolean} True if storage is available
     */
    isStorageAvailable() {
        try {
            const testKey = "__storage_test__" + Math.random();
            localStorage.setItem(testKey, testKey);
            const result = localStorage.getItem(testKey) === testKey;
            localStorage.removeItem(testKey);
            return result;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Export settings to a JSON file (for user backup)
     * @param {Object} settings Settings to export
     * @returns {boolean} True if export was successful
     */
    exportToFile(settings) {
        try {
            const data = {
                version: getSchemaVersion(),
                timestamp: new Date().toISOString(),
                settings: settings
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `search-pro-settings-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            return true;
        } catch (error) {
            console.error('Failed to export settings:', error);
            return false;
        }
    }
    
    /**
     * Export settings to a server configuration file (production-ready)
     * @param {Object} settings Settings to export
     * @param {Object} [options] Optional export options
     * @returns {boolean} True if export was successful
     */
    exportForServer(settings, options = {}) {
        try {
            const fileName = options.fileName || 'search-config.json';
            const data = {
                version: getSchemaVersion(),
                timestamp: new Date().toISOString(),
                meta: {
                    warning: 'DO NOT EDIT THIS FILE MANUALLY. Use the Search Pro Settings Panel.',
                    source: options.meta?.source || 'settings-panel',
                    target: options.meta?.target || 'server-config',
                    generatedBy: 'Search Pro Config Panel v2.0',
                    generatedAt: new Date().toISOString()
                },
                settings: settings
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            return true;
        } catch (error) {
            console.error('[StorageManager] Failed to export server config:', error);
            
            // Fallback implementation (from debug-export.js)
            return this._debugExportFallback(settings);
        }
    }
    
    /**
     * Fallback implementation for export in case the primary method fails
     * @param {Object} settings Settings to export
     * @returns {boolean} True if export was successful
     * @private
     */
    _debugExportFallback(settings) {
        try {
            console.log('[StorageManager] Using fallback export method');
            
            const data = {
                version: getSchemaVersion(),
                timestamp: new Date().toISOString(),
                meta: {
                    warning: 'DO NOT EDIT THIS FILE MANUALLY. Use the Search Pro Settings Panel.',
                    generatedAt: new Date().toISOString(),
                    generatedBy: 'Search Pro Settings Panel v2.0.0 (Fallback)'
                },
                settings: settings
            };

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

            console.log('[StorageManager] Fallback export completed successfully');
            return true;
        } catch (error) {
            console.error('[StorageManager] Fallback export failed:', error);
            return false;
        }
    }
    
    /**
     * Import settings from a JSON file
     * @param {File} file File object from input element
     * @returns {Promise<Object>} Promise resolving to imported settings and validation info
     */
    importFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }
            
            // Check file type
            if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
                reject(new Error('File must be JSON format'));
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    // Parse file content
                    const data = JSON.parse(event.target.result);
                    
                    // Validate the imported data
                    const validation = this._validateImportedSettings(data);
                    
                    if (!validation.valid) {
                        // If we have critical errors, reject
                        if (validation.errors.length > 0) {
                            reject(new Error(validation.errors[0]));
                            return;
                        }
                    }
                    
                    // If we have only warnings, we can proceed with the import
                    if (validation.settings) {
                        // Save imported settings
                        this.save(validation.settings);
                        
                        // Resolve with both settings and validation info
                        resolve({
                            settings: validation.settings,
                            warnings: validation.warnings,
                            hasWarnings: validation.warnings.length > 0
                        });
                    } else {
                        reject(new Error('Failed to process imported settings'));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse file: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Error reading file'));
            };
            
            reader.readAsText(file);
        });
    }
    
    /**
     * Enhanced validation for imported settings
     * @param {Object} data Imported configuration data
     * @returns {Object} Validation result with valid flag, settings object, and any warnings/errors
     * @private
     */
    _validateImportedSettings(data) {
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
            
            // Check if it's a valid config file format
            if (!data.settings && typeof data !== 'object') {
                result.errors.push('Invalid config file format: missing "settings" object');
                return result;
            }
            
            // If data is directly a settings object (no wrapper)
            const settingsObj = data.settings || data;
            
            // Check for required top-level sections
            const requiredSections = ['display', 'appearance', 'includeContent', 'searchBar'];
            const missingSections = requiredSections.filter(section => !settingsObj[section]);
            
            if (missingSections.length > 0) {
                result.warnings.push(`Missing required sections: ${missingSections.join(', ')}`);
                
                // Auto-fix missing sections with defaults if possible
                const defaults = getDefaultSettings();
                missingSections.forEach(section => {
                    settingsObj[section] = defaults[section];
                });
            }
            
            // Validate using schema validation
            const validation = validateSettings(settingsObj);
            
            if (!validation.isValid) {
                result.warnings.push('Imported settings have validation issues');
                result.warnings = result.warnings.concat(
                    validation.errors.map(err => `${err.path}: ${err.message}`)
                );
            }
            
            // Check for version mismatch and migrate if needed
            if (data.version && data.version !== getSchemaVersion()) {
                result.warnings.push(`Version mismatch: imported=${data.version}, current=${getSchemaVersion()}`);
                
                // Simple migration strategy - keep what we can use
                result.settings = this._migrateSettings(settingsObj, data.version);
            } else {
                result.settings = settingsObj;
            }
            
            // If we have settings and no critical errors, validate positions and mark as valid
            if (settingsObj) {
                result.valid = true;
                result.settings = this.validatePositionSettings(settingsObj);
            }
            
            return result;
        } catch (error) {
            result.errors.push(`Validation error: ${error.message}`);
            return result;
        }
    }
    
    /**
     * Simple migration for settings between versions
     * @param {Object} settings Settings object to migrate
     * @param {string} fromVersion Version to migrate from
     * @returns {Object} Migrated settings
     * @private
     */
    _migrateSettings(settings, fromVersion) {
        // Get current defaults
        const defaults = getDefaultSettings();
        
        // Merge with input settings, preferring input settings where they exist
        const migrated = JSON.parse(JSON.stringify(defaults));
        
        // Deep merge function to handle nested objects
        const deepMerge = (target, source) => {
            for (const key in source) {
                if (source.hasOwnProperty(key)) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        // Create target key if it doesn't exist
                        if (!target[key] || typeof target[key] !== 'object') {
                            target[key] = {};
                        }
                        deepMerge(target[key], source[key]);
                    } else {
                        // Simple assignment for non-objects
                        target[key] = source[key];
                    }
                }
            }
            return target;
        };
        
        // Merge the settings
        deepMerge(migrated, settings);
        
        // Handle specific version migrations if needed
        if (fromVersion === '0.9.0') {
            // Example: map old property names to new ones
            if (settings.hasOwnProperty('useSystemTheme')) {
                migrated.theme.useSystemPreference = settings.useSystemTheme;
            }
        }
        
        return migrated;
    }

    // 🔧 Fix conflicting position values when importing
    validatePositionSettings(settings) {
        if (!settings?.searchBar?.position) return settings;

        // Create a copy to avoid modifying the original
        const validated = JSON.parse(JSON.stringify(settings));
        const pos = validated.searchBar.position;

        // If both left and right are set, remove left
        if (pos.left !== null && pos.right !== null) {
          console.warn('[SearchPro] Conflict: both left and right set. Prioritizing right.');
          pos.left = null;
        }
      
        // If both top and bottom are set, remove bottom
        if (pos.top !== null && pos.bottom !== null) {
          console.warn('[SearchPro] Conflict: both top and bottom set. Prioritizing top.');
          pos.bottom = null;
        }
      
        // Do the same for mobile positions
        if (validated.searchBar.mobilePosition) {
          const mobilePos = validated.searchBar.mobilePosition;
          if (mobilePos.left !== null && mobilePos.right !== null) {
            console.warn('[SearchPro] Conflict: both left and right set in mobile. Prioritizing right.');
            mobilePos.left = null;
          }

          if (mobilePos.top !== null && mobilePos.bottom !== null) {
            console.warn('[SearchPro] Conflict: both top and bottom set in mobile. Prioritizing top.');
            mobilePos.bottom = null;
          }
        }

        return validated;
    }
}

// For CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}

// For ES modules environments
export default StorageManager;