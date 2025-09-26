// File loading confirmed - now debugging the flow
console.log("========================================");
console.log("APPEARANCE TAB JS FILE LOADED SUCCESSFULLY");
console.log("========================================");

/**
 * Search Pro Control Panel - Appearance Tab Handler
 * Handles all functionality specific to the Appearance settings tab
 */
console.log("🚨🚨🚨 APPEARANCE-TAB.JS FILE IS LOADING! 🚨🚨🚨");

class AppearanceTabHandler {
  constructor() {
    this.core = null;
    this.tabId = "appearance";
    console.log("APPEARANCE TAB HANDLER CONSTRUCTOR CALLED!");
    console.log("🚨🚨🚨 APPEARANCE TAB HANDLER CONSTRUCTOR CALLED! 🚨🚨🚨");
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
      console.log("🚨🚨🚨 APPEARANCE TAB INIT CALLED! 🚨🚨🚨");
      console.log("🚨 Container received:", container);
      console.log("🚨 Core instance:", this.core);

      // Setup form listeners
      this.core.setupFormListeners(container);

      // Setup appearance-specific handlers
      this.setupAppearanceHandlers(container);

      // Setup border radius validation
      this.setupBorderRadiusValidation(container);

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
      console.log(`🚨🚨🚨 SETUP COLOR PICKER HANDLERS CALLED! 🚨🚨🚨`);
      console.log(`🚨 Container:`, container);
      const colorInputs = container.querySelectorAll(".color-input");
      console.log(`🔥 CRITICAL: Found ${colorInputs.length} color inputs in appearance tab`);
      
      // Check specifically for groupHeaderBackground
      const groupHeaderBg = container.querySelector("#groupHeaderBackground");
      console.log(`🔥 CRITICAL: groupHeaderBackground element found:`, groupHeaderBg);
      if (groupHeaderBg) {
        console.log(`🔥 CRITICAL: groupHeaderBg id="${groupHeaderBg.id}", value="${groupHeaderBg.value}"`);
      }
      colorInputs.forEach((input) => {
        console.log(`🔥 CRITICAL: Processing color input: id="${input.id}"`);
        if (input.id === "groupHeaderBackground") {
          console.log(`🔥 CRITICAL: FOUND GROUP HEADER BACKGROUND INPUT!`);
        }
        const hexInput = input.parentNode.querySelector(".color-hex-input");
        if (!hexInput) {
          console.log(`🔥 CRITICAL: No hex input found for ${input.id}`);
          return;
        }

        // Update HEX input when color picker changes
        input.addEventListener("input", (e) => {
          console.log(`🔥 CRITICAL: Color input changed: ${e.target.id} = ${e.target.value}`);
          if (e.target.id === "groupHeaderBackground") {
            console.log(`🔥 CRITICAL: GROUP HEADER BACKGROUND EVENT FIRED!`);
            console.log(`🔥 CRITICAL: About to call onFormChange and applyColorLivePreview`);
          }
          hexInput.value = e.target.value;
          hexInput.classList.remove("error");
          
          // CRITICAL: Ensure core form change is called first
          this.core.onFormChange(e.target);
          
          // CRITICAL: Then apply live preview
          this.applyColorLivePreview(e.target.id, e.target.value);
          
          if (e.target.id === "groupHeaderBackground") {
            console.log(`🔥 CRITICAL: Finished onFormChange and applyColorLivePreview for groupHeaderBackground`);
          }
          
          // Sync Result Icon Color with Icon Color in Display tab
          if (e.target.id === "resultIconColor") {
            this.syncIconColors(e.target.value);
          }
        });

        // Update color picker when HEX input changes
        hexInput.addEventListener("input", (e) => {
          if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(e.target.value)) {
            console.log(`🔥 CRITICAL: HEX input changed: ${input.id} = ${e.target.value}`);
            if (input.id === "groupHeaderBackground") {
              console.log(`🔥 CRITICAL: GROUP HEADER BACKGROUND HEX EVENT FIRED!`);
              console.log(`🔥 CRITICAL: About to call onFormChange and applyColorLivePreview for HEX`);
            }
            input.value = e.target.value;
            hexInput.classList.remove("error");
            
            // CRITICAL: Ensure core form change is called first
            this.core.onFormChange(input);
            
            // CRITICAL: Then apply live preview
            this.applyColorLivePreview(input.id, input.value);
            
            if (input.id === "groupHeaderBackground") {
              console.log(`🔥 CRITICAL: Finished onFormChange and applyColorLivePreview for groupHeaderBackground HEX`);
            }
            
            // Sync Result Icon Color with Icon Color in Display tab
            if (input.id === "resultIconColor") {
              this.syncIconColors(e.target.value);
            }
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
        // Remove any existing listeners to prevent duplicates
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener("click", (e) => {
          e.preventDefault();
          const section = e.target.closest("button").dataset.section;
          if (section) {
            this.resetColorSection(section);
            // Note: resetColorSection now handles its own toast notifications
          }
        });
      });

      console.log(
        `🔄 Reset button handlers set up for ${resetButtons.length} buttons (duplicates prevented)`,
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
      console.log("🎯 TYPOGRAPHY SETUP: Starting typography handlers setup");
      
      // Target typography-specific selects and inputs within typography section
      const typographySection = container.querySelector('section[aria-labelledby="typography-heading"]');
      if (!typographySection) {
        console.warn("🎯 TYPOGRAPHY SETUP: Typography section not found");
        // Try alternative selectors
        const altSection = container.querySelector('[data-section="typography"]');
        if (altSection) {
          console.log("🎯 TYPOGRAPHY SETUP: Found typography section via data-section");
        } else {
          console.error("🎯 TYPOGRAPHY SETUP: No typography section found with any selector");
          return;
        }
      } else {
        console.log("🎯 TYPOGRAPHY SETUP: Typography section found");
      }

      const activeSection = typographySection || container.querySelector('[data-section="typography"]');

      const typographySelects = activeSection.querySelectorAll(".form-select");
      console.log(`🎯 TYPOGRAPHY SETUP: Found ${typographySelects.length} select elements`);
      
      typographySelects.forEach((select, index) => {
        console.log(`🎯 TYPOGRAPHY SETUP: Setting up select ${index + 1} with ID: ${select.id}`);
        select.addEventListener("change", (e) => {
          console.log(`🎯 TYPOGRAPHY EVENT: Select changed - ${e.target.id} = ${e.target.value}`);
          this.core.onFormChange(e.target);
          this.applyTypographyPreview(e.target.id, e.target.value);
        });
      });

      // Handle text inputs for typography values - be more specific
      const typographyInputs = activeSection.querySelectorAll(
        'input[id^="input"], input[id^="placeholder"], input[id^="focus"]',
      );
      console.log(`🎯 TYPOGRAPHY SETUP: Found ${typographyInputs.length} input elements`);
      
      typographyInputs.forEach((input, index) => {
        console.log(`🎯 TYPOGRAPHY SETUP: Setting up input ${index + 1} with ID: ${input.id}, type: ${input.type}`);
        input.addEventListener("change", (e) => {
          console.log(`🎯 TYPOGRAPHY EVENT: Input change - ${e.target.id} = ${e.target.value}`);
          this.core.onFormChange(e.target);
          this.applyTypographyPreview(e.target.id, e.target.value);
        });

        input.addEventListener("input", (e) => {
          console.log(`🎯 TYPOGRAPHY EVENT: Input input - ${e.target.id} = ${e.target.value}`);
          this.applyTypographyPreview(e.target.id, e.target.value);
        });
      });

      console.log(
        `🎯 TYPOGRAPHY SETUP COMPLETE: ${typographySelects.length} selects and ${typographyInputs.length} inputs configured`,
      );
    } catch (error) {
      console.error("🚨 TYPOGRAPHY SETUP ERROR:", error);
      console.error("🚨 Error stack:", error.stack);
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
        resultHover: "--result-hover",
        resultBorderLeft: "--result-border-left",
        groupHeaderBackground: "--group-header-bg",
        groupHeaderColor: "--group-header",
        groupCountColor: "--group-count",
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
      
      console.log(`🔥 CRITICAL DEBUG: fieldName=${fieldName}, shortField=${shortField}, cssVar=${cssVar}`);
      
      if (fieldName === "groupHeaderBackground" || shortField === "groupHeaderBackground") {
        console.log(`🔥 CRITICAL: GROUP HEADER BACKGROUND PROCESSING!`);
      }

      if (cssVar) {
        console.log(`🔥 CRITICAL: Setting CSS variable ${cssVar} to ${value}`);
        document.documentElement.style.setProperty(cssVar, value);
        const previewPanel = document.getElementById("livePreviewPanel");
        if (previewPanel) {
          previewPanel.style.setProperty(cssVar, value);
          console.log(`🔥 CRITICAL: Also set CSS variable on preview panel`);
        }
        
        // CRITICAL: Force style update
        if (fieldName === "groupHeaderBackground" || shortField === "groupHeaderBackground") {
          console.log(`🔥 CRITICAL: Forcing style update for group headers`);
          const groupHeaders = document.querySelectorAll('.group-header');
          console.log(`🔥 CRITICAL: Found ${groupHeaders.length} group headers to update`);
          groupHeaders.forEach(header => {
            header.style.backgroundColor = value;
            console.log(`🔥 CRITICAL: Directly set background-color=${value} on header:`, header);
          });
        }
        
        console.log(`🎨 Applied live preview for ${fieldName}: ${value} -> ${cssVar}`);
      } else {
        console.warn(`🎨 No CSS variable found for ${fieldName} (shortField: ${shortField})`);
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
   * Apply typography configuration - save to localStorage for tour integration
   */
  applyTypographyPreview(fieldId, value) {
    try {
      console.log(`🎯 TYPOGRAPHY CHANGE DEBUG: Field ${fieldId} changed to: ${value}`);
      console.log(`🎯 TYPOGRAPHY TRIGGER: applyTypographyPreview called`);
      
      // Map field IDs to full configuration paths
      const fieldConfigMap = {
        inputFontSize: "appearance.searchField.typography.fontSize",
        inputFontFamily: "appearance.searchField.typography.fontFamily", 
        inputFontWeight: "appearance.searchField.typography.fontWeight",
        inputFontStyle: "appearance.searchField.typography.fontStyle",
        inputLineHeight: "appearance.searchField.typography.lineHeight",
        inputLetterSpacing: "appearance.searchField.typography.letterSpacing",
        inputTextTransform: "appearance.searchField.typography.textTransform",
        placeholderFontSize: "appearance.searchField.typography.placeholder.fontSize",
        placeholderFontFamily: "appearance.searchField.typography.placeholder.fontFamily",
        placeholderFontWeight: "appearance.searchField.typography.placeholder.fontWeight",
        placeholderFontStyle: "appearance.searchField.typography.placeholder.fontStyle",
        placeholderOpacity: "appearance.searchField.typography.placeholder.opacity",
        placeholderLetterSpacing: "appearance.searchField.typography.placeholder.letterSpacing",
        placeholderTextTransform: "appearance.searchField.typography.placeholder.textTransform",
        focusFontSize: "appearance.searchField.typography.focus.fontSize",
        focusFontWeight: "appearance.searchField.typography.focus.fontWeight",
        focusLetterSpacing: "appearance.searchField.typography.focus.letterSpacing",
      };

      const configPath = fieldConfigMap[fieldId];
      console.log(`🎯 TYPOGRAPHY PATH DEBUG: ${fieldId} maps to: ${configPath}`);
      
      if (configPath) {
        // CRITICAL FIX: Get the current live config if it exists, or use base config
        let liveConfig;
        const existingLiveConfig = this.core.safeLocalStorageGet("searchProLiveConfig");
        if (existingLiveConfig) {
          liveConfig = JSON.parse(JSON.stringify(existingLiveConfig));
          console.log(`🎯 USING EXISTING LIVE CONFIG from localStorage`);
        } else {
          liveConfig = JSON.parse(JSON.stringify(this.core.config));
          console.log(`🎯 USING BASE CONFIG (no live config exists)`);
        }
        
        console.log(`🎯 BEFORE UPDATE: Current config structure:`, {
          hasAppearance: !!liveConfig.appearance,
          hasSearchField: !!liveConfig.appearance?.searchField,
          hasTypography: !!liveConfig.appearance?.searchField?.typography
        });
        
        this.core.safeSetNestedProperty(liveConfig, configPath, value);
        console.log(`🎯 AFTER UPDATE: Config path ${configPath} set to: ${value}`);
        
        // Verify the update was successful
        const updatedValue = this.core.getNestedProperty(liveConfig, configPath);
        console.log(`🎯 VERIFICATION: Retrieved value from ${configPath}: ${updatedValue}`);
        
        this.core.safeLocalStorageSet("searchProLiveConfig", liveConfig);
        console.log(`🎯 SAVED TO LOCALSTORAGE: searchProLiveConfig updated`);
        
        // Log the complete typography structure for debugging
        const typographyConfig = liveConfig.appearance?.searchField?.typography;
        console.log("🎯 FULL TYPOGRAPHY CONFIG:", JSON.stringify(typographyConfig, null, 2));
        
        // Also check localStorage directly
        const savedConfig = this.core.safeLocalStorageGet("searchProLiveConfig");
        console.log("🎯 LOCALSTORAGE VERIFICATION:", {
          configExists: !!savedConfig,
          typographyExists: !!savedConfig?.appearance?.searchField?.typography,
          savedValue: this.core.getNestedProperty(savedConfig, configPath)
        });
        
      } else {
        console.warn(`🎯 WARNING: No config mapping found for typography field: ${fieldId}`);
        console.log(`🎯 Available mappings:`, Object.keys(fieldConfigMap));
      }
    } catch (error) {
      console.error("🚨 TYPOGRAPHY ERROR:", error);
      console.error("🚨 Error stack:", error.stack);
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
            groupHeaderBackground: defaults.appearance.colors.groupHeaderBackground,
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
          // Show toast once for typography reset
          this.core.showToast(
            "success",
            "Typography Reset",
            "Typography settings restored to defaults",
          );
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
      // Note: Toast notification now handled by resetColorSection to prevent duplicates
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
          // Enhanced border radius validation
          return this.validateBorderRadiusField(field);
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
   * Enhanced border radius validation with comprehensive warnings
   */
  validateBorderRadiusField(input) {
    try {
      const value = parseFloat(input.value);
      const fieldName = input.name || input.id;
      
      // Clear previous validation state
      input.classList.remove('error', 'warning');
      this.clearValidationMessage(input);
      
      // Error for negative values
      if (value < 0) {
        input.classList.add('error');
        this.showValidationMessage(
          input, 
          'error', 
          'Border radius cannot be negative',
          5000
        );
        return false; // Return false for errors (inverse of hasErrors)
      }
      
      // Error for >50px
      if (value > 50) {
        input.classList.add('error');
        this.showValidationMessage(
          input, 
          'error', 
          'Border radius cannot exceed 50px for optimal display',
          5000
        );
        return false; // Return false for errors
      }
      
      // Warning for >35px
      if (value > 35) {
        input.classList.add('warning');
        this.showValidationMessage(
          input, 
          'warning', 
          'Recommended: 0-35px. Max 50px',
          3000
        );
        return true; // Warning, not error - validation passes
      }
      
      // Valid value
      input.classList.add('valid');
      return true;
      
    } catch (error) {
      console.error('Error validating border radius field:', error);
      return false;
    }
  }

  /**
   * Setup border radius validation for all border radius fields
   */
  setupBorderRadiusValidation(container) {
    try {
      // Find all border radius input fields
      const borderRadiusFields = container.querySelectorAll('input[name*="borderRadius"], input[id*="BorderRadius"], input[id*="borderRadius"]');
      
      borderRadiusFields.forEach(input => {
        // Add input event listener for real-time validation
        input.addEventListener('input', (e) => {
          this.validateBorderRadiusField(e.target);
        });
        
        // Add blur event listener for final validation
        input.addEventListener('blur', (e) => {
          this.validateBorderRadiusField(e.target);
        });
      });
      
      console.log(`🎨 Border radius validation setup for ${borderRadiusFields.length} fields`);
    } catch (error) {
      console.error('Error setting up border radius validation:', error);
    }
  }

  /**
   * Show validation message for a field
   */
  showValidationMessage(input, type, message, duration = 3000) {
    try {
      // Use the global validation message function if available
      if (typeof window.showValidationMessage === 'function') {
        window.showValidationMessage(input, type, message, duration);
        return;
      }
      
      // Fallback: Create simple validation tooltip
      this.clearValidationMessage(input);
      
      const messageDiv = document.createElement('div');
      messageDiv.className = `validation-message validation-${type}`;
      messageDiv.textContent = message;
      messageDiv.id = `${input.id}-validation`;
      
      // Style the message
      messageDiv.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        background: ${type === 'error' ? '#ef4444' : '#f59e0b'};
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1000;
        white-space: nowrap;
        margin-top: 2px;
      `;
      
      // Position relative to input
      input.parentNode.style.position = 'relative';
      input.parentNode.appendChild(messageDiv);
      
      // Auto-remove after duration
      setTimeout(() => {
        this.clearValidationMessage(input);
      }, duration);
      
      console.log(`🎨 Validation message shown: ${type} - ${message}`);
    } catch (error) {
      console.error('Error showing validation message:', error);
    }
  }

  /**
   * Clear validation message for a field
   */
  clearValidationMessage(input) {
    try {
      // Use the global clear function if available
      if (typeof window.clearValidationMessage === 'function') {
        window.clearValidationMessage(input.id);
        return;
      }
      
      // Fallback: Remove our custom message
      const existingMessage = document.getElementById(`${input.id}-validation`);
      if (existingMessage) {
        existingMessage.remove();
      }
    } catch (error) {
      console.error('Error clearing validation message:', error);
    }
  }

  /**
   * Sync Result Icon Color with Icon Color in Display tab
   */
  syncIconColors(color) {
    try {
      // Update the Icon Color in Display tab
      const iconColorInput = document.querySelector('#iconColor');
      const iconColorHex = document.querySelector('#iconColor + .color-hex-input');
      
      if (iconColorInput) {
        iconColorInput.value = color;
        this.core.setNestedValue(this.core.config, 'thumbnailSettings.iconSettings.iconColor', color);
      }
      
      if (iconColorHex) {
        iconColorHex.value = color.toUpperCase();
      }
      
      console.log(`🎨 Synced Result Icon Color with Icon Color: ${color}`);
    } catch (error) {
      console.error('Error syncing icon colors:', error);
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
      const errors = [];
      const warnings = [];

      formInputs.forEach((input) => {
        if (!this.validateField(input)) {
          isValid = false;
          errors.push(`Invalid value in field: ${input.name || input.id || 'unknown field'}`);
        }
      });

      console.log(
        `🎨 Appearance tab validation: ${isValid ? "PASSED" : "FAILED"}`,
      );
      
      // FIXED: Return consistent validation object structure
      return {
        isValid: isValid,
        errors: errors,
        warnings: warnings
      };
    } catch (error) {
      console.error(
        "🚨 Security: Error validating Appearance tab form:",
        error,
      );
      return {
        isValid: false,
        errors: ["Validation error occurred"],
        warnings: []
      };
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
        "groupHeaderBackground",
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
