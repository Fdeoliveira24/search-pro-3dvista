/**
 * Search Pro Control Panel - Knowledge Tab Handler
 * Version 3.2 - Last Update on 11/01/2025 - Search Pro Configuration Loading - Google Sheets / CSV / Business JSON integration, runtime synchronization, Exact matches config, Silence Console Fix
 * Handles all functionality specific to the Knowledge Base settings tab
 */

class KnowledgeTabHandler {
  constructor() {
    this.core = null;
    this.tabId = "management";
  }

  /**
   * Set the core instance
   */
  setCore(core) {
    this.core = core;
  }

  /**
   * Initialize knowledge tab functionality
   */
  init(container) {
    try {
      console.log("🧠 Initializing Knowledge tab handler");

      // Setup knowledge-specific handlers
      this.setupKnowledgeHandlers(container);

      // Setup interactive elements
      this.setupInteractiveElements(container);

      // Setup accessibility features
      this.setupAccessibilityFeatures(container);

      console.log("✅ Knowledge tab handler initialized");
    } catch (error) {
      console.error("❌ Error initializing Knowledge tab:", error);
    }
  }

  /**
   * Setup knowledge-specific handlers
   */
  setupKnowledgeHandlers(container) {
    try {
      // Setup code snippet copy handlers
      this.setupCodeCopyHandlers(container);

      // Setup step interaction handlers
      this.setupStepHandlers(container);

      // Setup info card interactions
      this.setupInfoCardHandlers(container);

      console.log("🧠 Knowledge handlers initialized");
    } catch (error) {
      console.error("🚨 Error setting up knowledge handlers:", error);
    }
  }

  /**
   * Setup code snippet copy functionality
   */
  setupCodeCopyHandlers(container) {
    try {
      const codeElements = container.querySelectorAll(".file-path, code");

      codeElements.forEach((codeElement) => {
        // Make code elements selectable and add copy functionality
        codeElement.style.cursor = "pointer";
        codeElement.title = "Click to copy";

        codeElement.addEventListener("click", (e) => {
          this.copyToClipboard(e.target.textContent);
          this.showCopyFeedback(e.target);
        });
      });

      console.log(`📋 Code copy handlers set up for ${codeElements.length} elements`);
    } catch (error) {
      console.error("🚨 Error setting up code copy handlers:", error);
    }
  }

  /**
   * Setup step interaction handlers
   */
  setupStepHandlers(container) {
    try {
      const stepElements = container.querySelectorAll(".sequence-step");

      stepElements.forEach((step, index) => {
        step.addEventListener("click", () => {
          this.highlightStep(step);
          this.showStepDetails(step, index + 1);
        });

        // Add keyboard support
        step.setAttribute("tabindex", "0");
        step.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            step.click();
          }
        });
      });

      console.log(`📝 Step handlers set up for ${stepElements.length} steps`);
    } catch (error) {
      console.error("🚨 Error setting up step handlers:", error);
    }
  }

  /**
   * Setup info card interactions
   */
  setupInfoCardHandlers(container) {
    try {
      const infoCards = container.querySelectorAll(".management-info-card, .permanent-config-card");

      infoCards.forEach((card) => {
        // Add hover effects and click interactions
        card.addEventListener("mouseenter", () => {
          card.style.transform = "translateY(-2px)";
          card.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
        });

        card.addEventListener("mouseleave", () => {
          card.style.transform = "translateY(0)";
          card.style.boxShadow = "";
        });
      });

      console.log(`ℹ️ Info card handlers set up for ${infoCards.length} cards`);
    } catch (error) {
      console.error("🚨 Error setting up info card handlers:", error);
    }
  }

  /**
   * Setup interactive elements
   */
  setupInteractiveElements(container) {
    try {
      // Add click-to-expand functionality for troubleshooting items
      const troubleItems = container.querySelectorAll(".troubleshooting-item");

      troubleItems.forEach((item) => {
        const description = item.querySelector(".trouble-description");
        if (description) {
          // Initially collapse descriptions on mobile
          if (window.innerWidth <= 768) {
            description.style.display = "none";
            item.style.cursor = "pointer";

            item.addEventListener("click", () => {
              const isVisible = description.style.display !== "none";
              description.style.display = isVisible ? "none" : "block";
              item.classList.toggle("expanded", !isVisible);
            });
          }
        }
      });

      console.log("🎯 Interactive elements set up");
    } catch (error) {
      console.error("🚨 Error setting up interactive elements:", error);
    }
  }

  /**
   * Setup accessibility features
   */
  setupAccessibilityFeatures(container) {
    try {
      // Add ARIA labels and descriptions
      const sections = container.querySelectorAll(".config-section");
      sections.forEach((section, index) => {
        if (!section.getAttribute("role")) {
          section.setAttribute("role", "region");
        }
      });

      // Add proper heading hierarchy
      const headings = container.querySelectorAll("h4, h5");
      headings.forEach((heading) => {
        if (!heading.id) {
          heading.id = `management-heading-${Date.now()}-${Math.random()}`;
        }
      });

      console.log("♿ Accessibility features set up");
    } catch (error) {
      console.error("🚨 Error setting up accessibility features:", error);
    }
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      console.log("📋 Text copied to clipboard");
    } catch (error) {
      console.error("🚨 Error copying to clipboard:", error);
    }
  }

  /**
   * Show copy feedback
   */
  showCopyFeedback(element) {
    try {
      const originalText = element.textContent;
      element.textContent = "✓ Copied!";
      element.style.color = "#10b981";

      setTimeout(() => {
        element.textContent = originalText;
        element.style.color = "";
      }, 1500);

      // Show toast notification if available
      if (this.core && this.core.showToast) {
        this.core.showToast("success", "Copied!", "Code snippet copied to clipboard");
      }
    } catch (error) {
      console.error("🚨 Error showing copy feedback:", error);
    }
  }

  /**
   * Highlight step
   */
  highlightStep(stepElement) {
    try {
      // Remove highlight from other steps
      const allSteps = stepElement.parentElement.querySelectorAll(".sequence-step");
      allSteps.forEach((step) => {
        step.classList.remove("highlighted");
      });

      // Highlight current step
      stepElement.classList.add("highlighted");
    } catch (error) {
      console.error("🚨 Error highlighting step:", error);
    }
  }

  /**
   * Show step details
   */
  showStepDetails(stepElement, stepNumber) {
    try {
      const stepContent = stepElement.querySelector(".step-content");
      if (stepContent) {
        // Show additional details or perform step-specific actions
        console.log(`📝 Step ${stepNumber} selected`);

        // Show toast with step information if available
        if (this.core && this.core.showToast) {
          const stepTitle = stepContent.querySelector("h5")?.textContent || `Step ${stepNumber}`;
          this.core.showToast("info", "Step Selected", stepTitle);
        }
      }
    } catch (error) {
      console.error("🚨 Error showing step details:", error);
    }
  }

  /**
   * Cleanup method
   */
  cleanup() {
    try {
      // Remove any event listeners or cleanup resources if needed
      console.log("🧹 Knowledge tab handler cleaned up");
    } catch (error) {
      console.error("🚨 Error cleaning up knowledge tab:", error);
    }
  }

  /**
   * Get validation status (required by core)
   */
  getValidationStatus() {
    // Consistent with other tab handlers - return boolean for simple validation
    return true;
  }

  /**
   * Handle form validation (required by core)
   */
  validateForm(container) {
    try {
      // Knowledge tab has no form inputs to validate
      // Always return valid since it's informational only
      console.log("🧠 Knowledge tab validation: PASSED");
      return true; // Return boolean for consistency with other tab handlers
    } catch (error) {
      console.error("🚨 Error validating knowledge tab:", error);
      return false; // Return boolean for consistency
    }
  }

  /**
   * Update configuration from form values
   */
  updateConfigFromForm(container) {
    try {
      // Management tab doesn't modify core configuration
      // It's a read-only informational tab
      console.log("📝 Management tab: No configuration to update (informational tab)");
    } catch (error) {
      console.error("❌ Error updating config from Management tab:", error);
    }
  }

  /**
   * Reset tab to defaults
   */
  resetToDefaults() {
    try {
      console.log("🔄 Resetting Management tab to defaults");
      // Management tab doesn't have form values to reset, just state
      this.isInitialized = false;
      console.log("✅ Management tab reset completed");
    } catch (error) {
      console.error("❌ Error resetting Management tab:", error);
    }
  }
}
