/**
 * Advanced Sidebar Menu System
 * Version 3.2 - Last Update on 11/01/2025 - Search Pro Configuration Loading - Google Sheets / CSV / Business JSON integration, runtime synchronization, Exact matches config, Silence Console Fix
 * Handles responsive sidebar behavior with collapse/expand functionality
 */

class SidebarMenu {
  constructor() {
    this.sidebar = null;
    this.overlay = null;
    this.collapseBtn = null;
    this.mobileToggle = null;
    this.isCollapsed = false;
    this.isMobileOpen = false;
    this.breakpoints = {
      mobile: 768,
      tablet: 1024,
    };

    this.init();
  }

  /**
   * Initialize the sidebar menu system
   */
  init() {
    this.createElements();
    this.setupEventListeners();
    this.setupResizeHandler();
    this.restoreState();
    this.handleInitialState();

    console.log("🎯 Advanced Sidebar Menu initialized");
  }

  /**
   * Create sidebar elements if they don't exist
   */
  createElements() {
    // Create mobile menu toggle if it doesn't exist
    if (!document.getElementById("mobileMenuToggle")) {
      const mobileToggle = document.createElement("button");
      mobileToggle.id = "mobileMenuToggle";
      mobileToggle.className = "mobile-menu-toggle";
      mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
      mobileToggle.setAttribute("aria-label", "Toggle mobile menu");
      document.body.appendChild(mobileToggle);
    }

    // Create sidebar overlay if it doesn't exist
    if (!document.getElementById("sidebarOverlay")) {
      const overlay = document.createElement("div");
      overlay.id = "sidebarOverlay";
      overlay.className = "sidebar-overlay";
      document.body.appendChild(overlay);
    }

    // Get references to elements
    this.sidebar = document.getElementById("sidebar");
    this.overlay = document.getElementById("sidebarOverlay");
    this.collapseBtn = document.getElementById("sidebarCollapseBtn");
    this.mobileToggle = document.getElementById("mobileMenuToggle");

    // Add data-tooltip attributes to nav items for collapsed state
    this.addTooltipAttributes();
  }

  /**
   * Add tooltip attributes to navigation items
   */
  addTooltipAttributes() {
    const navItems = document.querySelectorAll(".nav-item");
    const tooltips = {
      general: "General Settings",
      appearance: "Appearance",
      display: "Display Options",
      content: "Content Configuration",
      filtering: "Content Filtering",
      advanced: "Advanced Settings",
      management: "Data Management",
      "data-sources": "Data Sources",
    };

    navItems.forEach((item) => {
      const tabId = item.getAttribute("data-tab");
      if (tabId && tooltips[tabId]) {
        item.setAttribute("data-tooltip", tooltips[tabId]);
      }
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Collapse/Expand button
    if (this.collapseBtn) {
      this.collapseBtn.addEventListener("click", () => {
        this.toggleCollapse();
      });
    }

    // Mobile menu toggle
    if (this.mobileToggle) {
      this.mobileToggle.addEventListener("click", () => {
        this.toggleMobileMenu();
      });
    }

    // Overlay click to close mobile menu
    if (this.overlay) {
      this.overlay.addEventListener("click", () => {
        this.closeMobileMenu();
      });
    }

    // ESC key to close mobile menu - store reference for cleanup
    this.boundKeydownHandler = (e) => {
      if (e.key === "Escape" && this.isMobileOpen) {
        this.closeMobileMenu();
      }
    };
    document.addEventListener("keydown", this.boundKeydownHandler);

    // Navigation item clicks - store references for cleanup
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.boundClickHandler = (e) => {
        this.handleNavItemClick(e, item);
      };
      item.addEventListener("click", item.boundClickHandler);
    });
  }

  /**
   * Setup window resize handler
   */
  setupResizeHandler() {
    let resizeTimeout;
    // Store reference to the bound handler for later removal
    this.boundResizeHandler = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.handleResize();
      }, 150);
    };
    window.addEventListener("resize", this.boundResizeHandler);
  }

  /**
   * Handle window resize
   */
  handleResize() {
    const windowWidth = window.innerWidth;

    if (windowWidth <= this.breakpoints.mobile) {
      // Mobile view
      this.handleMobileView();
    } else if (windowWidth <= this.breakpoints.tablet) {
      // Tablet view
      this.handleTabletView();
    } else {
      // Desktop view
      this.handleDesktopView();
    }
  }

  /**
   * Handle mobile view
   */
  handleMobileView() {
    if (this.sidebar) {
      this.sidebar.classList.remove("collapsed");
      this.sidebar.classList.add("mobile-hidden");

      if (this.isMobileOpen) {
        this.sidebar.classList.add("mobile-open");
        this.sidebar.classList.remove("mobile-hidden");
      }
    }

    this.isCollapsed = false;
  }

  /**
   * Handle tablet view
   */
  handleTabletView() {
    if (this.sidebar) {
      this.sidebar.classList.remove("mobile-hidden", "mobile-open");

      if (this.isCollapsed) {
        this.sidebar.classList.add("collapsed");
      }
    }

    this.closeMobileMenu();
  }

  /**
   * Handle desktop view
   */
  handleDesktopView() {
    if (this.sidebar) {
      this.sidebar.classList.remove("mobile-hidden", "mobile-open");

      if (this.isCollapsed) {
        this.sidebar.classList.add("collapsed");
      }
    }

    this.closeMobileMenu();
  }

  /**
   * Toggle sidebar collapse state
   */
  toggleCollapse() {
    if (window.innerWidth <= this.breakpoints.mobile) {
      return; // Don't collapse on mobile
    }

    this.isCollapsed = !this.isCollapsed;

    if (this.sidebar) {
      this.sidebar.classList.toggle("collapsed", this.isCollapsed);
    }

    // Update collapse button icon
    if (this.collapseBtn) {
      const icon = this.collapseBtn.querySelector("i");
      if (icon) {
        icon.classList.toggle("fa-chevron-left", !this.isCollapsed);
        icon.classList.toggle("fa-chevron-right", this.isCollapsed);
      }
    }

    // Save state
    this.saveState();

    // Trigger custom event
    this.dispatchEvent("sidebarToggle", { collapsed: this.isCollapsed });

    console.log(`🔄 Sidebar ${this.isCollapsed ? "collapsed" : "expanded"}`);
  }

  /**
   * Toggle mobile menu
   */
  toggleMobileMenu() {
    if (this.isMobileOpen) {
      this.closeMobileMenu();
    } else {
      this.openMobileMenu();
    }
  }

  /**
   * Open mobile menu
   */
  openMobileMenu() {
    this.isMobileOpen = true;

    if (this.sidebar) {
      this.sidebar.classList.add("mobile-open");
      this.sidebar.classList.remove("mobile-hidden");
    }

    if (this.overlay) {
      this.overlay.classList.add("active");
    }

    if (this.mobileToggle) {
      const icon = this.mobileToggle.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-bars");
        icon.classList.add("fa-times");
      }
    }

    // Prevent body scroll
    document.body.style.overflow = "hidden";

    // Trigger custom event
    this.dispatchEvent("mobileMenuOpen");

    console.log("📱 Mobile menu opened");
  }

  /**
   * Close mobile menu
   */
  closeMobileMenu() {
    this.isMobileOpen = false;

    if (this.sidebar) {
      this.sidebar.classList.remove("mobile-open");
      if (window.innerWidth <= this.breakpoints.mobile) {
        this.sidebar.classList.add("mobile-hidden");
      }
    }

    if (this.overlay) {
      this.overlay.classList.remove("active");
    }

    if (this.mobileToggle) {
      const icon = this.mobileToggle.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-times");
        icon.classList.add("fa-bars");
      }
    }

    // Restore body scroll
    document.body.style.overflow = "";

    // Trigger custom event
    this.dispatchEvent("mobileMenuClose");

    console.log("📱 Mobile menu closed");
  }

  /**
   * Handle navigation item clicks
   */
  handleNavItemClick(event, item) {
    // Remove active class from all nav items
    document.querySelectorAll(".nav-item").forEach((navItem) => {
      navItem.classList.remove("active");
    });

    // Add active class to clicked item
    item.classList.add("active");

    // Close mobile menu on mobile after selection
    if (window.innerWidth <= this.breakpoints.mobile && this.isMobileOpen) {
      setTimeout(() => {
        this.closeMobileMenu();
      }, 300);
    }

    // Get tab ID and trigger tab switch
    const tabId = item.getAttribute("data-tab");
    if (tabId) {
      this.switchTab(tabId);
    }

    // Trigger custom event
    this.dispatchEvent("navItemClick", { tabId, item });
  }

  /**
   * Switch to a specific tab
   */
  switchTab(tabId) {
    // Hide all tab panels
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.remove("active");
    });

    // Show selected tab panel
    const selectedPanel = document.getElementById(tabId + "-panel");
    if (selectedPanel) {
      selectedPanel.classList.add("active");
    }

    console.log(`🔄 Switched to tab: ${tabId}`);
  }

  /**
   * Save sidebar state to localStorage with consistent structure
   */
  saveState() {
    try {
      const state = {
        isCollapsed: this.isCollapsed,
        timestamp: Date.now(),
      };
      localStorage.setItem("sidebarState", JSON.stringify(state));
    } catch (error) {
      console.warn("Could not save sidebar state:", error);
    }
  }

  /**
   * Restore sidebar state from localStorage with proper validation
   */
  restoreState() {
    try {
      const savedState = localStorage.getItem("sidebarState");
      if (savedState) {
        const state = JSON.parse(savedState);

        // Validate state structure and age (expire after 7 days)
        if (
          state &&
          typeof state.isCollapsed === "boolean" &&
          state.timestamp &&
          Date.now() - state.timestamp < 7 * 24 * 60 * 60 * 1000
        ) {
          this.isCollapsed = state.isCollapsed;
          this.updateSidebarState();
        }
      }
    } catch (error) {
      console.warn("Could not restore sidebar state:", error);
      // Clear corrupted state
      try {
        localStorage.removeItem("sidebarState");
      } catch (clearError) {
        console.warn("Could not clear corrupted state:", clearError);
      }
    }
  }

  /**
   * Handle initial state after page load
   */
  handleInitialState() {
    // Set initial collapse state
    if (this.isCollapsed && window.innerWidth > this.breakpoints.mobile) {
      if (this.sidebar) {
        this.sidebar.classList.add("collapsed");
      }
    }

    // Set initial view based on screen size
    this.handleResize();

    // Set initial active tab
    const firstNavItem = document.querySelector(".nav-item");
    if (firstNavItem && !document.querySelector(".nav-item.active")) {
      firstNavItem.classList.add("active");
      const tabId = firstNavItem.getAttribute("data-tab");
      if (tabId) {
        this.switchTab(tabId);
      }
    }
  }

  /**
   * Dispatch custom events
   */
  dispatchEvent(eventName, detail = {}) {
    const event = new CustomEvent(`sidebar:${eventName}`, {
      detail: detail,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }

  /**
   * Get current sidebar state
   */
  getState() {
    return {
      isCollapsed: this.isCollapsed,
      isMobileOpen: this.isMobileOpen,
      currentView: this.getCurrentView(),
    };
  }

  /**
   * Get current view type
   */
  getCurrentView() {
    const windowWidth = window.innerWidth;
    if (windowWidth <= this.breakpoints.mobile) {
      return "mobile";
    } else if (windowWidth <= this.breakpoints.tablet) {
      return "tablet";
    } else {
      return "desktop";
    }
  }

  /**
   * Programmatically collapse sidebar
   */
  collapse() {
    if (!this.isCollapsed && window.innerWidth > this.breakpoints.mobile) {
      this.toggleCollapse();
    }
  }

  /**
   * Programmatically expand sidebar
   */
  expand() {
    if (this.isCollapsed && window.innerWidth > this.breakpoints.mobile) {
      this.toggleCollapse();
    }
  }

  /**
   * Destroy the sidebar menu instance - FIXED: Proper cleanup
   */
  destroy() {
    // Remove event listeners properly
    if (this.boundResizeHandler) {
      window.removeEventListener("resize", this.boundResizeHandler);
    }

    // Remove document keydown listener
    if (this.boundKeydownHandler) {
      document.removeEventListener("keydown", this.boundKeydownHandler);
    }

    // Remove all nav item listeners
    document.querySelectorAll(".nav-item").forEach((item) => {
      if (item.boundClickHandler) {
        item.removeEventListener("click", item.boundClickHandler);
      }
    });

    // Remove created elements
    if (this.mobileToggle && this.mobileToggle.parentNode) {
      this.mobileToggle.parentNode.removeChild(this.mobileToggle);
    }

    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }

    // Clear references
    this.sidebar = null;
    this.overlay = null;
    this.collapseBtn = null;
    this.mobileToggle = null;

    // Restore body scroll
    document.body.style.overflow = "";

    console.log("🗑️ Sidebar menu destroyed - all listeners removed");
  }
}

// Auto-initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.sidebarMenu = new SidebarMenu();
});

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = SidebarMenu;
}
