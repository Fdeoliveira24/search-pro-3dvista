/**
 * Search Pro Configuration and Script Loader
 * This script handles:
 * 1. Loading configuration from different sources with proper priority
 * 2. Loading required scripts in the correct order
 * 3. Initializing the search functionality
 *
 * Version: 2.0.1 (Combined search-loader.js and config-loader.js)
 */

console.debug("[SearchPro] ✅ Unified loader script loaded");

(function () {
  // Version number for cache busting
  const VERSION = "2.0.1";

  // Path to configuration file - will try both locations
  const CONFIG_FILE_PATH = "./config/search-config.json";
  const ALT_CONFIG_PATH = "../config/search-config.json";
  const STORAGE_KEY = "searchPro.config";
  const DEBUG = true;

  // Resources to load with cache busting
  const RESOURCES = {
    css: "./search_v4.css", // Note the relative path
    js: "./search_v4.js",
    fuse: "./fuse.js/dist/fuse.min.js",
    fuseCDN: "https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js",
  };

  // Add path debugging
  console.log("[SearchPro] Current script path:", document.currentScript.src);
  console.log("[SearchPro] Document base URL:", document.baseURI);
  console.log("[SearchPro] Resources to load:", RESOURCES);

  // Keep track of loading state
  let scriptsLoaded = false;
  let cssLoaded = false;

  // Debug logging helper
  function log(...args) {
    if (DEBUG || window.__searchProDebug) console.log("[SearchPro]", ...args);
  }

  // Check if localStorage is available (for incognito detection)
  function isStorageAvailable() {
    try {
      localStorage.setItem("__test__", "1");
      localStorage.removeItem("__test__");
      return true;
    } catch {
      return false;
    }
  }

  // Add a function to clear outdated configs
  function _clearOutdatedConfig() {
    try {
      if (!isStorageAvailable()) return;

      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const configVersion = parsed.version || "1.0.0";

      // If version doesn't match current version, clear it
      if (configVersion !== VERSION) {
        console.info(
          `[SearchPro] Outdated config version (${configVersion}), resetting to defaults`,
        );
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn("[SearchPro] Error checking config version:", e);
      // On any error, clear storage to be safe
      if (isStorageAvailable()) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  // Run the version check at startup
  _clearOutdatedConfig();

  // Load the search stylesheet
  function loadSearchCSS() {
    if (cssLoaded) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = RESOURCES.css; // Now has version parameter
    document.head.appendChild(link);

    cssLoaded = true;
    log("CSS loaded");
  }

  // Load the search JavaScript
  function loadSearchJS() {
    if (scriptsLoaded) return;

    // First check if Fuse.js is present, load it if not
    if (typeof Fuse === "undefined") {
      log("Fuse.js not detected, loading it first");
      const fuseScript = document.createElement("script");
      fuseScript.src = RESOURCES.fuse;
      fuseScript.onload = () => {
        log("Fuse.js loaded successfully");
        loadMainSearchScript();
      };
      fuseScript.onerror = () => {
        log("Failed to load Fuse.js, trying CDN fallback");
        const fallbackScript = document.createElement("script");
        fallbackScript.src = RESOURCES.fuseCDN;
        fallbackScript.onload = () => {
          log("Fuse.js loaded from CDN");
          loadMainSearchScript();
        };
        fallbackScript.onerror = () => {
          console.error(
            "Failed to load Fuse.js from CDN. Search functionality will not work!",
          );
        };
        document.body.appendChild(fallbackScript);
      };
      document.body.appendChild(fuseScript);
    } else {
      log("Fuse.js already loaded, proceeding with search script");
      loadMainSearchScript();
    }
  }

  // Load the main search script
  function loadMainSearchScript() {
    const script = document.createElement("script");
    script.src = RESOURCES.js; // Now has version parameter
    script.onload = () => {
      log("Search script loaded successfully");
      scriptsLoaded = true;

      // Once loaded, try to apply configuration
      initialize();
    };
    document.body.appendChild(script);
  }

  // Apply settings to the search plugin
  function applySettings(settings) {
    try {
      // Resolve position conflicts
      if (settings?.searchBar?.position) {
        const pos = settings.searchBar.position;

        // If both left and right are set, prioritize right
        if (pos.left !== null && pos.right !== null) {
          console.warn(
            "[ConfigLoader] Conflict: both left and right set. Prioritizing right.",
          );
          pos.left = null;
        }

        // If both top and bottom are set, prioritize top
        if (pos.top !== null && pos.bottom !== null) {
          console.warn(
            "[ConfigLoader] Conflict: both top and bottom set. Prioritizing top.",
          );
          pos.bottom = null;
        }
      }

      if (
        window.tourSearchFunctions &&
        typeof window.tourSearchFunctions.updateConfig === "function"
      ) {
        window.tourSearchFunctions.updateConfig(settings);
        log("Settings applied to search plugin");
        return true;
      }
    } catch (err) {
      console.warn("[SearchPro] Failed to apply settings:", err);
    }
    return false;
  }

  // Load settings from localStorage
  function loadFromLocalStorage() {
    try {
      if (!isStorageAvailable()) return null;

      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      try {
        const parsed = JSON.parse(raw);
        // Handle both formats (wrapped and direct)
        return parsed.settings || parsed;
      } catch (e) {
        log("Error parsing localStorage settings:", e);
        return null;
      }
    } catch (e) {
      log("Error accessing localStorage:", e);
      return null;
    }
  }

  // Load settings from server config file
  async function loadFromServer() {
    try {
      // First check if search-loader already loaded the server config
      if (window.SERVER_SEARCH_CONFIG) {
        log("Using pre-loaded server configuration");
        return window.SERVER_SEARCH_CONFIG;
      }

      // Try primary path first
      console.debug(
        `[SearchPro] Fetching configuration from ${CONFIG_FILE_PATH}`,
      );
      try {
        const response = await fetch(CONFIG_FILE_PATH, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (response.ok) {
          const data = await response.json();
          console.debug("[SearchPro] Successfully parsed JSON config:", data);
          log("Successfully loaded server configuration");
          return data.settings || data;
        } else {
          log(
            `Primary config path returned ${response.status}, trying alternative...`,
          );
        }
      } catch (primaryError) {
        log("Primary config path failed:", primaryError);
      }

      // Try alternative path
      console.debug(`[SearchPro] Trying alternative path: ${ALT_CONFIG_PATH}`);
      try {
        const altResponse = await fetch(ALT_CONFIG_PATH, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (altResponse.ok) {
          const data = await altResponse.json();
          console.debug(
            "[SearchPro] Successfully parsed JSON from alt path:",
            data,
          );
          log("Successfully loaded server configuration from alternative path");
          return data.settings || data;
        } else {
          log(`Alternative config path returned ${altResponse.status}`);
        }
      } catch (altError) {
        log("Alternative config path failed:", altError);
      }

      // If we got here, both paths failed
      log("No server configuration found at either location");
      return null;
    } catch (e) {
      log("Failed to load server configuration:", e);
      return null;
    }
  }

  // Add at the top of the IIFE
  let _watchStarted = false;

  // Watch for search functions to become available
  function watchForSearchFunctions(settings, attempts = 0, maxAttempts = 20) {
    if (_watchStarted) {
      console.debug("[SearchPro] Search functions watcher already started");
      return null;
    }

    _watchStarted = true;
    console.debug(
      "[SearchPro] Starting to watch for search functions. Settings:",
      settings,
    );

    const interval = setInterval(() => {
      // Check if tourSearchFunctions exists
      if (attempts % 3 === 0) {
        console.debug(
          `[SearchPro] Waiting for tourSearchFunctions (attempt ${attempts}/${maxAttempts})`,
          {
            exists: !!window.tourSearchFunctions,
            hasUpdateConfig:
              window.tourSearchFunctions &&
              typeof window.tourSearchFunctions.updateConfig === "function",
          },
        );
      }

      if (
        window.tourSearchFunctions &&
        typeof window.tourSearchFunctions.updateConfig === "function"
      ) {
        clearInterval(interval);
        console.debug(
          "[SearchPro] updateConfig now ready. Applying settings...",
        );
        applySettings(settings);
        console.info(
          "[SearchPro] Settings applied to search plugin after waiting",
        );

        // Save reference for potential future use
        window.searchProSettings = settings;
      } else if (++attempts >= maxAttempts) {
        clearInterval(interval);
        console.error(
          "[SearchPro] Search functions not available after max attempts",
        );
      }
    }, 300); // Check every 300ms

    return interval;
  }

  // Main initialization function
  async function initialize() {
    log("Initializing search loader...");

    // Ensure CSS is loaded
    loadSearchCSS();

    // Load the scripts if not already loaded
    if (!scriptsLoaded && !window.tourSearchFunctions) {
      loadSearchJS();
      return; // The function will be called again after scripts are loaded
    }

    // Try to load settings from different sources in priority order
    let settings = null;

    // 1. Try server config first
    settings = await loadFromServer();
    if (settings) {
      console.debug("[SearchPro] Using server-side configuration:", settings);
    } else {
      // 2. Try localStorage next
      settings = loadFromLocalStorage();
      if (settings) {
        console.debug(
          "[SearchPro] Using localStorage configuration:",
          settings,
        );
      } else {
        // 3. Fall back to default config if available
        settings = window.DEFAULT_SEARCH_CONFIG || null;
        if (settings) {
          console.debug("[SearchPro] Using default configuration:", settings);
        } else {
          console.warn(
            "[SearchPro] No configuration found, search will use built-in defaults",
          );
        }
      }
    }

    // Enable debug mode if specified
    if (settings && settings.debug === true) {
      window.__searchProDebug = true;
      console.info("[SearchPro] Debug mode is ON");
    }

    if (window.__searchProDebug)
      console.log("[Search] Initialized with:", settings);

    // Save a reference to the loaded settings
    window.searchProSettings = settings;

    // Check if tourSearchFunctions is ready
    const hasTourSearchFunctions =
      window.tourSearchFunctions &&
      typeof window.tourSearchFunctions.updateConfig === "function";

    console.debug(
      "[SearchPro] Search functions ready?",
      hasTourSearchFunctions,
    );

    // Try to apply settings immediately
    if (hasTourSearchFunctions) {
      console.debug("[SearchPro] updateConfig exists. Applying...");
      const applied = applySettings(settings);
      console.debug("[SearchPro] Settings applied successfully:", applied);
    } else {
      // If not ready, watch for search functions to become available
      console.warn(
        "[SearchPro] updateConfig not ready yet. Setting up watcher...",
      );
      watchForSearchFunctions(settings);
    }

    return settings;
  }

  // Start initialization when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
    console.debug("[SearchPro] Set up DOMContentLoaded listener");
  } else {
    // Page already loaded, initialize now
    console.debug(
      "[SearchPro] Document already loaded, initializing immediately",
    );
    initialize();
  }

  // Public API
  window.SearchProLoader = {
    reload: initialize,
    getCurrent: () => window.searchProSettings || {},
    apply: applySettings,
    version: "2.0.1",
    path: CONFIG_FILE_PATH,
    debug: (enable) => {
      window.__searchProDebug = enable === true;
      console.info(
        `[SearchPro] Debug mode ${window.__searchProDebug ? "ON" : "OFF"}`,
      );
      return window.__searchProDebug;
    },
  };
})();
