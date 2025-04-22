/**
 * UI Manager for Search Pro Settings
 * 
 * Responsible for:
 * - Dynamic rendering of settings UI based on schema
 * - Two-way binding between UI controls and state
 * - Responsive layout and tabs management
 * - Preview mode for settings
 * - Handling all button actions
 */

import { getUISchema, getDefaultSettings, validateSettings, getValueFromPath, setValueAtPath } from './settings-schema.js';
import StateManager from './state-manager.js';
import StorageManager from './storage-manager.js';

class UIManager {
    /**
     * Creates a new UIManager instance
     * @param {Object} options Configuration options
     */
    constructor(stateManager, storageManager) {
        this._stateManager = stateManager;
        this._storageManager = storageManager;
        this._controlMap = new Map();
        this._activeTab = 'general';
        
        // Check for incognito mode
        this._checkIncognitoMode();
        
        // Wait for the preview element to be available in the DOM
        const waitForPreview = setInterval(() => {
            const preview = document.querySelector('#layoutPreview');
            if (preview) {
                clearInterval(waitForPreview);
                this._setupPreview();
            }
        }, 100);
    }
    
    initialize() {
        // Render the UI
        this._renderUI();
        
        // Set up tabs with scroll position preservation
        this._setupTabs();
        
        // Collect all inputs with data-path attribute
        const inputs = document.querySelectorAll('[data-path]');
        inputs.forEach(input => this._setupControl(input));
        
        // Streamlined input binding for all data-path elements
        document.querySelectorAll('[data-path]').forEach(input => {
            const eventType = input.type === 'range' ? 'input' : 'change';
            input.addEventListener(eventType, () => this._updatePreview());
        });
        
        // Add specific event bindings
        document.querySelectorAll('input[type="color"]').forEach(input => {
            input.addEventListener('input', () => this._updatePreview());
            input.addEventListener('change', () => this._updatePreview());
        });
        
        document.querySelectorAll('input[type="range"]').forEach(input => {
            input.addEventListener('input', () => this._updatePreview());
        });
        
        document.querySelectorAll('select').forEach(input => {
            input.addEventListener('change', () => this._updatePreview());
            
            // Special handling for position preset
            if (input.dataset.path === 'searchBar.positionPreset') {
                input.addEventListener('change', () => this.handlePositionPresetChange(input.value));
            }
        });
        
        // Set up linked color inputs
        const linkedInputs = document.querySelectorAll('[data-linked]');
        linkedInputs.forEach(input => this._setupLinkedControl(input));
        
        // Set up action buttons
        this._setupActionButtons();
        
        // Load and apply initial state
        this._loadState();
        
        // Initial position preset control setup
        this.handlePositionPresetChange(this._stateManager.getState().searchBar?.positionPreset || 'top-right');
    }
    
    /**
     * Renders the main UI components
     * @private
     */
    _renderUI() {
        // Create the header toolbar
        const toolbar = this._createHeaderToolbar();
        
        // Get the settings panel
        const settingsPanel = document.querySelector('.settings-panel');
        if (settingsPanel) {
            // Insert the toolbar before the tabs
            const tabs = settingsPanel.querySelector('.tabs');
            if (tabs) {
                settingsPanel.insertBefore(toolbar, tabs);
            } else {
                settingsPanel.prepend(toolbar);
            }
        }
    }
    
    /**
     * Creates the header toolbar with action buttons
     * @private
     * @returns {HTMLElement} The toolbar element
     */
    _createHeaderToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'global-action-toolbar';
        
        // Create and add buttons to the toolbar
        const buttons = [
            {
                id: 'applySettings',
                text: 'Apply Settings',
                className: 'primary-button',
                handler: () => this._handleApplyClick()
            },
            {
                id: 'saveSettings',
                text: 'Save Settings',
                className: 'primary-button',
                handler: () => this._handleSaveClick()
            },
            {
                id: 'resetSettings',
                text: 'Reset to Defaults',
                className: 'secondary-button',
                handler: () => this._handleResetClick()
            },
            {
                id: 'exportSettings',
                text: 'Export Settings',
                className: 'secondary-button',
                handler: () => this.exportSettings()
            },
            {
                id: 'importButton',
                text: 'Import Settings',
                className: 'secondary-button',
                handler: () => document.getElementById('importFile').click()
            },
            {
                id: 'exportForServer',
                text: 'Export for Server',
                className: 'secondary-button',
                handler: () => this.exportForServer()
            }
        ];
        
        // Create each button and add it to the toolbar
        buttons.forEach(btnConfig => {
            const button = document.createElement('button');
            button.id = btnConfig.id;
            button.textContent = btnConfig.text;
            button.className = btnConfig.className;
            button.addEventListener('click', btnConfig.handler);
            toolbar.appendChild(button);
        });
        
        return toolbar;
    }
    
    /**
     * Handle Apply Settings button click
     * @private
     */
    _handleApplyClick() {
        const state = this._stateManager.getState();
        this._storageManager.save(state);
        
        try {
            if (window.opener && window.opener.tourSearchFunctions) {
                // Update config in the parent window
                window.opener.tourSearchFunctions.updateConfig(state);
                
                // Force direct updates for key elements
                if (window.opener.document) {
                    // Update placeholder text
                    const tourSearchInput = window.opener.document.querySelector('#tourSearch');
                    if (tourSearchInput && state.searchBar?.placeholder) {
                        tourSearchInput.placeholder = state.searchBar.placeholder;
                    }
                    
                    // Force subtitle color update with inline style if needed
                    if (state.appearance?.colors?.resultSubtitle) {
                        const style = document.createElement('style');
                        style.textContent = `
                            .result-subtitle, .result-description, .result-subtext {
                                color: ${state.appearance.colors.resultSubtitle} !important;
                            }
                        `;
                        window.opener.document.head.appendChild(style);
                    }
                }
                
                this.showNotification('Settings applied to active tour', 'success');
            } else {
                this.showNotification('Settings saved. They will apply on next reload.', 'info');
            }
        } catch (e) {
            console.error('Error applying settings:', e);
            this.showNotification('Failed to apply settings to active tour', 'error');
        }
    }
    
    /**
     * Handle Save Settings button click
     * @private
     */
    _handleSaveClick() {
        const state = this._stateManager.getState();
        const saved = this._storageManager.save(state);
        
        if (saved) {
            this.showNotification('Settings saved successfully', 'success');
        } else {
            this.showNotification('Failed to save settings', 'error');
        }
    }
    
    /**
     * Handle Reset to Defaults button click with comprehensive UI updates
     * @private
     */
    _handleResetClick() {
        if (this._isResetting) return;
        this._isResetting = true;
        
        if (confirm('Reset all settings to defaults?')) {
            try {
                // Get default settings
                const defaults = window.getDefaultSettings();
                if (!defaults) {
                    throw new Error("Could not load default settings");
                }
                
                // Important: Extract key default values before state update
                const defaultPlaceholder = defaults.searchBar?.placeholder || 'Search...';
                const defaultBorderRadius = 35;
                const defaultFontSize = defaults.theme?.typography?.fontSize || 16;
                const defaultLetterSpacing = defaults.theme?.typography?.letterSpacing || 0;
                const defaultFontFamily = defaults.theme?.typography?.fontFamily || 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                
                // Update state with defaults
                this._stateManager.setState(defaults);
                
                // Apply state to controls (the basic update)
                this.applyStateToControls();
                
                // ✅ Add this for General Settings Tab
                const generalSettingsControls = {
                    'autoHide.mobile': document.querySelector('[data-path="autoHide.mobile"]'),
                    'autoHide.desktop': document.querySelector('[data-path="autoHide.desktop"]'),
                    'mobileBreakpoint': document.querySelector('[data-path="mobileBreakpoint"]'),
                    'minSearchChars': document.querySelector('[data-path="minSearchChars"]')
                };

                Object.entries(generalSettingsControls).forEach(([path, control]) => {
                    if (control) {
                        const defaultValue = this.getValueFromPath(defaults, path);
                        if (defaultValue !== undefined) {
                            if (control.type === 'checkbox') {
                                control.checked = Boolean(defaultValue);
                                control.dispatchEvent(new Event('change', { bubbles: true }));
                            } else if (control.type === 'number') {
                                control.value = defaultValue;
                                control.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }
                    }
                });
                
                // ADDITIONAL EXPLICIT UPDATES FOR PROBLEMATIC FIELDS
                
                // 1. Update border radius inputs
                const borderRadiusInputs = {
                    topLeft: document.querySelector('[data-path="appearance.searchField.borderRadius.topLeft"]'),
                    topRight: document.querySelector('[data-path="appearance.searchField.borderRadius.topRight"]'),
                    bottomRight: document.querySelector('[data-path="appearance.searchField.borderRadius.bottomRight"]'),
                    bottomLeft: document.querySelector('[data-path="appearance.searchField.borderRadius.bottomLeft"]')
                };
                
                Object.values(borderRadiusInputs).forEach(input => {
                    if (input) {
                        input.value = defaultBorderRadius;
                        // Force an input event to update any listeners
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
                
                // 2. Explicitly update font size and letter spacing display values
                const fontSizeInput = document.querySelector('[data-path="theme.typography.fontSize"]');
                const fontSizeValue = document.getElementById('fontSizeValue');
                if (fontSizeInput) {
                    fontSizeInput.value = defaultFontSize;
                    fontSizeInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (fontSizeValue) {
                    fontSizeValue.textContent = defaultFontSize;
                }
                
                const letterSpacingInput = document.querySelector('[data-path="theme.typography.letterSpacing"]');
                const letterSpacingValue = document.getElementById('letterSpacingValue');
                if (letterSpacingInput) {
                    letterSpacingInput.value = defaultLetterSpacing;
                    letterSpacingInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (letterSpacingValue) {
                    letterSpacingValue.textContent = defaultLetterSpacing;
                }
                
                // 3. Update font family select
                const fontFamilySelect = document.querySelector('[data-path="theme.typography.fontFamily"]');
                if (fontFamilySelect) {
                    fontFamilySelect.value = defaultFontFamily;
                    fontFamilySelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
                
                // 4. Update placeholder text input
                const placeholderInput = document.querySelector('[data-path="searchBar.placeholder"]');
                if (placeholderInput) {
                    placeholderInput.value = defaultPlaceholder;
                    placeholderInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
                
                // 5. Update preview
                this._updatePreview(true);
                
                // 6. Apply to tour with explicit style overrides
                try {
                    if (window.opener && window.opener.tourSearchFunctions) {
                        // Apply config update
                        window.opener.tourSearchFunctions.updateConfig(defaults);
                        
                        // Direct DOM updates for critical properties
                        if (window.opener.document) {
                            // Create a style element for direct CSS overrides
                            const styleId = 'search-pro-reset-styles';
                            let styleEl = window.opener.document.getElementById(styleId);
                            
                            if (!styleEl) {
                                styleEl = window.opener.document.createElement('style');
                                styleEl.id = styleId;
                                window.opener.document.head.appendChild(styleEl);
                            }
                            
                            // Apply critical styling with !important to override any existing styles
                            styleEl.textContent = `
                                /* Font family fix */
                                #searchContainer, 
                                #searchContainer * {
                                    font-family: ${defaultFontFamily} !important;
                                }
                                
                                /* Border radius fix */
                                #searchContainer .search-field {
                                    border-radius: ${defaultBorderRadius}px !important;
                                }
                                
                                /* Font size and letter spacing */
                                #searchContainer {
                                    font-size: ${defaultFontSize}px !important;
                                    letter-spacing: ${defaultLetterSpacing}px !important;
                                }
                                
                                /* Subtitle color fix */
                                .result-subtitle, 
                                .result-description, 
                                .result-subtext {
                                    color: ${defaults.appearance?.colors?.resultSubtitle || '#64748b'} !important;
                                }
                            `;
                            
                            // Direct update for placeholder
                            const tourSearchInput = window.opener.document.querySelector('#tourSearch');
                            if (tourSearchInput) {
                                tourSearchInput.placeholder = defaultPlaceholder;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Could not apply direct style updates to tour:', e);
                }
                
                this.showNotification('Settings reset to defaults', 'success');
            } catch (error) {
                console.error('Error resetting to defaults:', error);
                this.showNotification('Failed to reset settings: ' + error.message, 'error');
            }
        }
        
        setTimeout(() => {
            this._isResetting = false;
        }, 500);
    }
    
    /**
     * Handle changes to the position preset dropdown
     * @param {string} preset The selected position preset
     */
    handlePositionPresetChange(preset) {
        // Get all position controls
        const topInput = document.querySelector('[data-path="searchBar.position.top"]');
        const rightInput = document.querySelector('[data-path="searchBar.position.right"]');
        const leftInput = document.querySelector('[data-path="searchBar.position.left"]');
        const bottomInput = document.querySelector('[data-path="searchBar.position.bottom"]');
        
        // Get the parent elements for positioning
        const topControl = topInput?.closest('.setting-item');
        const rightControl = rightInput?.closest('.setting-item');
        const leftControl = leftInput?.closest('.setting-item');
        const bottomControl = bottomInput?.closest('.setting-item');
        
        // Hide all by default
        [topControl, rightControl, leftControl, bottomControl].forEach(control => {
            if (control) control.style.display = 'none';
        });
        
        // Update state based on the preset
        const state = this._stateManager.getState();
        if (!state.searchBar) state.searchBar = {};
        if (!state.searchBar.position) state.searchBar.position = {};
        
        // Show relevant controls and update state based on preset
        switch (preset) {
            case 'top-left':
                if (topControl) topControl.style.display = '';
                if (leftControl) leftControl.style.display = '';
                
                state.searchBar.position.top = state.searchBar.position.top || 70;
                state.searchBar.position.left = state.searchBar.position.left || 70;
                state.searchBar.position.right = null;
                state.searchBar.position.bottom = null;
                break;
                
            case 'top-right':
                if (topControl) topControl.style.display = '';
                if (rightControl) rightControl.style.display = '';
                
                state.searchBar.position.top = state.searchBar.position.top || 70;
                state.searchBar.position.right = state.searchBar.position.right || 70;
                state.searchBar.position.left = null;
                state.searchBar.position.bottom = null;
                break;
                
            case 'top-center':
                if (topControl) topControl.style.display = '';
                
                state.searchBar.position.top = state.searchBar.position.top || 70;
                state.searchBar.position.left = '50%';
                state.searchBar.position.right = null;
                state.searchBar.position.bottom = null;
                break;
                
            case 'bottom-left':
                if (bottomControl) bottomControl.style.display = '';
                if (leftControl) leftControl.style.display = '';
                
                state.searchBar.position.bottom = state.searchBar.position.bottom || 70;
                state.searchBar.position.left = state.searchBar.position.left || 70;
                state.searchBar.position.top = null;
                state.searchBar.position.right = null;
                break;
                
            case 'bottom-right':
                if (bottomControl) bottomControl.style.display = '';
                if (rightControl) rightControl.style.display = '';
                
                state.searchBar.position.bottom = state.searchBar.position.bottom || 70;
                state.searchBar.position.right = state.searchBar.position.right || 70;
                state.searchBar.position.top = null;
                state.searchBar.position.left = null;
                break;
                
            case 'center':
                // No offset controls needed for center
                state.searchBar.position.top = '50%';
                state.searchBar.position.left = '50%';
                state.searchBar.position.right = null;
                state.searchBar.position.bottom = null;
                break;
                
            case 'custom':
                // Show all position controls for custom preset
                [topControl, rightControl, leftControl, bottomControl].forEach(control => {
                    if (control) control.style.display = '';
                });
                
                // Ensure there are some values set
                if (state.searchBar.position.top === null && 
                    state.searchBar.position.bottom === null) {
                    state.searchBar.position.top = 70;
                }
                
                if (state.searchBar.position.left === null && 
                    state.searchBar.position.right === null) {
                    state.searchBar.position.right = 70;
                }
                break;
        }
        
        // Update the state manager
        this._stateManager.setState(state);
        
        // Apply state to controls to reflect changes
        this.applyStateToControls();
        
        // Update preview
        this._updatePreview();
    }
    
    _setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        const tabScrollPositions = new Map();
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Save scroll position of current tab
                const currentTabContent = document.querySelector('.tab-content.active');
                if (currentTabContent) {
                    this._stateManager.saveTabScrollPosition(this._activeTab, currentTabContent.scrollTop);
                }
                
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                
                // Hide all tab contents
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Activate clicked tab
                tab.classList.add('active');
                
                // Show corresponding tab content
                const tabId = tab.dataset.tab;
                const tabContent = document.getElementById(`${tabId}-tab`);
                
                if (tabContent) {
                    tabContent.classList.add('active');
                    
                    // Restore scroll position
                    const savedPosition = this._stateManager.getTabScrollPosition(tabId);
                    if (savedPosition) {
                        tabContent.scrollTop = savedPosition;
                    }
                    
                    // Update active tab
                    this._activeTab = tabId;
                }
            });
        });
    }
    
    _setupControl(input) {
        const path = input.dataset.path;
        this._controlMap.set(path, input);
        
        // Set up event listeners based on input type
        if (input.type === 'checkbox') {
            input.addEventListener('change', () => {
                this._stateManager.setState(input.checked, path);
            });
        } else if (input.type === 'color') {
            input.addEventListener('change', () => {
                this._stateManager.setState(input.value, path);
            });
        } else if (input.type === 'number') {
            input.addEventListener('change', () => {
                const value = parseFloat(input.value);
                if (!isNaN(value)) {
                    this._stateManager.setState(value, path);
                }
            });
        } else if (input.type === 'range') {
            input.addEventListener('input', () => {
                const value = parseFloat(input.value);
                if (!isNaN(value)) {
                    this._stateManager.setState(value, path);
                    
                    // Update display of value if available
                    const displayId = input.dataset.valueDisplay;
                    if (displayId) {
                        const display = document.getElementById(displayId);
                        if (display) {
                            display.textContent = value;
                        }
                    }
                }
            });
        } else if (input.tagName === 'SELECT') {
            input.addEventListener('change', () => {
                let value = input.value;
                
                // Handle special value types
                if (value === 'true') value = true;
                else if (value === 'false') value = false;
                else if (value === 'null') value = null;
                else if (!isNaN(parseFloat(value)) && value.trim() !== '') {
                    value = parseFloat(value);
                }
                
                this._stateManager.setState(value, path);
                
                // Special handling for position preset
                if (path === 'searchBar.positionPreset') {
                    this.handlePositionPresetChange(value);
                }
            });
        } else {
            input.addEventListener('change', () => {
                this._stateManager.setState(input.value, path);
            });
        }
    }
    
    _setupLinkedControl(input) {
        const linkedId = input.dataset.linked;
        const linkedInput = document.getElementById(linkedId);
        
        if (linkedInput) {
            // Update text input when color changes
            if (input.type === 'color' && linkedInput.type === 'text') {
                input.addEventListener('input', () => {
                    linkedInput.value = input.value;
                });
                
                // Update color when text changes
                linkedInput.addEventListener('change', () => {
                    const hexColor = linkedInput.value.trim();
                    if (/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
                        input.value = hexColor;
                        
                        // Trigger change event to update state and preview
                        const event = new Event('change', { bubbles: true });
                        input.dispatchEvent(event);
                    }
                });
            }
        }
    }
    
    _setupActionButtons() {
        // Save Settings
        const saveButton = document.getElementById('saveSettings');
        if (saveButton) {
            saveButton.addEventListener('click', () => this._handleSaveClick());
        }
        
        // Apply Settings
        const applyButton = document.getElementById('applySettings');
        if (applyButton) {
            applyButton.addEventListener('click', () => this._handleApplyClick());
        }
        
        // Reset Settings
        const resetButton = document.getElementById('resetSettings');
        if (resetButton) {
            resetButton.addEventListener('click', () => this._handleResetClick());
        }
        
        // Export Settings
        const exportButton = document.getElementById('exportSettings');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportSettings());
        }
        
        // Export for Server
        const exportServerButton = document.getElementById('exportForServer');
        if (exportServerButton) {
            exportServerButton.addEventListener('click', () => this.exportForServer());
        }
        
        // Import Settings
        const importButton = document.getElementById('importButton');
        const importFile = document.getElementById('importFile');
        if (importButton && importFile) {
            importButton.addEventListener('click', () => {
                importFile.click();
            });
            
            importFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.importSettings(file);
                }
            });
        }
    }
    
    _loadState() {
        // Try to load from localStorage
        const savedState = this._storageManager.load();
        
        if (savedState) {
            this._stateManager.setState(savedState);
        } else {
            // If no saved state, try to load default settings
            if (typeof window.getDefaultSettings === 'function') {
                const defaults = window.getDefaultSettings();
                this._stateManager.setState(defaults);
            }
        }
        
        // Apply state to UI controls
        this.applyStateToControls();
        
        // Update preview with initial state
        this._updatePreview();
        
        // Subscribe to state changes
        this._stateManager.subscribe(() => {
            // Nothing needed here since controls are updated directly
        });
    }
    
    applyStateToControls() {
        const state = this._stateManager.getState();
        
        // Update each control with value from state
        this._controlMap.forEach((control, path) => {
            const value = this.getValueFromPath(state, path);
            
            if (value !== undefined) {
                if (control.type === 'checkbox') {
                    control.checked = Boolean(value);
                } else if (control.type === 'color') {
                    control.value = value;
                    
                    // Update linked text input if exists
                    const textInput = document.getElementById(`${control.id}Text`);
                    if (textInput) {
                        textInput.value = value;
                    }
                } else if (control.tagName === 'SELECT') {
                    // For select elements, convert the value to string 
                    control.value = (value === null) ? 'null' : String(value);
                } else {
                    control.value = value;
                }
                
                // Update range value display if configured
                if (control.type === 'range' && control.dataset.valueDisplay) {
                    const display = document.getElementById(control.dataset.valueDisplay);
                    if (display) {
                        display.textContent = value;
                    }
                }
            }
        });
        
        // Force update of preview to ensure all visual elements are updated
        this._updatePreview();
    }
    
    getValueFromPath(obj, path) {
        const parts = path.split('.');
        let current = obj;
        
        for (const part of parts) {
            if (current === undefined || current === null) {
                return undefined;
            }
            current = current[part];
        }
        
        return current;
    }
    
    _setupPreview() {
        const previewRoot = document.querySelector('#layoutPreview');
        this.preview = previewRoot;
        this.previewSearchField = previewRoot.querySelector('.preview-search-field');
        this.previewSearchInput = previewRoot.querySelector('.preview-search-input');
        this.previewResultsPanel = previewRoot.querySelector('.preview-results-panel');
        this.previewResultItems = Array.from(previewRoot.querySelectorAll('.preview-result-item'));
        this.previewGroupHeaders = Array.from(previewRoot.querySelectorAll('.preview-group-header'));
        
        // Update with initial placeholder if available
        const state = this._stateManager.getState();
        if (state.searchBar?.placeholder && this.previewSearchInput) {
            this.previewSearchInput.placeholder = state.searchBar.placeholder;
        }
    }
    
    _updatePreview(forceFullRefresh = false) {
        if (!this.preview) return;
        
        const state = this._stateManager.getState();
        
        // Update search width
        const searchWidth = state.appearance?.searchWidth || 350;
        this.preview.style.width = `${Math.min(searchWidth, 500)}px`;
        
        // Update max height for results
        const maxHeight = state.appearance?.searchResults?.maxHeight || 500;
        if (this.previewResultsPanel) {
            this.previewResultsPanel.style.maxHeight = `${Math.min(maxHeight / 2, 200)}px`;
        }
        
        // Update theme (light/dark)
        this.preview.classList.remove('preview-dark-mode', 'preview-light-mode');
        if (state.theme?.useDarkMode === true) {
            this.preview.classList.add('preview-dark-mode');
        } else if (state.theme?.useDarkMode === false) {
            this.preview.classList.add('preview-light-mode');
        }
        
        // Update typography
        if (state.theme?.typography) {
            const typography = state.theme.typography;
            this.preview.style.fontFamily = typography.fontFamily || '';
            this.preview.style.fontSize = typography.fontSize ? `${typography.fontSize / 16}em` : '';
            this.preview.style.letterSpacing = typography.letterSpacing ? `${typography.letterSpacing}px` : '';
            
            // Update font preview
            const fontPreview = document.getElementById('fontPreview');
            if (fontPreview) {
                fontPreview.style.fontFamily = typography.fontFamily || '';
                fontPreview.style.fontSize = typography.fontSize ? `${typography.fontSize}px` : '';
                fontPreview.style.letterSpacing = typography.letterSpacing ? `${typography.letterSpacing}px` : '';
            }
        }
        
        // Update placeholder text
        if (this.previewSearchInput) {
            this.previewSearchInput.placeholder = state.searchBar?.placeholder || 'Search...';
        }
        
        // Update border radius with explicit defaults if not present
        if (this.previewSearchField) {
            const border = state.appearance?.searchField?.borderRadius || { topLeft: 35, topRight: 35, bottomRight: 35, bottomLeft: 35 };
            
            this.previewSearchField.style.borderTopLeftRadius = `${border.topLeft || 35}px`;
            this.previewSearchField.style.borderTopRightRadius = `${border.topRight || 35}px`;
            this.previewSearchField.style.borderBottomRightRadius = `${border.bottomRight || 35}px`;
            this.previewSearchField.style.borderBottomLeftRadius = `${border.bottomLeft || 35}px`;
            
            // Make border visible to properly show radius
            this.previewSearchField.style.border = '1px solid rgba(0,0,0,0.2)';
            this.previewSearchField.style.overflow = 'hidden';
        }
        
        // Update colors - more thorough with fallbacks
        if (state.appearance?.colors || forceFullRefresh) {
            const colors = state.appearance?.colors || {};
            
            // Search field background
            if (this.previewSearchField) {
                this.previewSearchField.style.backgroundColor = colors.searchBackground || '#ffffff';
            }
            
            // Search text color
            if (this.previewSearchInput) {
                this.previewSearchInput.style.color = colors.searchText || '#1a1a1a';
            }
            
            // Search icon color
            const searchIcon = this.preview.querySelector('.preview-search-icon');
            if (searchIcon) {
                searchIcon.style.color = colors.searchIcon || '#64748b';
            }
            
            // Results background
            if (this.previewResultsPanel) {
                this.previewResultsPanel.style.backgroundColor = colors.resultsBackground || '#ffffff';
            }
            
            // Result items styling
            if (this.previewResultItems && this.previewResultItems.length) {
                this.previewResultItems.forEach(item => {
                    // Result text color
                    const textElement = item.querySelector('.preview-result-text');
                    if (textElement) {
                        textElement.style.color = colors.resultText || '#1e293b';
                    }
                    
                    // Result subtitle color
                    const subtitleElement = item.querySelector('.preview-result-description');
                    if (subtitleElement) {
                        subtitleElement.style.color = colors.resultSubtitle || '#64748b';
                    }
                    
                    // Hover state colors
                    item.style.setProperty('--result-hover-color', colors.resultHover || '#f1f5f9');
                    item.style.setProperty('--result-border-left-color', colors.resultBorderLeft || '#3b82f6');
                });
            }
            
            // Group headers styling
            if (this.previewGroupHeaders && this.previewGroupHeaders.length) {
                this.previewGroupHeaders.forEach(header => {
                    // Group title color
                    const titleElement = header.querySelector('.preview-group-title');
                    if (titleElement) {
                        titleElement.style.color = colors.groupHeaderColor || '#475569';
                        titleElement.style.display = state.display?.showGroupHeaders !== false ? '' : 'none';
                    }
                    
                    // Group count color
                    const countElement = header.querySelector('.preview-group-count');
                    if (countElement) {
                        countElement.style.color = colors.groupCountColor || '#94a3b8';
                        countElement.style.display = state.display?.showGroupCount !== false ? '' : 'none';
                    }
                });
            }
        }
    }
    
    /**
     * Updates the position preview based on the current state
     * @param {Object} state - The current state
     */
    updatePositionPreview(state) {
        // Get layout preview container in Font Preview section
        const fontPreview = document.getElementById('fontPreview');
        if (!fontPreview) return;
        
        // Create or get position preview
        let positionPreview = document.getElementById('positionPreview');
        if (!positionPreview) {
            positionPreview = document.createElement('div');
            positionPreview.id = 'positionPreview';
            positionPreview.style.marginTop = '15px';
            positionPreview.style.padding = '10px';
            positionPreview.style.border = '1px solid var(--border-color)';
            positionPreview.style.borderRadius = '4px';
            positionPreview.style.position = 'relative';
            positionPreview.style.height = '200px';
            positionPreview.style.backgroundColor = 'rgba(0,0,0,0.1)';
            positionPreview.innerHTML = '<h3 style="margin-top:0;text-align:center;">Position Preview</h3>';
            
            // Create viewport representation
            const viewport = document.createElement('div');
            viewport.className = 'position-viewport';
            viewport.style.position = 'absolute';
            viewport.style.left = '5%';
            viewport.style.top = '40px';
            viewport.style.width = '90%';
            viewport.style.height = 'calc(100% - 50px)';
            viewport.style.border = '2px dashed rgba(0,0,0,0.2)';
            viewport.style.boxSizing = 'border-box';
            
            // Create search indicator
            const searchIndicator = document.createElement('div');
            searchIndicator.className = 'position-search-indicator';
            searchIndicator.style.position = 'absolute';
            searchIndicator.style.width = '60px';
            searchIndicator.style.height = '25px';
            searchIndicator.style.backgroundColor = 'var(--primary-color)';
            searchIndicator.style.borderRadius = '12px';
            searchIndicator.style.zIndex = '2';
            searchIndicator.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            
            viewport.appendChild(searchIndicator);
            positionPreview.appendChild(viewport);
            fontPreview.appendChild(positionPreview);
        }
        
        // Get the viewport and search indicator elements
        const viewport = positionPreview.querySelector('.position-viewport');
        const searchIndicator = positionPreview.querySelector('.position-search-indicator');
        
        if (!viewport || !searchIndicator) return;
        
        // Get viewport dimensions
        const viewportRect = viewport.getBoundingClientRect();
        const viewportWidth = viewportRect.width;
        const viewportHeight = viewportRect.height;
        
        // Get position based on preset
        const preset = state.searchBar?.positionPreset || 'top-right';
        const position = state.searchBar?.position || {};
        
        // Reset transform
        searchIndicator.style.transform = 'none';
        
        // Position indicator based on preset
        switch (preset) {
            case 'top-left':
                searchIndicator.style.top = `${Math.min((position.top || 10) / 5, 50)}px`;
                searchIndicator.style.left = `${Math.min((position.left || 10) / 5, 50)}px`;
                searchIndicator.style.right = 'auto';
                searchIndicator.style.bottom = 'auto';
                break;
                
            case 'top-right':
                searchIndicator.style.top = `${Math.min((position.top || 10) / 5, 50)}px`;
                searchIndicator.style.right = `${Math.min((position.right || 10) / 5, 50)}px`;
                searchIndicator.style.left = 'auto';
                searchIndicator.style.bottom = 'auto';
                break;
                
            case 'top-center':
                searchIndicator.style.top = `${Math.min((position.top || 10) / 5, 50)}px`;
                searchIndicator.style.left = '50%';
                searchIndicator.style.right = 'auto';
                searchIndicator.style.bottom = 'auto';
                searchIndicator.style.transform = 'translateX(-50%)';
                break;
                
            case 'bottom-left':
                searchIndicator.style.bottom = `${Math.min((position.bottom || 10) / 5, 50)}px`;
                searchIndicator.style.left = `${Math.min((position.left || 10) / 5, 50)}px`;
                searchIndicator.style.right = 'auto';
                searchIndicator.style.top = 'auto';
                break;
                
            case 'bottom-right':
                searchIndicator.style.bottom = `${Math.min((position.bottom || 10) / 5, 50)}px`;
                searchIndicator.style.right = `${Math.min((position.right || 10) / 5, 50)}px`;
                searchIndicator.style.left = 'auto';
                searchIndicator.style.top = 'auto';
                break;
                
            case 'center':
                searchIndicator.style.top = '50%';
                searchIndicator.style.left = '50%';
                searchIndicator.style.right = 'auto';
                searchIndicator.style.bottom = 'auto';
                searchIndicator.style.transform = 'translate(-50%, -50%)';
                break;
                
            case 'custom':
                // For custom, use whatever values are provided
                if (position.top !== null && position.top !== undefined) {
                    searchIndicator.style.top = `${Math.min((position.top) / 5, 80)}px`;
                    searchIndicator.style.bottom = 'auto';
                } else if (position.bottom !== null && position.bottom !== undefined) {
                    searchIndicator.style.bottom = `${Math.min((position.bottom) / 5, 80)}px`;
                    searchIndicator.style.top = 'auto';
                } else {
                    searchIndicator.style.top = '10px';
                    searchIndicator.style.bottom = 'auto';
                }
                
                if (position.left !== null && position.left !== undefined) {
                    searchIndicator.style.left = `${Math.min((position.left) / 5, 80)}px`;
                    searchIndicator.style.right = 'auto';
                } else if (position.right !== null && position.right !== undefined) {
                    searchIndicator.style.right = `${Math.min((position.right) / 5, 80)}px`;
                    searchIndicator.style.left = 'auto';
                } else {
                    searchIndicator.style.right = '10px';
                    searchIndicator.style.left = 'auto';
                }
                break;
        }
    }
    
    exportSettings() {
        if (this._isExporting) return;
        this._isExporting = true;

        try {
            const state = this._stateManager.getState();
            const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'search-pro-config.json';
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            this.showNotification('Settings exported to file', 'success');
        } catch (error) {
            console.error('Error exporting settings:', error);
            this.showNotification('Failed to export settings', 'error');
        }

        setTimeout(() => {
            this._isExporting = false;
        }, 500);
    }
    
    exportForServer() {
        if (this._isExportingForServer) return;
        this._isExportingForServer = true;

        try {
            const state = this._stateManager.getState();
            const jsonString = JSON.stringify(state, null, 2);

            const content = `
                <div class="deployment-modal">
                    <div class="deployment-modal-content">
                        <h3>Server Configuration</h3>
                        <p>Copy this code to your server configuration file:</p>
                        <pre>${jsonString}</pre>
                        <ol>
                            <li>Save this as <code>search-config.json</code></li>
                            <li>Upload it to <code>/search-pro/config/</code></li>
                            <li>Add this to your tour page:
                            <code>&lt;script&gt;window.SEARCH_PRO_CONFIG_URL = 'search-pro/config/search-config.json';&lt;/script&gt;</code></li>
                            <li>Click below to download:</li>
                            <button id="downloadServerConfig" class="secondary-button">Download Config</button>
                        </ol>
                        <button class="primary-button close-modal">Close</button>
                    </div>
                </div>
            `;

            const modal = document.createElement('div');
            modal.innerHTML = content;
            document.body.appendChild(modal);

            modal.querySelector('.close-modal')?.addEventListener('click', () => modal.remove());

            modal.querySelector('#downloadServerConfig')?.addEventListener('click', () => {
                const blob = new Blob([jsonString], { type: 'application/json' });
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
            });

        } catch (err) {
            console.error('Export for server failed:', err);
            this.showNotification('Failed to export config', 'error');
        }

        setTimeout(() => {
            this._isExportingForServer = false;
        }, 500);
    }
    
    importSettings(file) {
        if (!file) {
            this.showNotification('No file selected', 'error');
            return;
        }

        if (this._isImporting) return;
        this._isImporting = true;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this._stateManager.setState(data);
                this.applyStateToControls();
                this._updatePreview(true);
                this._storageManager.save(data);
                this.showNotification('Settings imported successfully', 'success');
            } catch (error) {
                console.error('Import failed:', error);
                this.showNotification('Import failed: Invalid JSON', 'error');
            } finally {
                const importFile = document.getElementById('importFile');
                if (importFile) importFile.value = '';
                setTimeout(() => {
                    this._isImporting = false;
                }, 500);
            }
        };

        reader.onerror = (e) => {
            this.showNotification('Failed to read import file', 'error');
            this._isImporting = false;
        };

        reader.readAsText(file);
    }
    
    _checkIncognitoMode() {
        try {
            localStorage.setItem('testIncognito', '1');
            localStorage.removeItem('testIncognito');
            
            // Not in incognito mode
            const warning = document.getElementById('incognitoWarning');
            if (warning) {
                warning.style.display = 'none';
            }
        } catch (e) {
            // In incognito mode
            const warning = document.getElementById('incognitoWarning');
            if (warning) {
                warning.style.display = 'block';
            }
        }
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '10px 20px';
        notification.style.backgroundColor = type === 'success' ? '#10b981' : 
                                           type === 'warning' ? '#f59e0b' : 
                                           type === 'error' ? '#ef4444' : '#3b82f6';
        notification.style.color = 'white';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        notification.style.zIndex = '9999';
        notification.style.transition = 'opacity 0.3s, transform 0.3s';
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        
        // Add to document
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
}

export default UIManager;