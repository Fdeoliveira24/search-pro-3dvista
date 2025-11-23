/**
 * FAB Menu System
 * Version 3.2 - Last Update on 11/01/2025 - Search Pro Configuration Loading - Google Sheets / CSV / Business JSON integration, runtime synchronization, Exact matches config, Silence Console Fix
 * Handles floating action button interactions
 */

class FABMenu {
  constructor() {
    this.fabMain = null;
    this.fabActions = null;
    this.fabBackdrop = null;
    this.isOpen = false;
    this.controlPanel = null; // Reference to control panel
    this.init();
  }

  /**
   * Initialize FAB menu
   */
  init() {
    this.fabMain = document.getElementById("fabMain");
    this.fabActions = document.getElementById("fabActions");
    this.fabBackdrop = document.getElementById("fabBackdrop");

    if (!this.fabMain || !this.fabActions) {
      console.warn("FAB menu elements not found");
      return;
    }

    this.setupEventListeners();
    console.log("📱 FAB Menu initialized");
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Main FAB button click
    this.fabMain.addEventListener("click", (e) => {
      e.preventDefault();
      this.toggle();
    });

    // Backdrop click to close
    if (this.fabBackdrop) {
      this.fabBackdrop.addEventListener("click", () => {
        this.close();
      });
    }

    // Close on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    });

    // Action buttons - these will use the same handlers as header buttons
    const fabApply = document.getElementById("fabApply");
    const fabDownload = document.getElementById("fabDownload");
    const fabLoad = document.getElementById("fabLoad");
    const fabReset = document.getElementById("fabReset");

    if (fabApply) {
      fabApply.addEventListener("click", (e) => {
        e.preventDefault();
        this.close(); // Close FAB menu
        // Trigger the same function as header apply button
        if (window.searchProControlPanel) {
          window.searchProControlPanel.applySettings();
        }
      });
    }

    if (fabDownload) {
      fabDownload.addEventListener("click", (e) => {
        e.preventDefault();
        this.close(); // Close FAB menu
        // Trigger the same function as header download button
        if (window.searchProControlPanel) {
          window.searchProControlPanel.downloadConfig();
        }
      });
    }

    if (fabLoad) {
      fabLoad.addEventListener("click", (e) => {
        e.preventDefault();
        this.close(); // Close FAB menu
        // Trigger the same function as header load button
        if (window.searchProControlPanel) {
          window.searchProControlPanel.loadConfig();
        }
      });
    }

    if (fabReset) {
      fabReset.addEventListener("click", (e) => {
        e.preventDefault();
        this.close(); // Close FAB menu
        // Trigger the same function as header reset button
        if (window.searchProControlPanel) {
          window.searchProControlPanel.resetAll();
        }
      });
    }
  }

  /**
   * Set control panel reference and update event handlers
   * @param {SecureSearchProControlPanel} controlPanel Control panel instance
   */
  setControlPanel(controlPanel) {
    // Store reference to control panel
    this.controlPanel = controlPanel;
    console.log("🔗 FAB Menu connected to control panel");

    // Update the event handlers to use the stored reference
    const fabApply = document.getElementById("fabApply");
    const fabDownload = document.getElementById("fabDownload");
    const fabLoad = document.getElementById("fabLoad");
    const fabReset = document.getElementById("fabReset");

    if (fabApply && this.controlPanel) {
      fabApply.addEventListener("click", (e) => {
        e.preventDefault();
        this.close();
        this.controlPanel.applySettings();
      });
    }

    if (fabDownload && this.controlPanel) {
      fabDownload.addEventListener("click", (e) => {
        e.preventDefault();
        this.close();
        this.controlPanel.downloadConfig();
      });
    }

    if (fabLoad && this.controlPanel) {
      fabLoad.addEventListener("click", (e) => {
        e.preventDefault();
        this.close();
        this.controlPanel.loadConfig();
      });
    }

    if (fabReset && this.controlPanel) {
      fabReset.addEventListener("click", (e) => {
        e.preventDefault();
        this.close();
        this.controlPanel.resetAll();
      });
    }
  }

  /**
   * Toggle FAB menu
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open FAB menu
   */
  open() {
    this.isOpen = true;
    this.fabMain.classList.add("active");
    this.fabActions.classList.add("active");
    if (this.fabBackdrop) {
      this.fabBackdrop.classList.add("active");
    }
  }

  /**
   * Close FAB menu
   */
  close() {
    this.isOpen = false;
    this.fabMain.classList.remove("active");
    this.fabActions.classList.remove("active");
    if (this.fabBackdrop) {
      this.fabBackdrop.classList.remove("active");
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.fabMenu = new FABMenu();
});

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = FABMenu;
}
