/**
 * Search Pro Control Panel - Advanced Tab Handler
 * Version 3.2 - Last Update on 11/01/2025 - Search Pro Configuration Loading - Google Sheets / CSV / Business JSON integration, runtime synchronization, Exact matches config, Silence Console Fix
 * Handles all functionality specific to the Advanced settings tab
 */

class AdvancedTabHandler {
  constructor() {
    this.core = null;
    this.tabId = "advanced";
    this.formUpdateTimeout = null;
    this.rangeUpdateTimeouts = new Map();
  }

  setCore(core) {
    this.core = core;
  }

  init(container) {
    try {
      console.log("🚀 ADVANCED TAB: Initializing Advanced tab handler");
      console.log("🚀 ADVANCED TAB: Container received:", container);

      // Apply core defaults first to prevent missing values
      this.applyAnimationDefaults(container);

      // Setup form listeners first
      this.core.setupFormListeners(container);

      // Setup advanced tab specific features
      this.setupRangeInputs(container);
      this.setupAnimationToggles(container);
      this.setupResetButtons(container);

      // Populate form with current values
      this.core.populateForm(container);

      // Update range displays after population
      this.updateAllRangeDisplays(container);

      // Validate all fields
      this.validateForm(container);

      console.log("✅ ADVANCED TAB: Advanced tab handler initialized successfully");
    } catch (error) {
      console.error("❌ ADVANCED TAB: Error initializing Advanced tab:", error);
      console.error("❌ ADVANCED TAB: Error stack:", error.stack);
    }
  }

  setupRangeInputs(container = document) {
    try {
      const rangeInputs = container.querySelectorAll('input[type="range"]');

      rangeInputs.forEach((input) => {
        // Find or create value display
        let valueDisplay = input.parentNode.querySelector(".range-value");
        if (!valueDisplay) {
          valueDisplay = document.createElement("span");
          valueDisplay.className = "range-value";
          input.parentNode.appendChild(valueDisplay);
        }

        // Initialize display value
        valueDisplay.textContent = input.value;

        // Add input listener for real-time updates
        input.addEventListener("input", (e) => {
          valueDisplay.textContent = e.target.value;

          // Debounced form change for performance
          const fieldName = e.target.name;
          if (this.rangeUpdateTimeouts.has(fieldName)) {
            clearTimeout(this.rangeUpdateTimeouts.get(fieldName));
          }

          this.rangeUpdateTimeouts.set(
            fieldName,
            setTimeout(() => {
              this.core.onFormChange(e.target);
            }, 150)
          );
        });

        // Add change listener for final value
        input.addEventListener("change", (e) => {
          this.core.onFormChange(e.target);
        });
      });

      console.log(`✅ Range inputs setup for ${rangeInputs.length} elements`);
    } catch (error) {
      console.error("🚨 Error setting up range inputs:", error);
    }
  }

  updateAllRangeDisplays(container = document) {
    try {
      const rangeInputs = container.querySelectorAll('input[type="range"]');

      rangeInputs.forEach((input) => {
        const valueDisplay = input.parentNode.querySelector(".range-value");
        if (valueDisplay) {
          valueDisplay.textContent = input.value;
        }
      });

      console.log("📊 Range displays updated");
    } catch (error) {
      console.error("🚨 Error updating range displays:", error);
    }
  }

  setupAnimationToggles(container = document) {
    try {
      const animationsEnabled = container.querySelector("#animationsEnabled");
      const animationSections = container.querySelectorAll(
        '.config-section[aria-labelledby*="animations"], .config-section[aria-labelledby*="reduced-motion"]'
      );

      if (!animationsEnabled) return;

      // Initialize animations config if it doesn't exist
      if (!this.core.config.animations) {
        this.core.config.animations = {};
      }

      const toggleAnimationSections = () => {
        const isEnabled = animationsEnabled.checked;

        // Update config
        this.core.config.animations.enabled = isEnabled;

        // If enabling animations, ensure we have proper defaults
        if (isEnabled) {
          this.applyAnimationDefaults(container);
        }

        animationSections.forEach((section) => {
          if (section.getAttribute("aria-labelledby") === "animation-settings-heading") {
            return; // Skip the main animation settings section
          }

          if (isEnabled) {
            section.classList.remove("disabled-animations");
            section.style.opacity = "1";
            section.style.pointerEvents = "auto";
            section.querySelectorAll("input, select").forEach((input) => {
              input.disabled = false;
            });
          } else {
            section.classList.add("disabled-animations");
            section.style.opacity = "0.5";
            section.style.pointerEvents = "none";
            section.querySelectorAll("input, select").forEach((input) => {
              input.disabled = true;
            });
          }
        });
      };

      animationsEnabled.addEventListener("change", toggleAnimationSections);

      // Initialize state
      toggleAnimationSections();

      console.log("📱 Animation toggles setup complete");
    } catch (error) {
      console.error("🚨 Error setting up animation toggles:", error);
    }
  }

  applyAnimationDefaults(container) {
    try {
      // Core animation defaults from search-v3.js
      const coreDefaults = {
        duration: {
          fast: 200,
          normal: 300,
          slow: 500,
        },
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        searchBar: {
          openDuration: 300,
          closeDuration: 200,
          scaleEffect: true,
        },
        results: {
          fadeInDuration: 200,
          slideDistance: 10,
          staggerDelay: 50,
        },
        reducedMotion: {
          respectPreference: true,
          fallbackDuration: 100,
        },
      };

      // Initialize animations config if it doesn't exist
      if (!this.core.config.animations) {
        this.core.config.animations = {};
      }

      // Apply defaults to config if values are missing/null/undefined
      if (!this.core.config.animations.duration) {
        this.core.config.animations.duration = { ...coreDefaults.duration };
      } else {
        Object.keys(coreDefaults.duration).forEach((key) => {
          if (
            this.core.config.animations.duration[key] === null ||
            this.core.config.animations.duration[key] === undefined ||
            this.core.config.animations.duration[key] === ""
          ) {
            this.core.config.animations.duration[key] = coreDefaults.duration[key];
          }
        });
      }

      if (!this.core.config.animations.easing || this.core.config.animations.easing === "") {
        this.core.config.animations.easing = coreDefaults.easing;
      }

      if (!this.core.config.animations.searchBar) {
        this.core.config.animations.searchBar = { ...coreDefaults.searchBar };
      } else {
        Object.keys(coreDefaults.searchBar).forEach((key) => {
          if (
            this.core.config.animations.searchBar[key] === null ||
            this.core.config.animations.searchBar[key] === undefined ||
            this.core.config.animations.searchBar[key] === ""
          ) {
            this.core.config.animations.searchBar[key] = coreDefaults.searchBar[key];
          }
        });
      }

      if (!this.core.config.animations.results) {
        this.core.config.animations.results = { ...coreDefaults.results };
      } else {
        Object.keys(coreDefaults.results).forEach((key) => {
          if (
            this.core.config.animations.results[key] === null ||
            this.core.config.animations.results[key] === undefined ||
            this.core.config.animations.results[key] === ""
          ) {
            this.core.config.animations.results[key] = coreDefaults.results[key];
          }
        });
      }

      if (!this.core.config.animations.reducedMotion) {
        this.core.config.animations.reducedMotion = { ...coreDefaults.reducedMotion };
      } else {
        Object.keys(coreDefaults.reducedMotion).forEach((key) => {
          if (
            this.core.config.animations.reducedMotion[key] === null ||
            this.core.config.animations.reducedMotion[key] === undefined ||
            this.core.config.animations.reducedMotion[key] === ""
          ) {
            this.core.config.animations.reducedMotion[key] = coreDefaults.reducedMotion[key];
          }
        });
      }

      // Update form fields with defaults
      this.core.populateForm(container);
      this.updateAllRangeDisplays(container);

      console.log("✅ Applied animation defaults:", this.core.config.animations);
    } catch (error) {
      console.error("🚨 Error applying animation defaults:", error);
    }
  }

  setupResetButtons(container) {
    try {
      const resetButtons = container.querySelectorAll(".reset-section-button");
      console.log(`🔍 Found ${resetButtons.length} reset buttons in Advanced tab`);

      resetButtons.forEach((button, index) => {
        const section = button.dataset.section;
        console.log(`🔄 Setting up reset button ${index + 1}: section="${section}"`);

        // Remove any existing listeners to prevent duplicates
        button.removeEventListener("click", this.handleResetClick);

        // Add new listener
        const clickHandler = (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`🔄 Reset button clicked for section: ${section}`);
          this.resetSection(section, container);
        };

        button.addEventListener("click", clickHandler);
        button.style.cursor = "pointer"; // Ensure cursor shows clickable
      });

      console.log(`✅ Reset button handlers set up for ${resetButtons.length} buttons`);
    } catch (error) {
      console.error("🚨 Error setting up reset button handlers:", error);
    }
  }

  resetSection(section, container) {
    try {
      console.log(`🔄 Resetting section: ${section}`);
      const defaults = this.core.getDefaultConfig();

      if (!defaults) {
        console.error("❌ No default config available");
        this.core.showToast("error", "Reset Failed", "Unable to load default configuration");
        return;
      }

      if (section === "animations") {
        // Reset animation settings
        this.core.config.animations = { ...defaults.animations };

        // Update form fields for animations
        const animationFields = container.querySelectorAll('[name^="animations."]');
        animationFields.forEach((field) => {
          const value = this.core.getNestedProperty(this.core.config, field.name);
          if (field.type === "checkbox") {
            field.checked = Boolean(value);
          } else if (field.type === "range") {
            field.value = value;
            const valueDisplay = field.parentNode.querySelector(".range-value");
            if (valueDisplay) {
              valueDisplay.textContent = value;
            }
          } else {
            field.value = value;
          }
        });

        // Re-setup animation toggles
        this.setupAnimationToggles(container);

        this.core.showToast(
          "success",
          "Animation Settings Reset",
          "Animation settings restored to defaults"
        );
      }

      console.log(`✅ Section ${section} reset to defaults`);
    } catch (error) {
      console.error(`🚨 Error resetting section ${section}:`, error);
    }
  }

  validateField(field) {
    try {
      // Get the proper value based on field type
      let value;
      if (field.type === "checkbox") {
        value = field.checked;
      } else if (field.type === "number" || field.type === "range") {
        // Convert to number for proper validation
        value = field.value === "" ? null : parseFloat(field.value);
      } else {
        value = field.value;
      }

      const fieldName = this.core.sanitizeInput(field.name || field.id, 100);
      let isValid = true;
      let errorMessage = "";

      // Call base validation first
      isValid = this.core.validateField(field);

      // Skip custom validation if field is empty and not required
      if (value === null || value === "") {
        // For number fields, check if they have a minimum requirement
        if (field.type === "number" && field.hasAttribute("min")) {
          const min = parseFloat(field.getAttribute("min"));
          if (!isNaN(min)) {
            isValid = false;
            errorMessage = `Value must be at least ${min}`;
          }
        }
      } else {
        // Custom validation rules for Advanced tab fields
        switch (true) {
          case fieldName.includes("duration") || fieldName.includes("Duration"):
            if (value !== null && !isNaN(value)) {
              if (value < 10) {
                isValid = false;
                errorMessage = "Duration should be at least 10ms";
              } else if (value > 5000) {
                isValid = false;
                errorMessage = "Duration should not exceed 5000ms for performance";
              }
            }
            break;

          case fieldName.includes("Distance") || fieldName.includes("distance"):
            if (value !== null && !isNaN(value)) {
              if (value < 1) {
                isValid = false;
                errorMessage = "Distance must be at least 1";
              } else if (value > 100) {
                isValid = false;
                errorMessage = "Distance should not exceed 100 for performance";
              } else if (value < 10 || value > 80) {
                // Show warning for extreme values but don't fail validation
                if (typeof window.showValidationMessage === "function") {
                  window.showValidationMessage(
                    field,
                    "warning",
                    value < 10
                      ? "Very strict distance - may miss close matches"
                      : "Very loose distance - may hurt search performance",
                    3000
                  );
                }
              }
            }
            break;

          case fieldName.includes("threshold"):
            if (value !== null && !isNaN(value)) {
              if (value < 0 || value > 1) {
                isValid = false;
                errorMessage = "Threshold must be between 0.0 and 1.0";
              } else if (value < 0.2 || value > 0.8) {
                // Show warning for extreme values but don't fail validation
                if (typeof window.showValidationMessage === "function") {
                  window.showValidationMessage(
                    field,
                    "warning",
                    value < 0.2
                      ? "Very strict matching - may miss relevant results"
                      : "Very loose matching - may return irrelevant results",
                    3000
                  );
                }
              }
            }
            break;

          case fieldName.includes("Weight") || fieldName.includes("weight"):
            if (value !== null && !isNaN(value)) {
              if (value < 0 || value > 1) {
                isValid = false;
                errorMessage = "Weight must be between 0.0 and 1.0";
              }
            }
            break;

          case fieldName.includes("boost") || fieldName.includes("Boost"):
            if (value !== null && !isNaN(value)) {
              if (value < 0.1) {
                isValid = false;
                errorMessage = "Boost value should be at least 0.1";
              } else if (value > 10) {
                isValid = false;
                errorMessage = "Boost value should not exceed 10 to avoid skewing results";
              } else if (value > 5) {
                // Show warning for very high boost values
                if (typeof window.showValidationMessage === "function") {
                  window.showValidationMessage(
                    field,
                    "warning",
                    "Very high boost values may skew search results",
                    3000
                  );
                }
              }
            }
            break;

          case fieldName.includes("minMatchCharLength"):
            if (value !== null && !isNaN(value)) {
              if (value < 1) {
                isValid = false;
                errorMessage = "Must require at least 1 character";
              } else if (value > 5) {
                isValid = false;
                errorMessage = "Maximum allowed is 5 characters to maintain usability";
              } else if (value > 3) {
                // Show warning for higher values but don't fail validation
                if (typeof window.showValidationMessage === "function") {
                  window.showValidationMessage(
                    field,
                    "warning",
                    "High values may make search less responsive",
                    3000
                  );
                }
              }
            }
            break;
        }
      }

      // Apply validation styling
      if (!isValid) {
        field.classList.add("error");
        field.classList.remove("valid");

        if (typeof window.showValidationMessage === "function") {
          window.showValidationMessage(field, "error", errorMessage, 5000);
        }
      } else {
        field.classList.remove("error");
        field.classList.add("valid");

        if (typeof window.clearValidationMessage === "function") {
          window.clearValidationMessage(field.id);
        }
      }

      return isValid;
    } catch (error) {
      console.error("🚨 Error in Advanced tab field validation:", error);
      return false;
    }
  }

  validateForm(container = document) {
    try {
      const formInputs = container.querySelectorAll(
        ".form-input, .toggle-input, .range-input, .form-select"
      );
      let isValid = true;
      const failedFields = [];

      formInputs.forEach((input) => {
        try {
          if (!this.validateField(input)) {
            isValid = false;
            failedFields.push(input.name || input.id || "unknown");
            console.warn(
              `❌ ADVANCED TAB: Validation failed for field:`,
              input.name || input.id,
              input.value
            );
          }
        } catch (fieldError) {
          console.error(
            `❌ ADVANCED TAB: Error validating field ${input.name || input.id}:`,
            fieldError
          );
          isValid = false;
          failedFields.push(input.name || input.id || "unknown");
        }
      });

      if (failedFields.length > 0) {
        console.warn(`❌ ADVANCED TAB: Failed fields: ${failedFields.join(", ")}`);
      }

      console.log(
        `📋 Advanced tab validation: ${isValid ? "PASSED" : "FAILED"} (${formInputs.length} fields checked)`
      );
      return isValid;
    } catch (error) {
      console.error("🚨 Error validating Advanced tab form:", error);
      return false;
    }
  }

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
        }

        // Set property safely
        this.core.safeSetNestedProperty(this.core.config, name, value);
      });

      console.log("📝 Advanced tab config updated from form");
    } catch (error) {
      console.error("🚨 Error updating config from Advanced tab form:", error);
    }
  }

  applyLivePreview(fieldName, value) {
    try {
      // Create preview config
      const previewConfig = JSON.parse(JSON.stringify(this.core.config));
      this.core.safeSetNestedProperty(previewConfig, fieldName, value);

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
              value: typeof value === "string" ? this.core.sanitizeInput(value) : value,
            },
            "*"
          );
        } catch (postError) {
          console.warn("🚨 Error posting message to parent:", postError);
        }
      }

      console.log(`🔄 Advanced tab live preview: ${fieldName} = ${value}`);
    } catch (error) {
      console.warn("🚨 Advanced tab live preview failed:", error);
    }
  }

  resetToDefaults() {
    try {
      console.log("🔄 Resetting Advanced tab to defaults");

      const defaults = this.core.getDefaultConfig();

      // Reset advanced settings
      this.core.config.animations = { ...defaults.animations };
      this.core.config.searchSettings = { ...defaults.searchSettings };

      // Update form fields
      const container = document.getElementById("advanced-panel");
      if (container) {
        this.core.populateForm(container);
        this.updateAllRangeDisplays(container);
        this.setupAnimationToggles(container);
      }

      console.log("✅ Advanced tab reset complete");
    } catch (error) {
      console.error("🚨 Error resetting Advanced tab:", error);
    }
  }

  getValidationStatus() {
    try {
      const container = document.getElementById("advanced-panel");
      if (!container) {
        return true;
      }

      return this.validateForm(container);
    } catch (error) {
      console.error("🚨 Error getting validation status:", error);
      return false;
    }
  }

  getConfigSummary() {
    try {
      return {
        tab: "Advanced",
        sections: {
          animations: this.core.config.animations,
          searchSettings: this.core.config.searchSettings,
        },
      };
    } catch (error) {
      console.error("🚨 Error getting Advanced tab config summary:", error);
      return null;
    }
  }

  cleanup() {
    try {
      clearTimeout(this.formUpdateTimeout);
      this.rangeUpdateTimeouts.forEach((timeout) => clearTimeout(timeout));
      this.rangeUpdateTimeouts.clear();

      console.log("🧹 Advanced tab handler cleaned up");
    } catch (error) {
      console.error("🚨 Error cleaning up Advanced tab:", error);
    }
  }
}

// Export for module use
if (typeof module !== "undefined" && module.exports) {
  module.exports = AdvancedTabHandler;
} else {
  window.AdvancedTabHandler = AdvancedTabHandler;
}
