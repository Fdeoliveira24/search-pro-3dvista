/**
 * Search Pro Control Panel - General Tab Handler
 * Handles all functionality specific to the General settings tab
 * with improved integration for the 3DVista search plugin
 */

class GeneralTabHandler {
  constructor() {
    this.core = null;
    this.tabId = "general";
    this.formUpdateTimeout = null;
  }

  /**
   * Set the core instance
   */
  setCore(core) {
    this.core = core;
  }

  /**
   * Initialize general tab functionality
   */
  init(container) {
    try {
      console.log("🚀 Initializing General tab handler");

      // Setup form listeners
      this.core.setupFormListeners(container);

      // Setup general tab specific features
      this.setupMobileOverridesToggle(container);
      this.setupWidthValidation(container);
      this.setupRangeInputs(container);

      // Populate form with current values
      this.core.populateForm(container);

      // Setup reset button handlers
      this.setupResetButtonHandlers(container);

      // Validate all fields
      this.validateForm(container);

      console.log("✅ General tab handler initialized");
    } catch (error) {
      console.error("❌ Error initializing General tab:", error);
    }
  }

  /**
   * Enhanced mobile overrides toggle
   */
  setupMobileOverridesToggle(container = document) {
    try {
      const mobileOverridesToggle = container.querySelector(
        "#mobileOverridesEnabled"
      );
      const mobilePositionGrid = container.querySelector("#mobilePositionGrid");

      if (!mobileOverridesToggle || !mobilePositionGrid) return;

      const toggleMobileGrid = () => {
        if (mobileOverridesToggle.checked) {
          mobilePositionGrid.classList.remove("disabled");
          mobilePositionGrid.querySelectorAll("input").forEach((input) => {
            input.disabled = false;
          });
        } else {
          mobilePositionGrid.classList.add("disabled");
          mobilePositionGrid.querySelectorAll("input").forEach((input) => {
            input.disabled = true;
          });
        }
      };

      mobileOverridesToggle.addEventListener("change", toggleMobileGrid);

      // Initialize state
      toggleMobileGrid();

      console.log("📱 Mobile overrides toggle setup complete");
    } catch (error) {
      console.error(
        "🚨 Security: Error setting up mobile overrides toggle:",
        error
      );
    }
  }

  /**
   * Setup width validation for form inputs with improved percentage support
   */
  setupWidthValidation(container = document) {
    try {
      const widthInputs = container.querySelectorAll(".width-input");

      widthInputs.forEach((input) => {
        input.addEventListener("input", (e) => {
          const value = this.core.sanitizeInput(e.target.value);
          
          // Enhanced validation: Supports px, %, em, rem, vw
          const isValid = /^\d+(%|px|em|rem|vw)?$/.test(value);

          if (!isValid && value !== "") {
            e.target.classList.add("error");
            e.target.classList.remove("valid");
            
            // Show validation message
            window.showValidationMessage(
              e.target, 
              "error", 
              "Enter a valid width (e.g., 350px or 100%)",
              3000
            );
          } else {
            e.target.classList.remove("error");
            e.target.classList.add("valid");
            window.clearValidationMessage(e.target.id);
            
            // Preview width changes
            this.handleWidthChange(e.target);
          }
        });
        
        // Handle blur event for final validation
        input.addEventListener("blur", (e) => {
          const value = this.core.sanitizeInput(e.target.value);
          
          // If no unit is specified, default to px
          if (/^\d+$/.test(value)) {
            e.target.value = `${value}px`;
            this.handleWidthChange(e.target);
          }
        });
      });

      console.log(
        `✅ Enhanced width validation set up for ${widthInputs.length} inputs`
      );
    } catch (error) {
      console.error("🚨 Security: Error setting up width validation:", error);
    }
  }
  
  /**
   * Handle width input changes with proper conversion
   */
  handleWidthChange(input) {
    try {
      const value = this.core.sanitizeInput(input.value);
      const fieldName = input.name || input.id;
      
      // Parse the width value
      let processedValue = value;
      
      // If it's a pixel value, convert to number for storage
      if (typeof value === "string" && value.endsWith("px")) {
        const numValue = parseInt(value.replace("px", ""), 10);
        if (!isNaN(numValue)) {
          processedValue = numValue;
        }
      }
      
      // Update the configuration
      this.core.safeSetNestedProperty(this.core.config, fieldName, processedValue);
      
      // Apply live preview after a short delay
      clearTimeout(this.formUpdateTimeout);
      this.formUpdateTimeout = setTimeout(() => {
        this.applyLivePreview(fieldName, processedValue);
      }, 300);
      
      console.log(`📏 Width updated: ${fieldName} = ${processedValue}`);
    } catch (error) {
      console.error("🚨 Error handling width change:", error);
    }
  }

  /**
   * Setup range inputs with value display
   */
  setupRangeInputs(container = document) {
    try {
      const rangeInputs = container.querySelectorAll('input[type="range"]');
      
      rangeInputs.forEach(input => {
        // Check if value display already exists
        if (!input.parentNode.querySelector('.range-value')) {
          const valueDisplay = document.createElement('span');
          valueDisplay.className = 'range-value';
          valueDisplay.textContent = input.value;
          
          input.parentNode.appendChild(valueDisplay);
          
          input.addEventListener('input', () => {
            valueDisplay.textContent = input.value;
          });
        }
      });
      
      console.log(`✅ Range inputs setup for ${rangeInputs.length} elements`);
    } catch (error) {
      console.error("🚨 Error setting up range inputs:", error);
    }
  }

  /**
   * Validate fields specific to General tab with enhanced validation
   */
  validateField(field) {
    try {
      const value = field.type === "checkbox" ? field.checked : field.value;
      const fieldName = this.core.sanitizeInput(field.name || field.id, 100);
      let isValid = true;
      let errorMessage = "";

      // Call base validation first
      isValid = this.core.validateField(field);

      // Custom validation rules for General tab fields
      switch (fieldName) {
        case "searchBar.placeholder":
        case "searchPlaceholder":
          if (!value || value.trim() === "") {
            isValid = false;
            errorMessage = "Placeholder text is required";
          } else if (value.length > 100) {
            isValid = false;
            errorMessage = "Placeholder text must be 100 characters or less";
          }
          break;

        case "mobileBreakpoint":
          if (value < 320) {
            isValid = false;
            errorMessage =
              "Mobile breakpoint should be at least 320px for device compatibility";
          } else if (value > 1200) {
            isValid = false;
            errorMessage = "Mobile breakpoint should not exceed 1200px";
          }
          break;

        case "minSearchChars":
        case "minSearchLength":
          if (value < 1) {
            isValid = false;
            errorMessage = "Must require at least 1 character";
          } else if (value > 5) {
            isValid = false;
            errorMessage =
              "Requiring more than 5 characters may hurt usability";
          }
          break;

        case "searchBar.width":
        case "searchWidth":
          if (typeof value === "string" && value.includes("px")) {
            const numValue = parseInt(value.replace("px", ""));
            if (numValue < 200) {
              isValid = false;
              errorMessage = "Width should be at least 200px for usability";
            } else if (numValue > 800) {
              isValid = false;
              errorMessage =
                "Width should not exceed 800px to avoid layout issues";
            }
          } else if (typeof value === "string" && value.includes("%")) {
            const numValue = parseInt(value.replace("%", ""));
            if (numValue < 10) {
              isValid = false;
              errorMessage = "Percentage width should be at least 10%";
            } else if (numValue > 100) {
              isValid = false;
              errorMessage = "Percentage width cannot exceed 100%";
            }
          }
          break;

        case "elementTriggering.initialDelay":
        case "initialDelay":
          if (value > 2000) {
            isValid = false;
            errorMessage = "Delays over 2 seconds may feel unresponsive";
          }
          break;

        case "elementTriggering.maxRetries":
        case "maxRetries":
          if (value > 10) {
            isValid = false;
            errorMessage = "Too many retries may cause performance issues";
          }
          break;
      }

      // Apply validation styling
      if (!isValid) {
        field.classList.add("error");
        field.classList.remove("valid");
        
        // Show validation message with the error
        if (typeof window.showValidationMessage === "function") {
          window.showValidationMessage(field, "error", errorMessage, 5000);
        }
        
        console.log(
          `⚠️ General tab validation: ${fieldName} - ${errorMessage}`
        );
      } else {
        field.classList.remove("error");
        field.classList.add("valid");
        
        // Clear any validation message
        if (typeof window.clearValidationMessage === "function") {
          window.clearValidationMessage(field.id);
        }
      }

      return isValid;
    } catch (error) {
      console.error(
        "🚨 Security: Error in General tab field validation:",
        error
      );
      return false;
    }
  }

  /**
   * Validate entire form for General tab
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

      console.log(
        `📋 General tab validation: ${isValid ? "PASSED" : "FAILED"}`
      );
      return isValid;
    } catch (error) {
      console.error("🚨 Security: Error validating General tab form:", error);
      return false;
    }
  }

  /**
   * Handle tab-specific form changes with improved property mapping
   */
  onFormChange(input) {
    try {
      // Let core handle the basic form change
      this.core.onFormChange(input);

      // Handle any General tab specific logic
      const fieldName = input.name || input.id;

      // Property name mapping for search plugin compatibility
      if (fieldName === "minSearchChars") {
        // Also update minSearchLength for compatibility with search plugin
        this.core.safeSetNestedProperty(
          this.core.config,
          "minSearchLength",
          input.value
        );
        console.log(`📝 Updated minSearchLength to match minSearchChars: ${input.value}`);
      }

      // Special handling for mobile overrides toggle
      if (
        fieldName === "searchBar.mobileOverrides.enabled" ||
        fieldName === "mobileOverridesEnabled"
      ) {
        this.setupMobileOverridesToggle();
      }

      // Special handling for width fields
      if (fieldName === "searchBar.width" || fieldName === "searchWidth") {
        this.handleWidthChange(input);
      }
    } catch (error) {
      console.error(
        "🚨 Security: Error handling General tab form change:",
        error
      );
    }
  }

  /**
   * Handle tab-specific input events
   */
  onFormInput(input) {
    try {
      // Validate field in real-time
      this.validateField(input);

      // Handle any specific input behaviors for General tab
      const fieldName = input.name || input.id;

      if (fieldName === "searchBar.width" || fieldName === "searchWidth") {
        // Real-time width validation feedback
        const value = this.core.sanitizeInput(input.value);
        const isValid = /^\d+(%|px|em|rem|vw)?$/.test(value);

        if (!isValid && value !== "") {
          input.classList.add("error");
          input.classList.remove("valid");
        } else {
          input.classList.remove("error");
          input.classList.add("valid");
        }
      }
      
      // Update range value displays
      if (input.type === "range") {
        const valueDisplay = input.parentNode.querySelector('.range-value');
        if (valueDisplay) {
          valueDisplay.textContent = input.value;
        }
      }
    } catch (error) {
      console.error(
        "🚨 Security: Error handling General tab form input:",
        error
      );
    }
  }
  
  /**
   * Update config from form values specifically for General tab
   */
  updateConfigFromForm(container = document) {
    try {
      const formInputs = container.querySelectorAll("[name]");
      
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
        
        // Property name mapping for search plugin compatibility
        if (name === "minSearchChars") {
          this.core.safeSetNestedProperty(
            this.core.config,
            "minSearchLength",
            value
          );
        }
      });
      
      console.log("📝 General tab config updated from form");
    } catch (error) {
      console.error(
        "🚨 Security: Error updating config from General tab form:",
        error
      );
    }
  }

  /**
   * Apply live preview for General tab changes
   */
  applyLivePreview(fieldName, value) {
    try {
      // For general tab, most changes affect positioning and basic behavior
      // Create preview config
      const previewConfig = JSON.parse(JSON.stringify(this.core.config));
      this.core.safeSetNestedProperty(previewConfig, fieldName, value);
      
      // Special handling for minSearchChars -> minSearchLength mapping
      if (fieldName === "minSearchChars") {
        this.core.safeSetNestedProperty(previewConfig, "minSearchLength", value);
      }

      // Store preview config
      this.core.safeLocalStorageSet("searchProLiveConfig", previewConfig);

      // Notify tour of preview update
      if (window.parent && window.parent !== window) {
        try {
          window.parent.postMessage(
            {
              type: "searchProConfigPreview",
              config: previewConfig,
              field: this.core.sanitizeInput(fieldName),
              value:
                typeof value === "string"
                  ? this.core.sanitizeInput(value)
                  : value,
            },
            "*"
          );
        } catch (postError) {
          console.warn(
            "🚨 Security: Error posting message to parent:",
            postError
          );
        }
      }

      console.log(`🔄 General tab live preview: ${fieldName} = ${value}`);
    } catch (error) {
      console.warn("🚨 Security: General tab live preview failed:", error);
    }
  }

  /**
   * Reset General tab to defaults
   */
  resetToDefaults() {
    try {
      console.log("🔄 Resetting General tab to defaults");

      const defaults = this.core.getDefaultConfig();

      // Reset general settings
      this.core.config.autoHide = { ...defaults.autoHide };
      this.core.config.mobileBreakpoint = defaults.mobileBreakpoint;
      this.core.config.minSearchChars = defaults.minSearchChars;
      this.core.config.minSearchLength = defaults.minSearchChars; // For plugin compatibility
      this.core.config.showTagsInResults = defaults.showTagsInResults;
      this.core.config.searchBar = { ...defaults.searchBar };
      this.core.config.elementTriggering = { ...defaults.elementTriggering };

      // Update form fields
      const container = document.getElementById("general-panel");
      if (container) {
        this.core.populateForm(container);
        this.setupMobileOverridesToggle(container);
      }

      console.log("✅ General tab reset complete");
    } catch (error) {
      console.error("🚨 Security: Error resetting General tab:", error);
    }
  }

  /**
   * Setup reset button handlers for the General tab
   */
  setupResetButtonHandlers(container) {
    try {
      const resetButtons = container.querySelectorAll('.reset-section-button');
      resetButtons.forEach((button) => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          const section = button.dataset.section;
          // For General tab, usually only one reset: the whole tab
          // But you can expand this if you add more resettable sections
          if (!section || section === "general") {
            this.resetToDefaults();
            if (this.core && typeof this.core.showToast === "function") {
              this.core.showToast(
                "success",
                "General Settings Reset",
                "General settings restored to defaults"
              );
            }
          }
        });
      });
      console.log(`🔄 Reset button handlers set up for ${resetButtons.length} buttons`);
    } catch (error) {
      console.error("🚨 Error setting up reset button handlers:", error);
    }
  }

  /**
   * Get General tab configuration summary
   */
  getConfigSummary() {
    try {
      return {
        tab: "General",
        sections: {
          autoHide: this.core.config.autoHide,
          searchBehavior: {
            mobileBreakpoint: this.core.config.mobileBreakpoint,
            minSearchChars: this.core.config.minSearchChars,
            minSearchLength: this.core.config.minSearchLength, 
            showTagsInResults: this.core.config.showTagsInResults
          },
          searchBar: this.core.config.searchBar,
          elementTriggering: this.core.config.elementTriggering,
        },
      };
    } catch (error) {
      console.error(
        "🚨 Security: Error getting General tab config summary:",
        error
      );
      return null;
    }
  }

  /**
   * Cleanup resources when tab is unloaded
   */
  cleanup() {
    try {
      // Clear any timeouts or intervals specific to General tab
      clearTimeout(this.formUpdateTimeout);
      
      console.log("🧹 General tab handler cleaned up");
    } catch (error) {
      console.error("🚨 Security: Error cleaning up General tab:", error);
    }
  }
}

// Export for module use
if (typeof module !== "undefined" && module.exports) {
  module.exports = GeneralTabHandler;
} else {
  window.GeneralTabHandler = GeneralTabHandler;
}