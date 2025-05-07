(() => {
  console.log("🔧 [Search Pro] Debug Core Loaded");

  function runDiagnostics() {
    const report = generateSearchProDebugReport();
    printFullDebugSummary(report);
    observeSettingsPanel();
  }

  function generateSearchProDebugReport() {
    const container = document.getElementById("searchContainer");
    const preview = document.getElementById("layoutPreview");
    const tourObj = window.tourSearchFunctions?.__tour || window.tourInstance;
    const stored = localStorage.getItem("searchPro.config");
    const hasShadowDOM = !!container?.shadowRoot;

    const report = {
      timestamp: new Date().toISOString(),
      browser: navigator.userAgent,
      windowSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      searchPro: {
        version: window.tourSearchFunctions?.version || "n/a",
        initialized: !!window.searchListInitialized,
        initiinitialized: !!window.searchListInitiinitialized,
        tourDetected: !!tourObj,
        tourName: tourObj?.name || "n/a",
        methods: {
          init: typeof window.SearchPro?.init === "function",
          toggle: typeof window.SearchPro?.UI?.setVisible === "function",
          updateConfig:
            typeof window.tourSearchFunctions?.updateConfig === "function",
        },
        state: {
          uiManager: !!window.searchProManagers?.uiManager,
          stateManager: !!window.searchProManagers?.stateManager,
          storageManager: !!window.searchProManagers?.storageManager,
        },
      },
      dom: {
        searchContainer: !!container,
        searchContainerVisible: container?.style.display === "block",
        previewActive: !!preview,
        shadowDOM: hasShadowDOM,
        importFile: !!document.getElementById("importFile"),
      },
      localStorage: {
        available: (() => {
          try {
            localStorage.setItem("__test__", "test");
            localStorage.removeItem("__test__");
            return true;
          } catch {
            return false;
          }
        })(),
        storedConfig: stored ? "[exists]" : "[none]",
        configSource: window.SERVER_SEARCH_CONFIG
          ? "server"
          : stored
            ? "localStorage"
            : window.DEFAULT_SEARCH_CONFIG
              ? "default"
              : "unknown",
      },
      settings: {
        theme:
          window.searchProManagers?.stateManager?.getState()?.theme
            ?.useDarkMode ?? "auto",
        schemaVersion:
          typeof getSchemaVersion === "function" ? getSchemaVersion() : "n/a",
        controlCount:
          window.searchProManagers?.uiManager?._controlMap?.size ?? 0,
      },
    };

    console.groupCollapsed("🔍 SEARCH PRO DIAGNOSTIC REPORT");
    console.table(report);
    console.log("📦 Full Report:", report);
    console.groupEnd();

    return report;
  }

  function printFullDebugSummary(report) {
    console.log("🧪 Full Debug Summary");

    // 1. Basic state inspection
    console.log("==== INSTANCE CHECK ====");
    console.log("searchProManagers exists:", !!window.searchProManagers);
    console.log("uiManagerInstance exists:", !!window.uiManagerInstance);

    // 2. Duplicate check
    console.log("\n==== DUPLICATE ELEMENTS CHECK ====");
    console.log(
      "Number of toolbars:",
      document.querySelectorAll(".global-action-toolbar").length,
    );
    console.log(
      "Number of reset buttons:",
      document.querySelectorAll("#resetSettings").length,
    );
    console.log(
      "Number of export buttons:",
      document.querySelectorAll("#exportSettings").length,
    );
    console.log(
      "Number of import buttons:",
      document.querySelectorAll("#importButton").length,
    );
    console.log(
      "Number of server export buttons:",
      document.querySelectorAll("#exportForServer").length,
    );

    // 3. Method checks
    console.log("\n==== METHOD AVAILABILITY CHECK ====");
    if (window.searchProManagers?.storageManager) {
      console.log(
        "StorageManager methods:",
        Object.getOwnPropertyNames(
          Object.getPrototypeOf(window.searchProManagers.storageManager),
        ),
      );
    }
    if (window.uiManagerInstance) {
      console.log(
        "UIManager methods:",
        Object.getOwnPropertyNames(
          Object.getPrototypeOf(window.uiManagerInstance),
        ),
      );
    }

    // 4. Event listener simulation (via cloning)
    console.log("\n🪝 Manual Event Listener Check");
    [
      "applySettings",
      "resetSettings",
      "exportSettings",
      "importButton",
      "exportForServer",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        console.log(`#${id} exists: true`);
        console.log(`  Cloning #${id} would remove existing listeners`);
      }
    });

    // 5. Browser support
    if (typeof getEventListeners === "function") {
      console.log("getEventListeners available in this browser");
    } else {
      console.log(
        "getEventListeners not available in this browser - manual check required",
      );
    }

    // 6. Class definition checks
    console.log("\n🧠 Manager Class Consistency");
    console.log(
      "StateManager class match:",
      window.StateManager ===
        window.searchProManagers?.stateManager?.constructor,
    );
    console.log(
      "StorageManager class match:",
      window.StorageManager ===
        window.searchProManagers?.storageManager?.constructor,
    );

    // 7. LocalStorage validation
    console.log(
      "\n✅ LocalStorage test:",
      report.localStorage.available ? "PASSED ✅" : "FAILED ❌",
    );
  }

  function checkTagVariables() {
    const el = document.querySelector("#searchContainer");
    if (!el) return console.warn("[Tag Debug] #searchContainer not found");

    const color = getComputedStyle(el).getPropertyValue("--tag-text-color");
    console.log("[Tag Debug] --tag-text-color:", color || "⛔ Not defined");

    if (color === "") {
      console.warn(
        "[Tag Debug] Variable is NOT defined. Tag styling will fail.",
      );
    } else {
      console.log("[Tag Debug] Variable is active. Tag styling should work.");
    }
  }

  function observeSettingsPanel() {
    const target = document.body;
    const observer = new MutationObserver((mutations) => {
      console.log(
        `[DEBUG] Settings panel DOM changed (${mutations.length} mutations)`,
      );
    });
    observer.observe(target, {
      childList: true,
      subtree: true,
    });
    console.debug("[DEBUG] Started observing settings panel DOM changes");
  }

  // Create global namespace for search pro debug tools
  window.searchProDebug = window.searchProDebug || {};

  // Expose the tag variables check function in the global namespace
  window.searchProDebug.checkTagVariables = checkTagVariables;

  window.searchProDebugTools = {
    runDiagnostics,
    generateSearchProDebugReport,
    checkTagVariables,
  };

  // Run diagnostics automatically on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", () => {
    console.debug(
      "[DEBUG] DOMContentLoaded fired - running initial diagnostics",
    );
    setTimeout(runDiagnostics, 100);
  });

  console.debug("✅ debug-core.js loaded successfully");
})();
