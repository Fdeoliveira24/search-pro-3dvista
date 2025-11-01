/*
====================================
3DVista Enhanced Search Script - debug-core-v3.js
Version: 3.1
Last Updated: 10/31/2025 - Search Pro Configuration Loading - Technical Reference - Race Condition Fix
Description: Search Pro Debug Utilities
 * Comprehensive diagnostics for search features including business data and Google Sheets integration
 */

// [1.0] DEBUG CORE MODULE

// [1.0.1] Centralized Logger Implementation
window.Logger = {
  level: 2, // 0=none, 1=error, 2=warn, 3=info, 4=debug
  useColors: true,
  prefix: "[Search]",

  // Color styles for different log types
  styles: {
    debug: "color: #6c757d", // gray
    info: "color: #17a2b8", // cyan
    warn: "color: #ffc107", // yellow
    error: "color: #dc3545", // red
  },

  // Format a message with optional prefix
  _formatMessage: function (message, logType) {
    // If message is already a string and has the prefix, don't add it again
    if (typeof message === "string" && message.includes(this.prefix)) {
      return message;
    }
    return `${this.prefix} ${logType}: ${message}`;
  },

  debug: function (message, ...args) {
    if (this.level >= 4) {
      if (this.useColors && window.chrome) {
        console.debug(`%c${this._formatMessage(message, "DEBUG")}`, this.styles.debug, ...args);
      } else {
        console.debug(this._formatMessage(message, "DEBUG"), ...args);
      }
    }
  },

  info: function (message, ...args) {
    if (this.level >= 3) {
      if (this.useColors && window.chrome) {
        console.info(`%c${this._formatMessage(message, "INFO")}`, this.styles.info, ...args);
      } else {
        console.info(this._formatMessage(message, "INFO"), ...args);
      }
    }
  },

  warn: function (message, ...args) {
    if (this.level >= 2) {
      if (this.useColors && window.chrome) {
        console.warn(`%c${this._formatMessage(message, "WARN")}`, this.styles.warn, ...args);
      } else {
        console.warn(this._formatMessage(message, "WARN"), ...args);
      }
    }
  },

  error: function (message, ...args) {
    if (this.level >= 1) {
      if (this.useColors && window.chrome) {
        console.error(`%c${this._formatMessage(message, "ERROR")}`, this.styles.error, ...args);
      } else {
        console.error(this._formatMessage(message, "ERROR"), ...args);
      }
    }
  },

  // Helper for initializing with different logging levels
  setLevel: function (level) {
    if (typeof level === "number" && level >= 0 && level <= 4) {
      const oldLevel = this.level;
      this.level = level;
      this.info(`Logger level changed from ${oldLevel} to ${level}`);
      return true;
    }
    return false;
  },

  // Helper to enable/disable colored output
  setColorMode: function (useColors) {
    this.useColors = !!useColors;
    this.info(`Logger color mode set to ${this.useColors}`);
  },

  // Force a log regardless of level
  _log: function (message, ...args) {
    console.log(message, ...args);
  },

  // For structured logs like tables
  table: function (data, columns) {
    if (this.level >= 3) {
      console.table(data, columns);
    }
  },

  // For grouped logs
  group: function (label) {
    if (this.level >= 3) {
      console.group(label);
    }
  },

  groupCollapsed: function (label) {
    if (this.level >= 3) {
      console.groupCollapsed(label);
    }
  },

  groupEnd: function () {
    if (this.level >= 3) {
      console.groupEnd();
    }
  },
};
(() => {
  console.log("🔧 [Search Pro] Debug v2.0 Loaded");

  // [1.1] CORE DIAGNOSTICS FUNCTIONS
  // [1.1.1] Main entry point for diagnostics
  function runDiagnostics() {
    const report = generateDebugReport();
    printDebugSummary(report);
    observeSearchPanel();

    // [1.1.1.1] Return report object for potential use in other tools
    return report;
  }

  // [1.1.2] Main report generator
  function generateDebugReport() {
    const searchFunctions = window.tourSearchFunctions || window.searchFunctions;
    const container = document.getElementById("searchContainer");
    const tourObj = searchFunctions?.__tour || window.tourInstance;
    const stored = localStorage.getItem("searchPro.config");
    const config = searchFunctions?.getConfig?.() || {};
    const lastUpdate = localStorage.getItem("searchPro.configUpdated");

    // Build comprehensive diagnostic report
    const report = {
      timestamp: new Date().toISOString(),
      browser: navigator.userAgent,
      windowSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },

      // Core module status
      searchPro: {
        version: searchFunctions?.version || "n/a",
        buildDate: searchFunctions?.buildDate || "n/a",
        initialized: !!window.searchListInitialized,
        initTime: window.searchInitTime || "n/a",
        tourDetected: !!tourObj,
        tourName: tourObj?.name || "n/a",
        methods: {
          initializeSearch: typeof searchFunctions?.initializeSearch === "function",
          toggleSearch: typeof searchFunctions?.toggleSearch === "function",
          updateConfig: typeof searchFunctions?.updateConfig === "function",
          getConfig: typeof searchFunctions?.getConfig === "function",
          getSearchIndex: typeof searchFunctions?.getSearchIndex === "function",
        },
      },

      // DOM status section
      dom: {
        searchContainer: !!container,
        searchContainerVisible: container?.style.display === "block",
        resultsContainer: !!container?.querySelector(".search-results"),
        searchInput: !!document.getElementById("tourSearch"),
        resultCount: container ? container.querySelectorAll(".result-item").length : 0,
        businessResults: container
          ? container.querySelectorAll(".result-item[data-business='true']").length
          : 0,
        sheetsResults: container
          ? container.querySelectorAll(".result-item[data-sheets='true']").length
          : 0,
        stylesLoaded:
          !!document.querySelector("link[href*='search-v3.css']") ||
          !!document.querySelector("style[data-source='search-pro-v3']"),
      }, // It must match the same search-pro-v3 directory and file name

      // Configuration flags
      config: {
        raw: config,
        businessDataEnabled: config.businessData?.useBusinessData || true, // Check if business data is enabled
        businessDataFile: config.businessData?.businessDataFile || "n/a",
        businessDataDir: config.businessData?.businessDataDir || "n/a",
        googleSheetsEnabled: config.googleSheets?.useGoogleSheetData || false, // Check if Google Sheets is enabled
        googleSheetUrl: config.googleSheets?.googleSheetUrl || "n/a",
        googleSheetFetchMode: config.googleSheets?.fetchMode || "n/a",
        googleSheetAsDataSource: config.googleSheets?.useAsDataSource || false, // Check if Google Sheets is used as a data source
        cachingEnabled: config.googleSheets?.caching?.enabled || false,
        cachingTimeout: config.googleSheets?.caching?.timeoutMinutes || 0,
        progressiveLoadingEnabled: config.googleSheets?.progressiveLoading?.enabled || false,
        authEnabled: config.googleSheets?.authentication?.enabled || false,
        minSearchChars: config.minSearchChars || 2,
        showTagsInResults: config.showTagsInResults || false,
      },

      // Data sources section
      dataSources: getDataSourceStats(searchFunctions),

      // Search index diagnostics
      searchIndex: getSearchIndexStats(searchFunctions),

      // Storage and persistence

      localStorage: {
        available: (() => {
          try {
            localStorage.setItem("__test__", "test");
            localStorage.removeItem("__test__");
            return true;
          } catch (e) {
            return false;
          }
        })(),
        config: stored ? JSON.parse(stored) : "n/a",
        lastUpdated: lastUpdate ? new Date(parseInt(lastUpdate, 10)).toISOString() : "n/a",
        cacheStatus: getCacheStatus(),
      },
    };

    console.groupCollapsed("🔍 SEARCH PRO DIAGNOSTIC REPORT");
    console.table(report);
    console.log("📦 Full Report:", report);
    console.groupEnd();

    return report;
  }

  // [1.2] DATA SOURCE DIAGNOSTICS
  /**
   * [1.2.1] Get statistics about data sources (Business data and Google Sheets)
   */
  function getDataSourceStats(searchFunctions) {
    // Initial empty state
    const stats = {
      businessData: {
        enabled: false,
        source: "none",
        loaded: false,
        recordCount: 0,
        lastLoaded: "n/a",
        matchedElements: 0,
        unmatchedEntries: 0,
        sampleEntries: [],
        errors: [],
      },
      googleSheets: {
        enabled: false,
        url: "n/a",
        loaded: false,
        recordCount: 0,
        lastFetched: "n/a",
        lastParsed: "n/a",
        matchedElements: 0,
        unmatchedEntries: 0,
        sampleEntries: [],
        errors: [],
        cacheStatus: "n/a",
      },
    };

    // If search functions not available, return default stats
    if (!searchFunctions) return stats;

    // Get internal data if available through debug accessors
    const config = searchFunctions.getConfig?.() || {};
    const businessData = searchFunctions._getBusinessData?.() || [];
    const sheetsData = searchFunctions._getGoogleSheetsData?.() || [];

    // Business data stats
    if (config.businessData?.useBusinessData) {
      stats.businessData.enabled = true;
      stats.businessData.source = "local JSON";
      stats.businessData.loaded = businessData.length > 0;
      stats.businessData.recordCount = businessData.length;
      stats.businessData.lastLoaded = window.businessDataLoadTime || "unknown";

      // Sample entries (up to 3)
      stats.businessData.sampleEntries = businessData.slice(0, 3);

      // Matching stats if available
      if (searchFunctions._getBusinessDataMatchStats) {
        const matchStats = searchFunctions._getBusinessDataMatchStats() || {};
        stats.businessData.matchedElements = matchStats.matched || 0;
        stats.businessData.unmatchedEntries = matchStats.unmatched || 0;
      }
    }

    // Google Sheets stats
    if (config.googleSheets?.useGoogleSheetData) {
      stats.googleSheets.enabled = true;
      stats.googleSheets.url = config.googleSheets.googleSheetUrl;
      stats.googleSheets.loaded = sheetsData.length > 0;
      stats.googleSheets.recordCount = sheetsData.length;
      stats.googleSheets.lastFetched = window.sheetsDataFetchTime || "unknown";
      stats.googleSheets.lastParsed = window.sheetsDataParseTime || "unknown";

      // Sample entries (up to 3)
      stats.googleSheets.sampleEntries = sheetsData.slice(0, 3);

      // Check for recent errors
      if (window.sheetsDataErrors) {
        stats.googleSheets.errors = window.sheetsDataErrors;
      }

      // Matching stats if available
      if (searchFunctions._getGoogleSheetsMatchStats) {
        const matchStats = searchFunctions._getGoogleSheetsMatchStats() || {};
        stats.googleSheets.matchedElements = matchStats.matched || 0;
        stats.googleSheets.unmatchedEntries = matchStats.unmatched || 0;
      }

      // Cache status
      if (config.googleSheets.caching?.enabled) {
        const key = config.googleSheets.caching.storageKey || "tourGoogleSheetsData";
        const timestamp = localStorage.getItem(`${key}_timestamp`);
        if (timestamp) {
          const age = (Date.now() - parseInt(timestamp, 10)) / (1000 * 60); // minutes
          stats.googleSheets.cacheStatus = {
            exists: true,
            ageMinutes: age.toFixed(1),
            expired: age > (config.googleSheets.caching.timeoutMinutes || 60),
          };
        } else {
          stats.googleSheets.cacheStatus = { exists: false };
        }
      }
    }

    return stats;
  }

  /**
   * [1.2.2] Get statistics about the search index
   */
  function getSearchIndexStats(searchFunctions) {
    // Default empty state
    const stats = {
      totalEntries: 0,
      elementTypes: {},
      businessOverrides: 0,
      sheetsOverrides: 0,
      fallbackLabels: 0,
      sampleEntries: [],
      examples: {
        standard: null,
        business: null,
        sheets: null,
      },
    };

    // If search functions not available, return default stats
    if (!searchFunctions) return stats;

    // Try to get search index data
    const indexData = searchFunctions.getSearchIndex?.() || [];
    stats.totalEntries = indexData.length;

    // Count by element type
    indexData.forEach((entry) => {
      const type = entry.type || "unknown";
      stats.elementTypes[type] = (stats.elementTypes[type] || 0) + 1;

      // Count data source overrides
      if (entry.businessName) stats.businessOverrides++;
      if (entry.sheetsData) stats.sheetsOverrides++;
      if (entry.useFallbackLabel) stats.fallbackLabels++;

      // Collect examples of different entry types
      if (!stats.examples.standard && !entry.businessName && !entry.sheetsData) {
        stats.examples.standard = { ...entry };
      }
      if (!stats.examples.business && entry.businessName) {
        stats.examples.business = { ...entry };
      }
      if (!stats.examples.sheets && entry.sheetsData) {
        stats.examples.sheets = { ...entry };
      }
    });

    // Get sample entries for deeper inspection
    stats.sampleEntries = indexData.slice(0, 5);

    return stats;
  }

  // [1.3] STORAGE AND CACHE DIAGNOSTICS
  /**
   * [1.3.1] Get local storage cache status for various features
   */
  function getCacheStatus() {
    const cacheItems = [];

    // Check for known cache keys
    const knownKeys = [
      "tourGoogleSheetsData",
      "searchPro.config",
      "searchPro.history",
      "searchPro.favorites",
      "businessData",
    ];

    knownKeys.forEach((key) => {
      try {
        const value = localStorage.getItem(key);
        const timestamp = localStorage.getItem(`${key}_timestamp`);

        if (value) {
          const size = value.length;
          const item = { key, exists: true, sizeBytes: size };

          if (timestamp) {
            const age = (Date.now() - parseInt(timestamp, 10)) / (1000 * 60); // minutes
            item.ageMinutes = age.toFixed(1);
          }

          cacheItems.push(item);
        }
      } catch (e) {
        cacheItems.push({ key, error: e.message });
      }
    });

    return cacheItems;
  }

  // [1.4] REPORTING AND DISPLAY
  /**
   * [1.4.1] Print formatted debug summary to console
   */
  function printDebugSummary(report) {
    console.group("🔍 Search Pro Debug Summary");

    // Core status
    console.groupCollapsed("📊 CORE STATUS");
    console.log(
      `Search Pro v${report.searchPro.version} (${report.searchPro.initialized ? "initialized" : "not initialized"})`
    );
    console.log(
      `Tour detected: ${report.searchPro.tourDetected ? "yes" : "no"} (${report.searchPro.tourName})`
    );
    console.log(`Browser: ${report.browser}`);
    console.log(`Window: ${report.windowSize.width}×${report.windowSize.height}`);
    console.table(report.searchPro.methods);
    console.groupEnd();

    // Configuration
    console.groupCollapsed("⚙️ CONFIGURATION");
    console.log("Active configuration:", report.config);
    console.log(`Business data: ${report.config.businessDataEnabled ? "enabled" : "disabled"}`);
    console.log(`Google Sheets: ${report.config.googleSheetsEnabled ? "enabled" : "disabled"}`);
    if (report.config.googleSheetsEnabled) {
      console.log(`  URL: ${report.config.googleSheetUrl}`);
      console.log(`  Mode: ${report.config.googleSheetFetchMode}`);
      console.log(`  Use as data source: ${report.config.googleSheetAsDataSource ? "yes" : "no"}`);
      console.log(
        `  Caching: ${report.config.cachingEnabled ? "enabled" : "disabled"} (${report.config.cachingTimeout}min)`
      );
      console.log(
        `  Progressive loading: ${report.config.progressiveLoadingEnabled ? "enabled" : "disabled"}`
      );
      console.log(`  Authentication: ${report.config.authEnabled ? "enabled" : "disabled"}`);
    }
    console.groupEnd();

    // Data sources
    console.groupCollapsed("📂 DATA SOURCES");

    // Business data
    if (report.dataSources.businessData.enabled) {
      console.groupCollapsed("Business Data");
      console.log(`Source: ${report.dataSources.businessData.source}`);
      console.log(`Records: ${report.dataSources.businessData.recordCount}`);
      console.log(`Last loaded: ${report.dataSources.businessData.lastLoaded}`);
      console.log(`Matched elements: ${report.dataSources.businessData.matchedElements}`);
      console.log(`Unmatched entries: ${report.dataSources.businessData.unmatchedEntries}`);

      if (report.dataSources.businessData.sampleEntries.length > 0) {
        console.log("Sample entries:", report.dataSources.businessData.sampleEntries);
      }

      console.groupEnd();
    } else {
      console.log("Business data: disabled");
    }

    // Google Sheets
    if (report.dataSources.googleSheets.enabled) {
      console.groupCollapsed("Google Sheets Data");
      console.log(`URL: ${report.dataSources.googleSheets.url}`);
      console.log(`Records: ${report.dataSources.googleSheets.recordCount}`);
      console.log(`Last fetched: ${report.dataSources.googleSheets.lastFetched}`);
      console.log(`Matched elements: ${report.dataSources.googleSheets.matchedElements}`);
      console.log(`Unmatched entries: ${report.dataSources.googleSheets.unmatchedEntries}`);

      if (report.dataSources.googleSheets.cacheStatus !== "n/a") {
        console.log("Cache status:", report.dataSources.googleSheets.cacheStatus);
      }

      if (report.dataSources.googleSheets.errors.length > 0) {
        console.warn("Errors:", report.dataSources.googleSheets.errors);
      }

      if (report.dataSources.googleSheets.sampleEntries.length > 0) {
        console.log("Sample entries:", report.dataSources.googleSheets.sampleEntries);
      }

      console.groupEnd();
    } else {
      console.log("Google Sheets: disabled");
    }

    console.groupEnd(); // Data sources

    // Search index
    console.groupCollapsed("🔍 SEARCH INDEX");
    console.log(`Total entries: ${report.searchIndex.totalEntries}`);
    console.log("Element types:", report.searchIndex.elementTypes);
    console.log(`Business overrides: ${report.searchIndex.businessOverrides}`);
    console.log(`Google Sheets overrides: ${report.searchIndex.sheetsOverrides}`);
    console.log(`Fallback labels: ${report.searchIndex.fallbackLabels}`);

    // Show examples by type
    if (report.searchIndex.examples.standard) {
      console.groupCollapsed("Example: Standard Entry");
      console.log(report.searchIndex.examples.standard);
      console.groupEnd();
    }

    if (report.searchIndex.examples.business) {
      console.groupCollapsed("Example: Business Data Entry");
      console.log(report.searchIndex.examples.business);
      console.groupEnd();
    }

    if (report.searchIndex.examples.sheets) {
      console.groupCollapsed("Example: Google Sheets Entry");
      console.log(report.searchIndex.examples.sheets);
      console.groupEnd();
    }

    console.groupEnd(); // Search index

    // DOM & UI
    console.groupCollapsed("🖥️ DOM & UI");
    console.log(`Search container: ${report.dom.searchContainer ? "found" : "missing"}`);
    console.log(`Search visible: ${report.dom.searchContainerVisible ? "yes" : "no"}`);
    console.log(`Results container: ${report.dom.resultsContainer ? "found" : "missing"}`);
    console.log(`Search input: ${report.dom.searchInput ? "found" : "missing"}`);
    console.log(`Current results: ${report.dom.resultCount}`);
    console.log(`Business results: ${report.dom.businessResults}`);
    console.log(`Google Sheets results: ${report.dom.sheetsResults}`);
    console.log(`Styles loaded: ${report.dom.stylesLoaded ? "yes" : "no"}`);
    console.groupEnd(); // DOM & UI

    // Storage
    console.groupCollapsed("💾 STORAGE");
    console.log(`LocalStorage available: ${report.localStorage.available ? "yes" : "no"}`);
    console.log(`Config last updated: ${report.localStorage.lastUpdated}`);
    console.log("Cache status:", report.localStorage.cacheStatus);
    console.groupEnd(); // Storage

    // Full report
    console.groupCollapsed("📋 FULL REPORT");
    console.log(report);
    console.groupEnd(); // Full report

    console.groupEnd(); // Main group

    // Return a simple text summary
    return `Search Pro v${report.searchPro.version} | Business Data: ${report.config.businessDataEnabled ? "enabled" : "disabled"} | Google Sheets: ${report.config.googleSheetsEnabled ? "enabled" : "disabled"} | Index items: ${report.searchIndex.totalEntries}`;
  }

  // [1.5] MONITORING AND OBSERVERS
  /**
   * [1.5.1] Set up observers to monitor search panel events
   */
  function observeSearchPanel() {
    const container = document.getElementById("searchContainer");
    if (!container) {
      console.warn("Cannot observe search panel - container not found");
      return;
    }

    // Report when search is toggled
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "style") {
          const isVisible = container.style.display === "block";
          console.log(
            `🔍 Search Panel ${isVisible ? "shown" : "hidden"} at ${new Date().toLocaleTimeString()}`
          );

          // If visible, log current result stats
          if (isVisible) {
            const totalResults = container.querySelectorAll(".result-item").length;
            const businessResults = container.querySelectorAll(
              ".result-item[data-business='true']"
            ).length;
            const sheetsResults = container.querySelectorAll(
              ".result-item[data-sheets='true']"
            ).length;
            console.log(
              `Current results: ${totalResults} (${businessResults} business, ${sheetsResults} sheets)`
            );
          }
        }
      });
    });

    observer.observe(container, { attributes: true });
    console.log("💢 Search panel observer active");

    // Also observe the results container for changes
    const resultsContainer = container?.querySelector(".search-results");
    if (resultsContainer) {
      const resultsObserver = new MutationObserver((mutations) => {
        // When results are updated
        const searchInput = document.getElementById("tourSearch");
        const searchTerm = searchInput ? searchInput.value : "";
        const totalResults = container.querySelectorAll(".result-item").length;

        if (searchTerm && totalResults > 0) {
          console.log(`Search results for "${searchTerm}": ${totalResults} items`);
        }
      });

      resultsObserver.observe(resultsContainer, { childList: true });
    }
  }

  // [1.6] GLOBAL EXPORTS AND INITIALIZATION
  // [1.6.1] Expose debug tools globally
  // [Moved from search-01.js _toggleSearch] Logs diagnostics for toggleSearch
  function logToggleDiagnostics(searchContainer) {
    try {
      const resultsContainer = searchContainer
        ? searchContainer.querySelector(".search-results")
        : null;
      const resultsSection = searchContainer
        ? searchContainer.querySelector(".results-section")
        : null;
      const noResults = searchContainer ? searchContainer.querySelector(".no-results") : null;
      // Log display/visibility/background
      if (searchContainer) {
        const cs = getComputedStyle(searchContainer);
        console.log(
          "[DIAG] [toggleSearch:before] searchContainer display:",
          cs.display,
          "visibility:",
          cs.visibility,
          "background:",
          cs.background,
          searchContainer.style.background,
          "classes:",
          searchContainer.className,
          "HTML:",
          searchContainer.outerHTML
        );
      }
      if (resultsContainer) {
        const cs = getComputedStyle(resultsContainer);
        console.log(
          "[DIAG] [toggleSearch:before] resultsContainer display:",
          cs.display,
          "visibility:",
          cs.visibility,
          "background:",
          cs.background,
          resultsContainer.style.background,
          "classes:",
          resultsContainer.className,
          "HTML:",
          resultsContainer.outerHTML
        );
      }
      if (resultsSection) {
        const cs = getComputedStyle(resultsSection);
        console.log(
          "[DIAG] [toggleSearch:before] resultsSection display:",
          cs.display,
          "visibility:",
          cs.visibility,
          "background:",
          cs.background,
          resultsSection.style.background,
          "classes:",
          resultsSection.className,
          "innerHTML:",
          resultsSection.innerHTML
        );
      }
      // Count duplicate/detached containers
      const allSearchContainers = document.querySelectorAll("#searchContainer");
      console.log(
        "[DIAG] [toggleSearch:before] Number of #searchContainer elements:",
        allSearchContainers.length
      );
      allSearchContainers.forEach((el, i) => {
        if (!document.body.contains(el)) {
          console.warn(
            `[DIAG] [toggleSearch:before] Detached #searchContainer[${i}]`,
            el.outerHTML
          );
        }
      });
    } catch (err) {
      console.error("[DIAG] [toggleSearch:before] Diagnostics error:", err);
    }
  }

  /**
   * [1.9] TOUR TAG EXTRACTION - Enhanced tag discovery across all possible locations
   * This function finds all tags in the tour using multiple detection methods
   */
  function extractTourTags() {
    console.group("🏷️ Tour Tags Extraction (Enhanced)");

    if (!window.tour?.player) {
      console.error("Tour or player not initialized.");
      console.groupEnd();
      return null;
    }

    try {
      // Initialize tag collections
      const allTags = new Set();
      const tagsByType = {
        panorama: {},
        hotspot: {},
        container: {},
        other: {},
      };

      console.log("Scanning panoramas...");
      const playlists = window.tour.player.getByClassName("PlayList") || [];

      // Check if search plugin tag data is available
      const searchFunctions = window.tourSearchFunctions || window.searchFunctions;
      const searchIndex = searchFunctions?.getSearchIndex?.();

      if (searchIndex && searchIndex.length > 0) {
        console.log(`Found search index with ${searchIndex.length} entries, checking for tags...`);

        searchIndex.forEach((item) => {
          if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
            console.log(
              `Found tags in search index for ${item.id || item.label}: ${item.tags.join(", ")}`
            );

            item.tags.forEach((tag) => {
              allTags.add(tag);

              // Categorize by element type
              const type = item.type || "unknown";
              const targetCategory = type.toLowerCase().includes("panorama")
                ? "panorama"
                : type.toLowerCase().includes("hotspot")
                  ? "hotspot"
                  : "other";

              if (!tagsByType[targetCategory][tag]) tagsByType[targetCategory][tag] = [];
              tagsByType[targetCategory][tag].push({
                id: item.id,
                label: item.label,
                source: "search_index",
              });
            });
          }
        });
      }

      // Extended scanning with multiple property paths
      playlists.forEach((playlist) => {
        const items = playlist.get("items") || [];
        items.forEach((item) => {
          const media = item.get("media");
          if (!media) return;

          const mediaId = media.get("id");
          const mediaLabel = media.get("label") || media.get("data")?.label || mediaId;
          const mediaType = media.get("class") || "unknown";

          // Check multiple paths for tags
          const possibleTagPaths = [
            media.get("tags"), // Standard location
            media.get("data")?.tags, // In data object
            media.get("metadata")?.tags, // In metadata
            media.get("searchTags"), // Custom search tags
            media.get("properties")?.tags, // In properties
          ];

          // Process tags from any path
          possibleTagPaths.forEach((tagSource) => {
            let mediaTags = tagSource;

            // Handle string tags (convert CSV to array)
            if (typeof mediaTags === "string") {
              mediaTags = mediaTags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
            }

            // Process array tags
            if (mediaTags && Array.isArray(mediaTags) && mediaTags.length > 0) {
              mediaTags.forEach((tag) => {
                if (tag) {
                  allTags.add(tag);

                  if (mediaType === "Panorama") {
                    if (!tagsByType.panorama[tag]) tagsByType.panorama[tag] = [];
                    tagsByType.panorama[tag].push({
                      id: mediaId,
                      label: mediaLabel,
                    });
                  } else {
                    if (!tagsByType.other[tag]) tagsByType.other[tag] = [];
                    tagsByType.other[tag].push({
                      id: mediaId,
                      label: mediaLabel,
                      type: mediaType,
                    });
                  }
                }
              });
            }
          });

          // Check hotspots with enhanced tag paths
          if (mediaType === "Panorama") {
            const overlays = media.get("overlays") || [];
            overlays.forEach((overlay) => {
              const hotspotId = overlay.get("id");
              const hotspotData = overlay.get("data");
              const hotspotLabel = hotspotData?.label || hotspotId;

              const possibleHotspotTagPaths = [
                overlay.get("tags"),
                overlay.get("data")?.tags,
                overlay.get("userData")?.tags,
                overlay.get("properties")?.tags,
              ];

              possibleHotspotTagPaths.forEach((tagSource) => {
                let hotspotTags = tagSource;

                // Handle string tags
                if (typeof hotspotTags === "string") {
                  hotspotTags = hotspotTags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean);
                }

                if (hotspotTags && Array.isArray(hotspotTags) && hotspotTags.length > 0) {
                  hotspotTags.forEach((tag) => {
                    if (tag) {
                      allTags.add(tag);
                      if (!tagsByType.hotspot[tag]) tagsByType.hotspot[tag] = [];
                      tagsByType.hotspot[tag].push({
                        id: hotspotId,
                        label: hotspotLabel,
                        panoramaId: mediaId,
                        panoramaLabel: mediaLabel,
                      });
                    }
                  });
                }
              });
            });
          }
        });
      });

      // Check business data as a tag source
      console.log("Checking for business data tags...");
      const businessData = searchFunctions?._getBusinessData?.() || [];
      if (businessData.length > 0) {
        console.log(`Found ${businessData.length} business data entries`);
        businessData.forEach((entry) => {
          if (entry.tags && Array.isArray(entry.tags) && entry.tags.length > 0) {
            const elementId = entry.id;
            const elementLabel = entry.name || entry.label || elementId;

            entry.tags.forEach((tag) => {
              if (tag) {
                allTags.add(tag);
                if (!tagsByType.other[tag]) tagsByType.other[tag] = [];
                tagsByType.other[tag].push({
                  id: elementId,
                  label: elementLabel,
                  type: "business_data",
                });
              }
            });
          }
        });
      }

      // Output results
      const tagsList = Array.from(allTags).sort();

      console.log(`Found ${tagsList.length} unique tags in the tour:`);
      console.table(tagsList);

      // Return the results for potential use in other scripts
      const result = {
        allTags: tagsList,
        tagsByType: tagsByType,
        count: tagsList.length,
        searchIndex: {
          available: !!searchIndex,
          count: searchIndex?.length || 0,
        },
        businessData: {
          available: businessData.length > 0,
          count: businessData.length,
        },
      };

      console.log("✅ Tag extraction complete. Results available in returned object.");
      console.groupEnd(); // Tour Tags Extraction

      // Add to window for easy access
      window.tourTags = result;
      console.log("📋 Access results through window.tourTags");

      return result;
    } catch (error) {
      console.error("Error extracting tour tags:", error);
      console.groupEnd();
      return null;
    }
  }

  /**
   * [1.11] BUSINESS DATA MATCHING DIAGNOSTICS
   * Debug logging system for business data integration
   */
  function debugBusinessMatching(enabled = true) {
    if (!enabled) return;

    console.group("🔍 Business Data Matching Diagnostics");

    // Fix: Get business data directly from the search functions module
    const searchFunctions = window.tourSearchFunctions || window.searchFunctions;
    const businessData = window._businessData || []; // Try accessing global first

    // If no global business data, try to get it from the search functions
    const foundBusinessData =
      businessData.length > 0
        ? businessData
        : searchFunctions && typeof searchFunctions._getBusinessData === "function"
          ? searchFunctions._getBusinessData()
          : searchFunctions && searchFunctions._businessData
            ? searchFunctions._businessData
            : [];

    if (!foundBusinessData || foundBusinessData.length === 0) {
      console.warn("⚠️ No business data available");
      console.log("Data sources checked:");
      console.log("  - window._businessData:", !!window._businessData);
      console.log(
        "  - searchFunctions._getBusinessData():",
        !!(searchFunctions && typeof searchFunctions._getBusinessData === "function")
      );
      console.log(
        "  - searchFunctions._businessData:",
        !!(searchFunctions && searchFunctions._businessData)
      );
    } else {
      console.log(`✅ Found ${foundBusinessData.length} business data entries`);
      // Display sample entries
      foundBusinessData.slice(0, 5).forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.name || "Unnamed"} (ID: ${entry.id})`);
      });
    }

    // Log all panoramas in tour
    if (window.tour && window.tour.player) {
      const panoramas = window.tour.player.getByClassName("Panorama");
      console.groupCollapsed("🖼️ Tour Panoramas");
      panoramas.forEach((pano, idx) => {
        const panoData = pano.get("data") || {};
        console.log(
          `${idx + 1}. ${panoData.label || "Unnamed"} (ID: ${pano.get("id")}, Tags: ${(panoData.tags || []).join(",")}`
        );
      });
      console.groupEnd();

      // Perform matching analysis
      if (businessData && businessData.length && panoramas.length) {
        console.groupCollapsed("🧩 Matching Analysis");

        let matchedCount = 0;
        let unmatchedPanoramas = [];
        let unmatchedBusinessData = [...businessData];

        // Check each panorama for potential matches
        panoramas.forEach((pano, idx) => {
          const panoData = pano.get("data") || {};
          const panoId = pano.get("id");
          const panoLabel = panoData.label || "";
          const panoTags = panoData.tags || [];

          console.group(`Panorama: ${panoLabel || panoId}`);

          // Check all matching strategies
          let matched = false;
          let matchStrategy = "";
          let matchedEntry = null;

          // 1. Match by panorama name/label = business data ID
          const nameMatch = businessData.find(
            (entry) => entry.id && panoLabel && entry.id.toLowerCase() === panoLabel.toLowerCase()
          );

          if (nameMatch) {
            matched = true;
            matchStrategy = "Direct Name Match";
            matchedEntry = nameMatch;

            // Remove from unmatched list
            unmatchedBusinessData = unmatchedBusinessData.filter(
              (entry) => entry.id !== nameMatch.id
            );
          }

          // 2. Match by tag = business data ID
          if (!matched && panoTags.length) {
            const tagMatch = businessData.find(
              (entry) =>
                entry.id && panoTags.some((tag) => tag.toLowerCase() === entry.id.toLowerCase())
            );

            if (tagMatch) {
              matched = true;
              matchStrategy = "Tag Match";
              matchedEntry = tagMatch;

              // Remove from unmatched list
              unmatchedBusinessData = unmatchedBusinessData.filter(
                (entry) => entry.id !== tagMatch.id
              );
            }
          }

          // 3. Match by ID containing business data ID as substring
          if (!matched) {
            const idMatch = businessData.find(
              (entry) => entry.id && panoId && panoId.toLowerCase().includes(entry.id.toLowerCase())
            );

            if (idMatch) {
              matched = true;
              matchStrategy = "ID Substring Match";
              matchedEntry = idMatch;

              // Remove from unmatched list
              unmatchedBusinessData = unmatchedBusinessData.filter(
                (entry) => entry.id !== idMatch.id
              );
            }
          }

          // Log the result
          if (matched) {
            matchedCount++;
            console.log(`✅ Matched using ${matchStrategy}`);
            console.log(`Business data: ${matchedEntry.name} (${matchedEntry.id})`);
          } else {
            console.log("❌ No match found");
            unmatchedPanoramas.push({
              id: panoId,
              label: panoLabel,
              tags: panoTags,
            });
          }

          console.groupEnd();
        });

        // Summary
        console.log(
          `📈 Summary: ${matchedCount}/${panoramas.length} panoramas matched (${Math.round((matchedCount / panoramas.length) * 100)}%)`
        );

        // Log unmatched items
        if (unmatchedPanoramas.length) {
          console.groupCollapsed(`⚠️ ${unmatchedPanoramas.length} unmatched panoramas`);
          unmatchedPanoramas.forEach((item, idx) => {
            console.log(`${idx + 1}. ${item.label || item.id} (Tags: ${item.tags.join(",")})`);
          });
          console.groupEnd();
        }

        if (unmatchedBusinessData.length) {
          console.groupCollapsed(`⚠️ ${unmatchedBusinessData.length} unused business data entries`);
          unmatchedBusinessData.forEach((item, idx) => {
            console.log(`${idx + 1}. ${item.name || "Unnamed"} (ID: ${item.id})`);
          });
          console.groupEnd();
        }

        console.groupEnd(); // Matching Analysis
      }
    } else {
      console.log("⚠️ Tour or player not available");
    }

    console.groupEnd(); // Main group
  }

  // Add this to your debugBusinessMatching function:
  function testBusinessMatchForElement(elementData) {
    // Check if the main function exists and use it if available
    if (typeof window.searchFunctions?.findBusinessMatch === "function") {
      return window.searchFunctions.findBusinessMatch(elementData);
    }

    // Otherwise do a simplified matching check
    const businessData = window.searchFunctions?._getBusinessData?.() || [];
    if (!businessData.length) return null;

    // Do basic matching
    const name = elementData.name || "";
    const id = elementData.id || "";
    const tags = elementData.tags || [];

    // Try name match
    if (name) {
      const match = businessData.find((entry) => entry.id === name);
      if (match) return match;
    }

    // Try tag match
    for (const tag of tags) {
      const match = businessData.find((entry) => entry.id === tag);
      if (match) return match;
    }

    return null;
  }

  /**
   * Debug version of image path normalization function
   * This helps diagnose issues with image paths in the business data
   */
  function debugImagePaths(businessData) {
    console.group("🖼️ Image Path Normalization Debugging");

    if (!businessData || !Array.isArray(businessData)) {
      console.warn("No business data provided or invalid format");
      console.groupEnd();
      return [];
    }

    console.log(`Analyzing ${businessData.length} business data entries`);

    const results = businessData.map((entry) => {
      const result = { ...entry };

      // Process imageUrl
      if (result.imageUrl) {
        console.log(`[${result.id || "unnamed"}] Original imageUrl:`, result.imageUrl);

        // If it's already an absolute URL, return as is
        if (result.imageUrl.startsWith("http") || result.imageUrl.startsWith("//")) {
          console.log(`[${result.id || "unnamed"}] Using absolute imageUrl path:`, result.imageUrl);
        } else {
          // Handle relative paths - ensure they're based on the right root
          const baseUrl =
            window.location.origin +
            window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/"));

          // Remove any leading slash for clean joining
          const cleanPath = result.imageUrl.startsWith("/")
            ? result.imageUrl.substring(1)
            : result.imageUrl;
          const finalPath = `${baseUrl}/${cleanPath}`;

          console.log(`[${result.id || "unnamed"}] Normalized imageUrl path:`, finalPath);
          result.imageUrl = finalPath;
        }
      }

      // Process localImage
      if (result.localImage) {
        console.log(`[${result.id || "unnamed"}] Original localImage:`, result.localImage);

        // If it's already an absolute URL, return as is
        if (result.localImage.startsWith("http") || result.localImage.startsWith("//")) {
          console.log(
            `[${result.id || "unnamed"}] Using absolute localImage path:`,
            result.localImage
          );
        } else {
          // Handle relative paths - ensure they're based on the right root
          const baseUrl =
            window.location.origin +
            window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/"));

          // Remove any leading slash for clean joining
          const cleanPath = result.localImage.startsWith("/")
            ? result.localImage.substring(1)
            : result.localImage;
          const finalPath = `${baseUrl}/${cleanPath}`;

          console.log(`[${result.id || "unnamed"}] Normalized localImage path:`, finalPath);
          result.localImage = finalPath;
        }
      }

      // Check if fallback from localImage to imageUrl should happen
      if (!result.imageUrl && result.localImage) {
        console.log(
          `[${result.id || "unnamed"}] Using localImage as fallback for imageUrl:`,
          result.localImage
        );
        result.imageUrl = result.localImage;
      }

      return result;
    });

    console.groupEnd();
    return results;
  }

  window.searchProDebug = {
    runDiagnostics,
    logToggleDiagnostics,
    generateDebugReport,
    printDebugSummary,
    observeSearchPanel,
    extractTourTags,
    debugBusinessMatching,
    debugImagePaths,

    // Additional utilities
    inspectSearchIndex: () => {
      const searchFunctions = window.tourSearchFunctions || window.searchFunctions;
      return searchFunctions?.getSearchIndex?.() || [];
    },

    inspectGoogleSheetsData: () => {
      const searchFunctions = window.tourSearchFunctions || window.searchFunctions;
      return searchFunctions?._getGoogleSheetsData?.() || [];
    },

    inspectBusinessData: () => {
      const searchFunctions = window.tourSearchFunctions || window.searchFunctions;
      return searchFunctions?._getBusinessData?.() || [];
    },

    showMatchStats: () => {
      const searchFunctions = window.tourSearchFunctions || window.searchFunctions;

      const businessStats = searchFunctions?._getBusinessDataMatchStats?.() || {};
      const sheetsStats = searchFunctions?._getGoogleSheetsMatchStats?.() || {};

      console.group("🔍 Data Matching Statistics");
      console.log("Business Data:", businessStats);
      console.log("Google Sheets:", sheetsStats);
      console.groupEnd();

      return { businessStats, sheetsStats };
    },

    inspectConfig: () => {
      const searchFunctions = window.tourSearchFunctions || window.searchFunctions;
      return searchFunctions?.getConfig?.() || {};
    },

    clearCache: () => {
      try {
        // Known cache keys
        const cacheKeys = [
          "tourGoogleSheetsData",
          "tourGoogleSheetsData_timestamp",
          "businessData",
          "businessData_timestamp",
        ];

        cacheKeys.forEach((key) => {
          localStorage.removeItem(key);
        });

        console.log("🧹 Search Pro cache cleared successfully");
        return true;
      } catch (e) {
        console.error("Failed to clear cache:", e);
        return false;
      }
    },

    testFetchGoogleSheet: (url) => {
      if (!url) {
        console.error("Please provide a Google Sheet URL");
        return;
      }

      console.log(`🔄 Testing fetch from: ${url}`);

      let fetchUrl = url;
      if (url.includes("spreadsheets.google.com/") && !url.includes("/export")) {
        // Extract sheet ID
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          const sheetId = match[1];
          fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
          console.log(`🔄 Converted to export URL: ${fetchUrl}`);
        }
      }

      fetch(fetchUrl)
        .then((response) => {
          console.log("Response status:", response.status);
          console.log("Response headers:", [...response.headers.entries()]);
          return response.text();
        })
        .then((text) => {
          console.log("Data preview (first 500 chars):", text.substring(0, 500));
          console.log("Total size:", text.length, "characters");
        })
        .catch((error) => {
          console.error("Fetch error:", error);
        });
    },

    /**
     * [1.10] BUSINESS DATA RELOAD
     * Reloads business data without exposing internal methods
     */
    reloadBusinessData: () => {
      console.group("🔄 Business Data Reload");

      const searchFunctions = window.tourSearchFunctions || window.searchFunctions;

      if (!searchFunctions) {
        console.error("Search functions not available");
        console.groupEnd();
        return Promise.reject("Search functions not available");
      }

      // Get the current config
      const config = searchFunctions.getConfig();

      // Force a configuration update to trigger a reload
      return new Promise((resolve, reject) => {
        try {
          // First, ensure business data is enabled
          if (!config.businessData || !config.businessData.useBusinessData) {
            console.log("Business data was disabled, enabling it now");
            searchFunctions.updateConfig({
              businessData: {
                useBusinessData: true,
                businessDataFile: config.businessData?.businessDataFile || "business.json",
                businessDataDir: config.businessData?.businessDataDir || "business-data",
              },
            });
          } else {
            // Toggle the config to force a reload
            console.log("Toggling business data configuration to force reload");
            searchFunctions.updateConfig({
              businessData: {
                useBusinessData: false,
              },
            });

            // Wait a moment and then re-enable
            setTimeout(() => {
              searchFunctions.updateConfig({
                businessData: {
                  useBusinessData: true,
                  businessDataFile: config.businessData.businessDataFile,
                  businessDataDir: config.businessData.businessDataDir,
                },
              });
            }, 50);
          }

          // Force a complete reinitialization after a delay
          setTimeout(() => {
            if (window.tour) {
              console.log("Reinitializing search with fresh data");
              searchFunctions.initializeSearch(window.tour);

              // Verify the reload by checking search results
              setTimeout(() => {
                // Test with wildcard search to see all results
                const searchInput = document.querySelector("#tourSearch");
                if (searchInput) {
                  searchFunctions.toggleSearch(true);
                  searchInput.value = "*";
                  searchInput.dispatchEvent(new Event("input"));
                  console.log("Search triggered with wildcard to verify data");
                }

                console.groupEnd();
                resolve("Business data reloaded successfully");
              }, 500);
            } else {
              console.warn("Tour not available for reinitialization");
              console.groupEnd();
              reject("Tour not available");
            }
          }, 300);
        } catch (err) {
          console.error("Failed to reload business data:", err);
          console.groupEnd();
          reject(err);
        }
      });
    },

    // Add to debug-core-v3.js
    listAllPanoramaTags: function () {
      console.group("🏷️ All Panorama Tags");

      try {
        if (!window.tour || !window.tour.mainPlayList) {
          console.error("Tour not available");
          console.groupEnd();
          return;
        }

        const items = window.tour.mainPlayList.get("items");
        if (!items || !Array.isArray(items)) {
          console.error("No panorama items found");
          console.groupEnd();
          return;
        }

        const panoramaData = [];

        items.forEach((item, index) => {
          try {
            const media = item.get("media");
            if (!media) return;

            const data = media.get("data") || {};
            const id = media.get("id") || "";
            const label = data.label || "";
            const subtitle = data.subtitle || "";
            const tags = Array.isArray(data.tags) ? data.tags : [];

            panoramaData.push({
              index,
              id,
              label,
              subtitle,
              tags,
              // Include additional stable identifiers
              stableId: label || (tags.length > 0 ? tags[0] : ""),
              // Compute a hash based on subtitle and tags for unnamed panoramas
              hash: subtitle + ":" + tags.join(","),
            });
          } catch (e) {
            console.error(`Error processing panorama at index ${index}:`, e);
          }
        });

        console.table(panoramaData);

        // List all unique tags for easy copy-pasting
        const allTags = new Set();
        panoramaData.forEach((p) => p.tags.forEach((tag) => allTags.add(tag)));

        console.log("All unique tags found:", Array.from(allTags));

        // Recommend tag strategies
        panoramaData.forEach((p) => {
          if (!p.label && p.tags.length > 0) {
            console.log(`Recommend using tags for unnamed panorama: ${p.tags.join(", ")}`);
          }
        });

        console.groupEnd();
        return panoramaData;
      } catch (e) {
        console.error("Error listing panorama tags:", e);
        console.groupEnd();
        return [];
      }
    },

    // Add to debug-core-v3.js
    generateBusinessDataTemplate: function () {
      console.group("📋 Business Data Template Generator");

      try {
        const panoramaTags = listAllPanoramaTags();
        if (!panoramaTags || panoramaTags.length === 0) {
          console.error("No panorama data available");
          console.groupEnd();
          return;
        }

        const businessTemplate = panoramaTags.map((p) => {
          // Create a suitable ID - use the label if available, otherwise the first tag or index
          const id = p.label || (p.tags.length > 0 ? p.tags[0] : `Panorama-${p.index}`);

          // Create suitable matchTags - include the label and all tags
          const matchTags = [];
          if (p.label) matchTags.push(p.label);
          p.tags.forEach((tag) => matchTags.push(tag));

          return {
            id,
            name: p.label || `Panorama ${p.index + 1}`,
            description: p.subtitle || `Panorama with tags: ${p.tags.join(", ")}`,
            matchTags: matchTags,
            elementType: "Panorama",
            // Include the original data for reference
            originalData: {
              tourIndex: p.index,
              tourId: p.id,
              tourTags: p.tags,
            },
          };
        });

        console.log("Generated business data template:");
        console.log(JSON.stringify(businessTemplate, null, 2));

        console.log("Copy the above JSON and remove any 'originalData' properties before using.");
        console.groupEnd();
        return businessTemplate;
      } catch (e) {
        console.error("Error generating business data template:", e);
        console.groupEnd();
        return [];
      }
    },

    // Add this function to check if URLs are accessible
    checkImageUrls: function () {
      console.group("🖼️ Checking Business Data Image URLs");

      const searchFunctions = window.tourSearchFunctions || window.searchFunctions;
      const businessData = searchFunctions?._getBusinessData?.() || window._businessData || [];

      if (!businessData || !businessData.length) {
        console.warn("No business data available");
        console.groupEnd();
        return;
      }

      const imagesToCheck = businessData
        .filter((entry) => entry.imageUrl)
        .map((entry) => ({
          id: entry.id,
          name: entry.name || "Unnamed",
          imageUrl: entry.imageUrl,
        }));

      console.log(`Found ${imagesToCheck.length} images to check`);

      imagesToCheck.forEach((item) => {
        const img = new Image();
        img.onload = () =>
          console.log(
            `✅ Image for ${item.name} (${item.id}) loaded successfully: ${item.imageUrl}`
          );
        img.onerror = () =>
          console.error(`❌ Image for ${item.name} (${item.id}) failed to load: ${item.imageUrl}`);
        img.src = item.imageUrl;
      });

      console.groupEnd();
    },

    // Add this in the _renderResultItem function where the image/thumbnail is processed
    _renderResultItem: (result, index) => {
      const item = result.item;

      // Get thumbnail URL - this logic should match your existing code
      const thumbnailUrl =
        item.imageUrl || item.businessData?.imageUrl || item.sheetsData?.imageUrl || "";

      // Add this debug logging
      console.log(
        `[IMAGE DEBUG] Result ${result.item.label}: Image URL = ${thumbnailUrl}, Business Data? ${!!result.item.businessData}, Image in Business Data? ${result.item.businessData?.imageUrl ? "Yes" : "No"}`
      );
    },

    /**
     * [1.12] COMPREHENSIVE GOOGLE SHEETS DIAGNOSTICS
     * Complete diagnostic suite for Google Sheets integration
     */
    runGoogleSheetsDiagnostics: function () {
      console.log("🔍 STARTING COMPLETE GOOGLE SHEETS DIAGNOSTICS...\n");

      // 1. Basic Data Check
      console.log("📊 1. BASIC DATA CHECK");
      const searchFunctions = window.tourSearchFunctions || window.searchFunctions;
      const googleSheetsData = searchFunctions?._getGoogleSheetsData?.() || [];
      console.log("Google Sheets Data:", googleSheetsData);
      console.log("Data count:", googleSheetsData.length);

      // 2. Configuration Check
      console.log("\n⚙️ 2. CONFIGURATION CHECK");
      const config = searchFunctions?.getConfig?.() || {};
      console.log("Google Sheets Config:", config.googleSheets);

      // 3. URL and Fetch Test
      console.log("\n🌐 3. URL AND FETCH TEST");
      const sheetsUrl = config.googleSheets?.googleSheetUrl;
      console.log("Google Sheets URL being used:", sheetsUrl);

      if (sheetsUrl) {
        // Test the URL manually
        fetch(sheetsUrl)
          .then((response) => {
            console.log("Google Sheets fetch response status:", response.status);
            console.log("Response headers:", [...response.headers.entries()]);
            return response.text();
          })
          .then((text) => {
            console.log("Google Sheets raw data length:", text.length);
            console.log("Google Sheets data preview (first 500 chars):", text.substring(0, 500));

            // Parse first few lines to check structure
            const lines = text.split("\n");
            console.log("First 3 lines of CSV:");
            lines.slice(0, 3).forEach((line, index) => {
              console.log(`Line ${index + 1}:`, line);
            });
          })
          .catch((error) => {
            console.error("Google Sheets fetch error:", error);
          });
      }

      // 4. Search Index Check
      console.log("\n🔍 4. SEARCH INDEX CHECK");
      const searchIndex = searchFunctions?.getSearchIndex?.() || [];
      console.log("Search Index Data:", searchIndex);
      console.log("Search Index Count:", searchIndex.length);

      // Look for Google Sheets entries specifically
      const sheetsEntries = searchIndex.filter((item) => item.sheetsData);
      const standaloneSheets = searchIndex.filter((item) => item.sheetsData && !item.item);
      const enhancedTourItems = searchIndex.filter((item) => item.sheetsData && item.item);

      console.log("Google Sheets entries in search index:", sheetsEntries.length);
      console.log("Standalone Google Sheets entries:", standaloneSheets.length);
      console.log("Tour items enhanced with Google Sheets:", enhancedTourItems.length);

      // 5. Sample Data Analysis
      console.log("\n📋 5. SAMPLE DATA ANALYSIS");
      if (googleSheetsData.length > 0) {
        console.log("First Google Sheets entry:", googleSheetsData[0]);
        console.log("Sample fields available:", Object.keys(googleSheetsData[0]));

        // Check for missing critical fields
        const missingIds = googleSheetsData.filter((row) => !row.id).length;
        const missingTags = googleSheetsData.filter((row) => !row.tag).length;
        const missingNames = googleSheetsData.filter((row) => !row.name).length;

        console.log("Data quality:");
        console.log(`- Missing IDs: ${missingIds}/${googleSheetsData.length}`);
        console.log(`- Missing tags: ${missingTags}/${googleSheetsData.length}`);
        console.log(`- Missing names: ${missingNames}/${googleSheetsData.length}`);
      }

      // 6. Search Integration Test
      console.log("\n🔍 6. SEARCH INTEGRATION TEST");
      console.log("Testing search for Google Sheets entries...");

      // Test searches for known Google Sheets entries
      const testSearches = ["Room-1", "MyCoolTag_01", "Conference", "Facility"];
      testSearches.forEach((term) => {
        const searchResults = searchIndex.filter(
          (item) => item.label && item.label.toLowerCase().includes(term.toLowerCase())
        );
        console.log(`Search "${term}": ${searchResults.length} results`);
        if (searchResults.length > 0) {
          console.log("  Sample result:", {
            label: searchResults[0].label,
            type: searchResults[0].type,
            hasSheets: !!searchResults[0].sheetsData,
            imageUrl: searchResults[0].imageUrl,
          });
        }
      });

      // 7. Image URL Check
      console.log("\n🖼️ 7. IMAGE URL CHECK");
      const entriesWithImages = googleSheetsData.filter((item) => item.imageUrl);
      console.log(`Entries with images: ${entriesWithImages.length}/${googleSheetsData.length}`);
      if (entriesWithImages.length > 0) {
        console.log("Sample image URLs:");
        entriesWithImages.slice(0, 3).forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.name}: ${item.imageUrl}`);
        });
      }

      // 8. Module State Check
      console.log("\n🔧 8. MODULE STATE CHECK");
      console.log("Search initialized:", window.searchListInitialized);
      console.log("Tour instance available:", !!window.tourInstance);
      console.log("Search functions available:", !!searchFunctions);
      console.log("Fuse.js available:", typeof Fuse !== "undefined");

      // 9. Final Summary
      setTimeout(() => {
        console.log("\n📋 9. DIAGNOSTIC SUMMARY");
        console.log("=".repeat(50));

        const summary = {
          "Google Sheets Enabled": config.googleSheets?.useGoogleSheetData || false,
          "Data Loaded": googleSheetsData.length > 0,
          "Data Count": googleSheetsData.length,
          "In Search Index": sheetsEntries.length,
          "URL Working": "Check fetch results above",
          "Images Available": entriesWithImages.length,
        };

        Object.entries(summary).forEach(([key, value]) => {
          console.log(`${key}: ${value}`);
        });

        console.log("\n✅ Google Sheets diagnostics complete! Check results above for any issues.");
      }, 2000);

      return {
        config: config.googleSheets,
        dataCount: googleSheetsData.length,
        indexCount: sheetsEntries.length,
        imagesCount: entriesWithImages.length,
        searchIndex: searchIndex,
        googleSheetsData: googleSheetsData,
      };
    },

    // Quick Google Sheets status check
    getGoogleSheetsStatus: function () {
      const searchFunctions = window.tourSearchFunctions || window.searchFunctions;
      const config = searchFunctions?.getConfig?.() || {};
      const data = searchFunctions?._getGoogleSheetsData?.() || [];

      return {
        enabled: config.googleSheets?.useGoogleSheetData || false,
        url: config.googleSheets?.googleSheetUrl || "none",
        dataLoaded: data.length > 0,
        recordCount: data.length,
      };
    },

    // Test Google Sheets URL directly
    testGoogleSheetsUrl: function (url) {
      const testUrl = url || window.searchFunctions?.getConfig?.()?.googleSheets?.googleSheetUrl;
      if (!testUrl) {
        console.error("No Google Sheets URL provided");
        return;
      }

      console.log(`🔄 Testing: ${testUrl}`);
      return fetch(testUrl)
        .then((response) => {
          console.log(`Status: ${response.status}`);
          return response.text();
        })
        .then((text) => {
          console.log(`Data length: ${text.length}`);
          console.log(`Preview: ${text.substring(0, 200)}`);
          return text;
        })
        .catch((error) => {
          console.error("Fetch failed:", error);
          throw error;
        });
    },

    // Add to window.searchProDebug object
    debugThumbnailBorders: function () {
      console.group("🔍 THUMBNAIL BORDER DEBUG");

      const searchFunctions = window.tourSearchFunctions || window.searchFunctions;
      const config = searchFunctions?.getConfig?.() || {};
      const root = document.documentElement;

      // Get config values
      console.log("Configuration Values:");
      console.log("  📝 Config borderRadius:", config.thumbnailSettings?.borderRadius);
      console.log("  📝 Config borderColor:", config.thumbnailSettings?.borderColor);
      console.log("  📝 Config borderWidth:", config.thumbnailSettings?.borderWidth);

      // Get CSS variables
      console.log("CSS Variables Set:");
      console.log(
        "  🎨 --thumbnail-border-radius:",
        root.style.getPropertyValue("--thumbnail-border-radius")
      );
      console.log(
        "  🎨 --thumbnail-border-color:",
        root.style.getPropertyValue("--thumbnail-border-color")
      );
      console.log(
        "  🎨 --thumbnail-border-width:",
        root.style.getPropertyValue("--thumbnail-border-width")
      );

      // Check actual computed styles
      setTimeout(() => {
        const testElement = document.querySelector(".result-image");
        if (testElement) {
          const computedStyle = window.getComputedStyle(testElement);
          console.log("Computed CSS on .result-image:");
          console.log("  🖼️ border:", computedStyle.border);
          console.log("  🖼️ border-color:", computedStyle.borderColor);
          console.log("  🖼️ border-width:", computedStyle.borderWidth);
          console.log("  🖼️ border-radius:", computedStyle.borderRadius);
          console.log("  🖼️ Element HTML:", testElement.outerHTML);
        } else {
          console.log("No .result-image elements found yet");
        }
      }, 2000);

      console.groupEnd();

      // Return current settings for convenience
      return {
        fromConfig: {
          radius: config.thumbnailSettings?.borderRadius,
          color: config.thumbnailSettings?.borderColor,
          width: config.thumbnailSettings?.borderWidth,
        },
        fromCSS: {
          radius: root.style.getPropertyValue("--thumbnail-border-radius"),
          color: root.style.getPropertyValue("--thumbnail-border-color"),
          width: root.style.getPropertyValue("--thumbnail-border-width"),
        },
      };
    },
  };

  // [1.6.2] Auto-run diagnostics on load
  const debugParams = new URLSearchParams(window.location.search);
  runDiagnostics();
  if (debugParams.get("tourInspect") === "true") {
    console.log("🔍 Auto-running tour inspection (from URL param)");
    setTimeout(inspectTour, 1500); // Delay to ensure tour is loaded
  }

  // [1.6.3] Display banner
  console.log(
    "%c Search Pro Debug Tools %c Ready - Type searchProDebug.runDiagnostics() to analyze ",
    "background:#4285F4; color:white; font-weight:bold; padding:3px;",
    "background:#f1f1f1; color:#444; padding:3px;"
  );

  // [1.6.4] Run diagnostics on document load
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(runDiagnostics, 100);
  });

  // [1.6.5] Delayed diagnostics to capture late-loading resources
  setTimeout(() => {
    if (window.searchProDebug?.runDiagnostics) {
      window.searchProDebug.runDiagnostics();
    }
  }, 2000);

  // Global error logging
  window.addEventListener("error", function (event) {
    console.error(
      "[Search Pro ERROR]",
      event.message,
      event.filename,
      event.lineno,
      event.colno,
      event.error
    );
  });

  window.addEventListener("unhandledrejection", function (event) {
    console.error("[Search Pro UNHANDLED PROMISE REJECTION]", event.reason);
  });

  // [1.7] SPECIALIZED UI DIAGNOSTICS - WHITE CONTAINER ISSUE
  /**
   * [1.7.1] Monitor search container visibility and background issues
   */
  function monitorSearchContainerVisibility() {
    console.log("🔍 Starting search container visibility monitor");

    const searchContainer = document.getElementById("searchContainer");
    if (!searchContainer) {
      console.error("Cannot monitor search container - element not found");
      return;
    }

    // Create a persistent diagnostic tool attached to the container
    const containerDiagnostics = {
      toggleCount: 0,
      lastToggleTime: null,
      visibilityHistory: [],
      backgroundIssuesDetected: 0,

      logToggle: function (isVisible) {
        this.toggleCount++;
        this.lastToggleTime = new Date();

        const entry = {
          timestamp: new Date(),
          action: isVisible ? "show" : "hide",
          display: getComputedStyle(searchContainer).display,
          visibility: getComputedStyle(searchContainer).visibility,
          background: getComputedStyle(searchContainer).background,
          opacity: getComputedStyle(searchContainer).opacity,
          hasResultsClass: searchContainer.classList.contains("has-results"),
          visibleClass: searchContainer.classList.contains("visible"),
          zIndex: getComputedStyle(searchContainer).zIndex,
          elementsAtCenter: getElementsAtScreenCenter(),
        };

        this.visibilityHistory.push(entry);
        if (this.visibilityHistory.length > 20) {
          this.visibilityHistory.shift(); // Keep only last 20 entries
        }

        // Check for potential issues
        if (!isVisible && entry.display !== "none") {
          console.warn(
            "🚨 ISSUE DETECTED: Container should be hidden but display is not 'none'",
            entry
          );
          this.backgroundIssuesDetected++;
        }

        if (
          !isVisible &&
          !entry.hasResultsClass &&
          entry.background !== "transparent" &&
          !entry.background.includes("rgba(0, 0, 0, 0)")
        ) {
          console.warn(
            "🚨 ISSUE DETECTED: Container background not transparent when hidden",
            entry
          );
          this.backgroundIssuesDetected++;
        }

        // Comprehensive logging
        console.groupCollapsed(
          `🔄 Search Toggle #${this.toggleCount}: ${isVisible ? "SHOW" : "HIDE"}`
        );
        console.log("🕒 Time:", entry.timestamp.toLocaleTimeString());

        // Container state
        console.log("📦 Container state:", {
          display: entry.display,
          visibility: entry.visibility,
          background: entry.background,
          opacity: entry.opacity,
          classList: searchContainer.className,
          hasResultsClass: entry.hasResultsClass,
          visibleClass: entry.visibleClass,
        });

        // Child elements
        const resultsContainer = searchContainer.querySelector(".search-results");
        const resultsSection = searchContainer.querySelector(".results-section");
        const noResults = searchContainer.querySelector(".no-results");

        if (resultsContainer) {
          console.log("📋 Results container:", {
            display: getComputedStyle(resultsContainer).display,
            background: getComputedStyle(resultsContainer).background,
            opacity: getComputedStyle(resultsContainer).opacity,
            visibility: getComputedStyle(resultsContainer).visibility,
            childElementCount: resultsContainer.childElementCount,
          });
        }

        if (resultsSection) {
          console.log("📝 Results section:", {
            display: getComputedStyle(resultsSection).display,
            childElementCount: resultsSection.childElementCount,
            innerHTML:
              resultsSection.innerHTML.length > 100
                ? resultsSection.innerHTML.substring(0, 100) + "..."
                : resultsSection.innerHTML,
          });
        }

        if (noResults) {
          console.log("❌ No results element:", {
            display: getComputedStyle(noResults).display,
            visibility: getComputedStyle(noResults).visibility,
          });
        }

        // Check for elements at center of screen
        console.log("🎯 Elements at screen center:", entry.elementsAtCenter);

        // Check for duplicate search containers
        const allSearchContainers = document.querySelectorAll("#searchContainer");
        if (allSearchContainers.length > 1) {
          console.warn(`⚠️ CRITICAL ISSUE: Found ${allSearchContainers.length} search containers!`);
          Array.from(allSearchContainers).forEach((container, idx) => {
            console.log(`Container #${idx}:`, {
              display: getComputedStyle(container).display,
              visibility: getComputedStyle(container).visibility,
              background: getComputedStyle(container).background,
              inDom: document.body.contains(container),
              parent: container.parentElement?.tagName || "none",
            });
          });
        }

        // CSS Rule Analysis
        console.log("🎨 Relevant CSS rules:", findRelevantCSSRules("#searchContainer"));

        console.groupEnd();

        // Schedule a follow-up check after transitions should be complete
        if (!isVisible) {
          setTimeout(() => this.checkAfterHide(), 500);
        }

        return entry;
      },

      checkAfterHide: function () {
        const searchContainer = document.getElementById("searchContainer");
        if (!searchContainer) return;

        console.groupCollapsed("🔍 Post-hide check");
        console.log("Display:", getComputedStyle(searchContainer).display);
        console.log("Background:", getComputedStyle(searchContainer).background);
        console.log("Opacity:", getComputedStyle(searchContainer).opacity);
        console.log("Visibility:", getComputedStyle(searchContainer).visibility);
        console.log("Class list:", searchContainer.className);
        console.log("Elements at center:", getElementsAtScreenCenter());

        // Check for any remaining visible search-related elements
        const allSearchElements = document.querySelectorAll(
          "#searchContainer, .search-results, .results-section"
        );
        allSearchElements.forEach((el) => {
          const style = getComputedStyle(el);
          if (style.display !== "none" && style.opacity !== "0" && style.visibility !== "hidden") {
            console.warn("⚠️ Search element still visible:", el.tagName, el.className, {
              display: style.display,
              opacity: style.opacity,
              visibility: style.visibility,
            });
          }
        });

        console.groupEnd();
      },

      getHistory: function () {
        return this.visibilityHistory;
      },

      generateReport: function () {
        return {
          toggleCount: this.toggleCount,
          lastToggle: this.lastToggleTime,
          backgroundIssues: this.backgroundIssuesDetected,
          history: this.visibilityHistory.slice(-5), // Last 5 entries
        };
      },
    };

    // Attach the diagnostics object to window for manual inspection
    window.searchContainerDiagnostics = containerDiagnostics;

    // Set up observers
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          // Check if this was a visibility toggle
          if (mutation.attributeName === "style" || mutation.attributeName === "class") {
            const isVisible =
              searchContainer.style.display !== "none" &&
              !searchContainer.classList.contains("hidden");

            containerDiagnostics.logToggle(isVisible);
          }
        }
      }
    });

    observer.observe(searchContainer, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    console.log(
      "🔄 Search container visibility monitor active - Access with window.searchContainerDiagnostics"
    );
    return containerDiagnostics;
  }

  /**
   * [1.7.2] Get all elements at the center of the screen
   */
  function getElementsAtScreenCenter() {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const elements = document.elementsFromPoint(centerX, centerY);

    return elements.map((el) => ({
      tag: el.tagName,
      id: el.id || "none",
      className: el.className || "none",
      display: getComputedStyle(el).display,
      background: getComputedStyle(el).background,
      opacity: getComputedStyle(el).opacity,
      zIndex: getComputedStyle(el).zIndex,
    }));
  }
  /**
   * [1.7.3] Find all CSS rules affecting the search container
   */
  function findRelevantCSSRules(selector) {
    const relevantRules = [];

    try {
      for (const sheet of document.styleSheets) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (!rules) continue;

          for (const rule of rules) {
            if (
              rule.selectorText &&
              (rule.selectorText.includes("searchContainer") ||
                rule.selectorText.includes("search-results") ||
                rule.selectorText.includes("has-results"))
            ) {
              relevantRules.push({
                selector: rule.selectorText,
                background: rule.style.background || "not set",
                backgroundColor: rule.style.backgroundColor || "not set",
                display: rule.style.display || "not set",
                opacity: rule.style.opacity || "not set",
                visibility: rule.style.visibility || "not set",
                transition: rule.style.transition || "not set",
                zIndex: rule.style.zIndex || "not set",
                sheetHref: sheet.href || "inline",
              });
            }
          }
        } catch (e) {
          // CORS issues with external stylesheets
        }
      }
    } catch (e) {
      console.error("Error analyzing CSS rules:", e);
    }

    return relevantRules;
  }

  // Initialize the visibility monitor
  monitorSearchContainerVisibility();

  // Add to global exports
  window.searchProDebug.monitorSearchContainerVisibility = monitorSearchContainerVisibility;
  window.searchProDebug.getElementsAtScreenCenter = getElementsAtScreenCenter;
  window.searchProDebug.findRelevantCSSRules = findRelevantCSSRules;

  console.log("=== TOUR STRUCTURE DEBUG ===");
  console.log("window.tour:", window.tour);
  console.log("window.tour keys:", window.tour ? Object.keys(window.tour) : "undefined");

  if (window.tour) {
    console.log("window.tour.mainPlayList:", window.tour.mainPlayList);

    // Check if it's using a different property name
    const possiblePlaylistProps = ["mainPlayList", "playlist", "mainPlaylist", "playList"];
    possiblePlaylistProps.forEach((prop) => {
      if (window.tour[prop]) {
        console.log(`Found playlist at window.tour.${prop}:`, window.tour[prop]);
      }
    });

    // Check if it's accessible via get method
    if (typeof window.tour.get === "function") {
      try {
        const playlist = window.tour.get("mainPlayList");
        console.log("window.tour.get('mainPlayList'):", playlist);
      } catch (e) {
        console.log("Error getting mainPlayList:", e.message);
      }
    }
  }

  // Check TDV structure
  if (
    window.TDV &&
    window.TDV.PlayerAPI &&
    typeof window.TDV.PlayerAPI.getCurrentPlayer === "function"
  ) {
    try {
      const currentPlayer = window.TDV.PlayerAPI.getCurrentPlayer();
      console.log("TDV.PlayerAPI.getCurrentPlayer():", currentPlayer);
      if (currentPlayer && currentPlayer.mainPlayList) {
        console.log("TDV player has mainPlayList:", !!currentPlayer.mainPlayList);
      }
    } catch (e) {
      console.log("Error calling TDV.PlayerAPI.getCurrentPlayer():", e.message);
    }
  } else {
    console.log("TDV.PlayerAPI.getCurrentPlayer not available");
  }

  // === FIND THE ACTUAL PLAYLIST LOCATION ===
  console.log("=== FINDING ACTUAL PLAYLIST ===");

  // Check different possible playlist locations
  const possiblePaths = [
    "window.tour.player.mainPlayList",
    'window.tour.player.get("mainPlayList")',
    "window.tour.mainPlayList",
    'window.tour.get("mainPlayList")',
  ];

  let foundPlaylist = null;
  let foundPath = null;

  // Method 1: Direct property access
  try {
    if (window.tour && window.tour.player && window.tour.player.mainPlayList) {
      foundPlaylist = window.tour.player.mainPlayList;
      foundPath = "window.tour.player.mainPlayList";
      console.log("✓ Found playlist at: window.tour.player.mainPlayList");
    }
  } catch (e) {
    console.log("✗ window.tour.player.mainPlayList failed:", e.message);
  }

  // Method 2: Player get method
  if (!foundPlaylist) {
    try {
      if (window.tour && window.tour.player && typeof window.tour.player.get === "function") {
        const playlist = window.tour.player.get("mainPlayList");
        if (playlist) {
          foundPlaylist = playlist;
          foundPath = 'window.tour.player.get("mainPlayList")';
          console.log("✓ Found playlist at: window.tour.player.get('mainPlayList')");
        }
      }
    } catch (e) {
      console.log("✗ window.tour.player.get('mainPlayList') failed:", e.message);
    }
  }

  // Method 3: Direct tour mainPlayList
  if (!foundPlaylist) {
    try {
      if (window.tour && window.tour.mainPlayList) {
        foundPlaylist = window.tour.mainPlayList;
        foundPath = "window.tour.mainPlayList";
        console.log("✓ Found playlist at: window.tour.mainPlayList");
      }
    } catch (e) {
      console.log("✗ window.tour.mainPlayList failed:", e.message);
    }
  }

  // Method 4: Tour get method
  if (!foundPlaylist) {
    try {
      if (window.tour && typeof window.tour.get === "function") {
        const playlist = window.tour.get("mainPlayList");
        if (playlist) {
          foundPlaylist = playlist;
          foundPath = 'window.tour.get("mainPlayList")';
          console.log("✓ Found playlist at: window.tour.get('mainPlayList')");
        }
      }
    } catch (e) {
      console.log("✗ window.tour.get('mainPlayList') failed:", e.message);
    }
  }

  if (foundPlaylist) {
    console.log(`\n=== PLAYLIST FOUND AT: ${foundPath} ===`);
    console.log("Playlist object:", foundPlaylist);
    console.log(
      "Playlist methods:",
      Object.getOwnPropertyNames(foundPlaylist).filter(
        (prop) => typeof foundPlaylist[prop] === "function"
      )
    );

    // Try to get items
    try {
      let items = null;
      if (typeof foundPlaylist.get === "function") {
        items = foundPlaylist.get("items");
        console.log("Items via get('items'):", items ? items.length : "null");
      }
      if (!items && foundPlaylist.items) {
        items = foundPlaylist.items;
        console.log("Items via .items property:", items ? items.length : "null");
      }

      if (items && Array.isArray(items)) {
        console.log("\n=== PLAYLIST ITEMS ===");
        items.forEach((item, i) => {
          try {
            const itemClass = item.get ? item.get("class") : item.class;
            const media = item.get ? item.get("media") : item.media;
            const mediaClass = media && media.get ? media.get("class") : media?.class;
            const mediaId = media && media.get ? media.get("id") : media?.id;
            console.log(`Item ${i}: ${itemClass} -> ${mediaClass} (${mediaId})`);

            if (itemClass === "Model3DPlayListItem") {
              console.log(`  *** 3D MODEL AT INDEX ${i} ***`);
              console.log(`  Can set selectedIndex: ${typeof foundPlaylist.set === "function"}`);
              console.log(`  Can trigger item: ${typeof item.trigger === "function"}`);
              console.log(`  Can trigger media: ${media && typeof media.trigger === "function"}`);
            }
          } catch (e) {
            console.warn(`Error analyzing item ${i}:`, e);
          }
        });
      }
    } catch (e) {
      console.error("Error getting items:", e);
    }
  } else {
    console.error("❌ NO PLAYLIST FOUND AT ANY EXPECTED LOCATION");
    console.log("\nDebugging tour structure:");
    console.log("window.tour:", window.tour);
    console.log("window.tour.player:", window.tour && window.tour.player);

    // Deep search for anything that looks like a playlist
    console.log("\n=== DEEP SEARCH FOR PLAYLIST-LIKE OBJECTS ===");

    function findPlaylistLike(obj, path = "", depth = 0, visited = new Set()) {
      if (depth > 3 || !obj || visited.has(obj)) return [];
      visited.add(obj);

      const results = [];

      try {
        // Check if this object has items
        if (obj.items && Array.isArray(obj.items)) {
          results.push(`${path}.items (${obj.items.length} items)`);
        }

        // Check if this object can get items
        if (typeof obj.get === "function") {
          try {
            const items = obj.get("items");
            if (Array.isArray(items)) {
              results.push(`${path}.get('items') (${items.length} items)`);
            }
          } catch (e) {
            // Ignore error
          }
        }

        // Recursively search properties
        for (const key in obj) {
          if (obj.hasOwnProperty && obj.hasOwnProperty(key) && key !== "parent") {
            try {
              const value = obj[key];
              if (value && typeof value === "object") {
                const subResults = findPlaylistLike(
                  value,
                  path ? `${path}.${key}` : key,
                  depth + 1,
                  visited
                );
                results.push(...subResults);
              }
            } catch (e) {
              // Ignore
            }
          }
        }
      } catch (e) {
        console.warn(`Error searching ${path}:`, e);
      }

      return results;
    }

    const playlistCandidates = findPlaylistLike(window.tour, "window.tour");
    console.log("Playlist-like objects found:", playlistCandidates);
  }
})();

// Log successful loading
console.debug("✅ Search Pro Debug loaded successfully");
