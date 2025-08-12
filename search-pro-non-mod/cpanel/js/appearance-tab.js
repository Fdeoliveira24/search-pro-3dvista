/**
 * Search Pro Control Panel - Appearance Tab Handler
 * Handles all functionality specific to the Appearance settings tab
 */

class AppearanceTabHandler {
  constructor() {
    this.core = null;
    this.tabId = "appearance";
  }

  /**
   * Set the core instance
   */
  setCore(core) {
    this.core = core;
  }

  /**
   * Initialize appearance tab functionality
   */
  init(container) {
    try {
      console.log("🎨 Initializing Appearance tab handler");

      // Setup form listeners
      this.core.setupFormListeners(container);

      // Setup appearance-specific handlers
      this.setupAppearanceHandlers(container);

      // Populate form with current values
      this.core.populateForm(container);

      // Validate all fields
      this.validateForm(container);

      console.log("✅ Appearance tab handler initialized");
    } catch (error) {
      console.error("❌ Error initializing Appearance tab:", error);
    }
  }

  /**
   * Setup appearance-specific handlers
   */
  setupAppearanceHandlers(container) {
    try {
      // Color picker handlers
      this.setupColorPickerHandlers(container);

      // Range slider handlers
      this.setupRangeSliderHandlers(container);

      // Reset button handlers
      this.setupResetButtonHandlers(container);

      // Typography dropdown handlers
      this.setupTypographyHandlers(container);

      console.log("🎨 Appearance handlers initialized");
    } catch (error) {
      console.error(
        "🚨 Security: Error setting up appearance handlers:",
        error,
      );
    }
  }

  /**
   * Setup color picker handlers
   */
  setupColorPickerHandlers(container) {
    try {
      const colorInputs = container.querySelectorAll(".color-input");
      colorInputs.forEach((input) => {
        const hexInput = input.parentNode.querySelector(".color-hex-input");
        if (!hexInput) return;

        // Update HEX input when color picker changes
        input.addEventListener("input", (e) => {
          hexInput.value = e.target.value;
          hexInput.classList.remove("error");
          this.core.onFormChange(e.target);
          this.applyColorLivePreview(e.target.id, e.target.value);
        });

        // Update color picker when HEX input changes
        hexInput.addEventListener("input", (e) => {
          if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(e.target.value)) {
            input.value = e.target.value;
            hexInput.classList.remove("error");
            this.core.onFormChange(input);
            this.applyColorLivePreview(input.id, input.value);
          } else {
            hexInput.classList.add("error");
          }
        });

        // Initialize HEX input value
        hexInput.value = input.value;
      });

      console.log(
        `🎨 Color picker handlers set up for ${colorInputs.length} inputs`,
      );
    } catch (error) {
      console.error("🚨 Error setting up color picker handlers:", error);
    }
  }

  /**
   * Get contrast color for text readability
   */
  getContrastColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);

    // Calculate luminance (perceived brightness)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return white for dark colors, black for light colors
    return luminance > 0.5 ? "#000000" : "#ffffff";
  }

  /**
   * Setup range slider handlers
   */
  setupRangeSliderHandlers(container) {
    try {
      const rangeInputs = container.querySelectorAll(".range-input");
      rangeInputs.forEach((input) => {
        const updateValue = (e) => {
          const valueDisplay =
            e.target.parentNode.querySelector(".range-value");
          if (valueDisplay) {
            valueDisplay.textContent = e.target.value;
            // Add highlight effect to show changes
            valueDisplay.classList.add("updated");
            setTimeout(() => valueDisplay.classList.remove("updated"), 500);
          }
          this.core.onFormChange(e.target);

          // Live preview for specific range sliders
          if (e.target.id === "highlightOpacity") {
            this.applyHighlightOpacityPreview(e.target.value);
          }
        };

        input.addEventListener("input", updateValue);
        input.addEventListener("change", updateValue);
      });

      console.log(
        `📊 Range slider handlers set up for ${rangeInputs.length} inputs`,
      );
    } catch (error) {
      console.error("🚨 Error setting up range slider handlers:", error);
    }
  }

  /**
   * Apply highlight opacity preview
   */
  applyHighlightOpacityPreview(value) {
    try {
      // Update CSS variable for highlight opacity
      document.documentElement.style.setProperty(
        "--search-highlight-bg-opacity",
        value,
      );
    } catch (error) {
      console.error("🚨 Error applying highlight opacity preview:", error);
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
            this.resetColorSection(section);
            // Show feedback toast
            this.core.showToast(
              "success",
              `${section} Reset`,
              `${section} colors restored to defaults`,
            );
          }
        });
      });

      console.log(
        `🔄 Reset button handlers set up for ${resetButtons.length} buttons`,
      );
    } catch (error) {
      console.error("🚨 Error setting up reset button handlers:", error);
    }
  }

  /**
   * Setup typography dropdown and input handlers
   */
  setupTypographyHandlers(container) {
    try {
      const typographySelects = container.querySelectorAll(".form-select");
      typographySelects.forEach((select) => {
        select.addEventListener("change", (e) => {
          this.core.onFormChange(e.target);
          this.applyTypographyPreview(e.target.id, e.target.value);
        });
      });

      // Handle text inputs for typography values
      const typographyInputs = container.querySelectorAll(
        'input[id^="input"], input[id^="placeholder"], input[id^="focus"]',
      );
      typographyInputs.forEach((input) => {
        input.addEventListener("change", (e) => {
          this.core.onFormChange(e.target);
          this.applyTypographyPreview(e.target.id, e.target.value);
        });

        input.addEventListener("input", (e) => {
          this.applyTypographyPreview(e.target.id, e.target.value);
        });
      });

      console.log(
        `📝 Typography handlers set up for ${typographySelects.length} selects and ${typographyInputs.length} inputs`,
      );
    } catch (error) {
      console.error("🚨 Error setting up typography handlers:", error);
    }
  }

  /**
   * Apply color live preview by updating CSS variables
   */
  applyColorLivePreview(fieldName, value) {
    try {
      const cssVarMap = {
        searchBackground: "--search-background",
        searchText: "--search-text",
        placeholderText: "--placeholder-text",
        searchIcon: "--search-icon",
        clearIcon: "--clear-icon",
        resultsBackground: "--results-background",
        resultText: "--result-text",
        resultHover: "--result-hover-bg",
        resultBorderLeft: "--result-border-left",
        groupHeaderColor: "--group-header-color",
        groupCountColor: "--group-count-color",
        resultSubtitle: "--result-subtitle",
        resultIconColor: "--result-icon-color",
        resultSubtextColor: "--result-subtext-color",
        highlightBackground: "--search-highlight-bg",
        highlightText: "--search-highlight-color",
        tagBackground: "--tag-background",
        tagText: "--tag-text",
        tagBorder: "--tag-border",
      };

      const shortField = fieldName.split(".").pop();
      const cssVar = cssVarMap[fieldName] || cssVarMap[shortField];

      if (cssVar) {
        document.documentElement.style.setProperty(cssVar, value);
        const previewPanel = document.getElementById("livePreviewPanel");
        if (previewPanel) {
          previewPanel.style.setProperty(cssVar, value);
        }
        console.log(`🎨 Applied live preview for ${fieldName}: ${value}`);
      }
    } catch (error) {
      console.error("🚨 Error applying color live preview:", error);
    }
  }

  /**
   * Apply border radius live preview
   */
  applyBorderRadiusLivePreview(fieldName, value) {
    try {
      const cssVarMap = {
        searchBorderTopLeft: "--search-field-radius-top-left",
        searchBorderTopRight: "--search-field-radius-top-right",
        searchBorderBottomLeft: "--search-field-radius-bottom-left",
        searchBorderBottomRight: "--search-field-radius-bottom-right",
        resultsBorderTopLeft: "--search-results-radius-top-left",
        resultsBorderTopRight: "--search-results-radius-top-right",
        resultsBorderBottomLeft: "--search-results-radius-bottom-left",
        resultsBorderBottomRight: "--search-results-radius-bottom-right",
        tagBorderRadius: "--tag-border-radius",
      };

      const shortField = fieldName.split(".").pop();
      const cssVar = cssVarMap[fieldName] || cssVarMap[shortField];

      if (cssVar) {
        document.documentElement.style.setProperty(cssVar, `${value}px`);
        const previewPanel = document.getElementById("livePreviewPanel");
        if (previewPanel) {
          previewPanel.style.setProperty(cssVar, `${value}px`);
        }
        console.log(
          `🔄 Applied border radius preview for ${fieldName}: ${value}px`,
        );
      }
    } catch (error) {
      console.error("🚨 Error applying border radius live preview:", error);
    }
  }

  /**
   * Apply typography live preview
   */
  applyTypographyPreview(fieldId, value) {
    try {
      const cssVarMap = {
        inputFontSize: "--search-input-font-size",
        inputFontFamily: "--search-input-font-family",
        inputFontWeight: "--search-input-font-weight",
        inputFontStyle: "--search-input-font-style",
        inputLineHeight: "--search-input-line-height",
        inputLetterSpacing: "--search-input-letter-spacing",
        inputTextTransform: "--search-input-text-transform",
        placeholderFontSize: "--search-placeholder-font-size",
        placeholderFontFamily: "--search-placeholder-font-family",
        placeholderFontWeight: "--search-placeholder-font-weight",
        placeholderFontStyle: "--search-placeholder-font-style",
        placeholderOpacity: "--search-placeholder-opacity",
        placeholderLetterSpacing: "--search-placeholder-letter-spacing",
        placeholderTextTransform: "--search-placeholder-text-transform",
        focusFontSize: "--search-focus-font-size",
        focusFontWeight: "--search-focus-font-weight",
        focusLetterSpacing: "--search-focus-letter-spacing",
      };

      const cssVar = cssVarMap[fieldId];
      if (cssVar) {
        document.documentElement.style.setProperty(cssVar, value);
        const previewPanel = document.getElementById("livePreviewPanel");
        if (previewPanel) {
          previewPanel.style.setProperty(cssVar, value);
        }
        console.log(`📝 Applied typography preview for ${fieldId}: ${value}`);
      }
    } catch (error) {
      console.error("🚨 Error applying typography preview:", error);
    }
  }

  /**
   * Reset color section to defaults
   */
  resetColorSection(section) {
    try {
      const defaults = this.core.getDefaultConfig();
      let sectionDefaults = {};

      switch (section) {
        case "searchField":
          sectionDefaults = {
            searchBackground: defaults.appearance.colors.searchBackground,
            searchText: defaults.appearance.colors.searchText,
            placeholderText: defaults.appearance.colors.placeholderText,
            searchIcon: defaults.appearance.colors.searchIcon,
            clearIcon: defaults.appearance.colors.clearIcon,
          };
          break;
        case "searchResults":
          sectionDefaults = {
            resultsBackground: defaults.appearance.colors.resultsBackground,
            resultText: defaults.appearance.colors.resultText,
            resultHover: defaults.appearance.colors.resultHover,
            resultBorderLeft: defaults.appearance.colors.resultBorderLeft,
            groupHeaderColor: defaults.appearance.colors.groupHeaderColor,
            groupCountColor: defaults.appearance.colors.groupCountColor,
            resultSubtitle: defaults.appearance.colors.resultSubtitle,
            resultIconColor: defaults.appearance.colors.resultIconColor,
            resultSubtextColor: defaults.appearance.colors.resultSubtextColor,
          };
          break;
        case "highlight":
          sectionDefaults = {
            highlightBackground: defaults.appearance.colors.highlightBackground,
            highlightText: defaults.appearance.colors.highlightText,
            highlightBackgroundOpacity:
              defaults.appearance.colors.highlightBackgroundOpacity,
          };

          // Also reset the range slider for highlight opacity
          const opacitySlider = document.getElementById("highlightOpacity");
          if (opacitySlider) {
            opacitySlider.value =
              defaults.appearance.colors.highlightBackgroundOpacity;
            const valueDisplay =
              opacitySlider.parentNode.querySelector(".range-value");
            if (valueDisplay) {
              valueDisplay.textContent =
                defaults.appearance.colors.highlightBackgroundOpacity;
            }
          }
          break;
        case "tags":
          sectionDefaults = {
            tagBackground: defaults.appearance.colors.tagBackground,
            tagText: defaults.appearance.colors.tagText,
            tagBorder: defaults.appearance.colors.tagBorder,
          };
          break;
        case "typography":
          this.resetTypographySection();
          return;
      }

      // Apply color defaults
      Object.keys(sectionDefaults).forEach((fieldId) => {
        const field = document.getElementById(fieldId);
        if (field) {
          field.value = sectionDefaults[fieldId];
          // Update HEX input
          const hexInput = field.parentNode.querySelector(".color-hex-input");
          if (hexInput) {
            hexInput.value = field.value.toLowerCase();
            hexInput.classList.remove("error");
          }
          this.core.onFormChange(field);
        }
      });

      console.log(`🎨 ${section} colors reset to defaults`);
    } catch (error) {
      console.error("🚨 Error resetting color section:", error);
    }
  }

  /**
   * Reset typography settings
   */
  resetTypographySection() {
    try {
      const defaults = this.core.getDefaultConfig();
      const typography = defaults.appearance.searchField.typography;

      // Reset font size
      this.setFormValue("inputFontSize", typography.fontSize);

      // Reset font family
      this.setFormValue("inputFontFamily", typography.fontFamily);

      // Reset font weight
      this.setFormValue("inputFontWeight", typography.fontWeight);

      // Reset font style
      this.setFormValue("inputFontStyle", typography.fontStyle);

      // Reset line height
      this.setFormValue("inputLineHeight", typography.lineHeight);

      // Reset letter spacing
      this.setFormValue("inputLetterSpacing", typography.letterSpacing);

      // Reset text transform
      this.setFormValue("inputTextTransform", typography.textTransform);

      // Reset placeholder typography
      this.setFormValue("placeholderFontSize", typography.placeholder.fontSize);
      this.setFormValue(
        "placeholderFontFamily",
        typography.placeholder.fontFamily,
      );
      this.setFormValue(
        "placeholderFontWeight",
        typography.placeholder.fontWeight,
      );
      this.setFormValue(
        "placeholderFontStyle",
        typography.placeholder.fontStyle,
      );
      this.setFormValue("placeholderOpacity", typography.placeholder.opacity);
      this.setFormValue(
        "placeholderLetterSpacing",
        typography.placeholder.letterSpacing,
      );
      this.setFormValue(
        "placeholderTextTransform",
        typography.placeholder.textTransform,
      );

      // Reset focus state
      this.setFormValue("focusFontSize", typography.focus.fontSize);
      this.setFormValue("focusFontWeight", typography.focus.fontWeight);
      this.setFormValue("focusLetterSpacing", typography.focus.letterSpacing);

      console.log("📝 Typography reset to defaults");
      this.core.showToast(
        "success",
        "Typography Reset",
        "Typography settings restored to defaults",
      );
    } catch (error) {
      console.error("🚨 Error resetting typography:", error);
    }
  }

  /**
   * Set form field value safely
   */
  setFormValue(fieldId, value) {
    try {
      const safeFieldId = this.core.sanitizeInput(fieldId, 100);
      const field = document.getElementById(safeFieldId);
      if (!field) return;

      if (field.type === "checkbox") {
        field.checked = Boolean(value);
      } else if (field.type === "color") {
        field.value = value || "#000000";
        const hexDisplay = field.parentNode.querySelector(".color-hex");
        if (hexDisplay) {
          hexDisplay.textContent = field.value.toLowerCase();
        }
      } else if (field.type === "range") {
        field.value = value === null ? "" : String(value);
        const valueDisplay = field.parentNode.querySelector(".range-value");
        if (valueDisplay) {
          valueDisplay.textContent = String(value);
        }
      } else {
        if (typeof value === "string") {
          field.value = this.core.sanitizeInput(value);
        } else {
          field.value = value === null ? "" : String(value);
        }
      }
    } catch (error) {
      console.error("🚨 Security: Error setting form value:", error);
    }
  }

  /**
   * Validate fields specific to Appearance tab
   */
  validateField(field) {
    try {
      const value = field.type === "checkbox" ? field.checked : field.value;
      const fieldName = this.core.sanitizeInput(field.name || field.id, 100);
      let isValid = true;

      // Call base validation first
      isValid = this.core.validateField(field);

      // Custom validation rules for Appearance tab fields
      switch (true) {
        case fieldName.includes("borderRadius") ||
          fieldName.includes("BorderRadius"):
          if (value < 0) {
            isValid = false;
          } else if (value > 50) {
            isValid = false;
          }
          break;

        case fieldName === "tagBorderRadius":
          if (value < 0) {
            isValid = false;
          } else if (value > 20) {
            isValid = false;
          }
          break;

        case fieldName.includes("Opacity"):
          if (value < 0 || value > 1) {
            isValid = false;
          }
          break;
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
      console.error(
        "🚨 Security: Error in Appearance tab field validation:",
        error,
      );
      return false;
    }
  }

  /**
   * Validate entire form for Appearance tab
   */
  validateForm(container = document) {
    try {
      const formInputs = container.querySelectorAll(
        ".form-input, .toggle-input, .color-input, .range-input, .form-select",
      );
      let isValid = true;

      formInputs.forEach((input) => {
        if (!this.validateField(input)) {
          isValid = false;
        }
      });

      console.log(
        `🎨 Appearance tab validation: ${isValid ? "PASSED" : "FAILED"}`,
      );
      return isValid;
    } catch (error) {
      console.error(
        "🚨 Security: Error validating Appearance tab form:",
        error,
      );
      return false;
    }
  }

  /**
   * Apply live preview for Appearance tab changes
   */
  applyLivePreview(fieldName, value) {
    try {
      const colorFields = [
        "searchBackground",
        "searchText",
        "placeholderText",
        "searchIcon",
        "clearIcon",
        "resultsBackground",
        "resultText",
        "resultHover",
        "resultBorderLeft",
        "groupHeaderColor",
        "groupCountColor",
        "resultSubtitle",
        "resultIconColor",
        "resultSubtextColor",
      ];

      const borderRadiusFields = [
        "searchBorderTopLeft",
        "searchBorderTopRight",
        "searchBorderBottomLeft",
        "searchBorderBottomRight",
        "resultsBorderTopLeft",
        "resultsBorderTopRight",
        "resultsBorderBottomLeft",
        "resultsBorderBottomRight",
      ];

      if (
        fieldName.includes("appearance.colors") ||
        colorFields.includes(fieldName)
      ) {
        this.applyColorLivePreview(fieldName, value);
      } else if (
        fieldName.includes("borderRadius") ||
        borderRadiusFields.includes(fieldName)
      ) {
        this.applyBorderRadiusLivePreview(fieldName, value);
      } else if (
        fieldName.includes("typography") ||
        fieldName.includes("Font") ||
        fieldName.includes("placeholder") ||
        fieldName.includes("focus")
      ) {
        this.applyTypographyPreview(fieldName, value);
      } else {
        // Default preview logic
        const previewConfig = JSON.parse(JSON.stringify(this.core.config));
        this.core.safeSetNestedProperty(previewConfig, fieldName, value);

        this.core.safeLocalStorageSet("searchProLiveConfig", previewConfig);

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
              "*",
            );
          } catch (postError) {
            console.warn(
              "🚨 Security: Error posting message to parent:",
              postError,
            );
          }
        }
      }
    } catch (error) {
      console.warn("🚨 Security: Appearance tab live preview failed:", error);
    }
  }

  /**
   * Reset Appearance tab to defaults
   */
  resetToDefaults() {
    try {
      console.log("🔄 Resetting Appearance tab to defaults");

      const defaults = this.core.getDefaultConfig();

      // Reset appearance settings
      this.core.config.appearance = JSON.parse(
        JSON.stringify(defaults.appearance),
      );

      // Update form fields
      const container = document.getElementById("appearance-panel");
      if (container) {
        this.core.populateForm(container);
        this.setupAppearanceHandlers(container);
      }

      console.log("✅ Appearance tab reset complete");
    } catch (error) {
      console.error("🚨 Security: Error resetting Appearance tab:", error);
    }
  }

  /**
   * Get Appearance tab configuration summary
   */
  getConfigSummary() {
    try {
      return {
        tab: "Appearance",
        sections: {
          searchField: this.core.config.appearance.searchField,
          searchResults: this.core.config.appearance.searchResults,
          colors: this.core.config.appearance.colors,
          tags: this.core.config.appearance.tags,
        },
      };
    } catch (error) {
      console.error(
        "🚨 Security: Error getting Appearance tab config summary:",
        error,
      );
      return null;
    }
  }

  /**
   * Cleanup resources when tab is unloaded
   */
  cleanup() {
    try {
      // Clear any CSS variable overrides
      document.documentElement.removeAttribute("style");
      console.log("🧹 Appearance tab handler cleaned up");
    } catch (error) {
      console.error("🚨 Security: Error cleaning up Appearance tab:", error);
    }
  }

  /**
   * Handle tab-specific form changes for Appearance tab
   */
  onFormChange(input) {
    try {
      const fieldName = input.name || input.id;
      
      // Handle color inputs with live preview
      if (input.type === "color") {
        this.applyColorLivePreview(fieldName, input.value);
      }
      // Handle range inputs with live preview
      else if (input.type === "range") {
        if (fieldName.includes("borderRadius") || fieldName.includes("BorderRadius")) {
          this.applyBorderRadiusLivePreview(fieldName, input.value);
        } else if (fieldName === "highlightBackgroundOpacity") {
          this.applyHighlightOpacityPreview(input.value);
        }
      }
      // Handle typography selects and inputs
      else if (
        fieldName.includes("Font") ||
        fieldName.includes("typography") ||
        fieldName.includes("placeholder") ||
        fieldName.includes("focus")
      ) {
        this.applyTypographyPreview(fieldName, input.value);
      }
      
      // Let core handle the basic form change
      this.core.onFormChange(input);
      
      console.log(`🎨 Appearance form change: ${fieldName} = ${input.value}`);
    } catch (error) {
      console.error("🚨 Security: Error handling Appearance tab form change:", error);
    }
  }

  /**
   * Update configuration from form values for Appearance tab
   * @param {HTMLElement} container The appearance tab container element
   */
  updateConfigFromForm(container) {
    try {
      // Process all appearance-specific inputs
      const formInputs = container.querySelectorAll("[name]");
      
      formInputs.forEach((input) => {
        const name = input.getAttribute("name");
        if (!name) return;
        
        let value;
        
        if (input.type === "checkbox") {
          value = input.checked;
        } else if (input.type === "number" || input.type === "range") {
          value = input.value === "" ? null : parseFloat(input.value);
        } else if (input.type === "color") {
          value = input.value;
          // Also update any associated hex inputs
          const hexInput = input.parentNode.querySelector('.color-hex-input');
          if (hexInput) {
            hexInput.value = value.toUpperCase();
          }
        } else {
          value = input.value;
        }
        
        // Set property safely
        this.core.safeSetNestedProperty(this.core.config, name, value);
      });
      
      // Handle hex inputs that might not have name attributes
      const hexInputs = container.querySelectorAll('.color-hex-input');
      hexInputs.forEach(hexInput => {
        const colorInput = hexInput.parentNode.querySelector('.color-input');
        if (colorInput && colorInput.name) {
          const value = hexInput.value;
          if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
            colorInput.value = value;
            this.core.safeSetNestedProperty(this.core.config, colorInput.name, value);
          }
        }
      });
      
      console.log("🎨 Appearance tab config updated from form");
    } catch (error) {
      console.error("🚨 Security: Error updating config from Appearance tab form:", error);
    }
  }
}

// Export for module use
if (typeof module !== "undefined" && module.exports) {
  module.exports = AppearanceTabHandler;
} else {
  window.AppearanceTabHandler = AppearanceTabHandler;
}
