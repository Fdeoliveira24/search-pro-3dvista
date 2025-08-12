/**
 * Secure Search Pro Control Panel - Modular Main Controller
 * Professional Configuration Interface with Modular Architecture
 *
 * SECURITY ENHANCEMENTS:
 * - Prototype pollution prevention via safe object merging
 * - XSS prevention through input sanitization
 * - Safe localStorage operations with validation
 * - Configuration structure validation
 * - File upload security with content scanning
 * - Property name validation
 * - Content safety validation
 * - Memory leak prevention
 * - Error boundary implementation
 */

class SecureSearchProControlPanel {
  constructor() {
    // Initialize core
    this.core = new ControlPanelCore();

    // Initialize modal system and other global components
    this.modalSystem = null;

    // Initialize after DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  /**
   * Initialize the control panel
   */
  async init() {
    try {
      console.log("🚀 Secure Search Pro Control Panel v2.0.0 initializing...");
      console.log("⏳ Loading: Initializing modular control panel...");

      // Initialize modal system FIRST
      this.modalSystem = new ModalSystem();
      console.log("✅ Modal system initialized");

      // Check dependencies
      this.checkDependencies();

      // Setup all components
      this.setupEventListeners();
      this.addKeyboardShortcuts();
      this.setupFABMenu();

      // Initialize tab handlers
      this.initializeTabHandlers();

      // Setup tab content loading events
      document.addEventListener("tabContentLoaded", (e) => {
        this.handleTabContentLoaded(e);
      });

      console.log(
        "🛡️ Secure Search Pro Control Panel initialized with modular architecture",
      );
      this.core.showToast(
        "success",
        "Control Panel Ready",
        "Modular configuration interface loaded successfully",
      );
    } catch (error) {
      console.error("❌ Error initializing control panel:", error);
      this.core.showToast(
        "error",
        "Initialization Error",
        this.core.sanitizeInput(error.message),
      );
    }
  }

  /**
   * Initialize tab handlers
   */
  initializeTabHandlers() {
    try {
      console.log("🔧 Initializing tab handlers...");

      // Register General tab handler
      if (typeof GeneralTabHandler !== "undefined") {
        const generalHandler = new GeneralTabHandler();
        this.core.registerTabHandler("general", generalHandler);
        console.log("✅ General tab handler registered");
      }

      // Register Appearance tab handler
      if (typeof AppearanceTabHandler !== "undefined") {
        const appearanceHandler = new AppearanceTabHandler();
        this.core.registerTabHandler("appearance", appearanceHandler);
        console.log("✅ Appearance tab handler registered");
      }

      // Register Display tab handler
      if (typeof DisplayTabHandler !== "undefined") {
        const displayHandler = new DisplayTabHandler();
        this.core.registerTabHandler("display", displayHandler);
        console.log("✅ Display tab handler registered");
      }

      // Register Content tab handler
      if (typeof ContentTabHandler !== "undefined") {
        const contentHandler = new ContentTabHandler();
        this.core.registerTabHandler("content", contentHandler);
        console.log("✅ Content tab handler registered");
      }

      // Register Filtering tab handler

      if (typeof FilteringTabHandler !== "undefined") {
        const filteringHandler = new FilteringTabHandler();
        this.core.registerTabHandler("filtering", filteringHandler);
        console.log("✅ Filtering tab handler registered");
      }

      // Register Data Sources tab handler
      if (typeof DataSourcesTabHandler !== "undefined") {
        const dataSourcesHandler = new DataSourcesTabHandler();
        this.core.registerTabHandler("data-sources", dataSourcesHandler);
        console.log("✅ Data Sources tab handler registered");
      }

      // Register Advanced tab handler
      if (typeof AdvancedTabHandler !== "undefined") {
        const advancedHandler = new AdvancedTabHandler();
        this.core.registerTabHandler("advanced", advancedHandler);
        console.log("✅ Advanced tab handler registered");
      }
      // Register Management tab handler
      if (typeof ManagementTabHandler !== "undefined") {
        const managementHandler = new ManagementTabHandler();
        this.core.registerTabHandler("management", managementHandler);
        console.log("✅ Management tab handler registered");
      }

      console.log(`🎯 ${this.core.tabHandlers.size} tab handlers initialized`);
    } catch (error) {
      console.error("❌ Error initializing tab handlers:", error);
    }
  }
  /**
   * Handle tab content loaded events
   */
  handleTabContentLoaded(e) {
    try {
      const { tabId, tabPanel } = e.detail;
      console.log(`📝 Tab content loaded: ${tabId}`);

      // Get the appropriate tab handler
      const handler = this.core.getTabHandler(tabId);

      if (handler) {
        // Initialize the tab handler with the loaded content
        handler.init(tabPanel);
        console.log(`✅ ${tabId} tab handler initialized`);
      } else {
        // Fallback to core functionality for tabs without handlers yet
        console.log(
          `⚠️ No handler found for ${tabId}, using core functionality`,
        );
        this.core.setupFormListeners(tabPanel);
        this.core.populateForm(tabPanel);
        this.validateForm(tabPanel);
      }

      // Clear any existing validation messages
      this.core.clearAllValidationMessages();
    } catch (error) {
      console.error("❌ Error handling tab content loaded:", error);
    }
  }

  /**
   * Check for required dependencies
   */
  checkDependencies() {
    // Check browser info
    const browserInfo = this.getBrowserInfo();
    console.log(
      `🔍 Browser detected: ${browserInfo.name} ${browserInfo.version}`,
    );

    // Check for FontAwesome
    const fontAwesome =
      document.querySelector('link[href*="font-awesome"]') ||
      document.querySelector('link[href*="fontawesome"]');
    if (!fontAwesome) {
      console.warn(
        "⚠️ FontAwesome icon library not loaded - icon functionality may be limited",
      );
    }

    // Check for required fonts
    const interFont = document.querySelector('link[href*="Inter"]');
    if (!interFont) {
      console.warn(
        "⚠️ Inter font not loaded - typography may fall back to system fonts",
      );
    }

    // Check for TabLoader
    if (!window.tabLoader) {
      console.warn(
        "⚠️ Tab Loader not initialized - dynamic tab loading may not work",
      );
    }

    console.log("✅ All dependencies checked");
  }

  /**
   * Get browser information
   */
  getBrowserInfo() {
    const userAgent = navigator.userAgent;
    let browserName = "unknown";
    let browserVersion = 0;

    if (userAgent.indexOf("Chrome") > -1) {
      browserName = "Chrome";
      browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || 0;
    } else if (userAgent.indexOf("Firefox") > -1) {
      browserName = "Firefox";
      browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || 0;
    } else if (userAgent.indexOf("Safari") > -1) {
      browserName = "Safari";
      browserVersion = userAgent.match(/Version\/(\d+)/)?.[1] || 0;
    } else if (userAgent.indexOf("Edge") > -1) {
      browserName = "Edge";
      browserVersion = userAgent.match(/Edge\/(\d+)/)?.[1] || 0;
    }

    return { name: browserName, version: parseInt(browserVersion) };
  }

  /**
   * Setup event listeners for all interactive elements
   */
  setupEventListeners() {
    try {
      // Action buttons
      document
        .getElementById("applySettings")
        ?.addEventListener("click", () => this.applySettings());
      document
        .getElementById("downloadConfig")
        ?.addEventListener("click", () => this.downloadConfig());
      document
        .getElementById("loadConfig")
        ?.addEventListener("click", () => this.loadConfig());
      document
        .getElementById("resetAll")
        ?.addEventListener("click", async (e) => {
          e.preventDefault();
          await this.resetAll();
        });

      // File input for loading configs
      document
        .getElementById("fileInput")
        ?.addEventListener("change", (e) => this.handleFileLoad(e));

      console.log("✅ Main event listeners setup successfully");
    } catch (error) {
      console.error("🚨 Security: Error setting up event listeners:", error);
    }
  }

  /**
   * Validate entire form (delegates to tab handlers when available)
   */
  validateForm(container = document) {
    try {
      // If container has a specific tab panel, try to use tab handler
      let tabPanel = null;
      if (
        container instanceof Element &&
        typeof container.closest === "function"
      ) {
        tabPanel = container.closest(".tab-panel");
      }
      if (tabPanel) {
        const tabId = tabPanel.id.replace("-panel", "");
        const handler = this.core.getTabHandler(tabId);

        if (handler && typeof handler.validateForm === "function") {
          return handler.validateForm(container);
        }
      }

      // Fallback to core validation
      const formInputs = container.querySelectorAll(
        ".form-input, .toggle-input, .color-input, .range-input, .form-select",
      );
      let isValid = true;

      formInputs.forEach((input) => {
        if (!this.core.validateField(input)) {
          isValid = false;
        }
      });

      // Update button states
      this.updateButtonStates(isValid);

      return isValid;
    } catch (error) {
      console.error("🚨 Security: Error validating form:", error);
      return false;
    }
  }

  /**
   * Validate all loaded tab panels
   * @returns {boolean} True if all tabs are valid, false otherwise
   */
  validateAllTabs() {
    try {
      const tabPanels = document.querySelectorAll('.tab-panel[data-loaded="true"]');
      let allValid = true;

      tabPanels.forEach((panel) => {
        const tabId = panel.id.replace("-panel", "");
        const handler = this.core.getTabHandler(tabId);

        if (handler && typeof handler.validateForm === "function") {
          if (!handler.validateForm(panel)) {
            allValid = false;
            console.warn(`❌ Validation failed for tab: ${tabId}`);
          }
        } else if (!this.validateForm(panel)) {
          allValid = false;
          console.warn(`❌ Validation failed for tab: ${tabId}`);
        }
      });

      // Update button states
      this.updateButtonStates(allValid);

      console.log(`🔍 All tabs validation: ${allValid ? "PASSED" : "FAILED"}`);
      return allValid;
    } catch (error) {
      console.error("🚨 Security: Error validating all tabs:", error);
      return false;
    }
  }

  /**
   * Update button states
   */
  updateButtonStates(isValid) {
    try {
      const applyButton = document.getElementById("applySettings");
      const downloadButton = document.getElementById("downloadConfig");

      if (applyButton) {
        applyButton.disabled = !isValid;
      }
      if (downloadButton) {
        downloadButton.disabled = !isValid;
      }

      // Update FAB states as well
      this.updateFABStates(isValid);
    } catch (error) {
      console.error("🚨 Security: Error updating button states:", error);
    }
  }

  /**
   * Update FAB button states
   */
  updateFABStates(isValid) {
    try {
      const fabButtons = document.querySelectorAll(".fab-action");
      fabButtons.forEach((button) => {
        if (button.id === "fabApply" || button.id === "fabDownload") {
          button.disabled = !isValid;
          button.style.opacity = isValid ? "1" : "0.5";
        }
      });
    } catch (error) {
      console.error("🚨 Security: Error updating FAB states:", error);
    }
  }

  /**
   * Ensure all tabs are loaded before proceeding with operations
   * @returns {Promise<boolean>} True if all tabs loaded successfully
   */
  ensureAllTabsLoaded() {
    return new Promise((resolve) => {
      const tabs = document.querySelectorAll(".nav-item");
      const loadedTabs = document.querySelectorAll('.tab-panel[data-loaded="true"]');
      
      if (tabs.length === loadedTabs.length) {
        // All tabs are already loaded
        resolve(true);
        return;
      }
      
      console.log(`⏳ Ensuring all tabs are loaded (${loadedTabs.length}/${tabs.length})...`);
      
      // Set up an event listener for tab content loaded
      const tabLoadListener = (e) => {
        const newLoadedTabs = document.querySelectorAll('.tab-panel[data-loaded="true"]');
        console.log(`📝 Tab loaded, now ${newLoadedTabs.length}/${tabs.length}`);
        
        if (newLoadedTabs.length === tabs.length) {
          // All tabs loaded, remove listener
          document.removeEventListener("tabContentLoaded", tabLoadListener);
          resolve(true);
        }
      };
      
      document.addEventListener("tabContentLoaded", tabLoadListener);
      
      // Click on each unloaded tab to trigger its loading
      tabs.forEach((tab) => {
        const tabId = tab.getAttribute("data-tab");
        const tabPanel = document.getElementById(`${tabId}-panel`);
        
        if (tabPanel && !tabPanel.hasAttribute("data-loaded")) {
          console.log(`🔄 Triggering load for tab: ${tabId}`);
          tab.click();
        }
      });
      
      // Set a timeout to resolve anyway, in case some tabs fail to load
      setTimeout(() => {
        document.removeEventListener("tabContentLoaded", tabLoadListener);
        console.warn("⚠️ Not all tabs could be loaded, proceeding anyway");
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Apply settings to tour via localStorage with enhanced security validation
   */
  async applySettings() {
    try {
      // Ensure all tabs are loaded first
      await this.ensureAllTabsLoaded();
      
      if (!this.validateAllTabs()) {
        if (this.modalSystem) {
          this.modalSystem.showErrorModal(
            "Validation Failed",
            "Please fix all form errors before applying settings."
          );
        } else {
          this.core.showToast(
            "error",
            "Validation Failed",
            "Please fix all errors before applying settings"
          );
        }
        return;
      }

      // Show confirmation modal first
      this.modalSystem.showApplySettingsModal(
        this.core.config,
        async () => {
          // User confirmed - proceed with apply
          this.core.setLoading(true, "Applying settings...");

          try {
            // Update config from form
            this.updateConfigFromForm();

            // Validate config before storing
            if (!this.core.validateAndSanitizeConfig(this.core.config)) {
              throw new Error("Configuration validation failed");
            }

            // Store using secure localStorage operations
            const success1 = this.core.safeLocalStorageSet(
              "searchProLiveConfig",
              this.core.config
            );
            const success2 = this.core.safeLocalStorageSet(
              "searchProConfig",
              this.core.config
            );
            const success3 = this.core.safeLocalStorageSet(
              "searchProConfigUpdate",
              Date.now().toString()
            );

            if (!success1 || !success2 || !success3) {
              throw new Error("Failed to save configuration to localStorage");
            }

            // Notify tour of config update if it's available
            if (window.parent && window.parent !== window) {
              try {
                window.parent.postMessage(
                  {
                    type: "searchProConfigUpdate",
                    config: this.core.config,
                  },
                  "*"
                );
              } catch (postError) {
                console.warn(
                  "🚨 Security: Error posting config update:",
                  postError
                );
              }
            }

            // Show success toast
            this.core.showToast(
              "success",
              "Settings Applied Successfully",
              "Configuration updated and ready to use. Refresh your tour to see the changes."
            );

            console.log(
              "✅ Settings applied successfully and securely",
              this.core.config
            );
          } catch (error) {
            console.error("❌ Error applying settings:", error);
            if (this.modalSystem) {
              this.modalSystem.showErrorModal(
                "Apply Settings",
                {
                  message: "Failed to apply settings to the tour.",
                  details: this.core.sanitizeInput(error.message),
                },
                () => this.applySettings()
              );
            } else {
              this.core.showToast(
                "error",
                "Apply Failed",
                this.core.sanitizeInput(error.message)
              );
            }
          } finally {
            this.core.setLoading(false);
          }
        },
        () => {
          console.log("Settings apply cancelled by user");
        },
      );
    } catch (error) {
      console.error("🚨 Security: Error in applySettings:", error);
      this.core.showToast(
        "error",
        "Security Error",
        "Failed to apply settings due to security validation",
      );
    }
  }

  /**
   * Download configuration file with enhanced security validation
   */
  async downloadConfig() {
    try {
        // Ensure all tabs are loaded first
        await this.ensureAllTabsLoaded();
        
        if (!this.validateAllTabs()) {
            if (this.modalSystem) {
                this.modalSystem.showErrorModal(
                    "Validation Failed",
                    "Please fix all form errors before downloading configuration."
                );
            } else {
                this.core.showToast(
                    "error",
                    "Validation Failed",
                    "Please fix all errors before downloading"
                );
            }
            return;
        }

        // Show confirmation modal first
        this.modalSystem.showDownloadConfigModal(
            this.core.config,
            async () => {
                // User confirmed - proceed with download
                this.core.setLoading(true, "Generating config file...");

                try {
  // Update config from form
  this.updateConfigFromForm();

  // Validate config before download
  if (!this.core.validateAndSanitizeConfig(this.core.config)) {
    throw new Error("Configuration validation failed");
  }

  // Generate JavaScript module content instead of JSON
  const configObj = JSON.stringify(this.core.config, null, 2);
  const jsContent = `/**
 * Search Pro Configuration
 * Generated on ${new Date().toLocaleString()}
 * 
 * This file can be directly included in your project.
 */

// Configuration Object
const searchProConfig = ${configObj};

// For CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = searchProConfig;
}

// For direct browser usage
if (typeof window !== 'undefined') {
  window.searchProConfig = searchProConfig;
  
  // Auto-update configuration if search functions exist
  if (window.searchFunctions && typeof window.searchFunctions.updateConfig === 'function') {
    window.searchFunctions.updateConfig(searchProConfig);
    console.log('✅ Search Pro configuration automatically applied');
  }
}
`;

  // Check file size
  if (jsContent.length > this.core.maxConfigSize) {
    throw new Error("Configuration file too large");
  }

  // Create and download file with JS extension and MIME type
  const blob = new Blob([jsContent], {
    type: "application/javascript", // Changed from application/json
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "search-pro-config.js"; // Changed from .json to .js
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Show success toast
  this.core.showToast(
    "success",
    "Configuration Downloaded",
    "JavaScript file saved successfully. Include it directly in your project.",
  );

  console.log("📥 Config JS file downloaded successfully and securely");
} catch (error) {
  console.error("❌ Error downloading config:", error);
  if (this.modalSystem) {
    this.modalSystem.showErrorModal(
      "Download Failed",
      this.core.sanitizeInput(error.message),
    );
  } else {
    this.core.showToast(
      "error",
      "Download Failed",
      this.core.sanitizeInput(error.message),
    );
                    }
                } finally {
                    this.core.setLoading(false);
                }
            },
            () => {
                console.log("Download cancelled by user");
            }
        );
    } catch (error) {
        console.error("🚨 Security: Error in downloadConfig:", error);
        this.core.showToast(
            "error",
            "Security Error",
            "Failed to download configuration due to security validation"
        );
    }
  }

  /**
   * Handle file load with enhanced security validation
   */
  async handleFileLoad(event) {
    try {
      const file = event.target.files[0];
      if (!file) return;

      // Reset file input
      event.target.value = "";

      // Enhanced security validation
      const validationResult = this.validateFileUpload(file);
      if (!validationResult.isValid) {
        if (this.modalSystem) {
          this.modalSystem.showErrorModal("Configuration Load", {
            message: validationResult.error,
            file: this.core.sanitizeInput(file.name),
            size: `${Math.ceil(file.size / 1024)}KB`,
          });
        } else {
          this.core.showToast("error", "Load Failed", validationResult.error);
        }
        return;
      }

      this.core.setLoading(true, "Loading configuration...");

      try {
        const content = await this.readFile(file);
        let config;

        try {
          config = JSON.parse(content);
        } catch (parseError) {
          throw new Error(`Invalid JSON format: ${parseError.message}`);
        }

        // Validate configuration structure
        const configValidation = this.validateConfigurationStructure(config);
        if (!configValidation.isValid) {
          throw new Error(
            `Invalid configuration structure: ${configValidation.error}`,
          );
        }

        // Safe object merge to prevent prototype pollution
        this.core.config = this.core.safeObjectMerge(
          this.core.getDefaultConfig(),
          config,
        );

        // Additional validation and sanitization
        if (!this.core.validateAndSanitizeConfig(this.core.config)) {
          throw new Error("Configuration failed security validation");
        }

        // Update all loaded tab forms
        document
          .querySelectorAll('.tab-panel[data-loaded="true"]')
          .forEach((panel) => {
            this.core.populateForm(panel);
          });

        this.core.showToast(
          "success",
          "Configuration Loaded",
          "Settings imported and applied successfully. All forms have been updated.",
        );

        console.log(
          "📤 Config loaded successfully and securely",
          this.core.config,
        );
      } catch (error) {
        console.error("❌ Error loading config:", error);
        if (this.modalSystem) {
          this.modalSystem.showErrorModal("Configuration Load", {
            message: this.core.sanitizeInput(error.message),
            file: this.core.sanitizeInput(file.name),
            size: `${Math.ceil(file.size / 1024)}KB`,
          });
        } else {
          this.core.showToast(
            "error",
            "Load Failed",
            this.core.sanitizeInput(error.message),
          );
        }
      } finally {
        this.core.setLoading(false);
      }
    } catch (error) {
      console.error("🚨 Security: Error in handleFileLoad:", error);
      this.core.showToast(
        "error",
        "Security Error",
        "File load failed due to security validation",
      );
    }
  }

  /**
   * Enhanced file upload validation
   */
  validateFileUpload(file) {
    try {
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return {
          isValid: false,
          error: "File too large. Maximum size is 10MB.",
        };
      }

      // Check file extensions - ONLY JSON FILES ALLOWED
      const allowedExtensions = [".json"];
      const fileName = file.name.toLowerCase();
      const hasValidExtension = allowedExtensions.some((ext) =>
        fileName.endsWith(ext),
      );

      if (!hasValidExtension) {
        return {
          isValid: false,
          error: "Invalid file type. Only .json files are supported.",
        };
      }

      // Check for suspicious file names
      const suspiciousPatterns = [
        /\.exe$/i,
        /\.bat$/i,
        /\.cmd$/i,
        /\.scr$/i,
        /\.vbs$/i,
        /\.ps1$/i,
        /\.php$/i,
        /\.asp$/i,
        /\.jsp$/i,
        /\.py$/i,
        /\.sh$/i,
        /\.pl$/i,
      ];

      if (suspiciousPatterns.some((pattern) => pattern.test(fileName))) {
        return {
          isValid: false,
          error: "Executable files are not allowed for security reasons.",
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error("🚨 Security: Error validating file upload:", error);
      return {
        isValid: false,
        error: "File validation failed due to security error.",
      };
    }
  }

  /**
   * Validate configuration structure
   */
  validateConfigurationStructure(config) {
    try {
      if (!config || typeof config !== "object") {
        return {
          isValid: false,
          error: "Configuration must be a valid object",
        };
      }

      // Check for required top-level properties
      const requiredProperties = ["searchBar", "autoHide"];
      for (const prop of requiredProperties) {
        if (!(prop in config)) {
          return {
            isValid: false,
            error: `Missing required property: ${prop}`,
          };
        }
      }

      return { isValid: true };
    } catch (error) {
      console.error(
        "🚨 Security: Error validating configuration structure:",
        error,
      );
      return {
        isValid: false,
        error: "Configuration validation failed due to security error",
      };
    }
  }

  /**
   * Read file content securely
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const result = e.target.result;
            if (typeof result !== "string") {
              reject(new Error("File content is not valid text"));
              return;
            }
            if (result.length > this.core.maxConfigSize) {
              reject(new Error("File content is too large"));
              return;
            }
            resolve(result);
          } catch (error) {
            reject(new Error("Failed to read file content"));
          }
        };
        reader.onerror = () => reject(new Error("File reading failed"));
        reader.readAsText(file);
      } catch (error) {
        reject(new Error("Failed to initialize file reader"));
      }
    });
  }

  /**
   * Update config from form values securely, including tab-specific handlers
   */
  updateConfigFromForm() {
    try {
      // First, update from standard form inputs
      const formInputs = document.querySelectorAll("[name]");

      formInputs.forEach((input) => {
        const name = input.getAttribute("name");
        if (!name) return;

        let value;

        if (input.type === "checkbox") {
          value = input.checked;
        } else if (input.type === "number" || input.type === "range") {
          value = input.value === "" ? null : parseFloat(input.value);
        } else {
          value = input.value;

          // Handle width input
          if (
            name === "searchBar.width" &&
            typeof value === "string" &&
            value.includes("px")
          ) {
            value = parseInt(value.replace("px", "")) || 350;
          }
        }

        // Set property safely
        this.core.safeSetNestedProperty(this.core.config, name, value);
      });

      // Now, call tab-specific updateConfigFromForm methods if they exist
      document.querySelectorAll('.tab-panel[data-loaded="true"]').forEach((panel) => {
        const tabId = panel.id.replace("-panel", "");
        const handler = this.core.getTabHandler(tabId);

        if (handler && typeof handler.updateConfigFromForm === "function") {
          handler.updateConfigFromForm(panel);
          console.log(`📝 Tab-specific config update for ${tabId}`);
        }
      });

      console.log("📝 Config updated from form securely");
    } catch (error) {
      console.error("🚨 Security: Error updating config from form:", error);
      throw new Error("Failed to update configuration from form");
    }
  }

  /**
   * Reset all settings to defaults - Enhanced Version
   */
  async resetAll() {
    try {
      if (this.modalSystem) {
        this.modalSystem.showResetAllModal(
          () => this.performCompleteReset(),
          () => console.log("Reset cancelled by user"),
        );
      } else {
        const confirmed = confirm(
          "Are you sure you want to reset all settings to default values? This action cannot be undone.",
        );
        if (confirmed) {
          this.performCompleteReset();
        }
      }
    } catch (error) {
      console.error("🚨 Security: Error in resetAll:", error);
    }
  }

  /**
   * Perform complete reset operation
   */
  async performCompleteReset() {
    this.core.setLoading(true, "Resetting all settings...");

    try {
      console.log("🔄 Starting complete reset process...");

      // 1. Clear all validation messages and states
      this.core.clearAllValidationMessages();

      // 2. Reset configuration to factory defaults
      this.core.config = this.core.getDefaultConfig();
      console.log("✅ Configuration reset to defaults");

      // 3. Reset all tab handlers
      this.core.tabHandlers.forEach((handler, tabId) => {
        if (typeof handler.resetToDefaults === "function") {
          handler.resetToDefaults();
          console.log(`✅ ${tabId} tab reset to defaults`);
        }
      });

      // 4. Reset all loaded form fields
      document
        .querySelectorAll('.tab-panel[data-loaded="true"]')
        .forEach((panel) => {
          this.core.populateForm(panel);
        });
      console.log("✅ Form fields reset");

      // 5. Clear localStorage entries
      this.clearStorageEntries();
      console.log("✅ Storage cleared");

      // 6. Update button states
      this.updateButtonStates(true);
      console.log("✅ Button states updated");

      // 7. Show success confirmation
      this.core.showToast(
        "success",
        "Settings Reset Complete",
        "All settings have been restored to their default values. All forms have been updated with the new configuration.",
      );

      console.log("🎉 Complete reset process finished successfully");
    } catch (error) {
      console.error("❌ Error during reset process:", error);
      this.handleResetError(error);
    } finally {
      this.core.setLoading(false);
    }
  }

  /**
   * Clear all localStorage entries related to the control panel
   */
  clearStorageEntries() {
    try {
      const keysToRemove = [
        "searchProConfig",
        "searchProLiveConfig",
        "searchProSettings",
        "controlPanelState",
        "sidebarCollapsed",
        "currentTab",
        "lastAppliedConfig",
        "configBackup",
      ];

      keysToRemove.forEach((key) => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch (error) {
          console.warn(`Could not clear storage key: ${key}`, error);
        }
      });

      console.log("🗄️ Storage entries cleared");
    } catch (error) {
      console.error("🚨 Security: Error clearing storage entries:", error);
    }
  }

  /**
   * Handle reset errors
   */
  handleResetError(error) {
    try {
      if (this.modalSystem) {
        this.modalSystem.showErrorModal(
          "Reset Failed",
          {
            message: "An error occurred while resetting settings.",
            details: this.core.sanitizeInput(error.message),
          },
          () => {
            this.performCompleteReset();
          },
        );
      } else {
        this.core.showToast(
          "error",
          "Reset Failed",
          this.core.sanitizeInput(error.message),
        );
      }
    } catch (handlerError) {
      console.error("🚨 Security: Error handling reset error:", handlerError);
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcuts(event) {
    try {
      // Ctrl/Cmd + S: Apply Settings
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        this.applySettings();
        return;
      }

      // Ctrl/Cmd + D: Download Config
      if ((event.ctrlKey || event.metaKey) && event.key === "d") {
        event.preventDefault();
        this.downloadConfig();
        return;
      }

      // Ctrl/Cmd + L: Load Config
      if ((event.ctrlKey || event.metaKey) && event.key === "l") {
        event.preventDefault();
        this.loadConfig();
        return;
      }

      // Ctrl/Cmd + R: Reset All
      if ((event.ctrlKey || event.metaKey) && event.key === "r") {
        event.preventDefault();
        this.resetAll();
        return;
      }

      // Escape: Close any open modals
      if (event.key === "Escape") {
        if (this.modalSystem) {
          this.modalSystem.closeModal();
        }
      }
    } catch (error) {
      console.error("🚨 Security: Error handling keyboard shortcuts:", error);
    }
  }

  /**
   * Add keyboard shortcuts
   */
  addKeyboardShortcuts() {
    try {
      document.addEventListener("keydown", (e) =>
        this.handleKeyboardShortcuts(e),
      );
    } catch (error) {
      console.error("🚨 Security: Error adding keyboard shortcuts:", error);
    }
  }

  /**
   * Load configuration from file (trigger file input)
   */
  loadConfig() {
    try {
      const fileInput = document.getElementById("fileInput");
      if (fileInput) {
        fileInput.click();
      }
    } catch (error) {
      console.error("🚨 Security: Error loading config:", error);
    }
  }

  /**
   * Setup FAB menu integration
   */
  setupFABMenu() {
    try {
      console.log("🎯 FAB Menu integration ready");

      if (
        window.fabMenu &&
        typeof window.fabMenu.setControlPanel === "function"
      ) {
        window.fabMenu.setControlPanel(this);
        console.log("✅ FAB Menu connected to control panel");
      } else {
        console.log("ℹ️ FAB Menu does not require control panel connection");
      }
    } catch (error) {
      console.error("🚨 Security: Error setting up FAB menu:", error);
    }
  }
}

// Backward compatibility layer
class SearchProControlPanel extends SecureSearchProControlPanel {
  constructor() {
    super();
    console.log(
      "🛡️ Secure Search Pro Control Panel initialized with modular architecture and comprehensive protection",
    );
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("🛡️ Modular control panel loading...");
  window.searchProControlPanel = new SearchProControlPanel();
});

// Enhanced global error handlers with security logging
window.addEventListener("error", (event) => {
  console.error("🚨 Control Panel Error:", event.error);
  if (
    window.searchProControlPanel &&
    typeof window.searchProControlPanel.core.showToast === "function"
  ) {
    window.searchProControlPanel.core.showToast(
      "error",
      "System Error",
      "An unexpected error occurred. Check console for details.",
    );
  }
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("🚨 Unhandled Promise Rejection:", event.reason);
  if (
    window.searchProControlPanel &&
    typeof window.searchProControlPanel.core.showToast === "function"
  ) {
    window.searchProControlPanel.core.showToast(
      "error",
      "System Error",
      "An unexpected error occurred. Check console for details.",
    );
  }
});

// Security event logging
document.addEventListener("DOMContentLoaded", () => {
  console.log(
    "🛡️ Modular Secure Control Panel System loaded with the following protections:",
  );
  console.log("  ✅ Modular architecture with tab handlers");
  console.log("  ✅ Prototype pollution prevention");
  console.log("  ✅ Safe object merging and property setting");
  console.log("  ✅ Input sanitization for all user data");
  console.log("  ✅ Secure localStorage operations");
  console.log("  ✅ Configuration validation and filtering");
  console.log("  ✅ XSS prevention in form handling");
  console.log("  ✅ File upload security validation");
  console.log("  ✅ Memory leak prevention");
  console.log("  ✅ Property name validation");
  console.log("  ✅ Content safety validation");
  console.log("  ✅ Error boundary implementation");
  console.log("  ✅ Tab-specific validation and handling");
  console.log("  ✅ Modular live preview system");
  console.log("  ✅ Enhanced security logging");
});
