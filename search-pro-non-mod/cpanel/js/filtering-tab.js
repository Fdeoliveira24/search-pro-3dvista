/**
 * Search Pro Control Panel - Filtering Tab Handler
 * Handles all functionality specific to the Filtering settings tab
 */

class FilteringTabHandler {
  constructor() {
    this.core = null;
    this.tabId = "filtering";
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
      console.log("🔍 Initializing Filtering tab handler");

      // Setup form listeners
      this.core.setupFormListeners(container);

      // Setup filtering-specific features
      this.setupFilterModeHandlers(container);
      this.setupArrayInputListeners(container);

      // Populate form with current values
      this.populateFilteringForm(container);

      // Validate all fields
      this.validateForm(container);

      // Setup reset button handlers
      this.setupResetButtonHandlers(container);

      console.log("✅ Filtering tab handler initialized");
    } catch (error) {
      console.error("❌ Error initializing Filtering tab:", error);
    }
  }

  /**
   * Setup array input event listeners
   */
  setupArrayInputListeners(container) {
    try {
      // Get all array input fields
      const arrayInputs = container.querySelectorAll('[id^="allowed"], [id^="blacklisted"]');
      
      arrayInputs.forEach(input => {
        // Add both change and input events for real-time updates
        input.addEventListener('change', () => this.handleArrayInputChange(input));
        input.addEventListener('input', () => this.handleArrayInputChange(input));
      });

      console.log(`🔍 Array input listeners set up for ${arrayInputs.length} inputs`);
    } catch (error) {
      console.error("Error setting up array input listeners:", error);
    }
  }

  /**
   * Populate filtering form with current values
   */
  populateFilteringForm(container) {
    try {
      // Let core populate most fields first
      this.core.populateForm(container);

      // Populate array inputs for each filtering section
      this.populateArrayInputs(container);

      // Update visibility based on current filter modes
      this.updateFilterVisibility(container);

      // Trigger initial visibility setup for all filter sections
      setTimeout(() => {
        this.updateAllFilterVisibility(container);
      }, 100);

      console.log("🔍 Filtering form populated");
    } catch (error) {
      console.error("Error populating filtering form:", error);
    }
  }

  /**
   * Populate array inputs (comma-separated values)
   */
  populateArrayInputs(container) {
    try {
      // Global filter arrays
      this.populateArrayInput(container, "allowedValuesGlobal", "filter.allowedValues");
      this.populateArrayInput(container, "blacklistedValuesGlobal", "filter.blacklistedValues");
      
      // Media indexes arrays
      this.populateArrayInput(container, "allowedMediaIndexes", "filter.allowedMediaIndexes");
      this.populateArrayInput(container, "blacklistedMediaIndexes", "filter.blacklistedMediaIndexes");
      
      // Element types arrays
      this.populateArrayInput(container, "allowedElementTypes", "filter.elementTypes.allowedTypes");
      this.populateArrayInput(container, "blacklistedElementTypes", "filter.elementTypes.blacklistedTypes");
      
      // Element labels arrays
      this.populateArrayInput(container, "allowedLabelValues", "filter.elementLabels.allowedValues");
      this.populateArrayInput(container, "blacklistedLabelValues", "filter.elementLabels.blacklistedValues");
      
      // Tag filtering arrays
      this.populateArrayInput(container, "allowedTags", "filter.tagFiltering.allowedTags");
      this.populateArrayInput(container, "blacklistedTags", "filter.tagFiltering.blacklistedTags");
      
      // Unique names arrays
      this.populateArrayInput(container, "allowedUniqueNames", "filter.uniqueNames.allowedNames");
      this.populateArrayInput(container, "blacklistedUniqueNames", "filter.uniqueNames.blacklistedNames");
    } catch (error) {
      console.error("Error populating array inputs:", error);
    }
  }

  /**
   * Populate a specific array input
   */
  populateArrayInput(container, inputId, configPath) {
    try {
      const input = container.querySelector(`#${inputId}`);
      if (!input) {
        console.warn(`🔍 Array input not found: ${inputId}`);
        return;
      }
      
      const values = this.core.getNestedProperty(this.core.config, configPath);
      if (Array.isArray(values)) {
        // Filter out empty values and join with commas
        const filteredValues = values.filter(v => v !== "" && v != null);
        input.value = filteredValues.length > 0 ? filteredValues.join(", ") : "";
      } else {
        input.value = "";
      }
      
      console.log(`🔍 Populated ${inputId} with values from ${configPath}`);
    } catch (error) {
      console.error(`Error populating array input ${inputId}:`, error);
    }
  }

  /**
   * Setup filter mode handlers
   */
  setupFilterModeHandlers(container) {
    try {
      // Global filter mode
      const globalModeSelect = container.querySelector('#filterModeGlobal');
      if (globalModeSelect) {
        globalModeSelect.addEventListener('change', () => {
          this.updateFilterVisibility(container, 'global', globalModeSelect.value);
        });
      }
      
      // Element types filter mode
      const elementTypesModeSelect = container.querySelector('#filterModeElementTypes');
      if (elementTypesModeSelect) {
        elementTypesModeSelect.addEventListener('change', () => {
          this.updateFilterVisibility(container, 'elementTypes', elementTypesModeSelect.value);
        });
      }
      
      // Element labels filter mode
      const elementLabelsModeSelect = container.querySelector('#filterModeElementLabels');
      if (elementLabelsModeSelect) {
        elementLabelsModeSelect.addEventListener('change', () => {
          this.updateFilterVisibility(container, 'elementLabels', elementLabelsModeSelect.value);
        });
      }
      
      // Tag filter mode
      const tagModeSelect = container.querySelector('#filterModeTag');
      if (tagModeSelect) {
        tagModeSelect.addEventListener('change', () => {
          this.updateFilterVisibility(container, 'tag', tagModeSelect.value);
        });
      }
      
      // Unique names filter mode
      const uniqueNamesModeSelect = container.querySelector('#filterModeUniqueNames');
      if (uniqueNamesModeSelect) {
        uniqueNamesModeSelect.addEventListener('change', () => {
          this.updateFilterVisibility(container, 'uniqueNames', uniqueNamesModeSelect.value);
        });
      }

      console.log("🔍 Filter mode handlers initialized");
    } catch (error) {
      console.error("Error setting up filter mode handlers:", error);
    }
  }

  /**
   * Update filter visibility based on filter mode
   */
  updateFilterVisibility(container, filterType, mode) {
    try {
      if (!container) return;
      
      // If no specific filter type provided, update all
      if (!filterType) {
        this.updateAllFilterVisibility(container);
        return;
      }
      
      // Simple selector mapping
      const selectors = {
        'global': '#globalFilterValues',
        'elementTypes': '#elementTypesFilterValues',
        'elementLabels': '#elementLabelsFilterValues',
        'tag': '#tagFilterValues',
        'uniqueNames': '#uniqueNamesFilterValues'
      };
      
      const valueContainer = container.querySelector(selectors[filterType]);
      if (!valueContainer) return;
      
      const allowedContainer = valueContainer.querySelector('.allowed-values-container');
      const blacklistedContainer = valueContainer.querySelector('.blacklisted-values-container');
      
      if (allowedContainer && blacklistedContainer) {
        // Simple show/hide logic
        allowedContainer.style.display = mode === 'whitelist' ? 'block' : 'none';
        blacklistedContainer.style.display = mode === 'blacklist' ? 'block' : 'none';
      }
    } catch (error) {
      console.error("Error updating filter visibility:", error);
    }
  }

  /**
   * Update all filter visibilities based on current config
   */
  updateAllFilterVisibility(container) {
    try {
      // Global filter
      const globalMode = this.core.getNestedProperty(this.core.config, 'filter.mode') || 'none';
      this.updateFilterVisibility(container, 'global', globalMode);
      
      // Element types filter
      const elementTypesMode = this.core.getNestedProperty(this.core.config, 'filter.elementTypes.mode') || 'none';
      this.updateFilterVisibility(container, 'elementTypes', elementTypesMode);
      
      // Element labels filter
      const elementLabelsMode = this.core.getNestedProperty(this.core.config, 'filter.elementLabels.mode') || 'none';
      this.updateFilterVisibility(container, 'elementLabels', elementLabelsMode);
      
      // Tag filter
      const tagMode = this.core.getNestedProperty(this.core.config, 'filter.tagFiltering.mode') || 'none';
      this.updateFilterVisibility(container, 'tag', tagMode);
      
      // Unique names filter
      const uniqueNamesMode = this.core.getNestedProperty(this.core.config, 'filter.uniqueNames.mode') || 'none';
      this.updateFilterVisibility(container, 'uniqueNames', uniqueNamesMode);
    } catch (error) {
      console.error("Error updating all filter visibilities:", error);
    }
  }

  /**
   * Setup reset button handlers for all filter sections
   */
  setupResetButtonHandlers(container) {
    try {
      const resetButtons = container.querySelectorAll('.reset-section-button');
      resetButtons.forEach((button) => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          const section = button.dataset.section;
          if (section === "globalFilter") {
            this.resetGlobalFilterToDefaults();
          } else if (section === "tagFiltering") {
            this.resetTagFilteringToDefaults();
          } else if (section === "categoryFiltering") {
            this.resetCategoryFilteringToDefaults();
          } else if (section === "customFieldFiltering") {
            this.resetCustomFieldFilteringToDefaults();
          }
          // Add more sections as needed
        });
      });
      console.log(`🔄 Reset button handlers set up for ${resetButtons.length} buttons`);
    } catch (error) {
      console.error("🚨 Error setting up reset button handlers:", error);
    }
  }

  /**
   * Reset Global Filter section to defaults
   */
  resetGlobalFilterToDefaults(container) {
    try {
      const defaults = this.core.getDefaultConfig().filter || {};

      // Reset global filter options
      if (!this.core.config.filter) {
        this.core.config.filter = {};
      }

      this.core.config.filter.mode = defaults.mode || "none";
      this.core.config.filter.allowedValues = Array.isArray(defaults.allowedValues) ? 
        [...defaults.allowedValues] : [""];
      this.core.config.filter.blacklistedValues = Array.isArray(defaults.blacklistedValues) ? 
        [...defaults.blacklistedValues] : [""];

      // Update form fields
      const modeSelect = container.querySelector('#filterModeGlobal');
      if (modeSelect) {
        modeSelect.value = this.core.config.filter.mode;
      }
      
      this.populateArrayInput(container, "allowedValuesGlobal", "filter.allowedValues");
      this.populateArrayInput(container, "blacklistedValuesGlobal", "filter.blacklistedValues");
      
      // Update visibility
      this.updateFilterVisibility(container, 'global', this.core.config.filter.mode);

      if (this.core.showToast) {
        this.core.showToast(
          "success",
          "Reset Complete",
          "Global content filter reset to defaults"
        );
      }
      console.log("🔄 Global content filter reset to defaults");
    } catch (error) {
      console.error("Error resetting global filter:", error);
    }
  }

  /**
   * Reset Media Index Filter section to defaults
   */
  resetMediaIndexFilterToDefaults(container) {
    try {
      const defaults = this.core.getDefaultConfig().filter || {};

      // Reset media index filter options
      if (!this.core.config.filter) {
        this.core.config.filter = {};
      }

      this.core.config.filter.allowedMediaIndexes = Array.isArray(defaults.allowedMediaIndexes) ? 
        [...defaults.allowedMediaIndexes] : [""];
      this.core.config.filter.blacklistedMediaIndexes = Array.isArray(defaults.blacklistedMediaIndexes) ? 
        [...defaults.blacklistedMediaIndexes] : [""];

      // Update form
      this.populateArrayInput(container, "allowedMediaIndexes", "filter.allowedMediaIndexes");
      this.populateArrayInput(container, "blacklistedMediaIndexes", "filter.blacklistedMediaIndexes");

      if (this.core.showToast) {
        this.core.showToast(
          "success",
          "Reset Complete",
          "Media index filter reset to defaults"
        );
      }
      console.log("🔄 Media index filter reset to defaults");
    } catch (error) {
      console.error("Error resetting media index filter:", error);
    }
  }

  /**
   * Reset Element Types Filter section to defaults
   */
  resetElementTypesFilterToDefaults(container) {
    try {
      const defaults = this.core.getDefaultConfig().filter?.elementTypes || {};

      // Reset element types filter options
      if (!this.core.config.filter) {
        this.core.config.filter = {};
      }
      if (!this.core.config.filter.elementTypes) {
        this.core.config.filter.elementTypes = {};
      }

      this.core.config.filter.elementTypes.mode = defaults.mode || "none";
      this.core.config.filter.elementTypes.allowedTypes = Array.isArray(defaults.allowedTypes) ? 
        [...defaults.allowedTypes] : [""];
      this.core.config.filter.elementTypes.blacklistedTypes = Array.isArray(defaults.blacklistedTypes) ? 
        [...defaults.blacklistedTypes] : [""];

      // Update form fields
      const modeSelect = container.querySelector('#filterModeElementTypes');
      if (modeSelect) {
        modeSelect.value = this.core.config.filter.elementTypes.mode;
      }
      
      this.populateArrayInput(container, "allowedElementTypes", "filter.elementTypes.allowedTypes");
      this.populateArrayInput(container, "blacklistedElementTypes", "filter.elementTypes.blacklistedTypes");
      
      // Update visibility
      this.updateFilterVisibility(container, 'elementTypes', this.core.config.filter.elementTypes.mode);

      if (this.core.showToast) {
        this.core.showToast(
          "success",
          "Reset Complete",
          "Element types filter reset to defaults"
        );
      }
      console.log("🔄 Element types filter reset to defaults");
    } catch (error) {
      console.error("Error resetting element types filter:", error);
    }
  }

  /**
   * Reset Element Labels Filter section to defaults
   */
  resetElementLabelsFilterToDefaults(container) {
    try {
      const defaults = this.core.getDefaultConfig().filter?.elementLabels || {};

      // Reset element labels filter options
      if (!this.core.config.filter) {
        this.core.config.filter = {};
      }
      if (!this.core.config.filter.elementLabels) {
        this.core.config.filter.elementLabels = {};
      }

      this.core.config.filter.elementLabels.mode = defaults.mode || "none";
      this.core.config.filter.elementLabels.allowedValues = Array.isArray(defaults.allowedValues) ? 
        [...defaults.allowedValues] : [""];
      this.core.config.filter.elementLabels.blacklistedValues = Array.isArray(defaults.blacklistedValues) ? 
        [...defaults.blacklistedValues] : [""];

      // Update form fields
      const modeSelect = container.querySelector('#filterModeElementLabels');
      if (modeSelect) {
        modeSelect.value = this.core.config.filter.elementLabels.mode;
      }
      
      this.populateArrayInput(container, "allowedLabelValues", "filter.elementLabels.allowedValues");
      this.populateArrayInput(container, "blacklistedLabelValues", "filter.elementLabels.blacklistedValues");
      
      // Update visibility
      this.updateFilterVisibility(container, 'elementLabels', this.core.config.filter.elementLabels.mode);

      if (this.core.showToast) {
        this.core.showToast(
          "success",
          "Reset Complete",
          "Element labels filter reset to defaults"
        );
      }
      console.log("🔄 Element labels filter reset to defaults");
    } catch (error) {
      console.error("Error resetting element labels filter:", error);
    }
  }

  /**
   * Reset Tag Filtering section to defaults
   */
  resetTagFilteringToDefaults(container) {
    try {
      const defaults = this.core.getDefaultConfig().filter?.tagFiltering || {};

      // Reset tag filtering options
      if (!this.core.config.filter) {
        this.core.config.filter = {};
      }
      if (!this.core.config.filter.tagFiltering) {
        this.core.config.filter.tagFiltering = {};
      }

      this.core.config.filter.tagFiltering.mode = defaults.mode || "none";
      this.core.config.filter.tagFiltering.allowedTags = Array.isArray(defaults.allowedTags) ? 
        [...defaults.allowedTags] : [""];
      this.core.config.filter.tagFiltering.blacklistedTags = Array.isArray(defaults.blacklistedTags) ? 
        [...defaults.blacklistedTags] : [""];

      // Update form fields
      const modeSelect = container.querySelector('#filterModeTag');
      if (modeSelect) {
        modeSelect.value = this.core.config.filter.tagFiltering.mode;
      }
      
      this.populateArrayInput(container, "allowedTags", "filter.tagFiltering.allowedTags");
      this.populateArrayInput(container, "blacklistedTags", "filter.tagFiltering.blacklistedTags");
      
      // Update visibility
      this.updateFilterVisibility(container, 'tag', this.core.config.filter.tagFiltering.mode);

      if (this.core.showToast) {
        this.core.showToast(
          "success",
          "Reset Complete",
          "Tag filtering reset to defaults"
        );
      }
      console.log("🔄 Tag filtering reset to defaults");
    } catch (error) {
      console.error("Error resetting tag filtering:", error);
    }
  }

  /**
   * Reset Unique Names Filter section to defaults
   */
  resetUniqueNamesFilterToDefaults(container) {
    try {
      const defaults = this.core.getDefaultConfig().filter?.uniqueNames || {};

      // Reset unique names filter options
      if (!this.core.config.filter) {
        this.core.config.filter = {};
      }
      if (!this.core.config.filter.uniqueNames) {
        this.core.config.filter.uniqueNames = {};
      }

      this.core.config.filter.uniqueNames.mode = defaults.mode || "none";
      this.core.config.filter.uniqueNames.allowedNames = Array.isArray(defaults.allowedNames) ? 
        [...defaults.allowedNames] : [""];
      this.core.config.filter.uniqueNames.blacklistedNames = Array.isArray(defaults.blacklistedNames) ? 
        [...defaults.blacklistedNames] : [""];

      // Update form fields
      const modeSelect = container.querySelector('#filterModeUniqueNames');
      if (modeSelect) {
        modeSelect.value = this.core.config.filter.uniqueNames.mode;
      }
      
      this.populateArrayInput(container, "allowedUniqueNames", "filter.uniqueNames.allowedNames");
      this.populateArrayInput(container, "blacklistedUniqueNames", "filter.uniqueNames.blacklistedNames");
      
      // Update visibility
      this.updateFilterVisibility(container, 'uniqueNames', this.core.config.filter.uniqueNames.mode);

      if (this.core.showToast) {
        this.core.showToast(
          "success",
          "Reset Complete",
          "Unique names filter reset to defaults"
        );
      }
      console.log("🔄 Unique names filter reset to defaults");
    } catch (error) {
      console.error("Error resetting unique names filter:", error);
    }
  }

  /**
   * Handle array input changes - ENHANCED VERSION
   */
  handleArrayInputChange(input) {
    try {
      const value = this.core.sanitizeInput(input.value);
      const fieldName = input.name || input.id;
      
      // Process comma-separated values, filtering out empty strings
      const values = value 
        ? value.split(",")
            .map(item => item.trim())
            .filter(item => item.length > 0)
        : [];
      
      // Add empty string if no values (maintains config structure)
      const finalValues = values.length > 0 ? values : [""];
      
      // Direct mapping to config paths
      const configPaths = {
        allowedValuesGlobal: "filter.allowedValues",
        blacklistedValuesGlobal: "filter.blacklistedValues",
        allowedMediaIndexes: "filter.allowedMediaIndexes",
        blacklistedMediaIndexes: "filter.blacklistedMediaIndexes",
        allowedElementTypes: "filter.elementTypes.allowedTypes",
        blacklistedElementTypes: "filter.elementTypes.blacklistedTypes",
        allowedLabelValues: "filter.elementLabels.allowedValues",
        blacklistedLabelValues: "filter.elementLabels.blacklistedValues",
        allowedTags: "filter.tagFiltering.allowedTags",
        blacklistedTags: "filter.tagFiltering.blacklistedTags",
        allowedUniqueNames: "filter.uniqueNames.allowedNames",
        blacklistedUniqueNames: "filter.uniqueNames.blacklistedNames"
      };
      
      const configPath = configPaths[fieldName];
      if (configPath) {
        this.core.safeSetNestedProperty(this.core.config, configPath, finalValues);
        this.core.applyLivePreview(configPath, finalValues);
        console.log(`🔍 Array input updated: ${fieldName} = ${JSON.stringify(finalValues)}`);
      } else {
        console.warn(`🔍 Unknown array input field: ${fieldName}`);
      }
      
      // Validate the field
      this.validateField(input);
      
    } catch (error) {
      console.error("Error handling array input change:", error);
    }
  }

  /**
   * Handle filter mode changes - ENHANCED VERSION
   */
  handleFilterModeChange(select) {
    try {
      const value = select.value;
      const fieldName = select.name || select.id;
      
      // Direct mapping to config paths
      const configPaths = {
        filterModeGlobal: "filter.mode",
        filterModeElementTypes: "filter.elementTypes.mode", 
        filterModeElementLabels: "filter.elementLabels.mode",
        filterModeTag: "filter.tagFiltering.mode",
        filterModeUniqueNames: "filter.uniqueNames.mode"
      };
      
      const configPath = configPaths[fieldName];
      if (configPath) {
        this.core.safeSetNestedProperty(this.core.config, configPath, value);
        this.core.applyLivePreview(configPath, value);
        
        // Update visibility for the specific filter type
        const filterTypes = {
          filterModeGlobal: 'global',
          filterModeElementTypes: 'elementTypes', 
          filterModeElementLabels: 'elementLabels',
          filterModeTag: 'tag',
          filterModeUniqueNames: 'uniqueNames'
        };
        
        const container = document.getElementById("filtering-panel");
        const filterType = filterTypes[fieldName];
        if (container && filterType) {
          this.updateFilterVisibility(container, filterType, value);
        }
        
        console.log(`🔍 Filter mode updated: ${fieldName} = ${value}`);
      } else {
        console.warn(`🔍 Unknown filter mode field: ${fieldName}`);
      }
      
      // Validate the field
      this.validateField(select);
      
    } catch (error) {
      console.error("Error handling filter mode change:", error);
    }
  }

  /**
   * Override core form change handling for filtering-specific inputs
   */
  onFormChange(input) {
    try {
      const fieldName = input.name || input.id;
      
      // Handle array inputs
      if (fieldName && (fieldName.startsWith("allowed") || fieldName.startsWith("blacklisted"))) {
        this.handleArrayInputChange(input);
        return;
      }
      
      // Handle filter mode selects
      if (fieldName && fieldName.startsWith("filterMode")) {
        this.handleFilterModeChange(input);
        return;
      }
      
      // Let core handle other changes
      this.core.onFormChange(input);
    } catch (error) {
      console.error("Error handling filtering form change:", error);
    }
  }

  /**
   * Validate field for Filtering tab
   */
  validateField(field) {
    try {
      const value = field.type === "checkbox" ? field.checked : field.value;
      const fieldName = this.core.sanitizeInput(field.name || field.id, 100);
      let isValid = true;

      // Call base validation first
      isValid = this.core.validateField(field);

      // Apply validation styling
      if (!isValid) {
        field.classList.add("error");
      } else {
        field.classList.remove("error");
        field.classList.add("valid");
      }

      return isValid;
    } catch (error) {
      console.error("Error in Filtering tab field validation:", error);
      return false;
    }
  }

  /**
   * Validate entire form for Filtering tab
   */
  validateForm(container = document) {
    try {
      const formInputs = container.querySelectorAll(
        ".form-input, .toggle-input, .range-input, .form-select"
      );
      let isValid = true;
      const validationErrors = [];

      formInputs.forEach((input) => {
        if (!this.validateField(input)) {
          isValid = false;
          const fieldName = input.name || input.id;
          validationErrors.push(fieldName);
        }
      });

      // Additional filtering-specific validation
      const filterModeSelects = container.querySelectorAll('[id^="filterMode"]');
      filterModeSelects.forEach(select => {
        const value = select.value;
        if (!["none", "whitelist", "blacklist"].includes(value)) {
          isValid = false;
          validationErrors.push(select.id);
        }
      });

      if (validationErrors.length > 0) {
        console.warn(`🔍 Validation errors in fields: ${validationErrors.join(", ")}`);
      }

      console.log(`🔍 Filtering tab validation: ${isValid ? "PASSED" : "FAILED"}`);
      return isValid;
    } catch (error) {
      console.error("Error validating Filtering tab form:", error);
      return false;
    }
  }

  /**
   * Apply live preview for Filtering tab changes
   */
  applyLivePreview(fieldName, value) {
    try {
      // Create preview config
      const previewConfig = JSON.parse(JSON.stringify(this.core.config));
      
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
              value:
                typeof value === "string"
                  ? this.core.sanitizeInput(value)
                  : value,
              section: "filtering",
            },
            "*"
          );
        } catch (postError) {
          console.warn("Error posting message to parent:", postError);
        }
      }

      console.log(`🔍 Filtering live preview: ${fieldName} = ${value}`);
    } catch (error) {
      console.warn("Filtering tab live preview failed:", error);
    }
  }

  /**
   * Reset Filtering tab to defaults
   */
  resetToDefaults() {
    try {
      console.log("🔄 Resetting Filtering tab to defaults");

      const defaults = this.core.getDefaultConfig();

      // Reset filtering settings
      if (defaults.filter) {
        this.core.config.filter = JSON.parse(
          JSON.stringify(defaults.filter)
        );
      } else {
        // Create default filtering config if not in defaults
        this.core.config.filter = {
          mode: "none",
          allowedValues: [""],
          blacklistedValues: [""],
          allowedMediaIndexes: [""],
          blacklistedMediaIndexes: [""],
          elementTypes: {
            mode: "none",
            allowedTypes: [""],
            blacklistedTypes: [""]
          },
          elementLabels: {
            mode: "none",
            allowedValues: [""],
            blacklistedValues: [""]
          },
          tagFiltering: {
            mode: "none",
            allowedTags: [""],
            blacklistedTags: [""]
          },
          uniqueNames: {
            mode: "none",
            allowedNames: [""],
            blacklistedNames: [""]
          }
        };
      }

      // Update form fields
      const container = document.getElementById("filtering-panel");
      if (container) {
        this.populateFilteringForm(container);
      }

      console.log("✅ Filtering tab reset complete");
    } catch (error) {
      console.error("Error resetting Filtering tab:", error);
    }
  }

  /**
   * Get Filtering tab configuration summary
   */
  getConfigSummary() {
    try {
      return {
        tab: "Filtering",
        sections: {
          globalFilter: {
            mode: this.core.config.filter?.mode || "none",
            allowedValues: this.core.config.filter?.allowedValues || [""],
            blacklistedValues: this.core.config.filter?.blacklistedValues || [""]
          },
          mediaIndexes: {
            allowedMediaIndexes: this.core.config.filter?.allowedMediaIndexes || [""],
            blacklistedMediaIndexes: this.core.config.filter?.blacklistedMediaIndexes || [""]
          },
          elementTypes: this.core.config.filter?.elementTypes || {},
          elementLabels: this.core.config.filter?.elementLabels || {},
          tagFiltering: this.core.config.filter?.tagFiltering || {},
          uniqueNames: this.core.config.filter?.uniqueNames || {}
        }
      };
    } catch (error) {
      console.error("Error getting Filtering tab config summary:", error);
      return null;
    }
  }

  /**
   * Cleanup resources when tab is unloaded
   */
  cleanup() {
    try {
      // Clean up any resources specific to Filtering tab
      console.log("🧹 Filtering tab handler cleaned up");
    } catch (error) {
      console.error("Error cleaning up Filtering tab:", error);
    }
  }

  /**
   * Update configuration from form values for Filtering tab
   * @param {HTMLElement} container The filtering tab container element
   */
  updateConfigFromForm(container) {
    try {
      // Process all array inputs
      const arrayInputs = container.querySelectorAll('[id^="allowed"], [id^="blacklisted"]');
      arrayInputs.forEach(input => {
        this.handleArrayInputChange(input);
      });

      // Process all filter mode selects
      const modeSelects = container.querySelectorAll('[id^="filterMode"]');
      modeSelects.forEach(select => {
        this.handleFilterModeChange(select);
      });

      console.log("🔍 Filtering tab config updated from form");
    } catch (error) {
      console.error("Error updating filtering tab config from form:", error);
    }
  }
}

// Export for module use
if (typeof module !== "undefined" && module.exports) {
  module.exports = FilteringTabHandler;
} else {
  window.FilteringTabHandler = FilteringTabHandler;
}