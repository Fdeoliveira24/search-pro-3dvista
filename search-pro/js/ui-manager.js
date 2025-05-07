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

import {
  getUISchema,
  getDefaultSettings,
  validateSettings,
  getValueFromPath,
  setValueAtPath,
} from "./settings-schema.js";
import StateManager from "./state-manager.js";
import StorageManager from "./storage-manager.js";

class UIManager {
  /**
   * Creates a new UIManager instance
   * @param {Object} options Configuration options
   */
  constructor(stateManager, storageManager) {
    this._stateManager = stateManager;
    this._storageManager = storageManager;

    // Ensure the stateManager has tabScrollPosition methods
    this._ensureStateManagerHasTabMethods();

    this._controlMap = new Map();
    this._activeTab = "general";

    // Add this property to track pending updates
    this._pendingPreviewUpdate = false;

    // Check for incognito mode
    this._checkIncognitoMode();

    // NOTE: Preview initialization moved to after state loading in initialize()
    this._previewInitialized = false;

    // Add this at the end of the constructor
    this._ensurePreviewMethodCompatibility();
  }

  /**
   * Step 2: Modify UIManager to handle proper initialization
   * (Replace or extend the existing UIManager.initialize method)
   */
  // Extend UIManager.prototype.initialize
  initialize() {
    // Track initialization attempt
    console.info("[UIManager] Initialization requested");

    // Skip if already initialized and events bound, unless forced
    if (this._eventsBound && !this._forceReinit) {
      console.info("[UIManager] Already initialized, skipping");
      return;
    }

    console.info("[UIManager] Initialization started");

    // Store global reference
    window.uiManagerInstance = this;

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
    const inputs = document.querySelectorAll("[data-path]");
    
    // Clear existing control map to prevent stale references
    this._controlMap.clear();
    
    // Set up each control
    inputs.forEach((input) => this._setupControl(input));

    // Ensure font family changes update preview
    const fontFamilySelect = document.querySelector(
      '[data-path="theme.typography.fontFamily"]',
    );
    if (fontFamilySelect) {
      // Clone and replace to remove existing listeners
      const originalSelect = fontFamilySelect;
      const clonedSelect = originalSelect.cloneNode(true);
      if (originalSelect.parentNode) {
        originalSelect.parentNode.replaceChild(clonedSelect, originalSelect);
      }
      
      // Add listener to the clone
      clonedSelect.addEventListener("change", () => {
        // Force preview update after font family change
        setTimeout(() => this._updatePreview(true), 10);
      });
    }

    // Ensure placeholder text updates preview
    const placeholderInput = document.querySelector(
      '[data-path="searchBar.placeholder"]',
    );
    if (placeholderInput) {
      // Clone and replace to remove existing listeners
      const originalInput = placeholderInput;
      const clonedInput = originalInput.cloneNode(true);
      if (originalInput.parentNode) {
        originalInput.parentNode.replaceChild(clonedInput, originalInput);
      }
      
      // Add listener to the clone
      clonedInput.addEventListener("input", () => {
        // Update preview placeholder text immediately
        const previewInput = this.preview?.querySelector(
          ".preview-search-input",
        );
        if (previewInput) {
          previewInput.placeholder = clonedInput.value || "Search...";
        }
        this._schedulePreviewUpdate(true);
      });
    }

    // Ensure search width updates preview
    const searchWidthInput = document.querySelector(
      '[data-path="appearance.searchWidth"]',
    );
    if (searchWidthInput) {
      // Clone and replace to remove existing listeners
      const originalInput = searchWidthInput;
      const clonedInput = originalInput.cloneNode(true);
      if (originalInput.parentNode) {
        originalInput.parentNode.replaceChild(clonedInput, originalInput);
      }
      
      // Add listener to the clone
      clonedInput.addEventListener("input", () => {
        const width = parseInt(clonedInput.value, 10) || 350;
        if (this.preview) {
          this.preview.style.width = `${Math.min(width, 500)}px`;
        }
      });
    }

    // Set up linked color inputs
    const linkedInputs = document.querySelectorAll("[data-linked]");
    if (typeof this._setupLinkedControl === 'function') {
      linkedInputs.forEach((input) => this._setupLinkedControl(input));
    } else {
      console.error("[UIManager] _setupLinkedControl is not defined");
    }

    // Ensure _setupActionButtons uses proper event binding
    this._setupActionButtons(true); // Pass true to force clean binding

    // Load and apply initial state
    this._loadState();

    // IMPORTANT CHANGE: Set up preview AFTER state is loaded
    this._waitForPreviewAndSetup();

    // Mark as initialized to prevent duplicate binding
    this._eventsBound = true;

    // Clean up any existing observers
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }

    console.info("[UIManager] Initialization completed");
  }

  // New method to wait for preview and set it up with loaded state
  _waitForPreviewAndSetup() {
    console.info("[UIManager] Setting up preview after state loading");

    // If preview already exists in DOM, set it up immediately
    const preview = document.querySelector("#layoutPreview");
    if (preview) {
      this._setupPreview();
      return;
    }

    // Otherwise, wait for it to become available
    const waitForPreview = setInterval(() => {
      const preview = document.querySelector("#layoutPreview");
      if (preview) {
        clearInterval(waitForPreview);
        this._setupPreview();
      }
    }, 100);
  }

  /**
   * Renders the main UI components
   * @private
   */
  _renderUI() {
    // Create the header toolbar
    const toolbar = this._createHeaderToolbar();

    // Get the settings panel
    const settingsPanel = document.querySelector(".settings-panel");
    if (settingsPanel) {
      // Insert the toolbar before the tabs
      const tabs = settingsPanel.querySelector(".tabs");
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
    const toolbar = document.createElement("div");
    toolbar.className = "global-action-toolbar";

    // Create and add buttons to the toolbar
    const buttons = [
      {
        id: "applySettings",
        text: "Apply Settings",
        className: "primary-button",
        handler: () => this._handleApplyClick(),
      },
      {
        id: "saveSettings",
        text: "Save Settings",
        className: "primary-button",
        handler: () => this._handleSaveClick(),
      },
      {
        id: "resetSettings",
        text: "Reset to Defaults",
        className: "secondary-button",
        handler: () => this._handleResetClick(),
      },
      {
        id: "exportSettings",
        text: "Export Settings",
        className: "secondary-button",
        handler: () => this.exportSettings(),
      },
      {
        id: "importButton",
        text: "Import Settings",
        className: "secondary-button",
        handler: () => document.getElementById("importFile").click(),
      },
      {
        id: "exportForServer",
        text: "Export for Server",
        className: "secondary-button",
        handler: () => this.exportForServer(),
      },
    ];

    // Create each button and add it to the toolbar
    buttons.forEach((btnConfig) => {
      const button = document.createElement("button");
      button.id = btnConfig.id;
      button.textContent = btnConfig.text;
      button.className = btnConfig.className;
      button.addEventListener("click", btnConfig.handler);
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

    // Force update the preview with current state
    this._updatePreview(true);

    if (window.opener?.tourSearchFunctions) {
      window.opener.searchProSettings = state;
      window.opener.tourSearchFunctions.updateConfig(state);

      // Force live DOM patch
      const container =
        window.opener.document.getElementById("searchContainer");
      if (container) {
        const pos = state.searchBar?.position || {};
        ["top", "right", "bottom", "left"].forEach((side) => {
          container.style[side] = pos[side] !== null ? `${pos[side]}px` : "";
        });

        const input = container.querySelector("#tourSearch");
        if (input && state.searchBar.placeholder) {
          input.placeholder = state.searchBar.placeholder;
        }
      }

      // Apply all settings to tour DOM
      this._applyToTourDOM(state);

      this.showNotification("Settings applied to active tour", "success");
    } else {
      this.showNotification("Settings saved. Reload tour to apply.", "info");
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
      this.showNotification("Settings saved successfully", "success");
    } else {
      this.showNotification("Failed to save settings", "error");
    }
  }

  /**
   * Handle Reset to Defaults button click with comprehensive UI updates
   * @private
   */
  _handleResetClick() {
    if (this._isResetting) return;
    this._isResetting = true;

    if (confirm("Reset all settings to defaults?")) {
      try {
        console.info("[UIManager] Beginning reset to defaults");

        // Get default settings from schema
        const defaults = getDefaultSettings();
        if (!defaults) {
          throw new Error("Default settings not available");
        }

        // Update state with defaults
        const success = this._stateManager.setState(defaults);
        if (!success) {
          throw new Error("Failed to update state with defaults");
        }

        // Apply state to controls with forced events
        this.applyStateToControls(true);

        // Force update preview to ensure visual changes
        this._updatePreview(true);

        // Apply default settings to tour DOM immediately
        this._applyToTourDOM(defaults);

        setTimeout(() => {
          // Special handling for problematic controls
          this._fixFontFamilyAfterReset();

          this.showNotification("Settings reset to defaults", "success");

          // Save the default settings to localStorage
          this._storageManager.save(defaults);
        }, 100);
      } catch (error) {
        console.error("[UIManager] Reset failed:", error);
        this.showNotification(
          "Failed to reset settings: " + error.message,
          "error",
        );

        const suggestionPrompt = `
                [SearchPro Error Debugging Request]
                - Error Message: ${error.message}
                - Stack Trace: ${error.stack}
                - Context: UIManager ➔ Reset Settings
                - URL: ${window.location.href}
                - User Agent: ${navigator.userAgent}
                ➔ Suggest possible causes and fixes:
                `;
        console.log(suggestionPrompt);
      }

      setTimeout(() => {
        this._isResetting = false;
      }, 500);
    } else {
      this._isResetting = false;
    }
  }

  // Add special handling for font family dropdown
  _fixFontFamilyAfterReset() {
    const fontFamilyDropdown = document.querySelector(
      '[data-path="theme.typography.fontFamily"]',
    );
    if (fontFamilyDropdown) {
      const value = this._stateManager.getValue("theme.typography.fontFamily");
      if (value) {
        // Find matching option and select it
        Array.from(fontFamilyDropdown.options).forEach((option) => {
          if (option.value === value) {
            fontFamilyDropdown.value = value;
            fontFamilyDropdown.dispatchEvent(new Event("change"));
          }
        });
      }
    }
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
    const topControl = topInput?.closest(".setting-item");
    const rightControl = rightInput?.closest(".setting-item");
    const leftControl = leftInput?.closest(".setting-item");
    const bottomControl = bottomInput?.closest(".setting-item");

    // Hide all by default
    [topControl, rightControl, leftControl, bottomControl].forEach((control) => {
      if (control) control.style.display = "none";
    });

    // Update state based on the preset
    const state = this._stateManager.getState();
    if (!state.searchBar) state.searchBar = {};
    if (!state.searchBar.position) state.searchBar.position = {};

    // Set all to null first to avoid conflicts
    state.searchBar.position.top = null;
    state.searchBar.position.right = null;
    state.searchBar.position.left = null;
    state.searchBar.position.bottom = null;

    // Show relevant controls and update state based on preset
    switch (preset) {
      case "top-left":
        if (topControl) topControl.style.display = "";
        if (leftControl) leftControl.style.display = "";

        state.searchBar.position.top = 70;
        state.searchBar.position.left = 70;
        break;

      case "top-right":
        if (topControl) topControl.style.display = "";
        if (rightControl) rightControl.style.display = "";

        state.searchBar.position.top = 70;
        state.searchBar.position.right = 70;
        break;

      case "top-center":
        if (topControl) topControl.style.display = "";

        state.searchBar.position.top = 70;
        state.searchBar.position.left = "50%";
        break;

      case "bottom-left":
        if (bottomControl) bottomControl.style.display = "";
        if (leftControl) leftControl.style.display = "";

        state.searchBar.position.bottom = 70;
        state.searchBar.position.left = 70;
        break;

      case "bottom-right":
        if (bottomControl) bottomControl.style.display = "";
        if (rightControl) rightControl.style.display = "";

        state.searchBar.position.bottom = 70;
        state.searchBar.position.right = 70;
        break;

      case "center":
        state.searchBar.position.top = "50%";
        state.searchBar.position.left = "50%";
        break;

      case "custom":
        // For custom, use whatever values are provided
        [topControl, rightControl, leftControl, bottomControl].forEach((control) => {
          if (control) control.style.display = "";
        });
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
    console.info("[UIManager] Setting up tabs");
    const tabs = document.querySelectorAll(".tab");

    // Ensure tab scroll positions container exists
    if (!this._stateManager._tabScrollPositions) {
      this._stateManager._tabScrollPositions = new Map();
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        try {
          // Save scroll position of current tab
          const currentTabContent = document.querySelector(
            ".tab-content.active",
          );
          if (currentTabContent) {
            this._stateManager.saveTabScrollPosition(
              this._activeTab,
              currentTabContent.scrollTop,
            );
          }

          // Remove active class from all tabs
          tabs.forEach((t) => t.classList.remove("active"));

          // Hide all tab contents
          document.querySelectorAll(".tab-content").forEach((content) => {
            content.classList.remove("active");
          });

          // Activate clicked tab
          tab.classList.add("active");

          // Show corresponding tab content
          const tabId = tab.dataset.tab;
          const tabContent = document.getElementById(`${tabId}-tab`);

          if (tabContent) {
            tabContent.classList.add("active");

            // Restore scroll position
            const savedPosition =
              this._stateManager.getTabScrollPosition(tabId);
            if (savedPosition) {
              tabContent.scrollTop = savedPosition;
            }

            // Update active tab
            this._activeTab = tabId;
          }
        } catch (error) {
          console.error("[UIManager] Error in tab click handler:", error);

          const suggestionPrompt = `
                    [SearchPro Error Debugging Request]
                    - Error Message: ${error.message}
                    - Stack Trace: ${error.stack}
                    - Context: UIManager ➔ Tab Click Handler
                    - URL: ${window.location.href}
                    - User Agent: ${navigator.userAgent}
                    ➔ Suggest possible causes and fixes:
                    `;
          console.log(suggestionPrompt);
        }
      });
    });
  }

  _setupControl(input) {
    // Remove any existing listeners first by cloning and replacing
    const originalElement = input;
    const clonedElement = originalElement.cloneNode(true);
    if (originalElement.parentNode) {
        originalElement.parentNode.replaceChild(clonedElement, originalElement);
        input = clonedElement; // Important: Update the input reference to the clone
    }

    const path = input.dataset.path;
    this._controlMap.set(path, input);

    // Set up event listeners based on input type
    if (input.type === "checkbox") {
        input.addEventListener("change", () => {
            const value = Boolean(input.checked);
            this._stateManager.setState(value, path);
            this._schedulePreviewUpdate(true);
        });
    } else if (input.type === "color") {
        // Update on 'input' for real-time preview during color selection
        input.addEventListener("input", () => {
            const value = input.value;
            
            // Validate hex color format
            if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                this._stateManager.setState(value, path);
                
                // Update the preview in real-time
                this._schedulePreviewUpdate(true);
                
                // Update linked text input if exists
                const textInput = document.getElementById(`${input.id}Text`);
                if (textInput) {
                    textInput.value = value;
                }
            } else {
                console.warn(`[UIManager] Invalid color format: ${value}. Expected format: #RRGGBB`);
                // Don't update state for invalid colors, but still update linked text
                const textInput = document.getElementById(`${input.id}Text`);
                if (textInput) {
                    textInput.value = value;
                }
            }
        });

        // Also keep the 'change' event for final color selection
        input.addEventListener("change", () => {
            const value = input.value;
            
            // Validate hex color format
            if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                this._stateManager.setState(value, path);
                this._updatePreview(true);
            } else {
                console.warn(`[UIManager] Invalid color format: ${value}. Expected format: #RRGGBB`);
                
                // Try to fix the color or revert to the current state value
                const currentValue = this._stateManager.getValue(path);
                if (currentValue && /^#[0-9A-Fa-f]{6}$/.test(currentValue)) {
                    // Revert to current valid value
                    input.value = currentValue;
                    
                    // Update linked text input if exists
                    const textInput = document.getElementById(`${input.id}Text`);
                    if (textInput) {
                        textInput.value = currentValue;
                    }
                } else {
                    // Use a default fallback color if no valid current value
                    const fallbackColor = "#000000";
                    input.value = fallbackColor;
                    this._stateManager.setState(fallbackColor, path);
                    
                    // Update linked text input if exists
                    const textInput = document.getElementById(`${input.id}Text`);
                    if (textInput) {
                        textInput.value = fallbackColor;
                    }
                }
                
                this._updatePreview(true);
            }
        });
    } else if (input.type === "number") {
        input.addEventListener("change", () => {
            const value = parseFloat(input.value);
            if (!isNaN(value)) {
                this._stateManager.setState(value, path);
                this._schedulePreviewUpdate(true);
            }
        });
    } else if (input.type === "range") {
        input.addEventListener("input", () => {
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

                this._schedulePreviewUpdate(true);
            }
        });
    } else if (input.tagName === "SELECT") {
        input.addEventListener("change", () => {
            let value = input.value;

            // Handle special value types
            if (value === "true") value = true;
            else if (value === "false") value = false;
            else if (value === "null") value = null;
            else if (
                value !== "" &&
                !isNaN(parseFloat(value)) &&
                value.trim() !== ""
            ) {
                value = parseFloat(value);
            }

            this._stateManager.setState(value, path);

            // Special handling for position preset
            if (path === "searchBar.positionPreset") {
                this.handlePositionPresetChange(value);
            } else {
              this._schedulePreviewUpdate(true);
            }
        });
    } else {
        input.addEventListener("change", () => {
            this._stateManager.setState(input.value, path);
            this._schedulePreviewUpdate(true);
        });
    }
}

  /**
   * Set up linked controls (like color inputs and their hex text fields)
   * @param {HTMLElement} input The input element to set up
   * @private
   */
  _setupLinkedControl(input) {
    // Remove any existing listeners first by cloning and replacing
    const originalElement = input;
    const clonedElement = originalElement.cloneNode(true);
    if (originalElement.parentNode) {
      originalElement.parentNode.replaceChild(clonedElement, originalElement);
      input = clonedElement; // Important: Update the input reference to the clone
    }

    const linkedId = input.dataset.linked;
    const linkedInput = document.getElementById(linkedId);

    if (linkedInput) {
      // Update text input when color changes
      if (input.type === "color" && linkedInput.type === "text") {
        input.addEventListener("input", () => {
          linkedInput.value = input.value;
        });

        // Update color when text changes
        linkedInput.addEventListener("change", () => {
          const hexColor = linkedInput.value.trim();
          if (/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
            input.value = hexColor;

            // Trigger change event to update state and preview
            const event = new Event("change", { bubbles: true });
            input.dispatchEvent(event);
          }
        });
      }
    }
  }

  /**
   * Step 3: Fix the setupActionButtons method to prevent duplicate handlers
   * (Replace or extend UIManager._setupActionButtons)
   */
  // Extend UIManager.prototype._setupActionButtons
  _setupActionButtons(forceClean = false) {
    console.info(
      "[UIManager] Setting up action buttons" +
        (forceClean ? " (forced clean)" : ""),
    );

    // Clean buttons if forced
    if (forceClean) {
      this._cleanActionButtons();
    }

    // Save Settings
    const saveButton = document.getElementById("saveSettings");
    if (saveButton) {
      saveButton.addEventListener("click", () => this._handleSaveClick());
    }

    // Apply Settings
    const applyButton = document.getElementById("applySettings");
    if (applyButton) {
      applyButton.addEventListener("click", () => this._handleApplyClick());
    }

    // Reset Settings
    const resetButton = document.getElementById("resetSettings");
    if (resetButton) {
      resetButton.addEventListener("click", () => this._handleResetClick());
    }

    // Export Settings
    const exportButton = document.getElementById("exportSettings");
    if (exportButton) {
      exportButton.addEventListener("click", () => this.exportSettings());
    }

    // Export for Server
    const exportServerButton = document.getElementById("exportForServer");
    if (exportServerButton) {
      exportServerButton.addEventListener("click", () =>
        this.exportForServer(),
      );
    }

    // Import Settings - FIX HERE
    const importButton = document.getElementById("importButton");

    // Check if the hidden file input exists, create if not
    let importFile = document.getElementById("importFile");
    if (!importFile) {
      importFile = document.createElement("input");
      importFile.type = "file";
      importFile.id = "importFile";
      importFile.accept = ".json";
      importFile.style.display = "none";
      document.body.appendChild(importFile);
      console.info("[UIManager] Created missing import file input");
    }

    if (importButton) {
      // Clean the existing listener
      const importButtonClone = importButton.cloneNode(true);
      if (importButton.parentNode) {
        importButton.parentNode.replaceChild(importButtonClone, importButton);
      }

      // Add new clean handler
      document.getElementById("importButton").addEventListener("click", () => {
        console.info("[UIManager] Import button clicked");
        importFile.click();
      });
    }

    if (importFile) {
      // Clean the existing listener
      const importFileClone = importFile.cloneNode(true);
      if (importFile.parentNode) {
        importFile.parentNode.replaceChild(importFileClone, importFile);
      }

      // Add new clean handler
      document
        .getElementById("importFile")
        .addEventListener("change", (event) => {
          console.info("[UIManager] File selected for import");
          const file = event.target.files[0];
          if (!file) {
            this.showNotification("No file selected", "error");
            return;
          }

          // Validate file type
          if (
            !file.name.endsWith(".json") &&
            file.type !== "application/json"
          ) {
            this.showNotification("Please select a JSON file", "error");
            event.target.value = "";
            return;
          }

          const reader = new FileReader();

          reader.onload = (e) => {
            try {
              const parsed = JSON.parse(e.target.result);

              // Validate the imported data
              const result = this._storageManager.validateImport
                ? this._storageManager.validateImport(parsed)
                : {
                    valid: true,
                    settings: parsed.settings || parsed,
                    warnings: [],
                  };

              if (result.valid && result.settings) {
                // Apply the settings to state
                const success = this._stateManager.setState(result.settings);

                if (success) {
                  // Update UI controls
                  this.applyStateToControls(true);

                  // Update preview
                  this._updatePreview(true);

                  // Save to localStorage
                  this._storageManager.save(result.settings);

                  // Show success notification
                  this.showNotification(
                    "Settings imported successfully",
                    "success",
                  );

                  // If we have warnings, show them
                  if (result.warnings && result.warnings.length > 0) {
                    console.warn(
                      "[UIManager] Import warnings:",
                      result.warnings,
                    );
                    this.showNotification(
                      `Some issues were detected during import`,
                      "warning",
                    );
                  }
                } else {
                  this.showNotification(
                    "Failed to apply imported settings",
                    "error",
                  );
                }
              } else {
                // Show error notification
                this.showNotification(
                  "Import failed: Invalid config structure",
                  "error",
                );

                // Log errors and warnings
                if (result.errors && result.errors.length > 0) {
                  console.error("[UIManager] Import errors:", result.errors);
                }

                if (result.warnings && result.warnings.length > 0) {
                  console.warn("[UIManager] Import warnings:", result.warnings);
                }
              }
            } catch (error) {
              console.error("[UIManager] Import parse error:", error);
              this.showNotification(`Import failed: ${error.message}`, "error");

              const suggestionPrompt = `
                        [SearchPro Error Debugging Request]
                        - Error Message: ${error.message}
                        - Stack Trace: ${error.stack}
                        - Context: UIManager ➔ Import Parse Error
                        - URL: ${window.location.href}
                        - User Agent: ${navigator.userAgent}
                        ➔ Suggest possible causes and fixes:
                        `;
              console.log(suggestionPrompt);
            } finally {
              // Always reset the file input
              event.target.value = "";
            }
          };

          reader.onerror = () => {
            this.showNotification("Failed to read the file", "error");
            event.target.value = "";
          };

          // Start reading the file
          reader.readAsText(file);
        });
    } else {
      console.error("[UIManager] Import file input not found in DOM");
    }
  }

  // Add a new method to clean button events
  _cleanActionButtons() {
    const buttons = [
      { id: "applySettings", handler: this._handleApplyClick.bind(this) },
      { id: "saveSettings", handler: this._handleSaveClick.bind(this) },
      { id: "resetSettings", handler: this._handleResetClick.bind(this) },
      { id: "exportSettings", handler: this.exportSettings.bind(this) },
      { id: "exportForServer", handler: this.exportForServer.bind(this) },
    ];

    // Clone and replace each button to remove all handlers
    buttons.forEach((btn) => {
      const button = document.getElementById(btn.id);
      if (button) {
        const clone = button.cloneNode(true);
        if (button.parentNode) {
          button.parentNode.replaceChild(clone, button);
        }
      }
    });
  }

  _loadState() {
    // Try to load from localStorage
    const savedState = this._storageManager.load();

    if (savedState) {
      this._stateManager.setState(savedState);
    } else {
      // If no saved state, try to load default settings
      if (typeof window.getDefaultSettings === "function") {
        const defaults = window.getDefaultSettings();
        this._stateManager.setState(defaults);
      }
    }

    // Apply state to UI controls
    this.applyStateToControls();

    // Update preview with initial state
    this._schedulePreviewUpdate(true);

    // Subscribe to state changes
    this._stateManager.subscribe(() => {
      // Nothing needed here since controls are updated directly
    });
  }

  applyStateToControls(forceEvents = false) {
    console.info(
      "[UIManager] Applying state to controls" +
        (forceEvents ? " (with forced events)" : ""),
    );

    const state = this._stateManager.getState();

    // Update each control with value from state
    this._controlMap.forEach((control, path) => {
      const value = this.getValueFromPath(state, path);

      if (value !== undefined) {
        if (control.type === "checkbox") {
          control.checked = Boolean(value);
          if (forceEvents) {
            control.dispatchEvent(new Event("change", { bubbles: true }));
          }
        } else if (control.type === "color") {
          control.value = value;

          // Update linked text input if exists
          const textInput = document.getElementById(`${control.id}Text`);
          if (textInput) {
            textInput.value = value;
          }

          if (forceEvents) {
            control.dispatchEvent(new Event("input", { bubbles: true }));
            control.dispatchEvent(new Event("change", { bubbles: true }));
          }
        } else if (control.tagName === "SELECT") {
          // Handle boolean and null values in selects
          if (value === true) control.value = "true";
          else if (value === false) control.value = "false";
          else if (value === null) control.value = "";
          else control.value = String(value);

          if (forceEvents) {
            control.dispatchEvent(new Event("change", { bubbles: true }));
          }
        } else if (control.type === "range") {
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
            control.dispatchEvent(new Event("input", { bubbles: true }));
            control.dispatchEvent(new Event("change", { bubbles: true }));
          }
        } else {
          control.value = value;

          if (forceEvents) {
            control.dispatchEvent(new Event("input", { bubbles: true }));
            control.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
      }
    });

    // Force update of preview to ensure all visual elements are updated
    this._updatePreview(true);
  }

  getValueFromPath(obj, path) {
    const parts = path.split(".");
    let current = obj;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }
  getValueFromPath(obj, path) {
    const parts = path.split(".");
    let current = obj;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Get icon HTML for an element type
   * @param {string} type The element type
   * @returns {string} Icon HTML
   * @private
   */
  _getIconForType(type) {
    // Simple circle placeholder for preview items
    return `<div class="preview-result-icon-inner"></div>`;
  }

  _setupPreview() {
    const previewRoot = document.querySelector("#layoutPreview");
    if (!previewRoot) {
      console.warn("[UIManager] Preview root element not found");
      return;
    }

    this.preview = previewRoot;
    this.previewSearchField = previewRoot.querySelector(
      ".preview-search-field",
    );
    this.previewSearchInput = previewRoot.querySelector(
      ".preview-search-input",
    );
    this.previewResultsPanel = previewRoot.querySelector(
      ".preview-results-panel",
    );

    // Get the results container
    const resultsContainer = previewRoot.querySelector(".preview-results-list");
    if (resultsContainer) {
      // Clear existing results
      resultsContainer.innerHTML = "";

      // Create sample results with tags
      const sampleResults = [
        {
          title: "Living Room Panorama",
          subtitle: "Main floor",
          type: "Panorama",
          tags: ["main", "living", "panorama"],
        },
        {
          title: "Kitchen Hotspot",
          subtitle: "Appliances",
          type: "Hotspot",
          tags: ["kitchen", "appliances"],
        },
        {
          title: "Bedroom Light",
          subtitle: "Master suite",
          type: "Polygon",
          tags: ["bedroom", "lighting"],
        },
      ];

      // Get current state for tag visibility - standard path
      const state = this._stateManager.getState();
      const showTags = state.content?.showTagsInResults !== false; // Use content path consistently

      // Create the preview result items
      sampleResults.forEach((result) => {
        const resultItem = document.createElement("div");
        resultItem.className = "preview-result-item";

        // Process tags with fallback for null/undefined
        const tagArray = Array.isArray(result.tags) ? result.tags : [];
        const tagText = tagArray.length > 0 ? tagArray.join(", ") : "";

        // IMPORTANT: Always create tag elements with explicit display style
        resultItem.innerHTML = `
                    <div class="preview-result-icon">${this._getIconForType(result.type)}</div>
                    <div class="preview-result-content">
                      <div class="preview-result-text">${result.title}</div>
                      <div class="preview-result-tags" style="display: ${showTags ? "block" : "none"}" data-has-tags="true">
                        Tags: ${tagText}
                      </div>
                      <div class="preview-result-description">${result.subtitle}</div>
                    </div>
                `;

        resultsContainer.appendChild(resultItem);
      });
    }

    // Store references to result items
    this.previewResultItems = Array.from(
      previewRoot.querySelectorAll(".preview-result-item"),
    );
    this.previewGroupHeaders = Array.from(
      previewRoot.querySelectorAll(".preview-group-header"),
    );

    // Update with initial placeholder if available
    const state = this._stateManager.getState();
    if (state.searchBar?.placeholder && this.previewSearchInput) {
      this.previewSearchInput.placeholder = state.searchBar.placeholder;
    }

    // Apply initial state to preview after setup
    this._updatePreview(true);

    // Mark preview as initialized to prevent duplicate setup
    this._previewInitialized = true;

    console.info("[UIManager] Preview setup completed after state loading");
  }

  /**
   * Create a CSS stylesheet with all color variables
   * @param {Object} colors The color settings object
   * @returns {string} Complete CSS with all color variables
   * @private
   */
  /**
   * Create a CSS stylesheet with all color variables
   * @param {Object} colors The color settings object
   * @returns {string} Complete CSS with all color variables
   * @private
   */
  _createColorStyles(colors = {}) {
    // Define fallback colors
    const defaultColors = {
      searchBackground: "#ffffff",
      searchText: "#1a1a1a",
      placeholderText: "#64748b",
      searchIcon: "#64748b",
      clearIcon: "#64748b",
      resultsBackground: "#ffffff",
      groupHeaderColor: "#475569",
      groupCountColor: "#94a3b8",
      resultHover: "#f1f5f9",
      resultBorderLeft: "#3b82f6",
      resultText: "#1e293b",
      resultSubtextColor: "#64748b",
      resultIconColor: "#6e85f7",
      tagTextColor: "#64748b",
    };

    const mergedColors = { ...defaultColors, ...colors };
    const tagColor = mergedColors.tagTextColor || "#64748b";

    // Create direct tag color declarations separate from variables
    const directTagStyles = `
        /* ===== DIRECT TAG COLOR DECLARATIONS ===== */
        .result-tags,
        #searchContainer .result-tags,
        #layoutPreview .preview-result-tags,
        .preview-result-tags {
          color: ${tagColor} !important;
        }
        
        .result-tags *,
        #searchContainer .result-tags *,
        #layoutPreview .preview-result-tags *,
        .preview-result-tags * {
          color: ${tagColor} !important;
        }
      `;

      return `
      /* Root color variables */
      :root, #searchContainer, #layoutPreview {
        --search-background: ${mergedColors.searchBackground};
        --search-text: ${mergedColors.searchText};
        --placeholder-text: ${mergedColors.placeholderText};
        --search-icon: ${mergedColors.searchIcon};
        --clear-icon: ${mergedColors.clearIcon};
        --results-background: ${mergedColors.resultsBackground};
        --group-header-color: ${mergedColors.groupHeaderColor};
        --group-count-color: ${mergedColors.groupCountColor};
        --result-hover: ${mergedColors.resultHover};
        --result-border-left: ${mergedColors.resultBorderLeft};
        --result-text: ${mergedColors.resultText};
        --result-subtext-color: ${mergedColors.resultSubtextColor};
        --result-icon-color: ${mergedColors.resultIconColor};
        --tag-text-color: ${tagColor};
      }
      
      /* High specificity tag styling for preview */
      #layoutPreview .preview-result-tags,
      .preview-result-tags {
        color: ${tagColor} !important;
        font-size: 0.85em;
        margin-top: 2px;
      }
      
      /* High specificity tag styling for search results */
      #searchContainer .result-tags,
      .result-tags {
        color: ${tagColor} !important;
        font-size: 0.85em;
        margin-top: 2px;
      }
      
      /* Make sure all tag children inherit the color */
      #searchContainer .result-tags *,
      #layoutPreview .preview-result-tags *,
      .result-tags * {
        color: ${tagColor} !important;
      }

      /* Style for highlighted text within tags */
      #searchContainer .result-tags mark,
      #layoutPreview .preview-result-tags mark,
      .result-tags mark {
        color: ${tagColor} !important;
        background-color: rgba(250, 204, 21, 0.2);
        padding: 0 2px;
        border-radius: 2px;
      }
        
        ${directTagStyles}
        
        /* Direct tag styling with !important */
        #searchContainer .result-tags { color: ${tagColor} !important; }
        #searchContainer .result-tags * { color: ${tagColor} !important; }
        #layoutPreview .preview-result-tags { color: ${tagColor} !important; }
        #layoutPreview .preview-result-tags * { color: ${tagColor} !important; }
    
        /* Preview tag colors */
        #layoutPreview .preview-result-tags {
          color: var(--tag-text-color, ${mergedColors.tagTextColor}) !important;
          font-size: 12px;
          margin-top: 2px;
          word-break: break-word;
        }
    
        /* Tag and mark colors in both preview and live tour */
        #searchContainer .result-tags,
        #layoutPreview .preview-result-tags,
        .result-tags {
          color: var(--tag-text-color, ${mergedColors.tagTextColor}) !important;
        }
    
        .result-tags *:not(mark),
        .result-tags mark * {
          color: inherit !important;
        }
    
        #searchContainer .result-tags mark,
        #layoutPreview .preview-result-tags mark {
          color: inherit !important;
          background-color: rgba(250, 204, 21, 0.2) !important;
          font-weight: 500 !important;
          padding: 0 2px !important;
          border-radius: 2px !important;
        }
    
        /* Direct tag styling with highest specificity */
        #searchContainer .result-tags,
        #searchContainer .result-tags *:not(mark),
        #searchContainer [class*="tag-"],
        #searchContainer .tag-text-container {
          color: var(--tag-text-color, ${mergedColors.tagTextColor}) !important;
        }
    
        /* Result subtext */
        #searchContainer .result-subtext,
        #searchContainer .result-subtitle,
        #searchContainer .result-description {
          color: var(--result-subtext-color, ${mergedColors.resultSubtextColor}) !important;
        }
    
        /* Preview styling */
        #layoutPreview .preview-result-description,
        #layoutPreview .result-description,
        #layoutPreview .result-subtitle,
        #layoutPreview .result-subtext {
          color: var(--result-subtext-color, ${mergedColors.resultSubtextColor}) !important;
        }
    
        #layoutPreview .preview-result-text {
          color: var(--result-text, ${mergedColors.resultText}) !important;
        }
    
        #layoutPreview .preview-group-title {
          color: var(--group-header-color, ${mergedColors.groupHeaderColor}) !important;
        }
    
        #layoutPreview .preview-group-count {
          color: var(--group-count-color, ${mergedColors.groupCountColor}) !important;
        }
    
        #layoutPreview .preview-result-icon {
          background-color: var(--result-icon-color, ${mergedColors.resultIconColor}) !important;
        }
    
        #layoutPreview .preview-search-icon svg {
          color: var(--search-icon, ${mergedColors.searchIcon}) !important;
        }
      `;
  }

  _updatePreview(forceFullRefresh = false) {
    if (!this.preview) return;

    // Safely remove position preview element if it exists
    const positionPreview = document.querySelector(
      ".position-preview, #positionPreview",
    );
    if (positionPreview && positionPreview.parentNode) {
      console.info("[UIManager] Removing unnecessary position preview element");
      positionPreview.parentNode.removeChild(positionPreview);
    }

    const state = this._stateManager.getState();

    // Update search width
    const searchWidth = state.appearance?.searchWidth || 350;
    this.preview.style.width = `${Math.min(searchWidth, 500)}px`;

    // Update max height for results
    const maxHeight = state.appearance?.searchResults?.maxHeight || 500;
    if (this.previewResultsPanel) {
      this.previewResultsPanel.style.maxHeight = `${maxHeight}px`;
    }

    // Update theme (light/dark)
    this.preview.classList.remove("preview-dark-mode", "preview-light-mode");
    if (state.theme?.useDarkMode === true) {
      this.preview.classList.add("preview-dark-mode");
    } else if (state.theme?.useDarkMode === false) {
      this.preview.classList.add("preview-light-mode");
    }

    // Update typography - ensure font family is applied
    if (state.theme?.typography || forceFullRefresh) {
      const typography = state.theme?.typography || {};

      if (typography.fontFamily) {
        this.preview.style.fontFamily = typography.fontFamily;
        this.preview.style.fontWeight = typography.fontWeight || "normal";
        this.preview.style.fontStyle = typography.fontStyle || "normal";
        this.preview.style.fontVariant = typography.fontVariant || "normal";
        this.preview.style.fontSize = typography.fontSize
          ? `${typography.fontSize}px`
          : "inherit";
        this.preview.style.letterSpacing = typography.letterSpacing
          ? `${typography.letterSpacing}px`
          : "inherit";
        this.preview.style.lineHeight = typography.lineHeight
          ? `${typography.lineHeight}px`
          : "inherit";
        this.preview.style.textTransform = typography.textTransform || "none";
        this.preview.style.textDecoration = typography.textDecoration || "none";
        this.preview.style.fontStretch = typography.fontStretch || "normal";
        this.preview.style.fontSynthesis = typography.fontSynthesis || "none";
        this.preview.style.fontSizeAdjust = typography.fontSizeAdjust || "none";
        this.preview.style.fontKerning = typography.fontKerning || "auto";
        this.preview.style.fontFeatureSettings =
          typography.fontFeatureSettings || "normal";
        this.preview.style.fontLanguageOverride =
          typography.fontLanguageOverride || "normal";
        this.preview.style.fontVariantLigatures =
          typography.fontVariantLigatures || "normal";
        this.preview.style.fontVariantCaps =
          typography.fontVariantCaps || "normal"; // Added for completeness
        this.preview.style.fontVariantNumeric =
          typography.fontVariantNumeric || "normal"; // Added for completeness
        this.preview.style.fontVariantEastAsian =
          typography.fontVariantEastAsian || "normal"; // Added for completeness
        this.preview.style.fontVariantPosition =
          typography.fontVariantPosition || "normal"; // Added for completeness
        this.preview.style.fontVariantAlternates =
          typography.fontVariantAlternates || "normal"; // Added for completeness
        this.preview.style.fontVariantLigatures =
          typography.fontVariantLigatures || "normal"; // Added for completeness

        // Apply to specific elements to ensure inheritance
        if (this.preview.querySelectorAll) {
          const textElements = this.preview.querySelectorAll('.preview-result-text, .preview-result-description, .preview-result-tags');
          if (textElements && textElements.length > 0) {
            textElements.forEach(el => {
              if (el) {
                el.style.fontFamily = typography.fontFamily;
                // Also apply other critical typography settings
                if (typography.fontSize) {
                  el.style.fontSize = `${typography.fontSize}px`;
                }
                if (typography.letterSpacing) {
                  el.style.letterSpacing = `${typography.letterSpacing}px`;
                }
              }
            });
          }
        }

        // Also update font preview if it exists
        const fontPreview = document.getElementById("fontPreview");
        if (fontPreview) {
          fontPreview.style.fontFamily = typography.fontFamily;
        }
      }

      if (typography.fontSize) {
        this.preview.style.fontSize = `${typography.fontSize}px`;

        // Also update font preview if it exists
        const fontPreview = document.getElementById("fontPreview");
        if (fontPreview) {
          fontPreview.style.fontSize = `${typography.fontSize}px`;
        }
      }

      if (typography.letterSpacing) {
        this.preview.style.letterSpacing = `${typography.letterSpacing}px`;

        // Also update font preview if it exists
        const fontPreview = document.getElementById("fontPreview");
        if (fontPreview) {
          fontPreview.style.letterSpacing = `${typography.letterSpacing}px`;
        }
      }
    }

    // Update placeholder text
    if (this.previewSearchInput) {
      this.previewSearchInput.placeholder =
        state.searchBar?.placeholder || "Search...";
    }

    // Update border radius with explicit defaults if not present
    if (this.previewSearchField) {
      const searchFieldRadius = state.appearance?.searchField?.borderRadius || {
        topLeft: 35,
        topRight: 35,
        bottomRight: 35,
        bottomLeft: 35,
      };

      this.previewSearchField.style.borderTopLeftRadius = `${searchFieldRadius.topLeft}px`;
      this.previewSearchField.style.borderTopRightRadius = `${searchFieldRadius.topRight}px`;
      this.previewSearchField.style.borderBottomRightRadius = `${searchFieldRadius.bottomRight}px`;
      this.previewSearchField.style.borderBottomLeftRadius = `${searchFieldRadius.bottomLeft}px`;
    }

    // Update colors - more thorough with fallbacks
    if (state.appearance?.colors || forceFullRefresh) {
      // ===== ADD THIS CODE: CLEANUP OLD STYLE ELEMENTS =====
      // Clean up old style elements before creating new ones
      const oldStyles = document.querySelectorAll('style[id^="preview-"]');
      oldStyles.forEach(el => {
        // Only remove if we're about to recreate it
        if (["preview-color-styles", "preview-hover-styles", "preview-tag-styles"].includes(el.id)) {
          console.info(`[UIManager] Removing old style element: ${el.id}`);
          el.remove();
        }
      });

      // Apply color styles to preview elements
      const colors = state.appearance.colors;

      // Create a style element for dynamic color application
      let styleElement = document.getElementById("preview-color-styles");
      if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = "preview-color-styles";
        document.head.appendChild(styleElement);
      }

      // Generate CSS for all colors
      const cssRules = this._createColorStyles(colors);
      styleElement.textContent = cssRules;

      // Apply direct styles to preview elements
      if (this.previewSearchField) {
        this.previewSearchField.style.backgroundColor =
          colors.searchBackground || "#ffffff";
      }

      if (this.previewSearchInput) {
        this.previewSearchInput.style.color = colors.searchText || "#1a1a1a";
      }

      if (this.previewResultsPanel) {
        this.previewResultsPanel.style.backgroundColor =
          colors.resultsBackground || "#ffffff";
      }

      // Update all result items hover state with color variables
      if (this.previewResultItems) {
        const resultHoverColor = colors.resultHover || "#f1f5f9";
        const resultBorderLeftColor = colors.resultBorderLeft || "#3b82f6";

        // Add hover styles via CSS rule to avoid inline styles on hover
        const hoverRule = `
          #layoutPreview .preview-result-item:hover {
              background-color: ${resultHoverColor} !important;
              border-left-color: ${resultBorderLeftColor} !important;
          }`;

        // Add or update the hover rule
        let hoverStyleElement = document.getElementById("preview-hover-styles");
        if (!hoverStyleElement) {
          hoverStyleElement = document.createElement("style");
          hoverStyleElement.id = "preview-hover-styles";
          document.head.appendChild(hoverStyleElement);
        }
        hoverStyleElement.textContent = hoverRule;
      }

      // NEW: Create a dedicated tag styles element
      let tagStyleElement = document.getElementById("preview-tag-styles");
      if (!tagStyleElement) {
        tagStyleElement = document.createElement("style");
        tagStyleElement.id = "preview-tag-styles";
        document.head.appendChild(tagStyleElement);
      }

      // Set tag color with extremely high specificity
      const tagColor = colors.tagTextColor || "#64748b";
      document.documentElement.style.setProperty(
        "--tag-text-color",
        tagColor,
        "important",
      );
      document.body.style.setProperty(
        "--tag-text-color",
        tagColor,
        "important",
      );

      // Set tag-specific styles with high specificity
      tagStyleElement.textContent = `
          /* High-specificity tag styling */
          html body #searchContainer .result-tags,
          html body #searchContainer .result-item .result-tags,
          html body #searchContainer .result-content .result-tags,
          html body .result-tags[class] {
              color: ${tagColor} !important;
              font-size: 0.85em !important;
              word-break: break-word !important;
          }
          
          html body #searchContainer .result-tags *,
          html body #searchContainer .result-item .result-tags *,
          html body #searchContainer .result-content .result-tags *,
          html body .result-tags[class] * {
              color: ${tagColor} !important;
          }
          
          html body #searchContainer .result-tags mark,
          html body #searchContainer .result-item .result-tags mark,
          html body #searchContainer .result-content .result-tags mark,
          html body .result-tags[class] mark {
              color: ${tagColor} !important;
              background-color: rgba(250, 204, 21, 0.2) !important;
              font-weight: 500 !important;
              padding: 0 2px !important;
              border-radius: 2px !important;
          }
          
          /* Add class-based selector for additional compatibility */
          .tag-text-override,
          .tag-text-override * {
              color: ${tagColor} !important;
          }
          
          /* Direct tag styling for preview elements */
          #layoutPreview .preview-result-tags {
              color: ${tagColor} !important;
          }
          
          #layoutPreview .preview-result-tags * {
              color: ${tagColor} !important;
          }
          
          /* Root CSS variable definition */
          :root {
              --tag-text-color: ${tagColor} !important;
          }
      `;

      // Force immediate style application via requestAnimationFrame
      requestAnimationFrame(() => {
        // Reapply styles to any dynamically added elements
        const lateTagElements = document.querySelectorAll(
          "#searchContainer .result-tags:not(.tag-color-applied)",
        );
        if (lateTagElements.length > 0) {
          lateTagElements.forEach((tag) => {
            tag.style.color = tagColor;
            tag.classList.add("tag-color-applied");
            tag.classList.add("tag-text-override");
          });
        }
      });

      console.info("[UIManager] Custom color styles applied to preview");
    }
  }

  /**
   * Updates the position preview based on the current state
   * @param {Object} state - The current state
   */
  updatePositionPreview(state) {
    // Get layout preview container in Font Preview section
    const fontPreview = document.getElementById("fontPreview");
    if (!fontPreview) return;

    // Create or get position preview
    let positionPreview = document.getElementById("positionPreview");
    if (!positionPreview) {
      positionPreview = document.createElement("div");
      positionPreview.id = "positionPreview";
      positionPreview.style.marginTop = "15px";
      positionPreview.style.padding = "10px";
      positionPreview.style.border = "1px solid var(--border-color)";
      positionPreview.style.borderRadius = "4px";
      positionPreview.style.position = "relative";
      positionPreview.style.height = "200px";
      positionPreview.style.backgroundColor = "rgba(0,0,0,0.1)";
      positionPreview.innerHTML =
        '<h3 style="margin-top:0;text-align:center;">Position Preview</h3>';

      // Create viewport representation
      const viewport = document.createElement("div");
      viewport.className = "position-viewport";
      viewport.style.position = "absolute";
      viewport.style.left = "5%";
      viewport.style.top = "40px";
      viewport.style.width = "90%";
      viewport.style.height = "calc(100% - 50px)";
      viewport.style.border = "2px dashed rgba(0,0,0,0.2)";
      viewport.style.boxSizing = "border-box";

      // Create search indicator
      const searchIndicator = document.createElement("div");
      searchIndicator.className = "position-search-indicator";
      searchIndicator.style.position = "absolute";
      searchIndicator.style.width = "60px";
      searchIndicator.style.height = "25px";
      searchIndicator.style.backgroundColor = "var(--primary-color)";
      searchIndicator.style.borderRadius = "12px";
      searchIndicator.style.zIndex = "2";
      searchIndicator.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";

      viewport.appendChild(searchIndicator);
      positionPreview.appendChild(viewport);
      fontPreview.appendChild(positionPreview);
    }

    // Get the viewport and search indicator elements
    const viewport = positionPreview.querySelector(".position-viewport");
    const searchIndicator = positionPreview.querySelector(
      ".position-search-indicator",
    );

    if (!viewport || !searchIndicator) return;

    // Get viewport dimensions
    const viewportRect = viewport.getBoundingClientRect();
    const viewportWidth = viewportRect.width;
    const viewportHeight = viewportRect.height;

    // Get position based on preset
    const preset = state.searchBar?.positionPreset || "top-right";
    const position = state.searchBar?.position || {};

    // Reset transform
    searchIndicator.style.transform = "none";

    // Position indicator based on preset
    switch (preset) {
      case "top-left":
        searchIndicator.style.top = `${Math.min((position.top || 10) / 5, 50)}px`;
        searchIndicator.style.left = `${Math.min((position.left || 10) / 5, 50)}px`;
        searchIndicator.style.right = "auto";
        searchIndicator.style.bottom = "auto";
        break;

      case "top-right":
        searchIndicator.style.top = `${Math.min((position.top || 10) / 5, 50)}px`;
        searchIndicator.style.right = `${Math.min((position.right || 10) / 5, 50)}px`;
        searchIndicator.style.left = "auto";
        searchIndicator.style.bottom = "auto";
        break;

      case "top-center":
        searchIndicator.style.top = `${Math.min((position.top || 10) / 5, 50)}px`;
        searchIndicator.style.left = "50%";
        searchIndicator.style.right = "auto";
        searchIndicator.style.bottom = "auto";
        searchIndicator.style.transform = "translateX(-50%)";
        break;

      case "bottom-left":
        searchIndicator.style.bottom = `${Math.min((position.bottom || 10) / 5, 50)}px`;
        searchIndicator.style.left = `${Math.min((position.left || 10) / 5, 50)}px`;
        searchIndicator.style.right = "auto";
        searchIndicator.style.top = "auto";
        break;

      case "bottom-right":
        searchIndicator.style.bottom = `${Math.min((position.bottom || 10) / 5, 50)}px`;
        searchIndicator.style.right = `${Math.min((position.right || 10) / 5, 50)}px`;
        searchIndicator.style.left = "auto";
        searchIndicator.style.top = "auto";
        break;

      case "center":
        searchIndicator.style.top = "50%";
        searchIndicator.style.left = "50%";
        searchIndicator.style.right = "auto";
        searchIndicator.style.bottom = "auto";
        searchIndicator.style.transform = "translate(-50%, -50%)";
        break;

      case "custom":
        // For custom, use whatever values are provided
        if (position.top !== null && position.top !== undefined) {
          searchIndicator.style.top = `${Math.min(position.top / 5, 80)}px`;
          searchIndicator.style.bottom = "auto";
        } else if (position.bottom !== null && position.bottom !== undefined) {
          searchIndicator.style.bottom = `${Math.min(position.bottom / 5, 80)}px`;
          searchIndicator.style.top = "auto";
        } else {
          searchIndicator.style.top = "10px";
          searchIndicator.style.bottom = "auto";
        }

        if (position.left !== null && position.left !== undefined) {
          searchIndicator.style.left = `${Math.min(position.left / 5, 80)}px`;
          searchIndicator.style.right = "auto";
        } else if (position.right !== null && position.right !== undefined) {
          searchIndicator.style.right = `${Math.min(position.right / 5, 80)}px`;
          searchIndicator.style.left = "auto";
        } else {
          searchIndicator.style.right = "10px";
          searchIndicator.style.left = "auto";
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
      let state = this._stateManager.getState();
      state = this._fixPositionConflicts(state); // Apply position validation
  
      const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "search-pro-config.json";
      document.body.appendChild(a);
      a.click();
  
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
  
      this.showNotification("Settings exported to file", "success");
    } catch (error) {
      console.error("[UIManager] Error exporting settings:", error);
      this.showNotification("Failed to export settings", "error");
  
      const suggestionPrompt = `
            [SearchPro Error Debugging Request]
            - Error Message: ${error.message}
            - Stack Trace: ${error.stack}
            - Context: UIManager ➔ Export Settings
            - URL: ${window.location.href}
            - User Agent: ${navigator.userAgent}
            ➔ Suggest possible causes and fixes:
            `;
      console.log(suggestionPrompt);
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
      let state = this._stateManager.getState();
      state = this._fixPositionConflicts(state); // Apply position validation
  
      // Create a server-ready config object
      const configForServer = {
        version: "2.0.0", // Use your actual schema version
        timestamp: new Date().toISOString(),
        meta: {
          generatedBy: "Search Pro Config Panel",
          warning: "DO NOT EDIT THIS FILE MANUALLY",
        },
        settings: state,
      };
  
      const jsonString = JSON.stringify(configForServer, null, 2);
  
      // Create download or show modal (existing implementation)
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "search-config.json";
      document.body.appendChild(a);
      a.click();
  
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
  
      this.showNotification("Server configuration exported", "success");
    } catch (err) {
      console.error("Export for server failed:", err);
      this.showNotification("Failed to export config", "error");
    }
  
    setTimeout(() => {
      this._isExportingForServer = false;
    }, 500);
  }
  
  // Add this helper method to sync UI values to state before export
  _syncUIToState() {
    // Collect all inputs with data-path attribute
    const inputs = document.querySelectorAll("[data-path]");
  
    inputs.forEach((input) => {
      const path = input.dataset.path;
      if (!path) return;
  
      let value;
  
      if (input.type === "checkbox") {
        value = input.checked;
      } else if (input.tagName === "SELECT") {
        value = input.value;
        // Convert special values
        if (value === "true") value = true;
        else if (value === "false") value = false;
        else if (value === "") value = null;
      } else if (input.type === "number") {
        value = parseFloat(input.value);
        if (isNaN(value)) value = 0;
      } else if (input.type === "range") {
        value = parseFloat(input.value);
        if (isNaN(value)) value = 0;
      } else {
        value = input.value;
      }
  
      // Update state with current input value
      this._stateManager.setState(value, path);
    });
  }

  /**
   * Fix position conflicts by ensuring only left OR right, top OR bottom is set
   * @param {Object} settings Settings object to fix
   * @returns {Object} Fixed settings object
   * @private
   */
  _fixPositionConflicts(settings) {
    if (!settings || !settings.searchBar || !settings.searchBar.position) {
      return settings;
    }

    // Clone settings to avoid modifying the original
    const fixed = JSON.parse(JSON.stringify(settings));

    // Fix desktop position conflicts
    const pos = fixed.searchBar.position;
    if (pos.left !== null && pos.right !== null) {
      console.warn(
        "[UIManager] Position conflict: both left and right set. Prioritizing right.",
      );
      pos.left = null;
    }

    if (pos.top !== null && pos.bottom !== null) {
      console.warn(
        "[UIManager] Position conflict: both top and bottom set. Prioritizing top.",
      );
      pos.bottom = null;
    }

    // Fix mobile position conflicts if they exist
    if (fixed.searchBar.mobilePosition) {
      const mobilePos = fixed.searchBar.mobilePosition;
      if (mobilePos.left !== null && mobilePos.right !== null) {
        console.warn(
          "[UIManager] Mobile position conflict: both left and right set. Prioritizing right.",
        );
        mobilePos.left = null;
      }

      if (mobilePos.top !== null && mobilePos.bottom !== null) {
        console.warn(
          "[UIManager] Mobile position conflict: both top and bottom set. Prioritizing top.",
        );
        mobilePos.bottom = null;
      }
    }

    return fixed;
  }

  /**
   * Apply settings directly to the tour DOM elements
   * @param {Object} settings Settings to apply
   * @private
   */
  _applyToTourDOM(settings) {
    if (!window.opener) {
      console.warn("[UIManager] No parent window to apply settings to");
      return;
    }

    try {
      // Fix any position conflicts before applying
      settings = this._fixPositionConflicts(settings);

      // Reference to the tour window
      const tourWindow = window.opener;

      // Find the search container
      const container = tourWindow.document.getElementById("searchContainer");
      if (!container) {
        console.warn("[UIManager] Search container not found in tour");
        return;
      }

      // Apply position settings
      const pos = settings.searchBar?.position || {};
      ["top", "right", "bottom", "left"].forEach((side) => {
        container.style[side] = pos[side] !== null ? `${pos[side]}px` : "";
      });

      // Apply placeholder text
      const input = container.querySelector("#tourSearch");
      if (input && settings.searchBar?.placeholder) {
        input.placeholder = settings.searchBar.placeholder;
      }

      // Apply custom colors via style injection
      if (settings.appearance?.colors) {
        const colors = settings.appearance.colors;

        // IMPORTANT: Ensure tag text color is available with a fallback
        const tagColor = colors.tagTextColor || "#64748b";

        // Apply CSS variables directly to :root for global scope
        const rootElement = tourWindow.document.documentElement;
        rootElement.style.setProperty(
          "--tag-text-color",
          tagColor,
          "important",
        );

        // Also apply directly to container and body for maximum compatibility
        container.style.setProperty("--tag-text-color", tagColor, "important");
        tourWindow.document.body.style.setProperty(
          "--tag-text-color",
          tagColor,
          "important",
        );

        // Remove existing style element if any
        let styleEl = tourWindow.document.getElementById(
          "search-pro-custom-styles",
        );
        if (styleEl) {
          styleEl.parentNode.removeChild(styleEl);
        }

        // Create new style element
        styleEl = tourWindow.document.createElement("style");
        styleEl.id = "search-pro-custom-styles";
        tourWindow.document.head.appendChild(styleEl);

        // Generate comprehensive CSS for color styling
        let cssContent = this._createColorStyles(colors);

        // Add additional CSS rules to fix tag text color in various contexts
        cssContent += `
        /* Additional rules to ensure proper tag text color rendering */
        #searchContainer .result-tags,
        #searchContainer .result-item .result-tags,
        #searchContainer .result-content .result-tags {
          color: ${tagColor} !important;
        }

        /* Fix child elements and highlighted text inside tags */
        #searchContainer .result-tags *,
        #searchContainer .result-tags mark,
        #searchContainer .result-tags mark * {
          color: ${tagColor} !important;
        }
        
        /* Enhanced tag styling for better consistency */
        #searchContainer .result-tags mark {
          background-color: rgba(250, 204, 21, 0.2) !important;
          font-weight: 500 !important;
          padding: 0 2px !important;
          border-radius: 2px !important;
        }
        
        /* Root-level custom property definition */
        :root {
          --tag-text-color: ${tagColor} !important;
        }
        
        /* Explicit global selector */
        html body .result-tags,
        html body #searchContainer .result-tags {
          color: ${tagColor} !important;
        }
      `;

        // Apply the complete CSS content
        styleEl.textContent = cssContent;

        // Apply CSS variables directly to container for better inheritance
        container.style.setProperty(
          "--result-icon-color",
          colors.resultIconColor || "#6e85f7",
          "important",
        );
        container.style.setProperty("--tag-text-color", tagColor, "important");

        // ENHANCED: Get all tag elements in the tour document and apply direct styling
        const tagElements = tourWindow.document.querySelectorAll(
          "#searchContainer .result-tags",
        );
        console.info(
          `[UIManager] Found ${tagElements.length} tag elements in tour DOM`,
        );

        if (tagElements.length > 0) {
          tagElements.forEach((tag) => {
            // Apply style directly to the element for maximum compatibility
            tag.style.setProperty("color", tagColor, "important");

            // Store original display value
            const originalDisplay = getComputedStyle(tag).display;

            // Handle mark tags with improved specificity
            const markTags = tag.querySelectorAll("mark");
            if (markTags.length > 0) {
              markTags.forEach((mark) => {
                // Set color to inherit with !important to ensure it inherits from parent
                mark.style.setProperty("color", tagColor, "important");
                // Add highlighting style
                mark.style.setProperty(
                  "background-color",
                  "rgba(250, 204, 21, 0.2)",
                  "important",
                );
              });
            }

            // Force redraw with display toggling
            tag.style.display = "none";
            void tag.offsetHeight; // Force reflow
            tag.style.display = originalDisplay;

            // Apply to all child elements for maximum compatibility
            const children = tag.querySelectorAll("*");
            children.forEach((child) => {
              child.style.setProperty("color", tagColor, "important");
            });

            // Mark as processed
            tag.classList.add("tag-color-applied");
            tag.setAttribute("data-color-applied", tagColor);
          });

          console.info(
            "[UIManager] Direct tag styling applied to tour DOM elements",
          );
        }

        // Create a separate style element dedicated to tags if not already present
        let tagStyleEl = tourWindow.document.getElementById(
          "search-pro-tag-styles",
        );
        if (!tagStyleEl) {
          tagStyleEl = tourWindow.document.createElement("style");
          tagStyleEl.id = "search-pro-tag-styles";
          tourWindow.document.head.appendChild(tagStyleEl);
        }

        // Set tag-specific styles with high specificity using direct color value
        tagStyleEl.textContent = `
        /* High-specificity tag styling with direct color */
        html body #searchContainer .result-tags,
        html body #searchContainer .result-item .result-tags,
        html body #searchContainer .result-content .result-tags,
        html body .result-tags[class] {
          font-size: 0.85em !important;
          color: ${tagColor} !important;
          word-break: break-word !important;
        }
        
        html body #searchContainer .result-tags *,
        html body #searchContainer .result-item .result-tags *,
        html body #searchContainer .result-content .result-tags *,
        html body .result-tags[class] * {
          color: ${tagColor} !important;
        }
        
        html body #searchContainer .result-tags mark,
        html body #searchContainer .result-item .result-tags mark,
        html body #searchContainer .result-content .result-tags mark,
        html body .result-tags[class] mark {
          color: ${tagColor} !important;
          background-color: rgba(250, 204, 21, 0.2) !important;
          font-weight: 500 !important;
          padding: 0 2px !important;
          border-radius: 2px !important;
        }
        
        /* Add class-based selector for dynamic elements that may be added later */
        .tag-text-override {
          color: ${tagColor} !important;
        }
        
        .tag-text-override * {
          color: ${tagColor} !important;
        }
     
      `;

        // Force immediate style application via requestAnimationFrame
        tourWindow.requestAnimationFrame(() => {
          // Reapply styles to any dynamically added elements
          const lateTagElements = tourWindow.document.querySelectorAll(
            "#searchContainer .result-tags:not(.tag-color-applied)",
          );
          if (lateTagElements.length > 0) {
            lateTagElements.forEach((tag) => {
              tag.style.color = tagColor;
              tag.classList.add("tag-color-applied");
              tag.classList.add("tag-text-override");
            });
          }
        });

        console.info(
          "[UIManager] Custom color styles applied to tour DOM with CSS variables and direct styling",
        );
      }

      console.info("[UIManager] Settings applied directly to tour DOM");
    } catch (error) {
      console.error("[UIManager] Error applying settings to tour DOM:", error);

      const suggestionPrompt = `
    [SearchPro Error Debugging Request]
    - Error Message: ${error.message}
    - Stack Trace: ${error.stack}
    - URL: ${window.location.href}
    - User Agent: ${navigator.userAgent}
    - Context: UIManager ➔ _applyToTourDOM
    ➔ Suggest possible causes and fixes:
    `;

      console.log(suggestionPrompt);
    }
  }

  /**
   * Import settings from a file
   * @param {File} file File to import
   */
  importSettings(file) {
    if (!file) {
      this.showNotification("No file selected", "error");
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

        if (!settingsObj || typeof settingsObj !== "object") {
          throw new Error("Invalid settings format: no settings object found");
        }

        // Fix position conflicts
        const fixedSettings = this._fixPositionConflicts(settingsObj);

        // Validate the imported data
        const result = this._storageManager.validateImport
          ? this._storageManager.validateImport(fixedSettings)
          : { valid: true, settings: fixedSettings, warnings: [] };

        if (result.valid && result.settings) {
          // Apply the settings to state
          const success = this._stateManager.setState(result.settings);

          if (success) {
            // Update UI with new settings
            this.applyStateToControls(true);

            // Update preview with all color settings including new ones
            this._updatePreview(true);

            // Save to localStorage
            this._storageManager.save(result.settings);

            // Apply to live tour immediately including all color settings
            this._applyToTourDOM(result.settings);

            this.showNotification("Settings imported successfully", "success");

            // Show warnings if any
            if (result.warnings && result.warnings.length > 0) {
              console.warn("[UIManager] Import warnings:", result.warnings);
              this.showNotification(
                `Some issues were detected with imported settings`,
                "warning",
              );
            }
          } else {
            this.showNotification(
              "Failed to apply imported settings to state",
              "error",
            );
          }
        } else {
          // Show error notification
          this.showNotification(
            "Import failed: Invalid config structure",
            "error",
          );

          // Log errors and warnings
          if (result.errors && result.errors.length > 0) {
            console.error("[UIManager] Import errors:", result.errors);
          }

          if (result.warnings && result.warnings.length > 0) {
            console.warn("[UIManager] Import warnings:", result.warnings);
          }
        }
      } catch (error) {
        console.error("[UIManager] Import failed:", error);
        this.showNotification("Import failed: " + error.message, "error");

        const suggestionPrompt = `
            [SearchPro Error Debugging Request]
            - Error Message: ${error.message}
            - Stack Trace: ${error.stack}
            - Context: UIManager ➔ Import Failed (General)
            - URL: ${window.location.href}
            - User Agent: ${navigator.userAgent}
            ➔ Suggest possible causes and fixes:
            `;
        console.log(suggestionPrompt);
      } finally {
        const importFile = document.getElementById("importFile");
        if (importFile) importFile.value = "";
        setTimeout(() => {
          this._isImporting = false;
        }, 500);
      }
    };

    reader.onerror = (e) => {
      this.showNotification("Failed to read import file", "error");
      this._isImporting = false;
    };

    reader.readAsText(file);
  }

  _checkIncognitoMode() {
    try {
      localStorage.setItem("testIncognito", "1");
      localStorage.removeItem("testIncognito");

      // Not in incognito mode
      const warning = document.getElementById("incognitoWarning");
      if (warning) {
        warning.style.display = "none";
      }
    } catch (e) {
      // In incognito mode
      const warning = document.getElementById("incognitoWarning");
      if (warning) {
        warning.style.display = "block";
      }
    }
  }

  showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.position = "fixed";
    notification.style.bottom = "20px";
    notification.style.right = "20px";
    notification.style.padding = "10px 20px";
    notification.style.backgroundColor =
      type === "success"
        ? "#10b981"
        : type === "warning"
          ? "#f59e0b"
          : type === "error"
            ? "#ef4444"
            : "#3b82f6";
    notification.style.color = "white";
    notification.style.borderRadius = "4px";
    notification.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
    notification.style.zIndex = "9999";
    notification.style.transition = "opacity 0.3s, transform 0.3s";
    notification.style.opacity = "0";
    notification.style.transform = "translateY(20px)";

    // Add to document
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.style.opacity = "1";
      notification.style.transform = "translateY(0)";
    }, 10);

    // Remove after delay
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateY(20px)";

      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  _setupActionButtons() {
    console.info("[UIManager] Setting up action buttons");

    // Clean up existing handlers first
    this._cleanupButtonHandlers();

    // Setup each button with clean handlers
    this._setupButton("applySettings", this._handleApplyClick.bind(this));
    this._setupButton("saveSettings", this._handleSaveClick.bind(this));
    this._setupButton("resetSettings", this._handleResetClick.bind(this));
    this._setupButton("exportSettings", this.exportSettings.bind(this));
    this._setupButton("exportForServer", this.exportForServer.bind(this));
    this._setupButton("importButton", () => {
      const importFile = document.getElementById("importFile");
      if (importFile) importFile.click();
    });

    // Setup the import file input
    const importFile = document.getElementById("importFile");
    if (importFile) {
      // Clean up existing handler
      const importFileClone = importFile.cloneNode(true);
      if (importFile.parentNode) {
        importFile.parentNode.replaceChild(importFileClone, importFile);
      }

      // Add new handler
      document.getElementById("importFile").addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          this.importSettings(file);
        }
      });
    }
  }

  // Add helper method for button setup
  _setupButton(id, handler) {
    const button = document.getElementById(id);
    if (button) {
      // Clone and replace to remove old handlers
      const clone = button.cloneNode(true);
      if (button.parentNode) {
        button.parentNode.replaceChild(clone, button);
      }

      // Add new handler
      document.getElementById(id).addEventListener("click", handler);
    }
  }

  _cleanupButtonHandlers() {
    const buttons = [
      "applySettings",
      "saveSettings",
      "resetSettings",
      "exportSettings",
      "importButton",
      "exportForServer",
    ];

    buttons.forEach((id) => {
      const button = document.getElementById(id);
      if (button) {
        const clone = button.cloneNode(true);
        if (button.parentNode) {
          button.parentNode.replaceChild(clone, button);
        }
      }
    });
  }

  // Keep the old method name for backward compatibility
  _cleanActionButtons() {
    this._cleanupButtonHandlers();
  }

  /**
   * Ensure that the stateManager has tab scroll position methods
   * This fixes the issue with tabs not working properly
   * @private
   */
  _ensureStateManagerHasTabMethods() {
    // Add tab position tracking to stateManager if it doesn't have it
    if (!this._stateManager.saveTabScrollPosition) {
      console.info(
        "[UIManager] Adding tab scroll position methods to StateManager",
      );
      this._stateManager._tabScrollPositions = new Map();

      this._stateManager.saveTabScrollPosition = (tabId, position) => {
        this._stateManager._tabScrollPositions.set(tabId, position);
      };

      this._stateManager.getTabScrollPosition = (tabId) => {
        return this._stateManager._tabScrollPositions.get(tabId) || 0;
      };
    }
  }

  /**
   * Schedule a preview update with debouncing via requestAnimationFrame
   * @param {boolean} force Force a full refresh regardless of pending state
   * @private
   */
  _schedulePreviewUpdate(force = false) {
    if (this._pendingPreviewUpdate && !force) return;
    this._pendingPreviewUpdate = true;
    
    requestAnimationFrame(() => {
      this._updatePreview(force);
      this._pendingPreviewUpdate = false;
    });
  }

  /**
   * Ensure backward compatibility by adding a fallback
   * on prototype level to catch any missed method replacements
   */
  _ensurePreviewMethodCompatibility() {
    const self = this;
    
    // If method calls were replaced but method itself is missing,
    // add a compatibility layer
    if (typeof this._updatePreview === 'function' &&
        typeof this._schedulePreviewUpdate !== 'function') {
      
      this._schedulePreviewUpdate = function(force = false) {
        console.warn('[UIManager] Using compatibility _schedulePreviewUpdate method');
        return self._updatePreview(force);
      };
    }
    
    // Also ensure the _updatePreview method exists
    if (typeof this._updatePreview !== 'function') {
      console.error('[UIManager] Critical error: _updatePreview method missing');
      this._updatePreview = function() {
        console.error('[UIManager] Fallback _updatePreview called - no implementation');
      };
    }
  }
}

window.toggleSearchProDebug = function(enable) {
  window.__searchProDebug = enable === true;
  console.info(`[SearchPro] Debug mode ${enable ? 'enabled' : 'disabled'}`);
  if (enable) {
    document.body.classList.add('search-pro-debug');
    console.info('[SearchPro] Useful debug commands:');
    console.info('- window.searchProDebug.checkTagVariables()');
    console.info('- window.searchProDebugTools.runDiagnostics()');
  } else {
    document.body.classList.remove('search-pro-debug');
  }
  return window.__searchProDebug;
};

export default UIManager;
