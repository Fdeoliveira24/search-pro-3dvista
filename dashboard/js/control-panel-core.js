/**
 * Search Pro Control Panel - Core Module
 * Version 3.1 - Last Update on 10/31/2025 - Search Pro Configuration Loading - Technical Reference - Race Condition Fix
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
   * Validate property name to prevent prototype pollution
   * @param {string} propertyName - Property name to validate
   * @returns {boolean} True if property name is safe
   */
  isValidPropertyName(propertyName) {
    if (typeof propertyName !== "string") return false;

    // Block dangerous property names
    const dangerousProps = [
      "__proto__",
      "constructor",
      "prototype",
      "valueOf",
      "toString",
      "hasOwnProperty",
      "isPrototypeOf",
      "propertyIsEnumerable",
    ];

    // Check if the property path contains dangerous elements
    const parts = propertyName.split(".");
    for (const part of parts) {
      if (dangerousProps.includes(part)) {
        console.warn(`🚨 Security: Blocked dangerous property: ${part}`);
        return false;
      }
      // Block properties starting with __
      if (part.startsWith("__")) {
        console.warn(`🚨 Security: Blocked dunder property: ${part}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Validate configuration structure integrity
   * @param {Object} config - Configuration object to validate
   * @returns {boolean} True if config structure is valid
   */
  validateConfigStructure(config) {
    try {
      if (!config || typeof config !== "object") {
        console.error("🚨 Security: Config is not a valid object");
        return false;
      }

      // Check for required top-level properties
      const requiredProperties = ["searchBar", "appearance", "content"];
      for (const prop of requiredProperties) {
        if (!(prop in config)) {
          console.warn(`⚠️ Missing required config property: ${prop}`);
          // Don't fail validation for missing properties, just warn
        }
      }

      // Check config size to prevent DoS
      const configStr = JSON.stringify(config);
      if (configStr.length > this.maxConfigSize) {
        console.error(
          `🚨 Security: Config size exceeds limit: ${configStr.length} > ${this.maxConfigSize}`
        );
        return false;
      }

      console.log("✅ Config structure validation passed");
      return true;
    } catch (error) {
      console.error("🚨 Security: Config validation error:", error);
      return false;
    }
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
   * Check if a field name is a thumbnail asset field
   */
  isThumbnailAssetField(fieldName) {
    // Schema A (new)
    if (
      fieldName === "thumbnailSettings.defaultImagePath" ||
      /^thumbnailSettings\.defaultImages\./.test(fieldName)
    )
      return true;

    // Schema B (Display tab): thumbnails.defaults.*
    if (fieldName === "thumbnails.defaultPath" || /^thumbnails\.defaults\./.test(fieldName))
      return true;

    return false;
  }

  /**
   * Strip asset prefix from file path (supports both V3 and V4 paths)
   */
  stripAssetPrefix(value) {
    if (!value || typeof value !== "string") return "";
    return value.replace(/^\.?\/?(?:search-pro-v[34]\/)?assets\//i, "");
  }

  /**
   * Ensure asset prefix for file path
   */
  ensureAssetPrefix(value) {
    if (!value || typeof value !== "string") return "";
    const v = value.trim();
    if (/^(https?:)?\/\//i.test(v) || v.startsWith("/")) return v;
    const fileOnly = this.stripAssetPrefix(v);
    return fileOnly ? `assets/${fileOnly}` : "";
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

      if (sourceValue && typeof sourceValue === "object" && !Array.isArray(sourceValue)) {
        safeTarget[key] = this.safeObjectMerge(
          safeTarget[key] || {},
          sourceValue,
          maxDepth,
          currentDepth + 1
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
      !dangerousNames.includes(propName) && !propName.startsWith("__") && propName.length < 100
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
   * Set nested property value safely (alias for safeSetNestedProperty)
   */
  setNestedProperty(obj, path, value) {
    return this.safeSetNestedProperty(obj, path, value);
  }

  /**
   * Show toast notification
   */
  showToast(type, title, message, duration = 5000) {
    try {
      const safeType = this.sanitizeInput(type, 20);
      const safeTitle = this.sanitizeInput(title);
      const safeMessage = this.sanitizeInput(message);

      if (window.toastManager && typeof window.toastManager.showToast === "function") {
        window.toastManager.showToast(safeType, safeTitle, safeMessage, duration);
        return;
      }

      if (window.showToast && typeof window.showToast === "function") {
        window.showToast(safeType, safeTitle, safeMessage, duration);
        return;
      }

      console.log(`🍞 Toast: ${safeType.toUpperCase()} - ${safeTitle}: ${safeMessage}`);
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
        ".btn:not(.modal-btn-confirm):not(.modal-btn-cancel), .fab-action"
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

      const sanitizeConfigRecursive = (obj, maxDepth = 10, currentDepth = 0) => {
        if (currentDepth > maxDepth || !obj || typeof obj !== "object") {
          return false;
        }

        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (!this.isPropertyNameSafe(key)) {
              console.warn(`🚨 Security: Unsafe property name in config: ${key}`);
              return false;
            }

            const value = obj[key];

            if (typeof value === "string") {
              if (!this.isContentSafe(value)) {
                console.warn(`🚨 Security: Unsafe content in config property ${key}`);
                return false;
              }
              obj[key] = this.sanitizeInput(value);
            } else if (value && typeof value === "object" && !Array.isArray(value)) {
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
      console.error("🚨 Security: Error validating and sanitizing config:", error);
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

      if (this.config?.debugMode)
        console.debug(`FORM CHANGE: ${name} -> ${value} (type: ${input.type})`);

      if (this.config?.debugMode && name.includes("includePanoramas")) {
        console.debug("PANORAMA FORM DEBUG: toggle changed", {
          fieldName: name,
          newValue: value,
          inputType: input.type,
          inputChecked: input.checked,
          configBefore: this.config.includeContent?.elements?.includePanoramas,
        });
      }

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

      // Ensure asset prefix for thumbnail asset fields
      if (typeof value === "string" && this.isThumbnailAssetField(name)) {
        value = this.ensureAssetPrefix(value);
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

      if (this.config?.debugMode) console.debug(`CONFIG UPDATED: ${name} = ${value}`);

      // ENHANCED DEBUGGING: Log config state after panorama changes
      if (this.config?.debugMode && name.includes("includePanoramas")) {
        console.debug("PANORAMA CONFIG DEBUG: after update", {
          configAfter: this.config.includeContent?.elements?.includePanoramas,
          fullElementsConfig: this.config.includeContent?.elements,
        });
      }
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

      // ENHANCED DEBUGGING: Log exactly what's being sent for panorama changes
      if (fieldName.includes("includePanoramas")) {
        console.log("🔍 PANORAMA DEBUG: Live preview config update", {
          fieldName,
          value,
          includeContentElements: previewConfig.includeContent?.elements,
          fullIncludeContent: previewConfig.includeContent,
        });
      }

      this.safeLocalStorageSet("searchProLiveConfig", previewConfig);

      if (window.parent && window.parent !== window) {
        try {
          window.parent.postMessage(
            {
              type: "searchProConfigPreview",
              config: previewConfig,
              field: this.sanitizeInput(fieldName),
              value: typeof value === "string" ? this.sanitizeInput(value) : value,
            },
            "*"
          );
        } catch (postError) {
          console.warn("🚨 Security: Error posting message to parent:", postError);
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
        ".form-input, .toggle-input, .color-input, .range-input, .form-select"
      );

      // ENHANCED DEBUGGING: Check if panorama toggle is found
      const panoramaToggle = container.querySelector("#includePanoramas");
      console.log(`🔍 LISTENERS DEBUG: Found panorama toggle?`, {
        panoramaToggle: panoramaToggle,
        hasToggleInputClass: panoramaToggle?.classList.contains("toggle-input"),
        panoramaName: panoramaToggle?.getAttribute("name"),
        panoramaId: panoramaToggle?.id,
        totalInputsFound: formInputs.length,
      });

      formInputs.forEach((input) => {
        input.addEventListener("change", () => this.onFormChange(input));
        input.addEventListener("input", () => this.onFormInput(input));

        // ENHANCED DEBUGGING: Log if this is the panorama toggle
        if (input.id === "includePanoramas") {
          console.log("🔍 LISTENERS DEBUG: Event listeners attached to panorama toggle", input);
        }
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
        } else if (field.multiple && field.tagName.toLowerCase() === "select") {
          // Handle multi-select for arrays
          if (Array.isArray(value)) {
            Array.from(field.options).forEach((option) => {
              option.selected = value.includes(option.value);
            });
          }
        } else {
          // Handle regular inputs and textareas, including arrays converted to comma-separated strings
          if (fieldName === "searchBar.width" && typeof value === "number") {
            field.value = value + "px";
          } else if (Array.isArray(value)) {
            // Convert array to comma-separated string, filter out empty strings
            const filteredValues = value.filter((v) => v && v.toString().trim());
            field.value = filteredValues.length > 0 ? filteredValues.join(", ") : "";
          } else {
            const s = value === null ? "" : String(value);
            field.value = this.isThumbnailAssetField(fieldName) ? this.stripAssetPrefix(s) : s;
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
    const defaults = {
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
      elementTriggering: {
        initialDelay: 300,
        maxRetries: 3,
        retryInterval: 300,
        maxRetryInterval: 1000,
        baseRetryInterval: 300,
      },

      // ==========================================
      // FILTERING TAB - Content Filtering Settings
      // ==========================================

      filter: {
        // Top-level filter controls ALL content based on label/value text matching
        mode: "none", // "none" (show all), "whitelist" (only show allowed), "blacklist" (hide specified)
        allowedValues: [], // Values to allow if mode is "whitelist" - any text that appears in labels/subtitles
        blacklistedValues: [], // Values to block if mode is "blacklist" - any text that appears in labels/subtitles

        // Value matching modes control how filter values are compared with element labels
        valueMatchMode: {
          whitelist: "exact", // "exact" (complete match), "contains" (partial match), "startsWith", "regex"
          blacklist: "contains", // "contains" is safer default for blacklists (catches variants)
        },

        // Media index filtering with proper mode control - filter specific panoramas by position in tour
        mediaIndexes: {
          mode: "none", // "none" (show all), "whitelist" (only show allowed), "blacklist" (hide specified)
          allowed: [], // Panorama indexes to allow when mode is "whitelist", e.g. ["0", "1", "5"] shows only the 1st, 2nd, and 6th panoramas
          blacklisted: [], // Panorama indexes to block when mode is "blacklist", e.g. ["0", "3"] hides the 1st and 4th panoramas
        },

        // Filter based on element type (Panorama, Hotspot, Video, etc.)
        elementTypes: {
          mode: "none", // "none" (show all types), "whitelist" (only show specified types), "blacklist" (hide specified types)
          allowedTypes: [], // Element types to include, ["Panorama", "Hotspot", "3DModel"] will ONLY show these types
          blacklistedTypes: [], // Element types to exclude, e.g. ["Text", "Element"] will HIDE these types but show all others
        },

        // Filter based on partial text matches in element labels
        elementLabels: {
          mode: "none", // "none" (show all labels), "whitelist" (only labels containing allowed text), "blacklist" (hide labels with specified text)
          allowedValues: [], // Show only elements with these words in their labels, e.g. ["Room", "Office"] shows only elements containing "Room" or "Office"
          blacklistedValues: [], // Hide elements with these words in their labels, e.g. ["test", "temp"] hides elements containing "test" or "temp"
        },

        // Filter based on assigned tags (useful when your tour content uses tags)
        tagFiltering: {
          mode: "none", // "none" (show all tags), "whitelist" (only show elements with specified tags), "blacklist" (hide elements with specified tags)
          allowedTags: [], // Tags to allow, e.g. ["important", "featured_location"] shows only elements with these tags
          blacklistedTags: [], // Tags to block, e.g. ["hidden", "internal"] hides elements with these tags
        },
      },

      // ==========================================
      // SEARCH SETTINGS - Advanced Search Configuration (merged into one block)
      // ==========================================

      searchSettings: {
        // Basics
        debounce: 300,
        maxResults: 50,
        caseSensitive: false,
        fuzzySearch: {
          enabled: false,
          threshold: 0.3,
        },
        highlightMatches: true,

        // Field weights
        fieldWeights: {
          label: 1.0,
          subtitle: 0.8,
          tags: 0.6,
          parentLabel: 0.3,
        },

        // Behavior
        behavior: {
          threshold: 0.4,
          distance: 40,
          minMatchCharLength: 1,
          useExtendedSearch: true,
          ignoreLocation: true,
          includeScore: true,
        },

        // Boosts
        boostValues: {
          sheetsMatch: 2.5,
          labeledItem: 1.5,
          unlabeledItem: 1.0,
          childElement: 0.8,
        },
      },

      // ==========================================
      // DISPLAY LABELS - Field Mapping Configuration
      // ==========================================

      displayLabels: {
        panoramas: "label",
        hotspots: "label",
        polygons: "label",
        videos: "label",
        images: "label",
        text: "label",
      },

      // ==========================================
      // USE AS LABEL - Fallback Field Configuration
      // ==========================================

      useAsLabel: {
        panoramas: "none",
        hotspots: "none",
        polygons: "none",
        videos: "none",
        images: "none",
        text: "none",
      },

      // Legacy Search plugin specific settings (deprecated but kept for compatibility)
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
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
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
              fontWeight: "400",
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
          groupHeaderBackground: "#ffffff",
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
        showTagsInResults: true,
        showSubtitlesInResults: true,
        showParentInfo: true,
      },

      // Thumbnail Settings
      thumbnailSettings: {
        enableThumbnails: false,
        thumbnailSize: "48px",
        borderRadius: 4,
        borderWidth: 4,
        borderColor: "#9CBBFF",
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
          "3DModel": "assets/3d-model-default.jpg",
          "3DHotspot": "assets/3d-hotspot-default.jpg",
          "3DModelObject": "assets/3d-model-object-default.jpg",
          default: "assets/default-thumbnail.jpg",
        },

        // Group Header Settings
        groupHeaderAlignment: "left", // "left" or "right"
        groupHeaderPosition: "top", // "top" or "bottom"

        // ICON SETTINGS CONFIGURATION
        iconSettings: {
          enableCustomIcons: false,
          enableFontAwesome: false,
          fontAwesomeUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
          iconSize: "24px",
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
          include3DModels: true,
          include3DHotspots: true,
          include3DModelObjects: true,
          includeContainers: true,
        },
        searchableProperties: {
          title: true,
          description: true,
          subtitle: true,
          tags: true,
          customProperties: [],
        },
      },

      // ==========================================
      //  FILTERING TAB - Filter Which Content Appears
      // ==========================================

      // Duplicate simple filter removed to avoid silent override
      // ==========================================
      // DATA SOURCES TAB - External Data Integration
      // ==========================================
      // [10.15] Google Sheets Integration
      googleSheets: {
        useGoogleSheetData: false,
        includeStandaloneEntries: false,
        useAsDataSource: true,
        fetchMode: "csv",
        googleSheetUrl:
          "https://docs.google.com/spreadsheets/d/e/2PACX-1vQrQ9oy4JjwYAdTG1DKne9cu76PZCrZgtIOCX56sxVoBwRzys36mTqvFMvTE2TB-f-k5yZz_uWwW5Ou/pub?output=csv",
        useLocalCSV: false,
        localCSVFile: "search-data.csv",
        localCSVDir: "business-data",
        localCSVUrl: "", // Let search-v3.js resolve via __fromScript()
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

        // [10.13] Search Ranking & Behavior Settings moved to root searchSettings
      },

      // ...other config sections...
    };

    // [PATCH] Ensure nested googleSheets structure is always complete
    if (!defaults.googleSheets.csvOptions) {
      defaults.googleSheets.csvOptions = {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      };
    }
    if (!defaults.googleSheets.caching) {
      defaults.googleSheets.caching = {
        enabled: false,
        timeoutMinutes: 60,
        storageKey: "tourGoogleSheetsData",
      };
    }
    if (!defaults.googleSheets.progressiveLoading) {
      defaults.googleSheets.progressiveLoading = {
        enabled: false,
        initialFields: [],
        detailFields: [],
      };
    }

    return defaults;
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
        .querySelectorAll(".form-input, .toggle-input, .color-input, .range-input, .form-select")
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
