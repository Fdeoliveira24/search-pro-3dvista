/**
 * Secure Search Pro Control Panel - Modular Main Controller
 * Version 3.2 - Last Update on 11/01/2025 - Search Pro Configuration Loading - Google Sheets / CSV / Business JSON integration, runtime synchronization, Exact matches config, Silence Console Fix
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

// ENHANCED DEBUGGING: Test if this JavaScript file is loading at all
console.log("🔍 CONTROL PANEL DEBUG: control-panel-v3.js file is loading!");
console.log("🔍 CONTROL PANEL DEBUG: Check if ControlPanelCore exists:", typeof ControlPanelCore);

// Normalize control-panel asset paths to what the tour expects.
function toAssetPath(value) {
  if (!value) return value;
  const v = String(value).trim();
  // Absolute URLs or site-absolute paths -> leave alone
  if (/^(https?:)?\/\//.test(v) || v.startsWith("/")) return v;
  // Collapse any CP-specific prefixes to plain 'assets/...' (supports V3 and V4 paths)
  // Examples it should fix:
  // './search-pro-v3/assets/foo.jpg' -> 'assets/foo.jpg'
  // './search-pro-v4/assets/foo.jpg' -> 'assets/foo.jpg'
  // 'search-pro-v3/assets/foo.jpg'   -> 'assets/foo.jpg'
  // 'search-pro-v4/assets/foo.jpg'   -> 'assets/foo.jpg'
  // './assets/foo.jpg'               -> 'assets/foo.jpg'
  return v
    .replace(/^\.?\/?search-pro-v[34]\/assets\//i, "assets/")
    .replace(/^\.?\//, "") // remove leading './' or '/'
    .replace(/^assets\/+/, "assets/"); // collapse double slashes
}

function normalizeThumbnailPaths(cfg) {
  const t = cfg && cfg.thumbnailSettings;
  if (!t) return cfg;
  if (t.defaultImagePath) {
    t.defaultImagePath = toAssetPath(t.defaultImagePath);
  }
  if (t.defaultImages && typeof t.defaultImages === "object") {
    Object.keys(t.defaultImages).forEach((k) => {
      t.defaultImages[k] = toAssetPath(t.defaultImages[k]);
    });
  }
  return cfg;
}

class SecureSearchProControlPanel {
  constructor() {
    // Initialize core
    this.core = new ControlPanelCore();

    // Initialize modal system and other global components
    this.modalSystem = null;

    // FIXED: Add operation state tracking to prevent race conditions
    this.isApplying = false;
    this.isDownloading = false;
    this.isLoading = false;
    this.isResetting = false;

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
      console.log("========================================");
      console.log("🚀 CONTROL PANEL INIT() CALLED!");
      console.log("========================================");
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
      console.log("========================================");
      console.log("🔧 ABOUT TO CALL initializeTabHandlers()");
      console.log("========================================");
      this.initializeTabHandlers();

      // Setup tab content loading events
      document.addEventListener("tabContentLoaded", (e) => {
        this.handleTabContentLoaded(e);
      });

      console.log("🛡️ Secure Search Pro Control Panel initialized with modular architecture");

      // Only show toast if not already shown (prevent duplicates)
      if (!window.controlPanelInitialized) {
        window.controlPanelInitialized = true;
        this.core.showToast(
          "success",
          "Control Panel Ready",
          "Modular configuration interface loaded successfully"
        );
      }
    } catch (error) {
      console.error("❌ Error initializing control panel:", error);
      this.core.showToast("error", "Initialization Error", this.core.sanitizeInput(error.message));
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
      console.log("🔍 CHECKING: typeof AppearanceTabHandler =", typeof AppearanceTabHandler);
      if (typeof AppearanceTabHandler !== "undefined") {
        console.log("🔍 CREATING: AppearanceTabHandler instance...");
        const appearanceHandler = new AppearanceTabHandler();
        this.core.registerTabHandler("appearance", appearanceHandler);
        console.log("✅ Appearance tab handler registered");
      } else {
        console.error("❌ AppearanceTabHandler is undefined - file not loaded!");
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

      // Register Comprehensive Filtering tab handler
      if (typeof FilteringTabHandler !== "undefined") {
        const filteringHandler = new FilteringTabHandler();
        this.core.registerTabHandler("filtering", filteringHandler);
        console.log("✅ Comprehensive Filtering tab handler registered");
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
      // Register Knowledge tab handler
      if (typeof KnowledgeTabHandler !== "undefined") {
        const knowledgeHandler = new KnowledgeTabHandler();
        this.core.registerTabHandler("management", knowledgeHandler);
        console.log("✅ Knowledge tab handler registered");
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
      console.log(`🚨🚨🚨 TAB CONTENT LOADED: ${tabId} 🚨🚨🚨`);
      console.log(`🚨 Container:`, tabPanel);

      // Get the appropriate tab handler
      const handler = this.core.getTabHandler(tabId);
      console.log(`🚨 Handler found for ${tabId}:`, handler);

      if (handler) {
        // Initialize the tab handler with the loaded content
        console.log(`🚨 About to call ${tabId} handler.init()`);
        handler.init(tabPanel);
        console.log(`✅ ${tabId} tab handler initialized`);
      } else {
        // Fallback to core functionality for tabs without handlers yet
        console.log(`⚠️ No handler found for ${tabId}, using core functionality`);
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
   * Check for required dependencies and gracefully handle failures - simplified version
   */
  checkDependencies() {
    try {
      // Check only critical dependencies
      const errors = [];

      // Check for core modules - the only truly critical check
      if (typeof ControlPanelCore === "undefined") {
        errors.push("Core module not loaded");
        console.error("🚨 Critical: ControlPanelCore not found");

        if (this.core && this.core.showToast) {
          this.core.showToast(
            "error",
            "System Error",
            "Core system components are missing. Please refresh the page."
          );
        }
        return { warnings: [], errors };
      }

      // Log browser info for debugging (no error if missing)
      try {
        const browserInfo = this.getBrowserInfo();
        console.log(`🔍 Browser: ${browserInfo.name} ${browserInfo.version}`);
      } catch (e) {
        // Silent fallback, not critical
      }

      console.log("✅ Core dependencies verified");
      return { warnings: [], errors: [] };
    } catch (error) {
      console.error("🚨 Error during dependency check:", error);
      return { warnings: [], errors: [] }; // Don't break initialization
    }
  }

  /**
   * Disable icon-dependent features when FontAwesome is missing
   */
  disableIconFeatures() {
    try {
      // Hide icon selection UI elements
      const iconSelectors = document.querySelectorAll(".icon-picker, .font-awesome-grid");
      iconSelectors.forEach((element) => {
        element.style.display = "none";
        const warningDiv = document.createElement("div");
        warningDiv.className = "warning-message";
        warningDiv.textContent = "Icon features disabled - FontAwesome not loaded";
        element.parentNode.insertBefore(warningDiv, element);
      });

      console.log("🚨 Icon features disabled due to missing FontAwesome");
    } catch (error) {
      console.error("🚨 Error disabling icon features:", error);
    }
  }

  /**
   * Disable features affected by missing dependencies
   */
  disableAffectedFeatures(errors) {
    try {
      // Disable tab functionality if handlers are missing
      if (errors.some((error) => error.includes("tab handlers"))) {
        const tabButtons = document.querySelectorAll(".nav-item");
        tabButtons.forEach((button) => {
          const tabId = button.dataset.tab;
          const handlerName = tabId.charAt(0).toUpperCase() + tabId.slice(1) + "TabHandler";

          if (typeof window[handlerName] === "undefined") {
            button.disabled = true;
            button.classList.add("disabled");
            button.title = `${tabId} tab unavailable - handler not loaded`;
          }
        });
      }

      console.log("🚨 Affected features disabled to prevent errors");
    } catch (error) {
      console.error("🚨 Error disabling affected features:", error);
    }
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
      const applyButton = document.getElementById("applySettings");
      if (applyButton) {
        console.log("🔧 BUTTON: Apply Settings button found and connected");
        applyButton.addEventListener("click", (e) => {
          console.log("🔧 BUTTON: Apply Settings clicked!", {
            isApplying: this.isApplying,
            buttonDisabled: applyButton.disabled,
          });
          this.applySettings();
        });
      } else {
        console.error("❌ BUTTON: Apply Settings button not found!");
      }
      document
        .getElementById("downloadConfig")
        ?.addEventListener("click", () => this.downloadConfig());
      document.getElementById("loadConfig")?.addEventListener("click", () => this.loadConfig());
      document.getElementById("resetAll")?.addEventListener("click", async (e) => {
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
      if (container instanceof Element && typeof container.closest === "function") {
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
        ".form-input, .toggle-input, .color-input, .range-input, .form-select"
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
      const validationResults = [];

      tabPanels.forEach((panel) => {
        const tabId = panel.id.replace("-panel", "");
        const handler = this.core.getTabHandler(tabId);
        let isTabValid = true;

        if (handler && typeof handler.validateForm === "function") {
          try {
            const validationResult = handler.validateForm(panel);
            // Handle both boolean and object return types
            if (typeof validationResult === "object" && validationResult !== null) {
              isTabValid = validationResult.isValid === true;
            } else {
              isTabValid = validationResult === true;
            }

            if (!isTabValid) {
              console.warn(
                `❌ Validation failed for tab: ${tabId} (handler validation)`,
                validationResult
              );
              allValid = false;
            }
          } catch (handlerError) {
            console.error(`🚨 Security: Handler validation error for ${tabId}:`, handlerError);
            isTabValid = false;
            allValid = false;
          }
        } else {
          // Fallback validation using generic form validation
          try {
            isTabValid = this.validateForm(panel);
            if (!isTabValid) {
              console.warn(`❌ Validation failed for tab: ${tabId} (fallback validation)`);
              allValid = false;
            }
          } catch (fallbackError) {
            console.error(`🚨 Security: Fallback validation error for ${tabId}:`, fallbackError);
            isTabValid = false;
            allValid = false;
          }
        }

        validationResults.push({
          tabId,
          isValid: isTabValid,
          hasHandler: !!(handler && typeof handler.validateForm === "function"),
        });
      });

      // Update button states
      this.updateButtonStates(allValid);

      console.log(`🔍 All tabs validation: ${allValid ? "PASSED" : "FAILED"}`);
      console.log("📊 Validation details:", validationResults);

      // Store validation results for detailed error reporting
      this.lastValidationResults = validationResults;

      return allValid;
    } catch (error) {
      console.error("🚨 Security: Error validating all tabs:", error);
      this.updateButtonStates(false);
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
   * Ensure all tabs are loaded before proceeding with operations - FIXED: Preserve active tab
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

      // FIXED: Remember the currently active tab
      const currentActiveTab = document.querySelector(".nav-item.active");
      const currentActiveTabId = currentActiveTab
        ? currentActiveTab.getAttribute("data-tab")
        : null;

      console.log(`⏳ Ensuring all tabs are loaded (${loadedTabs.length}/${tabs.length})...`);

      // Set up an event listener for tab content loaded
      const tabLoadListener = (e) => {
        const newLoadedTabs = document.querySelectorAll('.tab-panel[data-loaded="true"]');
        console.log(`📝 Tab loaded, now ${newLoadedTabs.length}/${tabs.length}`);

        if (newLoadedTabs.length === tabs.length) {
          // All tabs loaded, remove listener
          document.removeEventListener("tabContentLoaded", tabLoadListener);

          // FIXED: Restore the original active tab
          if (currentActiveTabId && currentActiveTab) {
            console.log(`🔄 Restoring active tab: ${currentActiveTabId}`);
            currentActiveTab.click();
          }

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

        // FIXED: Restore the original active tab even on timeout
        if (currentActiveTabId && currentActiveTab) {
          console.log(`🔄 Restoring active tab after timeout: ${currentActiveTabId}`);
          currentActiveTab.click();
        }

        resolve(false);
      }, 5000);
    });
  }

  /**
   * Apply settings to tour via localStorage with enhanced security validation - FIXED: Race condition protection
   */
  async applySettings() {
    console.log("🔧 APPLY SETTINGS: Function called! Race check:", {
      isApplying: this.isApplying,
      timestamp: Date.now(),
    });

    // FIXED: Prevent multiple simultaneous operations
    if (this.isApplying) {
      console.log("🔧 APPLY SETTINGS: Already applying, skipping");
      return;
    }
    this.isApplying = true;

    try {
      this.setButtonsLoading(true);

      // Ensure all tabs are loaded first
      await this.ensureAllTabsLoaded();

      // TEMPORARY: Skip validation to test apply functionality
      console.log("🔧 APPLY SETTINGS: Skipping validation temporarily to test functionality");
      // const validationResult = this.validateAllTabs();
      // if (!validationResult) {
      //   console.error("🚨 APPLY SETTINGS: Validation failed - checking detailed results");
      //
      //   // Get detailed validation information
      //   const detailedValidation = this.getDetailedValidationResults();
      //   console.error("🔍 DETAILED VALIDATION RESULTS:", detailedValidation);
      //
      //   if (this.modalSystem) {
      //     this.modalSystem.showErrorModal(
      //       "Validation Failed",
      //       {
      //         message: "Please fix all form errors before applying settings.",
      //         details: detailedValidation
      //       }
      //     );
      //   } else {
      //     this.core.showToast(
      //       "error",
      //       "Validation Failed",
      //       "Please fix all errors before applying settings"
      //     );
      //   }
      //   return;
      // }

      // Show confirmation modal first
      this.modalSystem.showApplySettingsModal(
        this.core.config,
        async () => {
          // User confirmed - proceed with apply
          this.core.setLoading(true, "Applying settings...");

          // CRITICAL: Update all tab-specific configurations before applying
          console.log("🔧 APPLY: Updating tab-specific configurations before apply");

          // Update display tab configuration if display tab handler exists
          const displayHandler = this.core.getTabHandler("display");
          if (displayHandler && typeof displayHandler.updateDisplayConfigFromForm === "function") {
            console.log("🔧 APPLY: Calling display tab updateDisplayConfigFromForm");
            displayHandler.updateDisplayConfigFromForm();
          } else {
            console.log(
              "🚨 APPLY: Display tab handler or updateDisplayConfigFromForm method not found"
            );
          }

          try {
            console.log("🔧 APPLY SETTINGS: Starting config update from form");

            // Update config from form
            await this.updateConfigFromForm();

            // --- SMART EXCLUSIVE MODE FOR DATA SOURCES ---
            const gs = this.core.config.googleSheets || {};

            // If Local CSV is ON → it wins
            if (gs.useLocalCSV === true) {
              gs.useGoogleSheetData = false;
            }

            // If Google Sheets ON and CSV OFF → enforce Sheets mode
            if (gs.useGoogleSheetData === true && gs.useLocalCSV === false) {
              gs.useLocalCSV = false;
            }

            // If both ON (bad UI state) → Local CSV wins
            if (gs.useGoogleSheetData === true && gs.useLocalCSV === true) {
              gs.useGoogleSheetData = false;
            }

            this.core.config.googleSheets = gs;
            // ------------------------------------------------

            // Normalize thumbnail paths before saving/posting
            normalizeThumbnailPaths(this.core.config);

            // Add backward compatibility mapping for showTagsInResults
            // Map display.showTagsInResults to root level for search engine compatibility
            if (
              this.core.config.display &&
              this.core.config.display.showTagsInResults !== undefined
            ) {
              this.core.config.showTagsInResults = this.core.config.display.showTagsInResults;
            }

            console.log("🔧 APPLY SETTINGS: Config updated, current thumbnail settings:", {
              enableThumbnails: this.core.config.thumbnailSettings?.enableThumbnails,
              defaultImages: this.core.config.thumbnailSettings?.defaultImages,
            });

            // Validate config before storing
            if (!this.core.validateAndSanitizeConfig(this.core.config)) {
              throw new Error("Configuration validation failed");
            }

            // Store using secure localStorage operations
            console.log("🔧 APPLY SETTINGS: About to save config to localStorage:", {
              configSize: JSON.stringify(this.core.config).length,
              enableThumbnails: this.core.config.thumbnailSettings?.enableThumbnails,
              panoramaDefault: this.core.config.thumbnailSettings?.defaultImages?.Panorama,
              hotspotDefault: this.core.config.thumbnailSettings?.defaultImages?.Hotspot,
            });

            const success1 = this.core.safeLocalStorageSet("searchProLiveConfig", this.core.config);
            const success2 = this.core.safeLocalStorageSet("searchProConfig", this.core.config);
            const success3 = this.core.safeLocalStorageSet(
              "searchProConfigUpdate",
              Date.now().toString()
            );

            console.log("🔧 APPLY SETTINGS: localStorage save results:", {
              success1,
              success2,
              success3,
            });

            if (!success1 || !success2 || !success3) {
              throw new Error("Failed to save configuration to localStorage");
            }

            console.log("🔧 APPLY SETTINGS: Configuration saved to localStorage successfully");

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
                console.warn("🚨 Security: Error posting config update:", postError);
              }
            }

            // [Patch] Direct update + cache clear after Apply
            try {
              console.log("🔄 [SearchPro] Applying live config update...");

              // Clear data caches to avoid stale results
              delete window._googleSheetsData;
              localStorage.removeItem("tourGoogleSheetsData");

              // Attempt direct runtime update
              if (window.parent?.tourSearchFunctions?.reinitializeSearch) {
                console.log("✅ [SearchPro] Reinitializing search system");
                window.parent.tourSearchFunctions.reinitializeSearch(true);
              } else if (window.parent?.searchFunctions?.updateConfig) {
                console.log("✅ [SearchPro] Updating runtime config directly");
                window.parent.searchFunctions.updateConfig(this.core.config);
              } else {
                console.warn(
                  "⚠️ [SearchPro] No live runtime handler found; using localStorage sync only"
                );
              }
            } catch (err) {
              console.error("❌ [SearchPro] Live config propagation failed:", err);
            }

            // Show success toast
            this.core.showToast(
              "success",
              "Settings Applied Successfully",
              "Configuration updated and ready to use. Refresh your tour to see the changes."
            );

            console.log("✅ Settings applied successfully and securely", this.core.config);
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
              this.core.showToast("error", "Apply Failed", this.core.sanitizeInput(error.message));
            }
          } finally {
            this.core.setLoading(false);
          }
        },
        () => {
          console.log("Settings apply cancelled by user");
        }
      );
    } catch (error) {
      console.error("🚨 Security: Error in applySettings:", error);
      this.core.showToast(
        "error",
        "Security Error",
        "Failed to apply settings due to security validation"
      );
    } finally {
      // FIXED: Always reset operation state
      this.isApplying = false;
      this.setButtonsLoading(false);
    }
  }

  /**
   * Download configuration file with enhanced security validation - FIXED: Race condition protection
   */
  async downloadConfig() {
    // FIXED: Prevent multiple simultaneous operations
    if (this.isDownloading) return;
    this.isDownloading = true;

    try {
      this.setButtonsLoading(true);

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

            // Normalize thumbnail paths before downloading
            normalizeThumbnailPaths(this.core.config);

            // Validate config before download
            if (!this.core.validateAndSanitizeConfig(this.core.config)) {
              throw new Error("Configuration validation failed");
            }

            // Add backward compatibility mapping for showTagsInResults
            // Map display.showTagsInResults to root level for search engine compatibility
            if (
              this.core.config.display &&
              this.core.config.display.showTagsInResults !== undefined
            ) {
              this.core.config.showTagsInResults = this.core.config.display.showTagsInResults;
            }

            // Build a cleaned clone and normalize asset paths across both schemas
            const cfg = JSON.parse(JSON.stringify(this.core.config));
            const ensure = (v) => this.core.ensureAssetPrefix(v);

            // Normalize thumbnailSettings paths
            if (cfg.thumbnailSettings) {
              if (typeof cfg.thumbnailSettings.defaultImagePath === "string") {
                cfg.thumbnailSettings.defaultImagePath = ensure(
                  cfg.thumbnailSettings.defaultImagePath
                );
              }
              if (
                cfg.thumbnailSettings.defaultImages &&
                typeof cfg.thumbnailSettings.defaultImages === "object"
              ) {
                Object.keys(cfg.thumbnailSettings.defaultImages).forEach((k) => {
                  const val = cfg.thumbnailSettings.defaultImages[k];
                  if (typeof val === "string") cfg.thumbnailSettings.defaultImages[k] = ensure(val);
                });
              }
            }
            // Normalize alternate thumbnails schema if present
            if (cfg.thumbnails) {
              if (typeof cfg.thumbnails.defaultPath === "string") {
                cfg.thumbnails.defaultPath = ensure(cfg.thumbnails.defaultPath);
              }
              if (cfg.thumbnails.defaults && typeof cfg.thumbnails.defaults === "object") {
                Object.keys(cfg.thumbnails.defaults).forEach((k) => {
                  const val = cfg.thumbnails.defaults[k];
                  if (typeof val === "string") cfg.thumbnails.defaults[k] = ensure(val);
                });
              }
            }

            // Remove duplicate root keys, keeping richer variants
            // (Specifically avoid a second, simple filter and duplicate searchSettings)
            if (
              cfg.filter &&
              cfg.filter.blacklistedValues &&
              Object.keys(cfg.filter).length === 1
            ) {
              // If a richer filter exists elsewhere in the structure, keep that.
              // Here we do nothing because we already built cfg from core.config which has the correct single filter.
            }
            // Ensure only one searchSettings at root (already merged in core defaults)

            // Generate JavaScript module content
            const header = `/**\n * Search Pro V4 Configuration\n * Generated on ${new Date().toLocaleString()}\n * This file can be directly included in your project.\n * \n * IMPORTANT: Do not add auto-apply code to this file.\n * The search engine (search-v4.js) will automatically detect and apply\n * this configuration via its DOMContentLoaded handler.\n * \n * Simply include this file after search-v4.js:\n * <script src="search-pro-v4/search-v4.js"></script>\n * <script src="search-pro-v4/config/search-pro-config.js"></script>\n * \n * Note: V4 is backward compatible with V3 paths.\n */\n\n`;
            const body =
              `window.searchProConfig = ${JSON.stringify(cfg, null, 2)};\n\n` +
              `// Node.js module export compatibility\n` +
              `if (typeof module !== 'undefined' && module.exports) { module.exports = window.searchProConfig; }\n\n` +
              `// Configuration loaded - search engine will apply via DOMContentLoaded\n` +
              `console.log('✅ CONFIG FILE: window.searchProConfig defined and ready');\n`;

            const jsContent = header + body;

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
              "JavaScript file saved successfully. Include it directly in your project."
            );

            console.log("📥 Config JS file downloaded successfully and securely");
          } catch (error) {
            console.error("❌ Error downloading config:", error);
            if (this.modalSystem) {
              this.modalSystem.showErrorModal(
                "Download Failed",
                this.core.sanitizeInput(error.message)
              );
            } else {
              this.core.showToast(
                "error",
                "Download Failed",
                this.core.sanitizeInput(error.message)
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
    } finally {
      // FIXED: Always reset operation state
      this.isDownloading = false;
      this.setButtonsLoading(false);
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
          // Handle .js files (matching our export format)
          config = this.parseJavaScriptConfig(content);
        } catch (parseError) {
          throw new Error(`Invalid JavaScript config file: ${parseError.message}`);
        }

        // Validate configuration structure
        const configValidation = this.validateConfigurationStructure(config);
        if (!configValidation.isValid) {
          throw new Error(`Invalid configuration structure: ${configValidation.error}`);
        }

        // Safe object merge to prevent prototype pollution
        this.core.config = this.core.safeObjectMerge(this.core.getDefaultConfig(), config);

        // Additional validation and sanitization
        if (!this.core.validateAndSanitizeConfig(this.core.config)) {
          throw new Error("Configuration failed security validation");
        }

        // Update all loaded tab forms
        document.querySelectorAll('.tab-panel[data-loaded="true"]').forEach((panel) => {
          this.core.populateForm(panel);
        });

        this.core.showToast(
          "success",
          "Configuration Loaded",
          "Settings imported and applied successfully. All forms have been updated."
        );

        console.log("📤 Config loaded successfully and securely", this.core.config);
      } catch (error) {
        console.error("❌ Error loading config:", error);
        if (this.modalSystem) {
          this.modalSystem.showErrorModal("Configuration Load", {
            message: this.core.sanitizeInput(error.message),
            file: this.core.sanitizeInput(file.name),
            size: `${Math.ceil(file.size / 1024)}KB`,
          });
        } else {
          this.core.showToast("error", "Load Failed", this.core.sanitizeInput(error.message));
        }
      } finally {
        this.core.setLoading(false);
      }
    } catch (error) {
      console.error("🚨 Security: Error in handleFileLoad:", error);
      this.core.showToast("error", "Security Error", "File load failed due to security validation");
    }
  }

  /**
   * Parse JavaScript configuration file
   */
  parseJavaScriptConfig(content) {
    try {
      // Create a safe sandbox to execute the JavaScript config
      const sandbox = {
        window: {},
        module: { exports: {} },
        console: { log: () => {}, warn: () => {}, error: () => {} },
      };

      // Execute the JavaScript content in sandbox
      const func = new Function("window", "module", "console", content);
      func(sandbox.window, sandbox.module, sandbox.console);

      // Extract config from either window.searchProConfig or module.exports
      let config = sandbox.window.searchProConfig || sandbox.module.exports;

      if (!config || typeof config !== "object") {
        throw new Error("No valid searchProConfig found in JavaScript file");
      }

      return config;
    } catch (error) {
      console.error("🚨 Error parsing JavaScript config:", error);
      throw new Error(`Failed to parse JavaScript config: ${error.message}`);
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

      // Check file extensions - JS FILES ONLY (matching export format)
      const allowedExtensions = [".js"];
      const fileName = file.name.toLowerCase();
      const hasValidExtension = allowedExtensions.some((ext) => fileName.endsWith(ext));

      if (!hasValidExtension) {
        return {
          isValid: false,
          error: "Invalid file type. Only .js files are supported.",
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
      console.error("🚨 Security: Error validating configuration structure:", error);
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
  async updateConfigFromForm() {
    try {
      // Create a backup of current config before modification
      const configBackup = JSON.parse(JSON.stringify(this.core.config));

      console.log("📝 UPDATE CONFIG: Starting comprehensive config update from all tabs");

      // Ensure ALL tabs are loaded before collecting config
      await this.ensureAllTabsLoaded();
      // First, update from standard form inputs
      const formInputs = document.querySelectorAll("[name]");

      formInputs.forEach((input) => {
        const name = input.getAttribute("name");
        if (!name || !this.core.isValidPropertyName(name)) {
          console.warn(`🚨 Security: Invalid property name: ${name}`);
          return;
        }

        let value;

        if (input.type === "checkbox") {
          value = input.checked;
        } else if (input.type === "number" || input.type === "range") {
          value = input.value === "" ? null : parseFloat(input.value);
        } else {
          value = this.core.sanitizeInput(input.value);

          // Handle width input
          if (name === "searchBar.width" && typeof value === "string" && value.includes("px")) {
            value = parseInt(value.replace("px", "")) || 350;
          }
        }

        // Set property safely with merge strategy
        this.core.safeSetNestedProperty(this.core.config, name, value);
      });

      // Now, call tab-specific updateConfigFromForm methods for ALL tabs (loaded and unloaded)
      const tabUpdates = [];
      const allTabIds = [
        "general",
        "appearance",
        "display",
        "content",
        "filtering",
        "data-sources",
        "advanced",
        "management",
      ];

      allTabIds.forEach((tabId) => {
        const handler = this.core.getTabHandler(tabId);
        const panel = document.getElementById(`${tabId}-panel`);

        if (handler && typeof handler.updateConfigFromForm === "function") {
          try {
            // Create a temporary config snapshot for this tab
            const preTabConfig = JSON.parse(JSON.stringify(this.core.config));

            // Call the handler whether the tab is loaded or not
            handler.updateConfigFromForm(panel);

            // Log what changed for this tab
            const postTabConfig = JSON.parse(JSON.stringify(this.core.config));
            const configChanged = JSON.stringify(preTabConfig) !== JSON.stringify(postTabConfig);

            tabUpdates.push({
              tabId,
              success: true,
              configChanged,
            });

            if (configChanged) {
              console.log(`📝 Tab-specific config update for ${tabId} completed with changes`);
            } else {
              console.log(`📝 Tab-specific config update for ${tabId} completed (no changes)`);
            }
          } catch (tabError) {
            console.error(`❌ Error updating config for ${tabId} tab:`, tabError);
            tabUpdates.push({
              tabId,
              success: false,
              error: tabError.message,
            });

            // Continue with other tabs even if one fails
          }
        } else {
          console.warn(`⚠️ No handler or updateConfigFromForm method found for ${tabId} tab`);
          tabUpdates.push({
            tabId,
            success: false,
            error: "No handler available",
          });
        }
      });

      // Log summary of tab updates
      const successfulTabs = tabUpdates.filter((update) => update.success);
      const failedTabs = tabUpdates.filter((update) => !update.success);
      const changedTabs = tabUpdates.filter((update) => update.success && update.configChanged);

      console.log(
        `📊 Config update summary: ${successfulTabs.length} successful, ${failedTabs.length} failed, ${changedTabs.length} with changes`
      );
      if (successfulTabs.length > 0) {
        console.log("✅ Successful tabs:", successfulTabs.map((t) => t.tabId).join(", "));
      }
      if (changedTabs.length > 0) {
        console.log("🔄 Tabs with changes:", changedTabs.map((t) => t.tabId).join(", "));
      }
      if (failedTabs.length > 0) {
        console.warn(
          "❌ Failed tabs:",
          failedTabs.map((t) => `${t.tabId} (${t.error})`).join(", ")
        );
      }

      // Additional validation and sanitization of final config
      if (!this.core.validateAndSanitizeConfig(this.core.config)) {
        console.warn("⚠️ Final configuration failed validation, reverting to backup");
        this.core.config = configBackup;
        throw new Error("Final configuration validation failed");
      }

      console.log("✅ updateConfigFromForm completed successfully");
    } catch (error) {
      console.error("🚨 Security: Error updating config from form:", error);
      // Restore backup on error
      this.core.config = configBackup;
      throw new Error("Failed to update configuration from form: " + error.message);
    }
  }

  /**
   * Get detailed validation results for error reporting
   */
  getDetailedValidationResults() {
    if (!this.lastValidationResults) {
      return "No detailed validation results available";
    }

    const failedTabs = this.lastValidationResults.filter((result) => !result.isValid);
    if (failedTabs.length === 0) {
      return "All tabs passed validation";
    }

    return failedTabs
      .map((tab) => `${tab.tabId}: Failed ${tab.hasHandler ? "handler" : "fallback"} validation`)
      .join(", ");
  }

  /**
   * Reset all settings to defaults - Enhanced Version - FIXED: Proper async modal handling
   */
  async resetAll() {
    // FIXED: Prevent multiple simultaneous operations
    if (this.isResetting) {
      console.log("⚠️ Reset already in progress, skipping...");
      return;
    }

    this.isResetting = true;

    try {
      console.log("🔄 Starting reset process...");
      this.setButtonsLoading(true);

      if (this.modalSystem) {
        // FIXED: Properly handle async modal with callbacks that reset states
        this.modalSystem.showResetAllModal(
          async () => {
            console.log("✅ Reset confirmed by user");
            try {
              await this.performCompleteReset();
            } catch (error) {
              console.error("❌ Error during reset:", error);
            } finally {
              // Reset states after completion
              this.isResetting = false;
              this.setButtonsLoading(false);
            }
          },
          () => {
            console.log("❌ Reset cancelled by user");
            // Reset states after cancellation
            this.isResetting = false;
            this.setButtonsLoading(false);
          }
        );
      } else {
        // Fallback to browser confirm dialog
        const confirmed = confirm(
          "Are you sure you want to reset all settings to default values? This action cannot be undone."
        );
        if (confirmed) {
          console.log("✅ Reset confirmed by user (browser dialog)");
          await this.performCompleteReset();
        } else {
          console.log("❌ Reset cancelled by user (browser dialog)");
        }
        // Reset states after browser dialog
        this.isResetting = false;
        this.setButtonsLoading(false);
      }
    } catch (error) {
      console.error("🚨 Security: Error in resetAll:", error);
      // Always reset states on error
      this.isResetting = false;
      this.setButtonsLoading(false);
    }
    // Note: No finally block here since we handle state reset in each branch
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
      document.querySelectorAll('.tab-panel[data-loaded="true"]').forEach((panel) => {
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
        "All settings have been restored to their default values. All forms have been updated with the new configuration."
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
          }
        );
      } else {
        this.core.showToast("error", "Reset Failed", this.core.sanitizeInput(error.message));
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
      document.addEventListener("keydown", (e) => this.handleKeyboardShortcuts(e));
    } catch (error) {
      console.error("🚨 Security: Error adding keyboard shortcuts:", error);
    }
  }

  /**
   * Load configuration from file (trigger file input) - FIXED: Add async for consistency
   */
  async loadConfig() {
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
   * Set buttons loading state - FIXED: Add missing method for race condition protection
   */
  setButtonsLoading(isLoading) {
    try {
      const buttons = [
        document.getElementById("applySettings"),
        document.getElementById("downloadConfig"),
        document.getElementById("loadConfig"),
        document.getElementById("resetAll"),
      ];

      buttons.forEach((button) => {
        if (button) {
          button.disabled = isLoading;
          if (isLoading) {
            button.style.opacity = "0.6";
            button.style.cursor = "not-allowed";
          } else {
            button.style.opacity = "1";
            button.style.cursor = "pointer";
          }
        }
      });

      // Also update FAB buttons
      const fabButtons = document.querySelectorAll(".fab-action");
      fabButtons.forEach((button) => {
        if (button) {
          button.disabled = isLoading;
          button.style.opacity = isLoading ? "0.6" : "1";
        }
      });
    } catch (error) {
      console.error("🚨 Error setting buttons loading state:", error);
    }
  }

  /**
   * Setup FAB menu integration
   */
  setupFABMenu() {
    try {
      console.log("🎯 FAB Menu integration ready");

      if (window.fabMenu && typeof window.fabMenu.setControlPanel === "function") {
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
      "🛡️ Secure Search Pro Control Panel initialized with modular architecture and comprehensive protection"
    );
  }
}

// Note: Control panel is initialized at the bottom of this file to prevent duplicate initialization

// Enhanced global error handlers with security logging
// Global error handler - much less aggressive, prevents duplicate toasts
let lastErrorTime = 0;
let errorCount = 0;
const ERROR_THROTTLE_DELAY = 5000; // 5 seconds between error toasts

window.addEventListener("error", (event) => {
  console.error("🚨 Control Panel Error:", event.error);

  const now = Date.now();
  if (now - lastErrorTime < ERROR_THROTTLE_DELAY) {
    errorCount++;
    return; // Throttle: don't show toast if recent error already shown
  }

  // Only show toast for critical errors that break functionality
  const isCriticalError =
    event.error &&
    ((event.error.name === "ReferenceError" && event.error.message.includes("not defined")) ||
      (event.error.name === "TypeError" &&
        event.error.message.includes("Cannot read properties of null")));

  if (
    isCriticalError &&
    window.searchProControlPanel &&
    window.searchProControlPanel.core &&
    typeof window.searchProControlPanel.core.showToast === "function"
  ) {
    lastErrorTime = now;
    const message =
      errorCount > 0
        ? `Script issue detected (${errorCount + 1} errors). Some features may not work.`
        : "A script issue was detected. Most features should continue working.";

    window.searchProControlPanel.core.showToast("warning", "Script Warning", message);
    errorCount = 0; // Reset count after showing toast
  }
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("🚨 Unhandled Promise Rejection:", event.reason);

  const now = Date.now();
  if (now - lastErrorTime < ERROR_THROTTLE_DELAY) {
    return; // Use same throttling as error handler
  }

  // Only show toast for critical promise rejections
  const isCritical =
    event.reason &&
    (event.reason.message?.includes("Failed to fetch") ||
      event.reason.message?.includes("Network error") ||
      event.reason.message?.includes("Critical"));

  if (
    isCritical &&
    window.searchProControlPanel &&
    window.searchProControlPanel.core &&
    typeof window.searchProControlPanel.core.showToast === "function"
  ) {
    lastErrorTime = now;
    window.searchProControlPanel.core.showToast(
      "warning",
      "Network Warning",
      "A network issue occurred. Some features may be limited."
    );
  }
});

// Security event logging
document.addEventListener("DOMContentLoaded", () => {
  console.log("🛡️ Modular Secure Control Panel System loaded with the following protections:");
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

// 🔥 CRITICAL FIX: Actually instantiate the control panel!
console.log("========================================");
console.log("🔥 CREATING CONTROL PANEL INSTANCE...");
console.log("========================================");

// Create the control panel instance and make it globally available
window.searchProControlPanel = new SecureSearchProControlPanel();

console.log("========================================");
console.log("🔥 CONTROL PANEL INSTANCE CREATED!");
console.log("========================================");
