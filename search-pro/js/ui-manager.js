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
        // Prevent double initialization
        if (this._eventsBound) {
            console.warn('[UIManager] Events already bound, skipping initialization');
            return;
        }
        
        // Render the UI
        this._renderUI();
        
        // Set up tabs with scroll position preservation
        this._setupTabs();
        
        // Remove any existing event listeners if possible
        if (this._abortController) {
            this._abortController.abort();
        }
        this._abortController = new AbortController();
        const signal = this._abortController.signal;
        
        // Collect all inputs with data-path attribute
        const inputs = document.querySelectorAll('[data-path]');
        inputs.forEach(input => this._setupControl(input));
        
        // Ensure font family changes update preview
        const fontFamilySelect = document.querySelector('[data-path="theme.typography.fontFamily"]');
        if (fontFamilySelect) {
            fontFamilySelect.addEventListener('change', () => {
                // Force preview update after font family change
                setTimeout(() => this._updatePreview(true), 10);
            });
        }

        // Ensure placeholder text updates preview
        const placeholderInput = document.querySelector('[data-path="searchBar.placeholder"]');
        if (placeholderInput) {
            placeholderInput.addEventListener('input', () => {
                // Update preview placeholder text immediately
                const previewInput = this.preview.querySelector('.preview-search-input');
                if (previewInput) {
                    previewInput.placeholder = placeholderInput.value || 'Search...';
                }
                this._updatePreview();
            });
        }

        // Ensure search width updates preview
        const searchWidthInput = document.querySelector('[data-path="appearance.searchWidth"]');
        if (searchWidthInput) {
            searchWidthInput.addEventListener('input', () => {
                const width = parseInt(searchWidthInput.value, 10) || 350;
                if (this.preview) {
                    this.preview.style.width = `${Math.min(width, 500)}px`;
                }
            });
        }
        
        // Set up linked color inputs
        const linkedInputs = document.querySelectorAll('[data-linked]');
        linkedInputs.forEach(input => this._setupLinkedControl(input));
        
        // Set up action buttons
        this._setupActionButtons();
        
        // Load and apply initial state
        this._loadState();
        
        // Mark as initialized to prevent duplicate binding
        this._eventsBound = true;
        
        console.info('[UIManager] Initialization complete');
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
                const defaults = getDefaultSettings();
                
                // Update state with defaults
                this._stateManager.setState(defaults);
                
                // Apply state to controls with proper event dispatching
                this.applyStateToControls(true); // Pass true to force events
                
                // Update preview
                this._updatePreview(true);
                
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
    
    applyStateToControls(forceEvents = false) {
        const state = this._stateManager.getState();
        
        // Update each control with value from state
        this._controlMap.forEach((control, path) => {
            const value = this.getValueFromPath(state, path);
            
            if (value !== undefined) {
                if (control.type === 'checkbox') {
                    control.checked = Boolean(value);
                    if (forceEvents) {
                        control.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } else if (control.type === 'color') {
                    control.value = value;
                    
                    // Update linked text input if exists
                    const textInput = document.getElementById(`${control.id}Text`);
                    if (textInput) {
                        textInput.value = value;
                    }
                    
                    if (forceEvents) {
                        control.dispatchEvent(new Event('input', { bubbles: true }));
                        control.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } else if (control.tagName === 'SELECT') {
                    // Handle boolean and null values in selects
                    if (value === true) control.value = 'true';
                    else if (value === false) control.value = 'false';
                    else if (value === null) control.value = '';
                    else control.value = String(value);
                    
                    if (forceEvents) {
                        control.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } else if (control.type === 'range') {
                    control.value = value;
                    // Update display value if exists
                    const displayId = control.dataset.valueDisplay;
                    if (displayId) {
                        const display = document.getElementById(displayId);
                        if (display) {
                            display.textContent = value;
                        }
                    }
                    
                    if (forceEvents) {
                        control.dispatchEvent(new Event('input', { bubbles: true }));
                        control.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } else {
                    control.value = value;
                    
                    if (forceEvents) {
                        control.dispatchEvent(new Event('change', { bubbles: true }));
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
        
        // Update typography - ensure font family is applied
        if (state.theme?.typography || forceFullRefresh) {
            const typography = state.theme?.typography || {};
            const fontFamily = typography.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            
            // Apply to preview
            this.preview.style.fontFamily = fontFamily;
            this.preview.style.fontSize = typography.fontSize ? `${typography.fontSize / 16}rem` : '';
            this.preview.style.letterSpacing = typography.letterSpacing ? `${typography.letterSpacing}px` : '';
            
            // Update font preview element
            const fontPreview = document.getElementById('fontPreview');
            if (fontPreview) {
                fontPreview.style.fontFamily = fontFamily;
                fontPreview.style.fontSize = typography.fontSize ? `${typography.fontSize}px` : '';
                fontPreview.style.letterSpacing = typography.letterSpacing ? `${typography.letterSpacing}px` : '';
            }
            
            // Ensure dropdown reflects current value
            const fontFamilyDropdown = document.querySelector('[data-path="theme.typography.fontFamily"]');
            if (fontFamilyDropdown && fontFamily) {
                // Find the option that matches the font family
                const options = Array.from(fontFamilyDropdown.options);
                const matchingOption = options.find(option => option.value === fontFamily);
                
                if (matchingOption) {
                    fontFamilyDropdown.value = fontFamily;
                }
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
            // Apply any pending changes to state before exporting
            this._syncUIToState();
            
            // Get the most current state
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
            // Apply any pending changes to state before exporting
            this._syncUIToState();
            
            // Get the most current state
            const state = this._stateManager.getState();

            // Create a server-ready config object
            const configForServer = {
                version: "2.0.0", // Use your actual schema version
                timestamp: new Date().toISOString(),
                meta: {
                    generatedBy: "Search Pro Config Panel",
                    warning: "DO NOT EDIT THIS FILE MANUALLY"
                },
                settings: state
            };

            const jsonString = JSON.stringify(configForServer, null, 2);
            
            // Create download or show modal (existing implementation)
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

            this.showNotification('Server configuration exported', 'success');
        } catch (err) {
            console.error('Export for server failed:', err);
            this.showNotification('Failed to export config', 'error');
        }

        setTimeout(() => {
            this._isExportingForServer = false;
        }, 500);
    }

    // Add this helper method to sync UI values to state before export
    _syncUIToState() {
        // Collect all inputs with data-path attribute
        const inputs = document.querySelectorAll('[data-path]');
        
        inputs.forEach(input => {
            const path = input.dataset.path;
            if (!path) return;
            
            let value;
            
            if (input.type === 'checkbox') {
                value = input.checked;
            } else if (input.tagName === 'SELECT') {
                value = input.value;
                // Convert special values
                if (value === 'true') value = true;
                else if (value === 'false') value = false;
                else if (value === '') value = null;
            } else if (input.type === 'number') {
                value = parseFloat(input.value);
                if (isNaN(value)) value = 0;
            } else if (input.type === 'range') {
                value = parseFloat(input.value);
                if (isNaN(value)) value = 0;
            } else {
                value = input.value;
            }
            
            // Update state with current input value
            this._stateManager.setState(value, path);
        });
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
                
                // Handle different config formats - extract settings object
                const settingsObj = data.settings || data;
                
                if (!settingsObj || typeof settingsObj !== 'object') {
                    throw new Error('Invalid settings format: no settings object found');
                }
                
                // Validate settings have required sections
                const requiredSections = ['display', 'appearance', 'includeContent', 'searchBar'];
                const missingSections = requiredSections.filter(section => !settingsObj[section]);
                
                if (missingSections.length > 0) {
                    this.showNotification(`Warning: Missing sections: ${missingSections.join(', ')}`, 'warning');
                }
                
                // Update state with imported settings
                this._stateManager.setState(settingsObj);
                
                // Apply new state to UI controls - force events to ensure proper updates
                this.applyStateToControls(true);
                
                // Force update preview
                this._updatePreview(true);
                
                // Save to localStorage
                this._storageManager.save(settingsObj);
                
                this.showNotification('Settings imported successfully', 'success');
            } catch (error) {
                console.error('Import failed:', error);
                this.showNotification('Import failed: ' + error.message, 'error');
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