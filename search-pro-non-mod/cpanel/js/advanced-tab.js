/**
 * Search Pro Control Panel - Advanced Tab Handler
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
      console.log("🚀 Initializing Advanced tab handler");

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

      console.log("✅ Advanced tab handler initialized");
    } catch (error) {
      console.error("❌ Error initializing Advanced tab:", error);
    }
  }

  setupRangeInputs(container = document) {
    try {
      const rangeInputs = container.querySelectorAll('input[type="range"]');
      
      rangeInputs.forEach(input => {
        // Find or create value display
        let valueDisplay = input.parentNode.querySelector('.range-value');
        if (!valueDisplay) {
          valueDisplay = document.createElement('span');
          valueDisplay.className = 'range-value';
          input.parentNode.appendChild(valueDisplay);
        }
        
        // Initialize display value
        valueDisplay.textContent = input.value;
        
        // Add input listener for real-time updates
        input.addEventListener('input', (e) => {
          valueDisplay.textContent = e.target.value;
          
          // Debounced form change for performance
          const fieldName = e.target.name;
          if (this.rangeUpdateTimeouts.has(fieldName)) {
            clearTimeout(this.rangeUpdateTimeouts.get(fieldName));
          }
          
          this.rangeUpdateTimeouts.set(fieldName, setTimeout(() => {
            this.core.onFormChange(e.target);
          }, 150));
        });
        
        // Add change listener for final value
        input.addEventListener('change', (e) => {
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
      
      rangeInputs.forEach(input => {
        const valueDisplay = input.parentNode.querySelector('.range-value');
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
      const animationsEnabled = container.querySelector('#animationsEnabled');
      const animationSections = container.querySelectorAll('.config-section[aria-labelledby*="animations"], .config-section[aria-labelledby*="reduced-motion"]');
      
      if (!animationsEnabled) return;
      
      const toggleAnimationSections = () => {
        const isEnabled = animationsEnabled.checked;
        
        animationSections.forEach(section => {
          if (section.getAttribute('aria-labelledby') === 'animation-settings-heading') {
            return; // Skip the main animation settings section
          }
          
          if (isEnabled) {
            section.classList.remove('disabled-animations');
            section.style.opacity = '1';
            section.style.pointerEvents = 'auto';
            section.querySelectorAll('input, select').forEach(input => {
              input.disabled = false;
            });
          } else {
            section.classList.add('disabled-animations');
            section.style.opacity = '0.5';
            section.style.pointerEvents = 'none';
            section.querySelectorAll('input, select').forEach(input => {
              input.disabled = true;
            });
          }
        });
      };
      
      animationsEnabled.addEventListener('change', toggleAnimationSections);
      
      // Initialize state
      toggleAnimationSections();
      
      console.log("📱 Animation toggles setup complete");
    } catch (error) {
      console.error("🚨 Error setting up animation toggles:", error);
    }
  }

  setupResetButtons(container) {
    try {
      const resetButtons = container.querySelectorAll('.reset-section-button');
      
      resetButtons.forEach((button) => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          const section = button.dataset.section;
          this.resetSection(section, container);
        });
      });
      
      console.log(`🔄 Reset button handlers set up for ${resetButtons.length} buttons`);
    } catch (error) {
      console.error("🚨 Error setting up reset button handlers:", error);
    }
  }

  resetSection(section, container) {
    try {
      const defaults = this.core.getDefaultConfig();
      
      if (section === 'animations') {
        // Reset animation settings
        this.core.config.animations = { ...defaults.animations };
        
        // Update form fields for animations
        const animationFields = container.querySelectorAll('[name^="animations."]');
        animationFields.forEach(field => {
          const value = this.core.getNestedProperty(this.core.config, field.name);
          if (field.type === 'checkbox') {
            field.checked = Boolean(value);
          } else if (field.type === 'range') {
            field.value = value;
            const valueDisplay = field.parentNode.querySelector('.range-value');
            if (valueDisplay) {
              valueDisplay.textContent = value;
            }
          } else {
            field.value = value;
          }
        });
        
        // Re-setup animation toggles
        this.setupAnimationToggles(container);
        
        this.core.showToast("success", "Animation Settings Reset", "Animation settings restored to defaults");
        
      } else if (section === 'searchSettings') {
        // Reset search settings
        this.core.config.searchSettings = { ...defaults.searchSettings };
        
        // Update form fields for search settings
        const searchFields = container.querySelectorAll('[name^="searchSettings."]');
        searchFields.forEach(field => {
          const value = this.core.getNestedProperty(this.core.config, field.name);
          if (field.type === 'checkbox') {
            field.checked = Boolean(value);
          } else if (field.type === 'range') {
            field.value = value;
            const valueDisplay = field.parentNode.querySelector('.range-value');
            if (valueDisplay) {
              valueDisplay.textContent = value;
            }
          } else {
            field.value = value;
          }
        });
        
        this.core.showToast("success", "Search Settings Reset", "Search ranking and behavior settings restored to defaults");
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
          case fieldName.includes('duration') || fieldName.includes('Duration'):
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

          case fieldName.includes('Distance') || fieldName.includes('distance'):
            if (value !== null && !isNaN(value)) {
              if (value < 0) {
                isValid = false;
                errorMessage = "Distance cannot be negative";
              } else if (value > 100) {
                isValid = false;
                errorMessage = "Distance should not exceed 100 for performance";
              }
            }
            break;

          case fieldName.includes('threshold'):
            if (value !== null && !isNaN(value)) {
              if (value < 0 || value > 1) {
                isValid = false;
                errorMessage = "Threshold must be between 0.0 and 1.0";
              }
            }
            break;

          case fieldName.includes('Weight') || fieldName.includes('weight'):
            if (value !== null && !isNaN(value)) {
              if (value < 0 || value > 1) {
                isValid = false;
                errorMessage = "Weight must be between 0.0 and 1.0";
              }
            }
            break;

          case fieldName.includes('boost') || fieldName.includes('Boost'):
            if (value !== null && !isNaN(value)) {
              if (value < 0.1) {
                isValid = false;
                errorMessage = "Boost value should be at least 0.1";
              } else if (value > 10) {
                isValid = false;
                errorMessage = "Boost value should not exceed 10 to avoid skewing results";
              }
            }
            break;

          case fieldName.includes('minMatchCharLength'):
            if (value !== null && !isNaN(value)) {
              if (value < 1) {
                isValid = false;
                errorMessage = "Must require at least 1 character";
              } else if (value > 10) {
                isValid = false;
                errorMessage = "Requiring more than 10 characters may hurt usability";
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

      formInputs.forEach((input) => {
        if (!this.validateField(input)) {
          isValid = false;
        }
      });

      console.log(`📋 Advanced tab validation: ${isValid ? "PASSED" : "FAILED"}`);
      return {
        isValid: isValid,
        errors: [],
        warnings: []
      };
    } catch (error) {
      console.error("🚨 Error validating Advanced tab form:", error);
      return {
        isValid: false,
        errors: ["Validation error occurred"],
        warnings: []
      };
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
        return {
          isValid: true,
          errors: [],
          warnings: []
        };
      }

      return this.validateForm(container);
    } catch (error) {
      console.error("🚨 Error getting validation status:", error);
      return {
        isValid: false,
        errors: ["Could not validate Advanced tab"],
        warnings: []
      };
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
      this.rangeUpdateTimeouts.forEach(timeout => clearTimeout(timeout));
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