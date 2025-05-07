/*
====================================
SECTION: Metadata
====================================
Description: Core search functionality for 3DVista tours with improved element detection,
filtering options, and better UI interactions. Optimized for both desktop and mobile.
Version: 2.0.5
Last Updated: 04/17/2025
*/

// ====================================
// SECTION: Constants and Configuration
// Purpose: Define constants and build the default configuration for the search system.
// ====================================

window.tourSearchFunctions = (function () {
  // Version for configuration compatibility checking
  const VERSION = "2.0.1"; // Must match version in config-loader.js

  // Check if localStorage has compatible configuration
  function _validateStoredConfig() {
    try {
      const saved = localStorage.getItem("searchPro.config");
      if (!saved) return;

      const parsed = JSON.parse(saved);
      const storedVersion = parsed.version || "unknown";

      if (storedVersion !== VERSION) {
        console.warn(
          `[SearchPro] Config version mismatch (${storedVersion} vs ${VERSION}), clearing local storage`,
        );
        localStorage.removeItem("searchPro.config");
      }
    } catch (e) {
      console.error("[SearchPro] Error validating stored config:", e);
    }
  }

  // Run validation on load
  _validateStoredConfig();

  // Constants and configuration options
  const BREAKPOINTS = {
    mobile: 768,
    tablet: 1024,
  };

  // ====================================
  // SECTION: ConfigBuilder Class
  // Purpose: Builds and validates the configuration for the search system.
  // ====================================
  // Configuration Builder Class for more maintainable options
  class ConfigBuilder {
    constructor() {
      // Default configuration
      this.config = {
        autoHide: {
          mobile: false,
          desktop: true,
        },
        mobileBreakpoint: BREAKPOINTS.mobile,
        minSearchChars: 2,
        showTagsInResults: true,
        elementTriggering: {
          initialDelay: 300,
          maxRetries: 3,
          retryInterval: 300,
          maxRetryInterval: 1000,
          baseRetryInterval: 300,
        },
        // Add default display labels for group headers
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
        },
      };
    }

    // ====================================
    // METHOD: setDisplayOptions()
    // Purpose: Sets display-related options for the search system.
    // Parameters: options (object) - Display options to apply.
    // Returns: this (ConfigBuilder instance)
    // ====================================
    setDisplayOptions(options) {
      this.config.display = {
        showGroupHeaders:
          options?.showGroupHeaders !== undefined
            ? options.showGroupHeaders
            : true,
        showGroupCount:
          options?.showGroupCount !== undefined ? options.showGroupCount : true,
        showIconsInResults:
          options?.showIconsInResults !== undefined
            ? options.showIconsInResults
            : true,
        onlySubtitles:
          options?.onlySubtitles !== undefined ? options.onlySubtitles : false,
        showSubtitlesInResults:
          options?.showSubtitlesInResults !== undefined
            ? options.showSubtitlesInResults
            : true,
        showParentLabel:
          options?.showParentLabel !== undefined
            ? options.showParentLabel
            : true,
        showParentInfo:
          options?.showParentInfo !== undefined ? options.showParentInfo : true,
        showParentTags:
          options?.showParentTags !== undefined ? options.showParentTags : true,
        showParentType:
          options?.showParentType !== undefined ? options.showParentType : true,
      };
      return this;
    }

    // Set content inclusion options
    setContentOptions(options) {
      this.config.includeContent = {
        unlabeledWithSubtitles:
          options?.unlabeledWithSubtitles !== undefined
            ? options.unlabeledWithSubtitles
            : true,
        unlabeledWithTags:
          options?.unlabeledWithTags !== undefined
            ? options.unlabeledWithTags
            : true,
        completelyBlank:
          options?.completelyBlank !== undefined
            ? options.completelyBlank
            : true,
        elements: {
          includeHotspots:
            options?.elements?.includeHotspots !== undefined
              ? options.elements.includeHotspots
              : true,
          includePolygons:
            options?.elements?.includePolygons !== undefined
              ? options.elements.includePolygons
              : true,
          includeVideos:
            options?.elements?.includeVideos !== undefined
              ? options.elements.includeVideos
              : true,
          includeWebframes:
            options?.elements?.includeWebframes !== undefined
              ? options.elements.includeWebframes
              : true,
          includeImages:
            options?.elements?.includeImages !== undefined
              ? options.elements.includeImages
              : true,
          includeText:
            options?.elements?.includeText !== undefined
              ? options.elements.includeText
              : true,
          includeProjectedImages:
            options?.elements?.includeProjectedImages !== undefined
              ? options.elements.includeProjectedImages
              : true,
          includeElements:
            options?.elements?.includeElements !== undefined
              ? options.elements.includeElements
              : true,
          skipEmptyLabels:
            options?.elements?.skipEmptyLabels !== undefined
              ? options.elements.skipEmptyLabels
              : false,
          minLabelLength:
            options?.elements?.minLabelLength !== undefined
              ? options.elements.minLabelLength
              : 0,
        },
      };
      return this;
    }

    // Set filter options
    setFilterOptions(options) {
      this.config.filter = {
        mode: options?.mode || "none",
        allowedValues: options?.allowedValues || [],
        blacklistedValues: options?.blacklistedValues || [],
        allowedMediaIndexes: options?.allowedMediaIndexes || [],
        blacklistedMediaIndexes: options?.blacklistedMediaIndexes || [],
        elementTypes: {
          mode: options?.elementTypes?.mode || "none",
          allowedTypes: options?.elementTypes?.allowedTypes || [],
          blacklistedTypes: options?.elementTypes?.blacklistedTypes || [],
        },
        elementLabels: {
          mode: options?.elementLabels?.mode || "none",
          allowedValues: options?.elementLabels?.allowedValues || [],
          blacklistedValues: options?.elementLabels?.blacklistedValues || [],
        },
        tagFiltering: {
          mode: options?.tagFiltering?.mode || "none",
          allowedTags: options?.tagFiltering?.allowedTags || [],
          blacklistedTags: options?.tagFiltering?.blacklistedTags || [],
        },
      };
      return this;
    }

    // Set label options
    setLabelOptions(options) {
      this.config.useAsLabel = {
        subtitles: options?.subtitles !== undefined ? options.subtitles : true,
        tags: options?.tags !== undefined ? options.tags : true,
        elementType:
          options?.elementType !== undefined ? options.elementType : true,
        parentWithType:
          options?.parentWithType !== undefined
            ? options.parentWithType
            : false,
        customText: options?.customText || "[Unnamed Item]",
      };
      return this;
    }

    // Set appearance options
    setAppearanceOptions(options) {
      this.config.appearance = {
        searchField: {
          borderRadius: {
            topLeft: options?.searchField?.borderRadius?.topLeft || 35,
            topRight: options?.searchField?.borderRadius?.topRight || 35,
            bottomRight: options?.searchField?.borderRadius?.bottomRight || 35,
            bottomLeft: options?.searchField?.borderRadius?.bottomLeft || 35,
          },
        },
        searchResults: {
          borderRadius: {
            topLeft: options?.searchResults?.borderRadius?.topLeft || 5,
            topRight: options?.searchResults?.borderRadius?.topRight || 5,
            bottomRight: options?.searchResults?.borderRadius?.bottomRight || 5,
            bottomLeft: options?.searchResults?.borderRadius?.bottomLeft || 5,
          },
          maxHeight: options?.searchResults?.maxHeight || 500, // NEW: Add maxHeight option
        },
        colors: {
          searchBackground: options?.colors?.searchBackground || "#f4f3f2",
          searchText: options?.colors?.searchText || "#1a1a1a",
          placeholderText: options?.colors?.placeholderText || "#94a3b8",
          searchIcon: options?.colors?.searchIcon || "#94a3b8",
          clearIcon: options?.colors?.clearIcon || "#94a3b8",
          resultsBackground: options?.colors?.resultsBackground || "#ffffff",
          groupHeaderColor: options?.colors?.groupHeaderColor || "#20293A",
          groupCountColor: options?.colors?.groupCountColor || "#94a3b8",
          resultHover: options?.colors?.resultHover || "#f0f0f0",
          resultBorderLeft: options?.colors?.resultBorderLeft || "#dd0e0e",
          resultText: options?.colors?.resultText || "#1e293b",
          resultSubtitle: options?.colors?.resultSubtitle || "#64748b",
          resultIconColor: options?.colors?.resultIconColor || "#6e85f7",
          resultSubtextColor: options?.colors?.resultSubtextColor || "#000000",
        },
        searchWidth: options?.searchWidth || 350, // NEW: Add searchWidth option
      };
      return this;
    }

    // Set search bar options
    setSearchBarOptions(options) {
      this.config.searchBar = {
        placeholder: options?.placeholder || "Search...",
        width: options?.width || 350,
        position: {
          top: options?.position?.top !== undefined ? options.position.top : 70,
          right:
            options?.position?.right !== undefined
              ? options.position.right
              : 70,
          left:
            options?.position?.left !== undefined
              ? options.position.left
              : null,
          bottom:
            options?.position?.bottom !== undefined
              ? options.position.bottom
              : null,
        },
        useResponsive:
          options?.useResponsive !== undefined ? options.useResponsive : true,
        mobilePosition: {
          top:
            options?.mobilePosition?.top !== undefined
              ? options.mobilePosition.top
              : 90,
          left:
            options?.mobilePosition?.left !== undefined
              ? options.mobilePosition.left
              : 20,
          right:
            options?.mobilePosition?.right !== undefined
              ? options.mobilePosition.right
              : 20,
          bottom:
            options?.mobilePosition?.bottom !== undefined
              ? options.mobilePosition.bottom
              : null,
        },
      };
      return this;
    }

    // Set general options
    setGeneralOptions(options) {
      if (options?.autoHide !== undefined) {
        this.config.autoHide = options.autoHide;
      }
      if (options?.mobileBreakpoint !== undefined) {
        this.config.mobileBreakpoint = options.mobileBreakpoint;
      }
      if (options?.minSearchChars !== undefined) {
        this.config.minSearchChars = options.minSearchChars;
      }
      if (options?.showTagsInResults !== undefined) {
        this.config.showTagsInResults = options.showTagsInResults;
      }
      if (options?.elementTriggering !== undefined) {
        this.config.elementTriggering = {
          ...this.config.elementTriggering,
          ...options.elementTriggering,
        };
      }
      return this;
    }

    // Add new method to set custom display labels
    setDisplayLabels(options) {
      if (!options) return this;

      // Merge with defaults
      this.config.displayLabels = {
        ...this.config.displayLabels,
        ...options,
      };
      return this;
    }

    // Add new method for theme customization
    setThemeCustomization(options) {
      if (!options) return this;

      this.config.theme = {
        useDarkMode:
          options?.useDarkMode !== undefined ? options.useDarkMode : null,
        useSystemPreference:
          options?.useSystemPreference !== undefined
            ? options.useSystemPreference
            : true,
        contrastMode: options?.contrastMode || "normal",
        customClass: options?.customClass || "",
        animation: {
          speed: options?.animation?.speed || "normal",
          type: options?.animation?.type || "fade",
        },
      };
      return this;
    }

    // Add new method to set typography settings
    setTypographySettings(options) {
      this.config.theme = this.config.theme || {};
      this.config.theme.typography = {
        fontFamily:
          options?.fontFamily ||
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: options?.fontSize !== undefined ? options.fontSize : 16,
        letterSpacing:
          options?.letterSpacing !== undefined ? options.letterSpacing : 0,
      };
      return this;
    }

    // Enhanced validation with more thorough checks
    validate() {
      const errors = [];

      // Check if minSearchChars is a positive number
      if (
        typeof this.config.minSearchChars !== "number" ||
        this.config.minSearchChars < 1
      ) {
        errors.push("minSearchChars must be a positive number");
      }

      // Check if display is an object
      if (this.config.display && typeof this.config.display !== "object") {
        errors.push("display must be an object");
      }

      // Validate position values
      if (this.config.searchBar && this.config.searchBar.position) {
        const position = this.config.searchBar.position;
        if (
          position.top !== null &&
          (typeof position.top !== "number" || position.top < 0)
        ) {
          errors.push("position.top must be a non-negative number");
        }
        if (
          position.right !== null &&
          (typeof position.right !== "number" || position.right < 0)
        ) {
          errors.push("position.right must be a non-negative number");
        }
        if (
          position.left !== null &&
          position.left !== "50%" &&
          (typeof position.left !== "number" || position.left < 0)
        ) {
          errors.push('position.left must be a non-negative number or "50%"');
        }
      }

      // NEW: Validate typography settings
      if (this.config.theme && this.config.theme.typography) {
        const typography = this.config.theme.typography;

        if (
          typography.fontSize !== undefined &&
          (typeof typography.fontSize !== "number" ||
            typography.fontSize < 8 ||
            typography.fontSize > 30)
        ) {
          errors.push("typography.fontSize must be a number between 8 and 30");
        }

        if (
          typography.letterSpacing !== undefined &&
          (typeof typography.letterSpacing !== "number" ||
            typography.letterSpacing < -5 ||
            typography.letterSpacing > 10)
        ) {
          errors.push(
            "typography.letterSpacing must be a number between -5 and 10",
          );
        }
      }

      // NEW: Validate searchWidth
      if (
        this.config.appearance &&
        this.config.appearance.searchWidth !== undefined
      ) {
        const searchWidth = this.config.appearance.searchWidth;
        if (
          typeof searchWidth !== "number" ||
          searchWidth < 200 ||
          searchWidth > 1000
        ) {
          errors.push(
            "appearance.searchWidth must be a number between 200 and 1000",
          );
        }
      }

      // NEW: Validate maxResultsHeight
      if (
        this.config.appearance &&
        this.config.appearance.searchResults &&
        this.config.appearance.searchResults.maxHeight !== undefined
      ) {
        const maxHeight = this.config.appearance.searchResults.maxHeight;
        if (
          typeof maxHeight !== "number" ||
          maxHeight < 100 ||
          maxHeight > 2000
        ) {
          errors.push(
            "appearance.searchResults.maxHeight must be a number between 100 and 2000",
          );
        }
      }

      // Check if appearance.colors values are valid hex or rgba()
      if (this.config.appearance && this.config.appearance.colors) {
        const colors = this.config.appearance.colors;
        const colorProps = Object.keys(colors);

        for (const prop of colorProps) {
          const color = colors[prop];
          if (typeof color === "string") {
            // Check for valid hex color format (#RGB, #RGBA, #RRGGBB, #RRGGBBAA)
            const validHex =
              /^#([A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(color);

            // Check for valid rgba format
            const validRgba =
              /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*(?:0?\.\d+|[01])\s*)?\)$/.test(
                color,
              );

            if (!validHex && !validRgba) {
              errors.push(
                `${prop} color (${color}) is not a valid hex or rgba format`,
              );
            }
          } else if (color !== undefined) {
            errors.push(`${prop} color must be a string in hex or rgba format`);
          }
        }
      }

      // Validate theme settings if present
      if (this.config.theme) {
        const validContrastModes = ["normal", "high", "low"];
        if (
          this.config.theme.contrastMode &&
          !validContrastModes.includes(this.config.theme.contrastMode)
        ) {
          errors.push(
            `contrastMode must be one of: ${validContrastModes.join(", ")}`,
          );
        }

        const validAnimationTypes = ["fade", "slide", "scale", "none"];
        if (
          this.config.theme.animation &&
          this.config.theme.animation.type &&
          !validAnimationTypes.includes(this.config.theme.animation.type)
        ) {
          errors.push(
            `animation.type must be one of: ${validAnimationTypes.join(", ")}`,
          );
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    }

    // Build the final configuration
    build() {
      const validation = this.validate();
      if (!validation.valid) {
        console.warn("Config validation failed:", validation.errors);
      }
      return this.config;
    }
  }

  // Create default configuration
  let _config = new ConfigBuilder()
    .setDisplayOptions({})
    .setContentOptions({})
    .setFilterOptions({})
    .setLabelOptions({})
    .setAppearanceOptions({})
    .setSearchBarOptions({})
    .setThemeCustomization({}) // Initialize with default theme settings
    .setDisplayLabels({})
    .build();

  // Logger utility for better debugging control
  const Logger = {
    // Set this to control logging level: 0=debug, 1=info, 2=warn, 3=error, 4=none
    level: 2,

    debug: function (message, ...args) {
      if (this.level <= 0) console.debug(`[Search] ${message}`, ...args);
    },

    info: function (message, ...args) {
      if (this.level <= 1) console.info(`[Search] ${message}`, ...args);
    },

    warn: function (message, ...args) {
      if (this.level <= 2) console.warn(`[Search] ${message}`, ...args);
    },

    error: function (message, ...args) {
      if (this.level <= 3) console.error(`[Search] ${message}`, ...args);
    },
  };

  let _initialized = false;

  // Improved search history management with better error handling
  const _searchHistory = {
    maxItems: 5,
    storageKey: "tourSearchHistory",

    save(term) {
      if (!term || typeof term !== "string" || term.trim() === "") {
        return false;
      }

      try {
        // Check if localStorage is available
        if (!this._isStorageAvailable()) {
          return false;
        }

        const history = this.get();
        const termLower = term.toLowerCase().trim();
        const index = history.findIndex((h) => h.toLowerCase() === termLower);

        if (index > -1) {
          history.splice(index, 1);
        }

        history.unshift(term.trim());

        // Limit the size of history
        if (history.length > this.maxItems) {
          history.length = this.maxItems;
        }

        // Check storage size before saving
        const serialized = JSON.stringify(history);
        if (serialized.length > 5000) {
          // Trim history if too large
          history.length = Math.max(1, history.length - 2);
        }

        try {
          localStorage.setItem(this.storageKey, JSON.stringify(history));
          return true;
        } catch (e) {
          // Handle quota exceeded errors
          if (e.name === "QuotaExceededError") {
            // Try removing the oldest item and save again
            if (history.length > 1) {
              history.pop();
              localStorage.setItem(this.storageKey, JSON.stringify(history));
              return true;
            }
          }
          Logger.warn("Failed to save search history:", e);
          return false;
        }
      } catch (error) {
        const suggestionPrompt = `
                [SearchPro Error Debugging Request]
                - Error Message: ${error.message}
                - Stack Trace: ${error.stack}
                - URL: ${window.location.href}
                - User Agent: ${navigator.userAgent}
                - Context: Search Pro - Search History Save
                ➔ Suggest possible causes and fixes:
                `;
        console.log(suggestionPrompt);
        return false;
      }
    },

    get() {
      try {
        if (!this._isStorageAvailable()) {
          return [];
        }

        const stored = localStorage.getItem(this.storageKey);
        if (!stored) return [];

        const parsed = JSON.parse(stored);

        // Validate parsed data is an array
        if (!Array.isArray(parsed)) {
          Logger.warn("Invalid search history format, resetting");
          this.clear();
          return [];
        }

        // Filter out any invalid entries
        return parsed.filter(
          (item) => typeof item === "string" && item.trim() !== "",
        );
      } catch (error) {
        const suggestionPrompt = `
                [SearchPro Error Debugging Request]
                - Error Message: ${error.message}
                - Stack Trace: ${error.stack}
                - URL: ${window.location.href}
                - User Agent: ${navigator.userAgent}
                - Context: Search Pro - Search History Get
                ➔ Suggest possible causes and fixes:
                `;
        console.log(suggestionPrompt);
        return [];
      }
    },

    clear() {
      try {
        if (this._isStorageAvailable()) {
          localStorage.removeItem(this.storageKey);
        }
        return true;
      } catch (error) {
        const suggestionPrompt = `
                [SearchPro Error Debugging Request]
                - Error Message: ${error.message}
                - Stack Trace: ${error.stack}
                - URL: ${window.location.href}
                - User Agent: ${navigator.userAgent}
                - Context: Search Pro - Search History Clear
                ➔ Suggest possible causes and fixes:
                `;
        console.log(suggestionPrompt);
        return false;
      }
    },

    // Check if localStorage is available
    _isStorageAvailable() {
      try {
        const test = "__storage_test__";
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch (e) {
        return false;
      }
    },
  };

  // ====================================
  // SECTION: Utility Functions
  // Purpose: Provide reusable helper functions for the search system.
  // ====================================

  // ====================================
  // FUNCTION: _debounce()
  // Purpose: Delays the execution of a function.
  // ====================================
  function _debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };

      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function _preprocessSearchTerm(term) {
    if (!term) return "";

    // Handle special character search
    if (/[0-9\-_]/.test(term)) {
      return `'${term}`;
    }

    return term;
  }

  // Enhanced element type detection with better organization
  function _getElementType(overlay, label) {
    if (!overlay) return "Element";

    try {
      // Element type mapping for different detection methods
      const classNameMap = {
        FramePanoramaOverlay: "Webframe",
        QuadVideoPanoramaOverlay: "Video",
        ImagePanoramaOverlay: "Image",
        TextPanoramaOverlay: "Text",
      };

      // PRIMARY: Use the class property directly
      if (overlay.class && classNameMap[overlay.class]) {
        return classNameMap[overlay.class];
      }

      if (overlay.class === "HotspotPanoramaOverlay") {
        // Check data properties for hotspots
        if (overlay.data) {
          if (overlay.data.hasPanoramaAction) return "Hotspot";
          if (overlay.data.hasText) return "Text";
          if (overlay.data.isPolygon) return "Polygon";
        }

        // Use label-based detection for hotspots
        const overlayLabel = (overlay.label || label || "").toLowerCase();
        if (overlayLabel.includes("polygon")) return "Polygon";
        if (overlayLabel === "image") return "Image";
        if (overlayLabel.includes("info-")) return "Hotspot";

        return "Hotspot";
      }

      // SECONDARY: Try the get method
      if (typeof overlay.get === "function") {
        try {
          const className = overlay.get("class");
          if (classNameMap[className]) {
            return classNameMap[className];
          }

          if (className === "HotspotPanoramaOverlay") {
            try {
              const data = overlay.get("data") || {};
              if (data.hasPanoramaAction) return "Hotspot";
              if (data.hasText) return "Text";
              if (data.isPolygon) return "Polygon";
            } catch (e) {
              Logger.debug("Error checking hotspot data:", e);
            }

            // Use label for hotspot detection
            const overlayLabel = (overlay.label || label || "").toLowerCase();
            if (overlayLabel.includes("polygon")) return "Polygon";
            if (overlayLabel === "image") return "Image";
            if (overlayLabel.includes("info-")) return "Hotspot";

            return "Hotspot";
          }
        } catch (e) {
          Logger.debug("Error getting class via get method:", e);
        }
      }

      // TERTIARY: Check specific properties that indicate element type
      const propertyChecks = [
        { props: ["url", "data.url"], type: "Webframe" },
        { props: ["video", "data.video"], type: "Video" },
        {
          props: ["vertices", "polygon", "data.vertices", "data.polygon"],
          type: "Polygon",
        },
      ];

      for (const check of propertyChecks) {
        for (const prop of check.props) {
          if (prop.includes(".")) {
            // Handle nested properties
            const [parent, child] = prop.split(".");
            if (overlay[parent] && overlay[parent][child]) {
              return check.type;
            }
          } else if (overlay[prop]) {
            return check.type;
          }
        }
      }

      // QUATERNARY: Use label-based detection as last resort
      const overlayLabel = (overlay.label || label || "").toLowerCase();
      if (overlayLabel) {
        const labelPatterns = [
          { pattern: "web", type: "Webframe" },
          { pattern: "video", type: "Video" },
          { pattern: "image", type: "Image" },
          { pattern: "text", type: "Text" },
          { pattern: "polygon", type: "Polygon" },
          { pattern: "goto", type: "Hotspot" },
          { pattern: "info", type: "Hotspot" },
        ];

        for (const { pattern, type } of labelPatterns) {
          if (overlayLabel === pattern || overlayLabel.includes(pattern)) {
            return type;
          }
        }
      }

      // Default case
      return "Element";
    } catch (error) {
      const suggestionPrompt = `
            [SearchPro Error Debugging Request]
            - Error Message: ${error.message}
            - Stack Trace: ${error.stack}
            - URL: ${window.location.href}
            - User Agent: ${navigator.userAgent}
            - Context: Search Pro - Element Type Detection
            ➔ Suggest possible causes and fixes:
            `;
      console.log(suggestionPrompt);
      return "Element";
    }
  }

  // Enhanced element filtering
  function _shouldIncludeElement(elementType, label, tags) {
    try {
      // Skip empty labels if configured
      if (!label && _config.includeContent.elements.skipEmptyLabels) {
        return false;
      }

      // Check minimum label length
      if (
        label &&
        _config.includeContent.elements.minLabelLength > 0 &&
        label.length < _config.includeContent.elements.minLabelLength
      ) {
        return false;
      }

      // Apply element type filtering
      const typeFilterMode = _config.filter.elementTypes?.mode;
      if (
        typeFilterMode === "whitelist" &&
        Array.isArray(_config.filter.elementTypes?.allowedTypes) &&
        _config.filter.elementTypes.allowedTypes.length > 0
      ) {
        if (!_config.filter.elementTypes.allowedTypes.includes(elementType)) {
          return false;
        }
      } else if (
        typeFilterMode === "blacklist" &&
        Array.isArray(_config.filter.elementTypes?.blacklistedTypes) &&
        _config.filter.elementTypes.blacklistedTypes.length > 0
      ) {
        if (
          _config.filter.elementTypes.blacklistedTypes.includes(elementType)
        ) {
          return false;
        }
      }

      // Apply label filtering
      const labelFilterMode = _config.filter.elementLabels?.mode;
      if (
        label &&
        labelFilterMode === "whitelist" &&
        Array.isArray(_config.filter.elementLabels?.allowedValues) &&
        _config.filter.elementLabels.allowedValues.length > 0
      ) {
        if (
          !_config.filter.elementLabels.allowedValues.some((value) =>
            label.includes(value),
          )
        ) {
          return false;
        }
      } else if (
        label &&
        labelFilterMode === "blacklist" &&
        Array.isArray(_config.filter.elementLabels?.blacklistedValues) &&
        _config.filter.elementLabels.blacklistedValues.length > 0
      ) {
        if (
          _config.filter.elementLabels.blacklistedValues.some((value) =>
            label.includes(value),
          )
        ) {
          return false;
        }
      }

      // Apply tag filtering
      const tagFilterMode = _config.filter.tagFiltering?.mode;
      if (Array.isArray(tags) && tags.length > 0) {
        if (
          tagFilterMode === "whitelist" &&
          Array.isArray(_config.filter.tagFiltering?.allowedTags) &&
          _config.filter.tagFiltering.allowedTags.length > 0
        ) {
          if (
            !tags.some((tag) =>
              _config.filter.tagFiltering.allowedTags.includes(tag),
            )
          ) {
            return false;
          }
        } else if (
          tagFilterMode === "blacklist" &&
          Array.isArray(_config.filter.tagFiltering?.blacklistedTags) &&
          _config.filter.tagFiltering.blacklistedTags.length > 0
        ) {
          if (
            tags.some((tag) =>
              _config.filter.tagFiltering.blacklistedTags.includes(tag),
            )
          ) {
            return false;
          }
        }
      } else if (
        tagFilterMode === "whitelist" &&
        Array.isArray(_config.filter.tagFiltering?.allowedTags) &&
        _config.filter.tagFiltering.allowedTags.length > 0
      ) {
        return false;
      }

      // Check element type against configuration
      const elementTypeMap = {
        Hotspot: "includeHotspots",
        Polygon: "includePolygons",
        Video: "includeVideos",
        Webframe: "includeWebframes",
        Image: "includeImages",
        Text: "includeText",
        ProjectedImage: "includeProjectedImages",
        Element: "includeElements",
      };

      const configKey = elementTypeMap[elementType];
      if (configKey) {
        return _config.includeContent.elements[configKey] !== false;
      }

      // Try pluralized version for custom types
      const pluralizedKey = `include${elementType}s`;
      if (_config.includeContent.elements[pluralizedKey] !== undefined) {
        return _config.includeContent.elements[pluralizedKey];
      }

      // Default to include if not specifically configured
      return true;
    } catch (error) {
      const suggestionPrompt = `
            [SearchPro Error Debugging Request]
            - Error Message: ${error.message}
            - Stack Trace: ${error.stack}
            - URL: ${window.location.href}
            - User Agent: ${navigator.userAgent}
            - Context: Search Pro - Element Filtering
            ➔ Suggest possible causes and fixes:
            `;
      console.log(suggestionPrompt);
      return false;
    }
  }

  // Improved element triggering with exponential backoff and type-specific settings
  function _triggerElement(tour, elementId, callback, options = {}) {
    if (!tour || !elementId) {
      Logger.warn("Invalid tour or elementId for trigger");
      if (callback) callback(false);
      return;
    }

    // Merge with default config
    const config = {
      ..._config.elementTriggering,
      ...options,
    };

    let retryCount = 0;

    // Use exponential backoff for retries
    const getBackoffTime = (attempt) => {
      const baseTime = config.baseRetryInterval;
      const exponentialTime = baseTime * Math.pow(1.5, attempt);
      return Math.min(exponentialTime, config.maxRetryInterval);
    };

    const attemptTrigger = () => {
      try {
        if (!tour || !tour.player) {
          Logger.warn("Tour or player not available");
          if (callback) callback(false);
          return;
        }

        // Find element using multiple strategies
        const element = findElementById(tour, elementId);

        if (element) {
          Logger.info(`Element found: ${elementId}`);

          // Try multiple trigger methods in sequence
          const triggerMethods = [
            { name: "trigger", fn: (el) => el.trigger("click") },
            { name: "click", fn: (el) => el.click() },
            { name: "onClick", fn: (el) => el.onClick() },
          ];

          for (const method of triggerMethods) {
            try {
              if (
                typeof element[method.name] === "function" ||
                (method.name === "onClick" && element.onClick)
              ) {
                method.fn(element);
                Logger.info(
                  `Element triggered successfully using ${method.name}`,
                );
                if (callback) callback(true);
                return;
              }
            } catch (e) {
              Logger.debug(`Error with ${method.name} method:`, e);
            }
          }

          // All trigger methods failed
          Logger.warn("All trigger methods failed for element:", elementId);
        }

        // Element not found or trigger failed, retry if possible
        retryCount++;
        if (retryCount < config.maxRetries) {
          const backoffTime = getBackoffTime(retryCount);
          Logger.debug(
            `Element trigger attempt ${retryCount} failed, retrying in ${backoffTime}ms...`,
          );
          setTimeout(attemptTrigger, backoffTime);
        } else {
          Logger.warn(
            `Failed to trigger element ${elementId} after ${config.maxRetries} attempts`,
          );
          if (callback) callback(false);
        }
      } catch (error) {
        const suggestionPrompt = `
                [SearchPro Error Debugging Request]
                - Error Message: ${error.message}
                - Stack Trace: ${error.stack}
                - URL: ${window.location.href}
                - User Agent: ${navigator.userAgent}
                - Context: Search Pro - Trigger Element
                ➔ Suggest possible causes and fixes:
                `;
        console.log(suggestionPrompt);
        if (callback) callback(false);
      }
    };

    // Helper to find element by ID using multiple methods
    function findElementById(tour, id) {
      let element = null;

      // Method 1: Direct getById
      try {
        element = tour.player.getById(id);
        if (element) return element;
      } catch (e) {
        Logger.debug("getById method failed:", e);
      }

      // Method 2: get method
      try {
        element = tour.get(id) || tour.player.get(id);
        if (element) return element;
      } catch (e) {
        Logger.debug("get method failed:", e);
      }

      // Method 3: getAllIDs and find
      try {
        if (typeof tour.player.getAllIDs === "function") {
          const allIds = tour.player.getAllIDs();
          if (allIds.includes(id)) {
            return tour.player.getById(id);
          }
        }
      } catch (e) {
        Logger.debug("getAllIDs method failed:", e);
      }

      return null;
    }

    // Start first attempt after initial delay
    setTimeout(attemptTrigger, config.initialDelay);
  }

  // ====================================
  // FUNCTION: _applySearchStyling()
  // Purpose: Applies styling to the search container based on configuration.
  // ====================================
  function _applySearchStyling() {
    const searchContainer = document.getElementById("searchContainer");
    if (!searchContainer) {
      Logger.warn("Search container not found, styling not applied");
      return;
    }

    // Fix position conflicts before applying styles
    _fixPositionConflicts(_config);

    // Apply container position based on device and position preset
    const isMobile = window.innerWidth <= _config.mobileBreakpoint;

    if (isMobile && _config.searchBar.useResponsive) {
      const mobilePos = _config.searchBar.mobilePosition;
      // Fix mobile position conflicts
      if (mobilePos.left !== null && mobilePos.right !== null) {
        mobilePos.left = null; // Prioritize right
      }
      if (mobilePos.top !== null && mobilePos.bottom !== null) {
        mobilePos.bottom = null; // Prioritize top
      }

      // If mobile and responsive mode is enabled, use mobile position
      searchContainer.style.top =
        mobilePos.top !== null ? `${mobilePos.top}px` : null;
      searchContainer.style.right =
        mobilePos.right !== null ? `${mobilePos.right}px` : null;
      searchContainer.style.left =
        mobilePos.left !== null ? `${mobilePos.left}px` : null;
      searchContainer.style.bottom =
        mobilePos.bottom !== null ? `${mobilePos.bottom}px` : null;
      searchContainer.style.transform = "none";

      // For mobile, we calculate the width based on screen size
      searchContainer.style.width = null; // Reset any previously set width
    } else {
      const pos = _config.searchBar?.position || {};
      // Fix desktop position conflicts
      if (pos.left !== null && pos.right !== null) {
        pos.left = null; // Prioritize right
      }
      if (pos.top !== null && pos.bottom !== null) {
        pos.bottom = null; // Prioritize top
      }

      // Desktop - use position presets with detailed positioning
      const preset = _config.searchBar?.positionPreset;

      // Reset all position values first
      searchContainer.style.top = null;
      searchContainer.style.left = null;
      searchContainer.style.right = null;
      searchContainer.style.bottom = null;
      searchContainer.style.transform = "none";

      // Apply position based on preset
      if (preset === "top-left") {
        searchContainer.style.top = `${pos.top}px`;
        searchContainer.style.left = `${pos.left}px`;
        searchContainer.setAttribute("data-position", "left");
      } else if (preset === "top-right") {
        searchContainer.style.top = `${pos.top}px`;
        searchContainer.style.right = `${pos.right}px`;
        searchContainer.setAttribute("data-position", "right");
      } else if (preset === "top-center") {
        searchContainer.style.top = `${pos.top}px`;
        searchContainer.style.left = "50%";
        searchContainer.style.transform = "translateX(-50%)";
        searchContainer.setAttribute("data-position", "center");
      } else if (preset === "bottom-left") {
        searchContainer.style.bottom = `${pos.bottom}px`;
        searchContainer.style.left = `${pos.left}px`;
        searchContainer.setAttribute("data-position", "left");
      } else if (preset === "bottom-right") {
        searchContainer.style.bottom = `${pos.bottom}px`;
        searchContainer.style.right = `${pos.right}px`;
        searchContainer.setAttribute("data-position", "right");
      } else if (preset === "center") {
        searchContainer.style.top = "50%";
        searchContainer.style.left = "50%";
        searchContainer.style.transform = "translate(-50%, -50%)";
        searchContainer.setAttribute("data-position", "center");
      } else {
        // Custom position - use whatever values are provided
        searchContainer.style.top = pos.top !== null ? `${pos.top}px` : "";
        searchContainer.style.right = pos.right !== null ? `${pos.right}px` : "";
        searchContainer.style.left = pos.left !== null ? `${pos.left}px` : "";
        searchContainer.style.bottom = pos.bottom !== null ? `${pos.bottom}px` : "";
        // Set position attribute based on provided values
        if (pos.left !== null && pos.right === null) {
          searchContainer.setAttribute("data-position", "left");
        } else if (pos.left !== null && pos.left === "50%") {
          searchContainer.setAttribute("data-position", "center");
        } else {
          searchContainer.setAttribute("data-position", "right");
        }
      }

      // Set width from config
      const searchWidth =
        _config.appearance.searchWidth || _config.searchBar.width || 350;
      searchContainer.style.width = `${searchWidth}px`;
    }

    // Apply theme customization if configured
    if (_config.theme) {
      // Remove existing theme classes
      searchContainer.classList.remove(
        "light-theme",
        "dark-theme",
        "high-contrast",
        "low-contrast",
      );

      // Apply custom class if provided
      if (_config.theme.customClass) {
        searchContainer.classList.add(_config.theme.customClass);
      }

      // Apply theme based on configuration or system preference
      if (_config.theme.useDarkMode === true) {
        searchContainer.classList.add("dark-theme");
      } else if (_config.theme.useDarkMode === false) {
        searchContainer.classList.add("light-theme");
      } else if (_config.theme.useSystemPreference) {
        // Don't add classes, rely on CSS media queries
      }

      // Apply contrast mode if specified
      if (_config.theme.contrastMode === "high") {
        searchContainer.classList.add("high-contrast");
      } else if (_config.theme.contrastMode === "low") {
        searchContainer.classList.add("low-contrast");
      }

      // Apply animation speed if specified
      if (_config.theme.animation && _config.theme.animation.speed) {
        searchContainer.setAttribute(
          "data-animation-speed",
          _config.theme.animation.speed,
        );
      }

      // Apply animation type if specified
      if (_config.theme.animation && _config.theme.animation.type) {
        searchContainer.setAttribute(
          "data-animation-type",
          _config.theme.animation.type,
        );
      }

      // NEW: Apply typography settings if configured
      if (_config.theme.typography) {
        const typography = _config.theme.typography;

        // Set font size data attribute
        if (typography.fontSize) {
          let fontSizeClass = "medium";
          if (typography.fontSize <= 14) fontSizeClass = "small";
          else if (typography.fontSize >= 18) fontSizeClass = "large";
          searchContainer.setAttribute("data-font-size", fontSizeClass);
        }
      }
    }

    // Clean up any existing style elements
    const existingStyle = document.getElementById("search-custom-vars");
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create new style element
    const styleElement = document.createElement("style");
    styleElement.id = "search-custom-vars";

    // Generate CSS variables from config
    const colors = _config.appearance.colors;

    // NEW: Get typography settings
    const typography =
      _config.theme && _config.theme.typography ? _config.theme.typography : {};
    const fontFamily =
      typography.fontFamily ||
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const fontSize = typography.fontSize || 16;
    const letterSpacing = typography.letterSpacing || 0;

    // NEW: Get search width and results max height
    const searchWidth =
      _config.appearance.searchWidth || _config.searchBar.width || 350;
    const resultsMaxHeight = _config.appearance.searchResults?.maxHeight || 500;

    // Ensure subtitle color is applied via CSS variable
const subtitleColor = _config.appearance?.colors?.resultSubtitle || "#64748b";
const tagColor = _config.appearance?.colors?.tagTextColor || "#64748b";

const cssVars = `
    :root {
        --search-background: ${colors.searchBackground};
        --search-text: ${colors.searchText};
        --placeholder-text: ${colors.placeholderText};
        --search-icon: ${colors.searchIcon};
        --clear-icon: ${colors.clearIcon};
        --results-background: ${colors.resultsBackground};
        --group-header-color: ${colors.groupHeaderColor};
        --group-count-color: ${colors.groupCountColor};
        --result-hover: ${colors.resultHover};
        --result-border-left: ${colors.resultBorderLeft};
        --result-text: ${colors.resultText};
        --result-subtitle: ${subtitleColor};
        --result-subtitle-color: ${subtitleColor};
        --result-icon-color: ${colors.resultIconColor};
        --result-subtext-color: ${colors.resultSubtextColor};
        --tag-text-color: ${tagColor};
        
        /* Typography variables */
        --font-family: ${fontFamily};
        --font-size: ${fontSize}px;
        --letter-spacing: ${letterSpacing}px;
        
        /* Size variables */
        --search-width: ${searchWidth}px;
        --results-max-height: ${resultsMaxHeight}px;
    }
    
    /* Direct tag styling with !important */
    #searchContainer .result-tags { 
        color: ${tagColor} !important; 
    }
    #searchContainer .result-tags * { 
        color: ${tagColor} !important; 
    }
    
    /* Force subtitle color with higher specificity */
    .result-subtitle, 
    .result-description,
    .result-subtext,
    #searchContainer .result-subtitle,
    #searchContainer .result-description,
    #searchContainer .result-subtext {
        color: var(--result-subtitle) !important;
    }
`;

    // Generate responsive positioning CSS
    const positionCSS =
      isMobile && _config.searchBar.useResponsive
        ? `
                /* Mobile positioning */
                #searchContainer {
                    position: fixed;
                    top: ${_config.searchBar.mobilePosition.top}px;
                    left: ${_config.searchBar.mobilePosition.left}px;
                    right: ${_config.searchBar.mobilePosition.right}px;
                    width: calc(100% - ${_config.searchBar.mobilePosition.left * 2}px);
                    z-index: 9999;
                }
            `
        : `
                /* Desktop positioning */
                #searchContainer {
                    position: fixed;
                    ${_config.searchBar.position.top !== null ? `top: ${_config.searchBar.position.top}px;` : ""}
                    ${_config.searchBar.position.right !== null ? `right: ${_config.searchBar.position.right}px;` : ""}
                    ${_config.searchBar.position.left !== null ? `left: ${_config.searchBar.position.left}px;` : ""}
                    ${_config.searchBar.position.bottom !== null ? `bottom: ${_config.searchBar.position.bottom}px;` : ""}
                    width: ${_config.appearance.searchWidth || _config.searchBar.width || 350}px;
                    z-index: 9999;
                }
            `;

    // Display options CSS
    const displayCSS = `
            /* Group headers visibility */
            ${
              !_config.display.showGroupHeaders
                ? `
            #searchContainer .results-group .group-header .group-title {
                display: none;
            }
            
            #searchContainer .results-group .group-header {
                justify-content: flex-end;
                padding-right: 10px;
                padding-top: 6px;
                padding-bottom: 4px;
            }
            
            #searchContainer .results-group {
                margin-top: 5px;
            }
            `
                : ""
            }
            
            /* Group count visibility */
            ${
              !_config.display.showGroupCount
                ? `
            #searchContainer .group-count {
                display: none;
            }
            `
                : ""
            }
            
            /* Icons visibility in results */
            ${
              !_config.display.showIconsInResults
                ? `
            #searchContainer .result-icon,
            #searchContainer .search-result-icon,
            #searchContainer .result-item .result-icon {
                display: none;
            }
            `
                : ""
            }
            
            /* Tags visibility in results */
            .result-tags {
                display: ${_config.showTagsInResults ? "block" : "none"};
            }
            
            /* Subtitles visibility in results */
            .result-subtitle, 
            .result-description {
                display: ${_config.display.showSubtitlesInResults !== false ? "block" : "none"};
            }
            
            /* NEW: Apply typography settings */
            #searchContainer {
                font-family: var(--font-family);
                font-size: var(--font-size);
                letter-spacing: var(--letter-spacing);
            }
            
            /* NEW: Apply max results height */
            #searchContainer .search-results,
            #searchContainer .results-section {
                max-height: var(--results-max-height);
            }
        `;

    // Border radius for search field and results
    const fieldRadius = _config.appearance.searchField.borderRadius;
    const resultsRadius = _config.appearance.searchResults.borderRadius;

    const borderRadiusCSS = `
            /* Search field border radius */
            #searchContainer .search-field {
                border-top-left-radius: ${Math.min(fieldRadius.topLeft, 50)}px;
                border-top-right-radius: ${Math.min(fieldRadius.topRight, 50)}px;
                border-bottom-right-radius: ${Math.min(fieldRadius.bottomRight, 50)}px;
                border-bottom-left-radius: ${Math.min(fieldRadius.bottomLeft, 50)}px;
            }
            
            /* Search results border radius */
            #searchContainer .search-results {
                border-top-left-radius: ${Math.min(resultsRadius.topLeft, 10)}px;
                border-top-right-radius: ${Math.min(resultsRadius.topRight, 10)}px;
                border-bottom-right-radius: ${Math.min(resultsRadius.bottomRight, 10)}px;
                border-bottom-left-radius: ${Math.min(resultsRadius.bottomLeft, 10)}px;
            }
        `;

    // Combine all styles and add to document
    styleElement.textContent =
      cssVars + positionCSS + displayCSS + borderRadiusCSS;
    document.head.appendChild(styleElement);

    // Apply placeholder text to search input
    const searchInput = searchContainer.querySelector("#tourSearch");
    if (searchInput) {
      searchInput.placeholder = _config.searchBar.placeholder;

      // Add accessibility attributes
      searchInput.setAttribute("aria-label", "Search tour");
      searchInput.setAttribute("role", "searchbox");
      searchInput.setAttribute("aria-autocomplete", "list");
    }

    Logger.info("Search styling applied successfully");
  }
  // End of _applySearchStyling()

  // ====================================
  // FUNCTION: _initializeSearch()
  // Purpose: Initializes the search system and prepares the search index.
  // Parameters: tour (object) - The tour instance to initialize search for.
  // Returns: None
  // ====================================
  function _initializeSearch(tour) {
    Logger.info("Initializing enhanced search v2.0...");
    window.tourInstance = tour;

    // Prevent duplicate initialization
    if (window.searchListInitialized || window.searchListInitiinitialized) {
      Logger.info("Search already initialized, skipping...");
      return;
    }

    // Validate requirements
    const searchContainer = document.getElementById("searchContainer");
    if (!searchContainer) {
      Logger.error("Search container not found, cannot initialize search");
      return;
    }

    if (!tour || !tour.mainPlayList) {
      Logger.error(
        "Tour or mainPlayList not available, cannot initialize search",
      );
      return;
    }

    // Load saved configuration from localStorage
    try {
      // Create storage manager and load saved config using the same key as settings.html
      const storageManager = new StorageManager("searchPro.config");
      const savedConfig = storageManager.load();

      // If saved config exists, apply it to the search system
      if (savedConfig) {
        Logger.info("[SearchPro] Loaded saved configuration from storage.");
        // Update current config with saved values
        _config = _updateConfig(savedConfig);
      }
    } catch (error) {
      const suggestionPrompt = `
            [SearchPro Error Debugging Request]
            - Error Message: ${error.message}
            - Stack Trace: ${error.stack}
            - URL: ${window.location.href}
            - User Agent: ${navigator.userAgent}
            - Context: Search Pro - Load Saved Configuration
            ➔ Suggest possible causes and fixes:
            `;
      console.log(suggestionPrompt);
    }

    // Storage Manager class definition (inline to avoid external dependencies)
    function StorageManager(key = "searchPro.config") {
      this.storageKey = key;

      this.save = function (data) {
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(data));
          return true;
        } catch (e) {
          console.error("[SearchPro] Failed to save settings:", e);
          return false;
        }
      };

      this.load = function () {
        try {
          const saved = localStorage.getItem(this.storageKey);
          return saved ? JSON.parse(saved) : null;
        } catch (e) {
          console.error("[SearchPro] Failed to load settings:", e);
          return null;
        }
      };
    }

    // Helper function to update config with deep merge
    function _updateConfig(newConfig) {
      if (!newConfig || typeof newConfig !== "object") {
        return _config;
      }

      // Deep merge function
      function deepMerge(target, source) {
        // Handle null/undefined values
        if (!source) return target;
        if (!target) return source;

        for (const key in source) {
          // Skip prototype properties and undefined values
          if (
            !Object.prototype.hasOwnProperty.call(source, key) ||
            source[key] === undefined
          ) {
            continue;
          }

          // Deep merge for objects that aren't arrays
          if (
            source[key] &&
            typeof source[key] === "object" &&
            !Array.isArray(source[key])
          ) {
            // Create empty target object if needed
            if (!target[key] || typeof target[key] !== "object") {
              target[key] = {};
            }

            // Recurse for nested objects
            deepMerge(target[key], source[key]);
          } else {
            // Direct assignment for primitives and arrays
            target[key] = source[key];
          }
        }

        return target;
      }

      return deepMerge(_config, newConfig);
    }

    // Add ARIA attributes to container
    searchContainer.setAttribute("role", "search");
    searchContainer.setAttribute("aria-label", "Tour search");

    // Create search UI components if needed
    _createSearchInterface(searchContainer);

    // Core search state
    let currentSearchTerm = "";
    let fuse = null;

    // Initialize search index
    const prepareFuse = () => {
      try {
        const items = tour.mainPlayList.get("items");
        if (!items || !Array.isArray(items) || items.length === 0) {
          throw new Error("Tour playlist items not available or empty");
        }

        const fuseData = [];
        const filterMode = _config.filter.mode;
        const allowedValues = _config.filter.allowedValues || [];
        const blacklistedValues = _config.filter.blacklistedValues || [];
        const allowedMediaIndexes = _config.filter.allowedMediaIndexes || [];
        const blacklistedMediaIndexes =
          _config.filter.blacklistedMediaIndexes || [];

        // Process each panorama in the tour
        items.forEach((item, index) => {
          try {
            // Get media data safely
            const media = item.get("media");
            if (!media) {
              Logger.warn(`No media found for item at index ${index}`);
              return;
            }

            // Get panorama metadata
            const data = _safeGetData(media);
            const label = data?.label?.trim() || "";
            const subtitle = data?.subtitle?.trim() || "";

            // Apply content filtering
            if (
              !_shouldIncludePanorama(
                label,
                subtitle,
                data?.tags,
                index,
                filterMode,
                allowedValues,
                blacklistedValues,
                allowedMediaIndexes,
                blacklistedMediaIndexes,
              )
            ) {
              return;
            }

            // Determine display label for the panorama
            const displayLabel = _getDisplayLabel(label, subtitle, data?.tags);

            // Add panorama to search index
            fuseData.push({
              type: "Panorama",
              index,
              label: displayLabel,
              originalLabel: label,
              subtitle: subtitle,
              tags: Array.isArray(data?.tags) ? data.tags : [],
              item,
              boost: label ? 1.5 : 1.0,
            });

            // Process overlay elements (hotspots, etc.)
            const overlays = _getOverlays(media, tour, item);
            _processOverlays(overlays, fuseData, index, displayLabel);
          } catch (error) {
            Logger.warn(`Error processing item at index ${index}:`, error);
          }
        });

        // Create Fuse.js search index

        fuse = new Fuse(fuseData, {
          keys: [
            { name: "label", weight: 2.0 },
            { name: "subtitle", weight: 1.5 },
            { name: "tags", weight: 1.0 },
            { name: "parentLabel", weight: 0.7 },
            { name: "description", weight: 0.5 },
          ],
          includeScore: true, // Add this back
          threshold: 0.3,
          distance: 40, // Add this back
          ignoreLocation: true,
          useExtendedSearch: true,
          includeMatches: true,
          minMatchCharLength: 2,
        });

        Logger.info(`Indexed ${fuseData.length} items for search`);
      } catch (error) {
        const suggestionPrompt = `
                [SearchPro Error Debugging Request]
                - Error Message: ${error.message}
                - Stack Trace: ${error.stack}
                - URL: ${window.location.href}
                - User Agent: ${navigator.userAgent}
                - Context: Search Pro - Prepare Fuse Index
                ➔ Suggest possible causes and fixes:
                `;
        console.log(suggestionPrompt);

        // Create an empty fuse instance as fallback
        fuse = new Fuse([], {
          keys: ["label"],
          includeScore: true,
        });
      }
    };

    // Helper for safely getting object data
    function _safeGetData(obj) {
      if (!obj) return {};

      try {
        if (obj.data) return obj.data;
        if (typeof obj.get === "function") {
          return obj.get("data") || {};
        }
        return {};
      } catch (e) {
        Logger.debug("Error getting data:", e);
        return {};
      }
    }

    // Helper to check if a panorama should be included
    function _shouldIncludePanorama(
      label,
      subtitle,
      tags,
      index,
      filterMode,
      allowedValues,
      blacklistedValues,
      allowedMediaIndexes,
      blacklistedMediaIndexes,
    ) {
      // Apply whitelist/blacklist filters
      if (filterMode === "whitelist") {
        if (label) {
          if (!allowedValues.includes(label)) {
            if (!subtitle || !allowedValues.includes(subtitle)) return false;
          }
        } else {
          if (subtitle && !allowedValues.includes(subtitle)) return false;
        }
      } else if (filterMode === "blacklist") {
        if (label && blacklistedValues.includes(label)) return false;
        if (subtitle && blacklistedValues.includes(subtitle)) return false;
      }

      // For completely blank items
      const hasTags = Array.isArray(tags) && tags.length > 0;
      if (!label && !subtitle && !hasTags) {
        // Check media index filtering
        if (filterMode === "whitelist" && allowedMediaIndexes.length > 0) {
          if (!allowedMediaIndexes.includes(index)) return false;
        }
        if (filterMode === "blacklist" && blacklistedMediaIndexes.length > 0) {
          if (blacklistedMediaIndexes.includes(index)) return false;
        }
        if (!_config.includeContent.completelyBlank) return false;
      }

      // Skip unlabeled items based on configuration
      if (!label) {
        const hasSubtitle = Boolean(subtitle);

        const shouldInclude =
          (hasSubtitle && _config.includeContent.unlabeledWithSubtitles) ||
          (hasTags && _config.includeContent.unlabeledWithTags) ||
          (!hasSubtitle && !hasTags && _config.includeContent.completelyBlank);

        if (!shouldInclude) return false;
      }

      return true;
    }

    // Helper to get display label
    function _getDisplayLabel(label, subtitle, tags) {
      if (_config.display.onlySubtitles && subtitle) {
        return subtitle;
      }

      if (!label) {
        if (subtitle && _config.useAsLabel.subtitles) {
          return subtitle;
        }

        if (Array.isArray(tags) && tags.length > 0 && _config.useAsLabel.tags) {
          return tags.join(", ");
        }

        if (_config.useAsLabel.elementType) {
          return "Panorama";
        }

        return _config.useAsLabel.customText;
      }

      return label;
    }

    // Helper to get overlays from multiple sources
    function _getOverlays(media, tour, item) {
      const overlays = [];
      const overlayDetectionMethods = [
        // Method 1: media.get('overlays')
        () => {
          try {
            const mediaOverlays = media.get("overlays");
            if (Array.isArray(mediaOverlays) && mediaOverlays.length > 0) {
              return mediaOverlays;
            }
          } catch (e) {
            Logger.debug("Method 1 overlay detection failed:", e);
          }
          return null;
        },

        // Method 2: media.overlays
        () => {
          try {
            if (Array.isArray(media.overlays) && media.overlays.length > 0) {
              return media.overlays;
            }
          } catch (e) {
            Logger.debug("Method 2 overlay detection failed:", e);
          }
          return null;
        },

        // Method 3: item's overlays directly
        () => {
          try {
            if (Array.isArray(item.overlays) && item.overlays.length > 0) {
              return item.overlays;
            }
          } catch (e) {
            Logger.debug("Method 3 overlay detection failed:", e);
          }
          return null;
        },

        // Method 4: overlaysByTags
        () => {
          try {
            if (typeof media.get === "function") {
              const tagOverlays = media.get("overlaysByTags");
              if (tagOverlays && typeof tagOverlays === "object") {
                const result = [];
                Object.values(tagOverlays).forEach((tagGroup) => {
                  if (Array.isArray(tagGroup)) {
                    result.push(...tagGroup);
                  }
                });
                if (result.length > 0) {
                  return result;
                }
              }
            }
          } catch (e) {
            Logger.debug("Method 4 overlay detection failed:", e);
          }
          return null;
        },

        // Method 5: Look for child elements in the tour.player
        () => {
          try {
            if (
              tour.player &&
              typeof tour.player.getByClassName === "function"
            ) {
              const allOverlays = tour.player.getByClassName("PanoramaOverlay");
              if (Array.isArray(allOverlays) && allOverlays.length > 0) {
                // Filter to only get overlays that belong to this panorama
                return allOverlays.filter((overlay) => {
                  try {
                    const parentMedia = overlay.get("media");
                    return (
                      parentMedia && parentMedia.get("id") === media.get("id")
                    );
                  } catch (e) {
                    return false;
                  }
                });
              }
            }
          } catch (e) {
            Logger.debug("Method 5 overlay detection failed:", e);
          }
          return null;
        },
      ];

      // Try each method in sequence
      for (const method of overlayDetectionMethods) {
        const result = method();
        if (result) {
          overlays.push(...result);
          break;
        }
      }

      return overlays;
    }

    // Process overlay elements
    function _processOverlays(overlays, fuseData, parentIndex, parentLabel) {
      if (!Array.isArray(overlays) || overlays.length === 0) {
        return;
      }

      overlays.forEach((overlay, overlayIndex) => {
        try {
          // Get overlay data safely
          const overlayData = _safeGetData(overlay);

          // Get overlay label
          let overlayLabel = "";
          if (overlayData.label) {
            overlayLabel = overlayData.label.trim();
          } else if (overlay.label) {
            overlayLabel = overlay.label.trim();
          } else if (typeof overlay.get === "function") {
            try {
              const label = overlay.get("label");
              if (label) overlayLabel = label.trim();
            } catch (e) {}
          }

          // If still no label, try to use other properties like text content
          if (!overlayLabel && typeof overlay.get === "function") {
            try {
              const textContent = overlay.get("text");
              if (textContent) {
                overlayLabel = textContent.substring(0, 30);
                if (textContent.length > 30) overlayLabel += "...";
              }
            } catch (e) {}
          }

          // Skip if empty label and configured to do so
          if (!overlayLabel && _config.includeContent.elements.skipEmptyLabels)
            return;

          // Get element type
          let elementType = _getElementType(overlay, overlayLabel);
          if (
            overlayLabel.includes("info-") ||
            overlayLabel.includes("info_")
          ) {
            elementType = "Hotspot";
          }

          // Apply element filtering
          const elementTags = Array.isArray(overlayData.tags)
            ? overlayData.tags
            : [];
          if (!_shouldIncludeElement(elementType, overlayLabel, elementTags)) {
            return;
          }

          // Get element ID safely
          let elementId = null;
          if (overlay.id) {
            elementId = overlay.id;
          } else if (typeof overlay.get === "function") {
            try {
              elementId = overlay.get("id");
            } catch (e) {}
          }

          // Create a fallback label if needed
          let displayLabel = overlayLabel;
          if (!displayLabel) {
            displayLabel = `${elementType} ${parentIndex}.${overlayIndex}`;
          }

          // Add to search data
          fuseData.push({
            type: elementType,
            label: displayLabel,
            tags: elementTags,
            parentIndex: parentIndex,
            parentLabel: parentLabel,
            id: elementId,
            boost: 0.8,
          });
        } catch (overlayError) {
          Logger.warn(
            `Error processing overlay at index ${overlayIndex}:`,
            overlayError,
          );
        }
      });
    }

    // Create the search UI components if not present
    function _createSearchInterface(container) {
      // Create search field if missing
      if (!container.querySelector("#tourSearch")) {
        const searchField = document.createElement("div");
        searchField.className = "search-field";
        searchField.innerHTML = `
                    <input type="text" id="tourSearch" placeholder="${_config.searchBar.placeholder}" 
                          autocomplete="off" aria-label="Search tour" role="searchbox" aria-autocomplete="list">
                    <div class="icon-container">
                        <!-- UPDATED: Added SVG content to search icon -->
                        <div class="search-icon" aria-hidden="true">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </div>
                        <button class="clear-button" aria-label="Clear search">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                `;
        container.insertBefore(searchField, container.firstChild);
      }

      // Create search results container if missing
      if (!container.querySelector(".search-results")) {
        const resultsContainer = document.createElement("div");
        resultsContainer.className = "search-results";
        resultsContainer.setAttribute("role", "listbox");
        resultsContainer.setAttribute("aria-label", "Search results");

        // Add results section
        const resultsSection = document.createElement("div");
        resultsSection.className = "results-section";
        resultsContainer.appendChild(resultsSection);

        // Add no-results message
        const noResults = document.createElement("div");
        noResults.className = "no-results";
        noResults.innerHTML = "<p>No results found</p>";
        resultsContainer.appendChild(noResults);

        container.appendChild(resultsContainer);
      }
    }

    // Text highlighting with improved safety
    /**
     * Highlights search term matches in a text string
     * @param {string} text - Text to search within
     * @param {string} term - Search term to highlight
     * @returns {string} HTML string with highlighted matches
     */
    function highlightMatch(text, term) {
      // Guard against undefined or empty inputs
      if (!text || !term || typeof text !== "string") {
        return text || "";
      }

      try {
        // Sanitize search term for use in regex
        const sanitizedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // Create a case-insensitive regex for the term
        const regex = new RegExp(`(${sanitizedTerm})`, "gi");

        // Replace matches with marked version
        return text.replace(regex, '<mark class="search-highlight">$1</mark>');
      } catch (error) {
        const suggestionPrompt = `
                [SearchPro Error Debugging Request]
                - Error Message: ${error.message}
                - Stack Trace: ${error.stack}
                - URL: ${window.location.href}
                - User Agent: ${navigator.userAgent}
                - Context: Search Pro - Highlight Match
                ➔ Suggest possible causes and fixes:
                `;
        console.log(suggestionPrompt);
        return text;
      }
    }

    // If there is a legacy highlightMatches function, replace it with a wrapper for compatibility
    if (typeof highlightMatches === "function") {
      // Keep reference to the original function for potential fallback
      const originalHighlightMatches = highlightMatches;

      highlightMatches = function (text, term) {
        return highlightMatch(text, term);
      };
    }

    // Get icon HTML for element types
    const getTypeIcon = (type) => {
      const icons = {
        Panorama: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                              <circle cx="12" cy="10" r="3"></circle>
                          </svg>`,
        Hotspot: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                             <circle cx="12" cy="12" r="3"></circle>
                             <circle cx="12" cy="12" r="9"></circle>
                          </svg>`,
        Polygon: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                             <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>`,
        Video: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                           <rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect>
                           <polygon points="10 9 15 12 10 15" fill="currentColor"></polygon>
                        </svg>`,
        Webframe: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                              <rect x="2" y="2" width="20" height="16" rx="2" ry="2"></rect>
                              <line x1="2" y1="6" x2="22" y2="6"></line>
                           </svg>`,
        Image: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                           <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                           <circle cx="8.5" cy="8.5" r="1.5"></circle>
                           <path d="M21 15l-5-5L5 21"></path>
                        </svg>`,
        ProjectedImage: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                   <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                   <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                   <path d="M21 15l-5-5L5 21"></path>
                                   <line x1="3" y1="3" x2="21" y2="21"></line>
                                </svg>`,
        Text: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                          <line x1="4" y1="7" x2="20" y2="7"></line>
                          <line x1="4" y1="12" x2="20" y2="12"></line>
                          <line x1="4" y1="17" x2="14" y2="17"></line>
                       </svg>`,
        Element: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                             <circle cx="12" cy="12" r="9"></circle>
                          </svg>`,
      };

      // Return the icon for the specified type, or a default if not found
      return icons[type] || icons["Element"];
    };

    // Render search history
    const renderSearchHistory = () => {
      const history = _searchHistory.get();
      if (!history.length) return "";

      return `
                <div class="search-history">
                    <div class="history-header">
                        <h3>Recent Searches</h3>
                        <button class="clear-history" aria-label="Clear search history">Clear</button>
                    </div>
                    <div class="history-items" role="list">
                        ${history
                          .map(
                            (term) => `
                            <button class="history-item" role="listitem">
                                <svg class="history-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10s10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8s8 3.589-8-8-8 3.589-8-8zm1-8h4v2h-6V7h2v5z"/>
                                </svg>
                                ${term}
                            </button>
                        `,
                          )
                          .join("")}
                    </div>
                </div>
            `;
    };

    // Group and sort search results
    const groupAndSortResults = (matches) => {
      // Create object to hold grouped results
      const grouped = matches.reduce((acc, match) => {
        const type = match.item.type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(match);
        return acc;
      }, {});

      // Sort items within each group alphabetically
      Object.keys(grouped).forEach((type) => {
        grouped[type].sort((a, b) => {
          // Primary sort by label
          const labelCompare = a.item.label.localeCompare(b.item.label);
          if (labelCompare !== 0) return labelCompare;

          // Secondary sort by parent (if applicable)
          if (a.item.parentLabel && b.item.parentLabel) {
            return a.item.parentLabel.localeCompare(b.item.parentLabel);
          }

          return 0;
        });
      });

      return grouped;
    };
    // Begin performSearch()
    // Main search function with improved error handling
    const performSearch = () => {
      const searchContainer = document.getElementById("searchContainer");
      if (!searchContainer) {
        Logger.error("Search container not found");
        return;
      }

      const searchInput = searchContainer.querySelector("#tourSearch");
      const searchTerm = searchInput ? searchInput.value.trim() : "";
      const clearButton = searchContainer.querySelector(".clear-button");
      const searchIcon = searchContainer.querySelector(".search-icon");
      const resultsList = searchContainer.querySelector(".results-section");
      const noResults = searchContainer.querySelector(".no-results");
      const resultsContainer = searchContainer.querySelector(".search-results");

      if (!resultsContainer || !resultsList || !noResults) {
        Logger.error("Search UI components not found");
        return;
      }

      // Update UI based on search term
      if (searchTerm.length > 0) {
        if (clearButton) clearButton.classList.add("visible");
        if (searchIcon) searchIcon.style.opacity = "0";
      } else {
        if (clearButton) clearButton.classList.remove("visible");
        if (searchIcon) searchIcon.style.opacity = "1";
      }

      // Skip if search term hasn't changed
      if (searchTerm === currentSearchTerm) return;
      currentSearchTerm = searchTerm;

      // Reset results list
      resultsList.innerHTML = "";

      // Add accessibility attributes to results container
      resultsContainer.setAttribute("role", "listbox");
      resultsContainer.setAttribute("aria-live", "polite");
      resultsContainer.setAttribute("aria-atomic", "false");

      // Handle empty search - show history
      if (!searchTerm) {
        noResults.style.display = "none";
        resultsContainer.classList.remove("visible");
        resultsContainer.style.display = "none";
        resultsList.innerHTML = renderSearchHistory();
        return;
      }

      // Check minimum character requirement
      if (searchTerm !== "*" && searchTerm.length < _config.minSearchChars) {
        noResults.style.display = "none";
        resultsContainer.classList.remove("visible");
        resultsList.innerHTML = `
                    <div class="search-min-chars">
                        <p>Please type at least ${_config.minSearchChars} characters to search</p>
                    </div>
                `;
        return;
      }

      // Show results container with animation
      resultsContainer.style.display = "block";
      setTimeout(() => resultsContainer.classList.add("visible"), 10);

      try {
        // Ensure fuse index is initialized
        if (!fuse) {
          Logger.warn("Search index not initialized, preparing now...");
          prepareFuse();
        }

        // Perform search
        let matches;
        if (searchTerm === "*") {
          // Wildcard search shows all items
          matches = fuse._docs
            ? fuse._docs.map((item, index) => ({
                item,
                score: 0,
                refIndex: index,
              }))
            : [];
        } else {
          // Process search term for special characters
          const processedTerm = _preprocessSearchTerm(searchTerm);

          // Allow exact matching with = prefix
          if (
            typeof processedTerm === "string" &&
            processedTerm.startsWith("=")
          ) {
            matches = fuse.search({ $or: [{ label: processedTerm }] });
          } else {
            // Use regular fuzzy search
            matches = fuse.search(processedTerm);
          }
        }

        // Handle no results case
        if (!matches || !matches.length) {
          resultsList.style.display = "none";
          noResults.style.display = "flex";

          // Set accessibility label for no results
          resultsContainer.setAttribute(
            "aria-label",
            "No search results found",
          );
          return;
        }

        // Display results
        resultsList.style.display = "block";
        noResults.style.display = "none";

        // Set accessibility label based on number of matches
        resultsContainer.setAttribute(
          "aria-label",
          `Found ${matches.length} search results for "${searchTerm}"`,
        );

        // Group and sort results
        const groupedResults = groupAndSortResults(matches);

        // Apply type filtering based on config
        if (
          _config.filter.typeFilter?.mode === "whitelist" &&
          Array.isArray(_config.filter.typeFilter?.allowedTypes) &&
          _config.filter.typeFilter.allowedTypes.length > 0
        ) {
          // Only keep allowed result types
          Object.keys(groupedResults).forEach((type) => {
            if (!_config.filter.typeFilter.allowedTypes.includes(type)) {
              delete groupedResults[type];
            }
          });
        } else if (
          _config.filter.typeFilter?.mode === "blacklist" &&
          Array.isArray(_config.filter.typeFilter?.blacklistedTypes) &&
          _config.filter.typeFilter.blacklistedTypes.length > 0
        ) {
          // Remove blacklisted result types
          Object.keys(groupedResults).forEach((type) => {
            if (_config.filter.typeFilter.blacklistedTypes.includes(type)) {
              delete groupedResults[type];
            }
          });
        }

        // Keep track of result index for ARIA attributes
        let resultIndex = 0;

        // Render each group of results
        Object.entries(groupedResults).forEach(([type, results]) => {
          const groupEl = document.createElement("div");
          groupEl.className = "results-group";
          groupEl.setAttribute("data-type", type);
          groupEl.setAttribute("role", "group");
          groupEl.setAttribute("aria-label", `${type} results`);

          // Use custom label from config if available, otherwise use the original type
          const customLabel = _config.displayLabels[type] || type;

          // Create group header with custom label
          groupEl.innerHTML = `
                        <div class="group-header">
                            <span class="group-title">${customLabel}</span>
                            <span class="group-count">${results.length} result${results.length !== 1 ? "s" : ""}</span>
                        </div>
                    `;

          // Render each result item
          results.forEach((result) => {
            resultIndex++;
            const resultItem = document.createElement("div");
            resultItem.className = "result-item";
            resultItem.setAttribute("role", "option");
            resultItem.setAttribute("tabindex", "0");
            resultItem.setAttribute("aria-posinset", resultIndex);
            resultItem.setAttribute("aria-selected", "false");
            resultItem.dataset.type = result.item.type;

            if (result.item.id) {
              resultItem.dataset.id = result.item.id;
            }

            if (result.item.parentIndex !== undefined) {
              resultItem.dataset.parentIndex = result.item.parentIndex;
            }

            if (result.item.index !== undefined) {
              resultItem.dataset.index = result.item.index;
            }

            // Show parent info for child elements if configured to do so
            const parentInfo =
              result.item.type !== "Panorama" &&
              result.item.parentLabel &&
              _config.display.showParentInfo !== false
                ? `<div class="result-parent">in ${highlightMatch(result.item.parentLabel, searchTerm)}</div>`
                : "";

            // Build result item content
            resultItem.innerHTML = `
                        <div class="result-icon">${getTypeIcon(result.item.type)}</div>
                        <div class="result-content">
                            <div class="result-text">${highlightMatch(result.item.label, searchTerm)}</div>
                            ${parentInfo}
                            ${
                              result.item.tags &&
                              result.item.tags.length > 0 &&
                              _config.showTagsInResults
                                ? `
                                <div class="result-tags">
                                    Tags: ${highlightMatch(Array.isArray(result.item.tags) ? result.item.tags.join(", ") : result.item.tags, searchTerm)}
                                </div>
                            `
                                : ""
                            }
                            ${
                              !_config.display.onlySubtitles &&
                              result.item.subtitle &&
                              _config.display.showSubtitlesInResults !== false
                                ? `
                                <div class="result-description">${highlightMatch(result.item.subtitle, searchTerm)}</div>
                            `
                                : ""
                            }
                        </div>
                        `;

            // Add click handler with improved element triggering
            resultItem.addEventListener("click", () => {
              // Handle different element types
              if (result.item.type === "Panorama") {
                // Direct navigation for panoramas
                if (
                  tour &&
                  tour.mainPlayList &&
                  typeof result.item.index === "number"
                ) {
                  try {
                    tour.mainPlayList.set("selectedIndex", result.item.index);
                    Logger.info(
                      `Navigated to panorama at index ${result.item.index}`,
                    );
                  } catch (e) {
                    Logger.error(`Error navigating to panorama: ${e.message}`);
                  }
                }
              } else if (result.item.parentIndex !== undefined) {
                // For child elements, navigate to parent panorama first
                if (tour && tour.mainPlayList) {
                  try {
                    tour.mainPlayList.set(
                      "selectedIndex",
                      result.item.parentIndex,
                    );
                    Logger.info(
                      `Navigated to parent panorama at index ${result.item.parentIndex}`,
                    );

                    // Then trigger the element with retry logic
                    if (result.item.id) {
                      _triggerElement(tour, result.item.id, (success) => {
                        if (success) {
                          Logger.info(
                            `Successfully triggered element ${result.item.id}`,
                          );
                        } else {
                          Logger.warn(
                            `Failed to trigger element ${result.item.id}`,
                          );
                        }
                      });
                    }
                  } catch (e) {
                    Logger.error(
                      `Error navigating to parent panorama: ${e.message}`,
                    );
                  }
                }
              }

              // Save search term to history
              _searchHistory.save(searchTerm);

              // Clear search input
              if (searchInput) {
                searchInput.value = "";
                searchInput.focus();
              }

              // Auto-hide based on configuration
              const isMobile = window.innerWidth <= _config.mobileBreakpoint;
              if (
                (isMobile && _config.autoHide.mobile) ||
                (!isMobile && _config.autoHide.desktop)
              ) {
                _toggleSearch(false);
              }
            });

            // Add keyboard navigation
            resultItem.addEventListener("keydown", (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                resultItem.click();
              }
            });

            // Add to group
            groupEl.appendChild(resultItem);
          });

          // Add group to results list
          resultsList.appendChild(groupEl);
        });

        // Update ARIA attribute for total results
        resultsContainer.setAttribute("aria-setsize", resultIndex);
      } catch (error) {
        const suggestionPrompt = `
                [SearchPro Error Debugging Request]
                - Error Message: ${error.message}
                - Stack Trace: ${error.stack}
                - URL: ${window.location.href}
                - User Agent: ${navigator.userAgent}
                - Context: Search Pro - Perform Search
                ➔ Suggest possible causes and fixes:
                `;
        console.log(suggestionPrompt);

        // Show error message in results
        resultsList.innerHTML = `
                    <div class="search-error" role="alert">
                        <p>An error occurred while searching. Please try again.</p>
                        <p class="search-error-details">${error.message}</p>
                    </div>
                `;
        resultsContainer.setAttribute("aria-label", "Search error occurred");
      }
    };
    // Begin keyboardManager.init(searchContainer, searchInput, performSearch)
    // Set up keyboard navigation
    const keyboardManager = {
      init(searchContainer, searchInput, performSearch) {
        if (!searchContainer || !searchInput) {
          Logger.error("Invalid parameters for keyboard manager");
          return;
        }

        let selectedIndex = -1;
        let resultItems = [];

        // Update the selected item in the results
        const updateSelection = (newIndex) => {
          resultItems = searchContainer.querySelectorAll(".result-item");

          if (!resultItems.length) return;

          // Clear previous selection
          if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
            resultItems[selectedIndex].classList.remove("selected");
            resultItems[selectedIndex].setAttribute("aria-selected", "false");
          }

          // Set new selection with wrapping behavior
          if (newIndex < 0) {
            // Wrap to the last item when going up from the first
            selectedIndex = resultItems.length - 1;
          } else if (newIndex >= resultItems.length) {
            // Wrap to the first item when going down from the last
            selectedIndex = 0;
          } else {
            selectedIndex = newIndex;
          }

          if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
            const selectedItem = resultItems[selectedIndex];
            selectedItem.classList.add("selected");
            selectedItem.setAttribute("aria-selected", "true");
            selectedItem.scrollIntoView({
              block: "nearest",
              behavior: "smooth",
            });
            selectedItem.focus();
          } else {
            searchInput.focus();
          }
        };

        // Global keyboard shortcuts
        document.addEventListener("keydown", (e) => {
          // Ctrl/Cmd + K to open search
          if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            _toggleSearch(true);
          }

          // Skip if search isn't visible
          if (!searchContainer.classList.contains("visible")) return;

          switch (e.key) {
            case "Escape":
              e.preventDefault();
              // Clear search or hide if already empty
              if (searchInput.value.trim() !== "") {
                searchInput.value = "";
                performSearch();
                selectedIndex = -1;
                searchInput.focus();
              } else {
                _toggleSearch(false);
              }
              break;

            case "ArrowDown":
              e.preventDefault();
              // With wrapping behavior, no need for Math.min
              updateSelection(selectedIndex + 1);
              break;

            case "ArrowUp":
              e.preventDefault();
              // With wrapping behavior, no need for Math.max
              updateSelection(selectedIndex - 1);
              break;

            case "Enter":
              if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
                e.preventDefault();
                resultItems[selectedIndex].click();
              }
              break;

            case "Tab":
              // Reset selection when tabbing away
              selectedIndex = -1;
              break;
          }
        });

        // Reset selection when input changes
        searchInput.addEventListener(
          "keyup",
          _debounce(() => {
            selectedIndex = -1;
          }, 200),
        );

        // Handle Enter key in search input
        searchInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            // Click first result if available
            setTimeout(() => {
              resultItems = searchContainer.querySelectorAll(".result-item");
              if (resultItems.length > 0) {
                resultItems[0].click();
              }
            }, 100);
          } else if (e.key === "Escape") {
            // Handle Escape directly in the input field for better responsiveness
            e.preventDefault();
            if (searchInput.value.trim() !== "") {
              searchInput.value = "";
              performSearch();
            } else {
              _toggleSearch(false);
            }
          }
        });
      },
    };

    // Prepare the search index
    prepareFuse();

    // Apply search styling
    _applySearchStyling();

    // Apply custom CSS for showing/hiding tags
    let styleElement = document.getElementById("search-custom-styles");
    if (styleElement) {
      styleElement.remove();
    }

    styleElement = document.createElement("style");
    styleElement.id = "search-custom-styles";
    styleElement.textContent = `.result-tags { display: ${_config.showTagsInResults ? "block" : "none"}; }`;
    document.head.appendChild(styleElement);

    // Get key elements
    const searchInput = searchContainer.querySelector("#tourSearch");
    const clearButton = searchContainer.querySelector(".clear-button");

    // Bind input event with debounce
    if (searchInput) {
      searchInput.addEventListener("input", _debounce(performSearch, 150));

      // Special handling for mobile touch events
      if ("ontouchstart" in window) {
        searchInput.addEventListener("touchend", (e) => {
          searchInput.focus();
        });
      }
    }

    // Bind clear button
    if (clearButton) {
      clearButton.addEventListener("click", (e) => {
        e.stopPropagation();
        if (searchInput) {
          searchInput.value = "";
          performSearch();
          searchInput.focus();
        }

        // If on mobile, also close the search completely if configured
        if (
          window.innerWidth <= _config.mobileBreakpoint &&
          _config.autoHide.mobile
        ) {
          _toggleSearch(false);
        }
      });
    }

    // Bind search icon for wildcard search
    const searchIcon = searchContainer.querySelector(".search-icon");
    if (searchIcon) {
      searchIcon.style.cursor = "pointer";
      searchIcon.addEventListener("click", () => {
        if (searchInput) {
          searchInput.value = "*";
          performSearch();
        }
      });
    }

    // Close search when clicking outside
    document.addEventListener("click", (e) => {
      // Skip if search isn't visible
      if (!searchContainer.classList.contains("visible")) return;

      // Close if click is outside search container
      if (!searchContainer.contains(e.target)) {
        _toggleSearch(false);
      }
    });

    // Special mobile handling
    if ("ontouchstart" in window) {
      document.addEventListener("touchstart", (e) => {
        if (
          searchContainer.classList.contains("visible") &&
          !searchContainer.contains(e.target)
        ) {
          _toggleSearch(false);
        }
      });
    }

    // Set up keyboard navigation
    keyboardManager.init(searchContainer, searchInput, performSearch);

    // Bind history-related click events
    searchContainer.addEventListener("click", (e) => {
      // Handle history item clicks
      if (e.target.closest(".history-item")) {
        const term = e.target.closest(".history-item").textContent.trim();
        if (searchInput) {
          searchInput.value = term;
          performSearch();
        }
      }

      // Handle clear history button
      if (e.target.closest(".clear-history")) {
        _searchHistory.clear();
        performSearch();
      }
    });

    // Mark initialization as complete
    window.searchListInitialized = true;
    window.searchListInitiinitialized = true;
    _initialized = true;
    Logger.info("Enhanced search initialized successfully");

    // Apply window resize handler for styling
    window.addEventListener(
      "resize",
      _debounce(() => {
        _applySearchStyling();
      }, 250),
    );
  }

  // Toggle search visibility with improved transitions
  function _toggleSearch(show) {
    const searchContainer = document.getElementById("searchContainer");
    if (!searchContainer) {
      Logger.error("Search container not found");
      return;
    }

    // Get elements
    const resultsContainer = searchContainer.querySelector(".search-results");
    const searchInput = searchContainer.querySelector("#tourSearch");
    const clearButton = searchContainer.querySelector(".clear-button");
    const searchIcon = searchContainer.querySelector(".search-icon");

    // Show search
    if (show) {
      // Update display before animation
      searchContainer.style.display = "block";

      // Set ARIA expanded state
      searchContainer.setAttribute("aria-expanded", "true");

      // Ensure it's within viewport bounds
      const viewportHeight = window.innerHeight;
      const searchContainerRect = searchContainer.getBoundingClientRect();
      const searchContainerTop = searchContainerRect.top;
      const searchContainerHeight = searchContainerRect.height;

      // Adjust position if needed to keep within viewport
      if (searchContainerTop + searchContainerHeight > viewportHeight) {
        const newTop = Math.max(
          10,
          viewportHeight - searchContainerHeight - 20,
        );
        searchContainer.style.top = newTop + "px";
      }

      // Trigger animation on next frame
      requestAnimationFrame(() => {
        searchContainer.classList.add("visible");

        // Focus input field
        if (searchInput) {
          searchInput.focus();
          searchInput.dispatchEvent(new Event("input"));
        }
      });
    } else {
      // Hide search
      searchContainer.classList.remove("visible");

      // Set ARIA expanded state
      searchContainer.setAttribute("aria-expanded", "false");

      // Hide results immediately
      if (resultsContainer) {
        resultsContainer.classList.remove("visible");
        resultsContainer.style.display = "none";
      }

      // Clean up after animation
      setTimeout(() => {
        // Hide container
        searchContainer.style.display = "none";

        // Reset input and UI
        if (searchInput) {
          searchInput.value = "";
          searchInput.blur();
        }

        if (clearButton) {
          clearButton.classList.remove("visible");
        }

        if (searchIcon) {
          searchIcon.style.opacity = "1";
        }

        // Clear results
        const resultsList = searchContainer.querySelector(".results-section");
        if (resultsList) {
          resultsList.innerHTML = "";
        }

        // Hide any error messages
        const noResults = searchContainer.querySelector(".no-results");
        if (noResults) {
          noResults.style.display = "none";
        }
      }, 200); // Match the CSS transition duration
    }
  }

  // Helper function for deep merge
  function deepMerge(target, source) {
    if (!source || typeof source !== "object") return target;
    for (const key in source) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      const srcVal = source[key];
      const tgtVal = target[key];

      if (Array.isArray(srcVal)) {
        target[key] = [...srcVal];
      } else if (typeof srcVal === "object" && srcVal !== null) {
        if (!tgtVal || typeof tgtVal !== "object") {
          target[key] = {};
        }
        deepMerge(target[key], srcVal);
      } else {
        target[key] = srcVal;
      }
    }
    return target;
  }

  function _fixPositionConflicts(config) {
    if (!config || !config.searchBar) return config;

    // Fix desktop position conflicts
    const pos = config.searchBar.position;
    if (pos) {
      if (pos.left !== null && pos.right !== null) {
        console.warn("[SearchPro] Position conflict: both left and right set. Prioritizing right.");
        pos.left = null;
      }
      if (pos.top !== null && pos.bottom !== null) {
        console.warn("[SearchPro] Position conflict: both top and bottom set. Prioritizing top.");
        pos.bottom = null;
      }
    }

    // Fix mobile position conflicts
    const mobilePos = config.searchBar.mobilePosition;
    if (mobilePos) {
      if (mobilePos.left !== null && mobilePos.right !== null) {
        console.warn("[SearchPro] Mobile position conflict: both left and right set. Prioritizing right.");
        mobilePos.left = null;
      }
      if (mobilePos.top !== null && mobilePos.bottom !== null) {
        console.warn("[SearchPro] Mobile position conflict: both top and bottom set. Prioritizing top.");
        mobilePos.bottom = null;
      }
    }

    return config;
  }

// ====================================
// PUBLIC API
// Purpose: Exposes methods for initializing and interacting with the search system.
// ====================================
  return {
   // ====================================
  // METHOD: initializeSearch()
  // Purpose: Initializes the search system.
  // Parameters: tour (object) - The tour instance to initialize search for.
  // Returns: None
  // ====================================
    initializeSearch: function (tour) {
      _initializeSearch(tour);
    },

    // Toggle search visibility
    toggleSearch: function (show) {
      _toggleSearch(show);
    },

    // Update configuration with deep merge
    updateConfig: function (newConfig) {
      if (newConfig && typeof newConfig === "object") {
        _config = deepMerge(_config, newConfig);
        _applySearchStyling();
        if (_initialized && window.tourInstance) {
          _initializeSearch(window.tourInstance);
        }
      }
      return _config;
    },

    // Get current config (clone to prevent direct modification)
    getConfig: function () {
      return { ..._config };
    },

    // Rebuild search index
    rebuildSearchIndex: function () {
      try {
        Logger.info("Rebuilding search index...");
        fuse = null;
        if (window.tourInstance) {
          prepareFuse();
          return true;
        }
        return false;
      } catch (e) {
        Logger.error("Failed to rebuild search index:", e);
        return false;
      }
    },

    // Search history management
    searchHistory: {
      get: function () {
        return _searchHistory.get();
      },
      clear: function () {
        return _searchHistory.clear();
      },
      save: function (term) {
        return _searchHistory.save(term);
      },
    },

    // Logging control
    setLogLevel: function (level) {
      if (typeof level === "number" && level >= 0 && level <= 4) {
        Logger.level = level;
        return true;
      }
      return false;
    },

    // Utility functions (exposed for potential extension)
    utils: {
      debounce: _debounce,
      getElementType: _getElementType,
      triggerElement: _triggerElement,
    },
  };
})();

// Make search available globally
window.searchFunctions = window.tourSearchFunctions;
