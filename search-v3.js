// [SearchPro] Global Console Silencer
(function() {
  try {
    // Check URL parameter (available immediately)
    const urlDebug = window.location.search.includes('debug=true') || 
                     localStorage.getItem('searchProDebugEnabled') === 'true';
    
    if (urlDebug) {
      console.log("[SearchPro] 🔊 Debug mode ENABLED");
      return;
    }
    
    // Silent mode - override console in this file only
    const noop = function() {};
    
    // Store original methods
    const _log = console.log;
    const _info = console.info;
    const _debug = console.debug;
    
    // Override to be silent by default
    console.log = noop;
    console.info = noop;
    console.debug = noop;
    
    // Restore originals if window errors occur (safety)
    window.addEventListener('error', function() {
      console.log = _log;
      console.info = _info;
      console.debug = _debug;
    }, { once: true });
    
  } catch (err) {
    // Don't use console here - might cause recursion
  }
})();

/*
====================================
3DVista Enhanced Search Script
Version: 3.2
Last Updated: 11/01/2025
Description: Search Pro Configuration Loading - Google Sheets / CSV / Business JSON integration, runtime synchronization, Exact matches config, Silence Console Fix
====================================
*/

// [1.0] Global/Module Scope Variables
// [1.1] Logger Shim (fallback, replaced by debug-core-v3.js)
if (!window.Logger) {
  window.Logger = {
    level: 4, // 0=none, 1=error, 2=warn, 3=info, 4=debug
    useColors: true,
    prefix: "[Search]",

    _formatMessage: function (message, logType) {
      if (typeof message === "string" && message.includes(this.prefix)) {
        return message;
      }
      return `${this.prefix} ${logType}: ${message}`;
    },

    debug: function (message, ...args) {
      if (this.level >= 4) {
        console.debug(this._formatMessage(message, "DEBUG"), ...args);
      }
    },

    info: function (message, ...args) {
      if (this.level >= 3) {
        console.info(this._formatMessage(message, "INFO"), ...args);
      }
    },

    warn: function (message, ...args) {
      if (this.level >= 2) {
        console.warn(this._formatMessage(message, "WARN"), ...args);
      }
    },

    error: function (message, ...args) {
      if (this.level >= 1) {
        console.error(this._formatMessage(message, "ERROR"), ...args);
      }
    },

    // [1.1.1] Method: setLevel()
    setLevel: function (level) {
      if (typeof level === "number" && level >= 0 && level <= 4) {
        const oldLevel = this.level;
        this.level = level;
        this.info(`Logger level changed from ${oldLevel} to ${level}`);
        return true;
      }
      return false;
    },

    // [1.1.2] Method: Compatibility stubs for Logger
    setColorMode: function () {
      return false;
    },
    table: function (data) {
      if (this.level >= 3) console.table(data);
    },
    group: function (label) {
      if (this.level >= 3) console.group(label);
    },
    groupCollapsed: function (label) {
      if (this.level >= 3) console.groupCollapsed(label);
    },
    groupEnd: function () {
      if (this.level >= 3) console.groupEnd();
    },
    _log: function (message, ...args) {
      console.log(message, ...args);
    },
  };
  console.info("[Search] Using fallback Logger shim until debug-core-v3.js loads");
}

// [1.1.2.1] Safety check to ensure all Logger methods exist
// This prevents "Logger.method is not a function" errors
if (window.Logger && typeof window.Logger === "object") {
  // Ensure all required methods exist with fallbacks
  if (typeof window.Logger.debug !== "function") {
    window.Logger.debug = function (msg, ...args) {
      console.debug("[Search] DEBUG:", msg, ...args);
    };
  }
  if (typeof window.Logger.info !== "function") {
    window.Logger.info = function (msg, ...args) {
      console.info("[Search] INFO:", msg, ...args);
    };
  }
  if (typeof window.Logger.warn !== "function") {
    window.Logger.warn = function (msg, ...args) {
      console.warn("[Search] WARN:", msg, ...args);
    };
  }
  if (typeof window.Logger.error !== "function") {
    window.Logger.error = function (msg, ...args) {
      console.error("[Search] ERROR:", msg, ...args);
    };
  }
}

// [1.1.3] Safe logging helper that gracefully handles missing Logger methods
function _log(type, ...args) {
  try {
    if (window.Logger && typeof window.Logger[type] === "function") {
      window.Logger[type](...args);
    } else if (typeof console[type] === "function") {
      console[type](...args);
    } else {
      console.log(...args);
    }
  } catch (e) {
    console.log(...args); // Ultimate fallback
  }
}

// Resolve URLs relative to where this script (search-v3.js) is served from
function __fromScript(relativePath) {
  const baseSrc =
    document.currentScript?.src ||
    Array.from(document.scripts).find((s) => s.src && s.src.includes("search-v3.js"))?.src ||
    location.href;
  const baseDir = new URL(".", baseSrc); // folder that hosts search-v3.js
  const clean = String(relativePath || "").replace(/^(\.\/|\/)+/, "");
  return new URL(clean, baseDir).href;
}

// [1.2] Cross-Window Communication Channel
let selectedIndex = -1;

// [1.x] Expose a safe rebuild hook for Fuse index to public API
let _rebuildIndex = null;

// [1.x] Guards for async close delay
let _pendingHideToken = 0;

// [2.0] Core Initialization Function
function init() {
  if (window.searchListInitialized) {
    return;
  }
  // [2.1] Method: internalInit()
  function internalInit() {
    if (window.searchListInitialized) return;
    // [2.1.1] Logic Block: Ensure idempotent DOM creation
    if (!document.getElementById("searchContainer")) {
      // Try to find the viewer element
      var viewer = document.getElementById("viewer");
      if (!viewer) {
        console.error("Search Pro initialization failed: #viewer element not found");
        return;
      }
      var temp = document.createElement("div");
      temp.innerHTML = SEARCH_MARKUP; // Use full template, not minimal placeholder
      viewer.appendChild(temp.firstChild);
    } else {
      // Upgrade existing placeholder if it doesn't contain .search-field
      var el = document.getElementById("searchContainer");
      if (el && !el.querySelector(".search-field")) {
        el.outerHTML = SEARCH_MARKUP; // Replace with full template
      }
    }
    // [2.1.2] Logic Block: Bind events and set up UI
    if (
      typeof window.tourSearchFunctions === "object" &&
      window.tourSearchFunctions._bindSearchEventListeners
    ) {
      var el = document.getElementById("searchContainer");
      var input = document.getElementById("tourSearch");
      var clearBtn = el ? el.querySelector(".clear-button") : null;
      var icon = el ? el.querySelector(".search-icon") : null;
      window.tourSearchFunctions._bindSearchEventListeners(
        el,
        input,
        clearBtn,
        icon,
        window.tourSearchFunctions.performSearch || function () {}
      );
    }
    window.searchListInitialized = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", internalInit, { once: true });
  } else {
    internalInit();
  }
}
window.tourSearchInit = init;

// [3.0] Script Loader and Initialization
(function () {
  // [3.1] Default Configuration - Legacy config now removed in favor of _config
  // The configuration is now managed through the _config object

  // [3.2] Utility: Wait for Tour Readiness
  // [3.3] Function: initializeSearchWhenTourReady()
  function initializeSearchWhenTourReady(callback, timeoutMs = 15000) {
    const start = Date.now();
    (function poll() {
      // [3.3.0.1] Step: Check if tour is fully loaded
      if (
        window.tour &&
        window.tour.mainPlayList &&
        typeof window.tour.mainPlayList.get === "function" &&
        Array.isArray(window.tour.mainPlayList.get("items")) &&
        window.tour.mainPlayList.get("items").length > 0
      ) {
        // [3.3.0.1.1] Step: Tour is ready, execute the callback
        callback && callback();
      } else if (Date.now() - start < timeoutMs) {
        // [3.3.0.1.2] Step: Tour not ready, poll again after a short delay
        setTimeout(poll, 200);
      } else {
        // [3.3.0.1.3] Step: Timeout reached, log a warning
        if (typeof Logger !== "undefined") {
          _log("warn", "Tour not ready after waiting for", timeoutMs, "ms.");
        } else {
          console.warn("Tour not ready after waiting for", timeoutMs, "ms.");
        }
      }
    })();
  }

  // [3.4] Simple Logger Definition
  const Logger = window.Logger;

  // [3.5] Check if Script is Already Loaded
  if (window._searchProLoaded) {
    console.warn("Search Pro is already loaded. Skipping initialization.");
    return;
  }

  // [3.6] Mark as Loaded
  window._searchProLoaded = true;

  // [3.7] Define search markup template
  const SEARCH_MARKUP = `
    <div id="searchContainer" class="search-container">
        <!-- Search input field -->
        <div class="search-field">
            <input type="text" id="tourSearch" placeholder="Search tour locations... (* for all)" autocomplete="off">
            <div class="icon-container">
                <!-- Search icon -->
                <div class="search-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
                <!-- Clear search button -->
                <button class="clear-button" aria-label="Clear search" style="display: none;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>
        <!-- Search results container -->
        <div class="search-results" role="listbox" style="display: none;">
            <div class="results-section">
            </div>
            <!-- No results message -->
            <div class="no-results" role="status" aria-live="polite" style="display: none;">
                <div class="no-results-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                        <line x1="9" y1="9" x2="9.01" y2="9"></line>
                        <line x1="15" y1="9" x2="15.01" y2="9"></line>
                    </svg>
                </div>
                No matching results
            </div>
        </div>
    </div>
`;

  // [3.8] Dependency Loader
  // [3.9] Function: loadDependencies()
  function loadDependencies() {
    return new Promise((resolve, reject) => {
      // [3.9.0.1] Step: Detect if Fuse.js is already loaded
      if (typeof Fuse !== "undefined") {
        console.log("Fuse.js already loaded, skipping load");
        resolve();
        return;
      }

      // [3.9.0.2] Step: Try to load local Fuse.js first
      const fuseScript = document.createElement("script");
      fuseScript.src = "search-pro-v3/fuse.js/dist/fuse.min.js"; // *** must have the correct folder location name
      fuseScript.async = true;

      fuseScript.onload = () => {
        _log("info", "Local Fuse.js loaded successfully");
        resolve();
      };

      fuseScript.onerror = () => {
        console.warn("Local Fuse.js failed to load, attempting to load from CDN...");

        // [3.9.0.2.1] Step: Fallback to CDN if local load fails
        const fuseCDN = document.createElement("script");
        fuseCDN.src = "https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js";
        fuseCDN.async = true;

        fuseCDN.onload = () => {
          _log("info", "Fuse.js loaded successfully from CDN");
          resolve();
        };

        fuseCDN.onerror = () => {
          const error = new Error("Both local and CDN versions of Fuse.js failed to load");
          console.error(error);
          reject(error);
        };

        document.body.appendChild(fuseCDN);
      };

      document.body.appendChild(fuseScript);
    });
  }

  // [3.10] Optional Debug Tools Loader
  // [3.11] Function: loadDebugTools()
  function loadDebugTools() {
    return new Promise((resolve) => {
      // [3.11.0.1] Step: Check if debug mode is enabled via URL parameter or local storage
      const debugEnabled =
        window.location.search.includes("debug=true") ||
        localStorage.getItem("searchProDebugEnabled") === "true";

      if (!debugEnabled) {
        resolve(false);
        return;
      }

      // [3.11.0.2] Step: Create and configure the debug script element
      const debugScript = document.createElement("script");
      debugScript.src = "search-pro-v3/dashboard/js/debug-core-v3.js"; // *** Must have the correct folder location name
      debugScript.async = true;

      debugScript.onload = () => {
        _log("info", "Search Pro Debug Tools loaded successfully");
        resolve(true);
      };

      debugScript.onerror = () => {
        console.warn("Search Pro Debug Tools failed to load");
        resolve(false);
      };

      // [3.11.0.3] Step: Append script to body to initiate loading
      document.body.appendChild(debugScript);
    });
  }

  // [3.12] Font Awesome Loader
  // [3.13] Function: loadFontAwesome()
  function loadFontAwesome() {
    return new Promise((resolve) => {
      // [3.13.0.1] Step: Check if Font Awesome should be enabled
      const iconSettings =
        (typeof _config !== "undefined" && _config.thumbnailSettings?.iconSettings) || {};

      if (!iconSettings.enableFontAwesome) {
        _log("debug", "Font Awesome loading disabled");
        resolve(false);
        return;
      }

      // [3.13.0.2] Step: Check if Font Awesome is already loaded
      if (
        document.querySelector('link[href*="font-awesome"]') ||
        document.querySelector('link[href*="fontawesome"]') ||
        window.FontAwesome
      ) {
        _log("debug", "Font Awesome already loaded");
        resolve(true);
        return;
      }

      // [3.13.0.3] Step: Create and configure the Font Awesome CSS link
      const faLink = document.createElement("link");
      faLink.rel = "stylesheet";
      faLink.href =
        iconSettings.fontAwesomeUrl ||
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
      faLink.crossOrigin = "anonymous";

      faLink.onload = () => {
        Logger.info("Font Awesome loaded successfully");
        resolve(true);
      };

      faLink.onerror = () => {
        Logger.warn("Font Awesome failed to load");
        resolve(false);
      };

      // [3.13.0.4] Step: Append link to head to initiate loading
      document.head.appendChild(faLink);
    });
  }

  // [3.14] CSS Loader
  // [3.15] Function: loadCSS()
  function loadCSS() {
    return new Promise((resolve) => {
      // [3.15.0.1] Step: Check if CSS is already loaded to prevent duplication
      if (document.querySelector('link[href="search-pro-v3/css/search-v3.css"]')) {
        resolve();
        return;
      }

      // [3.15.0.2] Step: Create and configure the CSS link element
      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = "search-pro-v3/css/search-v3.css"; // *** Make sure sure it has the correct folder location name

      cssLink.onload = () => resolve();
      cssLink.onerror = () => {
        console.warn("Failed to load search CSS, styling may be affected");
        resolve(); // Still resolve so we don't block initialization
      };

      // [3.15.0.3] Step: Append link to head to initiate loading
      document.head.appendChild(cssLink);
    });
  }

  // [3.16] DOM Initialization
  // [3.17] Function: initializeDom()
  function initializeDom() {
    // [3.17.1] Step: Find the main viewer element, which is required for injection.
    const viewer = document.getElementById("viewer");
    if (!viewer) {
      console.error("Search Pro initialization failed: #viewer element not found");
      return false;
    }

    // [3.17.2] Step: Check if the search container already exists to prevent duplication.
    if (document.getElementById("searchContainer")) {
      console.log("Search container already exists, skipping DOM creation");
      return true;
    }

    // [3.17.3] Step: Create a temporary container to safely build the markup.
    const temp = document.createElement("div");
    temp.innerHTML = SEARCH_MARKUP.trim();

    // [3.17.4] Step: Append the new search container to the viewer.
    viewer.appendChild(temp.firstChild);

    return true;
  }

  // [3.18] Main Initialization Function
  // [3.19] Function: initialize()
  async function initialize() {
    try {
      // [3.19.0.1] Step: Load CSS first to ensure styling is applied early.
      await loadCSS();

      // [3.19.0.2] Step: Initialize DOM elements required for the search UI.
      if (!initializeDom()) {
        return;
      }

      // [3.19.0.3] Step: Load external dependencies like Fuse.js.
      await loadDependencies();

      // [3.19.0.4] Step: Load external dependencies and Font Awesome.
      await loadFontAwesome();

      // [3.19.0.5] Step: Optionally load debug tools if enabled.
      await loadDebugTools();

      // [3.19.0.6] Step: Wait for the tour to be initialized before binding events.
      const TourBinding = {
        initialized: false,
        // [3.19.0.6.1] Method: init()
        async init() {
          if (this.initialized) {
            return;
          }
          try {
            await this.bindToTour();
            this.initialized = true;
          } catch (error) {
            Logger.error("Tour binding failed:", error);
          }
        },
        // [3.19.0.6.2] Method: bindToTour() - Comprehensive tour binding with multiple strategies
        async bindToTour() {
          // [3.19.0.6.3] Step: Strategy 1: Official 3DVista Events (Preferred)
          if (await this.tryEventBinding()) {
            Logger.info("Using official 3DVista events");
            return;
          }
          // [3.19.0.6.4] Step: Strategy 2: Direct tour detection with validation
          if (await this.tryDirectBinding()) {
            Logger.info("Using direct tour binding");
            return;
          }
          // [3.19.0.6.5] Step: Strategy 3: DOM-based detection
          if (await this.tryDOMBinding()) {
            Logger.info("Using DOM-based binding");
            return;
          }
          throw new Error("All tour binding strategies failed");
        },
        // [3.19.0.6.6] Method: tryEventBinding() - Strategy 1: Official 3DVista Events
        tryEventBinding() {
          return new Promise((resolve, reject) => {
            try {
              // [3.19.0.6.7] Step: Check if 3DVista event system is available
              if (window.TDV && window.TDV.Tour && window.tour) {
                Logger.debug("3DVista event system detected");
                // [3.19.0.6.8] Step: Bind to official tour loaded event
                if (window.TDV.Tour.EVENT_TOUR_LOADED) {
                  window.tour.bind(window.TDV.Tour.EVENT_TOUR_LOADED, () => {
                    Logger.debug("EVENT_TOUR_LOADED fired");
                    this.validateAndInitialize().then(resolve).catch(reject);
                  });
                  // [3.19.0.6.9] Step: Timeout fallback in case event never fires
                  setTimeout(() => {
                    reject(new Error("EVENT_TOUR_LOADED timeout"));
                  }, 15000);
                  return; // Wait for event
                }
              }
              // [3.19.0.6.10] Step: Event system not available
              reject(new Error("3DVista events not available"));
            } catch (error) {
              reject(error);
            }
          });
        },
        // [3.19.0.6.11] Method: tryDirectBinding() - Strategy 2: Direct tour validation
        tryDirectBinding() {
          return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100; // 20 seconds max
            const poll = () => {
              attempts++;
              // [3.19.0.6.12] Step: Check if tour is ready
              if (this.isTourReady()) {
                this.validateAndInitialize().then(resolve).catch(reject);
                return;
              }
              // [3.19.0.6.13] Step: Check for timeout
              if (attempts >= maxAttempts) {
                reject(new Error("Direct tour binding timeout"));
                return;
              }
              // [3.19.0.6.14] Step: Poll again after a short delay
              setTimeout(poll, 200);
            };
            poll();
          });
        },
        // [3.19.0.6.15] Method: tryDOMBinding() - Strategy 3: DOM-based detection
        tryDOMBinding() {
          return new Promise((resolve, reject) => {
            // [3.19.0.6.16] Step: Watch for DOM changes that indicate tour is ready
            const observer = new MutationObserver((mutations) => {
              for (const mutation of mutations) {
                if (mutation.type === "childList") {
                  // [3.19.0.6.17] Step: Look for tour-specific DOM elements
                  const tourElements = document.querySelectorAll(
                    "[data-name], .PanoramaOverlay, .mainViewer"
                  );
                  if (tourElements.length > 0 && this.isTourReady()) {
                    observer.disconnect();
                    this.validateAndInitialize().then(resolve).catch(reject);
                    return;
                  }
                }
              }
            });
            observer.observe(document.body, {
              childList: true,
              subtree: true,
            });
            // [3.19.0.6.18] Step: Timeout to prevent infinite observation
            setTimeout(() => {
              observer.disconnect();
              reject(new Error("DOM binding timeout"));
            }, 20000);
          });
        },
        // [3.19.0.6.19] Method: isTourReady() - Comprehensive tour readiness check
        isTourReady() {
          try {
            const tourCandidates = [
              window.tour,
              window.tourInstance,
              window.TDV &&
              window.TDV.PlayerAPI &&
              typeof window.TDV.PlayerAPI.getCurrentPlayer === "function"
                ? window.TDV.PlayerAPI.getCurrentPlayer()
                : null,
            ].filter(Boolean);

            for (const tour of tourCandidates) {
              if (!tour) continue;

              // [3.19.0.6.20] Step: Use utility functions for consistent playlist detection
              const playlists = PlaylistUtils.getAllPlayLists(tour);

              // [3.19.0.6.21] Step: Check if we have at least one valid playlist
              if (!playlists.main && !playlists.root) continue;

              // [3.19.0.6.22] Step: Validate basic player functionality
              const hasPlayer = tour.player && typeof tour.player.getByClassName === "function";
              if (!hasPlayer) continue;

              // [3.19.0.6.23] Step: Check initialization flag if available
              try {
                if (tour._isInitialized === false) {
                  Logger.debug("Tour not yet initialized (_isInitialized = false)");
                  continue;
                }
              } catch (e) {
                // _isInitialized might not exist, that's okay
              }

              // If we get here, the tour appears ready
              const mainCount = playlists.main?.get("items")?.length || 0;
              const rootCount = playlists.root?.get("items")?.length || 0;
              Logger.debug(
                `Tour readiness validated: ${mainCount} main items, ${rootCount} root items`
              );
              return true;
            }

            Logger.debug("No valid tour found in readiness check");
            return false;
          } catch (error) {
            Logger.debug("Tour readiness check failed:", error);
            return false;
          }
        },
        // [3.19.0.6.24] Method: validateAndInitialize() - Validate tour and initialize search
        async validateAndInitialize() {
          // [3.19.0.6.25] Step: Double-check everything is ready
          if (!this.isTourReady()) {
            throw new Error("Tour validation failed");
          }
          // [3.19.0.6.26] Step: Additional validation and logging
          const items = window.tour.mainPlayList.get("items");
          Logger.info(`Tour ready with ${items.length} panoramas`);
          // [3.19.0.6.27] Step: Initialize search
          if (
            window.tourSearchFunctions &&
            typeof window.tourSearchFunctions.initializeSearch === "function"
          ) {
            window.tourSearchFunctions.initializeSearch(window.tour);
          } else {
            throw new Error("tourSearchFunctions not available");
          }
        },
      };
      // Use the new utility to wait for tour readiness before initializing TourBinding
      initializeSearchWhenTourReady(() => {
        TourBinding.init().catch((error) => {
          Logger.error("Tour binding failed completely during init:", error);
        });
      });
    } catch (error) {
      console.error("Search Pro initialization failed:", error);
    }
  }

  // [3.20] Module: Tour Lifecycle Binding
  const TourLifecycle = {
    // [3.20.1] Method: bindLifecycle()
    bindLifecycle() {
      if (window.tour && window.TDV && window.TDV.Tour) {
        // [3.20.1.0.1] Step: Bind to tour end event
        if (window.TDV.Tour.EVENT_TOUR_ENDED) {
          window.tour.bind(window.TDV.Tour.EVENT_TOUR_ENDED, () => {
            Logger.info("Tour ended - cleaning up search");
            this.cleanup();
          });
        }
      }

      // [3.20.1.1] Step: Handle page unload as a fallback
      window.addEventListener("beforeunload", () => {
        this.cleanup();
      });
    },

    // [3.20.2] Method: cleanup()
    cleanup() {
      try {
        // [3.20.2.0.1] Step: Clean up event listeners
        _unbindSearchEventListeners();

        // [3.20.2.0.2] Step: Close cross-window communication
        if (_crossWindowChannel && _crossWindowChannel._channel) {
          _crossWindowChannel.close();
        }

        // [3.20.2.0.3] Step: Mark as uninitialized
        window.searchListInitialized = false;
        window.searchListInitiinitialized = false;

        Logger.info("Search cleanup completed");
      } catch (error) {
        Logger.warn("Cleanup error:", error);
      }
    },
  };

  // [3.21] Execution: Initialize Lifecycle Binding
  TourLifecycle.bindLifecycle();

  // [3.22] Execution: Start initialization when the DOM is ready
  function initializeDOMReady() {
    try {
      // Load dependencies and CSS first
      Promise.all([loadCSS(), loadDependencies(), loadDebugTools()])
        .then(() => {
          // Check for always-visible mode
          const config = _getInitialConfig();
          const alwaysVisible = config.displayMode?.alwaysVisible === true;

          // Initialize DOM regardless of mode
          initializeDom();

          // If always visible mode is enabled, show search immediately
          if (alwaysVisible) {
            makeSearchAlwaysVisible();
          }

          // Continue with normal initialization to set up event handlers, etc.
          initializeSearchWhenTourReady(() => {
            TourBinding.init().catch((error) => {
              Logger.error("Tour binding failed completely during init:", error);
            });
          });
        })
        .catch((error) => {
          console.error("Search Pro initialization failed:", error);
        });
    } catch (error) {
      console.error("Search Pro initialization failed:", error);
    }
  }

  // Function to get initial configuration - checks for stored config or uses defaults
  function _getInitialConfig() {
    try {
      // First check local storage for saved config if maintainState is enabled
      const savedConfig = localStorage.getItem("searchProConfig");
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          if (parsed && typeof parsed === "object") {
            console.log("Using saved search configuration from local storage");
            return parsed;
          }
        } catch (e) {
          console.warn("Error parsing saved search configuration:", e);
        }
      }

      // Fall back to default configuration - use the existing _config instead
      return _config || {};
    } catch (e) {
      console.warn("Error getting initial config:", e);
      return {}; // Return empty object if all else fails
    }
  }

  // Function to make search always visible
  function makeSearchAlwaysVisible() {
    const searchContainer = document.getElementById("searchContainer");
    if (!searchContainer) {
      console.warn("Search container not found for always-visible mode");
      return;
    }

    // Get configuration
    const config = _getInitialConfig();
    const displayMode = config.displayMode || {};
    const position = displayMode.position || {};
    const style = displayMode.style || {};

    // 1. Add always-visible class
    searchContainer.classList.add("always-visible");

    // 2. Apply custom styling based on configuration
    if (style.compact) {
      searchContainer.classList.add("compact-mode");
    }

    // 3. Apply positioning based on configuration
    const positionStyles = {
      top: position.top !== null ? `${position.top}px` : null,
      right: position.right !== null ? `${position.right}px` : null,
      left: position.left !== null ? `${position.left}px` : null,
      bottom: position.bottom !== null ? `${position.bottom}px` : null,
    };

    Object.entries(positionStyles).forEach(([prop, value]) => {
      if (value !== null) {
        searchContainer.style[prop] = value;
      }
    });

    // 4. Make it visible
    searchContainer.style.display = "block";
    searchContainer.style.opacity =
      style.floatingOpacity !== undefined ? style.floatingOpacity : 0.9;
    searchContainer.classList.add("visible");

    // 5. Set up special event listeners for always-visible mode
    setupAlwaysVisibleEvents(searchContainer);

    Logger.info("Search initialized in always-visible mode");
  }

  // Set up special event listeners for always-visible mode
  function setupAlwaysVisibleEvents(container) {
    const config = _getInitialConfig();
    const animations = config.displayMode?.animations || {};

    // Get input and results
    const input = container.querySelector("#tourSearch");
    const results = container.querySelector(".search-results");

    if (!input) return;

    // Event for focusing the search
    input.addEventListener("focus", () => {
      container.classList.add("focused");

      // Expand on focus if configured
      if (animations.expandOnFocus) {
        container.classList.add("expanded");
      }
    });

    // Event for blur/unfocus
    input.addEventListener("blur", () => {
      // Only remove focused if no search is active
      if (!results.classList.contains("visible")) {
        container.classList.remove("focused");

        // Collapse when empty if configured
        if (animations.collapseWhenEmpty && input.value.trim() === "") {
          container.classList.remove("expanded");
        }
      }
    });

    // Make the search field double-clickable to activate, like regular search
    container.addEventListener("dblclick", (e) => {
      if (e.target !== input) {
        input.focus();
      }
    });
  }

  // Start initialization when the DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();

// [3.23] Utility: Lightweight CSV Parser (Papa)
const Papa = {
  // [3.24] Method: parse()
  parse: function (csvString, options = {}) {
    const defaults = {
      header: false,
      skipEmptyLines: true,
      dynamicTyping: false,
    };

    const settings = { ...defaults, ...options };
    let lines = csvString.split(/\r\n|\n/);

    // [3.24.1] Step: Skip empty lines if requested
    if (settings.skipEmptyLines) {
      lines = lines.filter((line) => line.trim() !== "");
    }

    // [3.24.2] Step: Parse header row if requested
    let headers = [];
    if (settings.header && lines.length > 0) {
      const headerLine = lines.shift();
      headers = headerLine.split(",").map((h) => h.trim());
    }

    // [3.24.3] Step: Parse data rows
    const data = lines.map((line) => {
      const values = line.split(",").map((val) => {
        let v = val.trim();

        // [3.24.3.0.1] Step: Apply dynamic typing if requested
        if (settings.dynamicTyping) {
          // [3.24.3.0.2] Sub-step: Convert to number if it looks like a number
          if (/^[-+]?\d+(\.\d+)?$/.test(v)) {
            return parseFloat(v);
          }
          // [3.24.3.0.3] Sub-step: Convert to boolean if true/false
          else if (v.toLowerCase() === "true") {
            return true;
          } else if (v.toLowerCase() === "false") {
            return false;
          }
        }
        return v;
      });

      // [3.24.3.1] Step: If headers are present, return an object; otherwise, return an array
      if (settings.header) {
        const row = {};
        headers.forEach((header, index) => {
          if (index < values.length) {
            row[header] = values[index];
          }
        });
        return row;
      }
      return values;
    });

    // [3.24.4] Step: Return final parsed data object
    return {
      data: data,
      errors: [],
      meta: {
        delimiter: ",",
        linebreak: "\n",
        aborted: false,
        truncated: false,
        cursor: 0,
      },
    };
  },
};
// [4.0] Main Search Module Definition
window.tourSearchFunctions = (function () {
  // [4.1] Centralized Module-Level Variables
  let currentSearchTerm = "";
  let fuse = null;
  let performSearch = null; // Will be properly initialized in _initializeSearch

  // [4.2] Submodule: PlaylistUtils - Enhanced playlist detection utilities
  const PlaylistUtils = {
    getMainPlayList(tour = null) {
      const tourToCheck = tour || window.tour || window.tourInstance;

      if (!tourToCheck) return null;

      // [4.2.0.1] Step: Method 1 - Direct mainPlayList access (most common)
      if (tourToCheck.mainPlayList?.get && tourToCheck.mainPlayList.get("items")?.length) {
        Logger.debug("Found mainPlayList via direct access");
        return tourToCheck.mainPlayList;
      }

      // [4.2.0.2] Step: Method 2 - Search through all playlists for mainPlayList (robust fallback)
      if (tourToCheck.player?.getByClassName) {
        try {
          const allPlaylists = tourToCheck.player.getByClassName("PlayList");
          const found = allPlaylists.find((pl) => pl.get && pl.get("id") === "mainPlayList");
          if (found?.get("items")?.length) {
            Logger.debug("Found mainPlayList via getByClassName search");
            return found;
          }
        } catch (e) {
          Logger.debug("getByClassName search for mainPlayList failed:", e);
        }
      }

      return null;
    },

    // [4.2.1] Method: getRootPlayerPlayList()
    getRootPlayerPlayList(tour = null) {
      const tourToCheck = tour || window.tour || window.tourInstance;

      if (!tourToCheck) return null;

      try {
        if (
          tourToCheck.locManager?.rootPlayer?.mainPlayList?.get &&
          tourToCheck.locManager.rootPlayer.mainPlayList.get("items")?.length
        ) {
          Logger.debug("Found rootPlayer mainPlayList");
          return tourToCheck.locManager.rootPlayer.mainPlayList;
        }
      } catch (e) {
        Logger.debug("Root player playlist access failed:", e);
      }

      return null;
    },

    // [4.2.2] Method: getAllPlayLists()

    getAllPlayLists(tour = null) {
      return {
        main: this.getMainPlayList(tour),
        root: this.getRootPlayerPlayList(tour),
      };
    },
  };

  // [4.3] Submodule: keyboardManager - Manages keyboard navigation for search results
  const keyboardManager = {
    // [4.3.1] Method: init()
    init(searchContainer, searchInput, searchCallback) {
      if (!searchContainer || !searchInput) {
        Logger.error("Invalid parameters for keyboard manager");
        return () => {}; // Return no-op cleanup function
      }

      // removed duplicate declaration of selectedIndex
      let resultItems = [];

      // Store bound handlers for proper cleanup
      const handlers = {
        documentKeydown: null,
        inputKeyup: null,
        inputKeydown: null,
      };

      // [4.3.1.1] Helper: updateSelection()
      const updateSelection = (newIndex) => {
        resultItems = searchContainer.querySelectorAll(".result-item");
        if (!resultItems.length) return;
        if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
          resultItems[selectedIndex].classList.remove("selected");
          _aria.setSelected(resultItems[selectedIndex], false);
        }
        selectedIndex = newIndex;
        if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
          const selectedItem = resultItems[selectedIndex];
          selectedItem.classList.add("selected");
          _aria.setSelected(selectedItem, true);
          selectedItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
          selectedItem.focus();
        } else {
          searchInput.focus();
        }
      };

      // [4.3.1.2] Event Handler: documentKeydown
      handlers.documentKeydown = function (e) {
        if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          _toggleSearch(true);
        }
        if (!searchContainer.classList.contains("visible")) return;
        switch (e.key) {
          case "Escape":
            e.preventDefault();
            if (searchInput.value.trim() !== "") {
              searchInput.value = "";
              searchCallback();
              selectedIndex = -1;
            } else {
              _toggleSearch(false);
            }
            break;
          case "ArrowDown":
            e.preventDefault();
            updateSelection(Math.min(selectedIndex + 1, resultItems.length - 1));
            break;
          case "ArrowUp":
            e.preventDefault();
            updateSelection(Math.max(selectedIndex - 1, -1));
            break;
          case "Enter":
            if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
              e.preventDefault();
              resultItems[selectedIndex].click();
            }
            break;
          case "Tab":
            // Tab completion: populate search input with selected result's text
            if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
              e.preventDefault();
              const selectedResult = resultItems[selectedIndex];
              const resultText =
                selectedResult.querySelector(".result-title")?.textContent ||
                selectedResult.textContent.split("\n")[0].trim();
              if (resultText && searchInput) {
                searchInput.value = resultText;
                // Trigger input event to update search results
                const inputEvent = new Event("input", { bubbles: true });
                searchInput.dispatchEvent(inputEvent);
              }
            }
            selectedIndex = -1;
            break;
        }
      };

      // [4.3.1.3] Event Handler: inputKeyup (debounced)
      handlers.inputKeyup = _debounce(function () {
        selectedIndex = -1;
      }, 200);

      // [4.3.1.4] Event Handler: inputKeydown
      handlers.inputKeydown = function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          setTimeout(() => {
            resultItems = searchContainer.querySelectorAll(".result-item");
            if (resultItems.length > 0) {
              resultItems[0].click();
            }
          }, 100);
        }
      };

      // [4.3.1.5] Step: Bind all event handlers
      document.addEventListener("keydown", handlers.documentKeydown);
      searchInput.addEventListener("keyup", handlers.inputKeyup);
      searchInput.addEventListener("keydown", handlers.inputKeydown);

      // [4.3.1.6] Return: Cleanup function
      return function cleanup() {
        try {
          document.removeEventListener("keydown", handlers.documentKeydown);
          if (searchInput) {
            searchInput.removeEventListener("keyup", handlers.inputKeyup);
            searchInput.removeEventListener("keydown", handlers.inputKeydown);
          }
          Logger.debug("Keyboard manager event listeners cleaned up");
        } catch (error) {
          Logger.warn("Error cleaning up keyboard manager:", error);
        }
      };
    },
  };

  // [4.4] Module: Constants and Configuration
  const BREAKPOINTS = {
    mobile: 768,
    tablet: 1024,
  };
  // [4.5] Helper Function: isMobileDevice()
  function isMobileDevice() {
    return (
      window.innerWidth <= BREAKPOINTS.mobile ||
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0
    );
  }

  // [4.5.1] Helper Function: _shouldAutoHide() - Decide if we should auto-hide right now
  function _shouldAutoHide() {
    const isMobile = window.innerWidth <= (_config?.mobileBreakpoint ?? 768);
    return (isMobile && _config?.autoHide?.mobile) || (!isMobile && _config?.autoHide?.desktop);
  }

  // [CFG.CANONICAL] ConfigBuilder (single-source defaults)
  // [4.6] Class: ConfigBuilder - For creating and managing search configurations
  class ConfigBuilder {
    // [4.6.1] Method: constructor()
    constructor() {
      // [4.6.1.1] Property: Default configuration
      this.config = {
        // [4.6.1.1.1] Config: autoHide - Auto-hide search on selection
        autoHide: {
          mobile: false,
          desktop: false,
        },
        mobileBreakpoint: BREAKPOINTS.mobile,
        minSearchChars: 2, // Canonical field (not minSearchLength)
        showTagsInResults: false,
        // [4.6.1.1.2] Config: elementTriggering - Settings for triggering elements
        elementTriggering: {
          initialDelay: 300,
          maxRetries: 3,
          retryInterval: 300,
          maxRetryInterval: 1000,
          baseRetryInterval: 300,
        },

        // [4.6.1.1.3] Config: animations - Animation settings
        animations: {
          enabled: true,
          duration: {
            fast: 200,
            normal: 300,
            slow: 500,
          },
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          searchBar: {
            openDuration: 300,
            closeDuration: 200,
            scaleEffect: true,
          },
          results: {
            fadeInDuration: 200,
            slideDistance: 10,
            staggerDelay: 50,
          },
          reducedMotion: {
            respectPreference: true,
            fallbackDuration: 100,
          },
        },
        // [4.6.1.1.4] Config: displayLabels - Labels for different result types
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

        // [4.6.1.1.5] Config: businessData - Business data integration settings
        businessData: {
          useBusinessData: true, // *** Controls whether to use business data or not ***
          businessDataFile: "business.json",
          businessDataDir: "business-data",
          matchField: "id",
          fallbackMatchField: "tags",
          replaceTourData: true, // *** Controls whether to replace tour data with business data or not ***
          includeStandaloneEntries: true, // *** Controls whether to include standalone entries from business data or not ***
          businessDataUrl: "",
        },

        // [4.6.1.1.6] Config: googleSheets - Google Sheets integration settings
        googleSheets: {
          useGoogleSheetData: false, // *** Controls whether to use Google Sheets data or not ***
          includeStandaloneEntries: false, // *** Controls whether to include standalone entries from Google Sheets or not ***
          googleSheetUrl: "",
          localCSVUrl: "",
          fetchMode: "csv",
          useAsDataSource: true, // *** Controls whether to use Google Sheets as the main data source or not ***
          csvOptions: {
            header: true,
            skipEmptyLines: true, // *** Controls whether to skip empty lines or not ***
            dynamicTyping: true, // *** Controls whether to dynamically type values or not ***
          },
          caching: {
            enabled: false,
            timeoutMinutes: 60,
            storageKey: "tourGoogleSheetsData",
          },
          progressiveLoading: {
            enabled: false,
            initialFields: ["id", "tag", "name"],
            detailFields: ["description", "imageUrl", "elementType", "parentId"],
          },
          authentication: {
            enabled: false,
            authType: "apiKey",
            apiKey: "",
            apiKeyParam: "key",
          },
        },

        // [4.6.1.1.7] Config: includeContent - Content inclusion settings
        includeContent: {
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
            includeElements: true,
            include3DHotspots: true,
            include3DModels: true,
            include3DModelObjects: true,
            includeBusiness: true,
            includeContainers: true,
            skipEmptyLabels: false,
            minLabelLength: 0,
          },
          // [4.6.1.1.8] Config: Container search integration
          containerSearch: {
            enableContainerSearch: true, // Enable container search functionality
            containerNames: [""], // Array of container names to include in search
          },
        },
        // [4.6.1.1.9] Config: thumbnailSettings - Thumbnail display options
        thumbnailSettings: {
          enableThumbnails: true,
          thumbnailSize: "medium",
          thumbnailSizePx: 120,
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
            default: "assets/default-thumbnail.jpg",
          },

          iconSettings: {
            enableCustomIcons: true,
            iconSize: "48px",
            iconColor: "#6e85f7",
            iconOpacity: 0.8,
            iconBorderRadius: 4,
            iconAlignment: "left",
            iconMargin: 10,
            enableIconHover: true,
            iconHoverScale: 1.1,
            iconHoverOpacity: 1.0,
            customIcons: {
              Panorama: "🏠",
              Hotspot: "🎯",
              Polygon: "⬟",
              Video: "🎬",
              Webframe: "🌐",
              Image: "🖼️",
              Text: "📝",
              ProjectedImage: "🖥️",
              Element: "⚪",
              Business: "🏢",
              "3DHotspot": "🎮",
              "3DModel": "🎲",
              "3DModelObject": "🔧",
              Container: "📦",
              default: "⚪",
            },
            fallbackSettings: {
              useDefaultOnError: true,
              hideIconOnError: false,
              showTypeLabel: false,
            },
            showIconFor: {
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
              "3dmodel": true,
              "3dhotspot": true,
              "3dmodelobject": true,
              container: true,
              other: true,
            },
          },
          alignment: "left", // "left" or "right"
          groupHeaderAlignment: "left", // "left" or "right"
          groupHeaderPosition: "top", // "top" or "bottom"

          showFor: {
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
            "3dmodel": true,
            "3dhotspot": true,
            "3dmodelobject": true,
            container: true,
            other: true,
          },
        },
      };
    }

    // [4.6.2] Method: setDisplayOptions()
    setDisplayOptions(options) {
      this.config.display = {
        showGroupHeaders: options?.showGroupHeaders !== undefined ? options.showGroupHeaders : true,
        showGroupCount: options?.showGroupCount !== undefined ? options.showGroupCount : true,
        showIconsInResults:
          options?.showIconsInResults !== undefined ? options.showIconsInResults : true,
        onlySubtitles: options?.onlySubtitles !== undefined ? options.onlySubtitles : false,
        showSubtitlesInResults:
          options?.showSubtitlesInResults !== undefined ? options.showSubtitlesInResults : true,
        showParentLabel: options?.showParentLabel !== undefined ? options.showParentLabel : true,
        showParentInfo: options?.showParentInfo !== undefined ? options.showParentInfo : true,
        showParentTags: options?.showParentTags !== undefined ? options.showParentTags : true,
        showParentType: options?.showParentType !== undefined ? options.showParentType : true,
      };
      return this;
    }

    // [4.6.3] Method: setContentOptions()
    setContentOptions(options) {
      this.config.includeContent = {
        unlabeledWithSubtitles:
          options?.unlabeledWithSubtitles !== undefined ? options.unlabeledWithSubtitles : true,
        unlabeledWithTags:
          options?.unlabeledWithTags !== undefined ? options.unlabeledWithTags : true,
        completelyBlank: options?.completelyBlank !== undefined ? options.completelyBlank : true,
        elements: {
          includePanoramas:
            options?.elements?.includePanoramas !== undefined
              ? options.elements.includePanoramas
              : true,
          includeHotspots:
            options?.elements?.includeHotspots !== undefined
              ? options.elements.includeHotspots
              : true,
          includePolygons:
            options?.elements?.includePolygons !== undefined
              ? options.elements.includePolygons
              : true,
          includeVideos:
            options?.elements?.includeVideos !== undefined ? options.elements.includeVideos : true,
          includeWebframes:
            options?.elements?.includeWebframes !== undefined
              ? options.elements.includeWebframes
              : true,
          includeImages:
            options?.elements?.includeImages !== undefined ? options.elements.includeImages : true,
          includeText:
            options?.elements?.includeText !== undefined ? options.elements.includeText : true,
          includeProjectedImages:
            options?.elements?.includeProjectedImages !== undefined
              ? options.elements.includeProjectedImages
              : true,
          includeElements:
            options?.elements?.includeElements !== undefined
              ? options.elements.includeElements
              : true,
          include3DHotspots:
            options?.elements?.include3DHotspots !== undefined
              ? options.elements.include3DHotspots
              : true,
          include3DModels:
            options?.elements?.include3DModels !== undefined
              ? options.elements.include3DModels
              : true,
          include3DModelObjects:
            options?.elements?.include3DModelObjects !== undefined
              ? options.elements.include3DModelObjects
              : true,
          includeBusiness:
            options?.elements?.includeBusiness !== undefined
              ? options.elements.includeBusiness
              : true,
          includeContainers:
            options?.elements?.includeContainers !== undefined
              ? options.elements.includeContainers
              : true,
          skipEmptyLabels:
            options?.elements?.skipEmptyLabels !== undefined
              ? options.elements.skipEmptyLabels
              : false,
          minLabelLength:
            options?.elements?.minLabelLength !== undefined ? options.elements.minLabelLength : 0,
        },
        containerSearch: {
          enableContainerSearch:
            options?.containerSearch?.enableContainerSearch !== undefined
              ? options.containerSearch.enableContainerSearch
              : false,
          containerNames: options?.containerSearch?.containerNames || [],
        },
      };
      return this;
    }

    // [4.6.4] Method: setFilterOptions()
    setFilterOptions(options) {
      this.config.filter = {
        mode: options?.mode !== undefined ? options?.mode : "none", // 'none' | 'whitelist' | 'blacklist'  (top-level on display label)
        allowedValues: options?.allowedValues || [],
        blacklistedValues: options?.blacklistedValues || [],
        valueMatchMode: {
          whitelist: options?.valueMatchMode?.whitelist || "exact", // 'exact' | 'contains' | 'startsWith' | 'regex'
          blacklist: options?.valueMatchMode?.blacklist || "contains",
        },
        elementTypes: {
          mode: options?.elementTypes?.mode !== undefined ? options?.elementTypes?.mode : "none",
          allowedTypes: options?.elementTypes?.allowedTypes || [],
          blacklistedTypes: options?.elementTypes?.blacklistedTypes || [],
        },
        elementLabels: {
          mode: options?.elementLabels?.mode !== undefined ? options?.elementLabels?.mode : "none",
          allowedValues: options?.elementLabels?.allowedValues || [],
          blacklistedValues: options?.elementLabels?.blacklistedValues || [],
        },
        tagFiltering: {
          mode: options?.tagFiltering?.mode !== undefined ? options?.tagFiltering?.mode : "none",
          allowedTags: options?.tagFiltering?.allowedTags || [],
          blacklistedTags: options?.tagFiltering?.blacklistedTags || [],
        },
        mediaIndexes: {
          mode: options?.mediaIndexes?.mode !== undefined ? options?.mediaIndexes?.mode : "none",
          allowed: options?.mediaIndexes?.allowed || [],
          blacklisted: options?.mediaIndexes?.blacklisted || [],
        }, // keep present; guarded (no-op unless enabled)
      };
      return this;
    }

    // [4.6.5] Method: setLabelOptions()
    setLabelOptions(options) {
      this.config.useAsLabel = {
        subtitles: options?.subtitles !== undefined ? options.subtitles : true,
        tags: options?.tags !== undefined ? options.tags : true,
        elementType: options?.elementType !== undefined ? options.elementType : true,
        parentWithType: options?.parentWithType !== undefined ? options.parentWithType : false,
        customText: options?.customText || "[Unnamed Item]",
      };
      return this;
    }

    // [4.6.6] Method: setAppearanceOptions()
    setAppearanceOptions(options) {
      if (!options) return this;

      this.config.appearance = {
        searchField: {
          borderRadius: {
            topLeft: options.searchField?.borderRadius?.topLeft ?? 25,
            topRight: options.searchField?.borderRadius?.topRight ?? 25,
            bottomRight: options.searchField?.borderRadius?.bottomRight ?? 25,
            bottomLeft: options.searchField?.borderRadius?.bottomLeft ?? 25,
          },
          // [4.6.6.0.1] Typography Controls
          typography: {
            // Input text styling
            fontSize: "16px", // *** Font size for input text
            fontFamily: "inherit", // *** Font family ("Arial", "Helvetica", "inherit")
            fontWeight: "400", // *** Font weight (100-900, "normal", "bold")
            fontStyle: "normal", // *** Font style ("normal", "italic", "oblique")
            lineHeight: "1.5", // *** Line height (number or "1.2", "normal")
            letterSpacing: "0px", // *** Letter spacing ("0.5px", "normal")
            textTransform: "none", // *** Text transform ("none", "uppercase", "lowercase", "capitalize")

            // [4.6.6.0.2] Placeholder specific styling
            placeholder: {
              fontSize: "16px", // *** Placeholder font size
              fontFamily: "inherit", // *** Placeholder font family
              fontWeight: "400", // *** Placeholder font weight
              fontStyle: "italic", // *** Placeholder font style
              opacity: 0.7, // *** Placeholder opacity (0.0-1.0)
              letterSpacing: "0px", // *** Placeholder letter spacing
              textTransform: "none", // *** Placeholder text transform
            },

            // [4.6.6.0.3] Focus state styling
            focus: {
              fontSize: "16px", // *** Font size when focused
              fontWeight: "400", // *** Font weight when focused
              letterSpacing: "0.25px", // *** Letter spacing when focused
            },
          },
        },
        searchResults: {
          borderRadius: {
            topLeft: options.searchResults?.borderRadius?.topLeft ?? 5,
            topRight: options.searchResults?.borderRadius?.topRight ?? 5,
            bottomRight: options.searchResults?.borderRadius?.bottomRight ?? 5,
            bottomLeft: options.searchResults?.borderRadius?.bottomLeft ?? 5,
          },
        },

        // [4.6.6.0.4] Method: setSearchFieldTypography()
        setSearchFieldTypography(options) {
          if (!options) return this;

          if (!this.config.appearance) this.config.appearance = {};
          if (!this.config.appearance.searchField) this.config.appearance.searchField = {};

          this.config.appearance.searchField.typography = {
            fontSize: options.fontSize || "16px",
            fontFamily: options.fontFamily || "inherit",
            fontWeight: options.fontWeight || "400",
            fontStyle: options.fontStyle || "normal",
            lineHeight: options.lineHeight || "1.5",
            letterSpacing: options.letterSpacing || "0px",
            textTransform: options.textTransform || "none",

            placeholder: {
              fontSize: options.placeholder?.fontSize || options.fontSize || "16px",
              fontFamily: options.placeholder?.fontFamily || options.fontFamily || "inherit",
              fontWeight: options.placeholder?.fontWeight || "400",
              fontStyle: options.placeholder?.fontStyle || "italic",
              opacity:
                options.placeholder?.opacity !== undefined ? options.placeholder.opacity : 0.7,
              letterSpacing: options.placeholder?.letterSpacing || "0px",
              textTransform: options.placeholder?.textTransform || "none",
            },

            focus: {
              fontSize: options.focus?.fontSize || options.fontSize || "16px",
              fontWeight: options.focus?.fontWeight || "400",
              letterSpacing: options.focus?.letterSpacing || "0.25px",
            },
          };

          return this;
        },
        // [4.6.6.0.5] Method: setColors()
        colors: {
          searchBackground: options.colors?.searchBackground ?? "#f4f3f2",
          searchText: options.colors?.searchText ?? "#1a1a1a",
          placeholderText: options.colors?.placeholderText ?? "#94a3b8",
          searchIcon: options.colors?.searchIcon ?? "#94a3b8",
          clearIcon: options.colors?.clearIcon ?? "#94a3b8",
          resultsBackground: options.colors?.resultsBackground ?? "#ffffff",
          groupHeaderBackground: options.colors?.groupHeaderBackground ?? "#ffffff",
          groupHeaderColor: options.colors?.groupHeaderColor ?? "#20293A",
          groupCountColor: options.colors?.groupCountColor ?? "#94a3b8",
          resultHover: options.colors?.resultHover ?? "#f0f0f0",
          resultBorderLeft: options.colors?.resultBorderLeft ?? "#ebebeb",
          resultText: options.colors?.resultText ?? "#1e293b",
          resultSubtitle: options.colors?.resultSubtitle ?? "#64748b",
          resultIconColor: options.colors?.resultIconColor ?? "#6e85f7",
          resultSubtextColor: options.colors?.resultSubtextColor ?? "#000000",
          // [4.6.6.0.6] HIGHLIGHT CONFIGURATIONS
          highlightBackground: options.colors?.highlightBackground ?? "#ffff00",
          highlightBackgroundOpacity: options.colors?.highlightBackgroundOpacity ?? 0.5,
          highlightText: options.colors?.highlightText ?? "#000000",
          highlightWeight: options.colors?.highlightWeight ?? "bold",
          // [4.6.6.0.7] TAG COLOR CONFIGURATIONS
          tagBackground: options.colors?.tagBackground ?? "#e2e8f0",
          tagText: options.colors?.tagText ?? "#475569",
          tagBorder: options.colors?.tagBorder ?? "#cbd5e1",
          tagHover: options.colors?.tagHover ?? "#d1d5db",
        },
        // [4.6.6.0.8] TAG STYLING CONFIGURATIONS
        tags: {
          borderRadius: options.tags?.borderRadius ?? 12,
          fontSize: options.tags?.fontSize ?? "12px",
          padding: options.tags?.padding ?? "2px 8px",
          margin: options.tags?.margin ?? "2px",
          fontWeight: options.tags?.fontWeight ?? "500",
          textTransform: options.tags?.textTransform ?? "none", // "none", "uppercase", "lowercase", "capitalize"
          showBorder: options.tags?.showBorder ?? true,
          borderWidth: options.tags?.borderWidth ?? "1px",
        },
      };

      return this;
    }

    // [4.6.7] Method: setSearchBarOptions()
    setSearchBarOptions(options) {
      this.config.searchBar = {
        placeholder: options?.placeholder || "Search...",
        width: options?.width || 350,
        position: {
          top: options?.position?.top !== undefined ? options.position.top : 70,
          right: options?.position?.right !== undefined ? options.position.right : 70,
          left: options?.position?.left !== undefined ? options.position.left : null,
          bottom: options?.position?.bottom !== undefined ? options.position.bottom : null,
        },
        useResponsive: options?.useResponsive !== undefined ? options.useResponsive : true,
        mobilePosition: {
          top: options?.mobilePosition?.top !== undefined ? options.mobilePosition.top : 60,
          left: options?.mobilePosition?.left !== undefined ? options.mobilePosition.left : 20,
          right: options?.mobilePosition?.right !== undefined ? options.mobilePosition.right : 20,
          bottom:
            options?.mobilePosition?.bottom !== undefined ? options.mobilePosition.bottom : "auto",
        },

        mobileOverrides: {
          enabled:
            options?.mobileOverrides?.enabled !== undefined
              ? options.mobileOverrides.enabled
              : true,
          breakpoint:
            options?.mobileOverrides?.breakpoint !== undefined
              ? options.mobileOverrides.breakpoint
              : 768,
          width:
            options?.mobileOverrides?.width !== undefined ? options.mobileOverrides.width : "90%",
          maxWidth:
            options?.mobileOverrides?.maxWidth !== undefined
              ? options.mobileOverrides.maxWidth
              : 350,
          visibility: {
            behavior: options?.mobileOverrides?.visibility?.behavior || "dynamic", // 'dynamic', 'fixed', 'toggle'
            showOnScroll:
              options?.mobileOverrides?.visibility?.showOnScroll !== undefined
                ? options.mobileOverrides.visibility.showOnScroll
                : false,
            hideThreshold:
              options?.mobileOverrides?.visibility?.hideThreshold !== undefined
                ? options.mobileOverrides.visibility.hideThreshold
                : 100,
          },
        },
      };
      return this;
    }

    // [4.6.8] Method: setGeneralOptions()
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

    // [4.6.9] Method: setDisplayLabels()
    setDisplayLabels(options) {
      if (!options) return this;

      // Merge with defaults
      this.config.displayLabels = {
        ...this.config.displayLabels,
        ...options,
      };
      return this;
    }

    // [4.6.10] Method: setBusinessDataOptions()
    setBusinessDataOptions(options) {
      if (!options) return this;

      this.config.businessData = {
        useBusinessData: options.useBusinessData !== undefined ? options.useBusinessData : true,
        businessDataFile: options.businessDataFile || "business.json",
        businessDataDir: options.businessDataDir || "business-data",
        matchField: options.matchField || "id",
        fallbackMatchField: options.fallbackMatchField || "tags",

        replaceTourData: options.replaceTourData !== undefined ? options.replaceTourData : true,
      };
      return this;
    }

    // [4.6.11] Method: setThumbnailSettings()
    setThumbnailSettings(options) {
      if (!options) return this;

      // Valid thumbnail types
      const validTypes = [
        "panorama",
        "hotspot",
        "polygon",
        "video",
        "webframe",
        "image",
        "text",
        "projectedimage",
        "element",
        "business",
        "container",
        "3dmodel",
        "3dhotspot",
        "3dmodelobject",
        "other",
      ];

      // Normalize showFor configuration
      const normalizedShowFor = {};
      if (options.showFor) {
        Object.keys(options.showFor).forEach((key) => {
          const normalizedKey = key.toLowerCase();
          if (validTypes.includes(normalizedKey)) {
            normalizedShowFor[normalizedKey] = options.showFor[key];
          } else {
            Logger.warn(`[Config] Unknown thumbnail type: ${key}, mapping to 'other'`);
            normalizedShowFor["other"] = options.showFor[key];
          }
        });
      }

      // Local implementation of makeSizePxString (since the main one isn't available yet)
      const makeSizePxString = function (size) {
        // Handle null, undefined, or empty values
        if (size == null || size === "") return "0px";

        // If it's already a string with a unit (px, em, rem, etc.), return as is
        if (typeof size === "string") {
          // Special case for named sizes
          if (size === "small") return "32px";
          if (size === "medium") return "48px";
          if (size === "large") return "64px";

          // Check if it already has a CSS unit
          if (/^\d+(\.\d+)?(%|px|em|rem|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc)$/.test(size)) {
            return size;
          }

          // If it's a string number without unit, parse it and add px
          const num = parseFloat(size);
          if (!isNaN(num)) {
            return `${num}px`;
          }

          // Default for invalid string
          return "48px"; // Default size
        }

        // If it's a number, add px unit
        if (typeof size === "number") {
          return `${size}px`;
        }

        // Default for any other type
        return "48px"; // Default size
      };

      // Get the size value, using either thumbnailSize or thumbnailSizePx
      let sizeStr;

      if (options.thumbnailSize !== undefined) {
        sizeStr = makeSizePxString(options.thumbnailSize);
      } else if (options.thumbnailSizePx !== undefined) {
        sizeStr = makeSizePxString(options.thumbnailSizePx);
      } else {
        sizeStr = "48px"; // Default
      }

      this.config.thumbnailSettings = {
        enableThumbnails: options.enableThumbnails !== undefined ? options.enableThumbnails : true,
        thumbnailSize: sizeStr, // Always store as pixel string
        borderRadius: options.borderRadius !== undefined ? options.borderRadius : 4,
        borderColor: options.borderColor || "#9CBBFF",
        borderWidth: options.borderWidth || 2,
        defaultImagePath: options.defaultImagePath || "assets/default-thumbnail.jpg",

        defaultImages: options.defaultImages || {
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
          "3DModel": "assets/3d-model-default.jpg",
          "3DHotspot": "assets/3d-hotspot-default.jpg",
          default: "assets/default-thumbnail.jpg",
        },

        alignment: options.alignment === "right" ? "right" : "left",
        groupHeaderAlignment: ["left", "right"].includes(options.groupHeaderAlignment)
          ? options.groupHeaderAlignment
          : "left",
        groupHeaderPosition: options.groupHeaderPosition === "bottom" ? "bottom" : "top",

        // Use normalized showFor with fallbacks
        showFor: {
          panorama: normalizedShowFor.panorama !== undefined ? normalizedShowFor.panorama : true,
          hotspot: normalizedShowFor.hotspot !== undefined ? normalizedShowFor.hotspot : true,
          polygon: normalizedShowFor.polygon !== undefined ? normalizedShowFor.polygon : true,
          video: normalizedShowFor.video !== undefined ? normalizedShowFor.video : true,
          webframe: normalizedShowFor.webframe !== undefined ? normalizedShowFor.webframe : true,
          image: normalizedShowFor.image !== undefined ? normalizedShowFor.image : true,
          text: normalizedShowFor.text !== undefined ? normalizedShowFor.text : true,
          projectedimage:
            normalizedShowFor.projectedimage !== undefined
              ? normalizedShowFor.projectedimage
              : true,
          element: normalizedShowFor.element !== undefined ? normalizedShowFor.element : true,
          business: normalizedShowFor.business !== undefined ? normalizedShowFor.business : true,
          "3dmodel":
            normalizedShowFor["3dmodel"] !== undefined ? normalizedShowFor["3dmodel"] : true,
          "3dhotspot":
            normalizedShowFor["3dhotspot"] !== undefined ? normalizedShowFor["3dhotspot"] : true,
          "3dmodelobject":
            normalizedShowFor["3dmodelobject"] !== undefined
              ? normalizedShowFor["3dmodelobject"]
              : true,
          other: normalizedShowFor.other !== undefined ? normalizedShowFor.other : true,
        },
      };

      return this;
    }

    // [4.6.12] Method: setIconSettings()
    setIconSettings(options) {
      if (!options) return this;

      // Ensure thumbnailSettings exists
      if (!this.config.thumbnailSettings) {
        this.config.thumbnailSettings = {};
      }

      // Extract pixel value from size string (e.g., "48px" -> 48)
      let iconSizePx = 48; // default
      if (options.iconSize && options.iconSize.endsWith("px")) {
        iconSizePx = parseInt(options.iconSize.replace("px", ""));
      }

      // Normalize showIconFor configuration
      const validTypes = [
        "panorama",
        "hotspot",
        "polygon",
        "video",
        "webframe",
        "image",
        "text",
        "projectedimage",
        "element",
        "business",
        "container",
        "3dmodel",
        "3dhotspot",
        "3dmodelobject",
        "other",
      ];

      const normalizedShowIconFor = {};
      if (options.showIconFor) {
        Object.keys(options.showIconFor).forEach((key) => {
          const normalizedKey = key.toLowerCase();
          if (validTypes.includes(normalizedKey)) {
            normalizedShowIconFor[normalizedKey] = options.showIconFor[key];
          } else {
            Logger.warn(`[Config] Unknown icon type: ${key}, mapping to 'other'`);
            normalizedShowIconFor["other"] = options.showIconFor[key];
          }
        });
      }

      // Use pixel size directly
      let sizePx = iconSizePx;

      // Initialize iconSettings
      this.config.thumbnailSettings.iconSettings = {
        // More flexible boolean conversion
        enableCustomIcons: Boolean(options.enableCustomIcons),
        iconSize: options.iconSize || "48px",
        iconColor: options.iconColor || "#6e85f7",
        iconOpacity: options.iconOpacity !== undefined ? options.iconOpacity : 0.8,
        iconBorderRadius: options.iconBorderRadius !== undefined ? options.iconBorderRadius : 4,
        iconAlignment: options.iconAlignment === "right" ? "right" : "left",
        iconMargin: options.iconMargin !== undefined ? options.iconMargin : 10,
        enableIconHover: options.enableIconHover !== undefined ? options.enableIconHover : true,
        iconHoverScale: options.iconHoverScale !== undefined ? options.iconHoverScale : 1.1,
        iconHoverOpacity: options.iconHoverOpacity !== undefined ? options.iconHoverOpacity : 1.0,

        enableFontAwesome: Boolean(options.enableFontAwesome), // *** Enable/disable Font Awesome loading
        fontAwesomeUrl:
          options.fontAwesomeUrl ||
          "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css", // *** Custom Font Awesome URL

        customIcons: {
          Panorama: "🏠",
          Hotspot: "🎯",
          Polygon: "⬟",
          Video: "🎬",
          Webframe: "🌐",
          Image: "🖼️",
          Text: "📝",
          ProjectedImage: "🖥️",
          Element: "⚪",
          Business: "🏢",
          "3DHotspot": "🎮",
          "3DModel": "🎲",
          "3DModelObject": "🔧",
          Container: "📦",
          default: "⚪",
          ...options.customIcons,
        },

        fallbackSettings: {
          useDefaultOnError:
            options.fallbackSettings?.useDefaultOnError !== undefined
              ? options.fallbackSettings.useDefaultOnError
              : true,
          hideIconOnError:
            options.fallbackSettings?.hideIconOnError !== undefined
              ? options.fallbackSettings.hideIconOnError
              : false,
          showTypeLabel:
            options.fallbackSettings?.showTypeLabel !== undefined
              ? options.fallbackSettings.showTypeLabel
              : false,
        },

        showIconFor: {
          panorama:
            normalizedShowIconFor.panorama !== undefined ? normalizedShowIconFor.panorama : true,
          hotspot:
            normalizedShowIconFor.hotspot !== undefined ? normalizedShowIconFor.hotspot : true,
          polygon:
            normalizedShowIconFor.polygon !== undefined ? normalizedShowIconFor.polygon : true,
          video: normalizedShowIconFor.video !== undefined ? normalizedShowIconFor.video : true,
          webframe:
            normalizedShowIconFor.webframe !== undefined ? normalizedShowIconFor.webframe : true,
          image: normalizedShowIconFor.image !== undefined ? normalizedShowIconFor.image : true,
          text: normalizedShowIconFor.text !== undefined ? normalizedShowIconFor.text : true,
          projectedimage:
            normalizedShowIconFor.projectedimage !== undefined
              ? normalizedShowIconFor.projectedimage
              : true,
          element:
            normalizedShowIconFor.element !== undefined ? normalizedShowIconFor.element : true,
          business:
            normalizedShowIconFor.business !== undefined ? normalizedShowIconFor.business : true,
          container:
            normalizedShowIconFor.container !== undefined ? normalizedShowIconFor.container : true,
          "3dmodel":
            normalizedShowIconFor["3dmodel"] !== undefined
              ? normalizedShowIconFor["3dmodel"]
              : true,
          "3dhotspot":
            normalizedShowIconFor["3dhotspot"] !== undefined
              ? normalizedShowIconFor["3dhotspot"]
              : true,
          "3dmodelobject":
            normalizedShowIconFor["3dmodelobject"] !== undefined
              ? normalizedShowIconFor["3dmodelobject"]
              : true,
          other: normalizedShowIconFor.other !== undefined ? normalizedShowIconFor.other : true,
        },
      };

      // Add debug logging
      console.log(
        `[CONFIG] Set thumbnailSettings.iconSettings.enableCustomIcons to: ${this.config.thumbnailSettings.iconSettings.enableCustomIcons}`
      );
      console.log(
        `[CONFIG] Original value passed: ${options.enableCustomIcons} (type: ${typeof options.enableCustomIcons})`
      );

      return this;
    }

    // [4.6.13] Method: setGoogleSheetsOptions()
    setGoogleSheetsOptions(options) {
      if (!options) return this;

      this.config.googleSheets = {
        useGoogleSheetData:
          options.useGoogleSheetData !== undefined ? options.useGoogleSheetData : false,
        googleSheetUrl: options.googleSheetUrl || "",
        useLocalCSV: options.useLocalCSV !== undefined ? options.useLocalCSV : false,
        localCSVFile: options.localCSVFile || "search-data.csv",
        localCSVDir: options.localCSVDir || "business-data",
        localCSVUrl: options.localCSVUrl || "",
        fetchMode: options.fetchMode || "csv",
        useAsDataSource: options.useAsDataSource !== undefined ? options.useAsDataSource : false,
        csvOptions: {
          header: options.csvOptions?.header !== undefined ? options.csvOptions.header : true,
          skipEmptyLines:
            options.csvOptions?.skipEmptyLines !== undefined
              ? options.csvOptions.skipEmptyLines
              : true,
          dynamicTyping:
            options.csvOptions?.dynamicTyping !== undefined
              ? options.csvOptions.dynamicTyping
              : true,
          ...options.csvOptions,
        },
        // Caching options
        caching: {
          enabled: options.caching?.enabled !== undefined ? options.caching.enabled : true,
          timeoutMinutes: options.caching?.timeoutMinutes || 60,
          storageKey: options.caching?.storageKey || "tourGoogleSheetsData",
        },
        // Progressive loading options
        progressiveLoading: {
          enabled:
            options.progressiveLoading?.enabled !== undefined
              ? options.progressiveLoading.enabled
              : false,
          initialFields: options.progressiveLoading?.initialFields || ["id", "tag", "name"],
          detailFields: options.progressiveLoading?.detailFields || [
            "description",
            "imageUrl",
            "elementType",
            "parentId",
          ],
        },
        // Authentication options
        authentication: {
          enabled:
            options.authentication?.enabled !== undefined ? options.authentication.enabled : false,
          authType: options.authentication?.authType || "apiKey",
          apiKey: options.authentication?.apiKey || "",
          apiKeyParam: options.authentication?.apiKeyParam || "key",
        },
      };
      return this;
    }

    // [4.6.14] Method: setAnimationOptions()
    setAnimationOptions(options) {
      if (!options) return this;

      // Ensure we have a base animations object
      if (!this.config.animations) {
        this.config.animations = {};
      }

      this.config.animations = {
        enabled: options.enabled !== undefined ? options.enabled : true,
        duration: {
          fast: options.duration?.fast || 200,
          normal: options.duration?.normal || 300,
          slow: options.duration?.slow || 500,
        },
        easing: options.easing || "cubic-bezier(0.22, 1, 0.36, 1)",
        searchBar: {
          openDuration: options.searchBar?.openDuration || 300,
          closeDuration: options.searchBar?.closeDuration || 200,
          scaleEffect: options.searchBar?.scaleEffect !== false,
        },
        results: {
          fadeInDuration: options.results?.fadeInDuration || 200,
          slideDistance: options.results?.slideDistance || 10,
          staggerDelay: options.results?.staggerDelay || 50,
        },
        reducedMotion: {
          respectPreference: options.reducedMotion?.respectPreference !== false,
          fallbackDuration: options.reducedMotion?.fallbackDuration || 100,
        },
      };

      console.log("🎬 Animation options set:", this.config.animations);
      return this;
    }

    // [4.6.15] Method: setSearchOptions()
    setSearchOptions(options) {
      if (!options) return this;

      this.config.searchSettings = {
        // Field weights for search priority
        fieldWeights: {
          label: options.fieldWeights?.label ?? 1.0, // Primary item name
          businessName: options.fieldWeights?.businessName ?? 0.9, // Business data name
          subtitle: options.fieldWeights?.subtitle ?? 0.8, // Item description
          businessTag: options.fieldWeights?.businessTag ?? 0.7, // Business tags
          tags: options.fieldWeights?.tags ?? 0.6, // Regular tags
          parentLabel: options.fieldWeights?.parentLabel ?? 0.3, // Parent item name
        },

        // Fuse.js behavior settings
        behavior: {
          threshold: options.behavior?.threshold ?? 0.4, // 0.0 = exact, 1.0 = match anything
          distance: options.behavior?.distance ?? 40, // Character distance for matches
          minMatchCharLength: options.behavior?.minMatchCharLength ?? 1, // Min chars to match
          useExtendedSearch: options.behavior?.useExtendedSearch ?? true, // Enable operators like 'word
          ignoreLocation: options.behavior?.ignoreLocation ?? true, // Don't prioritize start of text
          location: options.behavior?.location ?? 0, // Position to start search
          includeScore: options.behavior?.includeScore ?? true, // Include match scores
        },

        // Boost values for different item types
        boostValues: {
          businessMatch: options.boostValues?.businessMatch ?? 2.0, // Items with business data
          sheetsMatch: options.boostValues?.sheetsMatch ?? 2.5, // Items with sheets data
          labeledItem: options.boostValues?.labeledItem ?? 1.5, // Items with labels
          unlabeledItem: options.boostValues?.unlabeledItem ?? 1.0, // Items without labels
          childElement: options.boostValues?.childElement ?? 0.8, // Child elements (hotspots)
        },
      };

      return this;
    }
    // [4.6.16] Method: build()
    build() {
      return this.config;
    }
  }

  // [CFG.RUNTIME] _config source of truth
  // [4.7] Logic Block: Create Default Configuration
  let _config = new ConfigBuilder()
    .setDisplayOptions({})
    .setContentOptions({})
    .setFilterOptions({})
    .setLabelOptions({})
    .setAppearanceOptions({})
    .setSearchBarOptions({})
    .setBusinessDataOptions({})
    .setGoogleSheetsOptions({})
    .setAnimationOptions({})
    .setSearchOptions({})
    .setDisplayLabels({})
    .setThumbnailSettings({})
    .setIconSettings({})
    .build();

  // [4.7.1] Helper Function: Deep merge objects
  function deepMerge(target, source) {
    if (!source || typeof source !== "object") return target;
    if (!target || typeof target !== "object") return source;

    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
          result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  // [4.7.2] Logic Block: Override with External Configuration if Available
  // MOVED TO DOMContentLoaded - External config is now applied AFTER initialization (see line ~11285)
  // This ensures window.searchProConfig is available and search system is fully initialized
  // Previous approach checked too early, before external script loaded

  // if (typeof window.searchProConfig !== 'undefined' && window.searchProConfig) {
  //   console.log('Loading external search configuration...');
  //   try {
  //     _config = deepMerge(_config, window.searchProConfig);
  //     console.log('External search configuration loaded successfully');
  //   } catch (error) {
  //     console.warn('Error loading external search configuration:', error);
  //   }
  // }

  // [4.8] Submodule: LOGGING UTILITIES
  const Logger = window.Logger;

  // [4.9] Logic Block: Module State Variables
  let _initialized = false;
  let keyboardCleanup = null;
  let _businessData = [];
  let _googleSheetsData = [];

  // [4.10] Logic Block: DOM ELEMENT CACHE
  const _elements = {
    container: null,
    input: null,
    results: null,
    clearButton: null,
    searchIcon: null,
  };

  // [4.11] Submodule: CROSS-WINDOW COMMUNICATION
  const _crossWindowChannel = {
    // Channel instance
    _channel: null,

    // Channel name
    channelName: "tourSearchChannel",

    // [4.11.1] Method: init()
    init() {
      try {
        if (typeof BroadcastChannel !== "undefined") {
          this._channel = new BroadcastChannel(this.channelName);
          Logger.info("BroadcastChannel initialized for cross-window communication");
          return true;
        } else {
          Logger.warn("BroadcastChannel API not available");
          return false;
        }
      } catch (error) {
        Logger.warn("Failed to initialize BroadcastChannel:", error);
        return false;
      }
    },

    // [4.11.2] Method: send()
    send(type, data) {
      try {
        if (!this._channel) {
          if (!this.init()) return false;
        }

        this._channel.postMessage({ type, data, timestamp: Date.now() });
        return true;
      } catch (error) {
        Logger.warn("Error sending message through BroadcastChannel:", error);
        return false;
      }
    },

    // [4.11.3] Method: listen()
    listen(callback) {
      try {
        if (!this._channel) {
          if (!this.init()) return false;
        }

        this._channel.onmessage = (event) => {
          if (event && event.data && typeof callback === "function") {
            callback(event.data);
          }
        };
        return true;
      } catch (error) {
        Logger.warn("Error setting up BroadcastChannel listener:", error);
        return false;
      }
    },

    // [4.11.4] Method: close()
    close() {
      try {
        if (this._channel) {
          this._channel.close();
          this._channel = null;
          return true;
        }
        return false;
      } catch (error) {
        Logger.warn("Error closing BroadcastChannel:", error);
        return false;
      }
    },
  };

  // [4.12] Submodule: Utility Functions
  // [4.13] Method: _debounce()
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

  /**
   * [4.9.2] Method: _normalizeImagePath() - Normalizes image paths to ensure they're correctly resolved
   * @param {string} path - The image path to normalize
   * @param {boolean} [tryAlternateFormats=true] - Whether to try alternate formats
   * @returns {string} - The normalized image path
   */
  function _normalizeImagePath(path, tryAlternateFormats = true) {
    return _resolveAssetUrl(path);
  }

  /**
   * [4.9.3] Method: _resolveAssetUrl() - Robust asset URL resolver that prevents double "search-pro-v3" segments
   * @param {string} input - The input path to resolve
   * @returns {string|null} - The resolved asset URL or null if input is falsy
   */
  function _resolveAssetUrl(input) {
    if (!input) return null;
    let v = String(input).trim();

    // Absolute URLs or site-absolute -> leave origin as-is
    if (/^(https?:)?\/\//i.test(v) || v.startsWith("/")) return v;

    // Common control-panel prefixes -> collapse to plain "assets/…"
    // e.g. "./search-pro-v3/assets/x.jpg" -> "assets/x.jpg"
    //      "search-pro-v3/assets/x.jpg"   -> "assets/x.jpg"
    v = v.replace(/^\.?\/?search-pro-v3\/assets\//i, "assets/");

    // Strip leading "./" if present
    v = v.replace(/^\.\//, "");

    // Ensure we start at "assets/…" for relative inputs
    if (!/^assets\//i.test(v)) v = "assets/" + v.replace(/^\/+/, "");

    // Find plugin base (the folder that contains /search-pro-v3/)
    const base = (function () {
      const script = Array.from(document.scripts || []).find((s) =>
        /search-v3\.js(\?|$)/.test(s.src)
      );
      if (script?.src) {
        const u = new URL(script.src, window.location.href);
        // Trim to ".../search-pro-v3/"
        const parts = u.pathname.split("/");
        const ix = parts.lastIndexOf("search-pro-v3");
        if (ix > -1) {
          u.pathname = parts.slice(0, ix + 1).join("/") + "/";
        } else {
          // fallback: directory of the script file
          u.pathname = u.pathname.replace(/\/[^/]*$/, "/");
        }
        return u.toString();
      }
      // ultimate fallback
      return window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "/");
    })();

    try {
      // Join safely; this prevents double "search-pro-v3" segments
      return new URL(v, base).toString();
    } catch {
      return v; // graceful fallback
    }
  }

  // [4.14] Method: _getThumbnailUrl() - Centralized thumbnail selection with config respect
  function _getThumbnailUrl(resultItem, config) {
    // First check: Global thumbnail setting
    if (!config.thumbnailSettings?.enableThumbnails) {
      return null;
    }

    // Check if thumbnails are enabled for this specific element type
    const showForSettings = config.thumbnailSettings?.showFor || {};
    const elementType = resultItem.type?.toLowerCase() || "other";

    // Map element types to showFor keys (handle case sensitivity)
    const typeMapping = {
      panorama: "panorama",
      hotspot: "hotspot",
      polygon: "polygon",
      video: "video",
      webframe: "webframe",
      image: "image",
      text: "text",
      projectedimage: "projectedimage",
      element: "element",
      business: "business",
      "3dmodel": "3dmodel",
      "3dhotspot": "3dhotspot",
      "3dmodelobject": "3dmodelobject",
    };

    const showForKey = typeMapping[elementType] || "other";

    // If showFor is explicitly false for this type, return null (show icon instead)
    if (showForSettings[showForKey] === false) {
      Logger.debug(
        `[THUMBNAIL] Thumbnails disabled for type: ${elementType} (showFor.${showForKey}=false)`
      );
      return null;
    }

    // If showFor is not explicitly set or is true, proceed with thumbnail logic
    Logger.debug(
      `[THUMBNAIL] Thumbnails enabled for type: ${elementType} (showFor.${showForKey}=${showForSettings[showForKey]})`
    );

    // Business/Sheets data takes priority
    if (resultItem.businessData?.imageUrl) {
      return _resolveAssetUrl(resultItem.businessData.imageUrl);
    }

    if (resultItem.imageUrl) {
      return _resolveAssetUrl(resultItem.imageUrl);
    }

    // For Panoramas, directly use the tour media object's methods
    if (resultItem.type === "Panorama" && resultItem.item) {
      try {
        // This follows the native 3DVista pattern
        const media = resultItem.item.get("media");
        if (media) {
          // Try the tour engine's standard thumbnail properties
          let thumb = media.get("thumbnail") || media.get("firstFrame") || media.get("preview");

          if (thumb) {
            Logger.debug(`[THUMBNAIL] Found for ${resultItem.label}: ${thumb}`);
            return _resolveAssetUrl(thumb);
          }
        }
      } catch (e) {
        Logger.debug(`[THUMBNAIL] Error extracting from tour: ${e.message}`);
      }
    }

    // Fallback to type-specific default
    const defaultImages = config.thumbnailSettings?.defaultImages || {};
    console.log(`🔍 THUMBNAIL DEBUG: Looking for default image for type "${resultItem.type}"`);
    console.log(`🔍 THUMBNAIL DEBUG: Available defaultImages:`, Object.keys(defaultImages));

    if (defaultImages[resultItem.type]) {
      const imagePath = _resolveAssetUrl(defaultImages[resultItem.type]);
      Logger.debug(
        `🔍 THUMBNAIL DEBUG: Found type-specific image: ${defaultImages[resultItem.type]} -> ${imagePath}`
      );
      return imagePath;
    }

    const fallbackPath = _resolveAssetUrl(
      defaultImages.default || config.thumbnailSettings?.defaultImagePath
    );
    console.log(`🔍 THUMBNAIL DEBUG: Using fallback image: ${fallbackPath}`);
    return fallbackPath;
  }

  // [4.15] Method: _preprocessSearchTerm()
  function _preprocessSearchTerm(term) {
    if (!term) return "";

    // Handle special character search
    if (/[0-9\-_]/.test(term)) {
      return `'${term}`;
    }

    return term;
  }

  // [4.16] Submodule: ARIA and Accessibility Helpers
  const _aria = {
    /**
     * [4.10.1] Method: setAutoComplete() - Sets the aria-autocomplete attribute on an element
     * @param {HTMLElement} element - The target element
     * @param {string} value - The value to set (e.g., 'list', 'inline', 'both')
     * @returns {HTMLElement} The element for chaining
     */
    setAutoComplete: function (element, value) {
      if (element && element.setAttribute) {
        element.setAttribute("aria-autocomplete", value);
      }
      return element;
    },
    /**
     * [4.10.2] Method: setRole() - Sets the ARIA role attribute on an element
     * @param {HTMLElement} element - The target element
     * @param {string} role - The ARIA role to set
     * @returns {HTMLElement} The element for chaining
     */
    setRole: (element, role) => {
      if (element && role) {
        element.setAttribute("role", role);
      }
      return element;
    },

    /**
     * [4.10.3] Method: setLabel() - Sets the ARIA label on an element
     * @param {HTMLElement} element - The target element
     * @param {string} label - The label text to set
     * @returns {HTMLElement} The element for chaining
     */
    setLabel: (element, label) => {
      if (element && label) {
        element.setAttribute("aria-label", label);
      }
      return element;
    },

    /**
     * [4.10.4] Method: setExpanded() - Sets the expanded state of an element
     * @param {HTMLElement} element - The target element
     * @param {boolean} isExpanded - Whether the element is expanded
     * @returns {HTMLElement} The element for chaining
     */
    setExpanded: (element, isExpanded) => {
      if (element) {
        element.setAttribute("aria-expanded", String(!!isExpanded));
      }
      return element;
    },

    /**
     * [4.10.5] Method: setSelected() - Sets the selected state of an element
     * @param {HTMLElement} element - The target element
     * @param {boolean} isSelected - Whether the element is selected
     * @returns {HTMLElement} The element for chaining
     */
    setSelected: (element, isSelected) => {
      if (element) {
        element.setAttribute("aria-selected", String(!!isSelected));
      }
      return element;
    },

    /**
     * [4.10.6] Method: setHidden() - Sets the hidden state of an element
     * @param {HTMLElement} element - The target element
     * @param {boolean} isHidden - Whether the element is hidden
     * @returns {HTMLElement} The element for chaining
     */
    setHidden: (element, isHidden) => {
      if (element) {
        element.setAttribute("aria-hidden", String(!!isHidden));
      }
      return element;
    },

    /**
     * [4.10.7] Method: setCurrent() - Sets the current state of an element (e.g., 'page' for pagination)
     * @param {HTMLElement} element - The target element
     * @param {string} current - The current state value
     * @returns {HTMLElement} The element for chaining
     */
    setCurrent: (element, current) => {
      if (element && current) {
        element.setAttribute("aria-current", current);
      }
      return element;
    },
  };

  // [4.17] Method: _convertHexToRGBA()
  function _convertHexToRGBA(hex, opacity) {
    if (!hex || typeof hex !== "string") return `rgba(255, 255, 0, ${opacity})`; // Default yellow

    // Remove # if present
    hex = hex.replace("#", "");

    // Handle shorthand hex (#RGB)
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    // Make sure we have a valid hex color
    if (hex.length !== 6) return `rgba(255, 255, 0, ${opacity})`;

    // Convert hex to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Return rgba format
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  // [4.18] Helper: _normalizeForFilter() - Normalize strings for consistent filtering
  function _normalizeForFilter(s) {
    return (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/["""']/g, "") // strip quotes
      .replace(/[‐-–—−]/g, "-") // normalize dashes
      .replace(/[\[\](){}]/g, "") // strip brackets
      .replace(/\s+/g, " ")
      .trim();
  }

  // [4.19] Method: _getOverlayCamera() - Extract camera angles from overlay
  function _getOverlayCamera(overlay) {
    if (!overlay) return null;

    let yaw = null;
    let pitch = null;
    let fov = null;

    try {
      // Method 1: Read yaw/pitch/hfov from overlay.items[0] for any overlay class
      if (overlay.items && overlay.items.length > 0) {
        const item = overlay.items[0];
        if (item.yaw !== undefined) yaw = item.yaw;
        if (item.pitch !== undefined) pitch = item.pitch;
        if (item.hfov !== undefined) fov = item.hfov;
        else if (item.fov !== undefined) fov = item.fov;
      }

      // Method 2: Fallback to direct overlay.yaw/pitch/(hfov|fov)
      if (yaw === null && overlay.yaw !== undefined) yaw = overlay.yaw;
      if (pitch === null && overlay.pitch !== undefined) pitch = overlay.pitch;
      if (fov === null) {
        if (overlay.hfov !== undefined) fov = overlay.hfov;
        else if (overlay.fov !== undefined) fov = overlay.fov;
      }

      // Method 3: Optionally average overlay.vertices[] if objects have yaw/pitch
      if ((yaw === null || pitch === null) && overlay.vertices && Array.isArray(overlay.vertices)) {
        let sumYaw = 0,
          sumPitch = 0,
          count = 0;
        overlay.vertices.forEach((vertex) => {
          if (vertex && typeof vertex.yaw === "number" && typeof vertex.pitch === "number") {
            sumYaw += vertex.yaw;
            sumPitch += vertex.pitch;
            count++;
          }
        });
        if (count > 0) {
          if (yaw === null) yaw = sumYaw / count;
          if (pitch === null) pitch = sumPitch / count;
        }
      }

      // Set default FOV if still null
      if (fov === null) fov = 70;

      // Only return if we have both yaw and pitch
      if (yaw !== null && yaw !== undefined && pitch !== null && pitch !== undefined) {
        // Normalize yaw to [-180, 180]
        while (yaw > 180) yaw -= 360;
        while (yaw < -180) yaw += 360;

        return {
          yaw: yaw,
          pitch: pitch,
          fov: fov,
        };
      }
    } catch (error) {
      Logger.warn(`[CAMERA DEBUG] Error extracting camera from overlay:`, error);
    }

    return null;
  }

  // [4.20] Submodule: Element Detection and Filtering
  // [4.21] Method: _getElementType()
  function _getElementType(overlay, label) {
    if (!overlay) return "Element";
    try {
      // **ADD THIS DEBUG CODE AT THE VERY BEGINNING**
      Logger.debug(`[ELEMENT TYPE DEBUG] Called with:`, {
        overlayId: overlay.id,
        overlayClass: overlay.class,
        label: label,
        hasVertices: overlay.vertices ? overlay.vertices.length : "none",
      });

      // **PRIORITY 1: Enhanced Projected image detection (HIGHEST PRIORITY)**
      if (overlay.projected === true || overlay.projected === "true") {
        console.log(`[ELEMENT TYPE DEBUG] Returning ProjectedImage for: ${overlay.id}`);
        return "ProjectedImage";
      }

      // **PRIORITY 1.5: Check for projected image by name/ID (catch misclassified projected images)**
      if (overlay.id || label) {
        const overlayId = (overlay.id || "").toString().toLowerCase();
        const labelStr = (label || "").toLowerCase();

        // Check if ID or label contains projected image keywords
        const projectedImageKeywords = [
          "projected-image",
          "projectedimage",
          "text-projected-image",
          "textprojectedimage",
        ];

        const isProjectedImageElement = projectedImageKeywords.some(
          (keyword) => overlayId.includes(keyword) || labelStr.includes(keyword)
        );

        if (isProjectedImageElement) {
          console.log(`[ELEMENT TYPE DEBUG] Returning ProjectedImage based on name: ${overlayId}`);
          return "ProjectedImage";
        }
      }

      // **PRIORITY 2: Enhanced polygon detection BEFORE class mapping**
      if (overlay.vertices && Array.isArray(overlay.vertices) && overlay.vertices.length > 2) {
        // Check for video polygon - return Video type, not VideoPolygon
        if (overlay.video || overlay.videoResource || (overlay.data && overlay.data.video)) {
          console.log(`[ELEMENT TYPE DEBUG] Returning Video polygon for: ${overlay.id}`);
          return "Video";
        }
        // Check for image polygon - return Image type, not ImagePolygon
        if (overlay.image || overlay.imageResource || (overlay.data && overlay.data.image)) {
          console.log(`[ELEMENT TYPE DEBUG] Returning Image polygon for: ${overlay.id}`);
          return "Image";
        }
        console.log(`[ELEMENT TYPE DEBUG] Returning Polygon for: ${overlay.id}`);
        return "Polygon";
      }

      // **NEW: Enhanced image detection BEFORE class mapping (but AFTER projected image check)**
      if (overlay.id) {
        const overlayId = overlay.id.toString().toLowerCase();
        const labelStr = (label || "").toLowerCase();

        console.log(
          `[ELEMENT TYPE DEBUG] Checking image keywords for: ${overlayId}, label: ${labelStr}`
        );

        // First, exclude projected images to prevent misclassification
        const projectedImageKeywords = [
          "projected-image",
          "projectedimage",
          "text-projected-image",
          "textprojectedimage",
        ];

        const isProjectedImageElement = projectedImageKeywords.some(
          (keyword) => overlayId.includes(keyword) || labelStr.includes(keyword)
        );

        if (isProjectedImageElement) {
          console.log(
            `[ELEMENT TYPE DEBUG] Skipping image classification - this is a projected image: ${overlayId}`
          );
          // Continue to other checks - don't return "Image" for projected images
        } else {
          // Check if ID or label contains regular image-related keywords
          const imageKeywords = ["image", "placeholder", "photo", "picture", "img"];
          const isImageElement = imageKeywords.some(
            (keyword) => overlayId.includes(keyword) || labelStr.includes(keyword)
          );

          console.log(
            `[ELEMENT TYPE DEBUG] Image keywords check result: ${isImageElement} for ${overlayId}`
          );

          if (isImageElement) {
            console.log(`[DEBUG] Reclassifying as Image based on ID/label: ${overlayId}`);
            return "Image";
          }
        }
      }
      // **PRIORITY 2.5: Sprite detection by ID (catch sprites that might be misclassified)**
      if (overlay.id) {
        const idStr = overlay.id.toString().toLowerCase();
        Logger.debug(`[DEBUG] Checking ID: ${idStr}`);

        if (idStr.includes("sprite")) {
          Logger.debug(`[DEBUG] ID contains 'sprite', returning 3DHotspot`);
          return "3DHotspot";
        }
      }
      // **PRIORITY 3: Check for 3D Model Objects first (before general class mapping)**
      if (
        overlay.class &&
        (overlay.class.includes("SpriteModel3DObject") ||
          overlay.class.includes("InnerModel3DObject"))
      ) {
        Logger.debug(`[ELEMENT TYPE DEBUG] Detected 3DModelObject: ${overlay.class}`);
        return "3DModelObject";
      }

      const classNameMap = {
        FramePanoramaOverlay: "Webframe",
        QuadVideoPanoramaOverlay: "Video",
        ImagePanoramaOverlay: "Image",
        TextPanoramaOverlay: "Text",
        HotspotPanoramaOverlay: "Hotspot",
        Model3DObject: "3DModelObject", // Static 3D objects
        SpriteModel3DObject: "3DModelObject", // Interactive 3D sprites - Updated to return 3DModelObject
        InnerModel3DObject: "3DModelObject", // Inner 3D model objects
        SpriteHotspotObject: "3DHotspot",
        Sprite3DObject: "3DHotspot",
        Model3D: "3DModel", // 3D model containers
        Model3DPlayListItem: "3DModel",
        ProjectedImagePanoramaOverlay: "ProjectedImage",
        PolygonPanoramaOverlay: "Polygon",
        VideoPolygonPanoramaOverlay: "Video",
        ImagePolygonPanoramaOverlay: "Image",
        Container: "Container", // Container elements
      };

      // **DIRECT CLASS MAPPING - This handles most cases including sprites**
      if (overlay.class && classNameMap[overlay.class]) {
        return classNameMap[overlay.class];
      }

      // **Try overlay.get('class') if available**
      if (typeof overlay.get === "function") {
        try {
          const className = overlay.get("class");
          if (classNameMap[className]) {
            return classNameMap[className];
          }
        } catch (e) {
          Logger.debug("Error getting class via get method:", e);
        }
      }

      // **SPECIAL CASE: HotspotPanoramaOverlay with polygon in label should be classified as Polygon**
      if (
        (overlay.class === "HotspotPanoramaOverlay" ||
          (typeof overlay.get === "function" &&
            overlay.get("class") === "HotspotPanoramaOverlay")) &&
        label &&
        label.toLowerCase().includes("polygon")
      ) {
        Logger.debug(`[DEBUG] HotspotPanoramaOverlay with polygon label detected: ${label}`);
        return "Polygon";
      }

      // **Enhanced property-based detection**
      const propertyChecks = [
        { props: ["url", "data.url"], type: "Webframe" },
        { props: ["video", "data.video"], type: "Video" },
        {
          props: ["vertices", "polygon", "data.vertices", "data.polygon"],
          type: "Polygon",
        },
        { props: ["model3d", "data.model3d"], type: "3DModel" },
        { props: ["sprite3d", "data.sprite3d"], type: "3DHotspot" },
        { props: ["projected", "data.projected"], type: "ProjectedImage" },
      ];

      for (const check of propertyChecks) {
        for (const prop of check.props) {
          if (prop.includes(".")) {
            const [parent, child] = prop.split(".");
            if (overlay[parent] && overlay[parent][child]) {
              return check.type;
            }
          } else if (overlay[prop]) {
            return check.type;
          }
        }
      }

      // **Enhanced label pattern mapping**
      const labelPatternMap = [
        { pattern: "web", type: "Webframe" },
        { pattern: "video", type: "Video" },
        { pattern: "image", type: "Image" },
        { pattern: "text", type: "Text" },
        { pattern: "polygon", type: "Polygon" },
        { pattern: "goto", type: "Hotspot" },
        { pattern: "info", type: "Hotspot" },
        { pattern: "3d-model", type: "3DModel" },
        { pattern: "model3d", type: "3DModel" },
        { pattern: "3d-hotspot", type: "3DHotspot" },
        { pattern: "sprite", type: "3DHotspot" },
        { pattern: "projected", type: "ProjectedImage" },
        { pattern: "projectedimage", type: "ProjectedImage" },
      ];

      const overlayLabel = (overlay.label || label || "").toLowerCase();
      if (overlayLabel) {
        for (const { pattern, type } of labelPatternMap) {
          if (overlayLabel === pattern || overlayLabel.includes(pattern)) {
            return type;
          }
        }
      }

      // **Default**
      return "Element";
    } catch (error) {
      Logger.warn("Error in element type detection:", error);
      return "Element";
    }
  }

  // [4.22] Method: _validateElementType() - Validate and Normalize Element Types
  function _validateElementType(elementType) {
    try {
      // List of all supported element types
      const supportedTypes = [
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
        "3DModel",
        "3DModelObject",
        "Container",
      ];

      if (!elementType || typeof elementType !== "string") {
        return {
          isValid: false,
          normalized: "",
          reason: "Invalid or missing element type",
        };
      }

      const normalized = elementType.trim();

      // Check if it's a known supported type
      if (supportedTypes.includes(normalized)) {
        return {
          isValid: true,
          normalized: normalized,
          reason: "Known element type",
        };
      }

      // Check for case-insensitive matches
      const caseInsensitiveMatch = supportedTypes.find(
        (type) => type.toLowerCase() === normalized.toLowerCase()
      );

      if (caseInsensitiveMatch) {
        return {
          isValid: true,
          normalized: caseInsensitiveMatch,
          reason: "Case-corrected match",
        };
      }

      // Allow unknown types but log them
      Logger.info(`Unknown element type encountered: ${normalized}`);
      return {
        isValid: true,
        normalized: normalized,
        reason: "Unknown but allowed",
      };
    } catch (error) {
      Logger.warn("Error validating element type:", error);
      return { isValid: false, normalized: "", reason: "Validation error" };
    }
  }

  // [CFG.FILTER] _shouldIncludeElement() - Element Filtering Based on Type and Properties
  function _shouldIncludeElement(elementType, displayLabel, tags, subtitle) {
    const safeLabel = (displayLabel ?? "").toString();

    try {
      // [4.22.0.1] Validate and normalize element type first
      const typeValidation = _validateElementType(elementType);
      if (!typeValidation.isValid) {
        Logger.warn(`Invalid element type rejected: ${elementType} - ${typeValidation.reason}`);
        return false;
      }
      // Use normalized element type for all subsequent checks
      const normalizedElementType = typeValidation.normalized;
      // [4.22.0.2] Skip empty labels if configured
      if (!displayLabel && _config.includeContent.elements.skipEmptyLabels) {
        return false;
      }

      // [4.22.0.3] Check minimum label length
      if (
        displayLabel &&
        _config.includeContent.elements.minLabelLength > 0 &&
        displayLabel.length < _config.includeContent.elements.minLabelLength
      ) {
        return false;
      }

      // [4.22.0.4] Apply top-level values filtering (whitelist/blacklist) to all element types
      const topLevelFilterMode = _config.filter?.mode;

      if (topLevelFilterMode && topLevelFilterMode !== "none") {
        Logger.debug("[TOP-LEVEL FILTER] Evaluating", {
          type: normalizedElementType,
          label: safeLabel,
          mode: topLevelFilterMode,
        });

        if (topLevelFilterMode === "whitelist") {
          const allowedValues = _config.filter?.allowedValues;
          if (Array.isArray(allowedValues) && allowedValues.length > 0) {
            // Remove empty strings from allowedValues and normalize using new helper
            const normalizedAllowed = allowedValues
              .map((v) => _normalizeForFilter(v))
              .filter((v) => v.length > 0);

            if (normalizedAllowed.length > 0) {
              const labelNorm = _normalizeForFilter(safeLabel);

              // Match mode: default 'exact' for whitelist (more precise), 'contains' optional
              const mode = _config.filter?.valueMatchMode?.whitelist || "exact";
              let hasMatch = false;

              if (mode === "exact") {
                hasMatch = normalizedAllowed.includes(labelNorm);
              } else if (mode === "startsWith") {
                hasMatch = normalizedAllowed.some((v) => labelNorm.startsWith(v));
              } else if (mode === "regex") {
                hasMatch = normalizedAllowed.some((v) => {
                  try {
                    return new RegExp(v, "i").test(safeLabel);
                  } catch {
                    return false;
                  }
                });
              } else {
                // "contains"
                hasMatch = normalizedAllowed.some((v) => labelNorm.includes(v));
              }

              // COMPREHENSIVE DEBUG LOGGING
              Logger.debug(`[TOP-LEVEL FILTER DEBUG] Normalized check:`, {
                displayLabel: safeLabel,
                labelNorm,
                normalizedAllowed,
                mode,
                hasMatch,
                elementType,
                subtitle: subtitle || "[none]",
              });

              if (!hasMatch) {
                if (_config.debugMode) {
                  Logger.debug(
                    `Top-level whitelist rejected: "${safeLabel}" did not match whitelist (${mode})`
                  );
                }
                Logger.debug(`[TOP-LEVEL FILTER REJECT] "${safeLabel}" not in whitelist (${mode})`);
                return false;
              } else {
                if (_config.debugMode) {
                  Logger.debug(
                    `Top-level whitelist passed: "${safeLabel}" matched whitelist (${mode})`
                  );
                }
                Logger.debug(`[TOP-LEVEL FILTER PASS] "${safeLabel}" found in whitelist (${mode})`);
              }
            }
          }
        } else if (topLevelFilterMode === "blacklist") {
          const blacklistedValues = _config.filter?.blacklistedValues;
          if (Array.isArray(blacklistedValues) && blacklistedValues.length > 0) {
            // Remove empty strings from blacklistedValues and normalize using new helper
            const normalizedBlacklisted = blacklistedValues
              .map((v) => _normalizeForFilter(v))
              .filter((v) => v.length > 0);

            if (normalizedBlacklisted.length > 0) {
              const labelNorm = _normalizeForFilter(safeLabel);

              // Match mode: default 'contains' for blacklist (safer), 'exact' optional
              const mode = _config.filter?.valueMatchMode?.blacklist || "contains";
              let hasMatch = false;

              if (mode === "exact") {
                hasMatch = normalizedBlacklisted.includes(labelNorm);
              } else if (mode === "startsWith") {
                hasMatch = normalizedBlacklisted.some((v) => labelNorm.startsWith(v));
              } else if (mode === "regex") {
                hasMatch = normalizedBlacklisted.some((v) => {
                  try {
                    return new RegExp(v, "i").test(safeLabel);
                  } catch {
                    return false;
                  }
                });
              } else {
                // "contains" (default)
                hasMatch = normalizedBlacklisted.some((v) => labelNorm.includes(v));
              }

              // COMPREHENSIVE BLACKLIST DEBUG LOGGING
              Logger.debug(`[TOP-LEVEL BLACKLIST DEBUG] Normalized check:`, {
                displayLabel: safeLabel,
                labelNorm,
                normalizedBlacklisted,
                mode,
                hasMatch,
                elementType,
                subtitle: subtitle || "[none]",
              });

              if (hasMatch) {
                if (_config.debugMode) {
                  Logger.debug(
                    `Top-level blacklist rejected: "${safeLabel}" matched blacklist (${mode})`
                  );
                }
                Logger.debug(
                  `[TOP-LEVEL BLACKLIST REJECT] "${safeLabel}" matched blacklist (${mode})`
                );
                return false;
              } else {
                if (_config.debugMode) {
                  Logger.debug(
                    `Top-level blacklist passed: "${safeLabel}" did not match blacklist (${mode})`
                  );
                }
                Logger.debug(
                  `[TOP-LEVEL BLACKLIST PASS] "${safeLabel}" did not match blacklist (${mode})`
                );
              }
            }
          }
        }
      }

      // [4.22.0.5] Apply element type filtering with enhanced type validation
      const typeFilterMode = _config.filter.elementTypes?.mode;
      if (typeFilterMode && typeFilterMode !== "none") {
        // Use normalizedElementType here!
        if (typeFilterMode === "whitelist") {
          const allowedTypes = _config.filter.elementTypes?.allowedTypes;
          if (Array.isArray(allowedTypes) && allowedTypes.length > 0) {
            const normalizedAllowedTypes = allowedTypes
              .map((type) => (type ? String(type).trim().toLowerCase() : ""))
              .filter((type) => type.length > 0);

            const normalizedElementTypeLower = normalizedElementType.toLowerCase();
            const hasMatch = normalizedAllowedTypes.includes(normalizedElementTypeLower);

            // COMPREHENSIVE ELEMENT TYPE WHITELIST DEBUG LOGGING
            Logger.debug(`[ELEMENT-TYPE WHITELIST DEBUG] Checking "${normalizedElementType}":`, {
              elementType: normalizedElementType,
              normalizedElementTypeLower,
              normalizedAllowedTypes,
              hasMatch,
              displayLabel: safeLabel,
            });

            if (normalizedAllowedTypes.length > 0 && !hasMatch) {
              if (_config.debugMode) {
                Logger.debug(
                  `Element type whitelist rejected: "${normalizedElementType}", allowed: ${JSON.stringify(normalizedAllowedTypes)}`
                );
              }
              Logger.debug(
                `[ELEMENT-TYPE WHITELIST REJECT] "${normalizedElementType}" not in allowed types`
              );
              return false;
            } else if (hasMatch) {
              Logger.debug(
                `[ELEMENT-TYPE WHITELIST PASS] "${normalizedElementType}" found in allowed types`
              );
            }
          }
        } else if (typeFilterMode === "blacklist") {
          const blacklistedTypes = _config.filter.elementTypes?.blacklistedTypes;
          if (Array.isArray(blacklistedTypes) && blacklistedTypes.length > 0) {
            const normalizedBlacklistedTypes = blacklistedTypes
              .map((type) => (type ? String(type).trim().toLowerCase() : ""))
              .filter((type) => type.length > 0);

            const normalizedElementTypeLower = normalizedElementType.toLowerCase();
            const hasMatch = normalizedBlacklistedTypes.includes(normalizedElementTypeLower);

            // COMPREHENSIVE ELEMENT TYPE BLACKLIST DEBUG LOGGING
            Logger.debug(`[ELEMENT-TYPE BLACKLIST DEBUG] Checking "${normalizedElementType}":`, {
              elementType: normalizedElementType,
              normalizedElementTypeLower,
              normalizedBlacklistedTypes,
              hasMatch,
              displayLabel: safeLabel,
            });

            if (normalizedBlacklistedTypes.length > 0 && hasMatch) {
              if (_config.debugMode) {
                Logger.debug(
                  `Element type blacklist rejected: "${normalizedElementType}", blacklisted: ${JSON.stringify(normalizedBlacklistedTypes)}`
                );
              }
              Logger.debug(
                `[ELEMENT-TYPE BLACKLIST REJECT] "${normalizedElementType}" found in blacklisted types`
              );
              return false;
            } else if (!hasMatch) {
              Logger.debug(
                `[ELEMENT-TYPE BLACKLIST PASS] "${normalizedElementType}" not in blacklisted types`
              );
            }
          }
        }
      }

      // [4.22.0.6] Apply label filtering (now uses normalized lowercase comparisons)
      const labelFilterMode = _config.filter.elementLabels?.mode;

      Logger.debug(
        `[ELEMENT-LABELS] Checking element "${displayLabel}" (mode: ${labelFilterMode || "none"})`
      );

      if (
        displayLabel &&
        labelFilterMode === "whitelist" &&
        Array.isArray(_config.filter.elementLabels?.allowedValues) &&
        _config.filter.elementLabels.allowedValues.length > 0
      ) {
        const labelLower = displayLabel.toLowerCase();
        const normalizedAllowed = _config.filter.elementLabels.allowedValues
          .map((v) =>
            typeof v === "string" ? v.trim().toLowerCase() : String(v).trim().toLowerCase()
          )
          .filter((v) => v.length > 0);

        Logger.debug(
          `[ELEMENT-LABELS WHITELIST] Checking "${labelLower}" against allowed values:`,
          normalizedAllowed
        );

        if (normalizedAllowed.length > 0) {
          const matchingValues = normalizedAllowed.filter((value) => labelLower.includes(value));
          const hasMatch = matchingValues.length > 0;

          Logger.debug(`[ELEMENT-LABELS WHITELIST] Partial text matches found:`, matchingValues);

          if (!hasMatch) {
            if (_config.debugMode) {
              Logger.debug(
                `Element label whitelist rejected: "${displayLabel}", allowed: ${JSON.stringify(normalizedAllowed)}`
              );
            }
            Logger.debug(
              `[ELEMENT-LABELS WHITELIST REJECT] No partial matches found for "${displayLabel}"`
            );
            return false;
          } else {
            Logger.debug(`[ELEMENT-LABELS WHITELIST PASS] Partial matches found:`, matchingValues);
          }
        }
      } else if (
        displayLabel &&
        labelFilterMode === "blacklist" &&
        Array.isArray(_config.filter.elementLabels?.blacklistedValues) &&
        _config.filter.elementLabels.blacklistedValues.length > 0
      ) {
        const labelLower = displayLabel.toLowerCase();
        const normalizedBlacklisted = _config.filter.elementLabels.blacklistedValues
          .map((v) =>
            typeof v === "string" ? v.trim().toLowerCase() : String(v).trim().toLowerCase()
          )
          .filter((v) => v.length > 0);

        Logger.debug(
          `[ELEMENT-LABELS BLACKLIST] Checking "${labelLower}" against blacklisted values:`,
          normalizedBlacklisted
        );

        if (normalizedBlacklisted.length > 0) {
          const matchingValues = normalizedBlacklisted.filter((value) =>
            labelLower.includes(value)
          );
          const hasMatch = matchingValues.length > 0;

          Logger.debug(`[ELEMENT-LABELS BLACKLIST] Partial text matches found:`, matchingValues);

          if (hasMatch) {
            if (_config.debugMode) {
              Logger.debug(
                `Element label blacklist rejected: "${displayLabel}", blacklisted: ${JSON.stringify(normalizedBlacklisted)}`
              );
            }
            Logger.debug(
              `[ELEMENT-LABELS BLACKLIST REJECT] Partial matches found:`,
              matchingValues
            );
            return false;
          } else {
            Logger.debug(`[ELEMENT-LABELS BLACKLIST PASS] No partial matches found`);
          }
        }
      } else if (labelFilterMode) {
        Logger.debug(`[ELEMENT-LABELS] No filtering applied (empty config or no displayLabel)`);
      }

      // [4.22.0.7] Apply tag filtering (now uses normalized lowercase comparisons)
      const tagFilterMode = _config.filter.tagFiltering?.mode;

      Logger.debug(
        `[TAG-FILTERING] Checking element with tags ${JSON.stringify(tags || [])} (mode: ${tagFilterMode || "none"})`
      );

      if (Array.isArray(tags) && tags.length > 0) {
        const tagsLower = tags.map((tag) => (tag || "").toString().toLowerCase());

        Logger.debug(`[TAG-FILTERING] Normalized element tags:`, tagsLower);

        if (
          tagFilterMode === "whitelist" &&
          Array.isArray(_config.filter.tagFiltering?.allowedTags) &&
          _config.filter.tagFiltering.allowedTags.length > 0
        ) {
          const normalizedAllowedTags = _config.filter.tagFiltering.allowedTags
            .map((t) =>
              typeof t === "string" ? t.trim().toLowerCase() : String(t).trim().toLowerCase()
            )
            .filter((t) => t.length > 0);

          Logger.debug(
            `[TAG-FILTERING WHITELIST] Checking against allowed tags:`,
            normalizedAllowedTags
          );

          if (normalizedAllowedTags.length > 0) {
            const matchingTags = tagsLower.filter((tag) => normalizedAllowedTags.includes(tag));
            const hasMatch = matchingTags.length > 0;

            Logger.debug(`[TAG-FILTERING WHITELIST] Matching tags found:`, matchingTags);

            if (!hasMatch) {
              if (_config.debugMode) {
                Logger.debug(
                  `Tag whitelist rejected: tags="${JSON.stringify(tags)}", allowed: ${JSON.stringify(normalizedAllowedTags)}`
                );
              }
              Logger.debug(`[TAG-FILTERING WHITELIST REJECT] No matching tags found`);
              return false;
            } else {
              Logger.debug(`[TAG-FILTERING WHITELIST PASS] Matching tags:`, matchingTags);
            }
          }
        } else if (
          tagFilterMode === "blacklist" &&
          Array.isArray(_config.filter.tagFiltering?.blacklistedTags) &&
          _config.filter.tagFiltering.blacklistedTags.length > 0
        ) {
          const normalizedBlacklistedTags = _config.filter.tagFiltering.blacklistedTags
            .map((t) =>
              typeof t === "string" ? t.trim().toLowerCase() : String(t).trim().toLowerCase()
            )
            .filter((t) => t.length > 0);

          Logger.debug(
            `[TAG-FILTERING BLACKLIST] Checking against blacklisted tags:`,
            normalizedBlacklistedTags
          );

          if (normalizedBlacklistedTags.length > 0) {
            const matchingTags = tagsLower.filter((tag) => normalizedBlacklistedTags.includes(tag));
            const hasMatch = matchingTags.length > 0;

            Logger.debug(
              `[TAG-FILTERING BLACKLIST] Matching blacklisted tags found:`,
              matchingTags
            );

            if (hasMatch) {
              if (_config.debugMode) {
                Logger.debug(
                  `Tag blacklist rejected: tags="${JSON.stringify(tags)}", blacklisted: ${JSON.stringify(normalizedBlacklistedTags)}`
                );
              }
              Logger.debug(
                `[TAG-FILTERING BLACKLIST REJECT] Blacklisted tags found:`,
                matchingTags
              );
              return false;
            } else {
              Logger.debug(`[TAG-FILTERING BLACKLIST PASS] No blacklisted tags found`);
            }
          }
        }
      } else if (
        tagFilterMode === "whitelist" &&
        Array.isArray(_config.filter.tagFiltering?.allowedTags) &&
        _config.filter.tagFiltering.allowedTags.length > 0
      ) {
        const normalizedAllowedTags = _config.filter.tagFiltering.allowedTags
          .map((t) =>
            typeof t === "string" ? t.trim().toLowerCase() : String(t).trim().toLowerCase()
          )
          .filter((t) => t.length > 0);

        Logger.debug(
          `[TAG-FILTERING WHITELIST] Element has no tags, required tags:`,
          normalizedAllowedTags
        );

        if (normalizedAllowedTags.length > 0) {
          if (_config.debugMode) {
            Logger.debug(
              `Tag whitelist rejected: no tags present, required tags: ${JSON.stringify(normalizedAllowedTags)}`
            );
          }
          Logger.debug(
            `[TAG-FILTERING WHITELIST REJECT] Element has no tags but tags are required`
          );
          return false;
        }
      } else if (tagFilterMode) {
        Logger.debug(`[TAG-FILTERING] No filtering applied (no tags present or empty config)`);
      }

      // [4.22.0.8] Enhanced element type checking against configuration
      const elementTypeMap = {
        Panorama: "includePanoramas",
        Hotspot: "includeHotspots",
        Polygon: "includePolygons",
        Video: "includeVideos",
        Webframe: "includeWebframes",
        Image: "includeImages",
        Text: "includeText",
        ProjectedImage: "includeProjectedImages",
        Element: "includeElements",
        "3DHotspot": "include3DHotspots",
        "3DModel": "include3DModels",
        "3DModelObject": "include3DModelObjects",
        Business: "includeBusiness",
        Container: "includeContainers",
      };

      // Use normalizedElementType for configKey lookup!
      const configKey = elementTypeMap[normalizedElementType];
      if (configKey) {
        if (_config.includeContent?.elements?.[configKey] === false) {
          return false;
        }
      } else {
        // For unknown element types, try pluralized version
        const pluralizedKey = `include${normalizedElementType}s`;
        if (_config.includeContent?.elements?.[pluralizedKey] === false) {
          return false;
        }
        if (_config.includeContent?.elements?.includeUnknownTypes === false) {
          Logger.warn(`Unknown element type encountered: ${normalizedElementType}`);
          return false;
        }
      }

      // If we reach here, the element type is allowed by includeContent settings
      // Now ensure it also passes any additional filtering rules that may have been applied above

      if (_config.debugMode) {
        Logger.debug(
          `Element passed all filters: type="${normalizedElementType}", label="${label || "[empty]"}", subtitle="${subtitle || "[none]"}", tags="${JSON.stringify(tags || [])}"`
        );
      }

      return true;
    } catch (error) {
      Logger.warn("Error in element filtering:", error);
      return false;
    }
  }

  // [4.23] Submodule: Element Interaction
  // [4.24] Method: _triggerElement()
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
                Logger.info(`Element triggered successfully using ${method.name}`);
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
            `Element trigger attempt ${retryCount} failed, retrying in ${backoffTime}ms...`
          );
          setTimeout(attemptTrigger, backoffTime);
        } else {
          Logger.warn(`Failed to trigger element ${elementId} after ${config.maxRetries} attempts`);
          if (callback) callback(false);
        }
      } catch (error) {
        Logger.warn(`Error in triggerElement: ${error.message}`);
        if (callback) callback(false);
      }
    };

    // [4.24.1] Helper to find element by ID using multiple methods
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
  /**
   * Enhanced element trigger function that can handle standalone Google Sheets entries
   * @param {Object} searchResult - The search result item that was clicked
   */

  // [4.25] Method: _triggerStandaloneElement() - Enhanced Element Trigger Function
  function _triggerStandaloneElement(searchResult, tour) {
    // [4.25.1] If it's a regular tour item, use the standard trigger
    if (searchResult.item) {
      if (typeof searchResult.item.trigger === "function") {
        searchResult.item.trigger("click");
        return true;
      } else {
        _triggerElement(tour, searchResult.id);
        return true;
      }
    }

    // [4.25.2] For standalone Google Sheets entries, try to find a matching tour element
    if (searchResult.sheetsData) {
      const entryId = searchResult.id || searchResult.sheetsData.id;
      const entryTag = searchResult.sheetsData.tag;
      const entryName = searchResult.sheetsData.name;

      Logger.info(
        `Looking for matching tour element for standalone entry: ${entryName || entryId || entryTag}`
      );

      // Try to find matching tour element by ID, tag or other relationships
      let foundElement = false;

      // [4.25.2.1] Method 1: Try to find by ID
      if (entryId) {
        try {
          const element = tour.player.getById(entryId);
          if (element) {
            Logger.info(`Found element by ID: ${entryId}`);
            _triggerElement(tour, entryId);
            return true;
          }
        } catch (e) {
          Logger.debug(`No element found with ID: ${entryId}`);
        }
      }

      // [4.25.2.2] Method 2: Try to find by tag matching - this is critical for Google Sheets integration
      if (entryTag) {
        try {
          // First check if tag exists as an ID (common for hotspots)
          const tagElement = tour.player.getById(entryTag);
          if (tagElement) {
            Logger.info(`Found element by tag as ID: ${entryTag}`);
            _triggerElement(tour, entryTag);
            return true;
          }

          // Then look through all items
          const allItems = tour.mainPlayList.get("items");
          if (allItems && allItems.length) {
            for (let i = 0; i < allItems.length; i++) {
              const item = allItems[i];
              // Check media
              if (item.get) {
                const media = item.get("media");
                if (media && media.get && media.get("id") === entryTag) {
                  Logger.info(`Found panorama with media ID: ${entryTag}`);
                  item.trigger("click");
                  return true;
                }

                // Check for matching tag in data.tags array
                const data = media && media.get ? media.get("data") : null;
                if (data && Array.isArray(data.tags) && data.tags.includes(entryTag)) {
                  Logger.info(`Found panorama with matching tag: ${entryTag}`);
                  item.trigger("click");
                  return true;
                }
              }
            }
          }
        } catch (e) {
          Logger.debug(`Error searching for element by tag: ${e.message}`);
        }
      }

      // [4.25.2.3] Method 3: Try matching by name
      if (entryName) {
        try {
          // Look through all panoramas and try to find a matching name
          const allItems = tour.mainPlayList.get("items");
          if (allItems && allItems.length) {
            for (let i = 0; i < allItems.length; i++) {
              const item = allItems[i];
              if (item.get) {
                const media = item.get("media");
                if (media && media.get) {
                  const data = media.get("data");
                  if (data && data.label && data.label.includes(entryName)) {
                    Logger.info(`Found panorama with matching name: ${entryName}`);
                    item.trigger("click");
                    return true;
                  }
                }
              }
            }
          }
        } catch (e) {
          Logger.debug(`Error searching for element by name: ${e.message}`);
        }
      }

      // [4.25.2.4] Failed to find a matching element
      Logger.warn(
        `Could not find a matching tour element for: ${entryName || entryId || entryTag}`
      );
      return false;
    }

    return false;
  }

  // [4.26] Helper: find a 3D sprite (hotspot) by label within the current model
  function _find3DSpriteByLabel(tour, { label, parentModelId }) {
    if (!tour || !label) return null;

    const classes = ["SpriteModel3DObject", "SpriteHotspotObject", "Sprite3DObject"];
    const wanted = label.toLowerCase();
    let candidates = [];

    try {
      if (tour.player && typeof tour.player.getByClassName === "function") {
        for (const cls of classes) {
          const arr = tour.player.getByClassName(cls);
          if (Array.isArray(arr)) candidates.push(...arr);
        }
      }
    } catch (e) {
      Logger.debug("[3D DEBUG] getByClassName failed:", e);
    }

    for (const sprite of candidates) {
      try {
        const data = _safeGetData(sprite);
        const raw = (data?.label || sprite.label || (sprite.get && sprite.get("label")) || "")
          .trim()
          .toLowerCase();
        if (!raw) continue;

        // constrain to the right model if we can
        let inParent = true;
        if (parentModelId) {
          const parent = sprite.get ? sprite.get("parent") : sprite.parent;
          const pid = parent && parent.get ? parent.get("id") : parent?.id;
          inParent = !pid || pid === parentModelId;
        }

        if (inParent && (raw === wanted || raw.includes(wanted))) {
          return sprite;
        }
      } catch (e) {
        /* ignore */
      }
    }

    return null;
  }

  // [4.27] Method: _triggerElementRetry() - Enhanced Trigger Element Interaction Based on Item Type
  function _triggerElementRetry(item, tour) {
    try {
      const type = item.type || (item.get ? item.get("type") : undefined);
      const id = item.id || (item.get ? item.get("id") : undefined);

      // [4.27.0.1] Try to get the correct tour reference based on your structure
      let actualTour = tour;
      if (!actualTour || (!actualTour.mainPlayList && !actualTour.player)) {
        // Try different possible tour references
        actualTour =
          window.tour ||
          window.tourInstance ||
          window.player ||
          (window.TDV &&
          window.TDV.PlayerAPI &&
          typeof window.TDV.PlayerAPI.getCurrentPlayer === "function"
            ? window.TDV.PlayerAPI.getCurrentPlayer()
            : null) ||
          item.tour;

        if (!actualTour) {
          Logger.warn("[Search] No valid tour reference found");
          return;
        }
      }

      // [4.27.0.2] Get playlist from the right location
      let playlist = null;
      if (
        actualTour.locManager &&
        actualTour.locManager.rootPlayer &&
        actualTour.locManager.rootPlayer.mainPlayList
      ) {
        playlist = actualTour.locManager.rootPlayer.mainPlayList;
        Logger.debug("Using correct playlist from locManager.rootPlayer.mainPlayList");
      } else if (actualTour.mainPlayList) {
        playlist = actualTour.mainPlayList;
        Logger.debug("Using fallback playlist from tour.mainPlayList");
      } else if (actualTour.player && actualTour.player.mainPlayList) {
        playlist = actualTour.player.mainPlayList;
        Logger.debug("Using fallback playlist from tour.player.mainPlayList");
      } else if (actualTour.player && typeof actualTour.player.get === "function") {
        try {
          playlist = actualTour.player.get("mainPlayList");
          Logger.debug("Using fallback playlist from tour.player.get('mainPlayList')");
        } catch (e) {
          Logger.debug("Could not get mainPlayList from player:", e);
        }
      }

      if (type === "3DModel") {
        Logger.info("Triggering 3DModel interaction for ID: " + id);

        // Method 1: Try direct playlist navigation
        if (typeof item.index === "number" && playlist && typeof playlist.set === "function") {
          Logger.info("Navigating to 3D model at playlist index " + item.index);
          playlist.set("selectedIndex", item.index);
          return;
        }

        // Method 2: Try to get the media and trigger it directly
        const media = item.item || item.media || (item.get ? item.get("media") : undefined);
        if (media && typeof media.trigger === "function") {
          Logger.info("Direct triggering 3D model media");
          media.trigger("click");
          return;
        }

        // Method 3: Try to find and trigger by ID using enhanced player detection
        if (id) {
          const players = [
            actualTour.locManager && actualTour.locManager.rootPlayer
              ? actualTour.locManager.rootPlayer
              : null,
            actualTour.player,
            actualTour,
            window.player,
            window.TDV &&
            window.TDV.PlayerAPI &&
            typeof window.TDV.PlayerAPI.getCurrentPlayer === "function"
              ? window.TDV.PlayerAPI.getCurrentPlayer()
              : null,
          ].filter(Boolean);

          for (const player of players) {
            try {
              if (typeof player.getById === "function") {
                const element = player.getById(id);
                if (element && typeof element.trigger === "function") {
                  Logger.info("Triggering 3D model element by ID: " + id + " using player");
                  element.trigger("click");
                  return;
                }
              }
            } catch (e) {
              Logger.debug("Player getById failed: " + e.message);
            }
          }
        }

        // [4.27.0.2.1] Try playlist item trigger
        if (item.item && typeof item.item.trigger === "function") {
          Logger.info("Triggering playlist item for 3D model");
          item.item.trigger("click");
          return;
        }

        Logger.warn("Could not trigger 3D model with ID: " + id);
        return;
      }

      if (type === "3DModelObject") {
        Logger.info("Triggering 3D Model Object interaction for ID: " + id);

        // [4.27.0.2.2] First navigate to parent model
        if (item.parentIndex !== undefined && playlist && typeof playlist.set === "function") {
          playlist.set("selectedIndex", item.parentIndex);
          Logger.info("Navigated to parent model at index " + item.parentIndex);

          // Then try to activate the specific object after a delay
          setTimeout(function () {
            try {
              if (id && actualTour.player && typeof actualTour.player.getById === "function") {
                const object = actualTour.player.getById(id);
                if (object && typeof object.trigger === "function") {
                  object.trigger("click");
                  Logger.info("Activated 3D model object: " + id);
                } else {
                  Logger.warn("3D model object not found or not clickable: " + id);
                }
              }
            } catch (e) {
              Logger.warn("Error activating 3D model object: " + e.message);
            }
          }, 500); // Increased delay for 3D model loading
          return;
        }
      }

      // [4.27.0.3] Default behavior for panoramas and other types
      Logger.info("Triggering element interaction for type: " + type + ", ID: " + id);

      // [4.27.0.4] Default panorama navigation
      if (typeof item.index === "number") {
        if (playlist && typeof playlist.set === "function") {
          playlist.set("selectedIndex", item.index);
          Logger.info("Navigated to item at index " + item.index);
          return;
        }
      }

      // [4.27.0.5] Handle child elements like hotspots
      if (item.parentIndex !== undefined) {
        if (playlist && typeof playlist.set === "function") {
          playlist.set("selectedIndex", item.parentIndex);
          Logger.info("Navigated to parent item at index " + item.parentIndex);

          // Then try to trigger the element
          if (id) {
            setTimeout(function () {
              attemptTrigger(id, actualTour);
            }, 300);
          }
          return;
        }
      }

      // [4.27.0.6] Direct element triggering as fallback
      if (id) {
        attemptTrigger(id, actualTour);
      } else {
        Logger.warn("Could not trigger element of type " + type + " - no ID available");
      }
    } catch (error) {
      Logger.error("Error triggering element interaction:", error);
    }
  }

  // [4.28] Method: attemptTrigger() - Helper Function for Attempting to Trigger Elements
  function attemptTrigger(id, tour) {
    try {
      // [4.28.0.1] Try multiple tour references
      const tourRefs = [
        tour,
        window.tourInstance,
        window.tour,
        window.player,
        window.TDV &&
        window.TDV.PlayerAPI &&
        typeof window.TDV.PlayerAPI.getCurrentPlayer === "function"
          ? window.TDV.PlayerAPI.getCurrentPlayer()
          : null,
      ].filter(Boolean);

      for (const tourRef of tourRefs) {
        if (tourRef && tourRef.player && typeof tourRef.player.getById === "function") {
          try {
            const element = tourRef.player.getById(id);
            if (element && typeof element.trigger === "function") {
              element.trigger("click");
              Logger.info("Successfully triggered element: " + id);
              return true;
            }
          } catch (e) {
            continue; // Try next tour reference
          }
        }
      }

      Logger.warn("[Search] Tour or player not available");
      Logger.warn("[Search] Failed to trigger element " + id);
      return false;
    } catch (error) {
      Logger.warn("Error in attemptTrigger: " + error.message);
      return false;
    }
  }

  // [4.29] Submodule: UI Management
  // [4.30] Method: _applySearchStyling()
  function _applySearchStyling() {
    const el = document.getElementById("searchContainer");
    if (!el) {
      Logger?.warn?.("[STYLE] Skipping styling; #searchContainer not mounted yet");
      return; // or defer until after init if there is an init event
    }

    console.log("Thumbnail settings:", window.searchFunctions?.getConfig()?.thumbnailSettings);
    // First check if container exists
    const searchContainer = document.getElementById("searchContainer");
    const searchResults = searchContainer?.querySelector(".search-results");

    if (!searchContainer) {
      Logger.warn("Search container not found, will attempt to create it");

      // Try to create the container
      try {
        // Find the viewer element
        const viewer = document.getElementById("viewer");
        if (!viewer) {
          Logger.error("Cannot create search container: #viewer element not found");
          return; // Exit early if we can't create the container
        }

        // Create container from markup
        const temp = document.createElement("div");
        temp.innerHTML = SEARCH_MARKUP.trim();
        viewer.appendChild(temp.firstChild);

        Logger.info("Search container created successfully");

        // Update element cache with the newly created container
        const newContainer = document.getElementById("searchContainer");
        if (!newContainer) {
          Logger.error("Failed to create search container");
          return; // Exit early if creation failed
        }

        // Update the container reference for this function AND the module cache
        _elements.container = newContainer;
      } catch (error) {
        Logger.error("Error creating search container:", error);
        return; // Exit early on error
      }
    } else {
      // Update the module cache if container exists
      _elements.container = searchContainer;
    }

    // Now update all element references
    _elements.input = _elements.container.querySelector("#tourSearch");
    _elements.results = _elements.container.querySelector(".search-results");
    _elements.clearButton = _elements.container.querySelector(".clear-button");
    _elements.searchIcon = _elements.container.querySelector(".search-icon");

    // Apply container position based on device
    const position = _config.searchBar.position;
    const mobileOverrides = _config.searchBar.mobileOverrides || {};
    const effectiveBreakpoint =
      (mobileOverrides?.enabled && _config.searchBar.useResponsive
        ? mobileOverrides?.breakpoint
        : null) ?? _config.mobileBreakpoint;

    const isMobile = window.innerWidth <= effectiveBreakpoint;

    // **SAFETY CHECK: Ensure we have a valid container before proceeding**
    const finalContainer = document.getElementById("searchContainer");
    if (!finalContainer) {
      Logger.error("Search container still not available after creation attempt");
      return;
    }

    // **FIXED: Features should only apply when mobile AND enabled**
    const isMobileOverride =
      isMobile && _config.searchBar.useResponsive && _config.searchBar.mobileOverrides?.enabled;

    // Set positioning attribute for CSS targeting
    if (position.left !== null && position.right === null) {
      finalContainer.setAttribute("data-position", "left");
    } else if (position.left !== null && position.left === "50%") {
      finalContainer.setAttribute("data-position", "center");
    } else {
      finalContainer.setAttribute("data-position", "right");
    }

    // Set visibility behavior based on device and overrides
    finalContainer.setAttribute(
      "data-visibility-behavior",
      isMobileOverride ? mobileOverrides.visibility?.behavior || "dynamic" : "fixed"
    );

    // [4.30.1] Clean up any existing style elements
    const existingStyle = document.getElementById("search-custom-vars");
    if (existingStyle) {
      existingStyle.remove();
    }

    // [4.30.2] Create new style element
    const styleElement = document.createElement("style");
    styleElement.id = "search-custom-vars";

    // [4.30.3] Generate responsive positioning CSS
    const mobilePosition = _config.searchBar.mobilePosition;

    // [4.30.4] Width calculation based on device type
    const desktopWidth =
      typeof _config.searchBar.width === "number"
        ? `${_config.searchBar.width}px`
        : _config.searchBar.width;
    const mobileWidth = mobileOverrides.width
      ? typeof mobileOverrides.width === "number"
        ? `${mobileOverrides.width}px`
        : mobileOverrides.width
      : `calc(100% - ${(mobilePosition.left || 0) * 2 + (mobilePosition.right || 0) * 2}px)`;

    // [4.30.5] Maximum width for mobile if specified
    const mobileMaxWidth = mobileOverrides.maxWidth
      ? typeof mobileOverrides.maxWidth === "number"
        ? `${mobileOverrides.maxWidth}px`
        : mobileOverrides.maxWidth
      : "";

    // [4.30.6] Base mobile positioning
    const positionCSS = isMobileOverride
      ? `
            /* Mobile positioning with overrides */
            #searchContainer {
                position: fixed;
                ${mobilePosition.top !== null && mobilePosition.top !== undefined ? `top: ${mobilePosition.top}px;` : ""}
                ${mobilePosition.right !== null && mobilePosition.right !== undefined ? `right: ${mobilePosition.right}px;` : ""}
                ${mobilePosition.left !== null && mobilePosition.left !== undefined ? `left: ${mobilePosition.left}px;` : ""}
                ${
                  mobilePosition.bottom !== null && mobilePosition.bottom !== undefined
                    ? mobilePosition.bottom === "auto"
                      ? "bottom: auto;"
                      : `bottom: ${mobilePosition.bottom}px;`
                    : ""
                }
                width: ${mobileWidth};
                ${mobileMaxWidth ? `max-width: ${mobileMaxWidth};` : ""}
                z-index: 9999;
            }

            /* Apply mobile-specific visibility behavior */
            ${
              mobileOverrides.visibility?.behavior === "dynamic"
                ? `
            #searchContainer[data-visibility-behavior="dynamic"] {
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            `
                : ""
            }

            ${
              mobileOverrides.visibility?.behavior === "fixed"
                ? `
            #searchContainer[data-visibility-behavior="fixed"] {
                opacity: 1 !important;
                transform: none !important;
            }
            `
                : ""
            }
        `
      : `
            /* Desktop positioning */
            #searchContainer {
                position: fixed;
                ${position.top !== null ? `top: ${position.top}px;` : ""}
                ${position.right !== null ? `right: ${position.right}px;` : ""}
                ${position.left !== null ? `left: ${position.left}px;` : ""}
                ${position.bottom !== null ? `bottom: ${position.bottom}px;` : ""}
                width: ${desktopWidth};
                z-index: 9999;
            }
        `;

    // [4.30.7] Apply display-related classes and CSS variables
    const root = document.documentElement;

    // [4.30.8] Set CSS variables for result tags visibility
    root.style.setProperty("--result-tags-display", _config.showTagsInResults ? "block" : "none");

    // [4.30.9] Apply class-based styling for visibility control
    if (!_config.display.showGroupHeaders) {
      document.body.classList.add("hide-group-headers");
    } else {
      document.body.classList.remove("hide-group-headers");
    }

    if (!_config.display.showGroupCount) {
      document.body.classList.add("hide-group-count");
    } else {
      document.body.classList.remove("hide-group-count");
    }

    if (!_config.display.showIconsInResults) {
      document.body.classList.add("hide-result-icons");
    } else {
      document.body.classList.remove("hide-result-icons");
    }

    // [4.30.10] Set icon color variable
    root.style.setProperty(
      "--color-result-icon",
      _config.appearance.colors.resultIconColor || "#6e85f7"
    );

    // [4.30.11] Set border radius CSS variables
    const fieldRadius = _config.appearance.searchField.borderRadius;
    const resultsRadius = _config.appearance.searchResults.borderRadius;

    // [4.30.12] Set CSS variables for border radius

    root.style.setProperty(
      "--search-field-radius-top-left",
      Math.min(fieldRadius.topLeft, 50) + "px"
    );
    root.style.setProperty(
      "--search-field-radius-top-right",
      Math.min(fieldRadius.topRight, 50) + "px"
    );
    root.style.setProperty(
      "--search-field-radius-bottom-right",
      Math.min(fieldRadius.bottomRight, 50) + "px"
    );
    root.style.setProperty(
      "--search-field-radius-bottom-left",
      Math.min(fieldRadius.bottomLeft, 50) + "px"
    );

    root.style.setProperty(
      "--search-results-radius-top-left",
      Math.min(resultsRadius.topLeft, 10) + "px"
    );
    root.style.setProperty(
      "--search-results-radius-top-right",
      Math.min(resultsRadius.topRight, 10) + "px"
    );
    root.style.setProperty(
      "--search-results-radius-bottom-right",
      Math.min(resultsRadius.bottomRight, 10) + "px"
    );
    root.style.setProperty(
      "--search-results-radius-bottom-left",
      Math.min(resultsRadius.bottomLeft, 10) + "px"
    );

    // [4.30.13] Set thumbnail border properties
    const thumbnailRadius = _config.thumbnailSettings?.borderRadius || 4;
    const thumbnailBorderColor = _config.thumbnailSettings?.borderColor || "#e5e7eb";
    const thumbnailBorderWidth = _config.thumbnailSettings?.borderWidth || 2;

    root.style.setProperty("--thumbnail-border-radius", thumbnailRadius + "px");
    root.style.setProperty("--thumbnail-border-color", thumbnailBorderColor);
    // [4.30.14] Handle border width of 0 properly
    if (thumbnailBorderWidth === 0) {
      root.style.setProperty("--thumbnail-border-width", "0px");
      root.style.setProperty("--thumbnail-border-style", "none");
    } else {
      root.style.setProperty("--thumbnail-border-width", thumbnailBorderWidth + "px");
      root.style.setProperty("--thumbnail-border-style", "solid");
    }

    // [4.30.15] Set thumbnail size properties
    const thumbSizeName = _config.thumbnailSettings?.thumbnailSize || "48px";

    // [4.30.16] Extract pixel value from size name (e.g., "48px" -> 48)
    let thumbSize = 48; // default
    if (thumbSizeName && thumbSizeName.endsWith("px")) {
      thumbSize = parseInt(thumbSizeName.replace("px", ""));
    }

    // [4.30.17] Always set the current size
    root.style.setProperty("--thumbnail-current-size", thumbSize + "px");

    // [4.30.18] Update all predefined sizes for backward compatibility
    root.style.setProperty("--thumbnail-small-size", "32px");
    root.style.setProperty("--thumbnail-medium-size", "48px");
    root.style.setProperty("--thumbnail-large-size", "64px");

    const iconSettings =
      (typeof _config !== "undefined" && _config.thumbnailSettings?.iconSettings) || {};
    // Set icon size based on configuration
    let iconSizePx = 20; // default
    if (iconSettings.iconSize === "small") {
      iconSizePx = 16;
    } else if (iconSettings.iconSize === "medium") {
      iconSizePx = 20;
    } else if (iconSettings.iconSize === "large") {
      iconSizePx = 24;
    } else if (iconSettings.iconSize === "custom" && iconSettings.iconSizePx) {
      iconSizePx = iconSettings.iconSizePx;
    }

    root.style.setProperty("--icon-current-size", iconSizePx + "px");

    // Set all icon styling variables
    root.style.setProperty("--icon-color", iconSettings.iconColor || "#6e85f7");
    root.style.setProperty(
      "--icon-opacity",
      iconSettings.iconOpacity !== undefined ? iconSettings.iconOpacity : 0.8
    );
    root.style.setProperty(
      "--icon-border-radius",
      (iconSettings.iconBorderRadius !== undefined ? iconSettings.iconBorderRadius : 4) + "px"
    );
    root.style.setProperty(
      "--icon-margin",
      (iconSettings.iconMargin !== undefined ? iconSettings.iconMargin : 10) + "px"
    );
    root.style.setProperty(
      "--icon-hover-scale",
      iconSettings.iconHoverScale !== undefined ? iconSettings.iconHoverScale : 1.1
    );
    root.style.setProperty(
      "--icon-hover-opacity",
      iconSettings.iconHoverOpacity !== undefined ? iconSettings.iconHoverOpacity : 1.0
    );

    // Set icon alignment data attribute on body for CSS targeting
    document.body.setAttribute(
      "data-icon-alignment",
      iconSettings.iconAlignment === "right" ? "right" : "left"
    );

    // Set hover effects enabled/disabled
    document.body.setAttribute(
      "data-icon-hover-enabled",
      iconSettings.enableIconHover !== false ? "true" : "false"
    );

    Logger.debug("[ICON CSS] Applied icon variables:", {
      size: iconSizePx + "px",
      color: iconSettings.iconColor || "#6e85f7",
      opacity: iconSettings.iconOpacity !== undefined ? iconSettings.iconOpacity : 0.8,
      margin: (iconSettings.iconMargin !== undefined ? iconSettings.iconMargin : 10) + "px",
      alignment: iconSettings.iconAlignment === "right" ? "right" : "left",
    });

    // [4.30.19] Load Font Awesome if enabled
    if (iconSettings.enableFontAwesome && iconSettings.fontAwesomeUrl) {
      Logger.debug("[ICON] Loading Font Awesome:", iconSettings.fontAwesomeUrl);

      // Check if Font Awesome is already loaded
      const existingFontAwesome =
        document.querySelector('link[href*="font-awesome"]') ||
        document.querySelector('link[href="' + iconSettings.fontAwesomeUrl + '"]');

      if (!existingFontAwesome) {
        const fontAwesomeLink = document.createElement("link");
        fontAwesomeLink.rel = "stylesheet";
        fontAwesomeLink.href = iconSettings.fontAwesomeUrl;
        fontAwesomeLink.crossOrigin = "anonymous";

        fontAwesomeLink.onload = () => {
          Logger.info("[ICON] Font Awesome loaded successfully");
          // Re-render search results if they exist to show FA icons
          const searchInput = document.querySelector("#tourSearch");
          if (searchInput && searchInput.value) {
            // Trigger a re-render by simulating input
            const event = new Event("input", { bubbles: true });
            searchInput.dispatchEvent(event);
          }
        };

        fontAwesomeLink.onerror = () => {
          console.error("[ICON] Failed to load Font Awesome from:", iconSettings.fontAwesomeUrl);
        };

        document.head.appendChild(fontAwesomeLink);
      } else {
        Logger.debug("[ICON] Font Awesome already loaded");
      }
    } else if (iconSettings.enableFontAwesome && !iconSettings.fontAwesomeUrl) {
      console.warn("[ICON] Font Awesome enabled but no URL provided");
    } else {
      Logger.debug("[ICON] Font Awesome loading disabled");
    }

    // [4.30.20] Set color variables for search
    root.style.setProperty(
      "--search-background",
      _config.appearance.colors.searchBackground || "#f4f3f2"
    );
    root.style.setProperty("--search-text", _config.appearance.colors.searchText || "#1a1a1a");
    root.style.setProperty(
      "--placeholder-text",
      _config.appearance.colors.placeholderText || "#94a3b8"
    );
    root.style.setProperty("--search-icon", _config.appearance.colors.searchIcon || "#94a3b8");
    root.style.setProperty("--clear-icon", _config.appearance.colors.clearIcon || "#94a3b8");
    root.style.setProperty(
      "--results-background",
      _config.appearance.colors.resultsBackground || "#ffffff"
    );
    root.style.setProperty(
      "--group-header-bg",
      _config.appearance.colors.groupHeaderBackground || "#ffffff"
    );
    root.style.setProperty(
      "--group-header",
      _config.appearance.colors.groupHeaderColor || "#20293A"
    );
    root.style.setProperty("--group-count", _config.appearance.colors.groupCountColor || "#94a3b8");
    root.style.setProperty("--result-hover", _config.appearance.colors.resultHover || "#f0f0f0");
    root.style.setProperty(
      "--result-border-left",
      _config.appearance.colors.resultBorderLeft || "#ebebeb"
    );
    root.style.setProperty("--result-text", _config.appearance.colors.resultText || "#1e293b");
    root.style.setProperty(
      "--result-subtitle",
      _config.appearance.colors.resultSubtitle || "#64748b"
    );
    root.style.setProperty(
      "--color-result-icon",
      _config.appearance.colors.resultIconColor || "#6e85f7"
    );
    root.style.setProperty(
      "--result-subtext-color",
      _config.appearance.colors.resultSubtextColor || "#000000"
    );

    // [4.30.21] NEW: Set typography variables for search field
    const searchTypography = _config.appearance?.searchField?.typography || {};
    const placeholderTypography = searchTypography.placeholder || {};
    const focusTypography = searchTypography.focus || {};

    console.log("🎯 TYPOGRAPHY CSS VARS: Applying typography variables:", {
      searchTypography: searchTypography,
      hasTypography: !!_config.appearance?.searchField?.typography,
      configStructure: {
        hasAppearance: !!_config.appearance,
        hasSearchField: !!_config.appearance?.searchField,
        hasTypography: !!_config.appearance?.searchField?.typography,
      },
    });

    // Input text typography
    const fontSize = searchTypography.fontSize || "16px";
    const fontFamily = searchTypography.fontFamily || "inherit";
    const fontWeight = searchTypography.fontWeight || "400";
    const fontStyle = searchTypography.fontStyle || "normal";
    const lineHeight = searchTypography.lineHeight || "1.5";
    const letterSpacing = searchTypography.letterSpacing || "0px";
    const textTransform = searchTypography.textTransform || "none";

    console.log("🎯 TYPOGRAPHY CSS VARS: Setting input text variables:", {
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      lineHeight,
      letterSpacing,
      textTransform,
    });

    root.style.setProperty("--search-input-font-size", fontSize);
    root.style.setProperty("--search-input-font-family", fontFamily);
    root.style.setProperty("--search-input-font-weight", fontWeight);
    root.style.setProperty("--search-input-font-style", fontStyle);
    root.style.setProperty("--search-input-line-height", lineHeight);
    root.style.setProperty("--search-input-letter-spacing", letterSpacing);
    root.style.setProperty("--search-input-text-transform", textTransform);

    // Placeholder typography
    root.style.setProperty(
      "--search-placeholder-font-size",
      placeholderTypography.fontSize || searchTypography.fontSize || "16px"
    );
    root.style.setProperty(
      "--search-placeholder-font-family",
      placeholderTypography.fontFamily || searchTypography.fontFamily || "inherit"
    );
    root.style.setProperty(
      "--search-placeholder-font-weight",
      placeholderTypography.fontWeight || "400"
    );
    root.style.setProperty(
      "--search-placeholder-font-style",
      placeholderTypography.fontStyle || "italic"
    );
    root.style.setProperty("--search-placeholder-opacity", placeholderTypography.opacity || "0.7");
    root.style.setProperty(
      "--search-placeholder-letter-spacing",
      placeholderTypography.letterSpacing || "0px"
    );
    root.style.setProperty(
      "--search-placeholder-text-transform",
      placeholderTypography.textTransform || "none"
    );

    // Focus state typography
    root.style.setProperty(
      "--search-focus-font-size",
      focusTypography.fontSize || searchTypography.fontSize || "16px"
    );
    root.style.setProperty(
      "--search-focus-font-weight",
      focusTypography.fontWeight || searchTypography.fontWeight || "400"
    );
    root.style.setProperty(
      "--search-focus-letter-spacing",
      focusTypography.letterSpacing || searchTypography.letterSpacing || "0.25px"
    );

    // [4.30.22] Set highlight color variables
    root.style.setProperty(
      "--search-highlight-color",
      _config.appearance.colors.highlightText || "#000000"
    );

    // [4.30.23] Create background color with opacity
    const highlightBg = _config.appearance.colors.highlightBackground || "#ffff00";
    const highlightOpacity =
      _config.appearance.colors.highlightBackgroundOpacity !== undefined
        ? _config.appearance.colors.highlightBackgroundOpacity
        : 0.5;

    // Convert hex to rgba if opacity < 1
    let highlightBgValue;
    if (highlightOpacity < 1) {
      // Simple hex to rgba conversion
      let r = 255,
        g = 255,
        b = 0; // Default yellow

      if (highlightBg && highlightBg.startsWith("#")) {
        const hex = highlightBg.slice(1);
        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16);
          g = parseInt(hex[1] + hex[1], 16);
          b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
          r = parseInt(hex.slice(0, 2), 16);
          g = parseInt(hex.slice(2, 4), 16);
          b = parseInt(hex.slice(4, 6), 16);
        }
      }

      highlightBgValue = `rgba(${r}, ${g}, ${b}, ${highlightOpacity})`;
    } else {
      highlightBgValue = highlightBg;
    }

    root.style.setProperty("--search-highlight-bg", highlightBgValue);
    root.style.setProperty(
      "--highlight-font-weight",
      _config.appearance.colors.highlightWeight || "bold"
    );

    // [4.30.24] Set tag colors
    root.style.setProperty(
      "--tag-background",
      _config.appearance.colors.tagBackground || "#e2e8f0"
    );
    root.style.setProperty("--tag-text", _config.appearance.colors.tagText || "#475569");
    root.style.setProperty("--tag-border", _config.appearance.colors.tagBorder || "#cbd5e1");
    root.style.setProperty("--tag-hover", _config.appearance.colors.tagHover || "#d1d5db");

    // [4.30.25] Set tag styling variables
    root.style.setProperty(
      "--tag-border-radius",
      (_config.appearance.tags?.borderRadius || 12) + "px"
    );
    root.style.setProperty("--tag-font-size", _config.appearance.tags?.fontSize || "12px");
    root.style.setProperty("--tag-padding", _config.appearance.tags?.padding || "2px 8px");
    root.style.setProperty("--tag-margin", _config.appearance.tags?.margin || "2px");
    root.style.setProperty("--tag-font-weight", _config.appearance.tags?.fontWeight || "500");
    root.style.setProperty(
      "--tag-text-transform",
      _config.appearance.tags?.textTransform || "none"
    );
    root.style.setProperty("--tag-border-width", _config.appearance.tags?.borderWidth || "1px");
    root.style.setProperty(
      "--tag-show-border",
      _config.appearance.tags?.showBorder ? "solid" : "none"
    );

    // [4.30.26] Handle thumbnail alignment from config
    const thumbAlignment = _config.thumbnailSettings?.alignment === "right" ? "right" : "left";

    // [4.30.27] Apply thumbnail alignment to the document body as a data attribute
    document.body.setAttribute("data-thumbnail-align", thumbAlignment);

    // [4.30.28] Apply styles to the DOM
    styleElement.textContent = positionCSS;
    document.head.appendChild(styleElement);

    // [4.30.29] Add or update highlight styles
    const existingHighlightStyle = document.getElementById("search-highlight-styles");
    if (existingHighlightStyle) {
      existingHighlightStyle.remove();
    }

    const highlightStyleElement = document.createElement("style");
    highlightStyleElement.id = "search-highlight-styles";
    highlightStyleElement.textContent = `
.result-item strong,
.result-item mark,
.result-item .highlight {
  background-color: var(--search-highlight-bg, rgba(255, 255, 0, 0.5));
  color: var(--search-highlight-color, #000000);
  font-weight: var(--highlight-font-weight, bold);
  padding: 0 2px;
  border-radius: 2px;
}`;
    document.head.appendChild(highlightStyleElement);

    // [6.2] Animation styles are now handled by _applyAnimationFlagAndVars()

    // [4.30.30] Cache frequently used elements and apply placeholder text
    _elements.input = _elements.container.querySelector("#tourSearch");
    _elements.results = _elements.container.querySelector(".search-results");
    _elements.clearButton = _elements.container.querySelector(".clear-button");
    _elements.searchIcon = _elements.container.querySelector(".search-icon");

    if (_elements.input) {
      _elements.input.placeholder = _config.searchBar.placeholder;

      // [4.30.30.1] Add accessibility attributes
      _aria.setRole(_elements.input, "searchbox");
      _aria.setLabel(_elements.input, "Search tour");
      _aria.setAutoComplete(_elements.input, "list");
    }

    Logger.info("Search styling applied successfully");
  }
  // [4.31] Submodule: Business Data Matching
  // [4.32] Method: findBusinessMatch()
  function findBusinessMatch(tourElement) {
    // [4.32.1] Skip if no business data or invalid element
    if (!_businessData || !_businessData.length || !tourElement) {
      return null;
    }

    const elementName = tourElement.name || "";
    const elementId = tourElement.id || "";
    const elementSubtitle = tourElement.subtitle || "";
    const elementTags = Array.isArray(tourElement.tags) ? tourElement.tags : [];

    Logger.debug(
      `[MATCHING] Processing: ${elementName || elementId} (Subtitle: ${elementSubtitle}, Tags: ${elementTags.join(",")})`
    );

    // [4.32.2] PRIORITY 1: Check subtitle matches FIRST
    if (elementSubtitle) {
      for (const entry of _businessData) {
        // Direct subtitle to ID match
        if (entry.id === elementSubtitle) {
          Logger.debug(
            `[MATCH:SUBTITLE_ID] Element subtitle "${elementSubtitle}" matches business entry with ID: ${entry.id}`
          );
          return processBusinessMatch(entry);
        }

        // Subtitle in matchTags
        if (
          entry.matchTags &&
          Array.isArray(entry.matchTags) &&
          entry.matchTags.includes(elementSubtitle)
        ) {
          Logger.debug(
            `[MATCH:SUBTITLE_TAG] Element subtitle "${elementSubtitle}" matches business entry with ID: ${entry.id}`
          );
          return processBusinessMatch(entry);
        }
      }
    }

    // [4.32.3] PRIORITY 2: Check element name matches
    if (elementName) {
      for (const entry of _businessData) {
        if (entry.id === elementName) {
          Logger.debug(
            `[MATCH:NAME] Element name "${elementName}" matches business entry with ID: ${entry.id}`
          );
          return processBusinessMatch(entry);
        }
      }
    }

    // [4.32.4] PRIORITY 3: Check tag matches (lowest priority)
    for (const entry of _businessData) {
      if (entry.matchTags && Array.isArray(entry.matchTags)) {
        for (const tag of elementTags) {
          if (entry.matchTags.includes(tag)) {
            Logger.debug(
              `[MATCH:TAG] Element tag "${tag}" matches business entry with ID: ${entry.id}`
            );
            return processBusinessMatch(entry);
          }
        }
      }
    }

    // [4.32.5] No match found
    Logger.debug(
      `[MATCH:NONE] No business match for: ${elementName || elementId || elementSubtitle}`
    );
    return null;

    // [4.32.6] Helper function to process business match
    function processBusinessMatch(entry) {
      const businessMatch = { ...entry };

      Logger.debug("[DEBUG] Before normalization:", {
        imageUrl: businessMatch.imageUrl,
        localImage: businessMatch.localImage,
      });

      // [4.32.6.1] Normalize image paths in business data
      if (businessMatch.imageUrl) {
        businessMatch.imageUrl = _normalizeImagePath(businessMatch.imageUrl);
      }

      if (businessMatch.localImage) {
        businessMatch.localImage = _normalizeImagePath(businessMatch.localImage);
      }

      // [4.32.6.2] If no imageUrl but has localImage, use localImage as imageUrl
      if (!businessMatch.imageUrl && businessMatch.localImage) {
        businessMatch.imageUrl = businessMatch.localImage;
        console.log("[DEBUG] Using localImage as imageUrl:", businessMatch.imageUrl);
      }

      // [4.32.6.3] Debug logging after normalization
      Logger.debug("[DEBUG] After normalization:", {
        imageUrl: businessMatch.imageUrl,
        localImage: businessMatch.localImage,
      });

      return businessMatch;
    }
  }

  // [4.33] Submodule: Event Binding
  // [4.34] Method: _bindSearchEventListeners()
  function _bindSearchEventListeners(
    searchContainer,
    searchInput,
    clearButton,
    searchIcon,
    searchCallback
  ) {
    // [4.34.1] First clean up any existing event listeners
    _unbindSearchEventListeners();

    Logger.debug("Binding search event listeners...");

    // [4.34.2] Create a cleanup registry for this session
    const cleanup = [];

    // [4.34.3] Bind input event with device-appropriate debounce
    if (searchInput) {
      const isMobile = window.innerWidth <= _config.mobileBreakpoint || "ontouchstart" in window;
      const debounceTime = isMobile ? 300 : 150;

      const debouncedSearch = _debounce(searchCallback, debounceTime);
      const inputHandler = () => debouncedSearch();

      searchInput.addEventListener("input", inputHandler);
      cleanup.push(() => searchInput.removeEventListener("input", inputHandler));

      // [4.34.3.1] Mobile touch optimization
      if ("ontouchstart" in window) {
        const touchHandler = () => searchInput.focus();
        searchInput.addEventListener("touchend", touchHandler);
        cleanup.push(() => searchInput.removeEventListener("touchend", touchHandler));
      }
    }

    // [4.34.4] Bind clear button
    if (clearButton) {
      const clearHandler = (e) => {
        e.stopPropagation();
        if (searchInput) {
          searchInput.value = "";
          searchCallback();
          searchInput.focus();
        }

        if (window.innerWidth <= _config.mobileBreakpoint && _config.autoHide.mobile) {
          _toggleSearch(false);
        }
      };

      clearButton.addEventListener("click", clearHandler);
      cleanup.push(() => clearButton.removeEventListener("click", clearHandler));
    }

    // [4.34.5] Bind search icon
    if (searchIcon) {
      if (searchIcon) searchIcon.classList.add("search-icon");
      const iconHandler = () => {
        if (searchInput) {
          searchInput.value = "*";
          searchCallback();
        }
      };

      searchIcon.addEventListener("click", iconHandler);
      cleanup.push(() => searchIcon.removeEventListener("click", iconHandler));
    }

    // [4.34.6] Document click handler for closing search
    const documentClickHandler = (e) => {
      if (!searchContainer.classList.contains("visible")) return;
      if (!searchContainer.contains(e.target)) {
        _toggleSearch(false);
      }
    };

    document.addEventListener("click", documentClickHandler);
    cleanup.push(() => document.removeEventListener("click", documentClickHandler));

    // [4.34.7] Touch handler for mobile
    if ("ontouchstart" in window) {
      const touchStartHandler = (e) => {
        if (searchContainer.classList.contains("visible") && !searchContainer.contains(e.target)) {
          _toggleSearch(false);
        }
      };

      document.addEventListener("touchstart", touchStartHandler);
      cleanup.push(() => document.removeEventListener("touchstart", touchStartHandler));
    }

    // [4.34.8] Keyboard navigation
    const keyboardHandler = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        _toggleSearch(true);
      }

      if (!searchContainer.classList.contains("visible")) return;

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          if (searchInput && searchInput.value.trim() !== "") {
            searchInput.value = "";
            performSearch();
            selectedIndex = -1;
          } else {
            _toggleSearch(false);
          }
          break;
      }
    };

    document.addEventListener("keydown", keyboardHandler);
    cleanup.push(() => document.removeEventListener("keydown", keyboardHandler));

    // [4.34.9] Store cleanup functions for later use
    window._searchEventCleanup = cleanup;

    Logger.debug("Search event listeners bound successfully");
    return true;
  }

  // [4.35] Method: _unbindSearchEventListeners()
  function _unbindSearchEventListeners() {
    try {
      if (window._searchEventCleanup && Array.isArray(window._searchEventCleanup)) {
        window._searchEventCleanup.forEach((cleanupFn) => {
          try {
            cleanupFn();
          } catch (e) {
            Logger.warn("Error in cleanup function:", e);
          }
        });
        window._searchEventCleanup = [];
      }
      Logger.debug("Search event listeners cleaned up");
      return true;
    } catch (error) {
      Logger.warn("Error during event cleanup:", error);
      return false;
    }
  }

  // [5.0] Module: Data Loading
  // [5.1] Method: _loadGoogleSheetsData()
  function _loadGoogleSheetsData() {
    // [5.1.1] Skip if Google Sheets data is not enabled
    if (!_config.googleSheets.useGoogleSheetData) {
      console.log("🔴 [DATA SOURCE] Google Sheets integration DISABLED - skipping load");
      return Promise.resolve([]);
    }

    // **NEW: Enhanced debug logging**
    Logger.debug("🔍 [DATA SOURCE DEBUG] Configuration check:");
    console.log("   useGoogleSheetData:", _config.googleSheets.useGoogleSheetData);
    console.log("   useLocalCSV:", _config.googleSheets.useLocalCSV);
    console.log("   googleSheetUrl:", _config.googleSheets.googleSheetUrl);
    console.log("   localCSVUrl:", _config.googleSheets.localCSVUrl);

    if (!_config.googleSheets.googleSheetUrl && !_config.googleSheets.useLocalCSV) {
      console.log(
        "🔴 [DATA SOURCE] No data source provided - need either googleSheetUrl or useLocalCSV=true"
      );
      return Promise.resolve([]);
    }

    // [5.1.2] Determine data source (local CSV vs. Google Sheets URL)
    let fetchUrl;
    let dataSourceType;

    if (_config.googleSheets.useLocalCSV) {
      // PRIORITY: Local CSV mode - ignore Google Sheets URL completely
      const raw = (_config.googleSheets.localCSVUrl || "").trim();

      if (raw && /^https?:\/\//i.test(raw)) {
        fetchUrl = raw; // absolute override
      } else if (raw) {
        fetchUrl = __fromScript(raw); // relative override (from script folder)
      } else {
        const dir = _config.googleSheets.localCSVDir || "business-data";
        const file = _config.googleSheets.localCSVFile || "search-data.csv";
        fetchUrl = __fromScript(`${dir}/${file}`); // <— key change
      }
      dataSourceType = "local";
      Logger.info(`🔌 LOCAL CSV MODE: Loading from ${fetchUrl}`);

      // CRITICAL: Ignore Google Sheets URL in local mode
      if (_config.googleSheets.googleSheetUrl) {
        Logger.info("ℹ️  Google Sheets URL ignored (Local CSV mode active)");
      }
    } else if (_config.googleSheets.googleSheetUrl) {
      // Use Google Sheets URL (original functionality)
      fetchUrl = (_config.googleSheets.googleSheetUrl || "").trim();
      if (!fetchUrl) return Promise.resolve([]);
      dataSourceType = "online";
      Logger.info(`🌐 ONLINE MODE: Loading from ${fetchUrl}`);
    } else {
      // No data source configured
      Logger.warn("⚠️  No data source configured (no URL and useLocalCSV=false)");
      return Promise.resolve([]);
    }

    const fetchMode = _config.googleSheets.fetchMode || "csv";
    const cachingOptions = _config.googleSheets.caching || {};
    const progressiveOptions = _config.googleSheets.progressiveLoading || {};
    const authOptions = _config.googleSheets.authentication || {};

    // [5.1.3] Check cache first if enabled (online only)
    if (cachingOptions.enabled && dataSourceType === "online") {
      try {
        const storageKey = cachingOptions.storageKey || "tourGoogleSheetsData";
        const cacheTimeoutMinutes = cachingOptions.timeoutMinutes || 60;

        const cachedData = localStorage.getItem(storageKey);
        const cacheTimestamp = localStorage.getItem(`${storageKey}_timestamp`);

        if (cachedData && cacheTimestamp) {
          const parsedTimestamp = parseInt(cacheTimestamp, 10);
          const now = Date.now();
          const cacheAge = (now - parsedTimestamp) / (1000 * 60); // Convert to minutes

          // If cache is still valid
          if (cacheAge < cacheTimeoutMinutes) {
            try {
              const parsedData = JSON.parse(cachedData);
              Logger.info(
                `Using cached Google Sheets data (${parsedData.length} rows, ${cacheAge.toFixed(1)} minutes old)`
              );
              _googleSheetsData = parsedData;
              return Promise.resolve(parsedData);
            } catch (parseError) {
              Logger.warn("Error parsing cached data, will fetch fresh data:", parseError);
              // Continue with fetch if parse fails
            }
          } else {
            Logger.info(
              `Cached data expired (${cacheAge.toFixed(1)} minutes old), fetching fresh data`
            );
          }
        }
      } catch (cacheError) {
        Logger.warn("Error checking cache, will fetch fresh data:", cacheError);
      }
    }

    // [5.1.4] Process URL for Google Sheets (online only)
    console.log("[search-v3] data URLs OK:", { business: undefined, csv: fetchUrl });
    if (
      dataSourceType === "online" &&
      fetchMode === "csv" &&
      !fetchUrl.includes("/export?format=csv")
    ) {
      // [5.1.4.1] Convert Google Sheets view URL to CSV export URL
      if (fetchUrl.includes("spreadsheets.google.com/") && !fetchUrl.includes("/export")) {
        // Extract the sheet ID
        let sheetId = "";
        try {
          const match = fetchUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (match && match[1]) {
            sheetId = match[1];
            fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
          }
        } catch (e) {
          Logger.warn("Failed to convert Google Sheets URL to CSV export URL:", e);
        }
      }
    }

    Logger.info(`Final fetch URL: ${fetchUrl}`);

    // [5.1.5] Add authentication if enabled (online only)
    if (
      dataSourceType === "online" &&
      authOptions.enabled &&
      authOptions.authType === "apiKey" &&
      authOptions.apiKey
    ) {
      const separator = fetchUrl.includes("?") ? "&" : "?";
      const apiKeyParam = authOptions.apiKeyParam || "key";
      fetchUrl = `${fetchUrl}${separator}${apiKeyParam}=${encodeURIComponent(authOptions.apiKey)}`;
      Logger.debug("Added API key authentication to request");
    }

    // [5.1.6] Fetch the data
    return fetch(fetchUrl)
      .then((response) => {
        Logger.info(
          `${dataSourceType === "local" ? "Local CSV" : "Google Sheets"} fetch response status: ${response.status}`
        );
        if (!response.ok) {
          throw new Error(
            `Failed to load ${dataSourceType === "local" ? "local CSV" : "Google Sheets"} data: ${response.status} ${response.statusText}`
          );
        }
        return response.text();
      })
      .then((text) => {
        Logger.info(
          `${dataSourceType === "local" ? "Local CSV" : "Google Sheets"} raw data length: ${text.length}`
        );
        Logger.info(
          `${dataSourceType === "local" ? "Local CSV" : "Google Sheets"} first 200 chars: ${text.substring(0, 200)}`
        );

        let data = [];

        try {
          if (fetchMode === "csv") {
            // [5.1.6.0.1] Simple CSV parsing
            const lines = text.split("\n");
            const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
              const row = {};

              headers.forEach((header, index) => {
                row[header] = values[index] || "";
              });

              if (row.id || row.tag || row.name) {
                data.push(row);
              }
            }
          } else {
            // [5.1.6.0.2] Parse as JSON
            data = JSON.parse(text);

            // [5.1.6.0.3] Handle common Google Sheets JSON API responses
            if (data.feed && data.feed.entry) {
              // [5.1.6.0.4] Handle Google Sheets API v3 format
              data = data.feed.entry.map((entry) => {
                const row = {};
                // [5.1.6.0.5] Process each field (gs:cell or content entries)
                Object.keys(entry).forEach((key) => {
                  if (key.startsWith("gsx$")) {
                    const fieldName = key.substr(4);
                    row[fieldName] = entry[key].$t;
                  }
                });
                return row;
              });
            } else if (data.values) {
              // [5.1.6.0.6] Handle Google Sheets API v4 format
              const headers = data.values[0];
              data = data.values.slice(1).map((row) => {
                const rowData = {};
                headers.forEach((header, i) => {
                  rowData[header] = row[i];
                });
                return rowData;
              });
            }
          }

          // [5.1.6.0.7] Validate the data structure
          if (!Array.isArray(data)) {
            Logger.warn(
              `${dataSourceType === "local" ? "Local CSV" : "Google Sheets"} data is not an array after parsing, converting to array`
            );
            data = [data]; // Convert to array if not already
          }

          // [5.1.6.0.8] Log diagnostics
          Logger.info(
            `Successfully loaded ${data.length} rows from ${dataSourceType === "local" ? "local CSV file" : "Google Sheets"}`
          );

          // [5.1.6.0.9] Process data with progressive loading support
          let processedData = [];
          if (progressiveOptions.enabled && data.length > 20) {
            // [5.1.6.0.10] Apply progressive loading for larger datasets
            Logger.info("Progressive loading enabled, processing essential fields first");

            // [5.1.6.0.11] Extract just essential fields for initial load
            const essentialFields = progressiveOptions.initialFields || ["id", "tag", "name"];

            // [5.1.6.0.12] Create a lightweight version with just essential fields
            processedData = data.map((row) => {
              const essentialData = {};
              essentialFields.forEach((field) => {
                essentialData[field] = row[field] || "";
              });
              return essentialData;
            });

            // [5.1.6.0.13] Schedule Loading of Full Data for Later
            setTimeout(() => {
              // [5.1.6.0.14] Process Full Data in Background
              const fullData = data.map((row) => ({
                id: row.id || "",
                tag: row.tag || "",
                name: row.name || "",
                description: row.description || "",
                imageUrl: row.imageUrl || row.image || "",
                elementType: row.elementType || row.type || "",
                parentId: row.parentId || "",
              }));

              // [5.1.6.0.15] Replace Data with Full Version
              _googleSheetsData = fullData;

              // [5.1.6.0.16] Update Cache with Full Data if Caching is Enabled (Online Only)
              if (cachingOptions.enabled && dataSourceType === "online") {
                try {
                  const storageKey = cachingOptions.storageKey || "tourGoogleSheetsData";
                  localStorage.setItem(storageKey, JSON.stringify(fullData));
                  localStorage.setItem(`${storageKey}_timestamp`, Date.now().toString());
                  Logger.debug("Updated cache with full Google Sheets data");
                } catch (e) {
                  Logger.warn("Failed to cache full Google Sheets data:", e);
                }
              }

              // [5.1.6.0.17] Log background loading completion
              Logger.info(
                `Background loading of detailed ${dataSourceType === "local" ? "local CSV" : "Google Sheets"} data complete`
              );
            }, 2000); // Delay full data processing to avoid blocking UI
          } else {
            // [5.1.6.0.18] Regular (non-progressive) processing
            processedData = data.map((row) => ({
              id: row.id || "",
              tag: row.tag || "",
              name: row.name || "",
              description: row.description || "",
              imageUrl: row.imageUrl || row.image || "",
              elementType: row.elementType || row.type || "",
              parentId: row.parentId || "",
            }));
          }

          // [5.1.6.0.19] Cache the data if caching is enabled (online only)
          if (cachingOptions.enabled && dataSourceType === "online") {
            try {
              const storageKey = cachingOptions.storageKey || "tourGoogleSheetsData";
              localStorage.setItem(storageKey, JSON.stringify(processedData));
              localStorage.setItem(`${storageKey}_timestamp`, Date.now().toString());
              Logger.debug("Cached Google Sheets data successfully");
            } catch (e) {
              Logger.warn("Failed to cache Google Sheets data:", e);
            }
          } else if (dataSourceType === "local") {
            Logger.debug("Local CSV data not cached (caching disabled for local files)");
          }

          // [5.1.6.0.20] Store in module-level variable for future use
          _googleSheetsData = processedData;

          // [5.1.6.0.21] Output diagnostics about data quality
          const missingIds = processedData.filter((row) => !row.id).length;
          const missingTags = processedData.filter((row) => !row.tag).length;

          if (missingIds > 0 || missingTags > 0) {
            Logger.warn(
              `Data quality issues: ${missingIds} rows missing ID, ${missingTags} rows missing tag`
            );
          }

          return processedData;
        } catch (e) {
          Logger.error(
            `Error parsing ${dataSourceType === "local" ? "local CSV" : "Google Sheets"} data:`,
            e
          );
          _googleSheetsData = [];
          return [];
        }
      })
      .catch((error) => {
        Logger.warn(
          `Error loading ${dataSourceType === "local" ? "local CSV" : "Google Sheets"} data: ${error.message}`
        );
        _googleSheetsData = [];
        return [];
      });
  }

  // [5.2] Method: processGoogleSheetsData()
  function processGoogleSheetsData(fuseData, config) {
    // CRITICAL: Prevent processing if Business Data is also enabled
    if (config.businessData?.useBusinessData) {
      Logger.warn(
        "🚨 CONFLICT PREVENTION: Skipping Google Sheets processing (Business Data is active)"
      );
      Logger.warn("💡 To use Google Sheets, set businessData.useBusinessData = false");
      return; // Exit early to prevent duplicates
    }

    Logger.info(`Processing ${_googleSheetsData.length} Google Sheets entries for search index`);

    // [5.2.1] Enhanced tracking for duplicate prevention
    const matchedSheetIds = new Set();
    const matchedSheetTags = new Set();
    const existingLabels = new Map(); // label -> array of items with that label
    const existingIds = new Set();

    // [5.2.2] Track existing items with better context
    fuseData.forEach((item) => {
      if (item.label) {
        const labelKey = item.label.toLowerCase();
        if (!existingLabels.has(labelKey)) {
          existingLabels.set(labelKey, []);
        }
        existingLabels.get(labelKey).push({
          item: item,
          id: item.id,
          type: item.type,
          source: item.source,
          index: item.index,
        });
      }

      if (item.id) {
        existingIds.add(item.id);
      }

      if (item.sheetsData) {
        if (item.sheetsData.id) {
          matchedSheetIds.add(item.sheetsData.id);
        }
        if (item.sheetsData.tag) {
          matchedSheetTags.add(item.sheetsData.tag);
        }
      }
    });

    // [5.2.3] Log potential duplicate scenarios
    existingLabels.forEach((items, label) => {
      if (items.length > 1) {
        Logger.warn(`[DUPLICATE DETECTION] Found ${items.length} items with label "${label}":`);
        items.forEach(({ item, id, type, source }) => {
          Logger.warn(`  - ${type} (ID: ${id}, Source: ${source})`);
        });
      }
    });

    // [5.2.4] Iterate through Google Sheets entries and match with tour data
    _googleSheetsData.forEach((sheetsEntry, sheetsIndex) => {
      try {
        if (!sheetsEntry.id && !sheetsEntry.tag && !sheetsEntry.name) {
          return;
        }

        const entryId = sheetsEntry.id;
        const entryTag = sheetsEntry.tag;
        const entryName = sheetsEntry.name;

        Logger.debug(
          `[SHEETS PROCESSING] Processing entry: ${entryName} (ID: ${entryId}, Tag: ${entryTag})`
        );

        let alreadyMatched = false;
        let matchedTourItems = []; // Can match multiple items

        // [5.2.4.0.1] Check if entry was already matched
        if (entryId && matchedSheetIds.has(entryId)) {
          alreadyMatched = true;
          Logger.debug(
            `Skipping Google Sheets entry "${entryName}" - ID already matched: ${entryId}`
          );
        }

        if (entryTag && matchedSheetTags.has(entryTag)) {
          alreadyMatched = true;
          Logger.debug(
            `Skipping Google Sheets entry "${entryName}" - tag already matched: ${entryTag}`
          );
        }

        if (alreadyMatched) {
          return;
        }

        // [5.2.4.0.2] Find all potential tour item matches
        fuseData.forEach((item) => {
          if (!item.item) return;

          let isMatch = false;
          let matchReason = "";

          // [5.2.4.0.3] Method 1: Exact ID match (highest confidence)
          if (entryId && item.id && entryId.toString() === item.id.toString()) {
            isMatch = true;
            matchReason = "exact_id";
          }

          // [5.2.4.0.4] Method 2: Tag match (medium confidence)
          else if (entryTag && Array.isArray(item.tags) && item.tags.includes(entryTag)) {
            isMatch = true;
            matchReason = "tag_match";
          }

          // [5.2.4.0.5] Method 3: Label match (lower confidence)
          else if (
            entryName &&
            item.originalLabel &&
            entryName.toLowerCase() === item.originalLabel.toLowerCase()
          ) {
            isMatch = true;
            matchReason = "label_match";
          }

          // [5.2.4.0.6] Method 4: Media ID match
          else if (entryId && item.item && item.item.get) {
            const media = item.item.get("media");
            if (media && media.get) {
              const mediaId = media.get("id");
              if (mediaId === entryId) {
                isMatch = true;
                matchReason = "media_id";
              }
            }
          }

          if (isMatch) {
            matchedTourItems.push({
              item: item,
              reason: matchReason,
              confidence:
                matchReason === "exact_id"
                  ? 3
                  : matchReason === "tag_match"
                    ? 2
                    : matchReason === "media_id"
                      ? 2
                      : 1,
            });
          }
        });

        if (matchedTourItems.length === 0) {
          // [5.2.4.0.7] No matches found: create standalone entry if enabled
          if (!config.googleSheets.includeStandaloneEntries) {
            Logger.debug(
              `Skipping standalone Google Sheets entry "${entryName}" - standalone entries disabled`
            );
            return;
          }

          Logger.debug(`Creating standalone Google Sheets entry: ${entryName}`);
        } else if (matchedTourItems.length === 1) {
          // [5.2.4.0.8] Single match found
          const match = matchedTourItems[0];
          Logger.debug(
            `Single match found for "${entryName}": ${match.item.label} (${match.reason})`
          );

          if (config.googleSheets.useAsDataSource !== true) {
            Logger.debug(
              `Skipping Google Sheets entry "${entryName}" - tour item exists and not using as primary data source`
            );
            return;
          }
        } else {
          // [5.2.4.0.9] Multiple matches found: apply resolution strategy
          Logger.warn(
            `Multiple matches found for Google Sheets entry "${entryName}" (${matchedTourItems.length} matches):`
          );
          matchedTourItems.forEach((match) => {
            Logger.warn(
              `  - ${match.item.label} (${match.item.type}, ${match.reason}, confidence: ${match.confidence})`
            );
          });

          // [5.2.4.0.10] Resolution: Use highest confidence match
          matchedTourItems.sort((a, b) => b.confidence - a.confidence);
          const bestMatch = matchedTourItems[0];

          Logger.warn(
            `Resolved to highest confidence match: ${bestMatch.item.label} (${bestMatch.reason})`
          );

          if (config.googleSheets.useAsDataSource !== true) {
            Logger.debug(
              `Skipping Google Sheets entry "${entryName}" - tour item exists and not using as primary data source`
            );
            return;
          }
        }

        // [5.2.4.0.11] Prepare entry data for the search index
        const rawLabel = sheetsEntry.name || sheetsEntry.id || "";
        const subtitle = sheetsEntry.description || "";
        const elementType = sheetsEntry.elementType || "Element";

        // Compute display label using the same logic as other elements
        const displayLabel = _getDisplayLabel(rawLabel, subtitle, [], {
          type: elementType,
          id: sheetsEntry.id,
          index: -1,
        });

        const elementTags = sheetsEntry.tag ? [sheetsEntry.tag] : [];
        // [5.2.4.0.12] Filter the entry based on inclusion rules (pass display label and subtitle)
        if (!_shouldIncludeElement(elementType, displayLabel, elementTags, subtitle)) {
          Logger.debug(`Filtering out Google Sheets entry ${displayLabel} due to element filter`);
          return;
        }

        // [5.2.4.0.13] Mark as processed
        if (entryId) matchedSheetIds.add(entryId);
        if (entryTag) matchedSheetTags.add(entryTag);

        // [5.2.4.0.14] Determine best matched item for context
        const bestMatchedItem =
          matchedTourItems.length > 0
            ? matchedTourItems.sort((a, b) => b.confidence - a.confidence)[0].item
            : null;

        // [5.2.4.0.15] Create search index entry
        fuseData.push({
          type: elementType,
          source: bestMatchedItem ? bestMatchedItem.source : "sheets",
          label: displayLabel,
          subtitle: description,
          originalLabel: displayLabel,
          tags: elementTags,
          sheetsData: sheetsEntry,
          imageUrl: sheetsEntry.imageUrl || null,
          id: sheetsEntry.id,

          parentIndex: bestMatchedItem ? bestMatchedItem.index : null,
          originalIndex: bestMatchedItem ? bestMatchedItem.originalIndex : null,
          playlistOrder: bestMatchedItem ? bestMatchedItem.playlistOrder : 10000 + sheetsIndex,
          item: bestMatchedItem ? bestMatchedItem.item : null,

          isStandalone: !bestMatchedItem,
          isEnhanced: !!bestMatchedItem,
          matchedItemsCount: matchedTourItems.length, // Track how many items this matched

          boost: config.googleSheets.useAsDataSource
            ? _config.searchSettings.boostValues.sheetsMatch
            : _config.searchSettings.boostValues.labeledItem,
          businessName: null,
          businessData: null,
        });

        Logger.debug(
          `Added Google Sheets entry: ${displayLabel} (matched ${matchedTourItems.length} tour items)`
        );
      } catch (error) {
        Logger.warn(`Error processing Google Sheets entry at index ${sheetsIndex}:`, error);
      }
    });
  }

  // [5.3] Method: _loadBusinessData()
  function _loadBusinessData() {
    if (!_config?.businessData?.useBusinessData) {
      Logger?.info?.("[BusinessData] Disabled — skipping load");
      return Promise.resolve([]);
    }

    // Determine data path
    let dataPath = _config.businessData.businessDataUrl?.trim();
    if (!dataPath) {
      const dir = _config.businessData.businessDataDir || "business-data";
      const file = _config.businessData.businessDataFile || "business.json";
      dataPath = __fromScript(`${dir}/${file}`);
    } else if (!/^https?:\/\//i.test(dataPath)) {
      // Resolve relative URLs using __fromScript
      dataPath = __fromScript(dataPath);
    }

    Logger?.info?.(`[BusinessData] Loading from: ${dataPath}`);

    return fetch(dataPath)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then(data => {
        if (!Array.isArray(data)) data = [data];
        _businessData = data;
        window._businessData = data; // global reference
        Logger?.info?.(`[BusinessData] Loaded ${data.length} entries`);
        return data;
      })
      .catch(err => {
        Logger?.warn?.(`[BusinessData] Load failed: ${err.message}`);
        _businessData = [];
        return [];
      });
  }

  // [6.0] Module: Search Functionality
  // [6.1] Method: _initializeSearch()
  function _initializeSearch(tour) {
    // [6.1.1] Log initialization start
    Logger.info("Initializing enhanced search v2.0...");

    // [6.1.2] Resolve the correct tour instance
    let actualTour = tour;

    // [6.1.3] Attempt to get tour from rootPlayer context
    if (tour && typeof tour.get === "function") {
      try {
        const tourFromContext = tour.get("data")?.tour;
        if (tourFromContext && tourFromContext.mainPlayList) {
          actualTour = tourFromContext;
          Logger.debug("Retrieved tour from rootPlayer context via get('data').tour");
        }
      } catch (e) {
        Logger.debug("Could not extract tour from rootPlayer context, using passed parameter");
      }
    }

    // [6.1.4] Apply fallback detection to find a valid tour instance
    if (!actualTour || !actualTour.mainPlayList) {
      const tourCandidates = [
        tour, // Original parameter
        window.tour,
        window.tourInstance,
        window.tour && window.tour.locManager && window.tour.locManager.rootPlayer
          ? window.tour.locManager.rootPlayer
          : null,
        // [6.1.4.0.1] Try via TDV API if available
        window.TDV &&
        window.TDV.PlayerAPI &&
        typeof window.TDV.PlayerAPI.getCurrentPlayer === "function"
          ? window.TDV.PlayerAPI.getCurrentPlayer()
          : null,
      ].filter(Boolean);

      for (const candidate of tourCandidates) {
        if (
          candidate &&
          candidate.mainPlayList &&
          typeof candidate.mainPlayList.get === "function"
        ) {
          actualTour = candidate;
          Logger.debug("Found valid tour via fallback detection");
          break;
        }
      }
    }
    // [6.1.5] Validate the resolved tour instance
    if (!actualTour || !actualTour.mainPlayList) {
      Logger.warn("Could not find valid tour reference with mainPlayList");
    } else if (typeof actualTour.mainPlayList.get !== "function") {
      Logger.warn("Tour found but mainPlayList.get is not a function");
    } else {
      Logger.info(
        `Tour initialized successfully with ${actualTour.mainPlayList.get("items")?.length || 0} panoramas`
      );
    }
    // [6.1.6] Store the validated tour reference globally
    window.tourInstance = actualTour;

    // [6.1.7] Reset module-level state
    currentSearchTerm = ""; // Reset the module-level variable
    fuse = null;

    // [6.1.8] Prevent re-initialization
    if (_initialized) {
      Logger.info("Search already initialized.");
      return;
    }

    // [6.1.9] Set initialization flags
    _initialized = true;
    window.searchListInitialized = true;

    // [6.1.10] Initialize cross-window communication channel
    _crossWindowChannel.init();

    // [6.1.10.1] Setup live preview message listener for control panel communication
    window.addEventListener("message", function (event) {
      try {
        // Security: allowlist-based origin check (supports cross-origin control panel)
        (function guardOrigin() {
          try {
            const origin = event.origin || "";
            const sameOrigin = origin === window.location.origin || origin === "null"; // 'null' for file://
            const allowed = Array.isArray(_config?.controlPanel?.allowedOrigins)
              ? _config.controlPanel.allowedOrigins
              : [];

            // If an allowlist exists, require membership. Otherwise, accept parent messages (embedded) or same-origin.
            const fromParent = event.source === window.parent && window.parent !== window;
            const allowByList = allowed.length > 0 && allowed.includes(origin);
            const allowByDefault = allowed.length === 0 && (sameOrigin || fromParent);

            if (!(allowByList || allowByDefault)) return;
          } catch (_) {
            // If guard fails, bail safely
            return;
          }
        })();

        const data = event.data;
        if (!data || typeof data !== "object") {
          return;
        }

        // Handle color preview messages from control panel
        if (data.type === "searchProColorPreview") {
          const { cssVariable, value, field } = data;

          if (cssVariable && value) {
            // Apply the color change to the main tour's search interface
            document.documentElement.style.setProperty(cssVariable, value);

            _log(`🎨 LIVE PREVIEW: Applied ${cssVariable} = ${value} from control panel`);

            // Also update any existing search elements directly if needed
            if (cssVariable === "--group-header-bg") {
              const groupHeaders = document.querySelectorAll(".group-header");
              groupHeaders.forEach((header) => {
                header.style.backgroundColor = value;
              });
              _log(`🎨 LIVE PREVIEW: Updated ${groupHeaders.length} group headers`);
            }
          }
        }

        // Handle general config preview messages from control panel
        else if (data.type === "searchProConfigPreview") {
          // Store the preview config for immediate use
          if (data.config) {
            localStorage.setItem("searchProLiveConfig", JSON.stringify(data.config));
            _log(`🔄 LIVE PREVIEW: Updated config preview for field ${data.field}`);
          }
        }

        // NEW: handle full config updates from the control panel (Apply Settings)
        else if (data?.type === "searchProConfigUpdate" && data?.config) {
          try {
            // Keep poller in sync (same-origin scenarios)
            localStorage.setItem("searchProLiveConfig", JSON.stringify(data.config));
            localStorage.setItem("searchProConfigUpdate", String(Date.now()));

            // Apply immediately; updateConfig will rebuild index if data sources changed
            if (window.searchFunctions?.updateConfig) {
              window.searchFunctions.updateConfig(data.config);
              if (typeof Logger?.info === "function") {
                Logger.info("[SearchPro] Applied full config update from control panel.");
              }
            } else {
              console.warn("[SearchPro] updateConfig not available on window.searchFunctions");
            }
          } catch (err) {
            console.warn("[SearchPro] Error handling searchProConfigUpdate:", err);
          }
        }
      } catch (error) {
        Logger.warn("Error handling live preview message:", error);
      }
    });

    // [6.1.11] Sub-function: validateDataSourceConfiguration()
    function validateDataSourceConfiguration() {
      const businessEnabled = _config.businessData?.useBusinessData;
      const googleSheetsEnabled = _config.googleSheets?.useGoogleSheetData;
      const localCSVEnabled = _config.googleSheets?.useLocalCSV;

      let activeDataSources = 0;
      let primaryDataSource = "tour"; // Tour data is always the base

      if (businessEnabled) {
        activeDataSources++;
        primaryDataSource = "business";
      }

      if (googleSheetsEnabled) {
        activeDataSources++;
        primaryDataSource = localCSVEnabled ? "local-csv" : "google-sheets";
      }

      // [6.1.11.1] Check for multiple active data sources
      if (activeDataSources > 1) {
        Logger.warn("⚠️  CONFIGURATION CONFLICT: Multiple data sources enabled!");
        Logger.warn("Active sources:", {
          business: businessEnabled,
          googleSheets: googleSheetsEnabled && !localCSVEnabled,
          localCSV: googleSheetsEnabled && localCSVEnabled,
        });
        Logger.warn("🔧 FIX: Only enable ONE external data source at a time");

        // [6.1.11.1.1] Auto-fix by prioritizing Business Data
        if (businessEnabled) {
          _config.googleSheets.useGoogleSheetData = false;
          Logger.warn("🚨 AUTO-FIX: Disabled Google Sheets to prevent conflicts");
        }
      }

      // [6.1.11.2] Ensure Google Sheets vs. Local CSV exclusivity
      if (googleSheetsEnabled && localCSVEnabled && !_config.googleSheets.googleSheetUrl) {
        Logger.warn("⚠️  LOCAL CSV MODE: Disabling online Google Sheets URL processing");
      }

      Logger.info(`🎯 Data Source Priority: ${primaryDataSource.toUpperCase()} (+ tour data)`);
      return primaryDataSource;
    }

    // [6.1.12] Validate data source configuration
    const primaryDataSource = validateDataSourceConfiguration();

    // [6.1.13] Load external data sources
    const dataPromises = [];

    // [6.1.14] Add business data promise
    if (_config.businessData.useBusinessData) {
      dataPromises.push(_loadBusinessData());
    }

    // [6.1.15] Add Google Sheets data promise
    if (_config.googleSheets.useGoogleSheetData) {
      Logger.debug("[DEBUG] Adding Google Sheets data loading to promise chain");
      dataPromises.push(_loadGoogleSheetsData());
    }

    // [6.1.16] Prepare search index after data loading
    Promise.all(dataPromises)
      .then(() => {
        Logger.info("All external data sources loaded successfully");
        prepareFuse();
      })
      .catch((error) => {
        Logger.warn("Error loading some external data sources:", error);
        // [6.1.16.0.1] Prepare index even if some sources fail
        prepareFuse();
      });

    // [6.1.17] Set up listener for cross-window communication
    _crossWindowChannel.listen(function (message) {
      try {
      } catch (error) {
        Logger.warn("Error handling BroadcastChannel message:", error);
      }
    });

    if (!tour || !tour.mainPlayList) {
      Logger.error("Tour or mainPlayList not available, cannot initialize search");
      return;
    }

    // [6.1.18] Apply ARIA attributes to the main container
    _aria.setRole(_elements.container, "search");
    _aria.setLabel(_elements.container, "Tour search");

    // [6.1.19] Create search UI components
    _createSearchInterface(_elements.container);

    // [6.1.20] Reset state variables (redundant, but safe)
    currentSearchTerm = ""; // Reset the module-level variable
    fuse = null;

    // [6.1.21] Sub-function: _prepareSearchIndex()
    /**
     * Prepares and returns a Fuse.js search index for the tour panoramas and overlays.
     * @param {object} tour - The tour object containing the main playlist.
     * @param {object} config - The search configuration object.
     * @returns {Fuse} The constructed Fuse.js instance for searching.
     */

    function _prepareSearchIndex(tour, config) {
      try {
        Logger.info("Starting hybrid search index preparation...");
        const processed3DModelObjects = new Set();

        let actualTour = tour;

        // [6.1.21.0.1] Detect and retrieve all available playlists
        const playlists = PlaylistUtils.getAllPlayLists(actualTour);
        let mainPlaylistItems = playlists.main?.get("items");
        let rootPlaylistItems = playlists.root?.get("items");

        // [6.1.21.0.2] Validate that at least one playlist was found
        if (!mainPlaylistItems && !rootPlaylistItems) {
          // [6.1.21.0.3] If no playlists, attempt fallback tour detection
          const tourCandidates = [
            window.tour,
            window.tourInstance,
            window.player,
            window.TDV &&
            window.TDV.PlayerAPI &&
            typeof window.TDV.PlayerAPI.getCurrentPlayer === "function"
              ? window.TDV.PlayerAPI.getCurrentPlayer()
              : null,
          ].filter(Boolean);

          for (const candidate of tourCandidates) {
            if (candidate === actualTour) continue; // Skip already checked tour

            const candidatePlaylists = PlaylistUtils.getAllPlayLists(candidate);
            if (candidatePlaylists.main || candidatePlaylists.root) {
              actualTour = candidate;
              mainPlaylistItems = candidatePlaylists.main?.get("items");
              rootPlaylistItems = candidatePlaylists.root?.get("items");
              Logger.info(`Using fallback tour with playlists from candidate`);
              break;
            }
          }
        }

        if (!mainPlaylistItems && !rootPlaylistItems) {
          throw new Error("No valid playlist found with any method");
        }

        Logger.info(
          `Found playlists - Main: ${mainPlaylistItems?.length || 0}, Root: ${rootPlaylistItems?.length || 0}`
        );

        const fuseData = [];
        const filterMode = config.filter.mode;
        const allowedValues = config.filter.allowedValues || [];
        const blacklistedValues = config.filter.blacklistedValues || [];
        const allowedMediaIndexes = config.filter.mediaIndexes?.allowed || [];
        const blacklistedMediaIndexes = config.filter.mediaIndexes?.blacklisted || [];

        // [6.1.21.0.4] Process main playlist items
        if (mainPlaylistItems && mainPlaylistItems.length > 0) {
          Logger.info(`Processing ${mainPlaylistItems.length} main playlist items...`);

          mainPlaylistItems.forEach((item, index) => {
            try {
              const itemClass = item.get ? item.get("class") : item.class;
              const media = item.get ? item.get("media") : item.media;

              // DEBUG: Log every playlist item being processed
              Logger.debug(`[MAIN PLAYLIST DEBUG] Processing index ${index}, class: ${itemClass}`);

              if (!media) {
                Logger.warn(`No media found for main playlist item at index ${index}`);
                return;
              }

              // [6.1.21.0.5] Process individual playlist item
              processPlaylistItem(item, index, media, "main", fuseData, _config, actualTour);
            } catch (error) {
              Logger.warn(`Error processing main playlist item at index ${index}:`, error);
            }
          });
        }

        // [6.1.21.0.6] Process root player playlist items
        if (rootPlaylistItems && rootPlaylistItems.length > 0) {
          Logger.info(`Processing ${rootPlaylistItems.length} root player playlist items...`);

          rootPlaylistItems.forEach((item, index) => {
            try {
              const itemClass = item.get ? item.get("class") : item.class;
              const media = item.get ? item.get("media") : item.media;
              if (!media) {
                Logger.warn(`No media found for root playlist item at index ${index}`);
                return;
              }

              // [6.1.21.0.7] Process individual root playlist item
              const offsetIndex = (mainPlaylistItems?.length || 0) + index;
              processPlaylistItem(item, offsetIndex, media, "root", fuseData, _config, actualTour);
            } catch (error) {
              Logger.warn(`Error processing root playlist item at index ${index}:`, error);
            }
          });
        }

        // [6.1.21.0.8] Process standalone Google Sheets entries
        if (config.googleSheets?.useGoogleSheetData && _googleSheetsData.length > 0) {
          Logger.info(
            `Processing ${_googleSheetsData.length} Google Sheets entries for search index`
          );

          // [6.1.21.0.9] Initialize tracking sets for matched sheets data
          const matchedSheetIds = new Set();
          const matchedSheetTags = new Set();
          const existingLabels = new Set();

          // [6.1.21.0.10] First pass: identify existing entries in the search index
          fuseData.forEach((item) => {
            if (item.label) {
              existingLabels.add(item.label.toLowerCase());
            }

            if (item.sheetsData) {
              if (item.sheetsData.id) {
                matchedSheetIds.add(item.sheetsData.id);
              }
              if (item.sheetsData.tag) {
                matchedSheetTags.add(item.sheetsData.tag);
              }
            }

            if (item.imageUrl && item.imageUrl.includes("unsplash")) {
              if (item.label && item.label.startsWith("** ")) {
                matchedSheetTags.add(item.label.replace("** ", ""));
              }
            }
          });

          _googleSheetsData.forEach((sheetsEntry, sheetsIndex) => {
            try {
              if (!sheetsEntry.id && !sheetsEntry.tag && !sheetsEntry.name) {
                return;
              }

              const entryId = sheetsEntry.id;
              const entryTag = sheetsEntry.tag;
              const entryName = sheetsEntry.name;

              let alreadyMatched = false;
              let matchedTourItem = null;

              // [6.1.21.0.11] Check for matches by ID
              if (entryId && matchedSheetIds.has(entryId)) {
                alreadyMatched = true;
                Logger.debug(
                  `Skipping Google Sheets entry "${entryName}" - ID already matched: ${entryId}`
                );
              }

              // [6.1.21.0.12] Check for matches by tag
              if (entryTag && matchedSheetTags.has(entryTag)) {
                alreadyMatched = true;
                Logger.debug(
                  `Skipping Google Sheets entry "${entryName}" - tag already matched: ${entryTag}`
                );
              }

              // [6.1.21.0.13] Check for matches by label
              if (entryName && existingLabels.has(entryName.toLowerCase())) {
                alreadyMatched = true;
                Logger.debug(
                  `Skipping Google Sheets entry "${entryName}" - label already exists in search index`
                );
              }

              // [6.1.21.0.14] Find matching tour item for navigation context
              if (!alreadyMatched && entryTag) {
                const tourItemMatch = fuseData.find((item) => {
                  if (!item.item) return false;

                  if (Array.isArray(item.tags) && item.tags.includes(entryTag)) {
                    return true;
                  }

                  if (item.id && item.id === entryTag) {
                    return true;
                  }

                  if (
                    item.originalLabel &&
                    item.originalLabel.toLowerCase().includes(entryTag.toLowerCase())
                  ) {
                    return true;
                  }

                  if (item.item && item.item.get) {
                    const media = item.item.get("media");
                    if (media && media.get) {
                      const mediaId = media.get("id");
                      if (mediaId === entryTag) {
                        return true;
                      }
                    }
                  }

                  return false;
                });

                if (tourItemMatch) {
                  matchedTourItem = tourItemMatch;
                  Logger.debug(
                    `Found tour item match for Google Sheets entry "${entryName}": enhancing existing item`
                  );

                  if (config.googleSheets.useAsDataSource !== true) {
                    Logger.debug(
                      `Skipping standalone Google Sheets entry "${entryName}" - tour item exists and not using as primary data source`
                    );
                    return;
                  }

                  Logger.debug(
                    `Creating enhanced Google Sheets entry "${entryName}" linked to tour item`
                  );
                }
              }

              if (!matchedTourItem && !config.googleSheets.includeStandaloneEntries) {
                Logger.debug(
                  `Skipping standalone Google Sheets entry "${entryName}" - standalone entries disabled`
                );
                return;
              }

              if (alreadyMatched) {
                return;
              }

              const rawLabel = sheetsEntry.name || sheetsEntry.id || "";
              const subtitle = sheetsEntry.description || "";
              const elementType = sheetsEntry.elementType || "Element";

              // Compute display label using the same logic as other elements
              const displayLabel = _getDisplayLabel(rawLabel, subtitle, [], {
                type: elementType,
                id: sheetsEntry.id,
                index: -1,
              });

              const elementTags = sheetsEntry.tag ? [sheetsEntry.tag] : [];
              if (!_shouldIncludeElement(elementType, displayLabel, elementTags, subtitle)) {
                Logger.debug(
                  `Filtering out Google Sheets entry ${displayLabel} due to element filter`
                );
                return;
              }

              existingLabels.add(displayLabel.toLowerCase());

              // [6.1.21.0.15] Create search index entry
              fuseData.push({
                type: elementType,
                source: matchedTourItem ? matchedTourItem.source : "sheets",
                label: displayLabel,
                subtitle: description,
                originalLabel: displayLabel,
                tags: elementTags,
                sheetsData: sheetsEntry,
                imageUrl: sheetsEntry.imageUrl || null,
                id: sheetsEntry.id,

                parentIndex: matchedTourItem ? matchedTourItem.index : null,
                originalIndex: matchedTourItem ? matchedTourItem.originalIndex : null,
                playlistOrder: matchedTourItem
                  ? matchedTourItem.playlistOrder
                  : 10000 + sheetsIndex,
                item: matchedTourItem ? matchedTourItem.item : null,

                isStandalone: !matchedTourItem,
                isEnhanced: !!matchedTourItem,

                boost: config.googleSheets.useAsDataSource
                  ? _config.searchSettings.boostValues.sheetsMatch
                  : _config.searchSettings.boostValues.labeledItem,
                businessName: null,
                businessData: null,
              });

              Logger.debug(
                `Added ${matchedTourItem ? "linked" : "standalone"} Google Sheets entry: ${displayLabel}`
              );
            } catch (error) {
              Logger.warn(`Error processing Google Sheets entry at index ${sheetsIndex}:`, error);
            }
          });
        }

        // [6.2.7] Process container search entries if enabled - BEFORE Fuse creation
        if (
          _config.includeContent?.containerSearch?.enableContainerSearch &&
          Array.isArray(_config.includeContent?.containerSearch?.containerNames) &&
          _config.includeContent.containerSearch.containerNames.length > 0
        ) {
          Logger.info(
            `Processing ${_config.includeContent.containerSearch.containerNames.length} container search entries`
          );

          _config.includeContent.containerSearch.containerNames.forEach(
            (containerName, containerIndex) => {
              try {
                if (!containerName || typeof containerName !== "string") {
                  return;
                }

                const displayLabel = containerName;
                const elementType = "Container";
                const elementTags = [];

                // Filter container based on inclusion rules (3 parameters)
                if (!_shouldIncludeElement(elementType, displayLabel, elementTags)) {
                  Logger.debug(`Filtering out container ${displayLabel} due to element filter`);
                  return;
                }

                // Create search index entry for container
                fuseData.push({
                  type: elementType,
                  source: "container",
                  label: displayLabel,
                  subtitle: "Click to toggle container",
                  originalLabel: displayLabel,
                  tags: elementTags,
                  containerName: containerName,
                  id: `container_${containerName}`,
                  playlistOrder: 20000 + containerIndex,
                  isContainer: true,
                  boost: _config.searchSettings.boostValues.childElement,
                  businessName: null,
                  businessData: null,
                  sheetsData: null,
                  imageUrl: null,
                });

                Logger.debug(`Added container to search index: ${displayLabel}`);
              } catch (error) {
                Logger.warn(`Error processing container entry "${containerName}":`, error);
              }
            }
          );
        }

        // [6.1.21.0.15.1] Merge Business Data if available
        if (_config.businessData?.useBusinessData && Array.isArray(_businessData) && _businessData.length) {
          Logger.info(`[Fuse Index] Adding ${_businessData.length} business data entries`);
          const businessEntries = _businessData.map((entry) => ({
            id: entry.id || `biz-${Math.random().toString(36).slice(2)}`,
            label: entry.name || entry.label || "Unnamed Business",
            subtitle: entry.description || "",
            type: "Business",
            elementType: "Business",
            businessName: entry.name || "",
            businessTag: Array.isArray(entry.tags) ? entry.tags.join(" ") : (entry.tag || ""),
            tags: entry.matchTags || [],
            businessData: entry,
            source: "businessData",
            imageUrl: entry.imageUrl || entry.localImage || null,
            playlistOrder: 30000 + _businessData.indexOf(entry),
            boost: _config.searchSettings.boostValues.labeledItem,
          }));
          fuseData.push(...businessEntries);
          Logger.info(`[Fuse Index] Business data merged successfully - ${businessEntries.length} entries added`);
        }

        // [6.1.21.0.16] Create and return Fuse.js instance
        const fuseInstance = new Fuse(fuseData, {
          keys: [
            {
              name: "label",
              weight: _config.searchSettings.fieldWeights.label,
            },
            {
              name: "subtitle",
              weight: _config.searchSettings.fieldWeights.subtitle,
            },
            { name: "tags", weight: _config.searchSettings.fieldWeights.tags },
            {
              name: "parentLabel",
              weight: _config.searchSettings.fieldWeights.parentLabel,
            },
            {
              name: "businessTag",
              weight: _config.searchSettings.fieldWeights.businessTag,
            },
            {
              name: "businessName",
              weight: _config.searchSettings.fieldWeights.businessName,
            },
            {
              name: "containerName",
              weight: _config.searchSettings.fieldWeights.label, // Same weight as label
            },
            {
              name: "originalLabel",
              weight: _config.searchSettings.fieldWeights.label, // Same weight as label
            },
          ],
          includeScore: _config.searchSettings.behavior.includeScore,
          threshold: _config.searchSettings.behavior.threshold,
          distance: _config.searchSettings.behavior.distance,
          minMatchCharLength: _config.searchSettings.behavior.minMatchCharLength,
          useExtendedSearch: _config.searchSettings.behavior.useExtendedSearch,
          ignoreLocation: _config.searchSettings.behavior.ignoreLocation,
          location: _config.searchSettings.behavior.location,
        });

        Logger.info(`Hybrid search index created with ${fuseData.length} total items`);

        Logger.info(`Hybrid search index created with ${fuseData.length} total items`);
        Logger.info(`Main playlist contributed: ${mainPlaylistItems?.length || 0} items`);
        Logger.info(`Root playlist contributed: ${rootPlaylistItems?.length || 0} items`);

        return fuseInstance;
      } catch (error) {
        Logger.error("Error preparing hybrid search index:", error);
        return new Fuse([], { keys: ["label"], includeScore: true });
      }
    }

    // Find the processPlaylistItem function and replace it entirely:

    // [6.1.22] Sub-function: processPlaylistItem()
    function processPlaylistItem(item, index, media, source, fuseData, config, tour) {
      const itemClass = item.get ? item.get("class") : item.class;

      Logger.debug(`[PLAYLIST DEBUG] Processing item ${index}, class:`, itemClass);

      // [6.1.22.1] Route to the correct processor based on item class
      if (itemClass === "Model3DPlayListItem") {
        Logger.debug(`[PLAYLIST DEBUG] Found 3D Model at index ${index}`);
        process3DModel(item, index, media, source, fuseData, config, tour);
      } else {
        // [6.1.22.1.1] Always process panorama to get overlays, filter panorama itself inside processPanorama
        processPanorama(item, index, media, source, fuseData, config, tour);
      }
    }

    // [6.1.23] Sub-function: process3DModel()
    function process3DModel(item, index, media, source, fuseData, config, tour) {
      Logger.debug(`[3D DEBUG] Processing 3D model at index ${index}`);
      Logger.debug(`[3D MODEL DEBUG] Starting 3D model processing for index ${index}`, media);
      Logger.debug(`[CACHE BUSTER] 3D MODEL PROCESSING - TIMESTAMP: ${Date.now()}`);

      const data = _safeGetData(media);
      const label = data?.label?.trim() || "";
      const subtitle = data?.subtitle?.trim() || "";
      const tags = Array.isArray(data?.tags) ? data.tags : [];

      // [6.1.23.1] Filter 3D model based on configuration (media index only - allow object processing)
      if (!_shouldIncludePanorama(index, _config.filter.mediaIndexes)) {
        Logger.debug(`[3D DEBUG] 3D model filtered out at index ${index}`);
        return;
      }

      const displayLabel = _getDisplayLabel(label, subtitle, tags, {
        type: "Panorama",
        id: media.get ? media.get("id") : media.id,
        index: index,
        source: source,
      });

      // Get business and sheets matches
      const businessMatch = getBusinessMatch(label, media, tags, config);
      const sheetsMatch = getSheetsMatch(label, media, tags, config);

      // [6.1.23.2] Add 3D model to search index only if it passes filtering
      if (_shouldIncludeElement("3DModel", displayLabel, tags, subtitle)) {
        fuseData.push({
          type: "3DModel",
          source: source,
          index,
          originalIndex: index,
          playlistOrder: index,
          label: getResultLabel(displayLabel, businessMatch, sheetsMatch, config),
          originalLabel: label,
          subtitle: getResultDescription(subtitle, businessMatch, sheetsMatch, config),
          tags,
          businessData: businessMatch,
          businessName: businessMatch?.name,
          sheetsData: sheetsMatch,
          imageUrl: businessMatch?.imageUrl || sheetsMatch?.imageUrl || null,
          item,
          boost: businessMatch
            ? _config.searchSettings.boostValues.businessMatch
            : sheetsMatch
              ? _config.searchSettings.boostValues.sheetsMatch
              : label
                ? _config.searchSettings.boostValues.labeledItem
                : _config.searchSettings.boostValues.unlabeledItem,
        });

        Logger.debug(`[3D DEBUG] Added 3D model to index: ${displayLabel}`);
      } else {
        Logger.debug(
          `[3D MODEL FILTERED] "${displayLabel}" was filtered out by _shouldIncludeElement`
        );
      }

      // [6.1.23.3] Process objects within the 3D model
      let objects = media.get ? media.get("objects") : media.objects;
      Logger.debug(`[3D OBJECTS DEBUG] Media object structure:`, media);
      Logger.debug(`[3D OBJECTS DEBUG] Media has get method:`, typeof media.get === "function");
      Logger.debug(
        `[3D OBJECTS DEBUG] Raw objects via get():`,
        media.get ? media.get("objects") : "no get method"
      );
      Logger.debug(`[3D OBJECTS DEBUG] Raw objects via direct access:`, media.objects);
      Logger.debug(`[3D OBJECTS DEBUG] Media keys:`, Object.keys(media));
      if (media.get && typeof media.get === "function") {
        Logger.debug(`[3D OBJECTS DEBUG] Trying get('wr'):`, media.get("wr"));
        Logger.debug(`[3D OBJECTS DEBUG] Trying get('Qc'):`, media.get("Qc"));
        Logger.debug(`[3D OBJECTS DEBUG] Trying get('data'):`, media.get("data"));
      }

      // Try alternative access methods for 3D objects
      if (!objects || !Array.isArray(objects)) {
        Logger.debug(`[3D OBJECTS DEBUG] Trying alternative access methods...`);

        // Check if tour has a method to get 3D objects
        if (tour && tour.get) {
          try {
            const mediaId = media.get ? media.get("id") : media.id;
            Logger.debug(`[3D OBJECTS DEBUG] Media ID:`, mediaId);
            if (mediaId) {
              const mediaObj = tour.get(mediaId);
              Logger.debug(`[3D OBJECTS DEBUG] Media object from tour:`, mediaObj);
              if (mediaObj && mediaObj.get) {
                objects = mediaObj.get("objects");
                Logger.debug(`[3D OBJECTS DEBUG] Objects from tour media:`, objects);
              }
            }
          } catch (e) {
            Logger.debug(`[3D OBJECTS DEBUG] Error accessing tour objects:`, e);
          }
        }
      }

      Logger.debug(`[3D OBJECTS DEBUG] Final objects variable:`, objects);
      Logger.debug(`[3D OBJECTS DEBUG] Objects is array:`, Array.isArray(objects));
      Logger.debug(
        `[3D OBJECTS DEBUG] Objects length:`,
        objects ? objects.length : "objects is null/undefined"
      );
      Logger.debug(`[3D DEBUG] Found objects:`, objects);
      Logger.debug(`[3D DEBUG] Objects is array:`, Array.isArray(objects));

      if (Array.isArray(objects)) {
        Logger.debug(`[3D DEBUG] Processing ${objects.length} objects`);

        objects.forEach((obj, objIdx) => {
          Logger.debug(`[3D DEBUG] Processing object ${objIdx}:`, obj);

          const objData = _safeGetData(obj);

          // [6.1.23.3.1] Get object label with fallbacks
          let objLabel = objData?.label?.trim() || "";
          if (!objLabel && obj.get) {
            try {
              objLabel = obj.get("label") || "";
            } catch (e) {
              Logger.debug(`[3D DEBUG] Error getting label via get():`, e);
            }
          }
          if (!objLabel) {
            objLabel = obj.label || "";
          }

          Logger.debug(`[3D DEBUG] Object label:`, objLabel);

          // [6.1.23.3.2] Skip object if it has no valid label
          if (!objLabel || objLabel === "Object") {
            Logger.debug(`[3D DEBUG] Skipping object with invalid label:`, objLabel);
            return;
          }

          const objTags = Array.isArray(objData?.tags) ? objData.tags : [];
          const objSubtitle = objData?.subtitle || "";

          // [6.1.23.3.3] Determine the object's element type
          let objClass = "";
          if (obj.class) {
            objClass = obj.class;
          } else if (obj.get && typeof obj.get === "function") {
            try {
              objClass = obj.get("class") || "";
            } catch (e) {
              Logger.debug("[3D DEBUG] Error getting class via get():", e);
            }
          }

          // Determine the correct element type based on class
          let elementType = "3DModelObject"; // default
          if (objClass) {
            // Check if it's a sprite type
            if (
              objClass === "SpriteModel3DObject" ||
              objClass === "SpriteHotspotObject" ||
              objClass === "Sprite3DObject"
            ) {
              elementType = "3DHotspot";
              Logger.debug(`[3D DEBUG] Detected sprite object as 3DHotspot: ${objLabel}`);
            } else if (objClass === "InnerModel3DObject" || objClass === "Model3DObject") {
              elementType = "3DModelObject";
            } else {
              // Use the general element type detection for unknown classes
              elementType = _getElementType(obj, objLabel);
            }
          }

          // Compute display label first
          const displayLabel = _getDisplayLabel(objLabel, objSubtitle, objTags, {
            type: elementType,
            id: obj.get ? obj.get("id") : obj.id,
            index: objIdx,
          });

          // DEBUG: Log 3D object processing
          Logger.debug(`[3D OBJECT DEBUG] Processing 3D object:`, {
            objLabel,
            displayLabel,
            elementType,
            objClass,
            objSubtitle,
            objTags,
          });

          // [6.1.23.3.4] Filter object based on configuration (pass display label and subtitle)
          if (!_shouldIncludeElement(elementType, displayLabel, objTags, objSubtitle)) {
            Logger.debug(`[3D DEBUG] Object filtered out:`, displayLabel);
            Logger.debug(
              `[3D OBJECT FILTERED] "${displayLabel}" was filtered out by _shouldIncludeElement`
            );
            return;
          }

          const objId = obj.get ? obj.get("id") : obj.id;

          // [6.1.23.3.5] Add 3D model object to search index
          Logger.debug(
            `[3D DEBUG] Adding object to search index with type ${elementType}:`,
            displayLabel
          );

          fuseData.push({
            type: elementType,
            source: source,
            label: displayLabel,
            originalLabel: objLabel,
            subtitle: objSubtitle,
            tags: objTags,
            parentModel: media.get ? media.get("id") : media.id,
            parentLabel: getResultLabel(displayLabel, businessMatch, sheetsMatch, config),
            parentIndex: index,
            playlistOrder: index * 1000 + objIdx,
            id: objId,
            item: obj,
            parentItem: item,
            boost: _config.searchSettings.boostValues.childElement,
          });
        });
      } else {
        Logger.debug(`[3D DEBUG] No objects array found`);
      }
    }

    // [6.1.24] Sub-function: processPanorama()
    function processPanorama(item, index, media, source, fuseData, config, tour) {
      const data = _safeGetData(media);
      const label = data?.label?.trim() || "";
      const subtitle = data?.subtitle?.trim() || "";
      const tags = Array.isArray(data?.tags) ? data.tags : [];

      Logger.debug(`[PANORAMA DEBUG] Processing panorama ${index}:`, {
        label,
        subtitle,
        tags,
        mediaId: media.get ? media.get("id") : "unknown",
      });

      // [6.1.24.1] Media Index Filtering - BYPASS: Do not gate panorama processing based on mediaIndexes configuration
      // Keep debug logging intact for visibility but bypass actual filtering
      // [6.1.24.2] Filter panorama based on configuration using standardized _shouldIncludePanorama
      if (!_shouldIncludePanorama(index, _config.filter.mediaIndexes)) {
        return;
      }

      let displayLabel = _getDisplayLabel(label, subtitle, tags, {
        type: "Panorama",
        id: media.get ? media.get("id") : media.id,
        index: index,
        source: source,
      });

      // [6.1.24.3] Match with business and sheets data
      const businessMatch = getBusinessMatch(label, media, tags, config);
      const sheetsMatch = getSheetsMatch(label, media, tags, config);

      // [6.1.24.4] Determine display label
      if (businessMatch && config.businessData.replaceTourData) {
        displayLabel = businessMatch.name || label || `Panorama ${index + 1}`;
      } else if (sheetsMatch && config.googleSheets.useAsDataSource) {
        displayLabel = sheetsMatch.name || label || `Panorama ${index + 1}`;
      }
      // displayLabel is already set from _getDisplayLabel above

      // [6.1.24.5] Extract thumbnail URL

      let thumbnailUrl = null;
      try {
        if (media && media.get) {
          thumbnailUrl = media.get("thumbnail") || media.get("firstFrame") || media.get("preview");
          Logger.debug(`[THUMBNAIL] Extracted URL from panorama: ${thumbnailUrl}`);
        }
      } catch (e) {
        Logger.debug("Error extracting panorama thumbnail:", e);
      }

      // [6.1.24.6] Add panorama to search index only if includePanoramas is true AND passes filtering
      if (config.includeContent?.elements?.includePanoramas !== false) {
        // Apply the same filtering logic used for overlays
        if (_shouldIncludeElement("Panorama", displayLabel, tags, subtitle)) {
          fuseData.push({
            type: "Panorama",
            source: source,
            index,
            originalIndex: index,
            playlistOrder: index,
            label: displayLabel,
            originalLabel: label,
            subtitle: getResultDescription(subtitle, businessMatch, sheetsMatch, config),
            tags,
            businessData: businessMatch,
            businessName: businessMatch?.name,
            sheetsData: sheetsMatch,
            imageUrl: businessMatch?.imageUrl || sheetsMatch?.imageUrl || null,
            thumbnailUrl: thumbnailUrl,
            item,
            media: media,
            boost: businessMatch
              ? _config.searchSettings.boostValues.businessMatch
              : sheetsMatch
                ? _config.searchSettings.boostValues.sheetsMatch
                : label
                  ? _config.searchSettings.boostValues.labeledItem
                  : _config.searchSettings.boostValues.unlabeledItem,
          });
        } else {
          Logger.debug(
            `[PANORAMA FILTERED] "${displayLabel}" was filtered out by _shouldIncludeElement`
          );
        }
      }

      // [6.1.24.7] Process panorama overlays
      const overlays = _getOverlays(media, tour, item);
      _processOverlaysWithSource(overlays, fuseData, index, displayLabel, source, config);
    }

    // [6.1.25] Sub-function: _processOverlaysWithSource()
    function _processOverlaysWithSource(
      overlays,
      fuseData,
      parentIndex,
      parentLabel,
      source,
      config
    ) {
      if (!Array.isArray(overlays) || overlays.length === 0) {
        return;
      }

      overlays.forEach((overlay, overlayIndex) => {
        try {
          const overlayData = _safeGetData(overlay);

          // [6.1.25.0.1] Get overlay label with fallbacks
          let overlayLabel = "";
          if (overlayData.label) {
            overlayLabel = overlayData.label.trim();
          } else if (overlay.label) {
            overlayLabel = overlay.label.trim();
          } else if (typeof overlay.get === "function") {
            try {
              const label = overlay.get("label");
              if (label) overlayLabel = label.trim();
            } catch {
              // [6.1.25.0.2] Silently fail if label retrieval fails
            }
          }

          // [6.1.25.0.3] Skip if label is empty and configured to do so
          if (!overlayLabel && config.includeContent.elements.skipEmptyLabels) return;

          // [6.1.25.0.4] Filter overlay based on type and configuration
          let elementType = _getElementType(overlay, overlayLabel);
          const elementTags = Array.isArray(overlayData.tags) ? overlayData.tags : [];
          const overlaySubtitle = overlayData?.subtitle || "";

          // Compute display label first, then filter with both label and subtitle
          let displayLabel = _getDisplayLabel(overlayLabel, overlaySubtitle, elementTags, {
            type: elementType,
            id: overlay.id || (overlay.get ? overlay.get("id") : null),
            index: overlayIndex,
          });

          // DEBUG: Log overlay processing
          Logger.debug(`[OVERLAY DEBUG] Processing overlay:`, {
            overlayLabel,
            displayLabel,
            elementType,
            overlayClass: overlay.class,
            overlaySubtitle,
            elementTags,
          });

          if (!_shouldIncludeElement(elementType, displayLabel, elementTags, overlaySubtitle)) {
            Logger.debug(
              `[OVERLAY FILTERED] "${displayLabel}" was filtered out by _shouldIncludeElement`
            );
            return;
          }

          // [6.1.25.0.5] Get overlay ID
          let elementId = null;
          if (overlay.id) {
            elementId = overlay.id;
          } else if (typeof overlay.get === "function") {
            try {
              elementId = overlay.get("id");
            } catch {
              // Silent failure
            }
          }

          // [6.1.25.0.6] Match with business data
          let businessMatch = null;
          if (config.businessData?.useBusinessData && _businessData.length > 0) {
            try {
              businessMatch = findBusinessMatch({
                name: overlayLabel,
                id: elementId,
                subtitle: overlaySubtitle, // Include subtitle for matching
                tags: elementTags,
                type: elementType,
              });
            } catch (error) {
              Logger.warn(`Error matching business data for overlay ${overlayLabel}:`, error);
            }
          }

          // [6.1.25.0.7] Match with sheets data
          const sheetsMatch = getSheetsMatch(overlayLabel, overlay, elementTags, config, {
            type: elementType,
            source: source,
            index: overlayIndex,
          });

          // [6.1.25.0.8] Determine final display label
          if (businessMatch && config.businessData.replaceTourData) {
            displayLabel =
              businessMatch.name || overlayLabel || `${elementType} ${parentIndex}.${overlayIndex}`;
          } else if (sheetsMatch && config.googleSheets.useAsDataSource) {
            displayLabel =
              sheetsMatch.name || overlayLabel || `${elementType} ${parentIndex}.${overlayIndex}`;
          }
          // displayLabel is already set from _getDisplayLabel above

          // [6.1.25.0.9] Extract camera information from overlay
          const cam = _getOverlayCamera(overlay);

          // [6.1.25.0.10] Add overlay to search index
          const resultItem = {
            type: elementType,
            source: source,
            label: displayLabel, // Use the properly calculated label
            subtitle:
              businessMatch && config.businessData.replaceTourData
                ? businessMatch.description || ""
                : sheetsMatch && config.googleSheets.useAsDataSource
                  ? sheetsMatch.description || overlaySubtitle || ""
                  : overlaySubtitle || "",
            tags: elementTags,
            parentIndex: parentIndex,
            parentLabel: parentLabel,
            playlistOrder: parentIndex * 1000 + overlayIndex,
            id: elementId,
            businessData: businessMatch,
            businessName: businessMatch?.name,
            sheetsData: sheetsMatch,
            imageUrl: businessMatch?.imageUrl || sheetsMatch?.imageUrl || null,
            localImage: businessMatch?.localImage || null,
            boost: businessMatch
              ? _config.searchSettings.boostValues.businessMatch
              : sheetsMatch
                ? _config.searchSettings.boostValues.sheetsMatch
                : overlayLabel
                  ? _config.searchSettings.boostValues.labeledItem
                  : _config.searchSettings.boostValues.unlabeledItem,
            mediaIndex: parentIndex, // Save parent media index
          };

          // Add camera info if available (only if yaw/pitch exist)
          if (cam && cam.yaw !== null && cam.pitch !== null) {
            resultItem.camera = cam;
          }

          // [6.1.25.0.11] Add modelSpot for 3DModelObject elements
          if (elementType === "3DModelObject") {
            const overlayData = _safeGetData(overlay);
            resultItem.modelSpot = {
              x:
                overlay.x ??
                overlay.translationX ??
                overlay.tx ??
                overlayData?.x ??
                overlayData?.translationX ??
                overlayData?.tx ??
                null,
              y:
                overlay.y ??
                overlay.translationY ??
                overlay.ty ??
                overlayData?.y ??
                overlayData?.translationY ??
                overlayData?.ty ??
                null,
              z:
                overlay.z ??
                overlay.translationZ ??
                overlay.tz ??
                overlayData?.z ??
                overlayData?.translationZ ??
                overlayData?.tz ??
                null,
            };
            Logger.debug(`Added modelSpot for 3DModelObject ${elementId}:`, resultItem.modelSpot);
          }

          fuseData.push(resultItem);
        } catch (overlayError) {
          Logger.warn(`Error processing overlay at index ${overlayIndex}:`, overlayError);
        }
      });
    }

    // [6.1.26] Sub-function: createHybridClickHandler()
    function createHybridClickHandler(result, tour) {
      return function (e) {
        // Event handling
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();

        try {
          // [6.1.26.0.1] Handle Container type specially
          if (result.item.type === "Container") {
            if (result.item.isContainer && result.item.containerName) {
              try {
                if (window.tourMenu && typeof window.tourMenu.toggleContainer === "function") {
                  window.tourMenu.toggleContainer(result.item.containerName, false);
                  Logger.info(`Toggled container: ${result.item.containerName}`);
                } else {
                  Logger.warn("tourMenu not available for container toggle");
                  // Fallback: Try direct container manipulation
                  if (window.tour && window.tour.player) {
                    const containers = window.tour.player.getByClassName("Container");
                    const container = containers.find((c) => {
                      const data = c.get("data");
                      return data && data.name === result.item.containerName;
                    });

                    if (container) {
                      const isVisible = container.get("visible");
                      container.set("visible", !isVisible);
                      Logger.info(
                        `Direct toggle container "${result.item.containerName}" to: ${!isVisible}`
                      );
                    } else {
                      Logger.warn(`Container "${result.item.containerName}" not found`);
                    }
                  }
                }
              } catch (e) {
                Logger.error(`Error toggling container: ${e.message}`);
              }
            }

            // [6.1.26.0.1.1] Auto-hide after container action
            if (_shouldAutoHide()) {
              setTimeout(() => _toggleSearch(false), 150);
            }
            return; // Exit early for containers
          }

          // [6.1.26.0.2] Compute targetPlaylist once based on result.item.source
          let targetPlaylist;
          if (
            result.item.source === "root" ||
            result.item.type === "3DModel" ||
            result.item.type === "3DModelObject" ||
            result.item.type === "3DHotspot"
          ) {
            // Use root playlist for 3D content when available
            const playlists = PlaylistUtils.getAllPlayLists(tour);
            targetPlaylist = playlists.root || playlists.main || tour?.mainPlayList;
          } else {
            // Prefer main playlist
            const playlists = PlaylistUtils.getAllPlayLists(tour);
            targetPlaylist = playlists.main || tour?.mainPlayList;
          }

          if (!targetPlaylist) {
            Logger.error("[NAV] No target playlist available");
            return;
          }

          // [6.1.26.0.3] Panorama/3DModel branch
          if (result.item.type === "Panorama" || result.item.type === "3DModel") {
            const idx =
              typeof result.item.originalIndex === "number"
                ? result.item.originalIndex
                : typeof result.item.index === "number"
                  ? result.item.index
                  : undefined;

            if (typeof idx === "number") {
              targetPlaylist.set("selectedIndex", idx);
              Logger.info("[NAV] media", { type: result.item.type, idx, label: result.item.label });

              // [6.1.26.0.3.1] Auto-hide after panorama/3D model navigation
              if (_shouldAutoHide()) {
                setTimeout(() => _toggleSearch(false), 150);
              }
              return;
            }
          }

          // [6.1.26.0.4] 3DModelObject and 3DHotspot branch
          if (result.item.type === "3DModelObject" || result.item.type === "3DHotspot") {
            // Always navigate to the parent 3D model first
            if (result.item.parentIndex !== undefined) {
              try {
                targetPlaylist.set("selectedIndex", result.item.parentIndex);
                Logger.info(
                  `[3D NAV] Parent model index ${result.item.parentIndex} selected for ${result.item.type} "${result.item.label}"`
                );
              } catch (e) {
                Logger.error(`[3D NAV] Could not select parent index: ${e.message}`);
              }
            }

            // NEW: Robust begin+trigger implementation
            const fire = () => {
              const rawLabel = result.item.originalLabel || result.item.label || "";
              const parentModelId = result.item.parentModel;

              // Get the parent model item to attach begin handler
              const items = targetPlaylist.get && targetPlaylist.get("items");
              const parentItem = items && items[result.item.parentIndex];

              if (parentItem && typeof parentItem.bind === "function") {
                // Setup robust begin handler
                const beginHandler = () => {
                  Logger.info("[3D BEGIN] Model begin triggered, attempting element trigger");

                  const tryByLabelFallback = () => {
                    const sprite = _find3DSpriteByLabel(tour, { label: rawLabel, parentModelId });
                    if (sprite) {
                      const sid = (sprite.get && sprite.get("id")) || sprite.id;
                      if (sid) {
                        Logger.info(`[3D TRIGGER] Fallback by label -> id ${sid}`);
                        _triggerElement(
                          tour,
                          sid,
                          (ok) => {
                            if (!ok)
                              Logger.warn(`[3D TRIGGER] Fallback trigger failed for id ${sid}`);
                          },
                          {
                            maxRetries: 20,
                            initialDelay: 0,
                            baseRetryInterval: 250,
                            maxRetryInterval: 1200,
                          }
                        );
                      } else if (typeof sprite.trigger === "function") {
                        Logger.info("[3D TRIGGER] Direct sprite.trigger('click') fallback");
                        try {
                          sprite.trigger("click");
                        } catch (e) {
                          Logger.warn("Direct trigger failed:", e);
                        }
                      } else {
                        Logger.warn(
                          `[3D TRIGGER] Sprite found but no triggerable interface for "${rawLabel}"`
                        );
                      }
                    } else {
                      Logger.warn(
                        `[3D TRIGGER] No sprite found for "${rawLabel}" under model ${parentModelId || "(unknown)"}`
                      );
                    }
                  };

                  if (result.item.id) {
                    Logger.info(`[3D TRIGGER] Trying by id: ${result.item.id}`);
                    _triggerElement(
                      tour,
                      result.item.id,
                      (success) => {
                        if (!success) {
                          Logger.warn(
                            `[3D TRIGGER] id ${result.item.id} not found; trying label fallback "${rawLabel}"`
                          );
                          tryByLabelFallback();
                        }
                      },
                      {
                        maxRetries: 20,
                        initialDelay: 0,
                        baseRetryInterval: 250,
                        maxRetryInterval: 1200,
                      }
                    );
                  } else {
                    Logger.info(`[3D TRIGGER] No id on result; using label fallback "${rawLabel}"`);
                    tryByLabelFallback();
                  }

                  // Cleanup: unbind this handler after execution
                  try {
                    parentItem.unbind && parentItem.unbind("begin", beginHandler);
                  } catch (e) {
                    Logger.debug("Failed to unbind begin handler:", e);
                  }
                };

                // Bind the begin handler
                parentItem.bind("begin", beginHandler);
                Logger.info("[3D SETUP] Begin handler bound, ready for model activation");
              } else {
                // Fallback: immediate trigger without begin handler
                Logger.warn(
                  "[3D FALLBACK] No parent item bind capability, using immediate trigger"
                );

                const tryByLabelFallback = () => {
                  const sprite = _find3DSpriteByLabel(tour, { label: rawLabel, parentModelId });
                  if (sprite) {
                    const sid = (sprite.get && sprite.get("id")) || sprite.id;
                    if (sid) {
                      Logger.info(`[3D TRIGGER] Fallback by label -> id ${sid}`);
                      _triggerElement(
                        tour,
                        sid,
                        (ok) => {
                          if (!ok)
                            Logger.warn(`[3D TRIGGER] Fallback trigger failed for id ${sid}`);
                        },
                        {
                          maxRetries: 20,
                          initialDelay: 0,
                          baseRetryInterval: 250,
                          maxRetryInterval: 1200,
                        }
                      );
                    } else if (typeof sprite.trigger === "function") {
                      Logger.info("[3D TRIGGER] Direct sprite.trigger('click') fallback");
                      try {
                        sprite.trigger("click");
                      } catch (e) {
                        Logger.warn("Direct trigger failed:", e);
                      }
                    } else {
                      Logger.warn(
                        `[3D TRIGGER] Sprite found but no triggerable interface for "${rawLabel}"`
                      );
                    }
                  } else {
                    Logger.warn(
                      `[3D TRIGGER] No sprite found for "${rawLabel}" under model ${parentModelId || "(unknown)"}`
                    );
                  }
                };

                if (result.item.id) {
                  Logger.info(`[3D TRIGGER] Trying by id: ${result.item.id}`);
                  _triggerElement(
                    tour,
                    result.item.id,
                    (success) => {
                      if (!success) {
                        Logger.warn(
                          `[3D TRIGGER] id ${result.item.id} not found; trying label fallback "${rawLabel}"`
                        );
                        tryByLabelFallback();
                      }
                    },
                    {
                      maxRetries: 20,
                      initialDelay: 0,
                      baseRetryInterval: 250,
                      maxRetryInterval: 1200,
                    }
                  );
                } else {
                  Logger.info(`[3D TRIGGER] No id on result; using label fallback "${rawLabel}"`);
                  tryByLabelFallback();
                }
              }
            };

            // Give the model a moment to mount, then setup handlers
            setTimeout(fire, 600);

            // [6.1.26.0.4.1] Auto-hide after 3D object navigation setup
            if (_shouldAutoHide()) {
              setTimeout(() => _toggleSearch(false), 800); // Slightly longer delay for 3D setup
            }
            return; // prevent further fall-through
          }

          // [6.1.26.0.5] Overlay with camera branch (FIXED: pre-bind, then select)
          if (
            result.item.camera &&
            (result.item.type === "Hotspot" ||
              result.item.type === "Polygon" ||
              result.item.type === "ProjectedImage" ||
              result.item.type === "Image" ||
              result.item.type === "Text" ||
              result.item.type === "Video" ||
              result.item.type === "Webframe")
          ) {
            if (typeof result.item.mediaIndex === "number") {
              // Pre-fetch the target item before playlist selection
              const items = targetPlaylist.get && targetPlaylist.get("items");
              const itemObj = items && items[result.item.mediaIndex];

              if (itemObj && typeof tour.setPanoramaCameraWithSpot === "function") {
                const applyCamera = () => {
                  const { yaw, pitch, fov } = result.item.camera;
                  if (fov !== undefined) {
                    tour.setPanoramaCameraWithSpot(targetPlaylist, itemObj, yaw, pitch, fov);
                  } else {
                    tour.setPanoramaCameraWithSpot(targetPlaylist, itemObj, yaw, pitch);
                  }
                  Logger.info("[NAV] hotspot+camera (one-shot)", {
                    mediaIndex: result.item.mediaIndex,
                    yaw,
                    pitch,
                    fov,
                  });
                };

                // Check if already active before binding
                const isActive = !!(
                  itemObj.get &&
                  itemObj.get("player") &&
                  itemObj.get("player").get("viewerArea")
                );
                if (isActive) {
                  // Already active - apply camera immediately, then navigate
                  applyCamera();
                  targetPlaylist.set("selectedIndex", result.item.mediaIndex);
                } else if (itemObj.bind && typeof itemObj.bind === "function") {
                  // Clear any previous handler we attached
                  if (itemObj._searchCameraBeginHandler) {
                    Logger.debug("[NAV] clearing previous camera begin handler");
                    try {
                      itemObj.unbind && itemObj.unbind("begin", itemObj._searchCameraBeginHandler);
                    } catch (e) {}
                    itemObj._searchCameraBeginHandler = null;
                  }
                  // Pre-bind the one-shot handler before selection
                  const once = () => {
                    try {
                      itemObj.unbind && itemObj.unbind("begin", once);
                    } catch (e) {}
                    itemObj._searchCameraBeginHandler = null;
                    applyCamera();
                  };
                  itemObj._searchCameraBeginHandler = once;
                  itemObj.bind("begin", once);
                  Logger.debug("[NAV] bound one-shot camera begin handler");

                  // Now trigger the playlist selection (which will fire begin)
                  targetPlaylist.set("selectedIndex", result.item.mediaIndex);
                } else {
                  // Fallback: navigate first, then delayed camera
                  targetPlaylist.set("selectedIndex", result.item.mediaIndex);
                  setTimeout(applyCamera, 250);
                }
              } else {
                // No camera function available, just navigate
                targetPlaylist.set("selectedIndex", result.item.mediaIndex);
              }

              // [6.1.26.0.5.1] Auto-hide after overlay with camera navigation
              if (_shouldAutoHide()) {
                setTimeout(() => _toggleSearch(false), 150);
              }
              return;
            }
          }

          // [6.1.26.0.6] Overlay without camera branch
          if (
            result.item.type === "Hotspot" ||
            result.item.type === "Polygon" ||
            result.item.type === "ProjectedImage" ||
            result.item.type === "Image" ||
            result.item.type === "Text" ||
            result.item.type === "Video" ||
            result.item.type === "Webframe"
          ) {
            // Navigate using mediaIndex then focus overlay
            if (typeof result.item.mediaIndex === "number") {
              targetPlaylist.set("selectedIndex", result.item.mediaIndex);

              const items = targetPlaylist.get && targetPlaylist.get("items");
              const itemObj = items && items[result.item.mediaIndex];

              if (itemObj && typeof tour.focusOverlayByName === "function" && result.item.label) {
                tour.focusOverlayByName(itemObj, result.item.label);
                Logger.info("[NAV] hotspot+focus", {
                  mediaIndex: result.item.mediaIndex,
                  label: result.item.label,
                });
              }

              // [6.1.26.0.6.1] Auto-hide after overlay navigation
              if (_shouldAutoHide()) {
                setTimeout(() => _toggleSearch(false), 150);
              }
              return;
            }
          }
        } catch (error) {
          Logger.error(`Error in hybrid click handler: ${error.message}`);
        }
      };
    }

    // [6.1.27] Sub-function: getBusinessMatch()
    function getBusinessMatch(label, media, tags, config) {
      if (!config.businessData?.useBusinessData || !_businessData.length) return null;

      try {
        // Get subtitle from media data - THIS IS THE KEY FIX
        const mediaData = _safeGetData(media);
        const subtitle = mediaData?.subtitle?.trim() || "";

        console.log(
          `[DEBUG] Business match for ${label || subtitle || "unknown"} :`,
          findBusinessMatch({
            name: label,
            id: media.get ? media.get("id") : media.id,
            subtitle: subtitle, // Make sure subtitle is passed
            tags: tags || [],
          })
        );

        return findBusinessMatch({
          name: label,
          id: media.get ? media.get("id") : media.id,
          subtitle: subtitle, // Make sure subtitle is passed
          tags: tags || [],
        });
      } catch (error) {
        Logger.warn(`Error matching business data:`, error);
        return null;
      }
    }

    // [6.1.28] Sub-function: getSheetsMatch()
    function getSheetsMatch(label, media, tags, config, tourItemContext) {
      if (!config.googleSheets?.useGoogleSheetData || !_googleSheetsData.length) return null;

      try {
        const itemId = media.get ? media.get("id") : media.id;

        // [6.1.28.0.1] Create a comprehensive context for matching
        const matchContext = {
          label: label || "",
          itemId: itemId || "",
          tags: tags || [],
          source: tourItemContext?.source || "unknown",
          index: tourItemContext?.index || -1,
          elementType: tourItemContext?.type || "unknown",
        };

        Logger.debug(
          `[SHEETS MATCH] Looking for match for: ${matchContext.label} (ID: ${matchContext.itemId}, Type: ${matchContext.elementType})`
        );

        // [6.1.28.0.2] Find all potential matches
        const potentialMatches = _googleSheetsData.filter((entry) => {
          // [6.1.28.0.3] Method 1: Exact ID match (highest priority)
          if (
            entry.id &&
            matchContext.itemId &&
            entry.id.toString() === matchContext.itemId.toString()
          ) {
            Logger.debug(`[SHEETS MATCH] Found exact ID match: ${entry.id}`);
            return true;
          }

          // [6.1.28.0.4] Method 2: Tag-based matching (medium priority)
          if (
            entry.tag &&
            matchContext.label &&
            matchContext.label.toLowerCase().includes(entry.tag.toLowerCase())
          ) {
            Logger.debug(`[SHEETS MATCH] Found tag match: ${entry.tag} in ${matchContext.label}`);
            return true;
          }

          // [6.1.28.0.5] Method 3: Exact name matching (lower priority)
          if (
            entry.name &&
            matchContext.label &&
            entry.name.toLowerCase() === matchContext.label.toLowerCase()
          ) {
            Logger.debug(`[SHEETS MATCH] Found exact name match: ${entry.name}`);
            return true;
          }

          return false;
        });

        if (potentialMatches.length === 0) {
          Logger.debug(`[SHEETS MATCH] No matches found for: ${matchContext.label}`);
          return null;
        }

        if (potentialMatches.length === 1) {
          Logger.debug(
            `[SHEETS MATCH] Single match found: ${potentialMatches[0].name || potentialMatches[0].id}`
          );
          return potentialMatches[0];
        }

        // [6.1.28.0.6] Resolve ambiguity if multiple matches are found
        Logger.warn(
          `[SHEETS MATCH] Multiple matches found for ${matchContext.label} (${potentialMatches.length} matches)`
        );

        // [6.1.28.0.7] Resolution: Prefer exact ID matches
        const exactIdMatches = potentialMatches.filter(
          (entry) =>
            entry.id &&
            matchContext.itemId &&
            entry.id.toString() === matchContext.itemId.toString()
        );

        if (exactIdMatches.length === 1) {
          Logger.info(`[SHEETS MATCH] Resolved to exact ID match: ${exactIdMatches[0].id}`);
          return exactIdMatches[0];
        }

        // [6.1.28.0.8] Resolution: Prefer matches with a specified element type
        const typeSpecificMatches = potentialMatches.filter(
          (entry) =>
            entry.elementType &&
            entry.elementType.toLowerCase() === matchContext.elementType.toLowerCase()
        );

        if (typeSpecificMatches.length === 1) {
          Logger.info(
            `[SHEETS MATCH] Resolved to type-specific match: ${typeSpecificMatches[0].name} (${typeSpecificMatches[0].elementType})`
          );
          return typeSpecificMatches[0];
        }

        // [6.1.28.0.9] Resolution: Prefer matches with more detailed data
        const detailedMatches = potentialMatches.filter(
          (entry) => entry.description && entry.description.length > 10 // Has substantial description
        );

        if (detailedMatches.length === 1) {
          Logger.info(`[SHEETS MATCH] Resolved to detailed match: ${detailedMatches[0].name}`);
          return detailedMatches[0];
        }

        // [6.1.28.0.10] Resolution: Log ambiguity and return the first match
        Logger.warn(
          `[SHEETS MATCH] Could not resolve ambiguity for ${matchContext.label}. Using first match: ${potentialMatches[0].name}`
        );
        Logger.warn(
          `[SHEETS MATCH] Consider adding unique IDs or elementType to Google Sheets for better matching`
        );

        return potentialMatches[0];
      } catch (error) {
        Logger.warn(`[SHEETS MATCH] Error matching Google Sheets data:`, error);
        return null;
      }
    }

    // [6.1.29] Sub-function: getResultLabel()
    function getResultLabel(displayLabel, businessMatch, sheetsMatch, config) {
      if (businessMatch && config.businessData.replaceTourData) {
        return businessMatch.name || displayLabel;
      }
      if (sheetsMatch && config.googleSheets.useAsDataSource) {
        return sheetsMatch.name || displayLabel;
      }
      if (businessMatch) {
        return businessMatch.name || displayLabel;
      }
      return displayLabel;
    }

    // [6.1.30] Sub-function: getResultDescription()
    function getResultDescription(subtitle, businessMatch, sheetsMatch, config) {
      if (businessMatch && config.businessData.replaceTourData) {
        return businessMatch.description || "";
      }
      if (sheetsMatch && config.googleSheets.useAsDataSource) {
        return sheetsMatch.description || subtitle || "";
      }
      return subtitle || "";
    }

    // [6.1.31] Sub-function: prepareFuse()
    function prepareFuse() {
      fuse = _prepareSearchIndex(tour, _config);
    }

    // [6.x] After prepareFuse is defined during initialization:
    _rebuildIndex = function () {
      try {
        prepareFuse(); // uses the in-scope prepareFuse
      } catch (e) {
        Logger?.warn?.("Rebuild index failed:", e);
      }
    };

    // [6.1.32] Sub-function: _safeGetData()
    function _safeGetData(obj) {
      if (!obj) return {};

      try {
        if (obj.data) return obj.data;
        if (typeof obj.get === "function") {
          return obj.get("data") || {};
        }
        return {};
      } catch (error) {
        Logger.debug("Error getting data:", error);
        return {};
      }
    }

    // [6.1.33] Sub-function: _shouldIncludePanorama()
    function _shouldIncludePanorama(panoramaIndex, mediaIndexConfig) {
      // Extract mediaIndexConfig properties
      const { mode = "none", allowed = [], blacklisted = [] } = mediaIndexConfig || {};

      Logger?.debug?.("[MEDIA-INDEX]", {
        mode,
        index: panoramaIndex,
        allowed,
        blacklisted,
        action: "checked",
      });

      // Only gate by the mediaIndexConfig (no label gating)
      if (mode === "whitelist" && allowed.length > 0) {
        const indexStr = String(panoramaIndex);
        if (!allowed.includes(indexStr)) {
          Logger?.debug?.("[MEDIA-INDEX]", {
            mode,
            index: panoramaIndex,
            allowed,
            blacklisted,
            action: "rejected-whitelist",
          });
          return false;
        }
      } else if (mode === "blacklist" && blacklisted.length > 0) {
        const indexStr = String(panoramaIndex);
        if (blacklisted.includes(indexStr)) {
          Logger?.debug?.("[MEDIA-INDEX]", {
            mode,
            index: panoramaIndex,
            allowed,
            blacklisted,
            action: "rejected-blacklist",
          });
          return false;
        }
      }

      Logger?.debug?.("[MEDIA-INDEX]", {
        mode,
        index: panoramaIndex,
        allowed,
        blacklisted,
        action: "passed",
      });
      return true;
    }

    // [6.1.34] Sub-function: _getDisplayLabel()
    function _getDisplayLabel(label, subtitle, tags, itemContext) {
      // [6.1.34.1] Generate display label with context awareness
      const context = itemContext || {};
      const elementType = context.type || "Element";
      const itemId = context.id || "";
      const index = context.index !== undefined ? context.index : -1;

      // [6.1.34.2] Handle 'onlySubtitles' mode
      if (_config.display.onlySubtitles && subtitle) {
        return subtitle;
      }

      // [6.1.34.3] Use label if it exists
      if (label && label.trim()) {
        return label.trim();
      }

      // [6.1.34.4] If no label, check for subtitle
      if (!label || !label.trim()) {
        if (subtitle && subtitle.trim() && _config.useAsLabel.subtitles) {
          Logger.debug(`[LABEL DEBUG] Using subtitle as label: "${subtitle}"`);
          return subtitle.trim();
        }

        // [6.1.34.4.1] If no subtitle, check for tags
        if (Array.isArray(tags) && tags.length > 0 && _config.useAsLabel.tags) {
          console.log(`[LABEL DEBUG] Using tags as label: "${tags.join(", ")}"`);
          return tags.join(", ");
        }

        // [6.1.34.4.2] As a last resort, use element type and index
        if (_config.useAsLabel.elementType) {
          // Don't show internal IDs - use generic labels
          if (index >= 0) {
            return `${elementType} ${index + 1}`;
          } else {
            return elementType;
          }
        }

        // [6.1.34.4.3] Final fallback to custom text
        const customText = _config.useAsLabel.customText || "[Unnamed Item]";
        return customText;
      }

      return label;
    }

    // [6.1.35] Sub-function: _getOverlays()

    function _getOverlays(media, tour, item) {
      const overlays = [];
      const overlayDetectionMethods = [
        // [6.1.35.0.1] Method 1: media.get('overlays')
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

        // [6.1.35.0.2] Method 2: media.overlays
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

        // [6.1.35.0.3] Method 3: item's overlays directly
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

        // [6.1.35.0.4] Method 4: overlaysByTags
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

        // [6.1.35.0.5] Method 5: Look for SpriteModel3DObject by panorama
        () => {
          try {
            if (tour.player && typeof tour.player.getByClassName === "function") {
              const allSprites = tour.player.getByClassName("SpriteModel3DObject");
              if (Array.isArray(allSprites) && allSprites.length > 0) {
                // Filter sprites that belong to this specific panorama
                const mediaId = media.get ? media.get("id") : media.id;
                const panoramaSprites = allSprites.filter((sprite) => {
                  try {
                    // [6.1.35.0.6] Check if sprite belongs to this panorama
                    const spriteParent = sprite.get ? sprite.get("parent") : sprite.parent;
                    const parentId =
                      spriteParent && spriteParent.get ? spriteParent.get("id") : spriteParent?.id;

                    // [6.1.35.0.7] Also check for direct media association
                    const spriteMedia = sprite.get ? sprite.get("media") : sprite.media;
                    const spriteMediaId =
                      spriteMedia && spriteMedia.get ? spriteMedia.get("id") : spriteMedia?.id;

                    return parentId === mediaId || spriteMediaId === mediaId;
                  } catch (e) {
                    // [6.1.35.0.8] If parent is indeterminable, include it for the current panorama
                    Logger.debug("Could not determine sprite parent, including in search:", e);
                    return true;
                  }
                });

                if (panoramaSprites.length > 0) {
                  Logger.info(
                    `Found ${panoramaSprites.length} SpriteModel3DObject(s) for panorama ${mediaId}`
                  );
                  return panoramaSprites;
                }
              }
            }
          } catch (e) {
            Logger.debug("Enhanced SpriteModel3DObject overlay detection failed:", e);
          }
          return null;
        },

        // [6.1.35.0.9] Method 6: Fallback to include all 3D objects for the first panorama
        () => {
          try {
            // Only apply this fallback for the first panorama to avoid duplicates
            const currentIndex = item.get ? item.get("index") : 0;
            if (
              currentIndex === 0 &&
              tour.player &&
              typeof tour.player.getByClassName === "function"
            ) {
              const allSprites = tour.player.getByClassName("SpriteModel3DObject");
              if (Array.isArray(allSprites) && allSprites.length > 0) {
                Logger.info(
                  `Fallback: Adding ${allSprites.length} unassigned SpriteModel3DObject(s) to first panorama`
                );
                return allSprites;
              }
            }
          } catch (e) {
            Logger.debug("Fallback 3D object detection failed:", e);
          }
          return null;
        },

        // [6.1.35.0.10] Method 7: Search for other 3D classes
        () => {
          try {
            if (tour.player && typeof tour.player.getByClassName === "function") {
              const all3DObjects = [
                ...tour.player.getByClassName("Model3DObject"),
                ...tour.player.getByClassName("Sprite3DObject"),
                ...tour.player.getByClassName("SpriteHotspotObject"),
              ];

              if (all3DObjects.length > 0) {
                Logger.info(`Found ${all3DObjects.length} other 3D objects`);
                return all3DObjects;
              }
            }
          } catch (e) {
            Logger.debug("Other 3D object detection failed:", e);
          }
          return null;
        },

        // [6.1.35.0.11] Method 8: Search for child elements in tour.player
        () => {
          try {
            if (tour.player && typeof tour.player.getByClassName === "function") {
              const allOverlays = tour.player.getByClassName("PanoramaOverlay");
              if (Array.isArray(allOverlays) && allOverlays.length > 0) {
                // [6.1.35.0.12] Filter overlays belonging to the current panorama
                return allOverlays.filter((overlay) => {
                  try {
                    const parentMedia = overlay.get("media");
                    return parentMedia && parentMedia.get("id") === media.get("id");
                  } catch {
                    // [6.1.35.0.13] If parent is indeterminable, include it for the current panorama
                    Logger.debug("Could not determine overlay parent, including in search");
                    return true;
                  }
                });
              }
            }
          } catch {
            Logger.debug("Method 8 overlay detection failed");
          }
          return null;
        },
      ];

      // [6.1.35.1] Sequentially try each detection method
      for (const method of overlayDetectionMethods) {
        const result = method();
        if (result && result.length > 0) {
          overlays.push(...result);
          Logger.debug(`Overlay detection method found ${result.length} overlays`);
          break; // Stop after first successful method
        }
      }

      Logger.info(`Total overlays found for panorama: ${overlays.length}`);
      return overlays;
    }

    // [6.1.36] Sub-function: _processOverlays()
    function _processOverlays(overlays, fuseData, parentIndex, parentLabel) {
      if (!Array.isArray(overlays) || overlays.length === 0) {
        return;
      }

      overlays.forEach((overlay, overlayIndex) => {
        try {
          // [6.1.36.0.1] Safely get overlay data
          const overlayData = _safeGetData(overlay);

          // [6.1.36.0.2] Get overlay label
          let overlayLabel = "";
          if (overlayData.label) {
            overlayLabel = overlayData.label.trim();
          } else if (overlay.label) {
            overlayLabel = overlay.label.trim();
          } else if (typeof overlay.get === "function") {
            try {
              const label = overlay.get("label");
              if (label) overlayLabel = label.trim();
            } catch {
              // [6.1.36.0.3] Silently fail if label property is missing
            }
          }

          // [6.1.36.0.4] If no label, attempt to use text content
          if (!overlayLabel && typeof overlay.get === "function") {
            try {
              const textContent = overlay.get("text");
              if (textContent) {
                overlayLabel = textContent.substring(0, 30);
                if (textContent.length > 30) overlayLabel += "...";
              }
            } catch {
              // [6.1.36.0.5] Silently fail if text property is missing
            }
          }

          // [6.1.36.0.6] Skip if label is empty and configured to do so
          if (!overlayLabel && _config.includeContent.elements.skipEmptyLabels) return;

          // [6.1.36.0.7] Get element type
          let elementType = _getElementType(overlay, overlayLabel);
          if (overlayLabel.includes("info-") || overlayLabel.includes("info_")) {
            elementType = "Hotspot";
          }

          // [6.1.36.0.8] Apply element filtering
          const elementTags = Array.isArray(overlayData.tags) ? overlayData.tags : [];
          const overlaySubtitle = overlayData?.subtitle || "";

          // Compute display label first, then filter with both label and subtitle
          const displayLabel = _getDisplayLabel(overlayLabel, overlaySubtitle, elementTags, {
            type: elementType,
            id: overlay.id || (overlay.get ? overlay.get("id") : null),
            index: overlayIndex,
          });

          if (!_shouldIncludeElement(elementType, displayLabel, elementTags, overlaySubtitle)) {
            return;
          }

          // [6.1.36.0.9] Safely get element ID
          let elementId = null;
          if (overlay.id) {
            elementId = overlay.id;
          } else if (typeof overlay.get === "function") {
            try {
              elementId = overlay.get("id");
            } catch {
              // [6.1.36.0.10] Silently fail if id property is missing
            }
          }

          // [6.1.36.0.11] Display label is already computed above with proper fallbacks

          let businessMatch = null;
          if (_config.businessData?.useBusinessData && _businessData.length > 0) {
            try {
              const elementForMatching = {
                name: overlayLabel,
                id: elementId,
                tags: elementTags,
                type: elementType,
              };
              businessMatch = findBusinessMatch(elementForMatching);
            } catch (error) {
              Logger.warn(`Error matching business data for overlay ${overlayLabel}:`, error);
            }
          }

          // [6.1.36.0.12] Match with business data
          let resultLabel = displayLabel;
          let resultDescription = "";
          if (businessMatch) {
            if (_config.businessData.replaceTourData) {
              resultLabel = businessMatch.name || displayLabel;
              resultDescription = businessMatch.description || "";
            }
          }
          // [6.1.36.0.13] Add to search data
          fuseData.push({
            type:
              businessMatch && _config.businessData.replaceTourData
                ? elementType
                : businessMatch
                  ? "Business"
                  : elementType,
            label: resultLabel,
            subtitle: resultDescription,
            tags: elementTags,
            parentIndex: parentIndex,
            parentLabel: parentLabel,
            playlistOrder: parentIndex * 1000 + overlayIndex,
            id: elementId,
            // [6.1.36.0.14] Include business data for images
            businessData: businessMatch,
            businessName: businessMatch?.name,
            imageUrl: businessMatch?.imageUrl || null,
            localImage: businessMatch?.localImage || null,
            boost: businessMatch
              ? _config.searchSettings.boostValues.businessMatch
              : _config.searchSettings.boostValues.childElement,
          });
        } catch (overlayError) {
          Logger.warn(`Error processing overlay at index ${overlayIndex}:`, overlayError);
        }
      });
    }

    // [6.1.37] Submodule: UI Building Functions
    /**
     * Creates and inserts the search field into the container if missing.
     * @param {HTMLElement} container
     */
    // [6.1.38] Sub-function: _buildSearchField()
    function _buildSearchField(container) {
      if (!container.querySelector("#tourSearch")) {
        const searchField = document.createElement("div");
        searchField.className = "search-field";
        searchField.innerHTML = `
                    <input type="text" id="tourSearch" placeholder="${_config.searchBar.placeholder}" 
                          autocomplete="off">
                    <div class="icon-container">
                        <div class="search-icon"></div>
                        <button class="clear-button">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                `;

        // Set up ARIA attributes using helpers
        const input = searchField.querySelector("#tourSearch");
        const clearButton = searchField.querySelector(".clear-button");
        const searchIcon = searchField.querySelector(".search-icon");

        _aria.setRole(input, "searchbox");
        _aria.setLabel(input, "Search tour");
        _aria.setRole(searchField, "search");
        _aria.setLabel(clearButton, "Clear search");
        _aria.setHidden(searchIcon, true);

        container.insertBefore(searchField, container.firstChild);
      }
    }

    // [6.1.39] Sub-function: _buildNoResultsMessage()
    function _buildNoResultsMessage() {
      const noResults = document.createElement("div");
      noResults.className = "no-results";
      noResults.innerHTML = "<p>No results found</p>";
      return noResults;
    }

    // [6.1.40] Sub-function: _buildResultsContainer()
    function _buildResultsContainer(container) {
      if (!container.querySelector(".search-results")) {
        const resultsContainer = document.createElement("div");
        resultsContainer.className = "search-results";

        // Set up ARIA attributes using helpers
        _aria.setRole(resultsContainer, "listbox");
        _aria.setLabel(resultsContainer, "Search results");

        // [6.1.40.0.1] Add results section
        const resultsSection = document.createElement("div");
        resultsSection.className = "results-section";
        resultsContainer.appendChild(resultsSection);

        // [6.1.40.0.2] Add no-results message
        resultsContainer.appendChild(_buildNoResultsMessage());

        container.appendChild(resultsContainer);
      }
    }

    // [6.1.41] Sub-function: _createSearchInterface()
    function _createSearchInterface(container) {
      if (!container) {
        Logger.error("Cannot create search interface: container is null or undefined");
        return;
      }

      try {
        _buildSearchField(container);
        _buildResultsContainer(container);
      } catch (error) {
        Logger.error("Error creating search interface:", error);
      }
    }

    // [6.1.42] Submodule: UI Helpers
    // [6.1.43] Sub-function: highlightMatch()
    const highlightMatch = (text, term) => {
      if (!text || !term || term === "*") return text || "";

      try {
        // Fully sanitize the search term for regex use
        const sanitizedTerm = term.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(`(${sanitizedTerm})`, "gi");

        // Use document.createElement for safer DOM creation
        const tempDiv = document.createElement("div");
        tempDiv.textContent = text;
        const sanitizedText = tempDiv.innerHTML;

        // Fix: Actually wrap matches with <mark> tags for highlighting
        return sanitizedText.replace(regex, "<mark>$1</mark>");
      } catch (error) {
        Logger.warn("Error highlighting text:", error);
        return text;
      }
    };

    // [6.1.44] Sub-function: getIconSizeClass() - Get CSS class for icon size
    const getIconSizeClass = () => {
      const iconSize = _config.thumbnailSettings?.iconSettings?.iconSize || "48px";
      if (iconSize.endsWith("px")) {
        return `icon-${iconSize}`;
      }
      // Fallback for any old configurations
      return "icon-48px";
    };

    // [6.1.45] Sub-function: getTypeIcon() - FIXED VERSION
    const getTypeIcon = (type, config = _config) => {
      // First define the original SVG icons function
      const getOriginalTypeIcon = (iconType) => {
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
          "3DHotspot": `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="3"></circle>
              <circle cx="12" cy="12" r="8"></circle>
              <path d="M12 2v4"></path>
              <path d="M12 18v4"></path>
              <path d="M2 12h4"></path>
              <path d="M18 12h4"></path>
            </svg>`,
          "3DModel": `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <polygon points="12,2 22,7 22,17 12,22 2,17 2,7"></polygon>
                  <polyline points="2,7 12,12 22,7"></polyline>
                  <polyline points="12,2 12,22"></polyline>
                </svg>`,
          "3DModelObject": `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="9"></circle>
              <path d="M12 3v18"></path>
              <path d="M3 12h18"></path>
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
                 <path d="M2 2l20 20"></path>
               </svg>`,
          Text: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <line x1="4" y1="7" x2="20" y2="7"></line>
                <line x1="4" y1="12" x2="20" y2="12"></line>
                <line x1="4" y1="17" x2="14" y2="17"></line>
             </svg>`,
          Element: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                   <circle cx="12" cy="12" r="9"></circle>
                </svg>`,
          Container: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <rect x="7" y="7" width="10" height="6" rx="1" ry="1"></rect>
            <line x1="3" y1="17" x2="21" y2="17"></line>
          </svg>`,
          Business: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon business-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
              <line x1="4" y1="7" x2="20" y2="7"></line>
              <line x1="4" y1="12" x2="20" y2="12"></line>
              <line x1="4" y1="17" x2="20" y2="17"></line>
              <line x1="9" y1="7" x2="9" y2="22"></line>
              <line x1="15" y1="7" x2="15" y2="22"></line>
            </svg>`,
        };

        // Return the icon for the specified type, or a default if not found
        return icons[iconType] || icons["Element"];
      };

      const iconSettings =
        (typeof config !== "undefined" && config.thumbnailSettings?.iconSettings) || {};

      Logger.debug(`[ICON DEBUG] Processing type: ${type}`);
      console.log(
        `[ICON DEBUG] enableCustomIcons value: ${iconSettings.enableCustomIcons}`,
        typeof iconSettings.enableCustomIcons
      );

      // Check if custom icons are enabled
      // Check if custom icons are enabled
      if (iconSettings.enableCustomIcons !== true) {
        console.log(`[ICON] Custom icons DISABLED, using default SVG for: ${type}`);
        return getOriginalTypeIcon(type);
      }

      console.log(`[ICON] Custom icons ENABLED, processing custom icon for: ${type}`);

      // Check if icons are enabled for this specific type
      const showIconFor = iconSettings.showIconFor || {};
      const elementType = type?.toLowerCase() || "other";
      const typeMapping = {
        panorama: "panorama",
        hotspot: "hotspot",
        polygon: "polygon",
        video: "video",
        webframe: "webframe",
        image: "image",
        text: "text",
        projectedimage: "projectedimage",
        element: "element",
        business: "business",
        "3dmodel": "3dmodel",
        "3dhotspot": "3dhotspot",
        "3dmodelobject": "3dmodelobject",
      };

      const showIconKey = typeMapping[elementType] || "other";
      if (showIconFor[showIconKey] === false) {
        Logger.debug(`[ICON] Icons disabled for type: ${elementType}`);
        return ""; // Return empty string if icons are disabled for this type
      }

      // Get custom icon
      const customIcons = iconSettings.customIcons || {};
      let customIcon = customIcons[type] || customIcons.default || "⚪";

      Logger.debug(`[ICON] Using custom icon for ${type}: ${customIcon}`);

      // *** ENHANCED: Handle different icon types with proper Font Awesome detection ***
      if (customIcon.startsWith("<svg")) {
        // Custom SVG icon
        return customIcon;
      } else if (
        customIcon.startsWith("fa-") ||
        customIcon.startsWith("fas ") ||
        customIcon.startsWith("far ") ||
        customIcon.startsWith("fab ") ||
        customIcon.startsWith("fal ") ||
        customIcon.startsWith("fad ")
      ) {
        // *** ENHANCED: Font Awesome icon with proper detection ***
        if (iconSettings.enableFontAwesome) {
          // *** NEW: Check if Font Awesome is actually loaded ***
          if (isFontAwesomeLoaded()) {
            return `<i class="${customIcon}" aria-hidden="true"></i>`;
          } else {
            console.warn(
              `[ICON] Font Awesome enabled but not loaded. Falling back to default SVG for ${type}.`
            );
            return getOriginalTypeIcon(type);
          }
        } else {
          // *** ENHANCED: Font Awesome disabled but FA class specified - fallback to SVG ***
          console.warn(
            `[ICON] Font Awesome class "${customIcon}" specified but enableFontAwesome is false. Falling back to default SVG for ${type}.`
          );
          return getOriginalTypeIcon(type);
        }
      } else if (customIcon.startsWith("http") || customIcon.includes(".")) {
        // Image URL icon
        return `<img src="${customIcon}" alt="${type} icon" aria-hidden="true">`;
      } else {
        // Emoji or text icon (this works regardless of Font Awesome settings)
        return `<span class="custom-icon-emoji" aria-hidden="true">${customIcon}</span>`;
      }

      // *** NEW: Helper function to detect if Font Awesome is actually loaded ***
      function isFontAwesomeLoaded() {
        // Method 1: Check for Font Awesome CSS in document
        const fontAwesomeLink = document.querySelector(
          'link[href*="font-awesome"], link[href*="fontawesome"]'
        );
        if (fontAwesomeLink) {
          console.log(`[ICON] Font Awesome detected via CSS link: ${fontAwesomeLink.href}`);
          return true;
        }

        // Method 2: Check for Font Awesome via computed styles (test a known FA class)
        try {
          const testElement = document.createElement("i");
          testElement.className = "fas fa-home";
          testElement.style.display = "none";
          document.body.appendChild(testElement);

          const computedStyle = window.getComputedStyle(testElement);
          const fontFamily = computedStyle.getPropertyValue("font-family");

          document.body.removeChild(testElement);

          // Font Awesome uses specific font families
          const isFALoaded =
            fontFamily.includes("Font Awesome") ||
            fontFamily.includes("FontAwesome") ||
            fontFamily.includes("fa-");

          if (isFALoaded) {
            console.log(`[ICON] Font Awesome detected via font-family: ${fontFamily}`);
            return true;
          }
        } catch (error) {
          console.debug(`[ICON] Font Awesome style detection failed: ${error.message}`);
        }

        // Method 3: Check for Font Awesome JavaScript object
        if (window.FontAwesome || window.fontawesome) {
          Logger.debug(`[ICON] Font Awesome detected via JavaScript object`);
          return true;
        }

        console.log(`[ICON] Font Awesome not detected - CSS not loaded or not available`);
        return false;
      }
    };
    // [6.1.46] Sub-function: groupAndSortResults()
    const groupAndSortResults = (matches) => {
      // [6.1.46.1] Group results by type with consistent data handling
      const grouped = matches.reduce((acc, match) => {
        // **SIMPLIFIED: Always start with original type**
        let groupType = match.item.type || "Element";

        // **ONLY** change group type if explicitly configured to do so
        if (
          _config.businessData?.useBusinessData &&
          _config.businessData?.replaceTourData &&
          match.item.businessData?.elementType
        ) {
          groupType = match.item.businessData.elementType;
        }
        // **OR** if Google Sheets is primary data source
        else if (
          _config.googleSheets?.useAsDataSource &&
          _config.googleSheets?.useGoogleSheetData &&
          match.item.sheetsData?.elementType
        ) {
          groupType = match.item.sheetsData.elementType;
        }
        // **OR** if it's a business-only entry (no tour data)
        else if (
          _config.businessData?.useBusinessData &&
          match.item.businessName &&
          !match.item.item
        ) {
          // No associated tour item
          groupType = "Business";
        }

        if (!acc[groupType]) acc[groupType] = [];
        acc[groupType].push(match);
        return acc;
      }, {});

      // [6.1.46.2] Sort items within each group
      Object.keys(grouped).forEach((type) => {
        grouped[type].sort((a, b) => {
          // [6.1.46.2.1] Primary sort: playlistOrder
          if (a.item.playlistOrder !== undefined && b.item.playlistOrder !== undefined) {
            return a.item.playlistOrder - b.item.playlistOrder;
          }

          // [6.1.46.2.2] Secondary sort: label (alphabetical)
          const labelCompare = a.item.label.localeCompare(b.item.label);
          if (labelCompare !== 0) return labelCompare;

          // [6.1.46.2.3] Tertiary sort: parentLabel
          if (a.item.parentLabel && b.item.parentLabel) {
            return a.item.parentLabel.localeCompare(b.item.parentLabel);
          }

          return 0;
        });
      });

      return grouped;
    };
    // [6.1.47] Sub-function: _resolveDisplayType()
    function _resolveDisplayType(item, config) {
      const originalType = item.type || "Element";

      // Only change display type under specific conditions
      if (
        config.businessData?.replaceTourData &&
        config.businessData?.useBusinessData &&
        item.businessData?.elementType
      ) {
        return item.businessData.elementType;
      }

      if (
        config.googleSheets?.useAsDataSource &&
        config.googleSheets?.useGoogleSheetData &&
        item.sheetsData?.elementType
      ) {
        return item.sheetsData.elementType;
      }

      // Default: keep original type
      return originalType;
    }
    // [6.1.48] Sub-function: performSearch()
    performSearch = () => {
      // [6.1.48.1] Main search execution
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

      // [6.1.48.2] Add ARIA attributes for accessibility
      resultsContainer.setAttribute("aria-live", "polite"); // Announce changes politely
      noResults.setAttribute("role", "status"); // Mark as status for screen readers

      // [6.1.48.3] Update UI based on search term
      if (searchTerm.length > 0) {
        if (clearButton) clearButton.classList.add("visible");
        if (searchIcon) {
          searchIcon.classList.add("icon-hidden"); // Use CSS class for hidden state
          searchIcon.classList.remove("icon-visible");
        }
      } else {
        if (clearButton) clearButton.classList.remove("visible");
        if (searchIcon) {
          searchIcon.classList.add("icon-visible"); // Use CSS class for visible state
          searchIcon.classList.remove("icon-hidden");
        }
      }

      // [6.1.48.4] Skip if search term is unchanged
      if (searchTerm === currentSearchTerm) return;
      currentSearchTerm = searchTerm;

      // [6.1.48.5] Reset results list
      resultsList.innerHTML = "";

      // [6.1.48.6] Handle empty search term
      if (!searchTerm) {
        searchContainer.classList.remove("has-results");
        noResults.classList.remove("visible");
        noResults.classList.add("hidden");
        resultsContainer.classList.remove("visible");
        resultsContainer.classList.add("hidden");
        resultsList.innerHTML = ""; // No search history feature
        return;
      }

      // [6.1.48.7] Check for minimum character requirement
      if (searchTerm !== "*" && searchTerm.length < _config.minSearchChars) {
        noResults.classList.remove("visible");
        noResults.classList.add("hidden");
        resultsContainer.classList.remove("visible");
        resultsContainer.classList.add("hidden");
        resultsList.innerHTML = `
                    <div class="search-min-chars" role="status" aria-live="assertive">
                        <p>Please type at least ${_config.minSearchChars} characters to search</p>
                    </div>
                `;
        return;
      }

      // [6.1.48.8] Show results container initially
      resultsContainer.classList.remove("hidden");
      resultsContainer.classList.add("visible");

      try {
        // [6.1.48.8.1] Ensure fuse index is initialized
        if (!fuse) {
          Logger.warn("Search index not initialized, preparing now...");
          prepareFuse();
        }

        // [6.1.48.8.2] Perform search
        let matches;
        if (searchTerm === "*") {
          // [6.1.48.8.3] Wildcard search shows all items
          matches = fuse._docs
            ? fuse._docs.map((item, index) => ({
                item,
                score: 0,
                refIndex: index,
              }))
            : [];
        } else {
          // [6.1.48.8.4] Process search term for special characters
          const processedTerm = _preprocessSearchTerm(searchTerm);

          // [6.1.48.8.5] Allow exact matching with = prefix
          if (typeof processedTerm === "string" && processedTerm.startsWith("=")) {
            matches = fuse.search({ $or: [{ label: processedTerm }] });
          } else {
            // [6.1.48.8.6] Use regular fuzzy search
            matches = fuse.search(processedTerm);
          }
        }

        // [6.1.48.8.7] Handle no results case
        if (!matches || !matches.length) {
          // [6.1.48.8.8] Remove 'has-results' if no matches
          searchContainer.classList.remove("has-results");

          // [6.1.48.8.9] Show 'no results' message
          noResults.classList.remove("hidden");
          noResults.classList.add("visible");
          noResults.setAttribute("role", "status");
          noResults.setAttribute("aria-live", "polite");

          // [6.1.48.8.10] Make results container visible but transparent
          resultsContainer.classList.remove("hidden");
          resultsContainer.classList.add("visible", "no-results-bg");

          // [6.1.48.8.11] Hide results list
          resultsList.classList.add("hidden");

          return;
        } else {
          // [6.1.48.8.12] Show results and hide 'no results'
          searchContainer.classList.add("has-results");
          noResults.classList.remove("visible");
          noResults.classList.add("hidden");
          resultsContainer.classList.remove("no-results-bg", "hidden");
          resultsContainer.classList.add("visible");
          resultsList.classList.remove("hidden");
        }

        // [6.1.48.8.13] Make results container accessible for screen readers
        resultsContainer.setAttribute("aria-live", "polite");
        resultsContainer.setAttribute("aria-relevant", "additions text");
        noResults.classList.remove("visible");
        noResults.classList.add("hidden");

        // [6.1.48.8.14] Display results
        resultsList.classList.remove("hidden");
        resultsList.classList.add("visible"); // Use CSS class for visible state
        noResults.classList.remove("visible");
        noResults.classList.add("hidden");

        // [6.1.48.8.15] Group and sort results
        const groupedResults = groupAndSortResults(matches);

        // [6.1.48.8.16] Apply type filtering based on config
        if (
          _config.filter.typeFilter?.mode === "whitelist" &&
          Array.isArray(_config.filter.typeFilter?.allowedTypes) &&
          _config.filter.typeFilter.allowedTypes.length > 0
        ) {
          // [6.1.48.8.17] Only keep allowed result types
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
          // [6.1.48.8.18] Remove blacklisted result types
          Object.keys(groupedResults).forEach((type) => {
            if (_config.filter.typeFilter.blacklistedTypes.includes(type)) {
              delete groupedResults[type];
            }
          });
        }

        // [6.1.48.8.19] Keep track of result index for ARIA attributes
        let resultIndex = 0;

        // [6.1.48.8.20] Define priority order for result types
        const typeOrder = [
          "Panorama",
          "Hotspot",
          "Polygon",
          "Video",
          "Webframe",
          "Image",
          "Text",
          "ProjectedImage",
          "3DModel",
          "3DHotspot",
          "Element",
          "Business",
          "Container",
        ];

        // [6.1.48.8.21] Render each group of results in priority order
        Object.entries(groupedResults)
          .sort(([typeA], [typeB]) => {
            // [6.1.48.8.22] Get index in priority array (default to end if not found)
            const indexA = typeOrder.indexOf(typeA);
            const indexB = typeOrder.indexOf(typeB);

            // [6.1.48.8.23] Handle types not in the priority list
            const valA = indexA !== -1 ? indexA : typeOrder.length;
            const valB = indexB !== -1 ? indexB : typeOrder.length;

            // [6.1.48.8.24] Sort by priority index
            return valA - valB;
          })
          .forEach(([type, results]) => {
            const groupEl = document.createElement("div");
            groupEl.className = "results-group";

            groupEl.setAttribute("data-type", type);
            groupEl.setAttribute(
              "data-header-align",
              _config.thumbnailSettings?.groupHeaderAlignment || "left"
            );
            groupEl.setAttribute(
              "data-header-position",
              _config.thumbnailSettings?.groupHeaderPosition || "top"
            );

            _aria.setRole(groupEl, "group");
            _aria.setLabel(groupEl, `${type} results`);

            // [6.1.48.8.25] Use custom label from config if available, otherwise use the original type
            const customLabel = _config.displayLabels[type] || type;

            // [6.1.48.8.26] Create group header with custom label
            groupEl.innerHTML = `
                        <div class="group-header">
                            <span class="group-title">${customLabel}</span>
                            <span class="group-count">${results.length} result${results.length !== 1 ? "s" : ""}</span>
                        </div>
                    `;

            // [6.1.48.8.27] Apply fade-in animation
            const animConfig = _config.animations || {};
            const animEnabled = animConfig.enabled === true;

            if (animEnabled) {
              console.log("🎬 Applying group animation:", animConfig.results); // Debug log
              // Apply fade-in animation to results group
              groupEl.style.opacity = "0";
              groupEl.style.transform = `translateY(${animConfig.results?.slideDistance || 10}px)`;

              requestAnimationFrame(() => {
                groupEl.style.transition = `opacity ${animConfig.results?.fadeInDuration || 200}ms ease-out, transform ${animConfig.results?.fadeInDuration || 200}ms ease-out`;
                groupEl.style.opacity = "1";
                groupEl.style.transform = "translateY(0)";
                console.log("🎬 Group animation applied"); // Debug log
              });
            }

            // [6.1.48.8.28] Render each result item
            results.forEach((result) => {
              resultIndex++;
              const resultItem = document.createElement("div");
              resultItem.className = "result-item";
              _aria.setRole(resultItem, "option");
              resultItem.tabIndex = 0;
              resultItem.setAttribute("aria-posinset", resultIndex);
              _aria.setSelected(resultItem, false);
              resultItem.dataset.type = result.item.type;

              // [6.1.48.8.29] Apply fade-in animation
              if (animEnabled) {
                console.log(`🎬 Applying item animation ${resultIndex}:`, animConfig.results);
                resultItem.style.opacity = "0";
                resultItem.style.transform = "translateX(-10px)";

                setTimeout(
                  () => {
                    resultItem.style.transition = `opacity ${animConfig.results?.fadeInDuration || 200}ms ease-out, transform ${animConfig.results?.fadeInDuration || 200}ms ease-out`;
                    resultItem.style.opacity = "1";
                    resultItem.style.transform = "translateX(0)";
                    console.log(`🎬 Item ${resultIndex} animation applied`);
                  },
                  (resultIndex - 1) * (animConfig.results?.staggerDelay || 50)
                );
              }

              // [6.1.48.8.30] Add business data attributes if available
              if (_config.businessData?.useBusinessData && result.item.businessName) {
                resultItem.dataset.business = "true";
                resultItem.dataset.businessTag = result.item.businessTag || "";
              }

              // [6.1.48.8.31] Add Google Sheets data attributes if available
              if (_config.googleSheets?.useGoogleSheetData && result.item.sheetsData) {
                resultItem.dataset.sheets = "true";
                if (result.item.sheetsData.elementType) {
                  resultItem.dataset.sheetsType = result.item.sheetsData.elementType;
                }
              }
              // [6.1.48.8.32] ADD CLICK/KEYBOARD HANDLER - Use our enhanced hybrid click handler
              resultItem.addEventListener(
                "click",
                createHybridClickHandler(result, window.tourInstance)
              );

              // [6.1.48.8.33] Also handle keyboard enter/space for accessibility
              resultItem.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  resultItem.click();
                }
              });

              resultItem.setAttribute("aria-posinset", resultIndex);
              _aria.setSelected(resultItem, false);
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

              // [6.1.48.8.34] Show parent info for child elements if configured to do so
              const parentInfo =
                result.item.type !== "Panorama" &&
                result.item.parentLabel &&
                _config.display.showParentInfo !== false
                  ? `<div class="result-parent">in ${highlightMatch(result.item.parentLabel, searchTerm)}</div>`
                  : "";

              // [6.1.48.8.35] Determine icon with consistent type resolution
              let displayType = result.item.type; // Always use the original element type for icons
              let isBusinessEnhanced = false;
              let isSheetsEnhanced = false;

              // Check if this is enhanced by business or sheets data
              if (_config.businessData?.useBusinessData && result.item.businessName) {
                isBusinessEnhanced = true;
              }

              if (_config.googleSheets?.useGoogleSheetData && result.item.sheetsData) {
                isSheetsEnhanced = true;
              }
              const iconType = displayType; // Use original type, not business/sheets override

              // [6.1.48.8.36] Check for available image sources
              const hasGoogleSheetsImage =
                _config.googleSheets?.useGoogleSheetData && result.item.imageUrl;

              // [6.1.48.8.37] Get thumbnail URL using centralized logic
              const thumbnailUrl = _getThumbnailUrl(result.item, _config);
              const hasThumbnail = thumbnailUrl !== null;

              // [6.1.48.8.38] Determine thumbnail size class based on pixel value
              let thumbnailSizeClass = "thumbnail-medium";
              const thumbSettings = _config.thumbnailSettings || {};
              const thumbSize = thumbSettings.thumbnailSize || "48px";

              // Use specific pixel-based classes for precise control
              if (thumbSize.endsWith("px")) {
                thumbnailSizeClass = `thumbnail-${thumbSize}`;
              } else {
                // Fallback to legacy size names
                if (thumbSize === "16px" || thumbSize === "24px") {
                  thumbnailSizeClass = "thumbnail-small";
                } else if (thumbSize === "32px" || thumbSize === "48px") {
                  thumbnailSizeClass = "thumbnail-medium";
                } else if (thumbSize === "64px" || thumbSize === "80px" || thumbSize === "96px") {
                  thumbnailSizeClass = "thumbnail-large";
                }
              }

              // [6.1.48.8.39] Set alignment attributes
              if (hasThumbnail) {
                resultItem.setAttribute(
                  "data-thumbnail-align",
                  thumbSettings.alignment === "right" ? "right" : "left"
                );
              }
              resultItem.setAttribute(
                "data-icon-align",
                thumbSettings.alignment === "right" ? "right" : "left"
              );

              // [6.1.48.8.40] Safely encode attribute values to prevent HTML injection
              const safeEncode = (str) => {
                if (!str) return "";
                return String(str)
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;");
              };

              const safeThumbnailUrl = safeEncode(thumbnailUrl || "");
              const safeLabel = safeEncode(result.item.label || "Search result");

              // [6.1.48.8.41] Build result item content
              resultItem.innerHTML = `
                ${
                  hasThumbnail
                    ? `
                  <div class="result-image ${thumbnailSizeClass}">
                    <img src="${safeThumbnailUrl}" 
                         alt="${safeLabel}" 
                         loading="lazy"
                         onerror="if (!this.dataset.fallbackApplied) { this.dataset.fallbackApplied = '1'; this.src = '${safeEncode(_resolveAssetUrl("assets/default-thumbnail.jpg") || "")}'; }">
                  </div>`
                    : `
                  <div class="result-icon ${getIconSizeClass()}">${getTypeIcon(result.item.type)}</div>`
                }
                <div class="result-content">
                  <div class="result-text">${highlightMatch(result.item.label, searchTerm)}</div>
                  ${
                    _config.businessData?.useBusinessData &&
                    result.item.businessName &&
                    result.item.originalLabel
                      ? `
                    <div class="result-business-context">
                      Location: ${highlightMatch(result.item.originalLabel, searchTerm)}
                    </div>`
                      : ""
                  }
                  ${parentInfo}
                  ${
                    result.item.tags && result.item.tags.length > 0 && _config.showTagsInResults
                      ? `
                    <div class="result-tags">
                      Tags: ${highlightMatch(Array.isArray(result.item.tags) ? result.item.tags.join(", ") : result.item.tags, searchTerm)}
                    </div>`
                      : ""
                  }
                  ${
                    !_config.display.onlySubtitles &&
                    result.item.subtitle &&
                    _config.display.showSubtitlesInResults !== false
                      ? `
                    <div class="result-description">${highlightMatch(result.item.subtitle, searchTerm)}</div>`
                      : ""
                  }
                </div>
              `;

              // [6.1.48.8.42] Add to group
              groupEl.appendChild(resultItem);
            });

            // [6.1.48.8.43] Add group to results list
            resultsList.appendChild(groupEl);
          });

        // [6.1.48.8.44] Update ARIA attribute for total results
        resultsContainer.setAttribute("aria-setsize", resultIndex);
      } catch (error) {
        Logger.error("Search error:", error);
        // [6.1.48.8.45] Show error message in results
        resultsList.innerHTML = `
                <div class="search-error" role="alert">
                    <p>An error occurred while searching. Please try again.</p>
                    <p class="search-error-details">${error.message}</p>
                </div>
            `;

        // [6.1.48.8.46] Keep container visible for error messages
        resultsContainer.classList.remove("hidden");
        resultsContainer.classList.add("visible");
        resultsContainer.classList.remove("no-results-bg"); // Use normal background for errors
      }
    };

    // [6.1.49] Set up keyboard navigation

    keyboardCleanup = keyboardManager.init(
      _elements.container,
      _elements.container.querySelector("#tourSearch"),
      performSearch
    );

    // [6.1.50] Bind search event listeners for UI interactions
    _bindSearchEventListeners(
      _elements.container,
      _elements.container.querySelector("#tourSearch"),
      _elements.container.querySelector(".clear-button"),
      _elements.container.querySelector(".search-icon"),
      performSearch // Pass the module-level performSearch function
    );

    // [6.1.51] Prepare the search index
    prepareFuse();

    // [6.1.52] Apply search styling
    _applySearchStyling();

    // [6.1.53] Apply custom CSS for showing/hiding tags
    let styleElement = document.getElementById("search-custom-styles");
    if (styleElement) {
      styleElement.remove();
    }

    document.body.classList.toggle("show-result-tags", _config.showTagsInResults);

    // [6.1.54] Get key elements
    const searchInput = _elements.container.querySelector("#tourSearch");
    const clearButton = _elements.container.querySelector(".clear-button");
    const searchIcon = _elements.container.querySelector(".search-icon");

    // [6.1.55] Bind all event listeners
    _bindSearchEventListeners(
      _elements.container,
      searchInput,
      clearButton,
      searchIcon,
      performSearch // Pass the module-level performSearch function
    );

    // [6.1.56] Mark initialization as complete
    window.searchListInitialized = true;
    _initialized = true;
    Logger.info("Enhanced search initialized successfully");
  }

  // [7.0] Search Visibility Toggle
  let _lastToggleTime = 0;
  let _toggleDebounceTime = 300; // ms
  let _isSearchVisible = false; // Track the current state

  // [7.1] Toggle Search Function to Handle Rapid Toggles
  function _toggleSearch(show) {
    // [8.0] Toggle search visibility
    const currentlyVisible =
      _elements.container && _elements.container.classList.contains("visible");
    _isSearchVisible = currentlyVisible;

    // [8.0.1] If 'show' is explicitly specified and matches current state, debounce it
    if (show !== undefined && ((show && currentlyVisible) || (!show && !currentlyVisible))) {
      Logger.debug(`[toggleSearch] Ignoring duplicate state request: ${show}`);
      return;
    }

    // [8.0.2] Debounce logic for double-calls from 3DVista toggle button
    const now = Date.now();
    if (now - _lastToggleTime < _toggleDebounceTime) {
      Logger.debug("[toggleSearch] Ignoring rapid toggle call, debouncing");
      return;
    }
    _lastToggleTime = now;

    // [8.0.3] Enable proper toggle functionality without modifying 3DVista button code
    if (show === undefined) {
      const isCurrentlyVisible =
        _elements.container && _elements.container.classList.contains("visible");
      show = !isCurrentlyVisible;
      console.log("[toggleSearch] Toggle request - changing visibility to:", show);
    }

    // KEEP: Debug Pro integration
    if (window.searchProDebug?.logSearchToggle) {
      window.searchProDebug.logSearchToggle(show, _elements);
    }

    // [8.0.4] Validate container exists
    if (!_elements.container) {
      Logger.error("Search container not found");
      return;
    }

    // [8.0.5] Get animation configuration - FIX: Correct the logic
    const animConfig = _config.animations || {};
    const animEnabled = animConfig.enabled === true;

    console.log("🎬 Animation config:", animConfig);
    console.log("🎬 Animations enabled:", animEnabled);

    if (show) {
      Logger.debug("[toggleSearch] Showing search UI");

      // [8.0.5.1] Show search with animation
      _elements.container.style.display = "block";
      _elements.container.classList.remove("hiding", "closing", "hidden");

      if (animEnabled) {
        console.log("🎬 Applying opening animations");
        _elements.container.classList.add("opening");

        if (animConfig.searchBar?.scaleEffect) {
          _elements.container.classList.add("scale-effect");
          console.log("🎬 Scale effect enabled");
        }
      } else {
        console.log("🎬 Animations disabled - showing immediately");
      }

      // Force reflow to ensure display change is applied
      _elements.container.offsetHeight;

      _elements.container.classList.add("visible");
      _isSearchVisible = true;

      // Set ARIA expanded state
      _aria.setExpanded(_elements.input, true);

      // KEEP: Viewport adjustment logic
      const viewportHeight = window.innerHeight;
      const searchContainerRect = _elements.container.getBoundingClientRect();
      const searchContainerTop = searchContainerRect.top;
      const searchContainerHeight = searchContainerRect.height;

      if (searchContainerTop + searchContainerHeight > viewportHeight) {
        const newTop = Math.max(10, viewportHeight - searchContainerHeight - 20);
        _elements.container.style.setProperty("--container-top", `${newTop}px`);
      }

      // [8.0.5.2] Focus search input after animation
      const focusDelay = animEnabled ? animConfig.searchBar?.openDuration || 300 : 0;
      setTimeout(() => {
        if (_elements.input) _elements.input.focus();
      }, focusDelay);
    } else {
      // [8.0.5.3] Hide search with animation
      Logger.debug("[toggleSearch] Hiding search UI");

      _elements.container.classList.remove("visible", "opening");

      if (animEnabled) {
        console.log("🎬 Applying closing animations");
        _elements.container.classList.add("hiding", "closing");
      } else {
        console.log("🎬 Animations disabled - hiding immediately");
      }

      _isSearchVisible = false;

      // Clear search immediately
      if (_elements.input) {
        _elements.input.value = "";
        _elements.input.blur();
      }
      if (_elements.results) {
        _elements.results.style.display = "none";
        _elements.results.classList.remove("visible");
      }
      if (_elements.clearButton) {
        _elements.clearButton.classList.remove("visible");
      }

      // Set ARIA expanded state
      _aria.setExpanded(_elements.input, false);

      // [8.0.5.4] Wait for transition to complete before hiding (race-safe)
      const hideDelay = animEnabled ? animConfig.searchBar?.closeDuration || 200 : 0;

      // Bump token to invalidate older pending hides
      const myToken = ++_pendingHideToken;

      setTimeout(() => {
        // If another open happened since this timer started, abort this hide
        if (myToken !== _pendingHideToken) return;

        if (!_elements.container.classList.contains("visible")) {
          _elements.container.style.display = "none";
          _elements.container.classList.remove("hiding", "closing", "scale-effect");
          _elements.container.classList.add("hidden");
          console.log("🎬 Container hidden after animation delay");
        }
      }, hideDelay + 50);

      // KEEP: Extended cleanup
      setTimeout(() => {
        if (_elements.input) {
          _elements.input.value = "";
          _elements.input.blur();
        }

        // Clear UI elements
        if (_elements.clearButton) {
          _elements.clearButton.classList.remove("visible");
        }

        // Clear results
        const resultsList = _elements.container.querySelector(".results-section");
        if (resultsList) {
          resultsList.innerHTML = "";
        }

        // Hide error messages
        const noResults = _elements.container.querySelector(".no-results");
        if (noResults) {
          noResults.classList.remove("visible");
          noResults.classList.add("hidden");
        }
      }, hideDelay + 200);
    }
  }
  // [8.1] Update the ARIA state
  function _updateAnimationCSSVariables() {
    const animConfig = _config.animations || {};
    _applyAnimationFlagAndVars(animConfig);
  }

  // [8.2] Private helper to apply animation flag and CSS variables
  function _applyAnimationFlagAndVars(animConfig) {
    if (!animConfig) animConfig = {};
    const root = document.documentElement;

    console.log("🎬 Setting animation CSS variables:", animConfig);

    // Check if animations are enabled and respect reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animationsEnabled =
      animConfig.enabled && (!prefersReducedMotion || !animConfig.reducedMotion?.respectPreference);

    console.log("🎬 Animations enabled:", animationsEnabled);
    console.log("🎬 Prefers reduced motion:", prefersReducedMotion);

    // [CRITICAL FIX] Always add the .sp-anim-on class for basic styling,
    // but use CSS variables to control actual animations
    document.documentElement.classList.add("sp-anim-on");

    // Set animation state variable to control transitions in CSS
    root.style.setProperty("--animations-enabled", animationsEnabled ? "1" : "0");

    // Set timing variables
    if (animationsEnabled) {
      root.style.setProperty(
        "--animation-easing",
        animConfig.easing || "cubic-bezier(0.22, 1, 0.36, 1)"
      );
      root.style.setProperty("--animation-fast-duration", `${animConfig.duration?.fast || 200}ms`);
      root.style.setProperty(
        "--animation-normal-duration",
        `${animConfig.duration?.normal || 300}ms`
      );
      root.style.setProperty("--animation-slow-duration", `${animConfig.duration?.slow || 500}ms`);
      root.style.setProperty(
        "--animation-open-duration",
        `${animConfig.searchBar?.openDuration || 300}ms`
      );
      root.style.setProperty(
        "--animation-close-duration",
        `${animConfig.searchBar?.closeDuration || 200}ms`
      );
      root.style.setProperty(
        "--animation-results-duration",
        `${animConfig.results?.fadeInDuration || 200}ms`
      );
      root.style.setProperty(
        "--animation-slide-distance",
        `${animConfig.results?.slideDistance || 10}px`
      );
      root.style.setProperty(
        "--animation-stagger-delay",
        `${animConfig.results?.staggerDelay || 50}ms`
      );
    } else {
      // Use reduced motion settings or disable animations entirely
      const fallbackDuration = animConfig.reducedMotion?.fallbackDuration || 0;
      root.style.setProperty("--animation-easing", "ease");
      root.style.setProperty("--animation-fast-duration", `${fallbackDuration}ms`);
      root.style.setProperty("--animation-normal-duration", `${fallbackDuration}ms`);
      root.style.setProperty("--animation-slow-duration", `${fallbackDuration}ms`);
      root.style.setProperty("--animation-open-duration", `${fallbackDuration}ms`);
      root.style.setProperty("--animation-close-duration", `${fallbackDuration}ms`);
      root.style.setProperty("--animation-results-duration", `${fallbackDuration}ms`);
      root.style.setProperty("--animation-slide-distance", "0px");
      root.style.setProperty("--animation-stagger-delay", "0ms");
    }

    // Set scale effect preference
    root.style.setProperty(
      "--animation-scale-enabled",
      animationsEnabled && animConfig.searchBar?.scaleEffect ? "1" : "0"
    );

    console.log("🎬 Animation CSS variables applied");

    // [8.3] Inject animation styles
    _injectAnimationStyles(animationsEnabled);
  }

  // [8.4] Private helper to inject animation styles
  function _injectAnimationStyles(animationsEnabled) {
    // Remove existing animation styles
    const existingStyle = document.getElementById("search-animation-styles");
    if (existingStyle) {
      existingStyle.remove();
    }

    // Only inject styles if animations are enabled
    if (!animationsEnabled) return;

    const styleElement = document.createElement("style");
    styleElement.id = "search-animation-styles";
    styleElement.textContent = `
/* Search Animation Styles - Only active when .sp-anim-on is present */
.sp-anim-on #searchContainer {
  transition: opacity var(--animation-normal-duration) var(--animation-easing),
              transform var(--animation-normal-duration) var(--animation-easing);
}

.sp-anim-on .search-results {
  transition: opacity var(--animation-results-duration) var(--animation-easing);
}

.sp-anim-on .result-item {
  transition: transform var(--animation-fast-duration) var(--animation-easing),
              opacity var(--animation-fast-duration) var(--animation-easing);
}

.sp-anim-on .result-item:hover {
  transform: translateY(-2px);
}

.sp-anim-on #searchInput {
  transition: transform var(--animation-normal-duration) var(--animation-easing),
              box-shadow var(--animation-fast-duration) var(--animation-easing);
}
`;

    document.head.appendChild(styleElement);
    console.log("🎬 Animation styles injected");
  }

  // [8.5] MOBILE VISIBILITY BEHAVIOR CONTROLLER
// Wait for config to be ready before initializing
document.addEventListener("SearchConfigReady", function onSearchConfigReady() {
  try {
    if (window.__spMobileVisibilityBound) {
      Logger?.debug?.("[Mobile Visibility] Already initialized, skipping");
      return;
    }
    window.__spMobileVisibilityBound = true;

    const behavior = _config?.searchBar?.mobileOverrides?.visibility?.behavior;
    const breakpoint = _config?.searchBar?.mobileOverrides?.breakpoint || 768;
    const isMobile = window.innerWidth <= breakpoint;

    const container = _elements?.container || document.getElementById("searchContainer");
    const field = container?.querySelector(".search-field");

    if (!field) {
      Logger?.debug?.("[Mobile Visibility] No search field found — skipping");
      return;
    }

    // --- Always ensure visible by default ---
    field.style.display = "block";
    field.style.opacity = "1";

    if (!behavior) {
      Logger?.debug?.("[Mobile Visibility] No behavior defined — default to FIXED");
      return;
    }

    Logger?.info?.(`📱 Mobile visibility behavior detected: ${behavior}`);

    // [8.5.1] FIXED — always visible
    if (behavior === "fixed") {
      Logger?.debug?.("[Mobile Visibility] FIXED mode — always visible");
      return;
    }

    // [8.5.2] TOGGLE — disabled in 3DVista (prevent conflict)
    if (behavior === "toggle") {
      Logger?.debug?.("[Mobile Visibility] TOGGLE mode detected, disabled for 3DVista (safety fallback)");
      field.style.display = "block";
      field.style.opacity = "1";
      return;
    }

    // [8.5.3] DYNAMIC — optional safe fallback (only applies if scrolling exists)
    if (behavior === "dynamic") {
      if (!isMobile) {
        Logger?.debug?.("[Mobile Visibility] Not mobile, skipping DYNAMIC behavior");
        return;
      }

      let lastScrollY = window.scrollY;
      let scrollTimeout;
      const threshold = _config?.searchBar?.mobileOverrides?.visibility?.hideThreshold || 50;

      field.style.transition = "opacity 0.3s ease, transform 0.3s ease";

      window.addEventListener("scroll", () => {
        const currY = window.scrollY;
        const diff = currY - lastScrollY;
        if (Math.abs(diff) < 10) return;

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          if (diff > threshold && currY > 100) {
            field.style.opacity = "0";
            field.style.transform = "translateY(-10px)";
            Logger?.debug?.("⬇️ Dynamic: Hide on scroll down");
          } else if (diff < -threshold) {
            field.style.opacity = "1";
            field.style.transform = "translateY(0)";
            Logger?.debug?.("⬆️ Dynamic: Show on scroll up");
          }
          lastScrollY = currY;
        }, 100);
      });

      Logger?.debug?.(`[Mobile Visibility] DYNAMIC mode active (threshold ${threshold}px)`);
      return;
    }

    // [8.5.4] Resize guard — ensures visibility on desktop switch
    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const nowMobile = window.innerWidth <= breakpoint;
        if (!nowMobile && field.style.display === "none") {
          field.style.display = "block";
          field.style.opacity = "1";
          field.style.transform = "translateY(0)";
          Logger?.debug?.("[Mobile Visibility] Switched to desktop, ensuring field visible");
        }
      }, 250);
    });

  } catch (err) {
    Logger?.warn?.("⚠️ Mobile visibility behavior error:", err);
  }
});

// [8.9] Expose business data loader globally (for async post-init and debug)
window._loadBusinessData = _loadBusinessData;
  // [9.0] Public API
  return {
    // [9.0.1] DOM Elements Cache
    elements: _elements,
    // [9.0.2] Initialize Search Functionality
    initializeSearch: function (tour) {
      try {
        if (!tour) {
          throw new Error("Tour instance is required for initialization");
        }

        // [9.0.2.0.1] Find the search container if it's not already set
        if (!_elements.container) {
          _elements.container = document.getElementById("searchContainer");
          if (!_elements.container) {
            throw new Error(
              "Search container not found. Element with ID 'searchContainer' is required."
            );
          }
        }

        _initializeSearch(tour);

        // [9.0.2.1] BUSINESS DATA POST-INIT LOADER (Safe incremental merge)
        try {
          if (_config?.businessData?.useBusinessData && typeof _loadBusinessData === "function") {
            Logger.info("[BusinessData] Initiating asynchronous data load...");
            _loadBusinessData().then((data) => {
              if (Array.isArray(data) && data.length) {
                Logger.info(`[BusinessData] Loaded ${data.length} entries — merging into search index...`);
                if (typeof _prepareSearchIndex === "function") {
                  // Rebuild index including business data
                  fuse = _prepareSearchIndex(tour, _config);
                  Logger.info("✅ Business data successfully integrated into Fuse index");
                } else {
                  Logger.warn("⚠️ _prepareSearchIndex unavailable — storing data for deferred merge");
                  _config._pendingBusinessData = data;
                }
              } else {
                Logger.info("[BusinessData] No valid entries found to merge");
              }
            }).catch((err) => {
              Logger.warn("[BusinessData] Failed to load business data:", err);
            });
          }
        } catch (e) {
          Logger.warn("[BusinessData] Unexpected loader error:", e);
        }
      } catch (error) {
        Logger.error("Search initialization failed:", error);
      }
    },

    // [10.0] Toggle Search Visibility
    toggleSearch: function (show) {
      // Find the search container if it's not already set
      if (!_elements.container) {
        _elements.container = document.getElementById("searchContainer");
        if (!_elements.container) {
          Logger.error(
            "Search container not found. Element with ID 'searchContainer' is required."
          );
          return;
        }
      }
      _toggleSearch(show);
    },

    // [CFG.UPDATE] updateConfig (merge + normalize)
    updateConfig: function (patch) {
      try {
        if (!patch || typeof patch !== "object") {
          Logger.warn("No valid configuration provided for update");
          return this.getConfig();
        }

        // Map legacy names on input
        const processedPatch = { ...patch };

        // minSearchLength → minSearchChars
        if (patch.minSearchLength !== undefined) {
          processedPatch.minSearchChars = patch.minSearchLength;
          delete processedPatch.minSearchLength;
        }

        // allowedMediaIndexes → filter.mediaIndexes.allowed (do not change mode)
        if (patch.allowedMediaIndexes !== undefined) {
          if (!processedPatch.filter) processedPatch.filter = {};
          if (!processedPatch.filter.mediaIndexes) processedPatch.filter.mediaIndexes = {};
          processedPatch.filter.mediaIndexes.allowed = patch.allowedMediaIndexes;
          delete processedPatch.allowedMediaIndexes;
        }

        // blacklistedMediaIndexes → filter.mediaIndexes.blacklisted
        if (patch.blacklistedMediaIndexes !== undefined) {
          if (!processedPatch.filter) processedPatch.filter = {};
          if (!processedPatch.filter.mediaIndexes) processedPatch.filter.mediaIndexes = {};
          processedPatch.filter.mediaIndexes.blacklisted = patch.blacklistedMediaIndexes;
          delete processedPatch.blacklistedMediaIndexes;
        }

        // If thumbnailSettings.thumbnailSize is "small"|"medium"|"large", convert to pixels
        if (processedPatch.thumbnailSettings?.thumbnailSize) {
          const sizeMap = { small: "32px", medium: "48px", large: "64px" };
          const size = processedPatch.thumbnailSettings.thumbnailSize;
          if (sizeMap[size]) {
            processedPatch.thumbnailSettings.thumbnailSize = sizeMap[size];
          }
        }

        // Deep merge only known keys (ignore unknowns)
        function deepMerge(target, source) {
          if (!source) return target;
          if (!target) return source;

          for (const key in source) {
            if (!Object.prototype.hasOwnProperty.call(source, key) || source[key] === undefined) {
              continue;
            }

            if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
              if (!target[key] || typeof target[key] !== "object") {
                target[key] = {};
              }
              deepMerge(target[key], source[key]);
            } else {
              target[key] = source[key];
            }
          }
          return target;
        }

        // Merge processed patch into _config
        _config = deepMerge(_config, processedPatch);

        // After merging, run a single normalization pass
        function normalizeArray(arr) {
          if (!Array.isArray(arr)) return [];
          return arr
            .map((v) => (typeof v === "string" ? v.trim() : String(v).trim()))
            .filter((v) => v.length > 0)
            .filter((value, index, array) => array.indexOf(value) === index); // dedupe
        }

        if (_config.filter) {
          // Normalize filter arrays
          if (_config.filter.allowedValues) {
            _config.filter.allowedValues = normalizeArray(_config.filter.allowedValues);
          }
          if (_config.filter.blacklistedValues) {
            _config.filter.blacklistedValues = normalizeArray(_config.filter.blacklistedValues);
          }

          if (_config.filter.elementLabels) {
            if (_config.filter.elementLabels.allowedValues) {
              _config.filter.elementLabels.allowedValues = normalizeArray(
                _config.filter.elementLabels.allowedValues
              );
            }
            if (_config.filter.elementLabels.blacklistedValues) {
              _config.filter.elementLabels.blacklistedValues = normalizeArray(
                _config.filter.elementLabels.blacklistedValues
              );
            }
          }

          if (_config.filter.tagFiltering) {
            if (_config.filter.tagFiltering.allowedTags) {
              _config.filter.tagFiltering.allowedTags = normalizeArray(
                _config.filter.tagFiltering.allowedTags.map((t) => t.toLowerCase())
              );
            }
            if (_config.filter.tagFiltering.blacklistedTags) {
              _config.filter.tagFiltering.blacklistedTags = normalizeArray(
                _config.filter.tagFiltering.blacklistedTags.map((t) => t.toLowerCase())
              );
            }
          }

          if (_config.filter.mediaIndexes) {
            if (_config.filter.mediaIndexes.allowed) {
              _config.filter.mediaIndexes.allowed = normalizeArray(
                _config.filter.mediaIndexes.allowed
              );
            }
            if (_config.filter.mediaIndexes.blacklisted) {
              _config.filter.mediaIndexes.blacklisted = normalizeArray(
                _config.filter.mediaIndexes.blacklisted
              );
            }
          }
        }

        // Leave a small debug log summarizing changed keys
        const changedKeys = Object.keys(processedPatch);
        Logger.debug(`[CFG.UPDATE] Updated keys: ${changedKeys.join(", ")}`);

        // --- [POST-MERGE APPLY] make updates live without re-init ---
        try {
          const styleTouch = changedKeys.some((k) =>
            /^(appearance|thumbnailSettings|iconSettings|displayLabels|useAsLabel|animations)/.test(
              k
            )
          );
          const indexTouch = changedKeys.some((k) =>
            /^(filter|includeContent|searchSettings|fuse|behavior|googleSheets|businessData)/.test(
              k
            )
          );

          if (styleTouch) {
            // Re-apply CSS variables, widths, placeholders, icons, etc.
            _applySearchStyling && _applySearchStyling();
            _updateAnimationCSSVariables && _updateAnimationCSSVariables();
          }

          if (indexTouch) {
            // Rebuild the Fuse index and refresh visible results if any query is active
            if (typeof _rebuildIndex === "function") {
              _rebuildIndex();
            } else {
              Logger?.debug?.("Reindex deferred; initializeSearch not completed yet.");
            }
            if (typeof currentSearchTerm === "string" && currentSearchTerm.trim()) {
              // Re-run search with the current term to refresh results instantly
              performSearch && performSearch(currentSearchTerm);
            }
          }

          Logger.info("Config patch applied without re-init", {
            styleTouch,
            indexTouch,
            changedKeys,
          });
        } catch (e) {
          Logger.warn("updateConfig post-merge apply failed; falling back to re-init", e);
          if (window.tourInstance && typeof initializeSearch === "function") {
            initializeSearch(window.tourInstance);
          }
        }

        return this.getConfig();
      } catch (error) {
        _log("error", "Error updating configuration:", error);
        return this.getConfig();
      }
    },

    // [10.0.1] Get Current Configuration
    getConfig: function () {
      try {
        return JSON.parse(JSON.stringify(_config));
      } catch (error) {
        Logger.error("Error getting configuration:", error);
        return {};
      }
    },

    // [10.0.2] Search History Management
    searchHistory: {
      get() {
        return []; // No history feature
      },
      clear() {
        return true; // No history feature
      },
      save(term) {
        return true; // No history feature
      },
    },

    // [10.0.3] Logging Control
    setLogLevel(level) {
      // Use the centralized Logger's setLevel method instead of directly modifying Logger.level
      return Logger.setLevel(level);
    },

    // [10.0.4] Utility Functions
    utils: {
      debounce: _debounce,
      getElementType: _getElementType,
      triggerElement: _triggerElement,
      normalizeImagePath: _normalizeImagePath,

      // [10.0.4.1] Size formatting utility
      makeSizePxString: function (size) {
        // Handle null, undefined, or empty values
        if (size == null || size === "") return "0px";

        // If it's already a string with a unit (px, em, rem, etc.), return as is
        if (typeof size === "string") {
          // Check if it already has a CSS unit
          if (/^\d+(\.\d+)?(%|px|em|rem|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc)$/.test(size)) {
            return size;
          }

          // If it's a string number without unit, parse it and add px
          const num = parseFloat(size);
          if (!isNaN(num)) {
            return `${num}px`;
          }

          // Default for invalid string
          return "0px";
        }

        // If it's a number, add px unit
        if (typeof size === "number") {
          return `${size}px`;
        }

        // Default for any other type
        return "0px";
      },

      // [10.0.4.2] Utility for image handling
      imageUtils: {
        getImageExtension: function (path) {
          if (!path) return "";
          const match = path.match(/\.([^.]+)$/);
          return match ? match[1].toLowerCase() : "";
        },

        isImagePath: function (path) {
          if (!path) return false;
          const ext = this.getImageExtension(path);
          return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
        },

        getAlternateFormat: function (path) {
          if (!path) return "";
          const ext = this.getImageExtension(path);

          if (ext === "jpg" || ext === "jpeg") {
            return path.replace(/\.(jpg|jpeg)$/i, ".png");
          } else if (ext === "png") {
            return path.replace(/\.png$/i, ".jpg");
          }

          return "";
        },
      },
    },

    // [10.0.5] Expose Google Sheets Data Accessor
    _getGoogleSheetsData: function () {
      return _googleSheetsData || [];
    },
    // [10.0.6] Expose Business Data Accessor
    _getBusinessData: function () {
      return _businessData || [];
    },

    // [10.0.7] Expose Search Index Accessor
    getSearchIndex: function () {
      return fuse ? fuse._docs || [] : [];
    },

    // [10.0.8] Expose Business Matching Function
    findBusinessMatch: function (elementData) {
      return findBusinessMatch(elementData);
    },
  };
})();

// [CFG.WINDOW] window.searchFunctions unified with canonical getConfig/updateConfig
window.searchFunctions = {
  ...window.tourSearchFunctions,
  // Override with canonical functions from above
  getConfig: window.tourSearchFunctions.getConfig,
  updateConfig: window.tourSearchFunctions.updateConfig,
};

// [10.1] Method: ensurePlaylistsReady() - Combined Playlist Readiness Detection Utility
function ensurePlaylistsReady(callback) {
  if (
    window.tour &&
    window.tour._isInitialized &&
    window.tour.mainPlayList &&
    typeof window.tour.mainPlayList.get === "function" &&
    window.tour.mainPlayList.get("items") &&
    window.tour.mainPlayList.get("items").length > 0
  ) {
    callback();
    return;
  }
  if (
    window.tour &&
    typeof window.TDV !== "undefined" &&
    window.TDV.Tour &&
    window.TDV.Tour.EVENT_TOUR_LOADED &&
    typeof window.tour.bind === "function"
  ) {
    window.tour.bind(window.TDV.Tour.EVENT_TOUR_LOADED, callback);
  } else {
    setTimeout(() => ensurePlaylistsReady(callback), 100);
  }
}

// [CACHE BUSTER v2] - Force browser refresh - Timestamp: 1752343890000
document.addEventListener("DOMContentLoaded", function () {
  // [10.2] Wait for a short time to ensure DOM is stable
  setTimeout(function () {
    if (!window.Logger || typeof window.Logger.debug !== "function") {
      console.warn("[Search] Logger not properly initialized, using console fallback");
      window.Logger = window.Logger || {};

      // [STEP E] Safety guard: Add level property for fallback logger
      if (typeof window.Logger.level === "undefined") {
        window.Logger.level = 0; // Default to debug level for fallback
      }

      window.Logger.debug =
        window.Logger.debug ||
        function (msg) {
          if (window.Logger.level > 0) return; // Skip debug if level > 0
          if (arguments.length > 1) {
            var args = Array.prototype.slice.call(arguments, 1);
            console.debug("[Search] DEBUG:", msg, args);
          } else {
            console.debug("[Search] DEBUG:", msg);
          }
        };
      window.Logger.info =
        window.Logger.info ||
        function (msg) {
          if (window.Logger.level > 1) return; // Skip info if level > 1
          if (arguments.length > 1) {
            var args = Array.prototype.slice.call(arguments, 1);
            console.info("[Search] INFO:", msg, args);
          } else {
            console.info("[Search] INFO:", msg);
          }
        };
      window.Logger.warn =
        window.Logger.warn ||
        function (msg) {
          if (window.Logger.level > 2) return; // Skip warn if level > 2
          if (arguments.length > 1) {
            var args = Array.prototype.slice.call(arguments, 1);
            console.warn("[Search] WARN:", msg, args);
          } else {
            console.warn("[Search] WARN:", msg);
          }
        };
      window.Logger.error =
        window.Logger.error ||
        function (msg) {
          if (window.Logger.level > 3) return; // Skip error if level > 3
          if (arguments.length > 1) {
            var args = Array.prototype.slice.call(arguments, 1);
            console.error("[Search] ERROR:", msg, args);
          } else {
            console.error("[Search] ERROR:", msg);
          }
        };
    }

    // [10.2.1] Logic Block: Find the search container in DOM
    const containerEl = document.getElementById("searchContainer");

    // [10.2.2] Logic Block: If container exists in DOM but not in cache, update the cache
    if (containerEl && (!window.searchFunctions || !window.searchFunctions.elements.container)) {
      Logger.debug("[Search] Found existing searchContainer in DOM, updating element cache");

      // [10.2.2.1] Logic Block: Update the elements cache directly
      if (window.searchFunctions && window.searchFunctions.elements) {
        window.searchFunctions.elements.container = containerEl;

        // [10.2.2.1.1] Logic Block: Also update child element references
        window.searchFunctions.elements.input = containerEl.querySelector("#tourSearch");
        window.searchFunctions.elements.results = containerEl.querySelector(".search-results");
        window.searchFunctions.elements.clearButton = containerEl.querySelector(".clear-button");
        window.searchFunctions.elements.searchIcon = containerEl.querySelector(".search-icon");
      }
    }
    // ==========================================
    // *** THIS IS WHERE END USERS CAN START MAKING CHANGES and Control Panel should be built based on this ***
    //     Configure your search experience.
    // ==========================================

    // [10.2.3] Now update the config
    if (window.searchFunctions) {
      window.searchFunctions.updateConfig({
        // ==========================================
        // GENERAL TAB - Search Bar Settings
        // ==========================================
        // [10.2.3.0.1] General Settings
        autoHide: {
          mobile: false, // Auto-hide search on mobile after selection
          desktop: false, // Auto-hide search on desktop after selection
        },
        mobileBreakpoint: 768, // Breakpoint for mobile devices
        minSearchChars: 2, // Minimum characters required for search
        showTagsInResults: true, // Show tags in search results
        elementTriggering: {
          initialDelay: 300, // Initial delay before triggering element
          maxRetries: 3, // Maximum number of retries
          retryInterval: 300, // Interval between retries
          maxRetryInterval: 1000, // Maximum retry interval
          baseRetryInterval: 300, // Base retry interval
        },

        // [10.2.3.0.2] Search Bar Positioning and Layout
        searchBar: {
          placeholder: "Search... Type * for all", // Placeholder text for search input
          width: 350, // Width in pixels or percentage (e.g., "100%")
          position: {
            top: 70, // Position from top
            right: 70, // Position from right
            left: null, // Position from left (use null if positioning from right)
            bottom: null, // Position from bottom (use null if positioning from top)
          },
          useResponsive: true, // Whether to use responsive positioning
          mobilePosition: {
            top: 60, // Position from top on mobile
            left: 20, // Position from left on mobile
            right: 20, // Position from right on mobile
            bottom: "auto", // Position from bottom on mobile
          },
          mobileOverrides: {
            enabled: true, // Enable mobile-specific overrides
            breakpoint: 768, // Mobile breakpoint in pixels
            width: "90%", // Width on mobile (can be percentage)
            maxWidth: 350, // Maximum width on mobile in pixels
            visibility: {
              behavior: "dynamic", // 'dynamic', 'fixed', 'toggle'
              showOnScroll: true, // Show when scrolling
              hideThreshold: 100, // Hide when scrolling past this threshold
            },
          },
        },

        // ==========================================
        // APPEARANCE TAB - Visual Style Settings
        // ==========================================
        // [10.2.3.0.3] Appearance Settings
        appearance: {
          searchField: {
            borderRadius: {
              topLeft: 35, // *** Top left border radius (px)
              topRight: 35, // *** Top right border radius (px)
              bottomRight: 35, // *** Bottom right border radius (px)
              bottomLeft: 35, // *** Bottom left border radius (px)
            },

            // Typography Controls
            typography: {
              // Input text styling
              fontSize: "16px", // *** Font size for input text
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif", // *** Font family ("Arial", "Helvetica", "inherit")
              fontWeight: "400", // *** Font weight (100-900, "normal", "bold")
              fontStyle: "normal", // *** Font style ("normal", "italic", "oblique")
              lineHeight: "1.5", // *** Line height (number or "1.2", "normal")
              letterSpacing: "0px", // *** Letter spacing ("0.5px", "normal")
              textTransform: "none", // *** Text transform ("none", "uppercase", "lowercase", "capitalize")

              // Placeholder specific styling
              placeholder: {
                fontSize: "16px", // *** Placeholder font size
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif", // *** Placeholder font family
                fontWeight: "400", // *** Placeholder font weight
                fontStyle: "italic", // *** Placeholder font style (italic for emphasis or normal)
                opacity: 0.7, // *** Placeholder opacity (0.0-1.0)
                letterSpacing: "0px", // *** Placeholder letter spacing
                textTransform: "none", // *** Placeholder text transform
              },

              // Focus state styling
              focus: {
                fontSize: "16px", // *** Font size when focused
                fontWeight: "400", // *** Font weight when focused
                letterSpacing: "0.25px", // *** Letter spacing when focused
              },
            },
          },

          searchResults: {
            borderRadius: {
              topLeft: 5, // *** Top left border radius (px)
              topRight: 5, // *** Top right border radius (px)
              bottomRight: 5, // *** Bottom right border radius (px)
              bottomLeft: 5, // *** Bottom left border radius (px)
            },
          },

          // [10.2.3.0.4] Color Settings
          colors: {
            searchBackground: "#f4f3f2", // *** Search bar background color
            searchText: "#1a1a1a", // *** Search bar text color
            placeholderText: "#94a3b8", // *** Search bar placeholder text color
            searchIcon: "#94a3b8", // *** Search bar icon color
            clearIcon: "#94a3b8", // *** Search bar clear icon color

            resultsBackground: "#ffffff", // *** Search results background color
            groupHeaderBackground: "#ffffff", // *** Search results group header background color
            groupHeaderColor: "#20293A", // *** Search results group header color
            groupCountColor: "#94a3b8", // *** Search results group count color
            resultHover: "#f0f0f0", // *** Search results hover color
            resultBorderLeft: "#ebebeb", // *** Search results border left color
            resultText: "#1e293b", // *** Search results text color
            resultSubtitle: "#64748b", // *** Search results subtitle color
            resultIconColor: "#6e85f7", // *** Search results icon color
            resultSubtextColor: "#000000", // *** Search results subtext color
            tagBackground: "#e0f2fe", // *** Light blue background for tags
            tagText: "#0369a1", // *** Dark blue text for tags
            tagBorder: "#0891b2", // *** Medium blue border for tags

            // *** Search results highlight colors
            highlightBackground: "#ffff00", // *** Highlight background color (default: yellow)
            highlightBackgroundOpacity: 0.5, // *** Highlight background opacity (0-1)
            highlightText: "#000000", // *** Highlight text color
            highlightWeight: "bold", // *** Highlight font weight: 'normal', 'bold', etc.
          },

          // [10.2.3.0.5] Tag Appearance Settings
          tags: {
            borderRadius: 16, // *** Rounded tag pills (0-20 recommended)
            fontSize: "11px", // *** Tag text size
            padding: "3px 10px", // *** Internal spacing (vertical horizontal)
            margin: "2px", // *** Space between tags
            fontWeight: "600", // *** Text weight (400=normal, 600=semibold, 700=bold)
            textTransform: "uppercase", // *** "none", "uppercase", "lowercase", "capitalize"
            showBorder: true, // *** true or false - Show tag borders
            borderWidth: "1px", // *** Border thickness
          },
        },

        // [10.2.3.0.6] Thumbnail Settings
        thumbnailSettings: {
          enableThumbnails: false, // *** true or false - Enable custom thumbnails
          thumbnailSize: "48px", // "16px", "24px", "32px", "48px", "64px", "80px", "96px"
          borderRadius: 4, // *** Border radius in pixels
          borderColor: "#9CBBFF", // *** Border color for thumbnails
          borderWidth: 4, // *** Border width in pixels
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
            "3DModel": "assets/3d-model-default.jpg",
            "3DHotspot": "assets/3d-hotspot-default.jpg",
            "3DModelObject": "assets/3d-model-object-default.jpg",
            default: "assets/default-thumbnail.jpg",
          },

          // [10.2.3.0.7] ICON SETTINGS CONFIGURATION
          iconSettings: {
            enableCustomIcons: false, // // *** true or false Enable/disable the entire icon system
            enableFontAwesome: false, // // *** true or false - Enable Font Awesome icons

            // *** IMPORTANT: Icon Type Guidelines ***
            // - enableFontAwesome: false + "fas fa-home" → Falls back to default SVG
            // - enableFontAwesome: true + "fas fa-home" → Uses Font Awesome icon
            // - enableFontAwesome: false + "🏠" → Uses emoji (works regardless)
            // - enableFontAwesome: false + custom SVG → Uses custom SVG (works regardless)

            // *** Optional custom Font Awesome URL
            fontAwesomeUrl:
              "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css", // *** Optional custom URL

            // ==========================================
            // BASIC ICON SETTINGS
            // ==========================================
            iconSize: "48px", // "16px", "24px", "32px", "48px", "64px", "80px", "96px"
            iconColor: "#3b82f6", // *** Default color for all icons
            iconOpacity: 0.9, // *** Icon transparency (0.0 = invisible, 1.0 = solid)

            // ==========================================
            // ICON LAYOUT & POSITIONING
            // ==========================================
            iconAlignment: "left", // "left" or "right" - Position relative to text
            iconMargin: 12, // *** Space between icon and text (pixels)
            iconBorderRadius: 6, // *** Rounded corners for icon containers

            // ==========================================
            // ICON HOVER EFFECTS
            // ==========================================
            enableIconHover: true, // // *** true or false - Enable hover animations
            iconHoverScale: 1.15, // *** Size increase on hover (1.0 = no change)
            iconHoverOpacity: 1.0, // *** Opacity on hover

            // ==========================================
            // CUSTOM ICONS FOR EACH ELEMENT TYPE
            // ==========================================
            customIcons: {
              // Use Font Awesome classes, SVG icons strings, image URLs or emojis for each element type
              // *** If enableFontAwesome is FALSE, use emojis or custom SVGs instead of FA classes ***
              Panorama: "fas fa-home", // House for panoramic scenes or 🏠 emojis for others
              Hotspot: "fas fa-laptop", // Pin for hotspots or 💻 emojis for others
              Polygon: "fas fa-diamond", // Diamond for polygon areas or 💎 emojis for others
              Video: "fas fa-video", // Clapper for videos or 🎥 emojis for others
              Webframe: "fas fa-laptop", // Globe for web content or 🌐 emojis for others
              Image: "fas fa-image", // Frame for images or 🖼️ emojis for others
              Text: "fas fa-file-alt", // Note for text elements or 📝 emojis for others
              ProjectedImage: "fas fa-desktop", // Monitor for projected images or 🖥️ emojis for others
              Element: "fas fa-circle", // Circle for generic elements or ⚪ emojis for others
              Business: "fas fa-building", // Building for business locations or 🏢 emojis for others
              "3DHotspot": "fas fa-gamepad", // Controller for 3D interactions or 🎮 emojis for others
              Container: "fas fa-window-restore", // Window for containers or 📦 emojis for others
              "3DModel": "fas fa-cube", // Cube for 3D models or 🟥 emojis for others
              "3DModelObject": "fas fa-wrench", // Wrench for 3D objects or 🔧 emojis for others
              default: "fas fa-circle", // Default fallback icon or ⚪ emojis for others

              // FONT AWESOME EXAMPLES (if you have Font Awesome loaded):
              // Panorama: "fas fa-home",
              // Hotspot: "fas fa-map-marker-alt",

              // CUSTOM SVG EXAMPLES:
              // Panorama: "<svg viewBox='0 0 24 24'><path d='M12 2L2 7v10c0 5.55 3.84 10 9 10s9-4.45 9-10V7L12 2z'/></svg>",
              // Hotspot: "<svg viewBox='0 0 24 24'><circle cx='12' cy='12' r='10'/></svg>",

              // CUSTOM EMOJI EXAMPLES:
              // Panorama: "🏠", // House emoji for panoramas
              // Hotspot: "📍", // Location pin emoji for hotspots

              // IMAGE URL EXAMPLES:
              // Panorama: "url('./icons/home.png')",
              // Hotspot: "url('./icons/pin.svg')",
            },

            // ==========================================
            // ICON VISIBILITY CONTROL
            // ==========================================
            // Control which element types show icons vs hide them completely
            showIconFor: {
              panorama: true, // *** Show icons for panoramic scenes
              hotspot: true, // *** Show icons for clickable hotspots
              polygon: true, // *** Show icons for polygon areas
              video: true, // *** Show icons for video content
              webframe: true, // *** Show icons for embedded web content
              image: true, // *** Show icons for image overlays
              text: true, // *** Show icons for text elements (clean look)
              projectedImage: true, // *** Show icons for projected images
              element: true, // *** Show icons for generic elements
              business: true, // *** Show icons for business locations
              "3dmodel": true, // *** Show icons for 3D models
              "3dhotspot": true, // *** Show icons for 3D hotspots
              "3dmodelobject": true, // *** Show icons for 3D object parts
              container: true, // *** Show icons for UI containers
              other: true, // *** Show icons for unrecognized types
            },

            // ==========================================
            // ERROR HANDLING & FALLBACKS
            // ==========================================
            fallbackSettings: {
              useDefaultOnError: true, // *** Use default icon if custom icon fails
              hideIconOnError: false, // *** Completely hide icon if custom fails
              showTypeLabel: false, // *** Show "HOTSPOT", "VIDEO" text instead of icon
            },
          },
          // [10.2.3.0.8] Thumbnail Grouping Settings
          groupHeaderAlignment: "left", // "left","right"
          groupHeaderPosition: "top", // "top", "bottom"
          showFor: {
            panorama: true, // *** Show thumbnails for panoramas
            hotspot: true, // *** Show thumbnails for hotspots
            polygon: true, // *** Show thumbnails for polygons
            video: true, // *** Show thumbnails for videos
            webframe: true, // *** Show thumbnails for webframes
            image: true, // *** Show thumbnails for images
            text: true, // *** Show thumbnails for text elements
            projectedImage: true, // *** Show thumbnails for projected images
            element: true, // *** Show thumbnails for elements
            business: true, // *** Show thumbnails for businesses
            container: true, // *** Show thumbnails for UI containers
            "3dmodel": true, // *** Show thumbnails for 3D models
            "3dhotspot": true, // *** Show thumbnails for 3D hotspots
            "3dmodelobject": true, // *** Show thumbnails for 3D model objects
            other: true, // *** Show thumbnails for other elements
          },
        },

        // ==========================================
        // DISPLAY TAB - Control How Elements Appear
        // ==========================================
        // [10.2.3.0.9] Display Settings
        display: {
          showGroupHeaders: true, // Show group headers in search results
          showGroupCount: true, // Show count of items in each group
          showIconsInResults: true, // Show icons in search results
          showSubtitlesInResults: true, // Show subtitles in search results
          showParentInfo: true, // Show parent info for child elements
        },

        // [10.2.3.0.10] Label Customization
        displayLabels: {
          Panorama: "Panorama", // *** Display label for panoramas
          Hotspot: "Hotspot", // *** Display label for hotspots
          Polygon: "Polygon", // *** Display label for polygons
          Video: "Video", // *** Display label for videos
          Webframe: "Webframe", // *** Display label for webframes
          Image: "Image", // *** Display label for images
          Text: "Text", // *** Display label for text elements
          ProjectedImage: "Projected Image", // *** Display label for projected images
          Element: "Element", // *** Display label for elements
          Business: "Business", // *** Display label for businesses
          "3DHotspot": "3D Hotspot", // *** Display label for 3D hotspots
          "3DModel": "3D Model", // *** Display label for 3D models
          "3DModelObject": "3D Model Object", // *** Display label for 3D model objects
          Container: "Container", // *** Display label for UI containers
        },

        // [10.2.3.0.11] Label Fallback Options
        useAsLabel: {
          subtitles: true, // Use subtitles as labels when labels are missing
          tags: true, // Use tags as labels when labels and subtitles are missing
          elementType: false, // Use element type as label when all else is missing
          parentWithType: false, // Include parent type with label
          customText: "[Unnamed Item]", // Custom text for unnamed items
        },

        // ==========================================
        // CONTENT TAB - Control What Appears in Search
        // ==========================================
        // [10.2.3.0.12] Content Inclusion Options
        includeContent: {
          unlabeledWithSubtitles: true, // Include items with no label but with subtitles
          unlabeledWithTags: true, // Include items with no label but with tags
          completelyBlank: true, // Include completely blank items

          // Include all types of elements in search results
          elements: {
            includePanoramas: true, // Include panoramas in search results
            includeHotspots: true, // Include hotspots in search results
            includePolygons: true, // Include polygons in search results
            includeVideos: true, // Include videos in search results
            includeWebframes: true, // Include webframes in search results
            includeImages: true, // Include images in search results
            includeText: true, // Include text elements in search results
            includeProjectedImages: true, // Include projected images in search results
            include3DHotspots: true, // Include 3D hotspots in search results
            include3DModels: true, // Include 3D models in search results
            include3DModelObjects: true, // Include 3D model objects in search results
            includeBusiness: true, // Include business elements in search results
            includeContainers: true, // Include UI containers in search results
            skipEmptyLabels: true, // Skip elements with empty labels
            minLabelLength: 0, // Minimum label length to include in search results
          },

          // Config: Container search integration
          containerSearch: {
            enableContainerSearch: true, // Enable container search functionality
            containerNames: [""], // Array of container names to include in search results i.e "My_Container","TwinsViewer-Container"
          },
        },

        // ==========================================
        // FILTERING TAB - Filter Which Content Appears
        // ==========================================
        // OVERVIEW: Filtering allows you to control which content appears in search results.
        // - Use "whitelist" mode to ONLY show specified content
        // - Use "blacklist" mode to HIDE specified content
        // - Use "none" mode to disable filtering (show everything)
        // ==========================================

        // [10.2.3.0.13] Element Filtering Options
        filter: {
          // Top-level filter controls ALL content based on label/value text matching
          mode: "none", // "none" (show all), "whitelist" (only show allowed), "blacklist" (hide specified)
          allowedValues: [""], // Values to allow if mode is "whitelist" - any text that appears in labels/subtitles
          blacklistedValues: [""], // Values to block if mode is "blacklist" - any text that appears in labels/subtitles

          // Value matching modes control how filter values are compared with element labels
          valueMatchMode: {
            whitelist: "exact", // "exact" (complete match), "contains" (partial match), "startsWith", "regex"
            blacklist: "contains", // "contains" is safer default for blacklists (catches variants)
          },

          // Media index filtering with proper mode control - filter specific panoramas by position in tour
          mediaIndexes: {
            mode: "none", // "none" (show all), "whitelist" (only show allowed), "blacklist" (hide specified)
            allowed: [""], // Panorama indexes to allow when mode is "whitelist", e.g. ["0", "1", "5"] shows only the 1st, 2nd, and 6th panoramas
            blacklisted: [""], // Panorama indexes to block when mode is "blacklist", e.g. ["0", "3"] hides the 1st and 4th panoramas
          },

          // Filter based on element type (Panorama, Hotspot, Video, etc.)
          elementTypes: {
            mode: "none", // "none" (show all types), "whitelist" (only show specified types), "blacklist" (hide specified types)
            allowedTypes: [""], // Element types to include, ["Panorama", "Hotspot", "3DModel"] will ONLY show these types
            // Complete List of Available Element Types: "Panorama", "Hotspot", "Polygon", "Video", "Webframe", "Image", "Text", "ProjectedImage", "Element", "Business", "Container","3DModel", "3DHotspot", "3DModelObject"
            blacklistedTypes: [""], // Element types to exclude, e.g. ["Text", "Element"] will HIDE these types but show all others
            // Complete List of Available Element Types: "Panorama", "Hotspot", "Polygon", "Video", "Webframe", "Image", "Text", "ProjectedImage", "Element", "Business", "Container","3DModel", "3DHotspot", "3DModelObject"
          },

          // Filter based on partial text matches in element labels
          elementLabels: {
            mode: "none", // "none" (show all labels), "whitelist" (only labels containing allowed text), "blacklist" (hide labels with specified text)
            allowedValues: [""], // Show only elements with these words in their labels, e.g. ["Room", "Office"] shows only elements containing "Room" or "Office"
            blacklistedValues: [""], // Hide elements with these words in their labels, e.g. ["test", "temp"] hides elements containing "test" or "temp"
          },

          // Filter based on assigned tags (useful when your tour content uses tags)
          tagFiltering: {
            mode: "none", // "none" (show all tags), "whitelist" (only show elements with specified tags), "blacklist" (hide elements with specified tags)
            allowedTags: [""], // Tags to allow, e.g. ["important", "featured_location"] shows only elements with these tags
            blacklistedTags: [""], // Tags to block, e.g. ["hidden", "internal"] hides elements with these tags
          },
        },

        // ==========================================
        // ADVANCED TAB - Animation and Search Behavior
        // ==========================================
        // [10.2.3.0.14] Animation Settings
        // Control how search interactions feel - smooth vs snappy vs disabled
        animations: {
          // *** MASTER ANIMATION TOGGLE ***
          enabled: false, // *** true/false - Enable ALL animations (false = instant actions, no transitions)
          // TIP: Set to false for performance on slow devices or for users who prefer instant responses

          // *** TIMING GROUPS - Controls speed of different animation categories ***
          duration: {
            // Base timing values used throughout the search interface (in milliseconds)
            fast: 600, // *** TESTING: Increased from 250ms - Quick animations for instant feedback (button hovers, icon changes)
            // RECOMMENDED: 150-250ms for responsive feel, 100ms for very snappy, 300ms for slightly smoother

            normal: 800, // *** TESTING: Increased from 250ms - Standard animations for main interactions (opening panels, transitions)
            // RECOMMENDED: 250-350ms for balanced feel, 200ms for quick, 400-500ms for more deliberate

            slow: 1200, // *** TESTING: Increased from 400ms - Slower animations for complex transitions (page changes, major state changes)
            // RECOMMENDED: 400-600ms for smooth feel, 300ms for quicker, 700-800ms for very smooth
          },
          // *** ANIMATION STYLE - Controls how animations feel ***
          easing: "cubic-bezier(0.68, -0.55, 0.265, 1.55)", // *** TESTING: Changed to bouncy effect for visibility
          // OPTIONS:
          // - "ease-out" (recommended): Starts fast, slows down - feels natural and responsive
          // - "ease-in": Starts slow, speeds up - feels deliberate but less responsive
          // - "ease": Slow-fast-slow - standard web animation feel
          // - "linear": Constant speed - mechanical feeling, not recommended for UI
          // - "cubic-bezier(0.22, 1, 0.36, 1)": Custom smooth curve - very polished feel
          // - "cubic-bezier(0.68, -0.55, 0.265, 1.55)": Bouncy effect - playful but can be distracting
          // *** SEARCH BAR SPECIFIC ANIMATIONS ***
          searchBar: {
            openDuration: 700, // *** TESTING: Increased from 300ms - Time for search bar to appear when activated
            // RECOMMENDED: 300-400ms feels responsive, 200ms very snappy, 500-600ms more graceful

            closeDuration: 500, // *** TESTING: Increased from 200ms - Time for search bar to disappear when closed
            // TIP: Usually faster than opening - users expect quick closure
            // RECOMMENDED: 200ms balanced, 150ms very quick, 300ms more gentle

            scaleEffect: true, // *** true/false - Whether search bar grows slightly when focused
            // true: Search bar subtly scales up on focus - feels interactive and modern
            // false: No scaling - cleaner, more minimal appearance
          },
          // *** SEARCH RESULTS ANIMATIONS ***
          results: {
            fadeInDuration: 600, // *** TESTING: Increased from 200ms - Time for each result item to fade in when appearing
            // RECOMMENDED: 200ms feels smooth, 150ms quicker, 300ms more gentle
            // TIP: Shorter values feel more responsive, longer values feel smoother

            slideDistance: 25, // *** TESTING: Increased from 10px - Distance results slide in from (vertical movement)
            // 0px: No slide, just fade - minimal, clean
            // 5-10px: Subtle slide - modern, polished feel
            // 15-30px: More dramatic slide - attention-grabbing but can be distracting
            // RECOMMENDED: 8-12px for subtle polish

            staggerDelay: 150, // *** TESTING: Increased from 80ms - Delay between each result appearing (cascade effect)
            // 0ms: All results appear at once - instant but can feel overwhelming
            // 50-100ms: Nice cascade effect - feels organized and flows well
            // 150ms+: Very slow cascade - can feel sluggish with many results
            // RECOMMENDED: 60-100ms for smooth cascade, 40ms for quicker rhythm
          },
          // *** ACCESSIBILITY & PERFORMANCE ***
          reducedMotion: {
            respectPreference: false, // *** TESTING: Disabled to force animations for testing
            // true (HIGHLY RECOMMENDED): Respects user's accessibility needs - shows you care about all users
            // false: Ignores system preference - animations always play (not recommended for accessibility)

            fallbackDuration: 80, // *** 0-200ms - Animation duration when user prefers reduced motion
            // 0ms: Completely instant - most accessible but least polished
            // 50-100ms: Very quick transitions - maintains some polish while being accessible
            // 150ms+: Longer transitions - may still feel too animated for users who prefer reduced motion
            // RECOMMENDED: 50-80ms balances accessibility with minimal visual polish
          },
        },

        // [10.2.3.0.15] Search Ranking & Behavior Settings
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

        // ==========================================
        // DATA SOURCES TAB - External Data Integration
        // ==========================================
        // [10.2.3.0.16] Business Data Integration
        businessData: {
          useBusinessData: false, // *** true/false - Enable business data (DISABLES Google Sheets)
          replaceTourData: false, // *** true/false - Replace tour labels with business labels
          includeStandaloneEntries: false, // *** true/false - Add business entries without tour matches
          businessDataFile: "business.json", // *** Business data filename
          businessDataDir: "business-data", // *** Business data directory
          matchField: "id", // *** Field to match against
          businessDataUrl: "",
        },

        // [10.2.3.0.17] Google Sheets Integration
        // ==========================================
        // GOOGLE SHEETS or LOCAL CSV INTEGRATION (you can use one or the other)
        // ==========================================

        /* 
    📊 GOOGLE SHEETS INTEGRATION - How to Use Online CSV

    STEP 1: Create Your Google Sheet
    ================================
    1. Go to https://sheets.google.com and create a new spreadsheet
    2. Set up your columns (first row should be headers):
       - id: Unique identifier for each item
       - tag: Tag/identifier to match with tour elements  
       - name: Display name for the search result
       - description: Optional description text
       - imageUrl: Optional image URL for thumbnails
       - elementType: Optional element type (Panorama, Hotspot, etc.)
       - id or tag must match tour Panorma Title or Tag for proper linking

    Example data:
    | id    | tag        | name           | description              | imageUrl        |
    |-------|------------|----------------|--------------------------|-----------------|
    | rm001 | room-1     | Conference Rm  | Main meeting room        | http://img.jpg  |
    | lb001 | lobby      | Main Lobby     | Building entrance        |                 |

    STEP 2: Make Your Sheet Public
    ===============================
    1. Click "Share" button (top right)
    2. Click "Get link" 
    3. Change access to "Anyone with the link can view"
    4. Copy the share URL (looks like: https://docs.google.com/spreadsheets/d/SHEET_ID/edit...)

    STEP 3: Get the CSV Export URL
    ===============================
    Method A - Automatic (Recommended):
    - Just paste your share URL in googleSheetUrl below
    - The system will automatically convert it to CSV format

    Method B - Manual:
    - Replace "/edit#gid=0" with "/export?format=csv" in your URL
    - Final URL: https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv

    STEP 4: Configure Below
    =======================
    - Set useGoogleSheetData: true
    - Set useLocalCSV: false  
    - Paste your URL in googleSheetUrl
    - Set other options as needed

    ⚠️  IMPORTANT NOTES:
    - Business Data and Google Sheets are MUTUALLY EXCLUSIVE
    - Only enable ONE external data source at a time
    - If both are enabled, Business Data takes priority
    - Google Sheets data can enhance OR replace tour data
    */
        googleSheets: {
          useGoogleSheetData: false, // *** true/false - Enable Google Sheets/CSV (DISABLES Business Data)
          includeStandaloneEntries: false, // *** true/false - Include entries without tour matches
          useAsDataSource: false, // *** true/false - Use as primary data source
          fetchMode: "csv", // *** "csv" file
          // *** MUTUALLY EXCLUSIVE: Choose Online OR Local (not both) ***
          // *** OPTION 1: Online Google Sheets URL (traditional method) ***
          googleSheetUrl:
            "https://docs.google.com/spreadsheets/d/e/2PACX-1vQrQ9oy4JjwYAdTG1DKne9cu76PZCrZgtIOCX56sxVoBwRzys36mTqvFMvTE2TB-f-k5yZz_uWwW5Ou/pub?output=csv",

          // OPTION 2B: Local CSV (useLocalCSV=true IGNORES googleSheetUrl)
          useLocalCSV: false, // *** true/false - Local CSV mode (IGNORES googleSheetUrl)
          localCSVFile: "search-data.csv", // *** Local CSV filename
          localCSVDir: "business-data", // *** Directory containing CSV file
          localCSVUrl: "",

          // *** CSV parsing options (for both online and local) ***
          csvOptions: {
            header: true, // *** true/false - First row contains headers
            skipEmptyLines: true, // *** true/false - Skip empty lines
            dynamicTyping: true, // *** true/false - Auto-convert data types
          },

          // *** Caching (only for online Google Sheets, local files are not cached) ***
          caching: {
            enabled: false, // *** true/false - Cache Google Sheets data
            timeoutMinutes: 60, // *** Cache timeout in minutes
            storageKey: "tourGoogleSheetsData", // *** Cache storage key
          },
        },
      });

      console.log("Thumbnail settings:", window.searchFunctions.getConfig().thumbnailSettings);

      // ==========================================
      // END OF CONFIGURATION SETTINGS
      // ==========================================

      // [10.2.3.1] Debugging Function for Image Paths
      function debugImagePaths() {
        const config = window.searchFunctions.getConfig();
        const baseUrl = __fromScript("");
        console.log("Base URL (script):", baseUrl);
        console.log("Default Images Configuration:");

        Object.entries(config.thumbnailSettings.defaultImages).forEach(([type, path]) => {
          const normalizedPath = path.replace(/^\.\//, "");
          const fullPath = __fromScript(normalizedPath);

          console.log(`${type}:`, {
            configPath: path,
            normalizedPath,
            fullPath,
          });

          // Test if the image actually exists
          fetch(fullPath, { method: "HEAD" })
            .then((response) => {
              console.log(
                `${type} image exists: ${response.ok ? "YES" : "NO"} (${response.status})`
              );
            })
            .catch((error) => {
              console.error(`${type} image fetch error:`, error);
            });
        });
      }
      // [10.2.3.2] Add Debug Logging to Verify Google Sheets Configuration
      Logger.debug(
        "[DEBUG] Google Sheets Config Applied:",
        window.searchFunctions.getConfig().googleSheets
      );

      // [10.2.3.3] Force reinitialization if tour is available
      if (window.tourInstance) {
        Logger.info("[GOOGLE SHEETS] Reinitializing search with updated config");
        window.searchFunctions.initializeSearch(window.tourInstance);
      }
    }

    function validateConfig(config) {
      // Check if config is an object
      if (!config || typeof config !== "object" || Array.isArray(config)) {
        return false;
      }
      // Optionally, check for at least one expected property
      if (
        !(
          config.display ||
          config.includeContent ||
          config.containerSearch ||
          config.filter ||
          config.useAsLabel ||
          config.appearance ||
          config.searchBar ||
          config.thumbnailSettings ||
          config.displayLabels ||
          config.businessData ||
          config.googleSheets ||
          config.animations ||
          config.iconSettings
        )
      ) {
        return false;
      }
      return true;
    }

    // [10.2.3.1] Check for external configuration file (window.searchProConfig)
    // This runs AFTER search system is fully initialized, ensuring config can be applied
    if (typeof window.searchProConfig !== "undefined" && window.searchProConfig) {
      console.log("🔍 SEARCH ENGINE: Found external config file (window.searchProConfig)");
      console.log("🔍 SEARCH ENGINE: Applying external configuration...");

      try {
        if (window.searchFunctions && window.searchFunctions.updateConfig) {
          window.searchFunctions.updateConfig(window.searchProConfig);
          console.log("✅ SEARCH ENGINE: External configuration applied successfully!");

          // Verify it worked
          const activeConfig = window.searchFunctions.getConfig();
          console.log("✅ Active config after external file applied:", {
            placeholder: activeConfig?.searchBar?.placeholder,
            searchBackground: activeConfig?.appearance?.colors?.searchBackground,
            minSearchChars: activeConfig?.minSearchChars,
            enableThumbnails: activeConfig?.thumbnailSettings?.enableThumbnails,
          });
          
          // ⭐ NEW: Dispatch event to notify mobile visibility controller
          document.dispatchEvent(new CustomEvent("SearchConfigReady"));
          console.log("🎯 SEARCH ENGINE: SearchConfigReady event dispatched");
        } else {
          console.warn("⚠️ SEARCH ENGINE: searchFunctions.updateConfig not available");
        }
      } catch (error) {
        console.error("❌ SEARCH ENGINE: Error applying external configuration:", error);
      }
    } else {
      console.log("ℹ️ SEARCH ENGINE: No external config file found (window.searchProConfig)");
      console.log("ℹ️ Using default configuration or live config from control panel");
    }

    // [10.2.4] Check for live configuration updates from control panel - External File
    function checkForLiveConfig() {
      try {
        const liveConfig = localStorage.getItem("searchProLiveConfig");
        const timestamp = localStorage.getItem("searchProConfigUpdate");

        // Log ALL localStorage keys related to search to debug
        const allKeys = Object.keys(localStorage).filter((key) => key.includes("searchPro"));
        console.log("🔍 ALL SEARCH KEYS in localStorage:", allKeys);

        console.log("🔍 LIVE CONFIG CHECK:", {
          hasLiveConfig: !!liveConfig,
          configSize: liveConfig?.length,
          timestamp: timestamp,
          configPreview: liveConfig ? liveConfig.substring(0, 100) + "..." : "none",
        });

        if (liveConfig) {
          const config = JSON.parse(liveConfig);

          console.log("🔍 LIVE CONFIG: Parsed config thumbnails:", {
            enableThumbnails: config.thumbnailSettings?.enableThumbnails,
            defaultImages: config.thumbnailSettings?.defaultImages,
            showFor: config.thumbnailSettings?.showFor,
          });

          // Check if this is a new config by comparing with last applied
          const lastAppliedConfig = localStorage.getItem("searchProLastAppliedConfig");
          const configHash = JSON.stringify(config);

          console.log("🔍 LIVE CONFIG: Hash comparison:", {
            newHash: configHash.substring(0, 50) + "...",
            lastHash: lastAppliedConfig?.substring(0, 50) + "...",
            isNew: lastAppliedConfig !== configHash,
          });

          if (lastAppliedConfig !== configHash) {
            console.log("🎯 SEARCH ENGINE: Found NEW live config in localStorage:", {
              hasConfig: !!config,
              hasAppearance: !!config.appearance,
              hasSearchField: !!config.appearance?.searchField,
              hasTypography: !!config.appearance?.searchField?.typography,
              typographyStructure: config.appearance?.searchField?.typography,
            });

            if (window.searchFunctions && window.searchFunctions.updateConfig) {
              window.searchFunctions.updateConfig(config);
              console.log("🎯 SEARCH ENGINE: Applied NEW live configuration from control panel");

              // Store the applied config hash to prevent reapplication
              localStorage.setItem("searchProLastAppliedConfig", configHash);

              // Show notification only for new configs
              showConfigUpdateNotification();
            }
          } else {
            // Config hasn't changed, skip processing
            console.log("🎯 SEARCH ENGINE: Config unchanged, skipping reapplication");
          }
        }
      } catch (error) {
        console.error("[Search Plugin] Failed to apply live configuration:", error);
      }
    }
    // [10.2.5] Show configuration update notification
    function showConfigUpdateNotification() {
      const notification = document.createElement("div");
      notification.className = "config-notification";
      // Force notification bottom positioning
      notification.style.bottom = "60px";
      notification.style.top = "auto";

      // Create checkmark icon
      const checkmark = document.createElement("div");
      checkmark.className = "config-notification-checkmark";
      checkmark.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
        <path d="M20 6L9 17l-5-5"/>
    </svg>
  `;

      notification.appendChild(checkmark);
      notification.appendChild(
        document.createTextNode("Search settings updated from control panel")
      );

      document.body.appendChild(notification);

      setTimeout(() => {
        notification.classList.add("fadeout");
        setTimeout(() => {
          notification.remove();
        }, 400);
      }, 3000);
    }

    // Check for live config every 2 seconds
    setInterval(checkForLiveConfig, 2000);
  }, 100);
});
console.log("🔥 CACHE BUST: Search engine reloaded at Sun Aug  3 11:34:37 PM UTC 2025");

/* === SEARCH PRO – TABLE OF CONTENTS ===
 [1.0] Global/Module Scope Variables
 [1.1] Logger Shim (fallback, replaced by debug-core-v3.js)
 [1.1.1] Method: setLevel()
 [1.1.2] Method: Compatibility stubs for Logger
 [1.2] Cross-Window Communication Channel
 [2.0] Core Initialization Function
 [2.1] Method: internalInit()
 [2.1.1] Logic Block: Ensure idempotent DOM creation
 [2.1.2] Logic Block: Bind events and set up UI
 [3.0] Script Loader and Initialization
 [3.1] Default Configuration - Legacy config now removed in favor of _config
 [3.2] Utility: Wait for Tour Readiness
 [3.3] Function: initializeSearchWhenTourReady()
 [3.4] Simple Logger Definition
 [3.5] Check if Script is Already Loaded
 [3.6] Mark as Loaded
 [3.7] Define search markup template
 [3.8] Dependency Loader
 [3.9] Function: loadDependencies()
 [3.10] Optional Debug Tools Loader
 [3.11] Function: loadDebugTools()
 [3.12] Font Awesome Loader
 [3.13] Function: loadFontAwesome()
 [3.14] CSS Loader
 [3.15] Function: loadCSS()
 [3.16] DOM Initialization
 [3.17] Function: initializeDom()
 [3.17.1] Step: Find the main viewer element, which is required for injection.
 [3.17.2] Step: Check if the search container already exists to prevent duplication.
 [3.17.3] Step: Create a temporary container to safely build the markup.
 [3.17.4] Step: Append the new search container to the viewer.
 [3.18] Main Initialization Function
 [3.19] Function: initialize()
 [3.20] Module: Tour Lifecycle Binding
 [3.20.1] Method: bindLifecycle()
 [3.20.2] Method: cleanup()
 [3.21] Execution: Initialize Lifecycle Binding
 [3.22] Execution: Start initialization when the DOM is ready
 [3.23] Utility: Lightweight CSV Parser (Papa)
 [3.24] Method: parse()
 [3.24.1] Step: Skip empty lines if requested
 [3.24.2] Step: Parse header row if requested
 [3.24.3] Step: Parse data rows
 [3.24.4] Step: Return final parsed data object
 [4.0] Main Search Module Definition
 [4.1] Centralized Module-Level Variables
 [4.2] Submodule: PlaylistUtils - Enhanced playlist detection utilities
 [4.2.1] Method: getRootPlayerPlayList()
 [4.2.2] Method: getAllPlayLists()
 [4.3] Submodule: keyboardManager - Manages keyboard navigation for search results
 [4.3.1] Method: init()
 [4.4] Module: Constants and Configuration
 [4.5] Helper Function: isMobileDevice()
 [4.6] Class: ConfigBuilder - For creating and managing search configurations
 [4.6.1] Method: constructor()
 [4.6.2] Method: setDisplayOptions()
 [4.6.3] Method: setContentOptions()
 [4.6.4] Method: setFilterOptions()
 [4.6.5] Method: setLabelOptions()
 [4.6.6] Method: setAppearanceOptions()
 [4.6.7] Method: setSearchBarOptions()
 [4.6.8] Method: setGeneralOptions()
 [4.6.9] Method: setDisplayLabels()
 [4.6.10] Method: setBusinessDataOptions()
 [4.6.11] Method: setThumbnailSettings()
 [4.6.12] Method: setIconSettings()
 [4.6.13] Method: setGoogleSheetsOptions()
 [4.6.14] Method: setAnimationOptions()
 [4.6.15] Method: setSearchOptions()
 [4.6.16] Method: build()
 [4.7] Logic Block: Create Default Configuration
 [4.8] Submodule: LOGGING UTILITIES
 [4.9] Logic Block: Module State Variables
 [4.10] Logic Block: DOM ELEMENT CACHE
 [4.11] Submodule: CROSS-WINDOW COMMUNICATION
 [4.11.1] Method: init()
 [4.11.2] Method: send()
 [4.11.3] Method: listen()
 [4.11.4] Method: close()
 [4.12] Submodule: Utility Functions
 [4.13] Method: _debounce()
 [4.14] Method: _getThumbnailUrl() - Centralized thumbnail selection with config respect
 [4.15] Method: _preprocessSearchTerm() - FIXED: Restores apostrophe prefix for container search
 [4.16] Submodule: ARIA and Accessibility Helpers
 [4.17] Method: _convertHexToRGBA()
 [4.18] Helper: _normalizeForFilter() - Normalize strings for consistent filtering
 [4.19] Method: _getOverlayCamera() - Extract camera angles from overlay
 [4.20] Submodule: Element Detection and Filtering
 [4.21] Method: _getElementType()
 [4.22] Method: _validateElementType() - Validate and Normalize Element Types
 [4.23] Submodule: Element Interaction
 [4.24] Method: _triggerElement()
 [4.24.1] Helper to find element by ID using multiple methods
 [4.25] Method: _triggerStandaloneElement() - Enhanced Element Trigger Function
 [4.25.1] If it's a regular tour item, use the standard trigger
 [4.25.2] For standalone Google Sheets entries, try to find a matching tour element
 [4.26] Helper: find a 3D sprite (hotspot) by label within the current model
 [4.27] Method: _triggerElementRetry() - Enhanced Trigger Element Interaction Based on Item Type
 [4.28] Method: attemptTrigger() - Helper Function for Attempting to Trigger Elements
 [4.29] Submodule: UI Management
 [4.30] Method: _applySearchStyling()
 [4.30.1] Clean up any existing style elements
 [4.30.2] Create new style element
 [4.30.3] Generate responsive positioning CSS
 [4.30.4] Width calculation based on device type
 [4.30.5] Maximum width for mobile if specified
 [4.30.6] Base mobile positioning
 [4.30.7] Apply display-related classes and CSS variables
 [4.30.8] Set CSS variables for result tags visibility
 [4.30.9] Apply class-based styling for visibility control
 [4.30.10] Set icon color variable
 [4.30.11] Set border radius CSS variables
 [4.30.12] Set CSS variables for border radius
 [4.30.13] Set thumbnail border properties
 [4.30.14] Handle border width of 0 properly
 [4.30.15] Set thumbnail size properties
 [4.30.16] Extract pixel value from size name (e.g., "48px" -> 48)
 [4.30.17] Always set the current size
 [4.30.18] Update all predefined sizes for backward compatibility
 [4.30.19] Load Font Awesome if enabled
 [4.30.20] Set color variables for search
 [4.30.21] NEW: Set typography variables for search field
 [4.30.22] Set highlight color variables
 [4.30.23] Create background color with opacity
 [4.30.24] Set tag colors
 [4.30.25] Set tag styling variables
 [4.30.26] Handle thumbnail alignment from config
 [4.30.27] Apply thumbnail alignment to the document body as a data attribute
 [4.30.28] Apply styles to the DOM
 [4.30.29] Add or update highlight styles
 [4.30.30] Cache frequently used elements and apply placeholder text
 [4.31] Submodule: Business Data Matching
 [4.32] Method: findBusinessMatch()
 [4.32.1] Skip if no business data or invalid element
 [4.32.2] PRIORITY 1: Check subtitle matches FIRST
 [4.32.3] PRIORITY 2: Check element name matches
 [4.32.4] PRIORITY 3: Check tag matches (lowest priority)
 [4.32.5] No match found
 [4.32.6] Helper function to process business match
 [4.33] Submodule: Event Binding
 [4.34] Method: _bindSearchEventListeners()
 [4.34.1] First clean up any existing event listeners
 [4.34.2] Create a cleanup registry for this session
 [4.34.3] Bind input event with device-appropriate debounce
 [4.34.4] Bind clear button
 [4.34.5] Bind search icon
 [4.34.6] Document click handler for closing search
 [4.34.7] Touch handler for mobile
 [4.34.8] Keyboard navigation
 [4.34.9] Store cleanup functions for later use
 [4.35] Method: _unbindSearchEventListeners()
 [5.0] Module: Data Loading
 [5.1] Method: _loadGoogleSheetsData()
 [5.1.1] Skip if Google Sheets data is not enabled
 [5.1.2] Determine data source (local CSV vs. Google Sheets URL)
 [5.1.3] Check cache first if enabled (online only)
 [5.1.4] Process URL for Google Sheets (online only)
 [5.1.5] Add authentication if enabled (online only)
 [5.1.6] Fetch the data
 [5.2] Method: processGoogleSheetsData()
 [5.2.1] Enhanced tracking for duplicate prevention
 [5.2.2] Track existing items with better context
 [5.2.3] Log potential duplicate scenarios
 [5.2.4] Iterate through Google Sheets entries and match with tour data
 [5.3] Method: _loadBusinessData()
 [5.3.1] Check if business data is enabled
 [5.3.2] Determine the data path for business data
 [5.3.3] Fetch the business data
 [6.0] Module: Search Functionality
 [6.1] Method: _initializeSearch()
 [6.1.1] Log initialization start
 [6.1.2] Resolve the correct tour instance
 [6.1.3] Attempt to get tour from rootPlayer context
 [6.1.4] Apply fallback detection to find a valid tour instance
 [6.1.5] Validate the resolved tour instance
 [6.1.6] Store the validated tour reference globally
 [6.1.7] Reset module-level state
 [6.1.8] Prevent re-initialization
 [6.1.9] Set initialization flags
 [6.1.10] Initialize cross-window communication channel
 [6.1.11] Sub-function: validateDataSourceConfiguration()
 [6.1.12] Validate data source configuration
 [6.1.13] Load external data sources
 [6.1.14] Add business data promise
 [6.1.15] Add Google Sheets data promise
 [6.1.16] Prepare search index after data loading
 [6.1.17] Set up listener for cross-window communication
 [6.1.18] Apply ARIA attributes to the main container
 [6.1.19] Create search UI components
 [6.1.20] Reset state variables (redundant, but safe)
 [6.1.21] Sub-function: _prepareSearchIndex()
 [6.1.22] Sub-function: processPlaylistItem()
 [6.1.23] Sub-function: process3DModel()
 [6.1.24] Sub-function: processPanorama()
 [6.1.25] Sub-function: _processOverlaysWithSource()
 [6.1.26] Sub-function: createHybridClickHandler()
 [6.1.27] Sub-function: getBusinessMatch()
 [6.1.28] Sub-function: getSheetsMatch()
 [6.1.29] Sub-function: getResultLabel()
 [6.1.30] Sub-function: getResultDescription()
 [6.1.31] Sub-function: prepareFuse()
 [6.1.32] Sub-function: _safeGetData()
 [6.1.33] Sub-function: _shouldIncludePanorama()
 [6.1.34] Sub-function: _getDisplayLabel()
 [6.1.35] Sub-function: _getOverlays()
 [6.1.36] Sub-function: _processOverlays()
 [6.1.37] Submodule: UI Building Functions
 [6.1.38] Sub-function: _buildSearchField()
 [6.1.39] Sub-function: _buildNoResultsMessage()
 [6.1.40] Sub-function: _buildResultsContainer()
 [6.1.41] Sub-function: _createSearchInterface()
 [6.1.42] Submodule: UI Helpers
 [6.1.43] Sub-function: highlightMatch()
 [6.1.44] Sub-function: getIconSizeClass() - Get CSS class for icon size
 [6.1.45] Sub-function: getTypeIcon() - FIXED VERSION
 [6.1.46] Sub-function: groupAndSortResults()
 [6.1.47] Sub-function: _resolveDisplayType()
 [6.1.48] Sub-function: performSearch()
 [6.1.49] Set up keyboard navigation
 [6.1.50] Bind search event listeners for UI interactions
 [6.1.51] Prepare the search index
 [6.1.52] Apply search styling
 [6.1.53] Apply custom CSS for showing/hiding tags
 [6.1.54] Get key elements
 [6.1.55] Bind all event listeners
 [6.1.56] Mark initialization as complete
 [7.0] Search Visibility Toggle
 [7.1] Toggle Search Function to Handle Rapid Toggles
 [8.0] Toggle search visibility
 [8.0.1] If 'show' is explicitly specified and matches current state, debounce it
 [8.0.2] Debounce logic for double-calls from 3DVista toggle button
 [8.0.3] Enable proper toggle functionality without modifying 3DVista button code
 [8.0.4] Validate container exists
 [8.0.5] Get animation configuration - FIX: Correct the logic
 [8.1] Update the ARIA state
 [9.0] Public API
 [9.0.1] DOM Elements Cache
 [9.0.2] Initialize Search Functionality
 [10.0] Toggle Search Visibility
 [10.0.1] Get Current Configuration
 [10.0.2] Search History Management
 [10.0.3] Logging Control
 [10.0.4] Utility Functions
 [10.0.5] Expose Google Sheets Data Accessor
 [10.0.6] Expose Business Data Accessor
 [10.0.7] Expose Search Index Accessor
 [10.0.8] Expose Business Matching Function
 [10.1] Method: ensurePlaylistsReady() - Combined Playlist Readiness Detection Utility
 [10.2] Wait for a short time to ensure DOM is stable
 [10.2.1] Logic Block: Find the search container in DOM
 [10.2.2] Logic Block: If container exists in DOM but not in cache, update the cache
 [10.2.3] Now update the config
 [10.2.4] Check for live configuration updates from control panel - External File
 [10.2.5] Show configuration update notification
=== END TOC === */
