/**
 * Tab Content Loading System
 * Version 3.2 - Last Update on 11/01/2025 - Search Pro Configuration Loading - Google Sheets / CSV / Business JSON integration, runtime synchronization, Exact matches config, Silence Console Fix
 * Handles dynamic loading of tab content with security and caching
 */

class TabLoader {
  constructor() {
    this.tabContentCache = {};
    this.loadingIndicator = `
            <div class="panel-loading" role="status" aria-live="polite" aria-label="Loading content" data-loaded="false">
                <div class="loading-spinner"></div>
                <p>Loading settings...</p>
            </div>
        `;
    this.errorTemplate = `
            <div class="panel-error">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="error-content">
                    <h3>Failed to load content</h3>
                    <p>There was an error loading this tab's content. Please try again.</p>
                    <button class="btn btn-secondary btn-retry">Retry</button>
                </div>
            </div>
        `;
    this.init();
  }

  /**
   * Initialize tab loader
   */
  init() {
    this.setupTabListeners();
    console.log("🔄 Tab Loader initialized");
  }

  /**
   * Setup tab click listeners
   */
  setupTabListeners() {
    const tabButtons = document.querySelectorAll(".nav-item");
    tabButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const tabId = button.getAttribute("data-tab");
        if (tabId) {
          this.switchTab(tabId);
        }
      });
    });
  }

  /**
   * Switch to a specific tab and load its content
   */
  switchTab(tabId) {
    try {
      // Sanitize input
      const safeTabId = this.sanitizeTabId(tabId);

      // Update active states
      document.querySelectorAll(".nav-item").forEach((btn) => {
        btn.classList.remove("active");
        btn.setAttribute("aria-selected", "false");
      });

      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.classList.remove("active");
      });

      // Activate selected tab
      const activeButton = document.querySelector(`[data-tab="${safeTabId}"]`);
      const activePanel = document.getElementById(`${safeTabId}-panel`);

      if (activeButton && activePanel) {
        activeButton.classList.add("active");
        activeButton.setAttribute("aria-selected", "true");
        activePanel.classList.add("active");

        // Load tab content if not already loaded
        this.loadTabContent(safeTabId, activePanel);

        console.log(`🔄 Switched to ${safeTabId} tab`);

        // Dispatch a custom event that other scripts can listen for
        document.dispatchEvent(
          new CustomEvent("tabChanged", {
            detail: { tabId: safeTabId },
          })
        );
      }
    } catch (error) {
      console.error("Error showing tab:", error);
    }
  }

  /**
   * Load tab content from external file
   */
  loadTabContent(tabId, tabPanel) {
    try {
      // Check if content is already loaded
      if (tabPanel.dataset.loaded === "true") {
        console.log(`Tab content already loaded for ${tabId}`);
        return;
      }

      // Show loading indicator and maintain height to prevent page jump
      const currentHeight = tabPanel.offsetHeight;
      if (currentHeight > 100) {
        const loadingDiv = document.createElement("div");
        loadingDiv.style.minHeight = `${currentHeight}px`;
        this.safeSetContent(loadingDiv, this.loadingIndicator);
        tabPanel.textContent = "";
        tabPanel.appendChild(loadingDiv);
      } else {
        this.safeSetContent(tabPanel, this.loadingIndicator);
      }

      // Check if content is in cache
      if (this.tabContentCache[tabId]) {
        console.log(`Loading ${tabId} tab content from cache`);
        this.safeSetContent(tabPanel, this.tabContentCache[tabId]);
        tabPanel.dataset.loaded = "true";
        this.initializeTabContent(tabId, tabPanel);
        return;
      }

      console.log(`Fetching content for ${tabId} tab`);

      // File mapping for renamed tabs
      const fileMap = { management: "knowledge" };
      const fileId = fileMap[tabId] || tabId;

      // Fetch tab content with improved error handling
      fetch(`tabs/${fileId}-tab.html`)
        .then((response) => {
          if (!response.ok) {
            // Handle 403 errors specifically for server restrictions
            if (response.status === 403) {
              throw new Error(
                `Server security policy blocks access to tab files (HTTP 403). This is common with production servers that restrict subdirectory access.`
              );
            }
            throw new Error(
              `Failed to load tab content: ${response.status} ${response.statusText}`
            );
          }
          return response.text();
        })
        .then((html) => {
          // Sanitize content for security
          const sanitizedHtml = this.sanitizeContent(html);

          // Update tab panel safely
          this.safeSetContent(tabPanel, sanitizedHtml);
          tabPanel.dataset.loaded = "true";

          // Cache content
          this.tabContentCache[tabId] = sanitizedHtml;

          // Initialize content
          this.initializeTabContent(tabId, tabPanel);

          console.log(`✅ Loaded content for ${tabId} tab`);
        })
        .catch((error) => {
          console.error(`❌ Error loading ${tabId} tab content:`, error);
          console.log(`🔍 Attempting to use fallback content for ${tabId}...`);

          // Try fallback content first
          try {
            const fallbackContent = this.getFallbackContent(tabId);
            if (fallbackContent) {
              console.log(
                `📄 Successfully using fallback content for ${tabId} tab due to server restrictions`
              );
              this.safeSetContent(tabPanel, fallbackContent);
              tabPanel.dataset.loaded = "true";
              this.tabContentCache[tabId] = fallbackContent;
              this.initializeTabContent(tabId, tabPanel);
              return; // Exit successfully
            }
          } catch (fallbackError) {
            console.error(`❌ Error with fallback content for ${tabId}:`, fallbackError);
          }

          console.warn(`⚠️ No fallback content available for ${tabId} tab`);
          // Show enhanced error message
          this.safeSetContent(tabPanel, this.getEnhancedErrorTemplate(error.message));

          // Add retry button functionality
          const retryButton = tabPanel.querySelector(".btn-retry");
          if (retryButton) {
            retryButton.addEventListener("click", () => {
              tabPanel.dataset.loaded = "false";
              this.loadTabContent(tabId, tabPanel);
            });
          }
        });
    } catch (error) {
      console.error("Error loading tab content:", error);
      this.safeSetContent(tabPanel, this.errorTemplate);
    }
  }

  /**
   * Safely set content using DOM creation methods - FIXED XSS ISSUE
   * @param {Element} element - Target element
   * @param {string} content - HTML content to set
   */
  safeSetContent(element, content) {
    try {
      // SECURITY FIX: Use DOMParser instead of innerHTML to prevent XSS
      const parser = new DOMParser();
      const sanitizedContent = this.sanitizeContent(content);
      const doc = parser.parseFromString(sanitizedContent, "text/html");

      // Clear existing content
      element.textContent = "";

      // Safely append parsed nodes
      while (doc.body.firstChild) {
        element.appendChild(doc.body.firstChild);
      }

      console.log("✅ Content set safely using DOM methods");
    } catch (error) {
      console.error("Error setting content:", error);
      // Fallback to text content only
      element.textContent = "Error loading content. Please refresh the page.";
    }
  }

  /**
   * Initialize the loaded tab content
   */
  initializeTabContent(tabId, tabPanel) {
    try {
      // Dispatch an event that the control panel script can listen for
      const event = new CustomEvent("tabContentLoaded", {
        detail: { tabId, tabPanel },
      });
      document.dispatchEvent(event);

      // Setup tooltips within the tab
      this.setupTooltips(tabPanel);

      console.log(`🎯 Initialized content for ${tabId} tab`);
    } catch (error) {
      console.error("Error initializing tab content:", error);
    }
  }

  /**
   * Setup tooltips within a container
   */
  setupTooltips(container) {
    try {
      const tooltips = container.querySelectorAll(".help-tooltip");

      tooltips.forEach((tooltip) => {
        // Mobile/tablet click behavior
        if ("ontouchstart" in window) {
          tooltip.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Remove active class from other tooltips
            document.querySelectorAll(".help-tooltip.active").forEach((other) => {
              if (other !== tooltip) {
                other.classList.remove("active");
              }
            });

            // Toggle active class on current tooltip
            tooltip.classList.toggle("active");

            // Close tooltip when clicking elsewhere
            const closeTooltip = (event) => {
              if (!tooltip.contains(event.target)) {
                tooltip.classList.remove("active");
                document.removeEventListener("click", closeTooltip);
              }
            };

            if (tooltip.classList.contains("active")) {
              setTimeout(() => {
                document.addEventListener("click", closeTooltip);
              }, 0);
            }
          });
        }

        // Keyboard accessibility
        tooltip.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            tooltip.click();
          }
        });

        // Make focusable for keyboard navigation
        if (!tooltip.hasAttribute("tabindex")) {
          tooltip.setAttribute("tabindex", "0");
        }
      });

      console.log(`🎯 ${tooltips.length} tooltips initialized in tab content`);
    } catch (error) {
      console.error("Error setting up tooltips:", error);
    }
  }

  /**
   * Sanitize tab ID for security
   */
  sanitizeTabId(tabId) {
    // Only allow alphanumeric and hyphen characters
    return String(tabId || "").replace(/[^a-z0-9-]/gi, "");
  }

  /**
   * Sanitize HTML content for security
   */
  sanitizeContent(html) {
    try {
      // Create a DOMParser to parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Remove any script tags
      doc.querySelectorAll("script").forEach((script) => script.remove());

      // Get the sanitized HTML
      return doc.body.innerHTML;
    } catch (error) {
      console.error("Error sanitizing content:", error);
      return "";
    }
  }

  /**
   * Load all tabs on demand for prefetching
   */
  preloadAllTabs() {
    const tabs = [
      "general",
      "appearance",
      "display",
      "content",
      "filtering",
      "advanced",
      "management",
      "data-sources",
    ];

    // File mapping for renamed tabs
    const fileMap = { management: "knowledge" };

    tabs.forEach((tabId) => {
      const fileId = fileMap[tabId] || tabId;
      fetch(`tabs/${fileId}-tab.html`)
        .then((response) => response.text())
        .then((html) => {
          this.tabContentCache[tabId] = this.sanitizeContent(html);
          console.log(`✅ Preloaded ${tabId} tab content`);
        })
        .catch((error) => {
          console.error(`❌ Error preloading ${tabId} tab:`, error);
        });
    });
  }

  /**
   * Load initial tab based on URL hash or default to first tab
   */
  loadInitialTab() {
    try {
      // Check for hash in URL
      const hash = window.location.hash.substring(1);
      const validTabs = [
        "general",
        "appearance",
        "display",
        "content",
        "filtering",
        "advanced",
        "management",
        "data-sources",
      ];

      // If hash is a valid tab, load it
      if (hash && validTabs.includes(hash)) {
        this.switchTab(hash);
      } else {
        // Otherwise load the first tab (general)
        this.switchTab("general");
      }
    } catch (error) {
      console.error("Error loading initial tab:", error);
      // Fallback to general tab
      this.switchTab("general");
    }
  }

  /**
   * Get enhanced error template with specific error message
   */
  getEnhancedErrorTemplate(errorMessage) {
    return `
      <div class="panel-error">
        <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="error-content">
          <h3>Failed to load content</h3>
          <p>${errorMessage || "There was an error loading this tab's content."}</p>
          <div class="error-details">
            <p><strong>Possible causes:</strong></p>
            <ul>
              <li>Server security restrictions (403 error)</li>
              <li>Network connectivity issues</li>
              <li>File permissions or path issues</li>
            </ul>
          </div>
          <button class="btn btn-secondary btn-retry">Retry</button>
        </div>
      </div>
    `;
  }

  /**
   * Get fallback content for common tabs when server access fails
   */
  getFallbackContent(tabId) {
    const fallbackContents = {
      management: `
        <div class="panel-header">
          <div class="panel-title">
            <i class="fas fa-cogs panel-icon" aria-hidden="true"></i>
            <h2>Management</h2>
          </div>
          <p class="panel-description">Configuration storage, export, and deployment settings</p>
        </div>
        <div class="panel-content">
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Server Restriction Notice:</strong> Full tab content could not be loaded due to server security policies (HTTP 403). Basic functionality is provided below.
          </div>
          
          <section class="config-section">
            <div class="section-header">
              <h3 class="section-title">
                <i class="fas fa-database section-icon"></i>
                Configuration Storage
              </h3>
            </div>
            <div class="form-grid">
              <div class="info-message">
                <i class="fas fa-info-circle"></i>
                <span>Settings are stored in browser localStorage. Use browser dev tools to access if needed.</span>
              </div>
            </div>
          </section>

          <section class="config-section">
            <div class="section-header">
              <h3 class="section-title">
                <i class="fas fa-download section-icon"></i>
                Export Configuration
              </h3>
            </div>
            <div class="form-grid">
              <button class="btn btn-primary" onclick="alert('Full management features require server access to tab files.')">
                <i class="fas fa-download"></i> Export Config (Limited)
              </button>
            </div>
          </section>
        </div>
      `,
      "data-sources": `
        <div class="panel-header">
          <div class="panel-title">
            <i class="fas fa-database panel-icon" aria-hidden="true"></i>
            <h2>Data Sources</h2>
          </div>
          <p class="panel-description">External data integration settings</p>
        </div>
        <div class="panel-content">
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Server Restriction Notice:</strong> Full tab content could not be loaded due to server security policies (HTTP 403). Basic functionality is provided below.
          </div>
          
          <section class="config-section">
            <div class="section-header">
              <h3 class="section-title">
                <i class="fas fa-table section-icon"></i>
                Google Sheets Integration
              </h3>
            </div>
            <div class="form-grid">
              <div class="info-message">
                <i class="fas fa-info-circle"></i>
                <span>Configure Google Sheets data sources. Full configuration requires server access.</span>
              </div>
            </div>
          </section>

          <section class="config-section">
            <div class="section-header">
              <h3 class="section-title">
                <i class="fas fa-building section-icon"></i>
                Business Data
              </h3>
            </div>
            <div class="form-grid">
              <div class="info-message">
                <i class="fas fa-info-circle"></i>
                <span>Configure business data integration. Full configuration requires server access.</span>
              </div>
            </div>
          </section>
        </div>
      `,
      general: `
        <div class="panel-header">
          <div class="panel-title">
            <i class="fas fa-cog panel-icon" aria-hidden="true"></i>
            <h2>General Settings</h2>
          </div>
          <p class="panel-description">Basic search configuration options</p>
        </div>
        <div class="panel-content">
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Server Restriction Notice:</strong> Full tab content could not be loaded due to server security policies (HTTP 403). Basic functionality is provided below.
          </div>
          
          <section class="config-section">
            <div class="section-header">
              <h3 class="section-title">
                <i class="fas fa-search section-icon"></i>
                Search Behavior
              </h3>
            </div>
            <div class="form-grid">
              <div class="info-message">
                <i class="fas fa-info-circle"></i>
                <span>Configure search behavior and performance settings. Full configuration requires server access.</span>
              </div>
            </div>
          </section>
        </div>
      `,
      advanced: `
        <div class="panel-header">
          <div class="panel-title">
            <i class="fas fa-code panel-icon" aria-hidden="true"></i>
            <h2>Advanced Settings</h2>
          </div>
          <p class="panel-description">Advanced configuration and developer options</p>
        </div>
        <div class="panel-content">
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Server Restriction Notice:</strong> Full tab content could not be loaded due to server security policies (HTTP 403).
          </div>
        </div>
      `,
      appearance: `
        <div class="panel-header">
          <div class="panel-title">
            <i class="fas fa-palette panel-icon" aria-hidden="true"></i>
            <h2>Appearance</h2>
          </div>
          <p class="panel-description">Visual styling and theme options</p>
        </div>
        <div class="panel-content">
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Server Restriction Notice:</strong> Full tab content could not be loaded due to server security policies (HTTP 403).
          </div>
        </div>
      `,
      display: `
        <div class="panel-header">
          <div class="panel-title">
            <i class="fas fa-desktop panel-icon" aria-hidden="true"></i>
            <h2>Display Settings</h2>
          </div>
          <p class="panel-description">Control what appears in search results</p>
        </div>
        <div class="panel-content">
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Server Restriction Notice:</strong> Full tab content could not be loaded due to server security policies (HTTP 403).
          </div>
        </div>
      `,
      content: `
        <div class="panel-header">
          <div class="panel-title">
            <i class="fas fa-list panel-icon" aria-hidden="true"></i>
            <h2>Content Settings</h2>
          </div>
          <p class="panel-description">Configure what content types to include in search</p>
        </div>
        <div class="panel-content">
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Server Restriction Notice:</strong> Full tab content could not be loaded due to server security policies (HTTP 403).
          </div>
        </div>
      `,
      filtering: `
        <div class="panel-header">
          <div class="panel-title">
            <i class="fas fa-filter panel-icon" aria-hidden="true"></i>
            <h2>Filtering</h2>
          </div>
          <p class="panel-description">Content filtering and exclusion rules</p>
        </div>
        <div class="panel-content">
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Server Restriction Notice:</strong> Full tab content could not be loaded due to server security policies (HTTP 403).
          </div>
        </div>
      `,
    };

    return fallbackContents[tabId] || null;
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.tabLoader = new TabLoader();
  window.tabLoader.loadInitialTab();
});
