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
    constructor(options = {}) {
        // Default configuration
        this._options = {
            container: null,                 // Container element or selector
            stateManager: null,              // StateManager instance
            storageManager: null,            // StorageManager instance
            previewDelay: 300,               // Delay before preview updates (ms)
            autoSave: false,                 // Automatically save on changes
            showUnsavedChanges: true,        // Show unsaved changes indicator
            showPreviewToggle: true,         // Show live preview toggle
            useColorPickers: true,           // Use color picker for color inputs
            mobileBreakpoint: 768,           // Mobile breakpoint in pixels
            ...options
        };
        
        // Internal state
        this._container = null;              // Container element
        this._stateManager = null;           // StateManager instance
        this._storageManager = null;         // StorageManager instance
        this._previewMode = true;            // Whether preview mode is active
        this._unsavedChanges = false;        // Whether there are unsaved changes
        this._previewTimer = null;           // Timer for debounced preview updates
        this._controlElements = new Map();   // Map of path -> control element
        this._tabElements = new Map();       // Map of tabId -> tab element
        this._panelElements = new Map();     // Map of tabId -> panel element
        this._tabScrollPositions = new Map(); // Map of tabId -> scroll position
        this._activeTab = null;              // Currently active tab
        this._isMobile = false;              // Whether mobile layout is active
        this._preview = null;                // Live preview element
        
        // UI elements
        this._saveButton = null;             // Save button element
        this._resetButton = null;            // Reset button element
        this._exportButton = null;           // Export button element
        this._importButton = null;           // Import button element
        this._applyButton = null;            // Apply button element
        this._previewToggle = null;          // Preview toggle element
        this._statusIndicator = null;        // Status indicator element
        this._incognitoWarning = null;       // Incognito mode warning element
        
        // Initialize
        this._initialize();
    }
    
    /**
     * Initialize the UI manager
     * @private
     */
    _initialize() {
        // Get container element
        if (typeof this._options.container === 'string') {
            this._container = document.querySelector(this._options.container);
        } else if (this._options.container instanceof HTMLElement) {
            this._container = this._options.container;
        } else {
            this._container = document.body;
        }
        
        if (!this._container) {
            console.error('Container element not found');
            return;
        }
        
        // Set up state manager
        if (this._options.stateManager instanceof StateManager) {
            this._stateManager = this._options.stateManager;
        } else {
            this._stateManager = new StateManager();
        }
        
        // Set up storage manager
        if (this._options.storageManager instanceof StorageManager) {
            this._storageManager = this._options.storageManager;
        } else {
            this._storageManager = new StorageManager();
        }
        
        // Subscribe to state changes
        this._stateManager.subscribe(this._handleStateChange.bind(this));
        
        // Check if in incognito mode
        if (!this._storageManager.isStorageAvailable()) {
            this._showIncognitoWarning();
        }
        
        // Check window size for mobile/desktop layout
        this._checkWindowSize();
        window.addEventListener('resize', this._handleResize.bind(this));
        
        // Add custom styles
        this._addStyles();
    }
    
    /**
     * Initialize the UI and render all components
     * @public
     */
    init() {
        // Load saved settings
        this._loadSettings();
        
        // Render UI
        this._renderUI();
        
        // Set default active tab
        this._setActiveTab(this._getDefaultActiveTab());
        
        // Setup preview if available
        this._setupPreview();
        
        // Mark as initialized
        this._initialized = true;
        
        return this;
    }
    
    /**
     * Render the complete UI
     * @private
     */
    _renderUI() {
        // Clear container
        this._container.innerHTML = '';
        
        // Create header
        const header = this._createHeader();
        
        // Create tabs
        const { tabContainer, contentContainer } = this._renderTabs();
        
        // Create footer
        const footer = this._createFooter();
        
        // Add to container
        this._container.appendChild(header);
        this._container.appendChild(tabContainer);
        this._container.appendChild(contentContainer);
        this._container.appendChild(footer);
        
        // Setup controls from current state
        this._updateControlsFromState(this._stateManager.getState());
    }
    
    /**
     * Create header element
     * @returns {HTMLElement} Header element
     * @private
     */
    _createHeader() {
        const header = document.createElement('header');
        header.className = 'search-pro-header';
        
        // Title
        const title = document.createElement('h1');
        title.textContent = 'Search Pro Configuration';
        header.appendChild(title);
        
        // Controls
        const controls = document.createElement('div');
        controls.className = 'header-controls';
        
        // Apply button
        this._applyButton = document.createElement('button');
        this._applyButton.id = 'applySettings';
        this._applyButton.className = 'primary-button';
        this._applyButton.textContent = 'Apply Settings';
        this._applyButton.addEventListener('click', this._handleApplyClick.bind(this));
        controls.appendChild(this._applyButton);
        
        header.appendChild(controls);
        
        // Incognito warning placeholder
        this._incognitoWarning = document.createElement('div');
        this._incognitoWarning.className = 'incognito-warning';
        this._incognitoWarning.style.display = 'none';
        header.appendChild(this._incognitoWarning);
        
        return header;
    }
    
    /**
     * Create and render tab navigation and content containers
     * @returns {Object} Tab container and content container elements
     * @private
     */
    _renderTabs() {
        const tabContainer = document.createElement('div');
        tabContainer.className = 'tabs';
        
        const contentContainer = document.createElement('div');
        contentContainer.className = 'tab-contents';
        
        // Get UI schema
        const schema = getUISchema();
        
        // Clear existing maps
        this._tabElements.clear();
        this._panelElements.clear();
        
        // Create tabs and panels
        schema.groups.forEach(group => {
            // Create tab
            const tab = document.createElement('div');
            tab.className = 'tab';
            tab.setAttribute('data-tab', group.id);
            tab.textContent = group.label;
            tab.addEventListener('click', () => this._setActiveTab(group.id));
            
            // Store reference
            this._tabElements.set(group.id, tab);
            
            // Add to container
            tabContainer.appendChild(tab);
            
            // Create panel
            const panel = document.createElement('div');
            panel.className = 'tab-content';
            panel.id = `${group.id}-tab`;
            
            // Add title
            const title = document.createElement('h2');
            title.className = 'section-title';
            title.textContent = `${group.label} Settings`;
            panel.appendChild(title);
            
            // Create settings group
            const settingsGrid = document.createElement('div');
            settingsGrid.className = 'settings-grid';
            
            // Create controls for settings
            group.settings.forEach(setting => {
                const control = this._createControl(setting);
                settingsGrid.appendChild(control);
            });
            
            panel.appendChild(settingsGrid);
            
            // Add to container
            contentContainer.appendChild(panel);
            
            // Store reference
            this._panelElements.set(group.id, panel);
            
            // Add panel footer buttons (save/reset)
            if (group.settings.length > 0) {
                const buttonRow = document.createElement('div');
                buttonRow.className = 'button-row';
                
                const resetButton = document.createElement('button');
                resetButton.className = 'reset-to-defaults secondary-button';
                resetButton.textContent = 'Reset to Defaults';
                resetButton.addEventListener('click', this._handleReset.bind(this));
                buttonRow.appendChild(resetButton);
                
                const saveButton = document.createElement('button');
                saveButton.className = 'save-settings primary-button';
                saveButton.textContent = 'Save Settings';
                saveButton.addEventListener('click', this._handleSave.bind(this));
                buttonRow.appendChild(saveButton);
                
                panel.appendChild(buttonRow);
            }
        });
        
        return { tabContainer, contentContainer };
    }
    
    /**
     * Create control element for a setting
     * @param {Object} setting Setting schema
     * @returns {HTMLElement} Control container element
     * @private
     */
    _createControl(setting) {
        const container = document.createElement('div');
        container.className = 'setting-item';
        container.dataset.path = setting.path;
        
        // Label
        const label = document.createElement('label');
        label.className = 'setting-label';
        label.textContent = setting.label;
        label.setAttribute('for', `control-${setting.path}`);
        container.appendChild(label);
        
        // Control element based on setting type
        let control;
        
        switch (setting.type) {
            case 'boolean':
                control = this._createBooleanControl(setting);
                break;
            case 'color':
                control = this._createColorControl(setting);
                break;
            case 'number':
                control = this._createNumberControl(setting);
                break;
            case 'select':
                control = this._createSelectControl(setting);
                break;
            case 'text':
            default:
                control = this._createTextControl(setting);
        }
        
        // Add control to container
        container.appendChild(control);
        
        // Description if available
        if (setting.description) {
            const description = document.createElement('div');
            description.className = 'setting-description';
            description.textContent = setting.description;
            container.appendChild(description);
        }
        
        // Store reference to control
        this._controlElements.set(setting.path, control);
        
        return container;
    }
    
    /**
     * Create boolean control (toggle switch)
     * @param {Object} setting Setting schema
     * @returns {HTMLElement} Control element
     * @private
     */
    _createBooleanControl(setting) {
        const wrapper = document.createElement('div');
        wrapper.className = 'toggle-control-wrapper';
        
        const control = document.createElement('input');
        control.type = 'checkbox';
        control.id = `control-${setting.path}`;
        control.className = 'toggle-control';
        control.dataset.path = setting.path;
        
        // Subscribe to changes
        control.addEventListener('change', () => {
            this._handleControlChange(setting.path, control.checked);
        });
        
        wrapper.appendChild(control);
        
        // Add toggle slider
        const slider = document.createElement('span');
        slider.className = 'toggle-slider';
        wrapper.appendChild(slider);
        
        return wrapper;
    }
    
    /**
     * Create color control
     * @param {Object} setting Setting schema
     * @returns {HTMLElement} Control element
     * @private
     */
    _createColorControl(setting) {
        const wrapper = document.createElement('div');
        wrapper.className = 'color-control-wrapper';
        
        // Color picker control
        const control = document.createElement('input');
        control.type = 'color';
        control.id = `control-${setting.path}`;
        control.className = 'color-control';
        control.dataset.path = setting.path;
        
        // Text input for hex value
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'color-text-input';
        textInput.placeholder = '#RRGGBB';
        textInput.id = `${control.id}-text`;
        
        // Link color picker and text input
        control.addEventListener('input', () => {
            textInput.value = control.value;
            this._handleControlChange(setting.path, control.value);
        });
        
        textInput.addEventListener('input', () => {
            // Only update if valid hex color
            if (/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(textInput.value)) {
                control.value = textInput.value;
                this._handleControlChange(setting.path, textInput.value);
            }
        });
        
        textInput.addEventListener('blur', () => {
            // Force valid hex color on blur
            if (!/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(textInput.value)) {
                textInput.value = control.value;
            }
        });
        
        wrapper.appendChild(control);
        wrapper.appendChild(textInput);
        
        return wrapper;
    }
    
    /**
     * Create number control
     * @param {Object} setting Setting schema
     * @returns {HTMLElement} Control element
     * @private
     */
    _createNumberControl(setting) {
        // For slider-type controls
        if (setting.hasOwnProperty('min') && setting.hasOwnProperty('max') && setting.step !== undefined) {
            return this._createRangeControl(setting);
        }
        
        const control = document.createElement('input');
        control.type = 'number';
        control.id = `control-${setting.path}`;
        control.className = 'number-control';
        control.dataset.path = setting.path;
        
        // Set min/max if available
        if (setting.min !== undefined) control.min = setting.min;
        if (setting.max !== undefined) control.max = setting.max;
        if (setting.step !== undefined) control.step = setting.step;
        
        // Handle nullable values
        if (setting.nullable) {
            control.placeholder = 'Not set (optional)';
        }
        
        // Subscribe to changes
        control.addEventListener('change', () => {
            let value = control.value !== '' ? Number(control.value) : null;
            
            // Handle nullable
            if (value === null && !setting.nullable) {
                value = setting.min || 0;
                control.value = value;
            }
            
            this._handleControlChange(setting.path, value);
        });
        
        return control;
    }
    
    /**
     * Create range slider control with value display
     * @param {Object} setting Setting schema
     * @returns {HTMLElement} Control element
     * @private
     */
    _createRangeControl(setting) {
        const wrapper = document.createElement('div');
        wrapper.className = 'range-control-wrapper';
        
        // Value display
        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'range-value-display';
        valueDisplay.id = `${setting.path}-display`;
        valueDisplay.textContent = setting.default || (setting.min + setting.max) / 2;
        
        // Range input
        const control = document.createElement('input');
        control.type = 'range';
        control.id = `control-${setting.path}`;
        control.className = 'range-control';
        control.dataset.path = setting.path;
        control.min = setting.min;
        control.max = setting.max;
        control.step = setting.step || 1;
        
        // Update display and trigger change on input
        control.addEventListener('input', () => {
            valueDisplay.textContent = control.value;
            this._handleControlChange(setting.path, Number(control.value));
        });
        
        // Create a label that includes the value display
        const rangeLabel = document.createElement('label');
        rangeLabel.className = 'range-label';
        rangeLabel.textContent = `${setting.label}: `;
        rangeLabel.appendChild(valueDisplay);
        
        wrapper.appendChild(rangeLabel);
        wrapper.appendChild(control);
        
        return wrapper;
    }
    
    /**
     * Create select control
     * @param {Object} setting Setting schema
     * @returns {HTMLElement} Control element
     * @private
     */
    _createSelectControl(setting) {
        const control = document.createElement('select');
        control.id = `control-${setting.path}`;
        control.className = 'select-control';
        control.dataset.path = setting.path;
        
        // Add options
        if (setting.options) {
            setting.options.forEach(option => {
                const optionElement = document.createElement('option');
                
                // Handle different option formats
                if (typeof option === 'object') {
                    optionElement.value = option.value !== undefined ? 
                        (option.value === null ? '' : option.value) : '';
                    optionElement.textContent = option.label || option.value || '';
                } else {
                    optionElement.value = option;
                    optionElement.textContent = option;
                }
                
                control.appendChild(optionElement);
            });
        }
        
        // Subscribe to changes
        control.addEventListener('change', () => {
            // Handle special case for null values
            let value = control.value;
            
            if (value === '') {
                value = null;
            } else if (value === 'true') {
                value = true;
            } else if (value === 'false') {
                value = false;
            } else if (!isNaN(Number(value)) && value !== '') {
                // Convert numeric strings to numbers
                value = Number(value);
            }
            
            this._handleControlChange(setting.path, value);
        });
        
        return control;
    }
    
    /**
     * Create text control
     * @param {Object} setting Setting schema
     * @returns {HTMLElement} Control element
     * @private
     */
    _createTextControl(setting) {
        const control = document.createElement('input');
        control.type = 'text';
        control.id = `control-${setting.path}`;
        control.className = 'text-control';
        control.dataset.path = setting.path;
        
        // Handle nullable values
        if (setting.nullable) {
            control.placeholder = 'Not set (optional)';
        }
        
        // Subscribe to changes
        control.addEventListener('input', () => {
            this._handleControlChange(setting.path, control.value);
        });
        
        return control;
    }
    
    /**
     * Create footer element with action buttons
     * @returns {HTMLElement} Footer element
     * @private
     */
    _createFooter() {
        const footer = document.createElement('footer');
        footer.className = 'search-pro-footer';
        
        // Main action buttons
        const actionButtons = document.createElement('div');
        actionButtons.className = 'action-buttons';
        
        // Reset All button - new global reset button
        const resetAllButton = document.createElement('button');
        resetAllButton.id = 'resetAllSettings';
        resetAllButton.className = 'reset-all-button secondary-button';
        resetAllButton.textContent = 'Reset All Settings';
        resetAllButton.addEventListener('click', this._handleResetAll.bind(this));
        actionButtons.appendChild(resetAllButton);
        
        // Spacer
        const buttonSpacer = document.createElement('div');
        buttonSpacer.className = 'button-spacer';
        actionButtons.appendChild(buttonSpacer);
        
        // Reset button
        this._resetButton = document.createElement('button');
        this._resetButton.id = 'resetSettings';
        this._resetButton.className = 'reset-button secondary-button';
        this._resetButton.textContent = 'Reset to Defaults';
        this._resetButton.addEventListener('click', this._handleReset.bind(this));
        actionButtons.appendChild(this._resetButton);
        
        // Save button
        this._saveButton = document.createElement('button');
        this._saveButton.id = 'saveSettings';
        this._saveButton.className = 'save-button primary-button';
        this._saveButton.textContent = 'Save Settings';
        this._saveButton.addEventListener('click', this._handleSave.bind(this));
        actionButtons.appendChild(this._saveButton);
        
        footer.appendChild(actionButtons);
        
        // Import/Export section
        const importExport = document.createElement('div');
        importExport.className = 'import-export-section';
        
        const importExportTitle = document.createElement('h3');
        importExportTitle.textContent = 'Import/Export Settings';
        importExport.appendChild(importExportTitle);
        
        const importExportDescription = document.createElement('p');
        importExportDescription.textContent = 'Export your settings to a file for backup or import them on another device. You can also export a configuration for server-side deployment.';
        importExport.appendChild(importExportDescription);
        
        const importExportButtons = document.createElement('div');
        importExportButtons.className = 'import-export-buttons';
        
        // Export button
        this._exportButton = document.createElement('button');
        this._exportButton.id = 'exportSettings';
        this._exportButton.className = 'export-button secondary-button';
        this._exportButton.textContent = 'Export Settings';
        this._exportButton.addEventListener('click', this._handleExport.bind(this));
        importExportButtons.appendChild(this._exportButton);
        
        // Export for Server button
        const exportServerButton = document.createElement('button');
        exportServerButton.id = 'exportForServer';
        exportServerButton.className = 'export-server-button primary-button';
        exportServerButton.textContent = 'Export for Server';
        exportServerButton.addEventListener('click', this._handleExportForServer.bind(this));
        importExportButtons.appendChild(exportServerButton);
        
        // Import button and file input
        this._importButton = document.createElement('button');
        this._importButton.id = 'importButton';
        this._importButton.className = 'import-button secondary-button';
        this._importButton.textContent = 'Import Settings';
        
        const importFile = document.createElement('input');
        importFile.type = 'file';
        importFile.id = 'importFile';
        importFile.accept = '.json';
        importFile.style.display = 'none';
        importFile.addEventListener('change', this._handleImportFile.bind(this));
        
        this._importButton.addEventListener('click', () => {
            importFile.click();
        });
        
        importExportButtons.appendChild(this._importButton);
        importExportButtons.appendChild(importFile);
        
        importExport.appendChild(importExportButtons);
        footer.appendChild(importExport);
        
        // Server configuration section
        const serverConfig = document.createElement('div');
        serverConfig.className = 'server-config-section';
        
        const serverConfigTitle = document.createElement('h3');
        serverConfigTitle.textContent = 'Server Configuration';
        serverConfig.appendChild(serverConfigTitle);
        
        const serverConfigDescription = document.createElement('p');
        serverConfigDescription.textContent = 'To make your settings persistent across all browsers and tours, export to a server configuration file.';
        serverConfig.appendChild(serverConfigDescription);
        
        const serverConfigInstructions = document.createElement('div');
        serverConfigInstructions.className = 'server-config-instructions';
        serverConfigInstructions.innerHTML = `
            <ol>
                <li>Click "Export for Server" to download the configuration file</li>
                <li>Upload the file to <code>/search-pro/config/search-config.json</code> on your server</li>
                <li>The configuration will automatically load for all users</li>
            </ol>
            <p><strong>Note:</strong> After setting up your permanent configuration, you can remove or restrict access to this settings page.</p>
        `;
        serverConfig.appendChild(serverConfigInstructions);
        
        footer.appendChild(serverConfig);
        
        return footer;
    }
    
    /**
     * Handle Reset All button click
     * @private
     */
    _handleResetAll() {
        if (confirm('Reset ALL settings to defaults? This will reset settings in all tabs and cannot be undone.')) {
            this._performReset();
        }
    }
    
    /**
     * Perform reset to defaults
     * @private
     */
    _performReset() {
        try {
            // Get default settings
            const defaultSettings = getDefaultSettings();
            
            // Update state
            this._stateManager.setState(defaultSettings);
            
            // Force update ALL controls regardless of active tab
            // This ensures controls in inactive tabs are also reset
            this._updateControlsFromState(defaultSettings);
            
            // Mark as having unsaved changes
            this._unsavedChanges = true;
            
            // Show notification
            this._showNotification('Settings reset to defaults', 'info');
            
            return true;
        } catch (error) {
            console.error('[UIManager] Error resetting settings:', error);
            this._showNotification(`Error resetting settings: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Set active tab
     * @param {string} tabId Tab ID to activate
     * @private
     */
    _setActiveTab(tabId) {
        // Save current tab scroll position
        if (this._activeTab) {
            const activePanel = this._panelElements.get(this._activeTab);
            if (activePanel) {
                this._tabScrollPositions.set(this._activeTab, activePanel.scrollTop);
            }
        }
        
        // Update active tab
        this._activeTab = tabId;
        
        // Update tab appearance
        this._tabElements.forEach((tab, id) => {
            if (id === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Update panel visibility
        this._panelElements.forEach((panel, id) => {
            if (id === tabId) {
                panel.style.display = 'block';
                
                // Restore scroll position
                const savedPos = this._tabScrollPositions.get(id);
                if (savedPos) {
                    panel.scrollTop = savedPos;
                }
            } else {
                panel.style.display = 'none';
            }
        });
        
        // Update preview if tab is appearance
        if (tabId === 'appearance' && this._preview) {
            this._updatePreview();
        }
    }
    
    /**
     * Get default active tab ID
     * @returns {string} Default tab ID
     * @private
     */
    _getDefaultActiveTab() {
        // Use first tab as default
        const tabs = Array.from(this._tabElements.keys());
        return tabs.length > 0 ? tabs[0] : 'general';
    }
    
    /**
     * Load settings from storage
     * @private
     */
    _loadSettings() {
        // Try to load settings from storage
        const storedSettings = this._storageManager.load();
        
        if (storedSettings) {
            console.log('[UIManager] Loaded settings from storage');
            this._stateManager.setState(storedSettings);
            this._unsavedChanges = false;
        } else {
            // Fall back to defaults
            console.log('[UIManager] No stored settings found, using defaults');
            this._stateManager.setState(getDefaultSettings());
            this._unsavedChanges = false;
        }
    }

    /**
     * Handle control value change
     * @param {string} path Setting path
     * @param {*} value New value
     * @private
     */
    _handleControlChange(path, value) {
        // Update state
        this._stateManager.setValue(path, value);
        
        // Mark as having unsaved changes
        this._unsavedChanges = true;
        
        // Update preview if in appearance tab
        if (this._activeTab === 'appearance' && this._preview) {
            this._schedulePreviewUpdate();
        }
        
        // Auto-save if configured
        if (this._options.autoSave) {
            this._saveSettings();
        }
    }
    
    /**
     * Handle state change
     * @param {Object} state Current state
     * @private
     */
    _handleStateChange(state) {
        // Nothing needed here as we directly update controls
    }
    
    /**
     * Update all controls to reflect current state
     * @param {Object} state Current state
     * @private
     */
    _updateControlsFromState(state) {
        console.log('[UIManager] Updating all controls from state');
        
        // Update each control
        this._controlElements.forEach((control, path) => {
            const value = getValueFromPath(state, path);
            this._updateControlValue(control, path, value);
        });
        
        // Update preview if in appearance tab
        if (this._activeTab === 'appearance' && this._preview) {
            this._updatePreview();
        }
    }
    
    /**
     * Update specific control's value
     * @param {HTMLElement} control Control element
     * @param {string} path Setting path
     * @param {*} value New value
     * @private
     */
    _updateControlValue(control, path, value) {
        if (!control) return;
        
        // Handle different control types
        if (control.classList.contains('toggle-control-wrapper')) {
            // Boolean toggle switch
            const checkbox = control.querySelector('input[type="checkbox"]');
            if (checkbox) checkbox.checked = Boolean(value);
        } else if (control.classList.contains('color-control-wrapper')) {
            // Color picker with text input
            const colorInput = control.querySelector('input[type="color"]');
            const textInput = control.querySelector('input[type="text"]');
            
            if (colorInput && value) colorInput.value = value;
            if (textInput && value) textInput.value = value;
        } else if (control.classList.contains('range-control-wrapper')) {
            // Range slider with display
            const rangeInput = control.querySelector('input[type="range"]');
            const display = control.querySelector('.range-value-display');
            
            if (rangeInput && value !== null && value !== undefined) {
                rangeInput.value = value;
            }
            
            if (display && value !== null && value !== undefined) {
                display.textContent = value;
            }
        } else if (control.tagName === 'SELECT') {
            // Select dropdown
            // Convert null to empty string for select
            const selectValue = value === null ? '' : 
                               (typeof value === 'boolean' ? value.toString() : value);
            control.value = selectValue;
        } else if (control.type === 'number') {
            // Number input
            control.value = value !== null && value !== undefined ? value : '';
        } else if (control.type === 'text') {
            // Text input
            control.value = value !== null && value !== undefined ? value : '';
        } else if (control.type === 'range') {
            // Range input (direct)
            control.value = value !== null && value !== undefined ? value : '';
            
            // Update display if exists
            const displayId = `${path}-display`;
            const display = document.getElementById(displayId);
            if (display) display.textContent = value;
        }
    }
    
    /**
     * Handle Apply button click
     * @private
     */
    _handleApplyClick() {
        this._applySettings();
    }
    
    /**
     * Apply settings to tour
     * @returns {boolean} Success
     * @private
     */
    _applySettings() {
        try {
            // Get current state
            const state = this._stateManager.getState();
            
            // Validate settings
            const validation = validateSettings(state);
            if (!validation.isValid) {
                const errorMessage = `Validation failed: ${validation.errors[0].message}`;
                this._showNotification(errorMessage, 'error');
                console.error('[UIManager] ' + errorMessage);
                return false;
            }
            
            // Save to localStorage
            this._storageManager.save(state);
            
            let applied = false;
            
            // Try to apply to tour via different contexts
            // First try opener window (when opened as popup)
            if (window.opener && window.opener.tourSearchFunctions && 
                typeof window.opener.tourSearchFunctions.updateConfig === 'function') {
                window.opener.tourSearchFunctions.updateConfig(state);
                applied = true;
                console.log('[UIManager] Applied settings to opener window');
            }
            // Then try parent frame (when embedded)
            else if (window.parent !== window && window.parent.tourSearchFunctions && 
                     typeof window.parent.tourSearchFunctions.updateConfig === 'function') {
                window.parent.tourSearchFunctions.updateConfig(state);
                applied = true;
                console.log('[UIManager] Applied settings to parent frame');
            }
            // Finally try same window (standalone mode)
            else if (window.tourSearchFunctions && 
                     typeof window.tourSearchFunctions.updateConfig === 'function') {
                window.tourSearchFunctions.updateConfig(state);
                applied = true;
                console.log('[UIManager] Applied settings to current window');
            }
            
            // Display appropriate notification
            if (applied) {
                this._showNotification('Settings applied successfully', 'success');
                this._unsavedChanges = false;
            } else {
                this._showNotification('Settings saved but no tour found to apply to', 'info');
            }
            
            return applied;
        } catch (error) {
            console.error('[UIManager] Error applying settings:', error);
            this._showNotification(`Error applying settings: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Handle Reset button click
     * @private
     */
    _handleReset() {
        if (confirm('Reset all settings to defaults? This cannot be undone.')) {
            this._performReset();
        }
    }
    
    /**
     * Handle Save button click
     * @private
     */
    _handleSave() {
        try {
            // Get current state
            const state = this._stateManager.getState();
            
            // Validate settings
            const validation = validateSettings(state);
            if (!validation.isValid) {
                const errorMessage = `Validation failed: ${validation.errors[0].message}`;
                this._showNotification(errorMessage, 'error');
                console.error('[UIManager] ' + errorMessage);
                return false;
            }
            
            // Save to localStorage
            const success = this._storageManager.save(state);
            
            if (success) {
                this._unsavedChanges = false;
                this._showNotification('Settings saved successfully', 'success');
                return true;
            } else {
                this._showNotification('Failed to save settings. Try exporting to a file instead.', 'error');
                return false;
            }
        } catch (error) {
            console.error('[UIManager] Error saving settings:', error);
            this._showNotification(`Error saving settings: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Handle Export button click
     * @private
     */
    _handleExport() {
        try {
            // Get current state
            const state = this._stateManager.getState();
            
            // Export as file
            const success = this._storageManager.exportToFile(state);
            
            if (success) {
                this._showNotification('Settings exported to file', 'success');
            } else {
                this._showNotification('Failed to export settings', 'error');
            }
        } catch (error) {
            console.error('[UIManager] Error exporting settings:', error);
            this._showNotification(`Error exporting settings: ${error.message}`, 'error');
        }
    }
    
    /**
     * Handle Export for Server button click
     * @private
     */
    _handleExportForServer() {
        try {
            // Get current state
            const state = this._stateManager.getState();
            
            // Use storage manager to export for server
            const success = this._storageManager.exportForServer(state);
            
            if (success) {
                // Show notification
                this._showNotification('Server configuration exported', 'success');
                
                // Show deployment instructions
                this._showDeploymentInstructions();
            } else {
                this._showNotification('Failed to export server configuration', 'error');
            }
        } catch (error) {
            console.error('[UIManager] Error exporting server configuration:', error);
            this._showNotification(`Error exporting server configuration: ${error.message}`, 'error');
        }
    }
    
    /**
     * Show deployment instructions
     * @private
     */
    _showDeploymentInstructions() {
        // Create modal dialog
        const modal = document.createElement('div');
        modal.className = 'deployment-modal';
        modal.innerHTML = `
            <div class="deployment-modal-content">
                <h3>Server Deployment Instructions</h3>
                <p>To make these settings permanent across all browsers:</p>
                <ol>
                    <li>Upload <code>search-config.json</code> to: <br>
                        <code>/search-pro/config/search-config.json</code> on your server</li>
                    <li>The configuration will automatically load for all users</li>
                    <li>You can now remove or restrict access to this settings page</li>
                </ol>
                <button class="primary-button close-modal">Got it</button>
            </div>
        `;
        
        // Add styles
        const styles = document.createElement('style');
        styles.textContent = `
            .deployment-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            .deployment-modal-content {
                background-color: #fff;
                border-radius: 8px;
                padding: 20px;
                max-width: 500px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .deployment-modal h3 {
                margin-top: 0;
            }
            .deployment-modal code {
                background-color: #f1f5f9;
                padding: 2px 5px;
                border-radius: 4px;
                font-family: monospace;
            }
            .close-modal {
                margin-top: 20px;
            }
        `;
        document.head.appendChild(styles);
        
        // Add to document
        document.body.appendChild(modal);
        
        // Add event listener to close button
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }
    
    /**
     * Handle Import File input change
     * @param {Event} event Change event
     * @private
     */
    _handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check file type
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            this._showNotification('Invalid file type. Please select a JSON file.', 'error');
            return;
        }
        
        // Read file
        const reader = new FileReader();
        reader.onload = () => {
            try {
                // Parse JSON
                let importedData = JSON.parse(reader.result);
                
                // Extract settings from wrapper if needed
                let settings = importedData;
                if (importedData.settings) {
                    settings = importedData.settings;
                }
                
                // Validate settings
                const validation = validateSettings(settings);
                if (!validation.isValid) {
                    // Create warning message with first error
                    const errorMessage = `Validation issues found: ${validation.errors[0].message}`;
                    
                    // Get default settings to fill in missing values
                    const defaults = getDefaultSettings();
                    
                    // Merge imported settings with defaults for any missing fields
                    const mergedSettings = this._mergeWithDefaults(settings, defaults);
                    
                    // Update state with merged settings
                    this._stateManager.setState(mergedSettings);
                    this._updateControlsFromState(mergedSettings);
                    this._unsavedChanges = true;
                    
                    // Show warning
                    this._showNotification(`${errorMessage}. Default values have been applied where needed.`, 'warning');
                    return;
                }
                
                // Update state with valid settings
                this._stateManager.setState(settings);
                this._updateControlsFromState(settings);
                this._unsavedChanges = true;
                this._showNotification('Settings imported successfully', 'success');
            } catch (error) {
                console.error('[UIManager] Error importing settings:', error);
                this._showNotification(`Error importing settings: ${error.message}`, 'error');
            }
            
            // Reset file input
            event.target.value = '';
        };
        
        reader.onerror = () => {
            this._showNotification('Error reading file', 'error');
        };
        
        reader.readAsText(file);
    }
    
    /**
     * Deep merge imported settings with defaults
     * @param {Object} imported Imported settings 
     * @param {Object} defaults Default settings
     * @returns {Object} Merged settings
     * @private
     */
    _mergeWithDefaults(imported, defaults) {
        const merged = JSON.parse(JSON.stringify(defaults));
        
        // Deep merge function
        const deepMerge = (target, source) => {
            for (const key in source) {
                if (source.hasOwnProperty(key)) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        if (!target[key] || typeof target[key] !== 'object') {
                            target[key] = {};
                        }
                        deepMerge(target[key], source[key]);
                    } else if (source[key] !== undefined) {
                        target[key] = source[key];
                    }
                }
            }
        };
        
        deepMerge(merged, imported);
        return merged;
    }
    
    /**
     * Setup live preview functionality for appearance tab
     * @private
     */
    _setupPreview() {
        // Find appearance tab panel
        const appearancePanel = this._panelElements.get('appearance');
        if (!appearancePanel) return;
        
        // Check if preview already exists
        if (appearancePanel.querySelector('.preview-container')) return;
        
        // Create preview container
        const previewContainer = document.createElement('div');
        previewContainer.className = 'preview-container';
        
        // Create preview title
        const previewTitle = document.createElement('h3');
        previewTitle.className = 'preview-title';
        previewTitle.textContent = 'Live Preview';
        previewContainer.appendChild(previewTitle);
        
        // Create preview content
        this._preview = document.createElement('div');
        this._preview.className = 'search-preview';
        this._preview.innerHTML = `
            <!-- Search Field -->
            <div class="preview-search-field">
                <div class="preview-search-input">Search...</div>
                <div class="preview-search-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
            </div>
            
            <!-- Results Panel -->
            <div class="preview-results-panel">
                <!-- Group Header -->
                <div class="preview-group-header">
                    <span class="preview-group-title">Panorama</span>
                    <span class="preview-group-count">2</span>
                </div>
                
                <!-- Result Items -->
                <div class="preview-result-item">
                    <div class="preview-result-icon"></div>
                    <div class="preview-result-content">
                        <div class="preview-result-text">Living Room</div>
                        <div class="preview-result-description">First floor panorama</div>
                    </div>
                </div>
                <div class="preview-result-item">
                    <div class="preview-result-icon"></div>
                    <div class="preview-result-content">
                        <div class="preview-result-text">Kitchen</div>
                        <div class="preview-result-description">Main area</div>
                    </div>
                </div>
                
                <!-- Another Group -->
                <div class="preview-group-header">
                    <span class="preview-group-title">Hotspot</span>
                    <span class="preview-group-count">1</span>
                </div>
                <div class="preview-result-item">
                    <div class="preview-result-icon"></div>
                    <div class="preview-result-content">
                        <div class="preview-result-text">Dining Room</div>
                        <div class="preview-result-description">In Living Room</div>
                    </div>
                </div>
            </div>
        `;
        
        // Add preview to container
        previewContainer.appendChild(this._preview);
        
        // Add container to panel
        appearancePanel.appendChild(previewContainer);
        
        // Initial update
        this._updatePreview();
    }
    
    /**
     * Schedule a debounced preview update
     * @private
     */
    _schedulePreviewUpdate() {
        // Clear existing timer
        if (this._previewTimer) {
            clearTimeout(this._previewTimer);
        }
        
        // Schedule update
        this._previewTimer = setTimeout(() => {
            this._updatePreview();
        }, this._options.previewDelay);
    }
    
    /**
     * Update preview with current settings
     * @private
     */
    _updatePreview() {
        if (!this._preview) return;
        
        const state = this._stateManager.getState();
        
        // Get preview elements
        const searchField = this._preview.querySelector('.preview-search-field');
        const searchInput = this._preview.querySelector('.preview-search-input');
        const searchIcon = this._preview.querySelector('.preview-search-icon');
        const resultsPanel = this._preview.querySelector('.preview-results-panel');
        const resultItems = this._preview.querySelectorAll('.preview-result-item');
        const groupHeaders = this._preview.querySelectorAll('.preview-group-header');
        
        // Update theme (dark/light mode)
        this._preview.classList.remove('preview-dark-mode', 'preview-light-mode');
        if (state.theme?.useDarkMode === true) {
            this._preview.classList.add('preview-dark-mode');
        } else if (state.theme?.useDarkMode === false) {
            this._preview.classList.add('preview-light-mode');
        }
        
        // Update search width
        const searchWidth = state.appearance?.searchWidth || 350;
        this._preview.style.width = `${Math.min(searchWidth, 500)}px`; // Limit preview width
        
        // Update results max height
        const maxHeight = state.appearance?.searchResults?.maxHeight || 500;
        if (resultsPanel) {
            resultsPanel.style.maxHeight = `${Math.min(maxHeight / 2, 200)}px`; // Scale down for preview
        }
        
        // Update typography if available
        if (state.theme?.typography) {
            const typography = state.theme.typography;
            this._preview.style.fontFamily = typography.fontFamily || '';
            this._preview.style.fontSize = typography.fontSize ? `${typography.fontSize / 16}em` : '';
            this._preview.style.letterSpacing = typography.letterSpacing ? `${typography.letterSpacing}px` : '';
        }
        
        // Update colors if available
        if (state.appearance?.colors) {
            const colors = state.appearance.colors;
            
            // Update search field colors
            if (searchField) {
                searchField.style.backgroundColor = colors.searchBackground || '';
            }
            
            if (searchInput) {
                searchInput.style.color = colors.searchText || '';
            }
            
            if (searchIcon) {
                searchIcon.style.color = colors.searchIcon || '';
            }
            
            // Update results panel colors
            if (resultsPanel) {
                resultsPanel.style.backgroundColor = colors.resultsBackground || '';
            }
            
            // Update result items
            resultItems.forEach(item => {
                item.style.borderLeftColor = colors.resultBorderLeft || '';
                
                // Update text colors
                const text = item.querySelector('.preview-result-text');
                if (text) {
                    text.style.color = colors.resultText || '';
                }
                
                const description = item.querySelector('.preview-result-description');
                if (description) {
                    description.style.color = colors.resultSubtitle || '';
                }
                
                // Add hover effect
                item.addEventListener('mouseenter', () => {
                    item.style.backgroundColor = colors.resultHover || '';
                    item.style.borderLeftColor = colors.resultBorderLeft || '';
                });
                
                item.addEventListener('mouseleave', () => {
                    item.style.backgroundColor = '';
                });
            });
            
            // Update group headers
            groupHeaders.forEach(header => {
                const title = header.querySelector('.preview-group-title');
                if (title) {
                    title.style.color = colors.groupHeaderColor || '';
                }
                
                const count = header.querySelector('.preview-group-count');
                if (count) {
                    count.style.color = colors.groupCountColor || '';
                }
            });
        }
        
        // Update display options
        const showGroupHeaders = state.display?.showGroupHeaders !== false;
        const showGroupCount = state.display?.showGroupCount !== false;
        const showIcons = state.display?.showIconsInResults !== false;
        
        // Apply display settings
        groupHeaders.forEach(header => {
            header.style.display = showGroupHeaders ? '' : 'none';
            
            const count = header.querySelector('.preview-group-count');
            if (count) {
                count.style.display = showGroupCount ? '' : 'none';
            }
        });
        
        // Show/hide icons
        const resultIcons = this._preview.querySelectorAll('.preview-result-icon');
        resultIcons.forEach(icon => {
            icon.style.display = showIcons ? '' : 'none';
        });
    }
    
    /**
     * Show notification message
     * @param {string} message Message to display
     * @param {string} type Notification type (success, error, warning, info)
     * @private
     */
    _showNotification(message, type = 'info') {
        // Track active notifications
        if (!this._activeNotifications) {
            this._activeNotifications = [];
        }
        
        // Remove outdated notifications
        const currentTime = Date.now();
        this._activeNotifications = this._activeNotifications.filter(n => {
            const isExpired = currentTime > n.expireTime;
            if (isExpired && n.element.parentNode) {
                document.body.removeChild(n.element);
            }
            return !isExpired;
        });
        
        // Limit to 3 active notifications
        if (this._activeNotifications.length >= 3) {
            const oldest = this._activeNotifications.shift();
            if (oldest.element.parentNode) {
                document.body.removeChild(oldest.element);
            }
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style notification
        notification.style.position = 'fixed';
        notification.style.bottom = `${20 + (this._activeNotifications.length * 70)}px`;
        notification.style.right = '20px';
        notification.style.padding = '12px 20px';
        notification.style.backgroundColor = type === 'success' ? '#10b981' : 
                                           type === 'error' ? '#ef4444' :
                                           type === 'warning' ? '#f59e0b' : '#3b82f6';
        notification.style.color = 'white';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        notification.style.zIndex = '9999';
        notification.style.transition = 'opacity 0.3s, transform 0.3s';
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        
        // Add to document
        document.body.appendChild(notification);
        
        // Track this notification
        const expireTime = currentTime + 3000;
        this._activeNotifications.push({
            element: notification,
            expireTime: expireTime
        });
        
        // Show notification
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(20px)';
            
            // Remove from DOM after animation
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * Show incognito mode warning
     * @private
     */
    _showIncognitoWarning() {
        if (!this._incognitoWarning) return;
        
        this._incognitoWarning.innerHTML = `
            <div class="warning-icon">⚠️</div>
            <div class="warning-content">
                <strong>Private Browsing Detected:</strong> 
                Your settings will not persist after closing this session. 
                Please export your settings to a file after making changes.
            </div>
        `;
        
        this._incognitoWarning.style.display = 'flex';
    }
    
    /**
     * Handle window resize
     * @private
     */
    _handleResize() {
        clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => {
            this._checkWindowSize();
        }, 200);
    }
    
    /**
     * Check window size for mobile/desktop layout
     * @private
     */
    _checkWindowSize() {
        const wasMobile = this._isMobile;
        this._isMobile = window.innerWidth < this._options.mobileBreakpoint;
        
        // Update layout class if changed
        if (wasMobile !== this._isMobile) {
            this._container.classList.toggle('mobile-layout', this._isMobile);
            this._container.classList.toggle('desktop-layout', !this._isMobile);
        }
    }
    
    /**
     * Add required styles to document
     * @private
     */
    _addStyles() {
        if (document.getElementById('search-pro-settings-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'search-pro-settings-styles';
        
        style.textContent = `
            /* Base styles */
            .search-pro-container {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: #1e293b;
                max-width: 1000px;
                margin: 0 auto;
                padding: 20px;
                box-sizing: border-box;
            }
            
            /* Header */
            .search-pro-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 15px;
            }
            
            .search-pro-header h1 {
                margin: 0;
                font-size: 1.8rem;
                font-weight: 500;
            }
            
            .header-controls {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            
            /* Tabs */
            .tabs {
                display: flex;
                border-bottom: 1px solid #e2e8f0;
                margin-bottom: 20px;
                overflow-x: auto;
                scrollbar-width: none; /* Firefox */
                -ms-overflow-style: none; /* IE and Edge */
            }
            
            .tabs::-webkit-scrollbar {
                display: none; /* Chrome, Safari, Opera */
            }
            
            .tab {
                padding: 10px 20px;
                cursor: pointer;
                border-bottom: 2px solid transparent;
                color: #64748b;
                font-weight: 500;
                white-space: nowrap;
            }
            
            .tab.active {
                color: #3b82f6;
                border-bottom-color: #3b82f6;
            }
            
            /* Tab content */
            .tab-content {
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                padding: 20px;
                margin-bottom: 20px;
                display: none;
            }
            
            .tab-content.active {
                display: block;
            }
            
            /* Section titles */
            .section-title {
                font-size: 1.2rem;
                font-weight: 600;
                margin-top: 0;
                margin-bottom: 15px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 5px;
                color: #1e293b;
            }
            
            /* Settings grid */
            .settings-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }
            
            /* Setting item */
            .setting-item {
                margin-bottom: 5px;
            }
            
            .setting-label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
                font-size: 14px;
                color: #334155;
            }
            
            .setting-description {
                font-size: 12px;
                color: #64748b;
                margin-top: 4px;
            }
            
            /* Controls */
            input[type="text"],
            input[type="number"],
            select {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #cbd5e1;
                border-radius: 4px;
                font-size: 14px;
                background-color: #ffffff;
                color: #1e293b;
            }
            
            input[type="text"]:focus,
            input[type="number"]:focus,
            select:focus {
                border-color: #3b82f6;
                outline: none;
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
            }
            
            /* Range input */
            input[type="range"] {
                width: 100%;
                height: 6px;
                -webkit-appearance: none;
                background: #e2e8f0;
                border-radius: 3px;
                outline: none;
            }
            
            input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #3b82f6;
                cursor: pointer;
            }
            
            input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #3b82f6;
                cursor: pointer;
                border: none;
            }
            
            .range-control-wrapper {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .range-label {
                display: flex;
                justify-content: space-between;
                font-size: 14px;
            }
            
            .range-value-display {
                font-weight: 600;
            }
            
            /* Color control */
            .color-control-wrapper {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .color-control {
                width: 40px;
                height: 30px;
                padding: 0;
                border: 1px solid #cbd5e1;
                border-radius: 4px;
                cursor: pointer;
            }
            
            .color-text-input {
                flex: 1;
            }
            
            /* Toggle switch */
            .toggle-control-wrapper {
                position: relative;
                display: inline-block;
                width: 46px;
                height: 24px;
            }
            
            .toggle-control {
                opacity: 0;
                width: 0;
                height: 0;
                margin: 0;
            }
            
            .toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #cbd5e1;
                border-radius: 24px;
                transition: background-color 0.3s;
            }
            
            .toggle-slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                border-radius: 50%;
                transition: transform 0.3s;
            }
            
            .toggle-control:checked + .toggle-slider {
                background-color: #3b82f6;
            }
            
            .toggle-control:checked + .toggle-slider:before {
                transform: translateX(22px);
            }
            
            /* Button styles */
            .button-row {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
            }
            
            button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .primary-button {
                background-color: #3b82f6;
                color: white;
            }
            
            .primary-button:hover {
                background-color: #2563eb;
            }
            
            .secondary-button {
                background-color: #e2e8f0;
                color: #475569;
            }
            
            .secondary-button:hover {
                background-color: #cbd5e1;
            }
            
            /* Footer */
            .search-pro-footer {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            /* Import/Export section */
            .import-export-section, 
            .server-config-section {
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                padding: 20px;
                margin-bottom: 20px;
            }
            
            .import-export-section h3,
            .server-config-section h3 {
                margin-top: 0;
                font-size: 1.1rem;
                font-weight: 600;
                color: #1e293b;
            }
            
            .import-export-buttons {
                display: flex;
                gap: 10px;
                margin-top: 15px;
            }
            
            /* Server config instructions */
            .server-config-instructions {
                background-color: #f8fafc;
                border-left: 4px solid #3b82f6;
                padding: 15px;
                margin-top: 15px;
                border-radius: 0 4px 4px 0;
            }
            
            .server-config-instructions ol {
                margin: 15px 0;
                padding-left: 20px;
            }
            
            .server-config-instructions li {
                margin-bottom: 8px;
            }
            
            .server-config-instructions code {
                background-color: #e2e8f0;
                padding: 2px 4px;
                border-radius: 3px;
                font-family: monospace;
            }
            
            /* Preview styles */
            .preview-container {
                margin-top: 30px;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 15px;
                background-color: #f8fafc;
            }
            
            .preview-title {
                font-size: 1rem;
                font-weight: 600;
                margin-top: 0;
                margin-bottom: 15px;
                color: #475569;
            }
            
            .search-preview {
                max-width: 400px;
                margin: 0 auto;
                font-size: 14px;
            }
            
            .preview-search-field {
                position: relative;
                background: #ffffff;
                border-radius: 35px;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
                padding: 10px 15px;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
            }
            
            .preview-search-input {
                flex: 1;
                color: #1a1a1a;
                opacity: 0.6;
            }
            
            .preview-search-icon {
                width: 24px;
                height: 24px;
                color: #64748b;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .preview-search-icon svg {
                width: 16px;
                height: 16px;
                stroke: currentColor;
                fill: none;
                stroke-width: 2;
            }
            
            .preview-results-panel {
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
                overflow-y: auto;
                max-height: 200px;
            }
            
            .preview-group-header {
                padding: 8px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .preview-group-title {
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                color: #475569;
            }
            
            .preview-group-count {
                font-size: 11px;
                color: #94a3b8;
            }
            
            .preview-result-item {
                padding: 8px 12px;
                display: flex;
                align-items: flex-start;
                gap: 8px;
                border-left: 3px solid transparent;
            }
            
            .preview-result-item:hover {
                background-color: #f1f5f9;
                border-left-color: #3b82f6;
            }
            
            .preview-result-icon {
                width: 14px;
                height: 14px;
                background-color: #6E85F7;
                border-radius: 50%;
                flex-shrink: 0;
            }
            
            .preview-result-content {
                flex: 1;
                min-width: 0;
            }
            
            .preview-result-text {
                font-size: 13px;
                font-weight: 500;
                color: #1e293b;
                margin-bottom: 2px;
            }
            
            .preview-result-description {
                font-size: 11px;
                color: #64748b;
            }
            
            /* Dark mode preview styles */
            .preview-dark-mode .preview-search-field {
                background: rgba(30, 41, 59, 0.98);
            }
            
            .preview-dark-mode .preview-search-input {
                color: #e2e8f0;
            }
            
            .preview-dark-mode .preview-results-panel {
                background: rgba(30, 41, 59, 0.98);
            }
            
            .preview-dark-mode .preview-group-title {
                color: #94a3b8;
            }
            
            .preview-dark-mode .preview-result-text {
                color: #e2e8f0;
            }
            
            .preview-dark-mode .preview-result-description {
                color: #94a3b8;
            }
            
            .preview-dark-mode .preview-result-item:hover {
                background-color: rgba(59, 130, 246, 0.1);
            }
            
            /* Incognito warning */
            .incognito-warning {
                display: flex;
                align-items: center;
                gap: 10px;
                background-color: #fef2f2;
                border-left: 4px solid #ef4444;
                color: #b91c1c;
                padding: 12px 15px;
                border-radius: 0 4px 4px 0;
                margin-bottom: 20px;
                width: 100%;
                box-sizing: border-box;
            }
            
            .warning-icon {
                font-size: 1.5rem;
            }
            
            /* Mobile adjustments */
            @media (max-width: 768px) {
                .settings-grid {
                    grid-template-columns: 1fr;
                }
                
                .button-row {
                    flex-direction: column;
                }
                
                .button-row button {
                    width: 100%;
                }
                
                .import-export-buttons {
                    flex-direction: column;
                }
                
                .import-export-buttons button {
                    width: 100%;
                }
                
                .tab {
                    padding: 10px 15px;
                    font-size: 14px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// For CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}

// For ES modules environments
export default UIManager;