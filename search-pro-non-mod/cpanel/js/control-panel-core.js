/**
 * Search Pro Control Panel - Core Module
 * Shared functionality and base class for all tab handlers
 *
 * SECURITY FEATURES:
 * - Prototype pollution prevention
 * - XSS prevention through input sanitization
 * - Safe localStorage operations
 * - Configuration validation
 * - File upload security
 */

class ControlPanelCore {
  constructor() {
    this.config = this.getDefaultConfig();
    this.currentTab = "general";
    this.isLoading = false;
    this.toastTimeout = null;
    this.previewTimeout = null;
    this.maxConfigSize = 1024 * 1024; // 1MB limit
    this.maxStringLength = 10000; // Max length for string values

    // Tab handlers will be registered here
    this.tabHandlers = new Map();
  }

  /**
   * Register a tab handler
   */
  registerTabHandler(tabId, handler) {
    this.tabHandlers.set(tabId, handler);
    handler.setCore(this);
  }

  /**
   * Get tab handler
   */
  getTabHandler(tabId) {
    return this.tabHandlers.get(tabId);
  }

  /**
   * Sanitize input to prevent XSS and injection attacks
   */
  sanitizeInput(input, maxLength = null) {
    if (typeof input !== "string") {
      return String(input || "");
    }

    const temp = document.createElement("div");
    temp.textContent = input;
    const sanitized = temp.innerHTML;

    const finalMaxLength = maxLength || this.maxStringLength;
    if (sanitized.length > finalMaxLength) {
      console.warn("🚨 Security: Input truncated due to length limit");
      return sanitized.substring(0, finalMaxLength);
    }

    return sanitized;
  }

  /**
   * Validate content for dangerous patterns
   */
  isContentSafe(content) {
    if (typeof content !== "string") return true;

    const dangerousPatterns = [
      /<script[\s\S]*?>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[\s\S]*?>/i,
      /<object[\s\S]*?>/i,
      /<embed[\s\S]*?>/i,
      /<form[\s\S]*?>/i,
      /eval\s*\(/i,
      /Function\s*\(/i,
    ];

    return !dangerousPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Safe object merge that prevents prototype pollution
   */
  safeObjectMerge(target, source, maxDepth = 10, currentDepth = 0) {
    if (currentDepth > maxDepth) {
      console.warn("🚨 Security: Object merge depth limit reached");
      return target;
    }

    if (!source || typeof source !== "object" || Array.isArray(source)) {
      return target;
    }

    const safeTarget = { ...target };

    for (const key in source) {
      if (
        key === "__proto__" ||
        key === "constructor" ||
        key === "prototype" ||
        key.startsWith("__")
      ) {
        console.warn(`🚨 Security: Blocked dangerous property '${key}'`);
        continue;
      }

      if (!this.isPropertyNameSafe(key)) {
        console.warn(`🚨 Security: Blocked unsafe property name '${key}'`);
        continue;
      }

      const sourceValue = source[key];

      if (
        sourceValue &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue)
      ) {
        safeTarget[key] = this.safeObjectMerge(
          safeTarget[key] || {},
          sourceValue,
          maxDepth,
          currentDepth + 1,
        );
      } else {
        if (typeof sourceValue === "string") {
          safeTarget[key] = this.sanitizeInput(sourceValue);
        } else {
          safeTarget[key] = sourceValue;
        }
      }
    }

    return safeTarget;
  }

  /**
   * Validate property names for safety
   */
  isPropertyNameSafe(propName) {
    if (typeof propName !== "string") return false;

    const dangerousNames = [
      "__proto__",
      "constructor",
      "prototype",
      "__defineGetter__",
      "__defineSetter__",
      "__lookupGetter__",
      "__lookupSetter__",
      "valueOf",
      "toString",
    ];

    return (
      !dangerousNames.includes(propName) &&
      !propName.startsWith("__") &&
      propName.length < 100
    );
  }

  /**
   * Safe property setter that prevents prototype pollution
   */
  safeSetNestedProperty(obj, path, value) {
    if (!obj || typeof obj !== "object" || typeof path !== "string") {
      return false;
    }

    const keys = path.split(".");
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];

      if (!this.isPropertyNameSafe(key)) {
        console.warn(`🚨 Security: Blocked unsafe property in path: ${key}`);
        return false;
      }

      if (!(key in current) || typeof current[key] !== "object") {
        current[key] = {};
      }
      current = current[key];
    }

    const finalKey = keys[keys.length - 1];
    if (!this.isPropertyNameSafe(finalKey)) {
      console.warn(`🚨 Security: Blocked unsafe final property: ${finalKey}`);
      return false;
    }

    if (typeof value === "string") {
      current[finalKey] = this.sanitizeInput(value);
    } else {
      current[finalKey] = value;
    }

    return true;
  }

  /**
   * Secure localStorage operations
   */
  safeLocalStorageSet(key, value) {
    try {
      const safeKey = this.sanitizeInput(key, 100);
      let safeValue;

      if (typeof value === "string") {
        safeValue = this.sanitizeInput(value);
      } else if (typeof value === "object") {
        const stringified = JSON.stringify(value);
        if (stringified.length > this.maxConfigSize) {
          console.warn("🚨 Security: Configuration too large for storage");
          return false;
        }
        safeValue = stringified;
      } else {
        safeValue = String(value);
      }

      localStorage.setItem(safeKey, safeValue);
      return true;
    } catch (error) {
      console.error("🚨 Security: Error setting localStorage:", error);
      return false;
    }
  }

  /**
   * Secure localStorage retrieval
   */
  safeLocalStorageGet(key, defaultValue = null) {
    try {
      const safeKey = this.sanitizeInput(key, 100);
      const value = localStorage.getItem(safeKey);

      if (value === null) {
        return defaultValue;
      }

      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === "object" && parsed !== null) {
          return this.validateAndSanitizeConfig(parsed) ? parsed : defaultValue;
        }
        return parsed;
      } catch {
        return this.sanitizeInput(value);
      }
    } catch (error) {
      console.error("🚨 Security: Error getting localStorage:", error);
      return defaultValue;
    }
  }

  /**
   * Get nested property value safely
   */
  getNestedProperty(obj, path) {
    try {
      if (!obj || typeof path !== "string") {
        return undefined;
      }

      return path.split(".").reduce((current, key) => {
        if (!this.isPropertyNameSafe(key)) {
          console.warn(`🚨 Security: Unsafe property access: ${key}`);
          return undefined;
        }
        return current && current[key] !== undefined ? current[key] : undefined;
      }, obj);
    } catch (error) {
      console.error("🚨 Security: Error getting nested property:", error);
      return undefined;
    }
  }

  /**
   * Show toast notification
   */
  showToast(type, title, message, duration = 5000) {
    try {
      const safeType = this.sanitizeInput(type, 20);
      const safeTitle = this.sanitizeInput(title);
      const safeMessage = this.sanitizeInput(message);

      if (
        window.toastManager &&
        typeof window.toastManager.showToast === "function"
      ) {
        window.toastManager.showToast(
          safeType,
          safeTitle,
          safeMessage,
          duration,
        );
        return;
      }

      if (window.showToast && typeof window.showToast === "function") {
        window.showToast(safeType, safeTitle, safeMessage, duration);
        return;
      }

      console.log(
        `🍞 Toast: ${safeType.toUpperCase()} - ${safeTitle}: ${safeMessage}`,
      );
    } catch (error) {
      console.error("🚨 Security: Error showing toast:", error);
    }
  }

  /**
   * Set loading state
   */
  setLoading(isLoading, message = "Loading...") {
    try {
      const buttons = document.querySelectorAll(
        ".btn:not(.modal-btn-confirm):not(.modal-btn-cancel), .fab-action",
      );

      buttons.forEach((button) => {
        button.disabled = isLoading;
        button.style.opacity = isLoading ? "0.6" : "1";
      });

      this.isLoading = isLoading;

      if (isLoading) {
        console.log(`⏳ Loading: ${message}`);
      } else {
        console.log("✅ Loading complete");
      }
    } catch (error) {
      console.error("🚨 Security: Error setting loading state:", error);
    }
  }

  /**
   * Validate and sanitize entire configuration object
   */
  validateAndSanitizeConfig(config) {
    try {
      if (!config || typeof config !== "object") {
        return false;
      }

      const sanitizeConfigRecursive = (
        obj,
        maxDepth = 10,
        currentDepth = 0,
      ) => {
        if (currentDepth > maxDepth || !obj || typeof obj !== "object") {
          return false;
        }

        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (!this.isPropertyNameSafe(key)) {
              console.warn(
                `🚨 Security: Unsafe property name in config: ${key}`,
              );
              return false;
            }

            const value = obj[key];

            if (typeof value === "string") {
              if (!this.isContentSafe(value)) {
                console.warn(
                  `🚨 Security: Unsafe content in config property ${key}`,
                );
                return false;
              }
              obj[key] = this.sanitizeInput(value);
            } else if (
              value &&
              typeof value === "object" &&
              !Array.isArray(value)
            ) {
              if (!sanitizeConfigRecursive(value, maxDepth, currentDepth + 1)) {
                return false;
              }
            }
          }
        }
        return true;
      };

      return sanitizeConfigRecursive(config);
    } catch (error) {
      console.error(
        "🚨 Security: Error validating and sanitizing config:",
        error,
      );
      return false;
    }
  }

  /**
   * Handle form field changes with security validation
   */
  onFormChange(input) {
    try {
      const name = this.sanitizeInput(input.name || input.id, 100);
      let value = input.type === "checkbox" ? input.checked : input.value;

      if (typeof value === "string") {
        value = this.sanitizeInput(value);

        if (!this.isContentSafe(value)) {
          console.warn("🚨 Security: Unsafe content detected in form input");
          return;
        }
      }

      // Handle null values for optional position fields
      if (["positionLeft", "positionBottom"].includes(name) && value === "") {
        value = null;
      }

      // Convert numeric strings to numbers for number inputs
      if (input.type === "number" && value !== "" && value !== null) {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          console.warn("🚨 Security: Invalid numeric value detected");
          return;
        }
        value = numValue;
      }

      // Convert range input values to numbers
      if (input.type === "range" && value !== "") {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          console.warn("🚨 Security: Invalid range value detected");
          return;
        }
        value = numValue;
      }

      const success = this.safeSetNestedProperty(this.config, name, value);
      if (!success) {
        console.warn(`🚨 Security: Failed to set property ${name} safely`);
        return;
      }

      // Validate the field
      this.validateField(input);

      // Debounced live preview
      clearTimeout(this.previewTimeout);
      this.previewTimeout = setTimeout(() => {
        this.showLivePreview(name, value);
      }, 300);

      console.log(`🔧 Config updated safely: ${name} = ${value}`);
    } catch (error) {
      console.error("🚨 Security: Error handling form change:", error);
    }
  }

  /**
   * Handle form input events (for real-time validation)
   */
  onFormInput(input) {
    try {
      this.validateField(input);
    } catch (error) {
      console.error("🚨 Security: Error handling form input:", error);
    }
  }

  /**
   * Basic field validation (can be overridden by tab handlers)
   */
  validateField(field) {
    try {
      const value = field.type === "checkbox" ? field.checked : field.value;
      const fieldName = this.sanitizeInput(field.name || field.id, 100);
      let isValid = true;

      // Remove existing validation classes
      field.classList.remove("error", "valid");

      // Security validation for string values
      if (typeof value === "string" && !this.isContentSafe(value)) {
        isValid = false;
        console.warn(`🚨 Security: Unsafe content in field ${fieldName}`);
      }

      // Basic validation by type
      if (field.type === "number") {
        const min = parseFloat(field.min);
        const max = parseFloat(field.max);
        const numValue = parseFloat(value);

        if (value !== "" && isNaN(numValue)) {
          isValid = false;
        } else if (!isNaN(min) && numValue < min) {
          isValid = false;
        } else if (!isNaN(max) && numValue > max) {
          isValid = false;
        }
      }

      // Color validation
      if (field.type === "color") {
        const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (value && !hexPattern.test(value)) {
          isValid = false;
        }
      }

      // Range validation
      if (field.type === "range") {
        const min = parseFloat(field.min);
        const max = parseFloat(field.max);
        const numValue = parseFloat(value);

        if (isNaN(numValue)) {
          isValid = false;
        } else if (numValue < min || numValue > max) {
          isValid = false;
        }
      }

      // Apply validation styling
      if (!isValid) {
        field.classList.add("error");
      } else {
        field.classList.add("valid");
      }

      return isValid;
    } catch (error) {
      console.error("🚨 Security: Error in field validation:", error);
      return false;
    }
  }

  /**
   * Show live preview indicator
   */
  showLivePreview(fieldName, value) {
    try {
      const safeFieldName = this.sanitizeInput(fieldName, 100);
      const field =
        document.getElementById(safeFieldName) ||
        document.querySelector(`[name="${safeFieldName}"]`);
      if (!field) return;

      const formGroup = field.closest(".form-group");
      if (!formGroup) return;

      formGroup.classList.add("has-preview");

      if (!formGroup.querySelector(".live-preview-indicator")) {
        const indicator = document.createElement("div");
        indicator.className = "live-preview-indicator";
        indicator.setAttribute("aria-label", "Live preview active");
        formGroup.style.position = "relative";
        formGroup.appendChild(indicator);
      }

      setTimeout(() => {
        formGroup.classList.remove("has-preview");
      }, 3000);

      this.applyLivePreview(safeFieldName, value);

      console.log(`📱 Live preview: ${safeFieldName} = ${value}`);
    } catch (error) {
      console.error("🚨 Security: Error showing live preview:", error);
    }
  }

  /**
   * Apply live preview (to be overridden by tab handlers)
   */
  applyLivePreview(fieldName, value) {
    // Default implementation - tab handlers can override
    try {
      const previewConfig = JSON.parse(JSON.stringify(this.config));
      this.safeSetNestedProperty(previewConfig, fieldName, value);

      this.safeLocalStorageSet("searchProLiveConfig", previewConfig);

      if (window.parent && window.parent !== window) {
        try {
          window.parent.postMessage(
            {
              type: "searchProConfigPreview",
              config: previewConfig,
              field: this.sanitizeInput(fieldName),
              value:
                typeof value === "string" ? this.sanitizeInput(value) : value,
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
    } catch (error) {
      console.warn("🚨 Security: Live preview failed:", error);
    }
  }

  /**
   * Setup form field listeners for live validation and preview
   */
  setupFormListeners(container = document) {
    try {
      const formInputs = container.querySelectorAll(
        ".form-input, .toggle-input, .color-input, .range-input, .form-select",
      );
      formInputs.forEach((input) => {
        input.addEventListener("change", () => this.onFormChange(input));
        input.addEventListener("input", () => this.onFormInput(input));
      });

      console.log(`✅ Form listeners set up for ${formInputs.length} inputs`);
    } catch (error) {
      console.error("🚨 Security: Error setting up form listeners:", error);
    }
  }

  /**
   * Populate form with current config values
   */
  populateForm(container = document) {
    try {
      const fields = container.querySelectorAll("[name]");

      fields.forEach((field) => {
        const fieldName = field.getAttribute("name");
        if (!fieldName) return;

        const value = this.getNestedProperty(this.config, fieldName);
        if (value === undefined) return;

        if (field.type === "checkbox") {
          field.checked = Boolean(value);
        } else if (field.type === "number") {
          field.value = value === null ? "" : String(value);
        } else if (field.type === "range") {
          field.value = value === null ? "" : String(value);
          const valueDisplay = field.parentNode.querySelector(".range-value");
          if (valueDisplay) {
            valueDisplay.textContent = String(value);
          }
        } else if (field.type === "color") {
          field.value = value || "#000000";
          const hexDisplay = field.parentNode.querySelector(".color-hex");
          if (hexDisplay) {
            hexDisplay.textContent = field.value.toLowerCase();
          }
        } else {
          if (fieldName === "searchBar.width" && typeof value === "number") {
            field.value = value + "px";
          } else {
            field.value = value === null ? "" : String(value);
          }
        }
      });

      console.log("📝 Form populated with current config securely");
    } catch (error) {
      console.error("🚨 Security: Error populating form:", error);
    }
  }

  /**
   * Get default configuration structure
   */
  getDefaultConfig() {
    return {

      // ==========================================
      // GENERAL TAB - General Settings
      // ==========================================

      // [10.1] Auto-Hide Settings
      autoHide: {
        mobile: false,
        desktop: false,
      },
      mobileBreakpoint: 768,
      minSearchChars: 2,
      minSearchLength: 2,
      showTagsInResults: true,
      elementTriggering: {
        initialDelay: 300,
        maxRetries: 3,
        retryInterval: 300,
        maxRetryInterval: 1000,
        baseRetryInterval: 300,
      },

      // Search plugin specific settings
    maxResults: 20,
    debugMode: false,
    showHotspots: true,
    showMedia: true,
    showPanoramas: true,
    searchInHotspotTitles: true,
    searchInMediaTitles: true,
    searchInPanoramaTitles: true,
    searchInHotspotDescriptions: false,
    searchInMediaDescriptions: false,

    
      // [10.2] Search Bar Positioning and Layout
      searchBar: {
        placeholder: "Search... Type * for all",
        width: 350,
        position: {
          top: 70,
          right: 70,
          left: null,
          bottom: null,
        },
        useResponsive: true,
        mobilePosition: {
          top: 60,
          left: 20,
          right: 20,
          bottom: "auto",
        },
        mobileOverrides: {
          enabled: true,
          breakpoint: 768,
          width: "90%",
          maxWidth: 350,
          visibility: {
            behavior: "dynamic",
            showOnScroll: true,
            hideThreshold: 100,
          },
        },
      },

      
    // ==========================================
    // APPEARANCE TAB - Visual Style Settings
    // ==========================================
      appearance: {
        searchField: {
          borderRadius: {
            topLeft: 35,
            topRight: 35,
            bottomRight: 35,
            bottomLeft: 35,
          },
          typography: {
            fontSize: "16px",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
            fontWeight: "400",
            fontStyle: "normal",
            lineHeight: "1.5",
            letterSpacing: "0px",
            textTransform: "none",
            placeholder: {
              fontSize: "16px",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
              fontWeight: "400",
              fontStyle: "italic",
              opacity: 0.7,
              letterSpacing: "0px",
              textTransform: "none",
            },
            focus: {
              fontSize: "16px",
              fontWeight: "500",
              letterSpacing: "0.25px",
            },
          },
        },
        searchResults: {
          borderRadius: {
            topLeft: 5,
            topRight: 5,
            bottomRight: 5,
            bottomLeft: 5,
          },
        },
        colors: {
          searchBackground: "#f4f3f2",
          searchText: "#1a1a1a",
          placeholderText: "#94a3b8",
          searchIcon: "#94a3b8",
          clearIcon: "#94a3b8",
          resultsBackground: "#ffffff",
          groupHeaderColor: "#20293A",
          groupCountColor: "#94a3b8",
          resultHover: "#f0f0f0",
          resultBorderLeft: "#ebebeb",
          resultText: "#1e293b",
          resultSubtitle: "#64748b",
          resultIconColor: "#6e85f7",
          resultSubtextColor: "#000000",
          tagBackground: "#e0f2fe",
          tagText: "#0369a1",
          tagBorder: "#0891b2",
          highlightBackground: "#ffff00",
          highlightBackgroundOpacity: 0.5,
          highlightText: "#000000",
          highlightWeight: "bold",
        },
        tags: {
          borderRadius: 16,
          fontSize: "11px",
          padding: "3px 10px",
          margin: "2px",
          fontWeight: "600",
          textTransform: "uppercase",
          showBorder: true,
          borderWidth: "1px",
        },
      },

      // ==========================================
      // DISPLAY TAB - Control How Elements Appear
      // ==========================================
      // Display Settings
      display: {
        showGroupHeaders: true,
        showGroupCount: true,
        showIconsInResults: true,
        onlySubtitles: false,
        showSubtitlesInResults: true,
        showParentLabel: true,
        showParentInfo: true,
        showParentTags: true,
        showParentType: true,
      },

      // Thumbnail Settings
      thumbnailSettings: {
        enableThumbnails: false,
        thumbnailSize: "medium",
        thumbnailSizePx: 120,
        borderRadius: 4,
        borderWidth: 4,
        borderColor: "#9CBBFF",
        defaultImagePath: "./search-pro-non-mod/assets/default-thumbnail.jpg",
        defaultImages: {
          Panorama: "./search-pro-non-mod/assets/default-thumbnail.jpg",
          Hotspot: "./search-pro-non-mod/assets/hotspot-default.jpg",
          Polygon: "./search-pro-non-mod/assets/polygon-default.jpg",
          Video: "./search-pro-non-mod/assets/video-default.jpg",
          Webframe: "./search-pro-non-mod/assets/webframe-default.jpg",
          Image: "./search-pro-non-mod/assets/image-default.jpg",
          Text: "./search-pro-non-mod/assets/text-default.jpg",
          ProjectedImage:
            "./search-pro-non-mod/assets/projected-image-default.jpg",
          Element: "./search-pro-non-mod/assets/element-default.jpg",
          Business: "./search-pro-non-mod/assets/business-default.jpg",
          "3DModel": "./search-pro-non-mod/assets/3d-model-default.jpg",
          "3DHotspot": "./search-pro-non-mod/assets/3d-hotspot-default.jpg",
          "3DModelObject":
            "./search-pro-non-mod/assets/3d-model-object-default.jpg",
          default: "./search-pro-non-mod/assets/default-thumbnail.jpg",
        },

        // ICON SETTINGS CONFIGURATION
        iconSettings: {
          enableCustomIcons: false,
          enableFontAwesome: false,
          fontAwesomeUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
          iconSize: "medium",
          iconSizePx: 20,
          iconColor: "#3b82f6",
          iconOpacity: 0.9,
          iconAlignment: "left",
          iconMargin: 12,
          iconBorderRadius: 6,
          enableIconHover: true,
          iconHoverScale: 1.15,
          iconHoverOpacity: 1.0,
          customIcons: {
            Panorama: "fas fa-home",
            Hotspot: "fas fa-laptop",
            Polygon: "fas fa-diamond",
            Video: "fas fa-video",
            Webframe: "fas fa-laptop",
            Image: "fas fa-image",
            Text: "fas fa-file-alt",
            ProjectedImage: "fas fa-desktop",
            Element: "fas fa-circle",
            Business: "fas fa-building",
            "3DHotspot": "fas fa-gamepad",
            Container: "fas fa-window-restore",
            "3DModel": "fas fa-cube",
            "3DModelObject": "fas fa-wrench",
            default: "fas fa-circle",
          },
          showIconFor: {
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
            "3dmodel": true,
            "3dhotspot": true,
            "3dmodelobject": true,
            container: true,
            other: true,
          },
          fallbackSettings: {
            useDefaultOnError: true,
            hideIconOnError: false,
            showTypeLabel: false,
          },
        },
      },

      // Label Customization
      displayLabels: {
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
      },

      // Label Fallback Options
      useAsLabel: {
        subtitles: true,
        tags: true,
        elementType: false,
        parentWithType: false,
        customText: "[Unnamed Item]",
      },

      // ==========================================
      // CONTENT TAB - Control What Appears in Search
      // ==========================================

    includeContent: {
      containerSearch: {
        enableContainerSearch: true,
        containerNames: [],
      },
      elements: {
        includePanoramas: true,
        includeHotspots: true,
        includePolygons: true,
        includeVideos: true,
        includeWebframes: true,
        includeImages: true,
        includeText: true,
        includeProjectedImages: true,
        includeElements: true,
        includeBusiness: true,
        include3DModels: true,
        include3DHotspots: true,
        include3DModelObjects: true,
        includeContainers: true
      },
      searchableProperties: {
        title: true,
        description: true,
        subtitle: true,
        tags: true,
        customProperties: []
      }
    },

      // ==========================================
      //  FILTERING TAB - Filter Which Content Appears
      // ==========================================
   
    filter: {
      mode: "none",
      allowedValues: [""],
      blacklistedValues: [""],
      allowedMediaIndexes: [""],
      blacklistedMediaIndexes: [""],
      elementTypes: {
        mode: "none",
        allowedTypes: [""],
        blacklistedTypes: [""],
      },
      elementLabels: {
        mode: "none",
        allowedValues: [""],
        blacklistedValues: [""],
      },
      tagFiltering: {
        mode: "none",
        allowedTags: [""],
        blacklistedTags: [""],
      },
      uniqueNames: {
        mode: "none",
        allowedNames: [""],
        blacklistedNames: [""],
      },
    },
    // ==========================================
// DATA SOURCES TAB - External Data Integration
// ==========================================
// [10.14] Business Data Integration
businessData: {
  useBusinessData: false,
  replaceTourData: false,
  includeStandaloneEntries: false,
  businessDataFile: "business.json",
  businessDataDir: "business-data",
  matchField: "id",
  businessDataUrl: `${window.location.origin}${window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/"))}/search-pro-non-mod/business-data/business.json`,
},

// [10.15] Google Sheets Integration
googleSheets: {
  useGoogleSheetData: false,
  includeStandaloneEntries: false,
  useAsDataSource: false,
  fetchMode: "csv",
  googleSheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQrQ9oy4JjwYAdTG1DKne9cu76PZCrZgtIOCX56sxVoBwRzys36mTqvFMvTE2TB-f-k5yZz_uWwW5Ou/pub?output=csv",
  useLocalCSV: false,
  localCSVFile: "search-data.csv",
  localCSVDir: "business-data",
  localCSVUrl: `${window.location.origin}${window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/"))}/search-pro-non-mod/business-data/search-data.csv`,
  csvOptions: {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  },
  caching: {
    enabled: false,
    timeoutMinutes: 60,
    storageKey: "tourGoogleSheetsData",
  },

        // ==========================================
        // ADVANCED TAB - Animation and Search Behavior
        // ==========================================
        
        // [10.16] Animation Settings
        animations: {
          enabled: false, // Enable animations globally
          duration: {
            fast: 150, // Fast animations (150ms)
            normal: 250, // Normal animations (250ms)
            slow: 400, // Slow animations (400ms)
          },
          easing: "ease-out", // Simple, natural easing
          searchBar: {
            openDuration: 300, // Quick, responsive opening
            closeDuration: 200, // Even quicker closing
            scaleEffect: true, // Subtle scale effect
          },
          results: {
            fadeInDuration: 200, // Quick, clean fade-in
            slideDistance: 8, // Subtle slide movement
            staggerDelay: 30, // Quick succession between items
          },
          reducedMotion: {
            respectPreference: true, // Respect user's reduced motion preference
            fallbackDuration: 80, // Fast fallback for accessibility
          },
        },

        // [10.13] Search Ranking & Behavior Settings
        searchSettings: {
          // Field weights (0.0 to 1.0) - Higher = More Important
          fieldWeights: {
            label: 1.0, // Main item name (highest priority)
            businessName: 0.9, // Business data name
            subtitle: 0.8, // Item descriptions
            businessTag: 1.0, // Business tags
            tags: 0.6, // Regular tags
            parentLabel: 0.3, // Parent item name (lowest priority)
          },

          // Search behavior
          behavior: {
            threshold: 0.4, // 0.0 = exact match only, 1.0 = fuzzy match everything
            distance: 40, // How many characters away a match can be
            minMatchCharLength: 1, // Minimum characters needed to trigger search
            useExtendedSearch: true, // Enable 'word syntax for exact matches
            ignoreLocation: true, // Don't prioritize matches at start of text
            includeScore: true, // Include relevance scores in results
          },

          // Boost values for different content types
          boostValues: {
            businessMatch: 2.0, // Items enhanced with business data
            sheetsMatch: 2.5, // Items enhanced with Google Sheets data
            labeledItem: 1.5, // Items with proper labels
            unlabeledItem: 1.0, // Items without labels
            childElement: 0.8, // Child elements like hotspots
          },
        },
},

      // ...other config sections...
    };
  }

  /**
   * Clear all validation messages
   */
  clearAllValidationMessages() {
    try {
      document.querySelectorAll(".validation-message").forEach((msg) => {
        if (msg.parentNode) {
          msg.parentNode.removeChild(msg);
        }
      });

      document
        .querySelectorAll(
          ".form-input, .toggle-input, .color-input, .range-input, .form-select",
        )
        .forEach((field) => {
          field.classList.remove("error", "valid", "warning");
        });

      console.log("🧹 All validation messages cleared");
    } catch (error) {
      console.error("🚨 Security: Error clearing validation messages:", error);
    }
  }
}

// Export for module use
if (typeof module !== "undefined" && module.exports) {
  module.exports = ControlPanelCore;
} else {
  window.ControlPanelCore = ControlPanelCore;
}
