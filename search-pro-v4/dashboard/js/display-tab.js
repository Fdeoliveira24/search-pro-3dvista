/**
 * Version 3.2 - Last Update on 11/01/2025 - Search Pro Configuration Loading - Google Sheets / CSV / Business JSON integration, runtime synchronization, Exact matches config, Silence Console Fix
 */

class DisplayTabHandler {
  constructor() {
    this.core = null;
    this.tabId = "display";
  }

  /**
   * Set the core instance
   */
  setCore(core) {
    this.core = core;
  }

  /**
   * Normalize asset paths to use assets/ prefix without search-pro-v3/
   */
  toAssetPath(value) {
    if (!value) return "";
    const v = String(value).trim();

    // Absolute URLs or absolute site paths: leave untouched
    if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/")) return v;

    // Already normalized to assets/
    if (v.startsWith("assets/")) return v;

    // If user typed something like "./assets/..." → normalize
    const cleaned = v.replace(/^\.?\/?assets\//, "");
    return "assets/" + cleaned;
  }

  /**
   * Return only the filename segment of a path (empty string for falsy)
   */
  filenameOnly(v) {
    if (!v) return "";
    const s = String(v);
    const parts = s.split("/");
    const last = parts.pop();
    return last || "";
  }

  /**
   * Initialize display tab functionality
   */
  init(container) {
    try {
      console.log("👁️ Initializing Display tab handler");

      // Setup form listeners
      this.core.setupFormListeners(container);

      // Setup display-specific features
      this.setupDisplayBehaviorHandlers(container);
      this.setupThumbnailHandlers(container);
      this.setupIconConfigurationHandlers(container);
      this.setupColorPickerHandlers(container);

      // Setup validation for border radius and width
      this.setupBorderValidation(container);

      // Icon picker initialization is already handled in setupIconConfigurationHandlers

      // Setup reset button handlers for all sections
      this.setupResetButtonHandlers(container);

      // Populate form with current values
      this.populateDisplayForm(container);

      // Validate all fields
      this.validateForm(container);

      console.log("✅ Display tab handler initialized");
    } catch (error) {
      console.error("❌ Error initializing Display tab:", error);
    }
  }

  /**
   * Setup reset button handlers for all sections
   */
  setupResetButtonHandlers(container) {
    try {
      const resetButtons = container.querySelectorAll(".reset-section-button");
      resetButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          const section = button.dataset.section;
          if (section === "displayBehavior") {
            this.resetDisplayBehaviorToDefaults();
          } else if (section === "thumbnailVisibility") {
            this.resetThumbnailVisibilityToggles();
          } else if (section === "labelCustomization") {
            this.resetLabelCustomizationToDefaults();
          } else if (section === "labelFallback") {
            this.resetLabelFallbackToDefaults();
          } else if (section === "thumbnailSettings") {
            this.resetThumbnailToDefaults();
          } else if (section === "iconSettings") {
            this.resetIconSettingsToDefaults();
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
   * Populate display form with special handling for subtitle conflict resolution
   */
  populateDisplayForm(container) {
    try {
      // Let core populate most fields first
      this.core.populateForm(container);

      // Special handling for subtitle toggles based on underlying value
      this.populateSubtitleToggles();

      // Populate thumbnail settings
      this.populateThumbnailForm(container);

      // Populate icon settings
      this.populateIconForm(container);

      // Populate label customization
      this.populateLabelCustomizationForm(container);

      console.log("👁️ Display form populated with all sections");
    } catch (error) {
      console.error("🚨 Security: Error populating display form:", error);
    }
  }

  /**
   * Populate label customization form with current values
   */
  populateLabelCustomizationForm(container) {
    try {
      const displayLabels = this.core.config.displayLabels || {};

      // Map of field IDs to config properties - keep existing mapping
      const fieldMap = {
        panoramaLabel: "Panorama",
        hotspotLabel: "Hotspot",
        polygonLabel: "Polygon",
        videoLabel: "Video",
        webframeLabel: "Webframe",
        imageLabel: "Image",
        textLabel: "Text",
        projectedImageLabel: "ProjectedImage",
        elementLabel: "Element",
        businessLabel: "Business",
        "3dHotspotLabel": "3DHotspot",
        "3dModelLabel": "3DModel",
        "3dModelObjectLabel": "3DModelObject",
        containerLabel: "Container",
      };

      // Update each field with current value or default
      for (const [fieldId, configKey] of Object.entries(fieldMap)) {
        // Use attribute selector instead of ID selector for fields starting with numbers
        const field = fieldId.startsWith("3d")
          ? container.querySelector(`[id="${fieldId}"]`)
          : container.querySelector(`#${fieldId}`);

        if (field) {
          field.value = displayLabels[configKey] || configKey.replace(/([A-Z])/g, " $1").trim();
        }
      }

      console.log("🏷️ Label customization form populated");
    } catch (error) {
      console.error("🚨 Security: Error populating label customization form:", error);
    }
  }
  /**
   * Show/hide all icon configuration sections based on Custom Icons state
   */
  toggleIconConfigurationSections(isEnabled) {
    try {
      // Get icon configuration sections
      const iconConfigSection = document.querySelector(
        '.config-section[aria-labelledby="icon-config-heading"]'
      );
      const elementIconsSection = document.querySelector(
        '.config-section[aria-labelledby="element-icons-heading"]'
      );

      // Specific subsections within the icon config section
      if (iconConfigSection) {
        const subsections = iconConfigSection.querySelectorAll(".subsection");

        // Skip the first subsection (Icon System) as it should always be visible
        for (let i = 1; i < subsections.length; i++) {
          subsections[i].style.display = isEnabled ? "" : "none";
        }
      }

      // Professional Icon Picker section
      if (elementIconsSection) {
        elementIconsSection.style.display = isEnabled ? "" : "none";
      }

      console.log(`🎨 Icon configuration sections ${isEnabled ? "shown" : "hidden"}`);
    } catch (error) {
      console.error("🚨 Error toggling icon configuration sections:", error);
    }
  }

  /**
   * Setup tooltip handlers for a container
   */
  setupTooltipHandlers(container) {
    try {
      const tooltips = container.querySelectorAll(".help-tooltip");
      tooltips.forEach((tooltip) => {
        tooltip.addEventListener("mouseenter", () => this.showTooltip(tooltip));
        tooltip.addEventListener("mouseleave", () => this.hideTooltip(tooltip));
        tooltip.addEventListener("focus", () => this.showTooltip(tooltip));
        tooltip.addEventListener("blur", () => this.hideTooltip(tooltip));
        tooltip.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            this.hideTooltip(tooltip);
            tooltip.blur();
          }
        });
      });

      console.log(`🛈 Tooltip handlers set up for ${tooltips.length} tooltips`);
    } catch (error) {
      console.error("🚨 Error setting up tooltip handlers:", error);
    }
  }

  /**
   * Show a tooltip
   */
  showTooltip(tooltipElement) {
    try {
      const content = tooltipElement.getAttribute("data-tooltip");
      if (!content) return;

      // Remove any existing tooltips
      this.hideAllTooltips();

      // Create tooltip container
      const tooltip = document.createElement("div");
      tooltip.className = "tooltip-popup";
      tooltip.setAttribute("role", "tooltip");
      tooltip.textContent = content;

      // Position the tooltip
      const rect = tooltipElement.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      tooltip.style.left = `${rect.left + rect.width / 2}px`;
      tooltip.style.top = `${rect.top + scrollTop - 10}px`;

      // Add to document
      document.body.appendChild(tooltip);

      // Add animation
      setTimeout(() => {
        tooltip.style.opacity = "1";
        tooltip.style.transform = "translateY(-10px)";
      }, 10);
    } catch (error) {
      console.error("🚨 Error showing tooltip:", error);
    }
  }

  /**
   * Hide a specific tooltip
   */
  hideTooltip(tooltipElement) {
    try {
      const tooltips = document.querySelectorAll(".tooltip-popup");
      tooltips.forEach((tooltip) => {
        tooltip.style.opacity = "0";
        tooltip.style.transform = "translateY(0)";

        setTimeout(() => {
          if (tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
          }
        }, 200);
      });
    } catch (error) {
      console.error("🚨 Error hiding tooltip:", error);
    }
  }

  /**
   * Hide all tooltips
   */
  hideAllTooltips() {
    try {
      const tooltips = document.querySelectorAll(".tooltip-popup");
      tooltips.forEach((tooltip) => {
        tooltip.style.opacity = "0";
        tooltip.style.transform = "translateY(0)";

        setTimeout(() => {
          if (tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
          }
        }, 200);
      });
    } catch (error) {
      console.error("🚨 Error hiding all tooltips:", error);
    }
  }

  /**
   * Setup color picker handlers for a container
   */
  setupColorPickerHandlers(container) {
    try {
      if (this._colorPickersReady) return;
      this._colorPickersReady = true;
      const colorInputs = container.querySelectorAll(".color-input");
      colorInputs.forEach((input) => {
        const hexInput = input.parentNode.querySelector(".color-hex-input");
        if (!hexInput) return;

        // Update HEX input when color picker changes
        input.addEventListener("input", (e) => {
          hexInput.value = e.target.value;
          hexInput.classList.remove("error");
          this.core.onFormChange(e.target);
          if (typeof this.applyColorLivePreview === "function") {
            this.applyColorLivePreview(e.target.id, e.target.value);
          }

          // Sync Icon Color with Result Icon Color in Appearance tab
          if (e.target.id === "iconColor") {
            this.syncIconColors(e.target.value);
          }
        });

        // Update color picker when HEX input changes
        hexInput.addEventListener("input", (e) => {
          if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(e.target.value)) {
            input.value = e.target.value;
            hexInput.classList.remove("error");
            this.core.onFormChange(input);
            if (typeof this.applyColorLivePreview === "function") {
              this.applyColorLivePreview(input.id, input.value);
            }

            // Sync Icon Color with Result Icon Color in Appearance tab
            if (input.id === "iconColor") {
              this.syncIconColors(e.target.value);
            }
          } else {
            hexInput.classList.add("error");
          }
        });

        // Initialize HEX input value
        hexInput.value = input.value;
      });

      console.log(`🎨 Color picker handlers set up for ${colorInputs.length} inputs`);
    } catch (error) {
      console.error("🚨 Error setting up color picker handlers:", error);
    }
  }

  /**
   * Setup Display Behavior section handlers
   */
  setupDisplayBehaviorHandlers(container = document) {
    try {
      // Get all toggle switches in the Display Behavior section
      const displayBehaviorSection = container.querySelector(
        '[aria-labelledby="display-behavior-heading"]'
      );
      if (!displayBehaviorSection) return;

      const toggleSwitches = displayBehaviorSection.querySelectorAll(".toggle-input");

      toggleSwitches.forEach((toggle) => {
        toggle.addEventListener("change", (e) => {
          this.handleDisplayBehaviorToggle(e.target);
        });

        // Add visual feedback on interaction
        toggle.addEventListener("focus", (e) => {
          e.target.closest(".form-group").classList.add("focused");
        });

        toggle.addEventListener("blur", (e) => {
          e.target.closest(".form-group").classList.remove("focused");
        });
      });

      // Setup tooltip interactions
      this.setupTooltipHandlers(displayBehaviorSection);

      // Reset button handler is already set up in setupResetButtonHandlers()
      // No need to add duplicate event listeners here

      console.log(`👁️ Display behavior handlers set up for ${toggleSwitches.length} toggles`);
    } catch (error) {
      console.error("🚨 Security: Error setting up display behavior handlers:", error);
    }
  }

  /**
   * Setup Thumbnail Configuration handlers
   */
  setupThumbnailHandlers(container = document) {
    try {
      // Get thumbnail section
      const thumbnailSection = container.querySelector(
        '[aria-labelledby="thumbnail-config-heading"]'
      );
      if (!thumbnailSection) return;

      // Master toggle handler
      const enableThumbnailsToggle = thumbnailSection.querySelector("#enableThumbnails");
      if (enableThumbnailsToggle) {
        enableThumbnailsToggle.addEventListener("change", (e) => {
          this.handleThumbnailToggle(e.target);
        });
      }

      // Color input handler for border color
      const colorInput = thumbnailSection.querySelector("#thumbnailBorderColor");
      if (colorInput) {
        colorInput.addEventListener("input", (e) => {
          this.handleColorInputChange(e.target);
        });
      }

      // Hex input handler for border color
      const hexInput = thumbnailSection.querySelector("#thumbnailBorderColor + .color-hex-input");
      if (hexInput) {
        hexInput.addEventListener("input", (e) => {
          this.handleHexInputChange(e.target);
        });
      }

      // Size preset dropdown handler
      const sizePresetDropdown = thumbnailSection.querySelector("#thumbnailSizePreset");
      if (sizePresetDropdown) {
        sizePresetDropdown.addEventListener("change", (e) => {
          this.handleThumbnailSizeChange(e.target);
        });
      }

      // Range input handlers with live value updates
      const rangeInputs = thumbnailSection.querySelectorAll(".range-input");
      rangeInputs.forEach((range) => {
        range.addEventListener("input", (e) => {
          this.updateRangeValue(e.target);
        });
      });

      // Global Default Path file upload handler
      this.setupGlobalDefaultPathHandler(thumbnailSection);

      console.log("🖼️ Thumbnail handlers initialized");
    } catch (error) {
      console.error("🚨 Security: Error setting up thumbnail handlers:", error);
    }
  }

  /**
   * Setup Icon Configuration handlers
   */
  setupIconConfigurationHandlers(container = document) {
    try {
      // Setup reliable Font Awesome loading
      this.setupFontAwesomeIcons();

      // Icon system toggles
      const enableCustomIcons = container.querySelector("#enableCustomIcons");
      const enableFontAwesome = container.querySelector("#enableFontAwesome");

      if (enableCustomIcons) {
        enableCustomIcons.addEventListener("change", () => {
          this.handleIconSystemToggle();
        });
      }

      if (enableFontAwesome) {
        enableFontAwesome.addEventListener("change", () => {
          this.handleIconSystemToggle();
        });
      }

      // Find the icon size dropdown and add event listener
      const iconSizeDropdown = container.querySelector("#iconSize");
      if (iconSizeDropdown) {
        iconSizeDropdown.addEventListener("change", (e) => {
          this.handleIconSizeChange(e.target);
          this.validateIconSize(e.target);
        });
      }

      // Setup color pickers (for icon color)
      this.setupColorPickerHandlers(container);

      // Range input handlers (including opacity slider)
      const rangeInputs = container.querySelectorAll(".range-input");
      rangeInputs.forEach((range) => {
        // Initialize the range value display
        this.updateRangeValue(range);

        // Add input event handler for live updates while dragging
        range.addEventListener("input", (e) => {
          this.updateRangeValue(e.target);
        });

        // Add change event handler for final value
        range.addEventListener("change", (e) => {
          this.updateRangeValue(e.target);
          this.core.onFormChange(e.target);
        });
      });

      // Initialize icon picker grids
      this.initializeIconPickerGrids(container);

      // Setup picker type selectors
      const pickerSelects = container.querySelectorAll(".icon-picker-type");
      pickerSelects.forEach((select) => {
        select.addEventListener("change", (e) => {
          const element = e.target.dataset.element;
          const pickerType = e.target.value;
          this.switchIconPickerType(element, pickerType);
        });
      });

      console.log("🎨 Icon configuration handlers initialized");
    } catch (error) {
      console.error("🚨 Error setting up icon configuration handlers:", error);
    }
  }

  /**
   * Handle icon system toggle changes and conflict detection
   */
  handleIconSystemToggle() {
    try {
      const enableCustomIcons = document.querySelector("#enableCustomIcons");
      const enableFontAwesome = document.querySelector("#enableFontAwesome");
      const conflictWarning = document.querySelector("#iconConflictWarning");
      const fontAwesomeCdnSection = document.querySelector("#fontAwesomeCdnSection");

      if (!enableCustomIcons || !enableFontAwesome) return;

      const customEnabled = enableCustomIcons.checked;
      const fontAwesomeEnabled = enableFontAwesome.checked;

      // Enable/disable Font Awesome toggle based on Custom Icons state
      enableFontAwesome.disabled = !customEnabled;
      if (!customEnabled) {
        enableFontAwesome.checked = false;

        // Show message if Font Awesome was previously enabled
        if (fontAwesomeEnabled) {
          if (this.core.showToast) {
            this.core.showToast(
              "info",
              "Custom Icons Required",
              "Font Awesome feature requires Custom Icons to be enabled first."
            );
          }
        }
      }

      // Show/hide all icon configuration sections based on Custom Icons state
      this.toggleIconConfigurationSections(customEnabled);

      // Show/hide Font Awesome CDN section
      if (fontAwesomeCdnSection) {
        fontAwesomeCdnSection.style.display =
          customEnabled && enableFontAwesome.checked ? "block" : "none";
      }

      // Handle conflict detection
      if (conflictWarning) {
        const hasConflict = customEnabled && enableFontAwesome.checked;
        conflictWarning.style.display = hasConflict ? "flex" : "none";
      }

      // Update form values
      this.core.onFormChange(enableCustomIcons);
      if (customEnabled) {
        this.core.onFormChange(enableFontAwesome);
      }

      console.log(
        `🎨 Icon system: Custom=${customEnabled}, FontAwesome=${enableFontAwesome.checked}`
      );
    } catch (error) {
      console.error("🚨 Error handling icon system toggle:", error);
    }
  }

  /**
   * Handle icon size dropdown change
   */
  handleIconSizeChange(select) {
    try {
      const value = select.value;

      // Update configuration with new pixel-based size
      this.core.setNestedValue(this.core.config, "thumbnailSettings.iconSettings.iconSize", value);

      // Trigger form change to apply settings
      this.core.onFormChange(select);

      console.log(`🎨 Icon size changed to: ${value}`);
    } catch (error) {
      console.error("🚨 Error handling icon size change:", error);
    }
  }

  /**
   * Initialize all icon picker grids
   */
  initializeIconPickerGrids(container) {
    try {
      const elements = [
        "Panorama",
        "Hotspot",
        "Polygon",
        "Video",
        "Webframe",
        "Image",
        "Text",
        "ProjectedImage",
        "Element",
        "Business",
        "3DHotspot",
        "Container",
        "3DModel",
        "3DModelObject",
      ];

      elements.forEach((element) => {
        this.populateIconGrid(element, "fontawesome");
        this.updateCurrentIconDisplay(element);
      });

      console.log("🎨 Icon picker grids initialized");
    } catch (error) {
      console.error("🚨 Error initializing icon picker grids:", error);
    }
  }

  /**
   * Switch icon picker type (Font Awesome / Emoji / Custom)
   */
  switchIconPickerType(element, pickerType) {
    try {
      this.populateIconGrid(element, pickerType);
      console.log(`🔄 Switched ${element} picker to ${pickerType}`);
    } catch (error) {
      console.error("🚨 Error switching icon picker type:", error);
    }
  }

  /**
   * Get emoji set from the window.EmojiLibrary
   */
  getConsistentEmojiSet(elementType) {
    try {
      // If we have window.EmojiLibrary, extract all emojis
      if (window.EmojiLibrary) {
        // Try element-specific emojis first
        if (elementType && typeof window.EmojiLibrary.getElementEmojis === "function") {
          const elementEmojis = window.EmojiLibrary.getElementEmojis(elementType);
          if (elementEmojis && elementEmojis.length > 0) {
            return elementEmojis;
          }
        }

        // Try to use getAllEmojis function if available
        if (typeof window.EmojiLibrary.getAllEmojis === "function") {
          const allEmojis = window.EmojiLibrary.getAllEmojis();
          if (allEmojis && allEmojis.length > 0) {
            return allEmojis;
          }
        }

        // Manually extract all emojis from all categories
        let allEmojis = [];

        // First check if there are direct category arrays at the top level
        for (const key in window.EmojiLibrary) {
          if (Array.isArray(window.EmojiLibrary[key])) {
            allEmojis = allEmojis.concat(window.EmojiLibrary[key]);
          }
        }

        // Then check for nested category structure
        for (const categoryKey in window.EmojiLibrary) {
          if (
            typeof window.EmojiLibrary[categoryKey] === "object" &&
            !Array.isArray(window.EmojiLibrary[categoryKey])
          ) {
            const category = window.EmojiLibrary[categoryKey];

            // If the category has arrays directly
            for (const subKey in category) {
              if (Array.isArray(category[subKey])) {
                allEmojis = allEmojis.concat(category[subKey]);
              } else if (typeof category[subKey] === "object") {
                // Check one level deeper if needed
                for (const deepKey in category[subKey]) {
                  if (Array.isArray(category[subKey][deepKey])) {
                    allEmojis = allEmojis.concat(category[subKey][deepKey]);
                  }
                }
              }
            }
          }
        }

        // If we found emojis, return them
        if (allEmojis.length > 0) {
          return [...new Set(allEmojis)]; // Remove duplicates
        }
      }

      // Fallback to a basic set if the library isn't available or we couldn't extract emojis
      return [
        "😀",
        "😁",
        "😂",
        "🤣",
        "😃",
        "😄",
        "😅",
        "😆",
        "😉",
        "😊",
        "😋",
        "😎",
        "😍",
        "😘",
        "⌚",
        "📱",
        "💻",
        "⌨",
        "🖥",
        "🖨",
        "🖱",
        "🖲",
        "🕹",
        "🗜",
        "💽",
        "💾",
        "💿",
        "📀",
        "❤",
        "💛",
        "💚",
        "💙",
        "💜",
        "🖤",
        "💔",
        "❣",
        "💕",
        "💞",
        "💓",
        "💗",
        "💖",
        "💘",
        "🍏",
        "🍎",
        "🍐",
        "🍊",
        "🍋",
        "🍌",
        "🍉",
        "🍇",
        "🍓",
        "🍈",
        "🍒",
        "🍑",
        "🍍",
        "🥝",
        "🐶",
        "🐱",
        "🐭",
        "🐹",
        "🐰",
        "🦊",
        "🐻",
        "🐼",
        "🐨",
        "🐯",
        "🦁",
        "🐮",
        "🐷",
        "🐽",
        "🚗",
        "🚕",
        "🚙",
        "🚌",
        "🚎",
        "🏎",
        "🚓",
        "🚑",
        "🚒",
        "🚐",
        "🚚",
        "🚛",
        "🚜",
        "🛴",
        "⚽",
        "🏀",
        "🏈",
        "⚾",
        "🎾",
        "🏐",
        "🏉",
        "🎱",
        "🏓",
        "🏸",
        "🥅",
        "🏒",
        "🏑",
        "🏏",
      ];
    } catch (error) {
      console.error("Error getting emoji set:", error);
      // Return minimal fallback set
      return ["😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "📱", "💻", "🖥", "📷", "🎥", "📺"];
    }
  }

  /**
   * Get Font Awesome icons - preferring the official Font Awesome library if available
   */
  getFontAwesomeIcons() {
    try {
      // First try to use the official Font Awesome library if loaded
      if (typeof window.FontAwesome !== "undefined") {
        // Get icons using Font Awesome's official API
        const icons = [];

        // Get icon names from the official library
        if (
          window.FontAwesome.library &&
          typeof window.FontAwesome.library.getIconNames === "function"
        ) {
          return window.FontAwesome.library.getIconNames();
        }

        // Try to access the definitions directly
        if (window.FontAwesome.definitions) {
          // Extract icons from definitions
          for (const style in window.FontAwesome.definitions) {
            for (const name in window.FontAwesome.definitions[style]) {
              icons.push(`fa${style.charAt(0)} fa-${name}`);
            }
          }

          if (icons.length > 0) {
            return icons;
          }
        }
      }

      // Try to use the pre-loaded FontAwesomeIcons object
      if (window.FontAwesomeIcons) {
        const allIcons = [];

        // Combine all icon types
        if (Array.isArray(window.FontAwesomeIcons.solid)) {
          allIcons.push(...window.FontAwesomeIcons.solid);
        }
        if (Array.isArray(window.FontAwesomeIcons.regular)) {
          allIcons.push(...window.FontAwesomeIcons.regular);
        }
        if (Array.isArray(window.FontAwesomeIcons.brands)) {
          allIcons.push(...window.FontAwesomeIcons.brands);
        }

        if (allIcons.length > 0) {
          return allIcons;
        }
      }

      // Direct scan of document for loaded Font Awesome icons
      // This works if Font Awesome is loaded via CSS
      const iconElements = document.querySelectorAll('i[class*="fa-"]');
      if (iconElements.length > 0) {
        const icons = new Set();
        iconElements.forEach((el) => {
          const classes = el.className.split(" ");
          const prefix = classes.find(
            (c) =>
              c.startsWith("fa") ||
              c.startsWith("fas") ||
              c.startsWith("far") ||
              c.startsWith("fab")
          );
          const iconName = classes.find((c) => c.startsWith("fa-"));

          if (prefix && iconName) {
            icons.add(`${prefix} ${iconName}`);
          }
        });

        if (icons.size > 0) {
          return [...icons];
        }
      }

      // FontAwesome icons not available - using CSS classes only
      console.warn("⚠️ Font Awesome icons not available - using CSS classes only");

      // Return the fallback list if everything else fails
      return this.getFallbackFontAwesomeIcons();
    } catch (error) {
      console.error("Error getting Font Awesome icons:", error);
      return this.getFallbackFontAwesomeIcons();
    }
  }

  /**
   * Display custom image input field
   */
  showCustomImageInput(element, gridContainer) {
    try {
      gridContainer.className = "icon-picker-grid custom-input";
      // Clear container safely
      gridContainer.textContent = "";

      // Create custom image input container
      const container = document.createElement("div");
      container.className = "custom-image-input-container";

      // Create label
      const label = document.createElement("label");
      label.setAttribute("for", `customImage${element}`);
      label.textContent = "Enter Custom Image URL:";

      // Create input
      const input = document.createElement("input");
      input.type = "text";
      input.id = `customImage${element}`;
      input.className = "custom-image-url";
      input.placeholder = "https://example.com/image.png";
      input.setAttribute("aria-label", `Custom image URL for ${element}`);

      // Create preview container
      const previewDiv = document.createElement("div");
      previewDiv.className = "custom-image-preview";
      previewDiv.id = `preview${element}`;
      previewDiv.textContent = "Image preview will appear here";

      // Create button container
      const buttonContainer = document.createElement("div");
      buttonContainer.style.cssText =
        "display: flex; gap: 10px; justify-content: center; margin-top: 15px;";

      // Create apply button
      const applyButton = document.createElement("button");
      applyButton.type = "button";
      applyButton.className = "btn btn-primary";
      applyButton.id = `applyBtn${element}`;
      applyButton.disabled = true;
      applyButton.textContent = "Apply Image";

      // Assemble elements
      buttonContainer.appendChild(applyButton);
      container.appendChild(label);
      container.appendChild(input);
      container.appendChild(previewDiv);
      container.appendChild(buttonContainer);

      gridContainer.appendChild(container);

      // Setup preview button
      const urlInput = document.getElementById(`customImage${element}`);
      const previewContainer = document.getElementById(`preview${element}`);
      const applyBtn = document.getElementById(`applyBtn${element}`);

      if (urlInput && previewContainer && applyBtn) {
        // Auto-preview on input with debounce
        urlInput.addEventListener("input", () => {
          if (urlInput._timer) clearTimeout(urlInput._timer);
          urlInput._timer = setTimeout(() => {
            const url = urlInput.value.trim();
            if (url && url.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
              // Test image loading
              previewContainer.textContent = "Loading...";
              const img = new Image();
              img.onload = () => {
                previewContainer.textContent = "";
                previewContainer.appendChild(img);
                applyBtn.disabled = false;
              };
              img.onerror = () => {
                previewContainer.textContent = "Error loading image. Please check the URL.";
                applyBtn.disabled = true;
              };
              img.src = url;
              img.style.maxWidth = "100%";
              img.style.maxHeight = "100px";
            } else {
              previewContainer.textContent =
                "Enter valid image URL (must end with .png, .jpg, .gif, .svg, etc)";
              applyBtn.disabled = true;
            }
          }, 500);
        });

        // Apply button handler
        applyBtn.addEventListener("click", () => {
          const url = urlInput.value.trim();
          if (!url) return;
          this.selectIcon(element, url, "custom");
        });

        // Initially disable apply button
        applyBtn.disabled = true;
      }
      console.log(`🖼️ Custom image input displayed for ${element}`);
    } catch (error) {
      console.error("🚨 Error showing custom image input:", error);

      // Fallback if there's an error
      if (gridContainer) {
        gridContainer.textContent = "";

        const fallbackDiv = document.createElement("div");
        fallbackDiv.style.cssText = "padding: 20px; text-align: center; color: #666;";

        const errorMsg = document.createElement("p");
        errorMsg.textContent = "Error loading custom image input";

        const switchBtn = document.createElement("button");
        switchBtn.className = "btn btn-secondary";
        switchBtn.textContent = "Switch back to Font Awesome";
        switchBtn.addEventListener("click", function () {
          const pickerElement = this.closest(".icon-picker-element");
          const typeSelector = pickerElement?.querySelector(".icon-picker-type");
          if (typeSelector) {
            typeSelector.value = "fontawesome";
            typeSelector.dispatchEvent(new Event("change"));
          }
        });

        fallbackDiv.appendChild(errorMsg);
        fallbackDiv.appendChild(switchBtn);
        gridContainer.appendChild(fallbackDiv);
      }
    }
  }

  /**
   * Populate icon grid with Font Awesome icons
   */
  populateIconGrid(element, pickerType) {
    try {
      const gridContainer = document.querySelector(`#iconGrid${element}`);
      if (!gridContainer) return;

      // Clear existing icons
      gridContainer.textContent = "";
      gridContainer.className = "icon-picker-grid loading";

      setTimeout(() => {
        let icons = [];

        if (pickerType === "fontawesome") {
          // Get Font Awesome icons - show more of them!
          const MAX_ICONS = 400; // Increased from 120

          // A more complete list of Font Awesome Free 6.x icons
          icons = [
            // Solid icons (most common)
            "fas fa-home",
            "fas fa-search",
            "fas fa-user",
            "fas fa-cog",
            "fas fa-image",
            "fas fa-video",
            "fas fa-file",
            "fas fa-folder",
            "fas fa-star",
            "fas fa-heart",
            "fas fa-check",
            "fas fa-times",
            "fas fa-plus",
            "fas fa-minus",
            "fas fa-circle",
            "fas fa-square",
            "fas fa-arrow-up",
            "fas fa-arrow-down",
            "fas fa-arrow-left",
            "fas fa-arrow-right",
            "fas fa-envelope",
            "fas fa-phone",
            "fas fa-map-marker",
            "fas fa-calendar",
            "fas fa-clock",
            "fas fa-info-circle",
            "fas fa-question-circle",
            "fas fa-exclamation-circle",
            "fas fa-bell",
            "fas fa-bookmark",
            "fas fa-camera",
            "fas fa-link",
            "fas fa-trash",
            "fas fa-download",
            "fas fa-upload",
            "fas fa-edit",
            "fas fa-save",
            "fas fa-print",
            "fas fa-eye",
            "fas fa-eye-slash",
            "fas fa-lock",
            "fas fa-lock-open",
            "fas fa-key",
            "fas fa-cog",
            "fas fa-wrench",
            "fas fa-tools",
            "fas fa-map",
            "fas fa-location-arrow",
            "fas fa-compass",
            "fas fa-globe",
            "fas fa-flag",
            "fas fa-car",
            "fas fa-bicycle",
            "fas fa-bus",
            "fas fa-truck",
            "fas fa-plane",
            "fas fa-rocket",
            "fas fa-ship",
            "fas fa-train",
            "fas fa-subway",
            "fas fa-taxi",
            "fas fa-walking",
            "fas fa-running",
            "fas fa-hiking",
            "fas fa-music",
            "fas fa-headphones",
            "fas fa-volume-up",
            "fas fa-volume-down",
            "fas fa-volume-off",
            "fas fa-microphone",
            "fas fa-photo-video",
            "fas fa-film",
            "fas fa-tv",
            "fas fa-desktop",
            "fas fa-laptop",
            "fas fa-tablet",
            "fas fa-mobile",
            "fas fa-wifi",
            "fas fa-broadcast-tower",
            "fas fa-ethernet",
            "fas fa-database",
            "fas fa-server",
            "fas fa-cloud",
            "fas fa-cloud-upload-alt",
            "fas fa-cloud-download-alt",
            "fas fa-hdd",
            "fas fa-memory",
            "fas fa-microchip",
            "fas fa-code",
            "fas fa-terminal",
            "fas fa-keyboard",
            "fas fa-mouse",
            "fas fa-gamepad",
            "fas fa-share",
            "fas fa-share-alt",
            "fas fa-share-square",
            "fas fa-reply",
            "fas fa-reply-all",
            "fas fa-forward",
            "fas fa-undo",
            "fas fa-redo",
            "fas fa-sync",
            "fas fa-spinner",
            "fas fa-circle-notch",
            "fas fa-ellipsis-h",
            "fas fa-ellipsis-v",
            "fas fa-bars",
            "fas fa-list",
            "fas fa-th",
            "fas fa-th-large",
            "fas fa-th-list",
            "fas fa-filter",
            "fas fa-sort",
            "fas fa-sort-up",
            "fas fa-sort-down",
            "fas fa-chart-bar",
            "fas fa-chart-line",
            "fas fa-chart-pie",
            "fas fa-chart-area",
            "fas fa-coins",
            "fas fa-dollar-sign",
            "fas fa-euro-sign",
            "fas fa-pound-sign",
            "fas fa-yen-sign",
            "fas fa-ruble-sign",
            "fas fa-rupee-sign",
            "fas fa-wallet",
            "fas fa-credit-card",
            "fas fa-money-bill",
            "fas fa-money-check",
            "fas fa-shopping-cart",
            "fas fa-shopping-bag",
            "fas fa-shopping-basket",
            "fas fa-store",
            "fas fa-box",
            "fas fa-boxes",
            "fas fa-archive",
            "fas fa-warehouse",
            "fas fa-tshirt",
            "fas fa-shoe-prints",
            "fas fa-user-tie",
            "fas fa-mask",
            "fas fa-glasses",
            "fas fa-sunglasses",
            "fas fa-briefcase",
            "fas fa-suitcase",
            "fas fa-umbrella",
            "fas fa-hat-wizard",
            "fas fa-crown",
            "fas fa-graduation-cap",
            "fas fa-book",
            "fas fa-book-open",
            "fas fa-atlas",
            "fas fa-bookmark",
            "fas fa-newspaper",
            "fas fa-scroll",
            "fas fa-pen",
            "fas fa-pen-alt",
            "fas fa-pen-fancy",
            "fas fa-pen-nib",
            "fas fa-marker",
            "fas fa-highlighter",
            "fas fa-pencil-alt",
            "fas fa-eraser",
            "fas fa-paint-brush",
            "fas fa-paint-roller",
            "fas fa-brush",
            "fas fa-stamp",
            "fas fa-tape",
            "fas fa-paperclip",
            "fas fa-thumbtack",
            "fas fa-paste",
            "fas fa-cut",
            "fas fa-copy",
            "fas fa-clipboard",
            "fas fa-clipboard-check",
            "fas fa-clipboard-list",
            "fas fa-comment",
            "fas fa-comment-alt",
            "fas fa-comment-dots",
            "fas fa-comments",
            "fas fa-sms",
            "fas fa-paper-plane",
            "fas fa-envelope",
            "fas fa-envelope-open",
            "fas fa-mail-bulk",
            "fas fa-inbox",
            "fas fa-archive",
            "fas fa-trash",
            "fas fa-trash-alt",
            "fas fa-trash-restore",
            "fas fa-recycle",
            "fas fa-fire",
            "fas fa-fire-alt",
            "fas fa-fire-flame-curved",
            "fas fa-temperature-high",
            "fas fa-temperature-low",
            "fas fa-thermometer",
            "fas fa-thermometer-full",
            "fas fa-thermometer-half",
            "fas fa-thermometer-empty",
            "fas fa-tint",
            "fas fa-tint-slash",
            "fas fa-water",
            "fas fa-hand-holding",
            "fas fa-hands-wash",
            "fas fa-shower",
            "fas fa-bath",
            "fas fa-toilet",
            "fas fa-toilet-paper",
            "fas fa-sink",
            "fas fa-faucet",
            "fas fa-pump-soap",
            "fas fa-band-aid",
            "fas fa-first-aid",
            "fas fa-medkit",
            "fas fa-stethoscope",
            "fas fa-user-md",
            "fas fa-user-nurse",
            "fas fa-hospital",
            "fas fa-hospital-alt",
            "fas fa-hospital-user",
            "fas fa-clinic-medical",
            "fas fa-heartbeat",
            "fas fa-heart-broken",
            "fas fa-virus",
            "fas fa-virus-slash",
            "fas fa-viruses",
            "fas fa-bacteria",
            "fas fa-disease",
            "fas fa-pills",
            "fas fa-prescription",
            "fas fa-cannabis",
            "fas fa-smoking",
            "fas fa-smoking-ban",
            "fas fa-leaf",
            "fas fa-prescription-bottle",
            "fas fa-capsules",
            "fas fa-tablets",
            "fas fa-beer",
            "fas fa-cocktail",
            "fas fa-wine-glass",
            "fas fa-wine-glass-alt",
            "fas fa-wine-bottle",
            "fas fa-whiskey-glass",
            "fas fa-glass-martini",
            "fas fa-glass-martini-alt",
            "fas fa-glass-whiskey",
            "fas fa-flask",
            "fas fa-vial",
            "fas fa-vials",
            "fas fa-capsules",
            "fas fa-tablets",
            "fas fa-prescription-bottle",
            "fas fa-prescription-bottle-alt",
            "fas fa-mortar-pestle",
            "fas fa-syringe",
            "fas fa-tablets",
            "fas fa-teeth",
            "fas fa-teeth-open",
            "fas fa-tooth",
            "fas fa-bone",
            "fas fa-user-injured",
            "fas fa-wheelchair",
            "fas fa-crutch",
            "fas fa-poop",
            "fas fa-toilet-paper",
            "fas fa-hand-sparkles",
            "fas fa-hands-wash",
            "fas fa-handshake-alt-slash",
            "fas fa-people-arrows",
            "fas fa-mask",
            "fas fa-head-side-cough",
            "fas fa-head-side-cough-slash",
            "fas fa-head-side-mask",
            "fas fa-head-side-virus",
            "fas fa-people-arrows",
            "fas fa-person-booth",
            "fas fa-route",
            "fas fa-map-marked",
            "fas fa-map-marked-alt",
            "fas fa-home",
            "fas fa-house-user",

            // Regular icons
            "far fa-circle",
            "far fa-square",
            "far fa-star",
            "far fa-heart",
            "far fa-user",
            "far fa-file",
            "far fa-folder",
            "far fa-calendar",
            "far fa-clock",
            "far fa-bell",
            "far fa-bookmark",
            "far fa-envelope",
            "far fa-eye",
            "far fa-eye-slash",
            "far fa-comment",

            // Brand icons
            "fab fa-facebook",
            "fab fa-twitter",
            "fab fa-instagram",
            "fab fa-youtube",
            "fab fa-google",
            "fab fa-github",
            "fab fa-linkedin",
            "fab fa-apple",
            "fab fa-android",
            "fab fa-windows",
            "fab fa-amazon",
            "fab fa-spotify",
            "fab fa-discord",
          ];

          // Remove duplicates if any
          icons = [...new Set(icons)];
        } else if (pickerType === "emoji") {
          // Use CONSISTENT emoji set for all elements
          icons = this.getConsistentEmojiSet();
        } else if (pickerType === "custom") {
          // Handle custom image URL input
          this.showCustomImageInput(element, gridContainer);
          return;
        }

        if (icons.length === 0) {
          gridContainer.className = "icon-picker-grid empty";
          gridContainer.textContent = "";
          const noIconsMessage = document.createElement("p");
          noIconsMessage.style.cssText = "color: #666; text-align: center; padding: 20px;";
          noIconsMessage.textContent = "No icons available";
          gridContainer.appendChild(noIconsMessage);
          return;
        }

        gridContainer.className = "icon-picker-grid";

        // Show more icons - increased from 120
        const MAX_ICONS_PER_GRID = 240;
        const displayIcons = icons.slice(0, MAX_ICONS_PER_GRID);

        displayIcons.forEach((icon) => {
          const iconItem = document.createElement("div");
          iconItem.className = `icon-item ${pickerType}`;
          iconItem.dataset.icon = icon;
          iconItem.dataset.element = element;
          iconItem.tabIndex = 0;
          iconItem.setAttribute("role", "button");
          iconItem.setAttribute("aria-label", `Select ${icon} for ${element}`);

          if (pickerType === "fontawesome") {
            // Create icon with simple error handling
            const iconElement = document.createElement("i");
            iconElement.className = icon;
            iconElement.setAttribute("aria-hidden", "true");
            iconItem.appendChild(iconElement);
          } else {
            iconItem.textContent = icon;
          }

          // Add click handler
          iconItem.addEventListener("click", () => {
            this.selectIcon(element, icon, pickerType);
          });

          // Add keyboard handler
          iconItem.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              this.selectIcon(element, icon, pickerType);
            }
          });

          gridContainer.appendChild(iconItem);
        });

        // Highlight currently selected icon
        this.highlightSelectedIcon(element, gridContainer);
      }, 100);
    } catch (error) {
      console.error("🚨 Error populating icon grid:", error);
      if (gridContainer) {
        gridContainer.className = "icon-picker-grid empty";
        gridContainer.textContent = "";
        const errorMessage = document.createElement("p");
        errorMessage.style.cssText = "color: red; text-align: center; padding: 20px;";
        errorMessage.textContent = "Error loading icons";
        gridContainer.appendChild(errorMessage);
      }
    }
  }

  /**
   * Select an icon for an element
   */
  selectIcon(element, icon, pickerType) {
    try {
      // Update configuration
      const configPath = `thumbnailSettings.iconSettings.customIcons.${element}`;

      // For custom images, store the full URL
      // For other types, store the icon identifier
      this.core.safeSetNestedProperty(this.core.config, configPath, icon);

      // Update current icon display
      this.updateCurrentIconDisplay(element, icon, pickerType);

      // Highlight selected icon in grid
      const gridContainer = document.querySelector(`#iconGrid${element}`);
      if (gridContainer) {
        this.highlightSelectedIcon(element, gridContainer, icon);
      }

      // Add visual feedback
      const pickerElement = document.querySelector(
        `.icon-picker-element[data-element="${element}"]`
      );
      if (pickerElement) {
        pickerElement.classList.add("updating");
        setTimeout(() => {
          pickerElement.classList.remove("updating");
          pickerElement.classList.add("updated");
          setTimeout(() => {
            pickerElement.classList.remove("updated");
          }, 2000);
        }, 500);
      }

      // Show success toast
      if (this.core.showToast) {
        this.core.showToast(
          "success",
          "Icon Updated",
          `${element} icon changed to ${pickerType === "custom" ? "custom image" : icon}`
        );
      }

      console.log(`🎨 Selected icon for ${element}: ${icon}`);
    } catch (error) {
      console.error("🚨 Error selecting icon:", error);
    }
  }

  /**
   * Update current icon display
   */
  updateCurrentIconDisplay(element, icon = null, pickerType = null) {
    try {
      const displayElement = document.querySelector(`#currentIcon${element}`);
      if (!displayElement) return;

      // Get icon from config if not provided
      if (!icon) {
        icon =
          this.core.getNestedProperty(
            this.core.config,
            `thumbnailSettings.iconSettings.customIcons.${element}`
          ) || "fas fa-circle";
      }

      // Determine picker type if not provided
      if (!pickerType) {
        if (icon.startsWith("fas ") || icon.startsWith("far ") || icon.startsWith("fab ")) {
          pickerType = "fontawesome";
        } else if (icon.match(/^https?:\/\//i)) {
          pickerType = "custom";
        } else {
          pickerType = "emoji";
        }
      }

      // Update display
      if (pickerType === "fontawesome") {
        displayElement.textContent = "";
        const iconElement = document.createElement("i");
        iconElement.className = icon;
        iconElement.setAttribute("aria-hidden", "true");
        displayElement.appendChild(iconElement);
      } else if (pickerType === "custom") {
        displayElement.textContent = "";
        const imgElement = document.createElement("img");
        imgElement.src = icon;
        imgElement.alt = "Custom icon";
        // Set up safe error fallback
        imgElement.addEventListener("error", function () {
          this.src =
            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="%23f44336" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
        });
        displayElement.appendChild(imgElement);
      } else {
        displayElement.textContent = icon;
      }
    } catch (error) {
      console.error("🚨 Error updating current icon display:", error);
    }
  }

  /**
   * Highlight selected icon in grid
   */
  highlightSelectedIcon(element, gridContainer, selectedIcon = null) {
    try {
      // Get current icon if not provided
      if (!selectedIcon) {
        selectedIcon = this.core.getNestedProperty(
          this.core.config,
          `thumbnailSettings.iconSettings.customIcons.${element}`
        );
      }

      // Remove previous selection
      gridContainer.querySelectorAll(".icon-item.selected").forEach((item) => {
        item.classList.remove("selected");
      });

      // Highlight new selection
      if (selectedIcon) {
        const selectedItem = gridContainer.querySelector(`[data-icon="${selectedIcon}"]`);
        if (selectedItem) {
          selectedItem.classList.add("selected");

          // Scroll to selected item if needed
          if (selectedItem.offsetTop > gridContainer.clientHeight) {
            gridContainer.scrollTop = selectedItem.offsetTop - gridContainer.clientHeight / 2;
          }
        }
      }
    } catch (error) {
      console.error("🚨 Error highlighting selected icon:", error);
    }
  }

  /**
   * Populate icon configuration form with current values
   */
  populateIconForm(container) {
    try {
      const iconSettings = this.core.config.thumbnailSettings?.iconSettings || {};

      // Icon system toggles
      const enableCustomIcons = container.querySelector("#enableCustomIcons");
      if (enableCustomIcons) {
        enableCustomIcons.checked = !!iconSettings.enableCustomIcons;
      }

      const enableFontAwesome = container.querySelector("#enableFontAwesome");
      if (enableFontAwesome) {
        enableFontAwesome.checked = !!iconSettings.enableFontAwesome;
      }

      // Font Awesome URL
      const fontAwesomeUrl = container.querySelector("#fontAwesomeUrl");
      if (fontAwesomeUrl && iconSettings.fontAwesomeUrl) {
        fontAwesomeUrl.value = iconSettings.fontAwesomeUrl;
      }

      // Icon appearance settings - now pixel-based
      const iconSize = container.querySelector("#iconSize");
      if (iconSize && iconSettings.iconSize) {
        iconSize.value = iconSettings.iconSize;
      }

      const iconColor = container.querySelector("#iconColor");
      const iconColorHex = container.querySelector("#iconColor + .color-hex-input");
      if (iconColor && iconSettings.iconColor) {
        iconColor.value = iconSettings.iconColor;
        if (iconColorHex) {
          iconColorHex.value = iconSettings.iconColor.toUpperCase();
        }
      }

      const iconOpacity = container.querySelector("#iconOpacity");
      const iconOpacityValue = container.querySelector("#iconOpacity + .range-value");
      if (iconOpacity && iconSettings.iconOpacity !== undefined) {
        iconOpacity.value = iconSettings.iconOpacity;
        if (iconOpacityValue) {
          iconOpacityValue.textContent = iconSettings.iconOpacity;
        }
      }

      const iconAlignment = container.querySelector("#iconAlignment");
      if (iconAlignment && iconSettings.iconAlignment) {
        iconAlignment.value = iconSettings.iconAlignment;
      }

      const iconMargin = container.querySelector("#iconMargin");
      if (iconMargin && iconSettings.iconMargin !== undefined) {
        iconMargin.value = iconSettings.iconMargin;
      }

      // Hover effects
      const enableIconHover = container.querySelector("#enableIconHover");
      if (enableIconHover) {
        enableIconHover.checked = !!iconSettings.enableIconHover;
      }

      const iconHoverScale = container.querySelector("#iconHoverScale");
      if (iconHoverScale && iconSettings.iconHoverScale !== undefined) {
        iconHoverScale.value = iconSettings.iconHoverScale;
        this.updateRangeValue(iconHoverScale);
      }

      const iconHoverOpacity = container.querySelector("#iconHoverOpacity");
      if (iconHoverOpacity && iconSettings.iconHoverOpacity !== undefined) {
        iconHoverOpacity.value = iconSettings.iconHoverOpacity;
      }

      // Update icon system conflict warning
      this.handleIconSystemToggle();

      // Update current icon displays for all elements
      const elements = [
        "Panorama",
        "Hotspot",
        "Polygon",
        "Video",
        "Webframe",
        "Image",
        "Text",
        "ProjectedImage",
        "Element",
        "Business",
        "3DHotspot",
        "Container",
        "3DModel",
        "3DModelObject",
      ];

      elements.forEach((element) => {
        this.updateCurrentIconDisplay(element);
      });

      console.log("🎨 Icon form populated");
    } catch (error) {
      console.error("🚨 Security: Error populating icon form:", error);
    }
  }

  /**
   * Setup Global Default Path with image preview and upload functionality
   */
  setupGlobalDefaultPathHandler(container) {
    try {
      const defaultPathInput = container.querySelector("#thumbnailDefaultPath");
      const browseButton = container.querySelector(".btn-secondary");

      if (!defaultPathInput || !browseButton) return;

      // Create hidden file input
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";
      fileInput.id = "thumbnailFileInput";

      // Insert after the path input
      defaultPathInput.parentNode.appendChild(fileInput);

      // Handle browse button click
      browseButton.addEventListener("click", () => {
        fileInput.click();
      });

      // Handle file selection
      fileInput.addEventListener("change", (e) => {
        this.handleImageUpload(e.target, defaultPathInput);
      });

      // Create image preview container
      this.createImagePreview(defaultPathInput.parentNode);

      console.log("📁 Global Default Path handler set up");
    } catch (error) {
      console.error("🚨 Security: Error setting up global default path handler:", error);
    }
  }

  /**
   * Create image preview container
   */
  createImagePreview(container) {
    try {
      // Check if preview container already exists
      if (container.querySelector(".image-preview-container")) return;

      // Create preview container
      const previewContainer = document.createElement("div");
      previewContainer.className = "image-preview-container";
      // Clear container safely
      previewContainer.textContent = "";

      // Create preview label
      const previewLabel = document.createElement("div");
      previewLabel.className = "image-preview-label";
      previewLabel.textContent = "Preview";

      // Create preview image
      const previewImg = document.createElement("img");
      previewImg.className = "image-preview";
      previewImg.src = "";
      previewImg.alt = "Thumbnail preview";
      previewImg.style.display = "none";

      // Create placeholder
      const placeholder = document.createElement("div");
      placeholder.className = "preview-placeholder";
      placeholder.textContent = "No image";

      // Assemble elements
      previewContainer.appendChild(previewLabel);
      previewContainer.appendChild(previewImg);
      previewContainer.appendChild(placeholder);

      // Insert at the beginning of the container
      container.insertBefore(previewContainer, container.firstChild);
    } catch (error) {
      console.error("🚨 Security: Error creating image preview:", error);
    }
  }

  /**
   * Handle image upload and validation
   */
  handleImageUpload(fileInput, pathInput) {
    try {
      const file = fileInput.files[0];
      if (!file) return;

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
      if (!validTypes.includes(file.type)) {
        if (this.core.showToast) {
          this.core.showToast(
            "error",
            "Invalid File",
            "Please select a valid image file (JPG, PNG, GIF, WEBP, SVG)"
          );
        }
        return;
      }

      // Validate file size (max 2MB)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        if (this.core.showToast) {
          this.core.showToast("error", "File Too Large", "Image must be smaller than 2MB");
        }
        return;
      }

      // Set path in input field (this would normally be handled by server-side upload)
      // For demo purposes, we'll use a placeholder path
      const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, ""); // Sanitize filename
      pathInput.value = `assets/${fileName}`;

      // Update config
      this.core.onFormChange(pathInput);

      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.showImagePreview(e.target.result, pathInput.parentNode);
      };
      reader.readAsDataURL(file);

      // Show success message
      if (this.core.showToast) {
        this.core.showToast(
          "success",
          "Image Selected",
          "Image will be uploaded when settings are saved"
        );
      }
    } catch (error) {
      console.error("🚨 Security: Error handling image upload:", error);
    }
  }

  /**
   * Show image preview
   */
  showImagePreview(src, container) {
    try {
      const previewContainer = container.querySelector(".image-preview-container");
      if (!previewContainer) return;

      const previewImg = previewContainer.querySelector(".image-preview");
      const placeholder = previewContainer.querySelector(".preview-placeholder");

      if (previewImg && placeholder) {
        previewImg.src = src;
        previewImg.style.display = "block";
        placeholder.style.display = "none";
      }
    } catch (error) {
      console.error("🚨 Security: Error showing image preview:", error);
    }
  }

  /**
   * Update range input value display and appearance
   */
  updateRangeValue(rangeInput) {
    try {
      // Update value display
      const valueDisplay = rangeInput.parentNode.querySelector(".range-value");
      if (valueDisplay) {
        valueDisplay.textContent = rangeInput.value;
      }

      // Enhance range input appearance with colored track
      const min = parseFloat(rangeInput.min) || 0;
      const max = parseFloat(rangeInput.max) || 100;
      const value = parseFloat(rangeInput.value) || 0;
      const percentage = ((value - min) / (max - min)) * 100;

      // Apply gradient to show progress on the range track
      rangeInput.style.background = `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${percentage}%, var(--color-surface-secondary) ${percentage}%, var(--color-surface-secondary) 100%)`;

      console.log(`🎚️ Range value updated: ${rangeInput.id} = ${rangeInput.value}`);
    } catch (error) {
      console.error("🚨 Error updating range value:", error);
    }
  }

  /**
   * Populate thumbnail form with current values
   */
  populateThumbnailForm(container) {
    try {
      const config = this.core.config.thumbnailSettings || {};

      // Master toggle - DEFAULT TO FALSE
      const enableThumbnails = container.querySelector("#enableThumbnails");
      if (enableThumbnails) {
        enableThumbnails.checked = !!config.enableThumbnails; // This should default to false
        this.handleThumbnailToggle(enableThumbnails);
      }

      // Size preset - now pixel-based
      const sizePreset = container.querySelector("#thumbnailSizePreset");
      if (sizePreset && config.thumbnailSize) {
        sizePreset.value = config.thumbnailSize;
      }

      // Border radius
      const borderRadius = container.querySelector("#thumbnailBorderRadius");
      const borderRadiusValue = container.querySelector("#thumbnailBorderRadius + .range-value");
      if (borderRadius && config.borderRadius !== undefined) {
        borderRadius.value = config.borderRadius;
        if (borderRadiusValue) {
          borderRadiusValue.textContent = config.borderRadius;
        }
      }

      // Border width
      const borderWidth = container.querySelector("#thumbnailBorderWidth");
      const borderWidthValue = container.querySelector("#thumbnailBorderWidth + .range-value");
      if (borderWidth && config.borderWidth !== undefined) {
        borderWidth.value = config.borderWidth;
        if (borderWidthValue) {
          borderWidthValue.textContent = config.borderWidth;
        }
      }

      // Border color
      const borderColor = container.querySelector("#thumbnailBorderColor");
      const borderColorHex = container.querySelector("#thumbnailBorderColor + .color-hex-input");
      if (borderColor && config.borderColor) {
        borderColor.value = config.borderColor;
        if (borderColorHex) {
          borderColorHex.value = config.borderColor.toUpperCase();
        }
      }

      // Global default path
      const defaultPath = container.querySelector("#thumbnailDefaultPath");
      if (defaultPath && config.defaultImagePath) {
        defaultPath.value = config.defaultImagePath;
        // Try to show preview if path exists
        this.loadExistingImagePreview(config.defaultImagePath, defaultPath.parentNode);
      }

      // Element-specific defaults
      const defaults = config.defaultImages || {};
      const elementMapping = {
        Panorama: "panoramaDefault",
        Hotspot: "hotspotDefault",
        Polygon: "polygonDefault",
        Video: "videoDefault",
        Webframe: "webframeDefault",
        Image: "imageDefault",
        Text: "textDefault",
        ProjectedImage: "projectedImageDefault",
        Element: "elementDefault",
        Business: "businessDefault",
        "3DHotspot": "3dHotspotDefault",
        Container: "containerDefault",
        "3DModel": "3dModelDefault",
        "3DModelObject": "3dModelObjectDefault",
      };

      Object.entries(defaults).forEach(([element, imagePath]) => {
        const inputId = elementMapping[element];
        if (inputId) {
          const input = document.getElementById(inputId);
          if (input) {
            // Extract just the filename for display purposes (prefer core helper)
            const core = window.searchProControlPanel?.core || this.core;
            const filename = core?.stripAssetPrefix
              ? core.stripAssetPrefix(imagePath)
              : this.filenameOnly(imagePath);
            input.value = filename;
            // Also set the value attribute for consistency with static defaults
            input.setAttribute("value", filename);
            console.log(`🔧 POPULATE: Set ${inputId} = ${filename} (from ${imagePath})`);
          } else {
            console.warn(`🔧 POPULATE: Input ${inputId} not found for element ${element}`);
          }
        }
      });

      console.log("🖼️ Thumbnail form populated");
    } catch (error) {
      console.error("🚨 Security: Error populating thumbnail form:", error);
    }
  }

  /**
   * Load existing image preview if path exists
   */
  loadExistingImagePreview(imagePath, container) {
    try {
      if (!imagePath) return;

      const img = new Image();
      img.onload = () => {
        this.showImagePreview(img.src, container);
      };
      img.onerror = () => {
        console.log("Image not found, hiding preview");
      };
      img.src = imagePath;
    } catch (error) {
      console.error("🚨 Security: Error loading existing image preview:", error);
    }
  }

  /**
   * Reset Thumbnail Configuration to defaults
   */
  resetThumbnailToDefaults() {
    // Reset thumbnail settings to match search engine defaults
    try {
      const defaults = {
        enableThumbnails: false,
        thumbnailSize: "48px",
        borderRadius: 4,
        borderColor: "#9CBBFF",
        borderWidth: 4,
        defaultImagePath: "assets/default-thumbnail.jpg",
        defaultImages: {
          Panorama: "assets/default-thumbnail.jpg",
          Hotspot: "assets/hotspot-default.jpg",
          Polygon: "assets/polygon-default.jpg",
          Video: "assets/video-default.jpg",
          Webframe: "assets/webframe-default.jpg",
          Image: "assets/image-default.jpg",
          Text: "assets/text-default.jpg",
          ProjectedImage: "assets/projected-image-default.jpg",
          Element: "assets/element-default.jpg",
          Business: "assets/business-default.jpg",
          Container: "assets/container-default.jpg",
          "3DModel": "assets/3d-model-default.jpg",
          "3DHotspot": "assets/3d-hotspot-default.jpg",
          "3DModelObject": "assets/3d-model-object-default.jpg",
        },
      };

      this.core.config.thumbnailSettings = { ...defaults };

      const container = document.getElementById("display-panel");
      if (container) {
        this.populateThumbnailForm(container);
      }

      if (this.core.showToast) {
        this.core.showToast(
          "success",
          "Reset Complete",
          "All thumbnail settings reset to defaults"
        );
      }
    } catch (error) {
      console.error("Error resetting thumbnail settings:", error);
    }
  }

  /**
   * Reset Icon settings to defaults aligned with search engine
   */
  resetIconSettingsToDefaults() {
    try {
      const defaults = {
        enableCustomIcons: false,
        enableFontAwesome: false,
        fontAwesomeUrl: "",
        iconSize: "24px",
        iconColor: "#3b82f6",
        iconOpacity: 1.0,
        iconAlignment: "left",
      };

      // Update the configuration
      if (!this.core.config.thumbnailSettings) {
        this.core.config.thumbnailSettings = {};
      }
      if (!this.core.config.thumbnailSettings.iconSettings) {
        this.core.config.thumbnailSettings.iconSettings = {};
      }

      Object.assign(this.core.config.thumbnailSettings.iconSettings, defaults);

      const container = document.getElementById("display-panel");
      if (container) {
        this.populateIconForm(container);
      }

      if (this.core.showToast) {
        this.core.showToast("success", "Reset Complete", "All icon settings reset to defaults");
      }
    } catch (error) {
      console.error("❌ Error resetting icon settings:", error);
    }
  }

  /**
   * Reset Label Fallback Options to defaults
   */
  resetLabelFallbackToDefaults() {
    try {
      const defaults = this.core.getDefaultConfig().useAsLabel || {};
      this.core.config.useAsLabel = { ...defaults };

      // Update form
      const container = document.getElementById("display-panel");
      if (container) {
        this.populateDisplayForm(container);
      }

      if (this.core.showToast) {
        this.core.showToast(
          "success",
          "Reset Complete",
          "Label fallback options reset to defaults"
        );
      }
      console.log("🔄 Label fallback options reset to defaults");
    } catch (error) {
      console.error("🚨 Security: Error resetting label fallback options:", error);
    }
  }

  /**
   * Reset Label Customization to defaults
   */
  resetLabelCustomizationToDefaults() {
    try {
      const defaults = {
        Panorama: "Panorama",
        Hotspot: "Hotspot",
        Polygon: "Polygon",
        Video: "Video",
        Webframe: "Webframe",
        Image: "Image",
        Text: "Text",
        ProjectedImage: "Projected Image",
        Element: "Element",
        Business: "Business",
        "3DHotspot": "3D Hotspot",
        "3DModel": "3D Model",
        "3DModelObject": "3D Model Object",
        Container: "Container",
      };

      // Initialize displayLabels object if it doesn't exist
      if (!this.core.config.displayLabels) {
        this.core.config.displayLabels = {};
      }

      // Reset to defaults
      for (const key in defaults) {
        this.core.config.displayLabels[key] = defaults[key];
      }

      // Update form
      const container = document.getElementById("display-panel");
      if (container) {
        this.populateLabelCustomizationForm(container);
      }

      if (this.core.showToast) {
        this.core.showToast("success", "Reset Complete", "Label customization reset to defaults");
      }
      console.log("🏷️ Label customization reset to defaults");
    } catch (error) {
      console.error("🚨 Security: Error resetting label customization:", error);
    }
  }

  /**
   * Handle thumbnail master toggle change
   */
  handleThumbnailToggle(toggle) {
    try {
      const isEnabled = toggle.checked;
      const thumbnailSettings = document.getElementById("thumbnailSettings");

      // Toggle visibility of thumbnail settings
      if (thumbnailSettings) {
        if (isEnabled) {
          thumbnailSettings.style.display = "block";
          thumbnailSettings.style.opacity = "1";
        } else {
          thumbnailSettings.style.display = "none";
          thumbnailSettings.style.opacity = "0";
        }
      }

      // Toggle priority info message
      const priorityInfo = document.getElementById("thumbnailPriorityInfo");
      if (priorityInfo) {
        if (isEnabled) {
          priorityInfo.style.display = "flex";
          priorityInfo.style.opacity = "1";
        } else {
          priorityInfo.style.display = "none";
          priorityInfo.style.opacity = "0";
        }
      }

      // Update config
      this.core.onFormChange(toggle);

      console.log(`🖼️ Thumbnails ${isEnabled ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("🚨 Security: Error handling thumbnail toggle:", error);
    }
  }

  /**
   * Handle color input changes and update hex display
   */
  handleColorInputChange(input) {
    try {
      const hexInput = input.closest(".color-input-wrapper").querySelector(".color-hex-input");
      if (hexInput) {
        hexInput.value = input.value.toUpperCase();
        this.core.validateField(hexInput);
      }

      // Trigger form change
      this.core.onFormChange(input);
    } catch (error) {
      console.error("🚨 Security: Error handling color input:", error);
    }
  }

  /**
   * Handle hex input changes and update color picker
   */
  handleHexInputChange(hexInput) {
    try {
      const hexValue = hexInput.value;

      // Validate hex format
      if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hexValue)) {
        // Update the color picker
        const colorInput = hexInput.closest(".color-input-wrapper").querySelector(".color-input");
        if (colorInput) {
          colorInput.value = hexValue;
          // Trigger form change
          this.core.onFormChange(colorInput);
        }
        hexInput.classList.remove("error");
      } else {
        hexInput.classList.add("error");
      }
    } catch (error) {
      console.error("🚨 Security: Error handling hex input:", error);
    }
  }

  /**
   * Populate subtitle toggles based on underlying configuration
   */
  populateSubtitleToggles() {
    try {
      const showSubtitlesToggle = document.getElementById("showSubtitlesInResults");

      if (!showSubtitlesToggle) return;

      const displayConfig = this.core.config.display || {};
      showSubtitlesToggle.checked = !!displayConfig.showSubtitlesInResults;

      console.log(`👁️ Subtitle toggles populated: showSubtitles=${showSubtitlesToggle.checked}`);
    } catch (error) {
      console.error("🚨 Security: Error populating subtitle toggles:", error);
    }
  }

  /**
   * Handle display behavior toggle changes
   */
  handleDisplayBehaviorToggle(toggle) {
    try {
      const fieldName = this.core.sanitizeInput(toggle.name || toggle.id, 100);
      const isChecked = toggle.checked;

      // Update configuration directly
      this.core.onFormChange(toggle);

      // Apply live preview
      this.applyDisplayLivePreview(fieldName, isChecked);

      // Show visual feedback
      this.showToggleFeedback(toggle, isChecked);

      console.log(`👁️ Display toggle changed: ${fieldName} = ${isChecked}`);
    } catch (error) {
      console.error("🚨 Security: Error handling display behavior toggle:", error);
    }
  }

  /**
   * Check if a field is a subtitle toggle
   */
  isSubtitleToggle(fieldName) {
    return fieldName === "showSubtitlesInResults" || fieldName === "display.showSubtitlesInResults";
  }

  /**
   * Handle tab-specific form changes
   */
  onFormChange(input, skipInterdependencyCheck = false) {
    try {
      // Handle subtitle toggles specially
      const fieldName = input.name || input.id;

      // Let core handle the basic form change
      this.core.onFormChange(input);

      // Handle any other Display tab specific logic
      if (
        fieldName.startsWith("display.") ||
        [
          "showGroupHeaders",
          "showGroupCount",
          "showIconsInResults",
          "showTagsInResults",
          "showParentInfo",
        ].includes(fieldName)
      ) {
        this.handleDisplayBehaviorToggle(input);
      }
    } catch (error) {
      console.error("🚨 Security: Error handling Display tab form change:", error);
    }
  }

  /**
   * Reset Display tab to defaults with proper subtitle toggle handling
   */
  resetToDefaults() {
    try {
      console.log("🔄 Resetting Display tab to defaults");

      const defaults = this.core.getDefaultConfig();

      // Reset display settings
      if (defaults.display) {
        this.core.config.display = { ...defaults.display };
      } else {
        // Create default display config if not in defaults
        this.core.config.display = {
          showGroupHeaders: true,
          showGroupCount: true,
          showIconsInResults: true,
          showTagsInResults: true,
          showSubtitlesInResults: true,
          showParentInfo: true,
        };
      }

      // Reset thumbnail settings with enableThumbnails = false
      if (defaults.thumbnailSettings) {
        this.core.config.thumbnailSettings = { ...defaults.thumbnailSettings };
        this.core.config.thumbnailSettings.enableThumbnails = false; // Ensure default is false
      }

      // Reset the underlying subtitle configuration
      this.core.safeSetNestedProperty(this.core.config, "elementContent.showDescriptions", true);

      // Update form fields
      const container = document.getElementById("display-panel");
      if (container) {
        this.populateDisplayForm(container);
        this.setupDisplayBehaviorHandlers(container);
        this.setupThumbnailHandlers(container);
      }

      console.log("✅ Display tab reset complete");
    } catch (error) {
      console.error("🚨 Security: Error resetting Display tab:", error);
    }
  }

  /**
   * Reset only Display Behavior section to defaults
   */
  resetDisplayBehaviorToDefaults() {
    try {
      const defaults = {
        showGroupHeaders: true,
        showGroupCount: true,
        showIconsInResults: true,
        showTagsInResults: true,
        showSubtitlesInResults: true,
        showParentInfo: true,
      };

      // Initialize display object if it doesn't exist
      if (!this.core.config.display) {
        this.core.config.display = {};
      }

      // Reset only display behavior settings
      Object.keys(defaults).forEach((key) => {
        this.core.safeSetNestedProperty(this.core.config.display, key, defaults[key]);
      });

      // Update form
      const container = document.getElementById("display-panel");
      if (container) {
        this.populateDisplayForm(container);
      }

      if (this.core.showToast) {
        this.core.showToast("success", "Reset Complete", "Display behavior reset to defaults");
      }
      console.log("🔄 Display behavior settings reset to defaults");
    } catch (error) {
      console.error("🚨 Security: Error resetting display behavior:", error);
    }
  }

  /**
   * Reset only Thumbnail Visibility toggles to defaults
   */
  resetThumbnailVisibilityToggles() {
    try {
      // Default values for visibility toggles only
      const visibilityDefaults = {
        panorama: true,
        hotspot: true,
        polygon: true,
        video: true,
        webframe: true,
        image: true,
        text: true,
        projectedImage: true,
        element: true,
        business: true,
        container: true,
        "3dmodel": true,
        "3dhotspot": true,
        "3dmodelobject": true,
        other: true,
      };

      // Initialize displayElements.showFor if it doesn't exist
      if (!this.core.config.displayElements) {
        this.core.config.displayElements = {};
      }
      if (!this.core.config.displayElements.showFor) {
        this.core.config.displayElements.showFor = {};
      }

      // Only update the visibility toggles in config
      Object.keys(visibilityDefaults).forEach((key) => {
        this.core.config.displayElements.showFor[key] = visibilityDefaults[key];

        // Find and update the corresponding toggle
        const toggle = document.querySelector(`[name="displayElements.showFor.${key}"]`);

        if (toggle) {
          toggle.checked = visibilityDefaults[key];
          // Trigger change event
          const event = new Event("change", {
            bubbles: true,
            cancelable: true,
          });
          toggle.dispatchEvent(event);
        }
      });

      // Show success notification
      if (this.core.showToast) {
        this.core.showToast(
          "success",
          "Reset Complete",
          "Thumbnail visibility toggles reset to defaults"
        );
      }
    } catch (error) {
      console.error("Error resetting thumbnail visibility toggles:", error);
    }
  }

  /**
   * Update toggle visual state with smooth animation
   */
  updateToggleVisualState(toggle, isChecked) {
    try {
      const formGroup = toggle.closest(".form-group");
      if (!formGroup) return;

      // Add visual feedback for automatic change
      formGroup.classList.add("auto-changed");
      setTimeout(() => {
        formGroup.classList.remove("auto-changed");
      }, 600);

      // Update toggle text color to show automatic change
      const toggleText = formGroup.querySelector(".toggle-text");
      if (toggleText) {
        toggleText.style.color = "#8b5cf6"; // Purple to indicate automatic change
        setTimeout(() => {
          toggleText.style.color = isChecked ? "#38A169" : "#E53E3E";
          setTimeout(() => {
            toggleText.style.color = "";
          }, 1000);
        }, 300);
      }
    } catch (error) {
      console.error("🚨 Error updating toggle visual state:", error);
    }
  }

  /**
   * Show interdependency message to user
   */
  showInterdependencyMessage(message) {
    try {
      if (this.core && this.core.showToast) {
        this.core.showToast("info", "Auto-adjustment", message);
      } else {
        console.log(`ℹ️ ${message}`);
      }
    } catch (error) {
      console.error("🚨 Error showing interdependency message:", error);
    }
  }

  /**
   * Show visual feedback for toggle changes
   */
  showToggleFeedback(toggle, isChecked) {
    try {
      const formGroup = toggle.closest(".form-group");
      if (!formGroup) return;

      // Add temporary highlight effect
      formGroup.classList.add("just-changed");
      setTimeout(() => {
        formGroup.classList.remove("just-changed");
      }, 300);

      // Update toggle text color briefly
      const toggleText = formGroup.querySelector(".toggle-text");
      if (toggleText) {
        toggleText.style.color = isChecked ? "#38A169" : "#E53E3E";
        setTimeout(() => {
          toggleText.style.color = "";
        }, 1000);
      }
    } catch (error) {
      console.error("🚨 Error showing toggle feedback:", error);
    }
  }

  /**
   * Validate fields specific to Display tab
   */
  validateField(field) {
    try {
      const value = field.type === "checkbox" ? field.checked : field.value;
      const fieldName = this.core.sanitizeInput(field.name || field.id, 100);
      let isValid = true;

      // Call base validation first
      isValid = this.core.validateField(field);

      // Custom validation rules for Display tab fields
      if (field.id === "thumbnailBorderRadius") {
        isValid = this.validateBorderRadius(field, value);
      } else if (field.id === "thumbnailBorderWidth") {
        isValid = this.validateBorderWidth(field, value);
      } else if (field.id === "iconSize") {
        isValid = this.validateIconSize(field);
      } else if (field.id === "thumbnailDefaultPath") {
        // Only the global default path should be normalized to assets/
        if (field.value && field.value.trim()) {
          const normalizedPath = this.toAssetPath(field.value);
          if (normalizedPath !== field.value) {
            field.value = normalizedPath;
            field.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
      } else if (field.id?.endsWith("Default")) {
        // Element-specific fields should display filename only (no assets/ prefix)
        const filename = this.filenameOnly(field.value);
        if (filename !== field.value) {
          field.value = filename;
          field.setAttribute("value", filename);
          field.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }

      // Apply validation styling
      if (!isValid) {
        field.classList.add("error");
        console.log(`⚠️ Display tab validation: ${fieldName} failed`);
      } else {
        field.classList.remove("error");
        field.classList.add("valid");
      }

      return isValid;
    } catch (error) {
      console.error("🚨 Security: Error in Display tab field validation:", error);
      return false;
    }
  }

  /**
   * Validate icon size input
   */
  validateIconSize(select) {
    try {
      const value = select.value;
      const warningElement = document.querySelector("#iconSizeWarning");
      const errorElement = document.querySelector("#iconSizeError");

      if (!warningElement || !errorElement) return true;

      // Hide both messages initially
      warningElement.style.display = "none";
      errorElement.style.display = "none";

      // Extract pixel value from size string (e.g., "64px" -> 64)
      let pixelValue = 48; // default
      if (value && value.endsWith("px")) {
        pixelValue = parseInt(value.replace("px", ""));
      }

      // Validation rules
      if (pixelValue < 16 || pixelValue > 96) {
        errorElement.style.display = "block";
        select.classList.add("error");
        return false;
      } else if (pixelValue >= 64) {
        warningElement.style.display = "block";
        select.classList.remove("error");
        select.classList.add("warning");
        return true;
      }

      // Remove validation classes if no issues
      select.classList.remove("error", "warning");
      return true;
    } catch (error) {
      console.error("Error validating icon size:", error);
      return false;
    }
  }

  /**
   * Validate border radius with warnings and errors
   */
  validateBorderRadius(field, value) {
    try {
      const numValue = parseFloat(value);

      // Clear previous validation messages
      this.clearValidationMessage(field);

      if (isNaN(numValue) || numValue < 0) {
        this.showValidationMessage(field, "error", "Border radius cannot be negative");
        return false;
      }

      if (numValue > 50) {
        this.showValidationMessage(field, "error", "Border radius cannot exceed 50px");
        return false;
      }

      if (numValue > 35) {
        this.showValidationMessage(
          field,
          "warning",
          "High border radius values may look unusual on small thumbnails"
        );
      }

      return true;
    } catch (error) {
      console.error("Error validating border radius:", error);
      return false;
    }
  }

  /**
   * Validate border width with warnings and errors
   */
  validateBorderWidth(field, value) {
    try {
      const numValue = parseFloat(value);

      // Clear previous validation messages
      this.clearValidationMessage(field);

      if (isNaN(numValue) || numValue < 0) {
        this.showValidationMessage(field, "error", "Border width cannot be negative");
        return false;
      }

      if (numValue > 10) {
        this.showValidationMessage(field, "error", "Border width cannot exceed 10px");
        return false;
      }

      if (numValue > 5) {
        this.showValidationMessage(
          field,
          "warning",
          "Thick borders may reduce visible thumbnail content"
        );
      }

      return true;
    } catch (error) {
      console.error("Error validating border width:", error);
      return false;
    }
  }

  /**
   * Show validation message for a field
   */
  showValidationMessage(field, type, message, duration = 3000) {
    try {
      // Use the global validation message function if available
      if (typeof window.showValidationMessage === "function") {
        window.showValidationMessage(field, type, message, duration);
        return;
      }

      // Fallback: Create simple validation tooltip
      this.clearValidationMessage(field);

      const messageDiv = document.createElement("div");
      messageDiv.className = `validation-message validation-${type}`;
      messageDiv.textContent = message;
      messageDiv.id = `${field.id}-validation`;

      // Style the message
      messageDiv.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        background: ${type === "error" ? "#ef4444" : "#f59e0b"};
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1000;
        white-space: nowrap;
        margin-top: 2px;
      `;

      // Position relative to input
      field.parentNode.style.position = "relative";
      field.parentNode.appendChild(messageDiv);

      // Auto-remove after duration
      setTimeout(() => {
        this.clearValidationMessage(field);
      }, duration);

      console.log(`👁️ Validation message shown: ${type} - ${message}`);
    } catch (error) {
      console.error("Error showing validation message:", error);
    }
  }

  /**
   * Clear validation message for a field
   */
  clearValidationMessage(field) {
    try {
      // Use the global clear function if available
      if (typeof window.clearValidationMessage === "function") {
        window.clearValidationMessage(field.id);
        return;
      }

      // Fallback: Remove our custom message
      const existingMessage = document.getElementById(`${field.id}-validation`);
      if (existingMessage) {
        existingMessage.remove();
      }
    } catch (error) {
      console.error("Error clearing validation message:", error);
    }
  }

  /**
   * Validate entire form for Display tab
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

      console.log(`👁️ Display tab validation: ${isValid ? "PASSED" : "FAILED"}`);
      return isValid;
    } catch (error) {
      console.error("🚨 Security: Error validating Display tab form:", error);
      return false;
    }
  }

  /**
   * Apply live preview for Display tab changes
   */
  applyDisplayLivePreview(fieldName, value) {
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
              section: "display",
            },
            "*"
          );
        } catch (postError) {
          console.warn("🚨 Security: Error posting message to parent:", postError);
        }
      }

      console.log(`👁️ Display live preview: ${fieldName} = ${value}`);
    } catch (error) {
      console.warn("🚨 Security: Display tab live preview failed:", error);
    }
  }

  /**
   * Get Display tab configuration summary aligned with search engine structure
   */
  getConfigSummary() {
    try {
      return {
        tab: "Display",
        sections: {
          display: {
            showGroupHeaders: this.core.config.display?.showGroupHeaders || true,
            showGroupCount: this.core.config.display?.showGroupCount || true,
            showIconsInResults: this.core.config.display?.showIconsInResults || true,
            showTagsInResults: this.core.config.display?.showTagsInResults || true,
            showSubtitlesInResults: this.core.config.display?.showSubtitlesInResults || true,
            showParentInfo: this.core.config.display?.showParentInfo || true,
          },
          thumbnailSettings: {
            enableThumbnails: this.core.config.thumbnailSettings?.enableThumbnails || false,
            thumbnailSize: this.core.config.thumbnailSettings?.thumbnailSize || "48px",
            borderRadius: this.core.config.thumbnailSettings?.borderRadius || 4,
            borderWidth: this.core.config.thumbnailSettings?.borderWidth || 4,
            borderColor: this.core.config.thumbnailSettings?.borderColor || "#9CBBFF",
            defaultImagePath:
              this.core.config.thumbnailSettings?.defaultImagePath ||
              "assets/default-thumbnail.jpg",
            defaultImages: this.core.config.thumbnailSettings?.defaultImages || {},
          },
          iconSettings: {
            enableCustomIcons:
              this.core.config.thumbnailSettings?.iconSettings?.enableCustomIcons || false,
            enableFontAwesome:
              this.core.config.thumbnailSettings?.iconSettings?.enableFontAwesome || false,
            fontAwesomeUrl: this.core.config.thumbnailSettings?.iconSettings?.fontAwesomeUrl || "",
            iconSize: this.core.config.thumbnailSettings?.iconSettings?.iconSize || "24px",
            iconColor: this.core.config.thumbnailSettings?.iconSettings?.iconColor || "#3b82f6",
            iconOpacity: this.core.config.thumbnailSettings?.iconSettings?.iconOpacity || 1.0,
            iconAlignment:
              this.core.config.thumbnailSettings?.iconSettings?.iconAlignment || "left",
          },
        },
      };
    } catch (error) {
      console.error("🚨 Security: Error getting Display tab config summary:", error);
      return null;
    }
  }

  /**
   * Sync Icon Color with Result Icon Color in Appearance tab
   */
  syncIconColors(color) {
    try {
      // Update the Result Icon Color in Appearance tab
      const resultIconColorInput = document.querySelector("#resultIconColor");
      const resultIconColorHex = document.querySelector("#resultIconColor + .color-hex-input");

      if (resultIconColorInput) {
        resultIconColorInput.value = color;
        this.core.setNestedValue(this.core.config, "appearance.colors.resultIconColor", color);
      }

      if (resultIconColorHex) {
        resultIconColorHex.value = color.toUpperCase();
      }

      console.log(`🎨 Synced Icon Color with Result Icon Color: ${color}`);
    } catch (error) {
      console.error("Error syncing icon colors:", error);
    }
  }

  /**
   * Cleanup resources when tab is unloaded
   */
  cleanup() {
    try {
      // Hide any open tooltips
      this.hideAllTooltips();

      // Clear any timeouts or intervals specific to Display tab
      console.log("🧹 Display tab handler cleaned up");
    } catch (error) {
      console.error("🚨 Security: Error cleaning up Display tab:", error);
    }
  }

  /**
   * Setup reliable Font Awesome icon loading
   */
  setupFontAwesomeIcons() {
    try {
      // Check if Font Awesome is already loaded
      if (document.querySelector('link[href*="fontawesome"]')) {
        console.log("✅ Font Awesome already loaded");
        return;
      }

      // Create CSS link to load Font Awesome with correct path
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "./fontawesome/css/all.min.css"; // Correct path without js/ prefix
      document.head.appendChild(link);

      console.log("✅ Font Awesome CSS loaded");

      // Optional: Also load the JS file for enhanced functionality
      const script = document.createElement("script");
      script.src = "./fontawesome/js/all.min.js";
      script.async = true;
      document.head.appendChild(script);
    } catch (error) {
      console.error("🚨 Error setting up Font Awesome:", error);
    }
  }

  /**
   * Get comprehensive icon fallbacks for reliability
   */
  getIconFallbacks() {
    // Create fallback mapping for renamed or unavailable icons
    const iconFallbacks = {
      "fa-photo": "fas fa-image",
      "fas fa-photo": "fas fa-image",
      "fa-picture": "fas fa-image",
      "fas fa-picture": "fas fa-image",
      "fa-restaurant": "fas fa-utensils",
      "fas fa-restaurant": "fas fa-utensils",
      "fa-cloud-snow": "fas fa-snowflake",
      "fas fa-cloud-snow": "fas fa-snowflake",
      // Add more mappings as needed
    };

    // Return reliable icon sets
    return {
      solid: [
        "fas fa-home",
        "fas fa-search",
        "fas fa-user",
        "fas fa-cog",
        "fas fa-image",
        "fas fa-video",
        "fas fa-file",
        "fas fa-folder",
        "fas fa-star",
        "fas fa-heart",
        "fas fa-check",
        "fas fa-times",
        "fas fa-plus",
        "fas fa-minus",
        "fas fa-circle",
        "fas fa-square",
        "fas fa-arrow-up",
        "fas fa-arrow-down",
        "fas fa-arrow-left",
        "fas fa-arrow-right",
        "fas fa-envelope",
        "fas fa-phone",
        "fas fa-map-marker",
        "fas fa-calendar",
        "fas fa-clock",
        "fas fa-info-circle",
        "fas fa-question-circle",
        "fas fa-exclamation-circle",
        "fas fa-bell",
        "fas fa-bookmark",
        "fas fa-camera",
        "fas fa-link",
        "fas fa-trash",
        "fas fa-download",
        "fas fa-upload",
        "fas fa-edit",
      ],
      regular: [
        "far fa-circle",
        "far fa-square",
        "far fa-star",
        "far fa-heart",
        "far fa-user",
        "far fa-file",
        "far fa-folder",
        "far fa-calendar",
        "far fa-clock",
        "far fa-bell",
        "far fa-bookmark",
        "far fa-envelope",
      ],
      brands: [
        "fab fa-facebook",
        "fab fa-twitter",
        "fab fa-instagram",
        "fab fa-youtube",
        "fab fa-google",
        "fab fa-github",
        "fab fa-linkedin",
        "fab fa-apple",
      ],
      fallbacks: iconFallbacks,
    };
  }

  /**
   * Update configuration from form values for Display tab
   * @param {HTMLElement} container The display tab container element
   */
  updateConfigFromForm(container) {
    try {
      // Handle standard form inputs first
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
        } else {
          value = input.value;
        }

        // Debug thumbnail visibility toggles specifically
        if (name.includes("displayElements.showFor")) {
          console.log(`🔧 THUMBNAIL VISIBILITY: ${name} = ${value}`);
          console.log(
            `🔧 CONFIG STATE: displayElements.showFor =`,
            this.core.config.displayElements?.showFor
          );
        }

        // Set property safely
        this.core.safeSetNestedProperty(this.core.config, name, value);
      });

      // Handle label customization inputs (may have special IDs starting with numbers)
      const labelFields = {
        panoramaLabel: "Panorama",
        hotspotLabel: "Hotspot",
        polygonLabel: "Polygon",
        videoLabel: "Video",
        webframeLabel: "Webframe",
        imageLabel: "Image",
        textLabel: "Text",
        projectedImageLabel: "ProjectedImage",
        elementLabel: "Element",
        businessLabel: "Business",
        "3dHotspotLabel": "3DHotspot",
        "3dModelLabel": "3DModel",
        "3dModelObjectLabel": "3DModelObject",
        containerLabel: "Container",
      };

      // Update label customization
      Object.keys(labelFields).forEach((fieldId) => {
        const field = fieldId.startsWith("3d")
          ? container.querySelector(`[id="${fieldId}"]`)
          : container.querySelector(`#${fieldId}`);

        if (field && field.value) {
          if (!this.core.config.displayLabels) {
            this.core.config.displayLabels = {};
          }
          this.core.config.displayLabels[labelFields[fieldId]] = field.value;
        }
      });

      // Handle icon configuration updates
      this.updateIconConfigFromForm(container);

      // Handle thumbnail settings updates
      this.updateThumbnailConfigFromForm(container);

      console.log("👁️ Display tab config updated from form");
    } catch (error) {
      console.error("🚨 Security: Error updating config from Display tab form:", error);
    }
  }

  /**
   * Update icon configuration from form values
   */
  updateIconConfigFromForm(container) {
    try {
      // Icon system settings
      const iconSettings = this.core.config.thumbnailSettings?.iconSettings;
      if (!iconSettings) return;

      // Update from icon picker selections (these are stored when icons are selected)
      const elements = [
        "Panorama",
        "Hotspot",
        "Polygon",
        "Video",
        "Webframe",
        "Image",
        "Text",
        "ProjectedImage",
        "Element",
        "Business",
        "3DHotspot",
        "Container",
        "3DModel",
        "3DModelObject",
      ];

      elements.forEach((element) => {
        const currentIcon = this.core.getNestedProperty(
          this.core.config,
          `thumbnailSettings.iconSettings.customIcons.${element}`
        );

        // Icons are updated via selectIcon() method when user makes selections
        // No additional processing needed here as the config is already updated
      });

      console.log("🎨 Icon config updated from form");
    } catch (error) {
      console.error("🚨 Error updating icon config from form:", error);
    }
  }

  /**
   * Update thumbnail configuration from form values
   */
  updateThumbnailConfigFromForm(container) {
    try {
      // Handle element-specific default image paths
      const elementMapping = {
        Panorama: "panoramaDefault",
        Hotspot: "hotspotDefault",
        Polygon: "polygonDefault",
        Video: "videoDefault",
        Webframe: "webframeDefault",
        Image: "imageDefault",
        Text: "textDefault",
        ProjectedImage: "projectedImageDefault",
        Element: "elementDefault",
        Business: "businessDefault",
        "3DHotspot": "3dHotspotDefault",
        Container: "containerDefault",
        "3DModel": "3dModelDefault",
        "3DModelObject": "3dModelObjectDefault",
      };

      console.log(`🔧 FORM DEBUG: updateThumbnailConfigFromForm called`);

      Object.entries(elementMapping).forEach(([element, inputId]) => {
        // Use the correct lowercase HTML IDs
        const defaultInput = document.getElementById(inputId);
        console.log(`🔧 FORM DEBUG: Checking ${element}Default input:`, {
          element: element,
          inputExists: !!defaultInput,
          inputValue: defaultInput?.value,
          inputId: defaultInput?.id,
        });

        if (defaultInput && defaultInput.value) {
          if (!this.core.config.thumbnailSettings) {
            this.core.config.thumbnailSettings = {};
          }
          if (!this.core.config.thumbnailSettings.defaultImages) {
            this.core.config.thumbnailSettings.defaultImages = {};
          }
          // Format the path properly for the search engine
          const imagePath = this.toAssetPath(defaultInput.value);

          this.core.config.thumbnailSettings.defaultImages[element] = imagePath;
          console.log(`🖼️ Processed ${element} path: ${defaultInput.value} -> ${imagePath}`);
        }
      });

      // Debug current thumbnail configuration state
      console.log("🖼️ Thumbnail config updated from form");
      console.log("🔍 DEBUG - Current thumbnail settings:", {
        enableThumbnails: this.core.config.thumbnailSettings?.enableThumbnails,
        defaultImages: this.core.config.thumbnailSettings?.defaultImages,
        showFor: this.core.config.thumbnailSettings?.showFor,
        displayElementsShowFor: this.core.config.displayElements?.showFor,
      });
    } catch (error) {
      console.error("🚨 Error updating thumbnail config from form:", error);
    }
  }

  /**
   * Update general display configuration from form values
   */
  updateDisplayConfigFromForm(container) {
    try {
      // Update thumbnail master toggle
      const enableThumbnailsToggle = document.getElementById("enableThumbnails");
      if (enableThumbnailsToggle) {
        if (!this.core.config.thumbnailSettings) {
          this.core.config.thumbnailSettings = {};
        }
        this.core.config.thumbnailSettings.enableThumbnails = enableThumbnailsToggle.checked;
        console.log(`🔧 DISPLAY CONFIG: enableThumbnails = ${enableThumbnailsToggle.checked}`);
      }

      // Update thumbnail size
      const thumbnailSizeSelect = document.getElementById("thumbnailSizePreset");
      if (thumbnailSizeSelect && thumbnailSizeSelect.value) {
        this.core.config.thumbnailSettings.thumbnailSize = thumbnailSizeSelect.value;
        console.log(`🔧 DISPLAY CONFIG: thumbnailSize = ${thumbnailSizeSelect.value}`);
      }

      // Update border radius
      const borderRadiusInput = document.getElementById("thumbnailBorderRadius");
      if (borderRadiusInput) {
        this.core.config.thumbnailSettings.borderRadius = parseInt(borderRadiusInput.value) || 0;
        console.log(`🔧 DISPLAY CONFIG: borderRadius = ${borderRadiusInput.value}`);
      }

      // Update border width
      const borderWidthInput = document.getElementById("thumbnailBorderWidth");
      if (borderWidthInput) {
        this.core.config.thumbnailSettings.borderWidth = parseInt(borderWidthInput.value) || 0;
        console.log(`🔧 DISPLAY CONFIG: borderWidth = ${borderWidthInput.value}`);
      }

      // Update thumbnail visibility settings (showFor) - moved from displayElements to thumbnailSettings
      if (!this.core.config.thumbnailSettings.showFor) {
        this.core.config.thumbnailSettings.showFor = {};
      }

      // CRITICAL: Copy displayElements.showFor to thumbnailSettings.showFor for search engine compatibility
      console.log(
        `🔧 DEBUG: Checking displayElements.showFor:`,
        this.core.config.displayElements?.showFor
      );

      if (this.core.config.displayElements?.showFor) {
        // Search engine expects specific keys, map from form keys to search engine keys
        const showForMapping = {
          panorama: this.core.config.displayElements.showFor.panorama,
          hotspot: this.core.config.displayElements.showFor.hotspot,
          polygon: this.core.config.displayElements.showFor.polygon,
          video: this.core.config.displayElements.showFor.video,
          webframe: this.core.config.displayElements.showFor.webframe,
          image: this.core.config.displayElements.showFor.image,
          text: this.core.config.displayElements.showFor.text,
          projectedimage: this.core.config.displayElements.showFor.projectedImage,
          element: this.core.config.displayElements.showFor.element,
          business: this.core.config.displayElements.showFor.business,
          container: this.core.config.displayElements.showFor.container,
          "3dmodel": this.core.config.displayElements.showFor["3dmodel"],
          "3dhotspot": this.core.config.displayElements.showFor["3dhotspot"],
          "3dmodelobject": this.core.config.displayElements.showFor["3dmodelobject"],
          other: this.core.config.displayElements.showFor.other,
        };

        this.core.config.thumbnailSettings.showFor = showForMapping;
        console.log(
          `🔧 DISPLAY CONFIG: Copied thumbnail visibility settings:`,
          this.core.config.thumbnailSettings.showFor
        );
      } else {
        // Initialize with default values if no displayElements.showFor exists
        this.core.config.thumbnailSettings.showFor = {
          panorama: true,
          hotspot: true,
          polygon: true,
          video: true,
          webframe: true,
          image: true,
          text: true,
          projectedimage: true,
          element: true,
          business: true,
          container: true,
          "3dmodel": true,
          "3dhotspot": true,
          "3dmodelobject": true,
          other: true,
        };
        console.log(`🔧 DISPLAY CONFIG: Initialized default thumbnail visibility settings`);
      }

      console.log("🔧 DISPLAY CONFIG: General display settings updated");
      console.log("🔍 DEBUG - Final thumbnail settings after display config update:", {
        thumbnailSettings: this.core.config.thumbnailSettings,
        displayElements: this.core.config.displayElements,
      });
    } catch (error) {
      console.error("🚨 Error updating display config from form:", error);
    }
  }

  /**
   * Setup border validation for border radius and width fields
   */
  setupBorderValidation(container) {
    try {
      // Find border radius and width fields
      const borderRadiusField = container.querySelector("#thumbnailBorderRadius");
      const borderWidthField = container.querySelector("#thumbnailBorderWidth");

      if (borderRadiusField) {
        // Add input event listener for real-time validation
        borderRadiusField.addEventListener("input", (e) => {
          this.validateBorderRadius(e.target, e.target.value);
        });

        // Add change event listener for final validation
        borderRadiusField.addEventListener("change", (e) => {
          this.validateBorderRadius(e.target, e.target.value);
        });
      }

      if (borderWidthField) {
        // Add input event listener for real-time validation
        borderWidthField.addEventListener("input", (e) => {
          this.validateBorderWidth(e.target, e.target.value);
        });

        // Add change event listener for final validation
        borderWidthField.addEventListener("change", (e) => {
          this.validateBorderWidth(e.target, e.target.value);
        });
      }

      console.log("👁️ Border validation setup complete");
    } catch (error) {
      console.error("Error setting up border validation:", error);
    }
  }

  /**
   * Handle thumbnail size preset change
   */
  handleThumbnailSizeChange(select) {
    try {
      const value = select.value;

      // Update configuration with new pixel-based size
      this.core.setNestedValue(this.core.config, "thumbnailSettings.thumbnailSize", value);

      // Trigger form change to apply settings
      this.core.onFormChange(select);

      console.log(`🖼️ Thumbnail size changed to: ${value}`);
    } catch (error) {
      console.error("Error handling thumbnail size change:", error);
    }
  }
}

// Export for module use
if (typeof module !== "undefined" && module.exports) {
  module.exports = DisplayTabHandler;
} else {
  window.DisplayTabHandler = DisplayTabHandler;
}
