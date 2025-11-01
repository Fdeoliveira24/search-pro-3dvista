/**
 * Search Pro Control Panel - Data Sources Tab Handler
 * Version 3.2 - Last Update on 11/01/2025 - Search Pro Configuration Loading - Google Sheets / CSV / Business JSON integration, runtime synchronization, Exact matches config, Silence Console Fix
 * Handles all functionality specific to the Data Sources settings tab
 */

class DataSourcesTabHandler {
  constructor() {
    this.core = null;
    this.tabId = "data-sources";
  }

  /**
   * Set the core instance
   */
  setCore(core) {
    this.core = core;
  }

  /**
   * Initialize data sources tab functionality
   */
  init(container) {
    try {
      console.log("💾 Initializing Data Sources tab handler");

      // Setup form listeners
      this.core.setupFormListeners(container);

      // Setup data sources specific features
      this.setupMutualExclusivityHandlers(container);
      this.setupLocalCSVHandlers(container);

      // Populate form with current values
      this.populateDataSourcesForm(container);

      // Initial update of mutual exclusivity state
      this.updateMutualExclusivityStates(container);

      // Validate all fields
      this.validateForm(container);

      // Setup reset button handlers
      this.setupResetButtonHandlers(container);

      console.log("✅ Data Sources tab handler initialized");
    } catch (error) {
      console.error("❌ Error initializing Data Sources tab:", error);
    }
  }

  /**
   * Populate data sources form with current values
   */
  populateDataSourcesForm(container) {
    try {
      // Let core populate most fields first
      this.core.populateForm(container);

      // Update mutual exclusivity states
      this.updateMutualExclusivityStates(container);

      // Update local CSV states
      this.updateLocalCSVStates(container);

      console.log("💾 Data Sources form populated");
    } catch (error) {
      console.error("🚨 Security: Error populating data sources form:", error);
    }
  }

  /**
   * Setup mutual exclusivity handlers for Business Data vs Google Sheets
   */
  setupMutualExclusivityHandlers(container) {
    try {
      const businessDataToggle = container.querySelector("#useBusinessData");
      const googleSheetsToggle = container.querySelector("#useGoogleSheetData");
      const mainWarningBanner = container.querySelector("#dataSourcesWarningBanner");

      if (businessDataToggle && googleSheetsToggle) {
        businessDataToggle.addEventListener("change", () => {
          if (businessDataToggle.checked) {
            // If user tries to enable Business Data while Google Sheets is enabled
            if (googleSheetsToggle.checked) {
              // Show warning in main banner temporarily
              if (mainWarningBanner) {
                mainWarningBanner.style.display = "flex";
                const messageEl = mainWarningBanner.querySelector("#dataSourcesWarningMessage");
                if (messageEl) {
                  messageEl.textContent =
                    "Business Data and Google Sheets cannot be enabled simultaneously. Google Sheets has been disabled.";
                }
                // Auto-hide the warning after 5 seconds
                setTimeout(() => {
                  if (mainWarningBanner.style.display !== "none") {
                    mainWarningBanner.style.display = "none";
                  }
                }, 5000);
              }

              // Disable Google Sheets with visual feedback
              googleSheetsToggle.checked = false;
              this.updateToggleState(googleSheetsToggle, false);
              this.core.onFormChange(googleSheetsToggle);

              // Show toast notification
              if (this.core.showToast) {
                this.core.showToast(
                  "warning",
                  "Data Source Switched",
                  "Google Sheets disabled - Business Data is now active"
                );
              }
            }
          }
          this.updateMutualExclusivityStates(container);
        });

        googleSheetsToggle.addEventListener("change", () => {
          if (googleSheetsToggle.checked) {
            // If user tries to enable Google Sheets while Business Data is enabled
            if (businessDataToggle.checked) {
              // Show warning in main banner temporarily
              if (mainWarningBanner) {
                mainWarningBanner.style.display = "flex";
                const messageEl = mainWarningBanner.querySelector("#dataSourcesWarningMessage");
                if (messageEl) {
                  messageEl.textContent =
                    "Google Sheets and Business Data cannot be enabled simultaneously. Business Data has been disabled.";
                }
                // Auto-hide the warning after 5 seconds
                setTimeout(() => {
                  if (mainWarningBanner.style.display !== "none") {
                    mainWarningBanner.style.display = "none";
                  }
                }, 5000);
              }
            }
            // Disable Business Data
            businessDataToggle.checked = false;
            this.updateToggleState(businessDataToggle, false);
            this.core.onFormChange(businessDataToggle);

            // Show toast notification
            if (this.core.showToast) {
              this.core.showToast(
                "info",
                "Mutual Exclusivity",
                "Business Data integration disabled because Google Sheets is enabled"
              );
            }
          }
          this.updateMutualExclusivityStates(container);
        });
      }

      console.log("🔄 Mutual exclusivity handlers set up");
    } catch (error) {
      console.error("🚨 Error setting up mutual exclusivity handlers:", error);
    }
  }

  /**
   * Setup local CSV handlers
   */
  setupLocalCSVHandlers(container) {
    try {
      const useLocalCSVToggle = container.querySelector("#useLocalCSV");
      const googleSheetUrlField = container.querySelector("#googleSheetUrl");

      if (useLocalCSVToggle && googleSheetUrlField) {
        useLocalCSVToggle.addEventListener("change", () => {
          this.updateLocalCSVStates(container);

          if (useLocalCSVToggle.checked) {
            if (this.core.showToast) {
              this.core.showToast(
                "info",
                "Local CSV Mode",
                "Using local CSV file - Google Sheets URL will be ignored"
              );
            }
          }
        });
      }

      console.log("📁 Local CSV handlers set up");
    } catch (error) {
      console.error("🚨 Error setting up local CSV handlers:", error);
    }
  }

  /**
   * Update mutual exclusivity visual states
   */
  updateMutualExclusivityStates(container) {
    try {
      const businessDataToggle = container.querySelector("#useBusinessData");
      const googleSheetsToggle = container.querySelector("#useGoogleSheetData");
      const businessDataSection = container.querySelector(
        '[aria-labelledby="business-data-heading"]'
      );
      const googleSheetsSection = container.querySelector(
        '[aria-labelledby="google-sheets-heading"]'
      );

      // Get warning elements
      const mainWarningBanner = container.querySelector("#dataSourcesWarningBanner");
      const businessDataWarning = container.querySelector("#businessDataWarning");
      const googleSheetsWarning = container.querySelector("#googleSheetsWarning");

      // Hide all warnings initially
      if (mainWarningBanner) mainWarningBanner.style.display = "none";
      if (businessDataWarning) businessDataWarning.style.display = "none";
      if (googleSheetsWarning) googleSheetsWarning.style.display = "none";

      if (businessDataToggle?.checked) {
        // Business Data is enabled - disable Google Sheets section visually
        if (googleSheetsSection) {
          googleSheetsSection.style.opacity = "0.6";
          googleSheetsSection.classList.add("disabled-section");
          this.disableSectionInputs(googleSheetsSection, true);
        }
        if (businessDataSection) {
          businessDataSection.style.opacity = "1";
          businessDataSection.classList.remove("disabled-section");
          this.disableSectionInputs(businessDataSection, false);
        }
        // Show Google Sheets warning
        if (googleSheetsWarning) googleSheetsWarning.style.display = "flex";
      } else if (googleSheetsToggle?.checked) {
        // Google Sheets is enabled - disable Business Data section visually
        if (businessDataSection) {
          businessDataSection.style.opacity = "0.6";
          businessDataSection.classList.add("disabled-section");
          this.disableSectionInputs(businessDataSection, true);
        }
        if (googleSheetsSection) {
          googleSheetsSection.style.opacity = "1";
          googleSheetsSection.classList.remove("disabled-section");
          this.disableSectionInputs(googleSheetsSection, false);
        }
        // Show Business Data warning
        if (businessDataWarning) businessDataWarning.style.display = "flex";
      } else {
        // Neither is enabled - enable both sections
        if (businessDataSection) {
          businessDataSection.style.opacity = "1";
          businessDataSection.classList.remove("disabled-section");
          this.disableSectionInputs(businessDataSection, false);
        }
        if (googleSheetsSection) {
          googleSheetsSection.style.opacity = "1";
          googleSheetsSection.classList.remove("disabled-section");
          this.disableSectionInputs(googleSheetsSection, false);
        }
        // Show main warning if neither is enabled
        if (mainWarningBanner) {
          mainWarningBanner.style.display = "flex";
          const messageEl = mainWarningBanner.querySelector("#dataSourcesWarningMessage");
          if (messageEl) {
            messageEl.textContent =
              "No data source is currently enabled. Only one external data source can be enabled at a time. Enable either Business Data or Google Sheets/CSV to use external data.";
          }
        }
      }
    } catch (error) {
      console.error("🚨 Error updating mutual exclusivity states:", error);
    }
  }

  /**
   * Update local CSV visual states
   */
  updateLocalCSVStates(container) {
    try {
      const useLocalCSVToggle = container.querySelector("#useLocalCSV");
      const googleSheetUrlField = container.querySelector("#googleSheetUrl");
      const localCSVFile = container.querySelector("#localCSVFile");
      const localCSVDirectory = container.querySelector("#localCSVDirectory");

      if (useLocalCSVToggle?.checked) {
        // Local CSV mode - disable Google Sheets URL, enable local fields
        if (googleSheetUrlField) {
          googleSheetUrlField.disabled = true;
          googleSheetUrlField.parentNode.style.opacity = "0.6";
        }
        if (localCSVFile) {
          localCSVFile.disabled = false;
          localCSVFile.parentNode.style.opacity = "1";
        }
        if (localCSVDirectory) {
          localCSVDirectory.disabled = false;
          localCSVDirectory.parentNode.style.opacity = "1";
        }
      } else {
        // Google Sheets mode - enable Google Sheets URL, disable local fields
        if (googleSheetUrlField) {
          googleSheetUrlField.disabled = false;
          googleSheetUrlField.parentNode.style.opacity = "1";
        }
        if (localCSVFile) {
          localCSVFile.disabled = true;
          localCSVFile.parentNode.style.opacity = "0.6";
        }
        if (localCSVDirectory) {
          localCSVDirectory.disabled = true;
          localCSVDirectory.parentNode.style.opacity = "0.6";
        }
      }
    } catch (error) {
      console.error("🚨 Error updating local CSV states:", error);
    }
  }

  /**
   * Disable/enable section inputs
   */
  disableSectionInputs(section, disable) {
    try {
      // Get all form inputs in the section
      const inputs = section.querySelectorAll("input, textarea, select, button");

      inputs.forEach((input) => {
        // Skip the main toggle switches - they should remain enabled
        if (input.id !== "useBusinessData" && input.id !== "useGoogleSheetData") {
          input.disabled = disable;

          // Add visual feedback for disabled state
          if (disable) {
            input.classList.add("disabled-input");

            // For toggles, add additional styling
            if (input.type === "checkbox") {
              const toggleLabel = input.closest(".toggle-switch")?.querySelector(".toggle-label");
              if (toggleLabel) {
                toggleLabel.classList.add("disabled-label");
              }
            }
          } else {
            input.classList.remove("disabled-input");

            // Remove disabled styling from toggles
            if (input.type === "checkbox") {
              const toggleLabel = input.closest(".toggle-switch")?.querySelector(".toggle-label");
              if (toggleLabel) {
                toggleLabel.classList.remove("disabled-label");
              }
            }
          }
        }
      });

      // Add visual cue to section headers
      const sectionHeader = section.querySelector(".section-header");
      if (sectionHeader) {
        if (disable) {
          sectionHeader.classList.add("disabled-header");
        } else {
          sectionHeader.classList.remove("disabled-header");
        }
      }
    } catch (error) {
      console.error("🚨 Error disabling section inputs:", error);
    }
  }

  /**
   * Update toggle state with visual feedback
   */
  updateToggleState(toggle, checked) {
    try {
      toggle.checked = checked;
      const formGroup = toggle.closest(".form-group");
      if (formGroup) {
        formGroup.classList.add("auto-changed");
        setTimeout(() => {
          formGroup.classList.remove("auto-changed");
        }, 600);
      }
    } catch (error) {
      console.error("🚨 Error updating toggle state:", error);
    }
  }

  /**
   * Setup reset button handlers
   */
  setupResetButtonHandlers(container) {
    try {
      const resetButtons = container.querySelectorAll(".reset-section-button");
      resetButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          const section = button.dataset.section;
          if (section === "businessData") {
            this.resetBusinessDataToDefaults(container);
          } else if (section === "googleSheets") {
            this.resetGoogleSheetsToDefaults(container);
          } else if (section === "csvParsing") {
            this.resetCSVParsingToDefaults(container);
          } else if (section === "caching") {
            this.resetCachingToDefaults(container);
          }
        });
      });
      console.log(`🔄 Reset button handlers set up for ${resetButtons.length} buttons`);
    } catch (error) {
      console.error("🚨 Error setting up reset button handlers:", error);
    }
  }

  /**
   * Reset Business Data section to defaults
   */
  resetBusinessDataToDefaults(container) {
    try {
      const defaults = this.core.getDefaultConfig().businessData || {};

      // Reset business data options
      if (!this.core.config.businessData) {
        this.core.config.businessData = {};
      }

      this.core.config.businessData.useBusinessData =
        defaults.useBusinessData !== undefined ? defaults.useBusinessData : false;
      this.core.config.businessData.replaceTourData =
        defaults.replaceTourData !== undefined ? defaults.replaceTourData : false;
      this.core.config.businessData.includeStandaloneEntries =
        defaults.includeStandaloneEntries !== undefined ? defaults.includeStandaloneEntries : false;
      this.core.config.businessData.businessDataFile = defaults.businessDataFile || "business.json";
      this.core.config.businessData.businessDataDir = defaults.businessDataDir || "business-data";
      this.core.config.businessData.matchField = defaults.matchField || "id";

      // Update form
      this.populateDataSourcesForm(container);

      if (this.core.showToast) {
        this.core.showToast(
          "success",
          "Reset Complete",
          "Business Data settings reset to defaults"
        );
      }
      console.log("🔄 Business Data settings reset to defaults");
    } catch (error) {
      console.error("🚨 Error resetting business data settings:", error);
    }
  }

  /**
   * Reset Google Sheets section to defaults
   */
  resetGoogleSheetsToDefaults(container) {
    try {
      const defaults = this.core.getDefaultConfig().googleSheets || {};

      // Reset Google Sheets options
      if (!this.core.config.googleSheets) {
        this.core.config.googleSheets = {};
      }

      this.core.config.googleSheets.useGoogleSheetData =
        defaults.useGoogleSheetData !== undefined ? defaults.useGoogleSheetData : false;
      this.core.config.googleSheets.includeStandaloneEntries =
        defaults.includeStandaloneEntries !== undefined ? defaults.includeStandaloneEntries : false;
      this.core.config.googleSheets.useAsDataSource =
        defaults.useAsDataSource !== undefined ? defaults.useAsDataSource : false;
      this.core.config.googleSheets.googleSheetUrl = defaults.googleSheetUrl || "";
      this.core.config.googleSheets.useLocalCSV =
        defaults.useLocalCSV !== undefined ? defaults.useLocalCSV : false;
      this.core.config.googleSheets.localCSVFile = defaults.localCSVFile || "search-data.csv";
      this.core.config.googleSheets.localCSVDir = defaults.localCSVDir || "business-data";

      // Update form
      this.populateDataSourcesForm(container);

      if (this.core.showToast) {
        this.core.showToast(
          "success",
          "Reset Complete",
          "Google Sheets settings reset to defaults"
        );
      }
      console.log("🔄 Google Sheets settings reset to defaults");
    } catch (error) {
      console.error("🚨 Error resetting Google Sheets settings:", error);
    }
  }

  /**
   * Reset CSV Parsing section to defaults
   */
  resetCSVParsingToDefaults(container) {
    try {
      const defaults = this.core.getDefaultConfig().googleSheets?.csvOptions || {};

      // Reset CSV parsing options
      if (!this.core.config.googleSheets) {
        this.core.config.googleSheets = {};
      }
      if (!this.core.config.googleSheets.csvOptions) {
        this.core.config.googleSheets.csvOptions = {};
      }

      this.core.config.googleSheets.csvOptions.header =
        defaults.header !== undefined ? defaults.header : true;
      this.core.config.googleSheets.csvOptions.skipEmptyLines =
        defaults.skipEmptyLines !== undefined ? defaults.skipEmptyLines : true;
      this.core.config.googleSheets.csvOptions.dynamicTyping =
        defaults.dynamicTyping !== undefined ? defaults.dynamicTyping : true;

      // Update form
      this.populateDataSourcesForm(container);

      if (this.core.showToast) {
        this.core.showToast("success", "Reset Complete", "CSV Parsing settings reset to defaults");
      }
      console.log("🔄 CSV Parsing settings reset to defaults");
    } catch (error) {
      console.error("🚨 Error resetting CSV parsing settings:", error);
    }
  }

  /**
   * Reset Caching section to defaults
   */
  resetCachingToDefaults(container) {
    try {
      const defaults = this.core.getDefaultConfig().googleSheets?.caching || {};

      // Reset caching options
      if (!this.core.config.googleSheets) {
        this.core.config.googleSheets = {};
      }
      if (!this.core.config.googleSheets.caching) {
        this.core.config.googleSheets.caching = {};
      }

      this.core.config.googleSheets.caching.enabled =
        defaults.enabled !== undefined ? defaults.enabled : false;
      this.core.config.googleSheets.caching.timeoutMinutes = defaults.timeoutMinutes || 60;
      this.core.config.googleSheets.caching.storageKey =
        defaults.storageKey || "tourGoogleSheetsData";

      // Update form
      this.populateDataSourcesForm(container);

      if (this.core.showToast) {
        this.core.showToast("success", "Reset Complete", "Caching settings reset to defaults");
      }
      console.log("🔄 Caching settings reset to defaults");
    } catch (error) {
      console.error("🚨 Error resetting caching settings:", error);
    }
  }

  /**
   * Handle tab-specific form changes
   */
  onFormChange(input) {
    try {
      const fieldName = input.name || input.id;

      // Handle mutual exclusivity
      if (fieldName === "businessData.useBusinessData" || fieldName === "useBusinessData") {
        this.updateMutualExclusivityStates(document.getElementById("data-sources-panel"));
      } else if (
        fieldName === "googleSheets.useGoogleSheetData" ||
        fieldName === "useGoogleSheetData"
      ) {
        this.updateMutualExclusivityStates(document.getElementById("data-sources-panel"));
      } else if (fieldName === "googleSheets.useLocalCSV" || fieldName === "useLocalCSV") {
        this.updateLocalCSVStates(document.getElementById("data-sources-panel"));
      }

      // Let core handle the basic form change
      this.core.onFormChange(input);

      console.log(`💾 Data Sources form change: ${fieldName} = ${input.value || input.checked}`);
    } catch (error) {
      console.error("🚨 Security: Error handling Data Sources tab form change:", error);
    }
  }

  /**
   * Validate fields specific to Data Sources tab
   */
  validateField(field) {
    try {
      const value = field.type === "checkbox" ? field.checked : field.value;
      const fieldName = this.core.sanitizeInput(field.name || field.id, 100);
      let isValid = true;

      // Call base validation first
      isValid = this.core.validateField(field);

      // Custom validation rules for Data Sources tab fields
      if (fieldName.includes("googleSheetUrl") && value) {
        // Validate Google Sheets URL format
        const isValidUrl = /^https:\/\/docs\.google\.com\/spreadsheets\//.test(value);
        if (!isValidUrl) {
          isValid = false;
        }
      } else if (fieldName.includes("timeoutMinutes")) {
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 1 || numValue > 1440) {
          isValid = false;
        }
      } else if (fieldName.includes("File") && value) {
        // Basic filename validation
        if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
          isValid = false;
        }
      }

      // Apply validation styling
      if (!isValid) {
        field.classList.add("error");
      } else {
        field.classList.remove("error");
        field.classList.add("valid");
      }

      return isValid;
    } catch (error) {
      console.error("🚨 Security: Error in Data Sources tab field validation:", error);
      return false;
    }
  }

  /**
   * Validate entire form for Data Sources tab
   */
  validateForm(container = document) {
    try {
      const formInputs = container.querySelectorAll(
        ".form-input, .toggle-input, .range-input, .form-select"
      );
      let isValid = true;

      formInputs.forEach((input) => {
        if (!this.validateField(input)) {
          isValid = false;
        }
      });

      console.log(`💾 Data Sources tab validation: ${isValid ? "PASSED" : "FAILED"}`);
      return isValid;
    } catch (error) {
      console.error("🚨 Security: Error validating Data Sources tab form:", error);
      return false;
    }
  }

  /**
   * Apply live preview for Data Sources tab changes
   */
  applyLivePreview(fieldName, value) {
    try {
      // Create preview config
      const previewConfig = JSON.parse(JSON.stringify(this.core.config));
      this.core.safeSetNestedProperty(previewConfig, fieldName, value);

      // Store preview config
      this.core.safeLocalStorageSet("searchProLiveConfig", previewConfig);

      // Notify parent of preview update
      if (window.parent && window.parent !== window) {
        try {
          window.parent.postMessage(
            {
              type: "searchProConfigPreview",
              config: previewConfig,
              field: this.core.sanitizeInput(fieldName),
              value: typeof value === "string" ? this.core.sanitizeInput(value) : value,
              section: "data-sources",
            },
            "*"
          );
        } catch (postError) {
          console.warn("🚨 Security: Error posting message to parent:", postError);
        }
      }

      console.log(`💾 Data Sources live preview: ${fieldName} = ${value}`);
    } catch (error) {
      console.warn("🚨 Security: Data Sources tab live preview failed:", error);
    }
  }

  /**
   * Reset Data Sources tab to defaults
   */
  resetToDefaults() {
    try {
      console.log("🔄 Resetting Data Sources tab to defaults");

      const defaults = this.core.getDefaultConfig();

      // Reset data sources settings
      if (defaults.businessData) {
        this.core.config.businessData = JSON.parse(JSON.stringify(defaults.businessData));
      }
      if (defaults.googleSheets) {
        this.core.config.googleSheets = JSON.parse(JSON.stringify(defaults.googleSheets));
      }

      // Update form fields
      const container = document.getElementById("data-sources-panel");
      if (container) {
        this.populateDataSourcesForm(container);
      }

      console.log("✅ Data Sources tab reset complete");
    } catch (error) {
      console.error("🚨 Security: Error resetting Data Sources tab:", error);
    }
  }

  /**
   * Get Data Sources tab configuration summary
   */
  getConfigSummary() {
    try {
      return {
        tab: "Data Sources",
        sections: {
          businessData: this.core.config.businessData || {},
          googleSheets: this.core.config.googleSheets || {},
        },
      };
    } catch (error) {
      console.error("🚨 Security: Error getting Data Sources tab config summary:", error);
      return null;
    }
  }

  /**
   * Cleanup resources when tab is unloaded
   */
  cleanup() {
    try {
      // Clean up any resources specific to Data Sources tab
      console.log("🧹 Data Sources tab handler cleaned up");
    } catch (error) {
      console.error("🚨 Security: Error cleaning up Data Sources tab:", error);
    }
  }

  /**
   * Update configuration from form values for Data Sources tab
   * @param {HTMLElement} container The data sources tab container element
   */
  updateConfigFromForm(container) {
    try {
      // Handle all standard form inputs
      const formInputs = container.querySelectorAll("[name]");

      formInputs.forEach((input) => {
        const name = input.getAttribute("name");
        if (!name) return;

        let value;

        if (input.type === "checkbox") {
          value = input.checked;
        } else if (input.type === "number") {
          value = input.value === "" ? null : parseInt(input.value);
        } else {
          value = input.value;
        }

        // Set property safely
        this.core.safeSetNestedProperty(this.core.config, name, value);
      });

      console.log("💾 Data Sources tab config updated from form");
    } catch (error) {
      console.error("🚨 Security: Error updating config from Data Sources tab form:", error);
    }
  }
}

// Export for module use
if (typeof module !== "undefined" && module.exports) {
  module.exports = DataSourcesTabHandler;
} else {
  window.DataSourcesTabHandler = DataSourcesTabHandler;
}
