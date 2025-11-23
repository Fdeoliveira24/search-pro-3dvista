/**
 * Search Pro Control Panel - Content Tab Handler
 * Version 3.2 - Last Update on 11/01/2025 - Search Pro Configuration Loading - Google Sheets / CSV / Business JSON integration, runtime synchronization, Exact matches config, Silence Console Fix
 * Handles all functionality specific to the Content settings tab
 */

class ContentTabHandler {
  constructor() {
    this.core = null;
    this.tabId = "content";
  }

  /**
   * Set the core instance
   */
  setCore(core) {
    this.core = core;
  }

  /**
   * Initialize content tab functionality
   */
  init(container) {
    try {
      console.log("📄 Initializing Content tab handler");

      // Setup form listeners
      this.core.setupFormListeners(container);

      // Setup content-specific features
      this.setupContainerSearchHandlers(container);

      // Populate form with current values
      this.populateContentForm(container);

      // Validate all fields
      this.validateForm(container);

      // Setup reset button handlers
      this.setupResetButtonHandlers(container);

      console.log("✅ Content tab handler initialized");
    } catch (error) {
      console.error("❌ Error initializing Content tab:", error);
    }
  }

  /**
   * Populate content form with current values
   */
  populateContentForm(container) {
    try {
      // Let core populate most fields first
      this.core.populateForm(container);

      // Special handling for container names
      const containerNamesInput = container.querySelector("#containerNames");
      if (containerNamesInput && this.core.config.includeContent?.containerSearch?.containerNames) {
        const containerNames = this.core.config.includeContent.containerSearch.containerNames;
        if (Array.isArray(containerNames)) {
          containerNamesInput.value = containerNames.join(", ");
        } else {
          containerNamesInput.value = "";
        }
      }

      console.log("📄 Content form populated");
    } catch (error) {
      console.error("🚨 Security: Error populating content form:", error);
    }
  }

  /**
   * Setup container search integration handlers
   */
  setupContainerSearchHandlers(container) {
    try {
      const enableContainerSearchToggle = container.querySelector("#enableContainerSearch");
      const containerNamesInput = container.querySelector("#containerNames");

      if (enableContainerSearchToggle && containerNamesInput) {
        enableContainerSearchToggle.addEventListener("change", () => {
          containerNamesInput.disabled = !enableContainerSearchToggle.checked;
          if (enableContainerSearchToggle.checked) {
            containerNamesInput.focus();
          }
        });

        // Initial state
        containerNamesInput.disabled = !enableContainerSearchToggle.checked;
      }

      // Setup event handler for container names input
      if (containerNamesInput) {
        containerNamesInput.addEventListener("change", (e) => {
          this.handleContainerNamesChange(e.target);
        });
      }

      console.log("📄 Container search handlers initialized");
    } catch (error) {
      console.error("🚨 Security: Error setting up container search handlers:", error);
    }
  }

  /**
   * Handle container names change
   */
  handleContainerNamesChange(input) {
    try {
      const value = this.core.sanitizeInput(input.value);
      // Split by comma, trim each entry, and filter out empty entries
      const containerNames = value
        .split(",")
        .map((name) => name.trim())
        .filter((name) => name.length > 0);

      // Update config
      if (!this.core.config.includeContent) {
        this.core.config.includeContent = {};
      }
      if (!this.core.config.includeContent.containerSearch) {
        this.core.config.includeContent.containerSearch = {};
      }
      this.core.config.includeContent.containerSearch.containerNames = containerNames;

      console.log("📄 Container names updated:", containerNames);
    } catch (error) {
      console.error("🚨 Security: Error handling container names change:", error);
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
          const section = e.target.closest("button").dataset.section;
          if (section) {
            if (section === "contentInclusion") {
              this.resetContentInclusionToDefaults();
            } else if (section === "elementTypes") {
              this.resetElementTypesToDefaults();
            } else if (section === "containerSearch") {
              this.resetContainerSearchToDefaults();
            }
          }
        });
      });
      console.log(`🔄 Reset button handlers set up for ${resetButtons.length} buttons`);
    } catch (error) {
      console.error("🚨 Security: Error setting up reset button handlers:", error);
    }
  }

  /**
   * Reset Content Inclusion section to defaults
   */
  resetContentInclusionToDefaults() {
    try {
      const defaults = this.core.getDefaultConfig().includeContent || {};

      // Reset inclusion options
      if (!this.core.config.includeContent) {
        this.core.config.includeContent = {};
      }

      this.core.config.includeContent.unlabeledWithSubtitles =
        defaults.unlabeledWithSubtitles !== undefined ? defaults.unlabeledWithSubtitles : true;

      this.core.config.includeContent.unlabeledWithTags =
        defaults.unlabeledWithTags !== undefined ? defaults.unlabeledWithTags : true;

      this.core.config.includeContent.completelyBlank =
        defaults.completelyBlank !== undefined ? defaults.completelyBlank : true;

      // Update form
      const container = document.getElementById("content-panel");
      if (container) {
        this.populateContentForm(container);
      }

      if (this.core.showToast) {
        this.core.showToast(
          "success",
          "Reset Complete",
          "Content inclusion options reset to defaults"
        );
      }
      console.log("🔄 Content inclusion options reset to defaults");
    } catch (error) {
      console.error("🚨 Security: Error resetting content inclusion options:", error);
    }
  }

  /**
   * Reset Element Types section to defaults
   */
  resetElementTypesToDefaults() {
    try {
      const defaults = this.core.getDefaultConfig().includeContent?.elements || {};

      // Reset element types
      if (!this.core.config.includeContent) {
        this.core.config.includeContent = {};
      }
      if (!this.core.config.includeContent.elements) {
        this.core.config.includeContent.elements = {};
      }

      // Set all element type options to defaults or true
      const elementOptions = [
        "includePanoramas",
        "includeHotspots",
        "includePolygons",
        "includeVideos",
        "includeWebframes",
        "includeImages",
        "includeText",
        "includeProjectedImages",
        "include3DHotspots",
        "include3DModels",
        "include3DModelObjects",
        "includeBusiness",
        "includeContainers",
        "skipEmptyLabels",
      ];

      elementOptions.forEach((option) => {
        this.core.config.includeContent.elements[option] =
          defaults[option] !== undefined ? defaults[option] : true;
      });

      // Reset minLabelLength
      this.core.config.includeContent.elements.minLabelLength =
        defaults.minLabelLength !== undefined ? defaults.minLabelLength : 0;

      // Update form
      const container = document.getElementById("content-panel");
      if (container) {
        this.populateContentForm(container);
      }

      if (this.core.showToast) {
        this.core.showToast("success", "Reset Complete", "Element type options reset to defaults");
      }
      console.log("🔄 Element type options reset to defaults");
    } catch (error) {
      console.error("🚨 Security: Error resetting element type options:", error);
    }
  }

  /**
   * Reset Container Search section to defaults
   */
  resetContainerSearchToDefaults() {
    try {
      const defaults = this.core.getDefaultConfig().includeContent?.containerSearch || {};

      // Reset container search options
      if (!this.core.config.includeContent) {
        this.core.config.includeContent = {};
      }
      if (!this.core.config.includeContent.containerSearch) {
        this.core.config.includeContent.containerSearch = {};
      }

      this.core.config.includeContent.containerSearch.enableContainerSearch =
        defaults.enableContainerSearch !== undefined ? defaults.enableContainerSearch : true;

      this.core.config.includeContent.containerSearch.containerNames = Array.isArray(
        defaults.containerNames
      )
        ? [...defaults.containerNames]
        : ["My_Container", "TwinsViewer-Container"];

      // Update form
      const container = document.getElementById("content-panel");
      if (container) {
        this.populateContentForm(container);
      }

      if (this.core.showToast) {
        this.core.showToast(
          "success",
          "Reset Complete",
          "Container search options reset to defaults"
        );
      }
      console.log("🔄 Container search options reset to defaults");
    } catch (error) {
      console.error("🚨 Security: Error resetting container search options:", error);
    }
  }

  /**
   * Validate fields specific to Content tab
   */
  validateField(field) {
    try {
      const value = field.type === "checkbox" ? field.checked : field.value;
      const fieldName = this.core.sanitizeInput(field.name || field.id, 100);
      let isValid = true;

      // Call base validation first
      isValid = this.core.validateField(field);

      // Custom validation rules for Content tab fields
      if (fieldName === "includeContent.elements.minLabelLength") {
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 0) {
          isValid = false;
        }
      } else if (fieldName === "containerNames") {
        // Validate container names format
        const containerNames = value.split(",");
        for (const name of containerNames) {
          const trimmed = name.trim();
          if (trimmed && !/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
            isValid = false;
            break;
          }
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
      console.error("🚨 Security: Error in Content tab field validation:", error);
      return false;
    }
  }

  /**
   * Validate entire form for Content tab
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

      console.log(`📄 Content tab validation: ${isValid ? "PASSED" : "FAILED"}`);
      return isValid;
    } catch (error) {
      console.error("🚨 Security: Error validating Content tab form:", error);
      return false;
    }
  }

  /**
   * Handle tab-specific form changes
   */
  onFormChange(input) {
    try {
      const fieldName = input.name || input.id;

      // Special handling for container names
      if (fieldName === "containerNames") {
        this.handleContainerNamesChange(input);
        return;
      }

      // Let core handle the basic form change
      this.core.onFormChange(input);
    } catch (error) {
      console.error("🚨 Security: Error handling Content tab form change:", error);
    }
  }

  /**
   * Apply live preview for Content tab changes
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
              section: "content",
            },
            "*"
          );
        } catch (postError) {
          console.warn("🚨 Security: Error posting message to parent:", postError);
        }
      }

      console.log(`📄 Content live preview: ${fieldName} = ${value}`);
    } catch (error) {
      console.warn("🚨 Security: Content tab live preview failed:", error);
    }
  }

  /**
   * Reset Content tab to defaults
   */
  resetToDefaults() {
    try {
      console.log("🔄 Resetting Content tab to defaults");

      const defaults = this.core.getDefaultConfig();

      // Reset content settings
      if (defaults.includeContent) {
        this.core.config.includeContent = JSON.parse(JSON.stringify(defaults.includeContent));
      } else {
        // Create default content config if not in defaults
        this.core.config.includeContent = {
          unlabeledWithSubtitles: true,
          unlabeledWithTags: true,
          completelyBlank: true,
          elements: {
            includePanoramas: true,
            includeHotspots: true,
            includePolygons: true,
            includeVideos: true,
            includeWebframes: true,
            includeImages: true,
            includeText: true,
            includeProjectedImages: true,
            include3DHotspots: true,
            include3DModels: true,
            include3DModelObjects: true,
            includeBusiness: true,
            includeContainers: true,
            skipEmptyLabels: true,
            minLabelLength: 0,
          },
          containerSearch: {
            enableContainerSearch: true,
            containerNames: ["My_Container", "TwinsViewer-Container"],
          },
        };
      }

      // Update form fields
      const container = document.getElementById("content-panel");
      if (container) {
        this.populateContentForm(container);
      }

      console.log("✅ Content tab reset complete");
    } catch (error) {
      console.error("🚨 Security: Error resetting Content tab:", error);
    }
  }

  /**
   * Get Content tab configuration summary
   */
  getConfigSummary() {
    try {
      return {
        tab: "Content",
        sections: {
          contentInclusion: {
            unlabeledWithSubtitles: this.core.config.includeContent?.unlabeledWithSubtitles,
            unlabeledWithTags: this.core.config.includeContent?.unlabeledWithTags,
            completelyBlank: this.core.config.includeContent?.completelyBlank,
          },
          elementTypes: this.core.config.includeContent?.elements || {},
          containerSearch: this.core.config.includeContent?.containerSearch || {},
        },
      };
    } catch (error) {
      console.error("🚨 Security: Error getting Content tab config summary:", error);
      return null;
    }
  }

  /**
   * Cleanup resources when tab is unloaded
   */
  cleanup() {
    try {
      // Clean up any resources specific to Content tab
      console.log("🧹 Content tab handler cleaned up");
    } catch (error) {
      console.error("🚨 Security: Error cleaning up Content tab:", error);
    }
  }

  /**
   * Update configuration from form values for Content tab
   * @param {HTMLElement} container The content tab container element
   */
  updateConfigFromForm(container) {
    try {
      // Handle special container names input
      const containerNamesInput = container.querySelector("#containerNames");
      if (containerNamesInput) {
        this.handleContainerNamesChange(containerNamesInput);
      }

      // Handle other content-specific inputs that might need special processing
      // ...

      console.log("📄 Content tab config updated from form");
    } catch (error) {
      console.error("🚨 Security: Error updating content tab config from form:", error);
    }
  }
}

// Export for module use
if (typeof module !== "undefined" && module.exports) {
  module.exports = ContentTabHandler;
} else {
  window.ContentTabHandler = ContentTabHandler;
}
