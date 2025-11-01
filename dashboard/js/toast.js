/**
 * Secure Toast Notification System
 * Version 3.2 - Last Update on 11/01/2025 - Search Pro Configuration Loading - Google Sheets / CSV / Business JSON integration, runtime synchronization, Exact matches config, Silence Console Fix
 * Handles success, error, warning, and info notifications with XSS protection
 *
 * SECURITY ENHANCEMENTS:
 * - Replaced innerHTML with safe DOM creation
 * - Input sanitization for title and message
 * - XSS prevention through textContent usage
 * - Validation of user inputs
 */

class SecureToastManager {
  constructor() {
    this.toastTimeout = null;
    this.maxToasts = 5; // Prevent spam
    this.activeToasts = new Set();
    this.createToastContainer();
  }

  /**
   * Create toast container if it doesn't exist
   */
  createToastContainer() {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      container.setAttribute("aria-live", "polite");
      container.setAttribute("aria-atomic", "false");
      document.body.appendChild(container);
    }
  }

  /**
   * Sanitize input to prevent XSS attacks
   */
  sanitizeInput(input) {
    if (typeof input !== "string") {
      return String(input || "");
    }

    // Remove any HTML tags and decode entities
    const temp = document.createElement("div");
    temp.textContent = input;
    const sanitized = temp.innerHTML;

    // Additional security: limit length to prevent abuse
    return sanitized.length > 200 ? sanitized.substring(0, 200) + "..." : sanitized;
  }

  /**
   * Validate toast type
   */
  validateType(type) {
    const validTypes = ["success", "error", "warning", "info"];
    return validTypes.includes(type) ? type : "info";
  }

  /**
   * Get icon class for toast type
   */
  getIconClass(type) {
    const icons = {
      success: "fas fa-check-circle",
      error: "fas fa-exclamation-circle",
      warning: "fas fa-exclamation-triangle",
      info: "fas fa-info-circle",
    };
    return icons[type] || icons.info;
  }

  /**
   * Create toast icon element safely
   */
  createToastIcon(type) {
    const iconDiv = document.createElement("div");
    iconDiv.className = "toast-icon";

    const icon = document.createElement("i");
    icon.className = this.getIconClass(type);
    icon.setAttribute("aria-hidden", "true");

    iconDiv.appendChild(icon);
    return iconDiv;
  }

  /**
   * Create toast content element safely
   */
  createToastContent(title, message) {
    const contentDiv = document.createElement("div");
    contentDiv.className = "toast-content";

    // Create title element with sanitized content
    const titleDiv = document.createElement("div");
    titleDiv.className = "toast-title";
    titleDiv.textContent = this.sanitizeInput(title); // 🛡️ SAFE: textContent prevents XSS

    // Create message element with sanitized content
    const messageDiv = document.createElement("div");
    messageDiv.className = "toast-message";
    messageDiv.textContent = this.sanitizeInput(message); // 🛡️ SAFE: textContent prevents XSS

    contentDiv.appendChild(titleDiv);
    contentDiv.appendChild(messageDiv);

    return contentDiv;
  }

  /**
   * Create toast close button safely
   */
  createCloseButton() {
    const closeBtn = document.createElement("button");
    closeBtn.className = "toast-close";
    closeBtn.setAttribute("aria-label", "Close notification");
    closeBtn.setAttribute("type", "button");

    const closeIcon = document.createElement("i");
    closeIcon.className = "fas fa-times";
    closeIcon.setAttribute("aria-hidden", "true");

    closeBtn.appendChild(closeIcon);
    return closeBtn;
  }

  /**
   * Show toast notification with security enhancements
   */
  showToast(type, title, message, duration = 5000) {
    try {
      // Input validation and sanitization
      const validatedType = this.validateType(type);
      const sanitizedTitle = this.sanitizeInput(title);
      const sanitizedMessage = this.sanitizeInput(message);

      // Validate duration
      const safeDuration = Math.max(1000, Math.min(30000, Number(duration) || 5000));

      // Prevent spam - limit number of active toasts
      if (this.activeToasts.size >= this.maxToasts) {
        console.warn("🚨 Toast limit reached - preventing spam");
        return;
      }

      // Log potential security issues
      if (title !== sanitizedTitle || message !== sanitizedMessage) {
        console.warn("🛡️ Security: Toast content was sanitized", {
          originalTitle: title,
          sanitizedTitle: sanitizedTitle,
          originalMessage: message,
          sanitizedMessage: sanitizedMessage,
        });
      }

      const container = document.getElementById("toastContainer");
      if (!container) {
        console.error("Toast container not found");
        return;
      }

      // 🛡️ SECURITY: Create toast element safely using DOM methods
      const toast = document.createElement("div");
      toast.className = `toast ${validatedType}`;
      toast.setAttribute("role", "alert");
      toast.setAttribute("aria-live", "assertive");

      // Generate unique ID for this toast
      const toastId = "toast-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
      toast.id = toastId;

      // Create all elements safely
      const iconElement = this.createToastIcon(validatedType);
      const contentElement = this.createToastContent(sanitizedTitle, sanitizedMessage);
      const closeButton = this.createCloseButton();

      // Assemble toast structure
      toast.appendChild(iconElement);
      toast.appendChild(contentElement);
      toast.appendChild(closeButton);

      // Add event listener for close button
      closeButton.addEventListener("click", () => {
        this.removeToast(toast);
      });

      // Add keyboard support for close button
      closeButton.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.removeToast(toast);
        }
      });

      // Add to container and active toasts tracking
      container.appendChild(toast);
      this.activeToasts.add(toastId);

      // Show with animation
      requestAnimationFrame(() => {
        toast.classList.add("show");
      });

      // Auto-remove after duration with proper cleanup
      toast._timeout = setTimeout(() => {
        this.removeToast(toast);
      }, safeDuration);

      // Accessibility announcement (safe - uses textContent)
      this.announceToScreen(sanitizedTitle, sanitizedMessage);
    } catch (error) {
      console.error("🚨 Toast creation failed:", error);
      // Fallback: show basic browser alert for critical messages
      if (type === "error" && title) {
        alert(`Error: ${this.sanitizeInput(title)}`);
      }
    }
  }

  /**
   * Remove toast notification safely
   */
  removeToast(toast) {
    if (!toast || !toast.parentNode) return;

    try {
      // Remove per-toast timeout
      if (toast._timeout) {
        clearTimeout(toast._timeout);
        toast._timeout = null;
      }
      // Remove from active toasts tracking
      if (toast.id) {
        this.activeToasts.delete(toast.id);
      }

      toast.classList.remove("show");

      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    } catch (error) {
      console.error("🚨 Toast removal failed:", error);
    }
  }

  /**
   * Announce to screen readers safely
   */
  announceToScreen(title, message) {
    try {
      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", "polite");
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";

      // 🛡️ SAFE: Use textContent to prevent XSS in screen reader announcements
      announcement.textContent = `${title}: ${message}`;

      document.body.appendChild(announcement);

      setTimeout(() => {
        if (announcement.parentNode) {
          document.body.removeChild(announcement);
        }
      }, 1000);
    } catch (error) {
      console.error("🚨 Screen reader announcement failed:", error);
    }
  }

  /**
   * Clear all active toasts
   */
  clearAllToasts() {
    try {
      const container = document.getElementById("toastContainer");
      if (container) {
        container.innerHTML = ""; // Safe here as we control the content
      }

      this.activeToasts.clear();

      if (this.toastTimeout) {
        clearTimeout(this.toastTimeout);
        this.toastTimeout = null;
      }
    } catch (error) {
      console.error("🚨 Clear toasts failed:", error);
    }
  }

  /**
   * Get current toast count
   */
  getActiveToastCount() {
    return this.activeToasts.size;
  }

  /**
   * Security method: validate if content is safe
   */
  isContentSafe(content) {
    if (typeof content !== "string") return true;

    // Check for potential XSS patterns
    const dangerousPatterns = [
      /<script[\s\S]*?>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[\s\S]*?>/i,
      /<object[\s\S]*?>/i,
      /<embed[\s\S]*?>/i,
    ];

    return !dangerousPatterns.some((pattern) => pattern.test(content));
  }
}

// Backward compatibility layer
class ToastManager extends SecureToastManager {
  constructor() {
    super();
    console.log("🛡️ Secure Toast Manager initialized with XSS protection");
  }
}

// Create global instance with security enhancements
window.toastManager = new ToastManager();

// Enhanced global shortcut function with validation
window.showToast = function (type, title, message, duration) {
  try {
    window.toastManager.showToast(type, title, message, duration);
  } catch (error) {
    console.error("🚨 Global showToast failed:", error);
    // Fallback for critical errors
    if (type === "error") {
      alert(`Error: ${String(title || "Unknown error")}`);
    }
  }
};

// Additional security utilities
window.ToastSecurity = {
  /**
   * Validate toast parameters before showing
   */
  validateToastParams(type, title, message) {
    const isValid =
      window.toastManager.isContentSafe(title) && window.toastManager.isContentSafe(message);

    if (!isValid) {
      console.warn("🚨 Security: Potentially unsafe toast content blocked");
      return false;
    }

    return true;
  },

  /**
   * Safe toast wrapper that pre-validates content
   */
  safeShowToast(type, title, message, duration) {
    if (this.validateToastParams(type, title, message)) {
      window.showToast(type, title, message, duration);
    } else {
      console.error("🚨 Toast blocked due to security validation failure");
    }
  },
};

// Security event logging
document.addEventListener("DOMContentLoaded", () => {
  console.log("🛡️ Secure Toast System loaded with the following protections:");
  console.log("  ✅ XSS prevention via DOM creation");
  console.log("  ✅ Input sanitization");
  console.log("  ✅ Content validation");
  console.log("  ✅ Spam prevention");
  console.log("  ✅ Error handling");
  console.log("  ✅ Accessibility enhancements");
});
