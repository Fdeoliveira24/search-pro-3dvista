/**
 * Search Pro Control Panel - Filtering Tab Handler
 * Version 3.2 - Last Update on 11/01/2025 - Search Pro Configuration Loading - Google Sheets / CSV / Business JSON integration, runtime synchronization, Exact matches config, Silence Console Fix
 * Handles all functionality specific to the Filtering settings tab
 * Implements advanced filtering controls for content visibility
 */

class FilteringTabHandler {
  constructor() {
    this.core = null;
    this.tabId = "filtering";
    this.formUpdateTimeout = null;
  }

  /**
   * Set the core instance
   */
  setCore(core) {
    this.core = core;
  }

  /**
   * Initialize filtering tab functionality
   */
  init(container) {
    try {
      console.log("🚀 Initializing Filtering tab handler");

      // Setup form listeners
      this.core.setupFormListeners(container);

      // Setup filtering tab specific features
      this.setupFilterModeControls(container);
      this.setupMediaIndexControls(container);
      this.setupElementTypeControls(container);
      this.setupElementLabelControls(container);
      this.setupTagFilteringControls(container);
      this.setupArrayInputHandlers(container);

      // Populate form with current values
      this.core.populateForm(container);

      // Setup reset button handlers
      this.setupResetButtonHandlers(container);

      // Initialize visibility states
      this.updateFilterVisibility(container);

      // Validate all fields
      this.validateForm(container);

      console.log("✅ Filtering tab handler initialized");
    } catch (error) {
      console.error("❌ Error initializing Filtering tab:", error);
    }
  }

  /**
   * Setup main filter mode controls
   */
  setupFilterModeControls(container = document) {
    try {
      const filterModeSelect = container.querySelector("#filterMode");

      if (filterModeSelect) {
        filterModeSelect.addEventListener("change", () => {
          this.updateFilterVisibility(container);
          this.validateForm(container);
        });
      }

      console.log("🎛️ Filter mode controls setup complete");
    } catch (error) {
      console.error("🚨 Error setting up filter mode controls:", error);
    }
  }

  /**
   * Setup media index controls with enhanced validation
   */
  setupMediaIndexControls(container = document) {
    try {
      const mediaIndexModeSelect = container.querySelector('[name="filter.mediaIndexes.mode"]');
      if (mediaIndexModeSelect) {
        mediaIndexModeSelect.addEventListener("change", () => {
          this.updateMediaIndexVisibility(container);
        });
      }

      // Setup enhanced validation for media index inputs
      const mediaIndexInputs = container.querySelectorAll(
        "#allowedMediaIndexes, #blacklistedMediaIndexes"
      );

      mediaIndexInputs.forEach((input) => {
        // Enhanced input filtering - prevent invalid characters
        input.addEventListener("input", (e) => {
          this.filterMediaIndexInput(e.target);
          this.validateMediaIndexInput(e.target);
        });

        // Additional validation on blur
        input.addEventListener("blur", (e) => {
          this.validateMediaIndexInput(e.target);
        });

        // Prevent pasting invalid content
        input.addEventListener("paste", (e) => {
          setTimeout(() => {
            this.filterMediaIndexInput(e.target);
            this.validateMediaIndexInput(e.target);
          }, 10);
        });
      });

      console.log("📷 Media index controls setup complete");
    } catch (error) {
      console.error("🚨 Error setting up media index controls:", error);
    }
  }

  /**
   * Filter input to only allow numbers, commas, and spaces
   */
  filterMediaIndexInput(input) {
    try {
      const originalValue = input.value;
      // Allow only digits, commas, spaces, and filter out everything else
      const filteredValue = originalValue.replace(/[^\d,\s]/g, "");

      if (originalValue !== filteredValue) {
        input.value = filteredValue;
        // Show immediate feedback that invalid characters were removed
        this.showValidationMessage(
          input,
          "Invalid characters removed. Only numbers, commas, and spaces are allowed."
        );

        // Clear the message after a short delay if input is now valid
        setTimeout(() => {
          if (this.validateMediaIndexInput(input)) {
            this.clearValidationMessage(input);
          }
        }, 1500);
      }
    } catch (error) {
      console.error("🚨 Error filtering media index input:", error);
    }
  }

  /**
   * Enhanced validation for media index input
   */
  validateMediaIndexInput(input) {
    try {
      const value = input.value.trim();

      // Allow empty input
      if (!value) {
        input.classList.remove("validation-error");
        this.clearValidationMessage(input);
        return true;
      }

      // Check if value contains only digits, spaces, and commas
      const validFormat = /^[\d\s,]+$/.test(value);

      // Additional validation: check for valid number patterns
      let validNumbers = true;
      let errorMessage = "";

      if (validFormat) {
        // Split by comma and validate each part
        const parts = value
          .split(",")
          .map((part) => part.trim())
          .filter((part) => part !== "");

        for (const part of parts) {
          const num = parseInt(part, 10);
          if (isNaN(num) || num < 0) {
            validNumbers = false;
            errorMessage = "All values must be non-negative integers (0, 1, 2, etc.)";
            break;
          }
        }

        // Check for duplicate values
        if (validNumbers) {
          const uniqueParts = [...new Set(parts)];
          if (parts.length !== uniqueParts.length) {
            validNumbers = false;
            errorMessage = "Duplicate panorama indexes are not allowed";
          }
        }
      }

      const isValid = validFormat && validNumbers;

      input.classList.toggle("validation-error", !isValid);

      if (!isValid) {
        if (!validFormat) {
          this.showValidationMessage(
            input,
            "Only numbers, commas, and spaces are allowed (e.g., 0, 1, 5)"
          );
        } else {
          this.showValidationMessage(input, errorMessage);
        }
      } else {
        this.clearValidationMessage(input);
      }

      return isValid;
    } catch (error) {
      console.error("🚨 Error validating media index input:", error);
      return false;
    }
  }

  /**
   * Setup element type filtering controls
   */
  setupElementTypeControls(container = document) {
    try {
      const elementTypesModeSelect = container.querySelector("#elementTypesMode");

      if (elementTypesModeSelect) {
        elementTypesModeSelect.addEventListener("change", () => {
          this.updateElementTypesVisibility(container);
          this.validateForm(container);
        });
      }

      // Setup checkbox handlers for allowed element types
      const allowedCheckboxes = container.querySelectorAll(
        '#allowedElementTypesCheckboxes input[type="checkbox"]'
      );
      allowedCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          this.updateElementTypeCheckboxArrays(container, "allowed");
        });
      });

      // Setup checkbox handlers for blacklisted element types
      const blacklistedCheckboxes = container.querySelectorAll(
        '#blacklistedElementTypesCheckboxes input[type="checkbox"]'
      );
      blacklistedCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          this.updateElementTypeCheckboxArrays(container, "blacklisted");
        });
      });

      console.log("🔧 Element type controls setup complete");
    } catch (error) {
      console.error("🚨 Error setting up element type controls:", error);
    }
  }

  /**
   * Setup element label filtering controls
   */
  setupElementLabelControls(container = document) {
    try {
      const elementLabelsModeSelect = container.querySelector("#elementLabelsMode");

      if (elementLabelsModeSelect) {
        elementLabelsModeSelect.addEventListener("change", () => {
          this.updateElementLabelsVisibility(container);
          this.validateForm(container);
        });
      }

      console.log("🏷️ Element label controls setup complete");
    } catch (error) {
      console.error("🚨 Error setting up element label controls:", error);
    }
  }

  /**
   * Setup tag filtering controls
   */
  setupTagFilteringControls(container = document) {
    try {
      const tagFilteringModeSelect = container.querySelector("#tagFilteringMode");

      if (tagFilteringModeSelect) {
        tagFilteringModeSelect.addEventListener("change", () => {
          this.updateTagFilteringVisibility(container);
          this.validateForm(container);
        });
      }

      console.log("🏷️ Tag filtering controls setup complete");
    } catch (error) {
      console.error("🚨 Error setting up tag filtering controls:", error);
    }
  }

  /**
   * Setup array input handlers for comma-separated values
   */
  setupArrayInputHandlers(container = document) {
    try {
      const arrayInputs = container.querySelectorAll(
        "#allowedValues, #blacklistedValues, #allowedElementLabels, #blacklistedElementLabels, #allowedTags, #blacklistedTags"
      );

      arrayInputs.forEach((input) => {
        // Handle change events to convert comma-separated values to arrays
        input.addEventListener("change", () => {
          this.updateArrayValue(input);
        });

        // Real-time validation feedback
        input.addEventListener("input", () => {
          this.validateArrayInput(input);
        });
      });

      console.log("📋 Array input handlers setup complete");
    } catch (error) {
      console.error("🚨 Error setting up array input handlers:", error);
    }
  }

  /**
   * Update filter section visibility based on mode selection
   */
  updateFilterVisibility(container = document) {
    try {
      const filterMode = container.querySelector("#filterMode")?.value || "none";

      const allowedValuesGroup = container.querySelector("#allowedValuesGroup");
      const blacklistedValuesGroup = container.querySelector("#blacklistedValuesGroup");
      const mainFilterValues = container.querySelector("#mainFilterValues");

      // Show/hide main filter values section based on mode
      if (mainFilterValues) {
        if (filterMode !== "none") {
          mainFilterValues.style.display = "block";
        } else {
          mainFilterValues.style.display = "none";
        }
      }

      // Show/hide specific value groups based on mode
      if (allowedValuesGroup) {
        allowedValuesGroup.style.display = filterMode === "whitelist" ? "block" : "none";
      }

      if (blacklistedValuesGroup) {
        blacklistedValuesGroup.style.display = filterMode === "blacklist" ? "block" : "none";
      }

      console.log(`🔄 Filter visibility updated: mode=${filterMode}`);
    } catch (error) {
      console.error("🚨 Error updating filter visibility:", error);
    }
  }

  /**
   * Update media index section visibility
   */
  updateMediaIndexVisibility(container = document) {
    try {
      const mode = container.querySelector("#mediaIndexMode")?.value || "none";
      const allowedGroup = container.querySelector("#allowedMediaIndexesGroup");
      const blacklistedGroup = container.querySelector("#blacklistedMediaIndexesGroup");
      const valuesContainer = container.querySelector("#mediaIndexValues");

      if (valuesContainer) {
        valuesContainer.style.display = mode !== "none" ? "block" : "none";
      }

      if (allowedGroup) {
        allowedGroup.style.display = mode === "whitelist" ? "block" : "none";
      }

      if (blacklistedGroup) {
        blacklistedGroup.style.display = mode === "blacklist" ? "block" : "none";
      }

      console.log(`🔄 Media index visibility updated: mode=${mode}`);
    } catch (error) {
      console.error("🚨 Error updating media index visibility:", error);
    }
  }

  /**
   * Update element types section visibility
   */
  updateElementTypesVisibility(container = document) {
    try {
      const mode = container.querySelector("#elementTypesMode")?.value || "none";
      const allowedGroup = container.querySelector("#allowedElementTypesGroup");
      const blacklistedGroup = container.querySelector("#blacklistedElementTypesGroup");
      const valuesContainer = container.querySelector("#elementTypesValues");

      if (valuesContainer) {
        valuesContainer.style.display = mode !== "none" ? "block" : "none";
      }

      if (allowedGroup) {
        allowedGroup.style.display = mode === "whitelist" ? "block" : "none";
      }

      if (blacklistedGroup) {
        blacklistedGroup.style.display = mode === "blacklist" ? "block" : "none";
      }

      console.log(`🔄 Element types visibility updated: mode=${mode}`);
    } catch (error) {
      console.error("🚨 Error updating element types visibility:", error);
    }
  }

  /**
   * Update element labels section visibility
   */
  updateElementLabelsVisibility(container = document) {
    try {
      const mode = container.querySelector("#elementLabelsMode")?.value || "none";
      const allowedGroup = container.querySelector("#allowedElementLabelsGroup");
      const blacklistedGroup = container.querySelector("#blacklistedElementLabelsGroup");
      const valuesContainer = container.querySelector("#elementLabelsValues");

      if (valuesContainer) {
        valuesContainer.style.display = mode !== "none" ? "block" : "none";
      }

      if (allowedGroup) {
        allowedGroup.style.display = mode === "whitelist" ? "block" : "none";
      }

      if (blacklistedGroup) {
        blacklistedGroup.style.display = mode === "blacklist" ? "block" : "none";
      }

      console.log(`🔄 Element labels visibility updated: mode=${mode}`);
    } catch (error) {
      console.error("🚨 Error updating element labels visibility:", error);
    }
  }

  /**
   * Update tag filtering section visibility
   */
  updateTagFilteringVisibility(container = document) {
    try {
      const mode = container.querySelector("#tagFilteringMode")?.value || "none";
      const allowedGroup = container.querySelector("#allowedTagsGroup");
      const blacklistedGroup = container.querySelector("#blacklistedTagsGroup");
      const valuesContainer = container.querySelector("#tagFilteringValues");

      if (valuesContainer) {
        valuesContainer.style.display = mode !== "none" ? "block" : "none";
      }

      if (allowedGroup) {
        allowedGroup.style.display = mode === "whitelist" ? "block" : "none";
      }

      if (blacklistedGroup) {
        blacklistedGroup.style.display = mode === "blacklist" ? "block" : "none";
      }

      console.log(`🔄 Tag filtering visibility updated: mode=${mode}`);
    } catch (error) {
      console.error("🚨 Error updating tag filtering visibility:", error);
    }
  }

  /**
   * Update array value in configuration
   */
  updateArrayValue(input) {
    try {
      const value = input.value.trim();
      // Convert to array and filter out empty values - critical fix!
      const arrayValue = value
        ? value
            .split(",")
            .map((v) => v.trim())
            .filter((v) => v.length > 0)
        : [];

      // Update the configuration directly
      const fieldName = input.getAttribute("name");
      if (fieldName && this.core) {
        this.core.setNestedProperty(this.core.config, fieldName, arrayValue);
        console.log(`📝 Updated ${fieldName}:`, arrayValue);
      }
    } catch (error) {
      console.error("🚨 Error updating array value:", error);
    }
  }

  /**
   * Update element type arrays from multi-select
   */
  updateElementTypeArrays(select) {
    try {
      const selectedOptions = Array.from(select.selectedOptions).map((option) => option.value);
      // Don't include empty arrays with empty strings - critical fix!
      const arrayValue = selectedOptions.length > 0 ? selectedOptions : [];

      // Update the configuration directly
      const fieldName = select.getAttribute("name");
      if (fieldName && this.core) {
        this.core.setNestedProperty(this.core.config, fieldName, arrayValue);
        console.log(`📝 Updated ${fieldName}:`, arrayValue);
      }
    } catch (error) {
      console.error("🚨 Error updating element type arrays:", error);
    }
  }

  /**
   * Update element type arrays from checkboxes
   */
  updateElementTypeCheckboxArrays(container, type) {
    try {
      const checkboxSelector =
        type === "allowed"
          ? '#allowedElementTypesCheckboxes input[type="checkbox"]:checked'
          : '#blacklistedElementTypesCheckboxes input[type="checkbox"]:checked';

      const checkedBoxes = container.querySelectorAll(checkboxSelector);
      const selectedValues = Array.from(checkedBoxes).map((checkbox) => checkbox.value);

      // Don't include empty arrays with empty strings - critical fix!
      const arrayValue = selectedValues.length > 0 ? selectedValues : [];

      // Update the configuration directly
      const fieldName =
        type === "allowed"
          ? "filter.elementTypes.allowedTypes"
          : "filter.elementTypes.blacklistedTypes";

      if (this.core) {
        this.core.setNestedProperty(this.core.config, fieldName, arrayValue);
        console.log(`📝 Updated ${fieldName}:`, arrayValue);
      }
    } catch (error) {
      console.error("🚨 Error updating element type checkbox arrays:", error);
    }
  }

  /**
   * Validate array input format
   */
  validateArrayInput(input) {
    try {
      const value = input.value.trim();
      const isValid = value.length <= 1000; // Reasonable length limit

      input.classList.toggle("validation-error", !isValid);

      if (!isValid) {
        this.showValidationMessage(input, "Input is too long. Please limit to 1000 characters.");
      } else {
        this.clearValidationMessage(input);
      }

      return isValid;
    } catch (error) {
      console.error("🚨 Error validating array input:", error);
      return false;
    }
  }

  /**
   * Setup reset button handlers
   */
  setupResetButtonHandlers(container = document) {
    try {
      const resetButtons = container.querySelectorAll(".reset-section-button");

      resetButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const section = button.dataset.section;
          console.log(`🔄 Reset button clicked for section: ${section}`);

          if (section === "filtering") {
            this.resetFilteringSettings(container);
          } else if (section === "elementTypes") {
            this.resetElementTypesSettings(container);
          } else if (section === "mediaIndexes") {
            this.resetMediaIndexesSettings(container);
          } else if (section === "tagFiltering") {
            this.resetTagFilteringSettings(container);
          } else if (section === "elementLabels") {
            this.resetElementLabelsSettings(container);
          } else if (section === "valueMatching") {
            this.resetValueMatchingSettings(container);
          } else {
            console.warn(`🚨 Unknown reset section: ${section}`);
          }
        });
      });

      console.log(`🔄 Reset button handlers setup complete for ${resetButtons.length} buttons`);
    } catch (error) {
      console.error("🚨 Error setting up reset button handlers:", error);
    }
  }

  /**
   * Reset all filtering settings to defaults
   */
  resetFilteringSettings(container = document) {
    try {
      if (!this.core) return;

      // Reset filter configuration to defaults - using proper empty arrays
      const defaultFilter = {
        mode: "none",
        allowedValues: [],
        blacklistedValues: [],
        valueMatchMode: {
          whitelist: "exact",
          blacklist: "contains",
        },
        mediaIndexes: {
          mode: "none",
          allowed: [],
          blacklisted: [],
        },
        elementTypes: {
          mode: "none",
          allowedTypes: [],
          blacklistedTypes: [],
        },
        elementLabels: {
          mode: "none",
          allowedValues: [],
          blacklistedValues: [],
        },
        tagFiltering: {
          mode: "none",
          allowedTags: [],
          blacklistedTags: [],
        },
      };

      this.core.config.filter = defaultFilter;

      // Repopulate the form
      this.core.populateForm(container);

      // Update visibility
      this.updateFilterVisibility(container);
      this.updateMediaIndexVisibility(container);
      this.updateElementTypesVisibility(container);
      this.updateElementLabelsVisibility(container);
      this.updateTagFilteringVisibility(container);

      // Show success message
      this.core.showToast("Filtering settings reset to defaults", "success");

      console.log("✅ Filtering settings reset to defaults");
    } catch (error) {
      console.error("🚨 Error resetting filtering settings:", error);
      this.core.showToast("Error resetting filtering settings", "error");
    }
  }

  /**
   * Reset element types settings to defaults
   */
  resetElementTypesSettings(container = document) {
    try {
      if (!this.core) return;

      // Reset only element types configuration
      this.core.config.filter.elementTypes = {
        mode: "none",
        allowedTypes: [],
        blacklistedTypes: [],
      };

      // Repopulate the form
      this.core.populateForm(container);

      // Update visibility for this section
      this.updateElementTypesVisibility(container);

      // Show success message
      this.core.showToast("Element types settings reset to defaults", "success");

      console.log("✅ Element types settings reset to defaults");
    } catch (error) {
      console.error("🚨 Error resetting element types settings:", error);
      this.core.showToast("Error resetting element types settings", "error");
    }
  }

  /**
   * Reset media indexes settings to defaults
   */
  resetMediaIndexesSettings(container = document) {
    try {
      if (!this.core) return;

      // Reset only media indexes configuration
      this.core.config.filter.mediaIndexes = {
        mode: "none",
        allowed: [],
        blacklisted: [],
      };

      // Repopulate the form
      this.core.populateForm(container);

      // Update visibility for this section
      this.updateMediaIndexVisibility(container);

      // Show success message
      this.core.showToast("Media indexes settings reset to defaults", "success");

      console.log("✅ Media indexes settings reset to defaults");
    } catch (error) {
      console.error("🚨 Error resetting media indexes settings:", error);
      this.core.showToast("Error resetting media indexes settings", "error");
    }
  }

  /**
   * Reset tag filtering settings to defaults
   */
  resetTagFilteringSettings(container = document) {
    try {
      if (!this.core) return;

      // Reset only tag filtering configuration
      this.core.config.filter.tagFiltering = {
        mode: "none",
        allowedTags: [],
        blacklistedTags: [],
      };

      // Repopulate the form
      this.core.populateForm(container);

      // Update visibility for this section
      this.updateTagFilteringVisibility(container);

      // Show success message
      this.core.showToast("Tag filtering settings reset to defaults", "success");

      console.log("✅ Tag filtering settings reset to defaults");
    } catch (error) {
      console.error("🚨 Error resetting tag filtering settings:", error);
      this.core.showToast("Error resetting tag filtering settings", "error");
    }
  }

  /**
   * Reset element labels settings to defaults
   */
  resetElementLabelsSettings(container = document) {
    try {
      if (!this.core) return;

      // Reset only element labels configuration
      this.core.config.filter.elementLabels = {
        mode: "none",
        allowedValues: [],
        blacklistedValues: [],
      };

      // Repopulate the form
      this.core.populateForm(container);

      // Update visibility for this section
      this.updateElementLabelsVisibility(container);

      // Show success message
      this.core.showToast("Element labels settings reset to defaults", "success");

      console.log("✅ Element labels settings reset to defaults");
    } catch (error) {
      console.error("🚨 Error resetting element labels settings:", error);
      this.core.showToast("Error resetting element labels settings", "error");
    }
  }

  /**
   * Reset value matching settings to defaults
   */
  resetValueMatchingSettings(container = document) {
    try {
      if (!this.core) return;

      // Reset value matching and main filter settings
      this.core.config.filter.mode = "none";
      this.core.config.filter.allowedValues = [];
      this.core.config.filter.blacklistedValues = [];
      this.core.config.filter.valueMatchMode = {
        whitelist: "exact",
        blacklist: "contains",
      };

      // Repopulate the form
      this.core.populateForm(container);

      // Update visibility for this section
      this.updateFilterVisibility(container);

      // Show success message
      this.core.showToast("Value matching settings reset to defaults", "success");

      console.log("✅ Value matching settings reset to defaults");
    } catch (error) {
      console.error("🚨 Error resetting value matching settings:", error);
      this.core.showToast("Error resetting value matching settings", "error");
    }
  }

  /**
   * Validate the entire form
   */
  validateForm(container = document) {
    try {
      let isValid = true;

      // Validate media index inputs
      const mediaIndexInputs = container.querySelectorAll(
        "#allowedMediaIndexes, #blacklistedMediaIndexes"
      );

      mediaIndexInputs.forEach((input) => {
        if (!this.validateMediaIndexInput(input)) {
          isValid = false;
        }
      });

      // Validate array inputs
      const arrayInputs = container.querySelectorAll(
        "#allowedValues, #blacklistedValues, #allowedElementLabels, #blacklistedElementLabels, #allowedTags, #blacklistedTags"
      );

      arrayInputs.forEach((input) => {
        if (!this.validateArrayInput(input)) {
          isValid = false;
        }
      });

      console.log(`📋 Filtering form validation: ${isValid ? "passed" : "failed"}`);
      return isValid;
    } catch (error) {
      console.error("🚨 Error validating filtering form:", error);
      return false;
    }
  }

  /**
   * Show validation message with enhanced persistence
   */
  showValidationMessage(input, message) {
    try {
      let messageElement = input.parentNode.querySelector(".validation-message");

      if (!messageElement) {
        messageElement = document.createElement("div");
        messageElement.className = "validation-message validation-error";
        input.parentNode.appendChild(messageElement);
      }

      messageElement.textContent = message;
      messageElement.style.display = "block";
      messageElement.classList.add("show");

      // Add visual emphasis to the input field
      input.style.borderColor = "#ef4444";
      input.style.backgroundColor = "#fef2f2";
    } catch (error) {
      console.error("🚨 Error showing validation message:", error);
    }
  }

  /**
   * Clear validation message and reset input styling
   */
  clearValidationMessage(input) {
    try {
      const messageElement = input.parentNode.querySelector(".validation-message");
      if (messageElement) {
        messageElement.style.display = "none";
        messageElement.classList.remove("show");
      }

      // Reset input field styling
      input.style.borderColor = "";
      input.style.backgroundColor = "";
    } catch (error) {
      console.error("🚨 Error clearing validation message:", error);
    }
  }

  /**
   * Get tab-specific configuration
   */
  getConfig() {
    try {
      return this.core?.config?.filter || {};
    } catch (error) {
      console.error("🚨 Error getting filtering config:", error);
      return {};
    }
  }

  /**
   * Update tab-specific configuration
   */
  updateConfig(filterConfig) {
    try {
      if (!this.core || !filterConfig) return;

      this.core.config.filter = {
        ...this.core.config.filter,
        ...filterConfig,
      };

      console.log("📝 Filtering configuration updated:", this.core.config.filter);
    } catch (error) {
      console.error("🚨 Error updating filtering config:", error);
    }
  }

  /**
   * Reset filtering tab to defaults (called by main reset process)
   */
  resetToDefaults() {
    try {
      console.log("🔄 Resetting Filtering tab to defaults");

      // Reset all filtering configuration to defaults
      if (this.core && this.core.config) {
        const defaultConfig = this.core.getDefaultConfig();
        this.core.config.filter = { ...defaultConfig.filter };
        console.log("✅ Filtering configuration reset to defaults:", this.core.config.filter);
      }

      // Find the filtering tab container
      const container = document.getElementById("filtering-panel");
      if (container) {
        // FIXED: Manually reset all form fields to ensure they clear properly
        this.resetFormFields(container);

        // Update visibility states with defaults
        this.updateFilterVisibility(container);
        this.updateMediaIndexVisibility(container);
        this.updateElementTypesVisibility(container);
        this.updateElementLabelsVisibility(container);
        this.updateTagFilteringVisibility(container);

        // Validate the form
        this.validateForm(container);

        console.log("✅ Filtering tab form reset to defaults");
      }

      console.log("✅ Filtering tab reset complete");
    } catch (error) {
      console.error("🚨 Error resetting filtering tab:", error);
    }
  }

  /**
   * Manually reset all form fields in the filtering tab
   */
  resetFormFields(container) {
    try {
      console.log("🔧 Manually resetting filtering form fields...");

      // Reset main filter mode and values
      const filterModeSelect = container.querySelector('[name="filter.mode"]');
      if (filterModeSelect) {
        filterModeSelect.value = "none";
        console.log("✅ Filter mode reset to 'none'");
      }

      const allowedValuesTextarea = container.querySelector('[name="filter.allowedValues"]');
      if (allowedValuesTextarea) {
        allowedValuesTextarea.value = "";
        console.log("✅ Allowed values cleared");
      }

      const blacklistedValuesTextarea = container.querySelector(
        '[name="filter.blacklistedValues"]'
      );
      if (blacklistedValuesTextarea) {
        blacklistedValuesTextarea.value = "";
        console.log("✅ Blacklisted values cleared");
      }

      // Reset value match modes
      const whitelistMatchMode = container.querySelector(
        '[name="filter.valueMatchMode.whitelist"]'
      );
      if (whitelistMatchMode) {
        whitelistMatchMode.value = "exact";
        console.log("✅ Whitelist match mode reset to 'exact'");
      }

      const blacklistMatchMode = container.querySelector(
        '[name="filter.valueMatchMode.blacklist"]'
      );
      if (blacklistMatchMode) {
        blacklistMatchMode.value = "contains";
        console.log("✅ Blacklist match mode reset to 'contains'");
      }

      // Reset media index filtering
      const mediaIndexMode = container.querySelector('[name="filter.mediaIndexes.mode"]');
      if (mediaIndexMode) {
        mediaIndexMode.value = "none";
        console.log("✅ Media index mode reset to 'none'");
      }

      const mediaIndexAllowed = container.querySelector('[name="filter.mediaIndexes.allowed"]');
      if (mediaIndexAllowed) {
        mediaIndexAllowed.value = "";
        console.log("✅ Media index allowed cleared");
      }

      const mediaIndexBlacklisted = container.querySelector(
        '[name="filter.mediaIndexes.blacklisted"]'
      );
      if (mediaIndexBlacklisted) {
        mediaIndexBlacklisted.value = "";
        console.log("✅ Media index blacklisted cleared");
      }

      // Reset element types filtering
      const elementTypesMode = container.querySelector('[name="filter.elementTypes.mode"]');
      if (elementTypesMode) {
        elementTypesMode.value = "none";
        console.log("✅ Element types mode reset to 'none'");
      }

      const elementTypesAllowed = container.querySelector(
        '[name="filter.elementTypes.allowedTypes"]'
      );
      if (elementTypesAllowed) {
        elementTypesAllowed.value = "";
        console.log("✅ Element types allowed cleared");
      }

      const elementTypesBlacklisted = container.querySelector(
        '[name="filter.elementTypes.blacklistedTypes"]'
      );
      if (elementTypesBlacklisted) {
        elementTypesBlacklisted.value = "";
        console.log("✅ Element types blacklisted cleared");
      }

      // Reset element labels filtering
      const elementLabelsMode = container.querySelector('[name="filter.elementLabels.mode"]');
      if (elementLabelsMode) {
        elementLabelsMode.value = "none";
        console.log("✅ Element labels mode reset to 'none'");
      }

      const elementLabelsAllowed = container.querySelector(
        '[name="filter.elementLabels.allowedValues"]'
      );
      if (elementLabelsAllowed) {
        elementLabelsAllowed.value = "";
        console.log("✅ Element labels allowed cleared");
      }

      const elementLabelsBlacklisted = container.querySelector(
        '[name="filter.elementLabels.blacklistedValues"]'
      );
      if (elementLabelsBlacklisted) {
        elementLabelsBlacklisted.value = "";
        console.log("✅ Element labels blacklisted cleared");
      }

      // Reset tag filtering
      const tagFilteringMode = container.querySelector('[name="filter.tagFiltering.mode"]');
      if (tagFilteringMode) {
        tagFilteringMode.value = "none";
        console.log("✅ Tag filtering mode reset to 'none'");
      }

      const tagFilteringAllowed = container.querySelector(
        '[name="filter.tagFiltering.allowedTags"]'
      );
      if (tagFilteringAllowed) {
        tagFilteringAllowed.value = "";
        console.log("✅ Tag filtering allowed cleared");
      }

      const tagFilteringBlacklisted = container.querySelector(
        '[name="filter.tagFiltering.blacklistedTags"]'
      );
      if (tagFilteringBlacklisted) {
        tagFilteringBlacklisted.value = "";
        console.log("✅ Tag filtering blacklisted cleared");
      }

      console.log("✅ All filtering form fields manually reset");
    } catch (error) {
      console.error("🚨 Error manually resetting form fields:", error);
    }
  }

  /**
   * Update configuration from form data (called by main controller)
   */
  updateConfigFromForm(container) {
    try {
      console.log("🔍 FilteringTab updateConfigFromForm called");
      console.log("📋 Current filter config after main form processing:", this.core.config.filter);

      // Get the tab container to work with
      const tabContainer = container || document.getElementById("filtering-panel");

      // Handle checkbox arrays for element types ONLY if they haven't been set yet
      // This prevents overriding the correct values from checkbox change events
      if (tabContainer) {
        // Only update if the arrays are not properly initialized
        if (
          !this.core.config.filter?.elementTypes?.allowedTypes ||
          !Array.isArray(this.core.config.filter.elementTypes.allowedTypes)
        ) {
          console.log("🔧 INIT: Initializing allowedTypes from checkboxes");
          this.updateElementTypeCheckboxArrays(tabContainer, "allowed");
        } else {
          console.log("✅ SKIP: allowedTypes already properly set, not overriding");
        }

        if (
          !this.core.config.filter?.elementTypes?.blacklistedTypes ||
          !Array.isArray(this.core.config.filter.elementTypes.blacklistedTypes)
        ) {
          console.log("🔧 INIT: Initializing blacklistedTypes from checkboxes");
          this.updateElementTypeCheckboxArrays(tabContainer, "blacklisted");
        } else {
          console.log("✅ SKIP: blacklistedTypes already properly set, not overriding");
        }
      }

      // Convert comma-separated strings from textareas to arrays
      if (this.core.config.filter) {
        // Convert allowedValues from string to array if needed
        if (typeof this.core.config.filter.allowedValues === "string") {
          this.core.config.filter.allowedValues = this.core.config.filter.allowedValues
            .split(",")
            .map((val) => val.trim())
            .filter((val) => val !== "");
          console.log(
            "🔧 FILTER FIX: Converted allowedValues from string to array:",
            this.core.config.filter.allowedValues
          );
        }

        // Convert blacklistedValues from string to array if needed
        if (typeof this.core.config.filter.blacklistedValues === "string") {
          this.core.config.filter.blacklistedValues = this.core.config.filter.blacklistedValues
            .split(",")
            .map((val) => val.trim())
            .filter((val) => val !== "");
          console.log(
            "🔧 FILTER FIX: Converted blacklistedValues from string to array:",
            this.core.config.filter.blacklistedValues
          );
        }

        // Convert allowedTags from string to array if needed
        if (typeof this.core.config.filter.tagFiltering?.allowedTags === "string") {
          this.core.config.filter.tagFiltering.allowedTags =
            this.core.config.filter.tagFiltering.allowedTags
              .split(",")
              .map((val) => val.trim())
              .filter((val) => val !== "");
          console.log(
            "🔧 FILTER FIX: Converted allowedTags from string to array:",
            this.core.config.filter.tagFiltering.allowedTags
          );
        }

        // Convert blacklistedTags from string to array if needed
        if (typeof this.core.config.filter.tagFiltering?.blacklistedTags === "string") {
          this.core.config.filter.tagFiltering.blacklistedTags =
            this.core.config.filter.tagFiltering.blacklistedTags
              .split(",")
              .map((val) => val.trim())
              .filter((val) => val !== "");
          console.log(
            "🔧 FILTER FIX: Converted blacklistedTags from string to array:",
            this.core.config.filter.tagFiltering.blacklistedTags
          );
        }

        // Convert media index arrays from string to array if needed
        if (typeof this.core.config.filter.mediaIndexes?.allowed === "string") {
          this.core.config.filter.mediaIndexes.allowed =
            this.core.config.filter.mediaIndexes.allowed
              .split(",")
              .map((val) => val.trim())
              .filter((val) => val !== "");
          console.log(
            "🔧 FILTER FIX: Converted mediaIndexes.allowed from string to array:",
            this.core.config.filter.mediaIndexes.allowed
          );
        }

        if (typeof this.core.config.filter.mediaIndexes?.blacklisted === "string") {
          this.core.config.filter.mediaIndexes.blacklisted =
            this.core.config.filter.mediaIndexes.blacklisted
              .split(",")
              .map((val) => val.trim())
              .filter((val) => val !== "");
          console.log(
            "🔧 FILTER FIX: Converted mediaIndexes.blacklisted from string to array:",
            this.core.config.filter.mediaIndexes.blacklisted
          );
        }

        // Convert element labels arrays from string to array if needed
        if (typeof this.core.config.filter.elementLabels?.allowedValues === "string") {
          this.core.config.filter.elementLabels.allowedValues =
            this.core.config.filter.elementLabels.allowedValues
              .split(",")
              .map((val) => val.trim())
              .filter((val) => val !== "");
          console.log(
            "🔧 FILTER FIX: Converted elementLabels.allowedValues from string to array:",
            this.core.config.filter.elementLabels.allowedValues
          );
        }

        if (typeof this.core.config.filter.elementLabels?.blacklistedValues === "string") {
          this.core.config.filter.elementLabels.blacklistedValues =
            this.core.config.filter.elementLabels.blacklistedValues
              .split(",")
              .map((val) => val.trim())
              .filter((val) => val !== "");
          console.log(
            "🔧 FILTER FIX: Converted elementLabels.blacklistedValues from string to array:",
            this.core.config.filter.elementLabels.blacklistedValues
          );
        }

        // Convert element types arrays from string to array if needed
        if (typeof this.core.config.filter.elementTypes?.allowedTypes === "string") {
          this.core.config.filter.elementTypes.allowedTypes =
            this.core.config.filter.elementTypes.allowedTypes
              .split(",")
              .map((val) => val.trim())
              .filter((val) => val !== "");
          console.log(
            "🔧 FILTER FIX: Converted elementTypes.allowedTypes from string to array:",
            this.core.config.filter.elementTypes.allowedTypes
          );
        }

        if (typeof this.core.config.filter.elementTypes?.blacklistedTypes === "string") {
          this.core.config.filter.elementTypes.blacklistedTypes =
            this.core.config.filter.elementTypes.blacklistedTypes
              .split(",")
              .map((val) => val.trim())
              .filter((val) => val !== "");
          console.log(
            "🔧 FILTER FIX: Converted elementTypes.blacklistedTypes from string to array:",
            this.core.config.filter.elementTypes.blacklistedTypes
          );
        }

        // Now clean up arrays if they exist (remove empty strings)
        if (Array.isArray(this.core.config.filter.blacklistedValues)) {
          this.core.config.filter.blacklistedValues =
            this.core.config.filter.blacklistedValues.filter((val) => val && val.trim() !== "");
        }
        if (Array.isArray(this.core.config.filter.allowedValues)) {
          this.core.config.filter.allowedValues = this.core.config.filter.allowedValues.filter(
            (val) => val && val.trim() !== ""
          );
        }

        // Clean up tag filtering arrays if they exist
        if (this.core.config.filter.tagFiltering) {
          if (Array.isArray(this.core.config.filter.tagFiltering.blacklistedTags)) {
            this.core.config.filter.tagFiltering.blacklistedTags =
              this.core.config.filter.tagFiltering.blacklistedTags.filter(
                (val) => val && val.trim() !== ""
              );
          }
          if (Array.isArray(this.core.config.filter.tagFiltering.allowedTags)) {
            this.core.config.filter.tagFiltering.allowedTags =
              this.core.config.filter.tagFiltering.allowedTags.filter(
                (val) => val && val.trim() !== ""
              );
          }
        }

        // Clean up element labels arrays if they exist
        if (this.core.config.filter.elementLabels) {
          if (Array.isArray(this.core.config.filter.elementLabels.blacklistedValues)) {
            this.core.config.filter.elementLabels.blacklistedValues =
              this.core.config.filter.elementLabels.blacklistedValues.filter(
                (val) => val && val.trim() !== ""
              );
          }
          if (Array.isArray(this.core.config.filter.elementLabels.allowedValues)) {
            this.core.config.filter.elementLabels.allowedValues =
              this.core.config.filter.elementLabels.allowedValues.filter(
                (val) => val && val.trim() !== ""
              );
          }
        }

        // Clean up media index arrays if they exist
        if (this.core.config.filter.mediaIndexes) {
          if (Array.isArray(this.core.config.filter.mediaIndexes.blacklisted)) {
            this.core.config.filter.mediaIndexes.blacklisted =
              this.core.config.filter.mediaIndexes.blacklisted.filter(
                (val) => val && val.trim() !== ""
              );
          }
          if (Array.isArray(this.core.config.filter.mediaIndexes.allowed)) {
            this.core.config.filter.mediaIndexes.allowed =
              this.core.config.filter.mediaIndexes.allowed.filter(
                (val) => val && val.trim() !== ""
              );
          }
        }

        // Clean up element labels arrays if they exist
        if (this.core.config.filter.elementLabels) {
          if (Array.isArray(this.core.config.filter.elementLabels.blacklistedValues)) {
            this.core.config.filter.elementLabels.blacklistedValues =
              this.core.config.filter.elementLabels.blacklistedValues.filter(
                (val) => val && val.trim() !== ""
              );
          }
          if (Array.isArray(this.core.config.filter.elementLabels.allowedValues)) {
            this.core.config.filter.elementLabels.allowedValues =
              this.core.config.filter.elementLabels.allowedValues.filter(
                (val) => val && val.trim() !== ""
              );
          }
        }

        // Clean up element type arrays if they exist
        if (this.core.config.filter.elementTypes) {
          if (Array.isArray(this.core.config.filter.elementTypes.blacklistedTypes)) {
            this.core.config.filter.elementTypes.blacklistedTypes =
              this.core.config.filter.elementTypes.blacklistedTypes.filter(
                (val) => val && val.trim() !== ""
              );
          }
          if (Array.isArray(this.core.config.filter.elementTypes.allowedTypes)) {
            this.core.config.filter.elementTypes.allowedTypes =
              this.core.config.filter.elementTypes.allowedTypes.filter(
                (val) => val && val.trim() !== ""
              );
          }
        }

        // Clean up element type arrays
        if (this.core.config.filter.elementTypes) {
          Object.keys(this.core.config.filter.elementTypes).forEach((key) => {
            if (Array.isArray(this.core.config.filter.elementTypes[key])) {
              this.core.config.filter.elementTypes[key] = this.core.config.filter.elementTypes[
                key
              ].filter((val) => val && val.trim() !== "");
            }
          });
        }
      }

      console.log("✅ Filter configuration cleaned and ready:", this.core.config.filter);
    } catch (error) {
      console.error("🚨 Error updating filtering config from form:", error);
    }
  }
}

// Export for use in the control panel system
if (typeof module !== "undefined" && module.exports) {
  module.exports = FilteringTabHandler;
} else if (typeof window !== "undefined") {
  window.FilteringTabHandler = FilteringTabHandler;
}
