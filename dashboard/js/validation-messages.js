/**
 * Secure Validation Message System
 * Version 3.2 - Last Update on 11/01/2025 - Search Pro Configuration Loading - Google Sheets / CSV / Business JSON integration, runtime synchronization, Exact matches config, Silence Console Fix
 * Handles inline field validation messages with XSS protection
 *
 * SECURITY ENHANCEMENTS:
 * - Replaced innerHTML with safe DOM creation
 * - Input sanitization for all message content
 * - Message type validation
 * - Content safety validation
 * - Length limits to prevent abuse
 * - Safe screen reader announcements
 * - Error handling and logging
 */

class SecureValidationManager {
  constructor() {
    this.activeMessages = new Map();
    this.messageTimeouts = new Map();
    this.maxMessageLength = 500; // Prevent abuse
    this.maxActiveMessages = 20; // Prevent spam
    this.validTypes = ["error", "success", "warning", "info"];
    console.log("🛡️ Secure Validation Manager initialized with XSS protection");
  }

  /**
   * Sanitize text input to prevent XSS
   */
  sanitizeInput(input) {
    if (typeof input !== "string") {
      return String(input || "");
    }

    // Remove HTML tags and decode entities safely
    const temp = document.createElement("div");
    temp.textContent = input;
    const sanitized = temp.innerHTML;

    // Apply length limits
    if (sanitized.length > this.maxMessageLength) {
      console.warn("🚨 Security: Validation message truncated due to length limit");
      return sanitized.substring(0, this.maxMessageLength) + "...";
    }

    return sanitized;
  }

  /**
   * Validate message type
   */
  validateType(type) {
    const sanitizedType = this.sanitizeInput(type).toLowerCase();
    return this.validTypes.includes(sanitizedType) ? sanitizedType : "info";
  }

  /**
   * Validate content for dangerous patterns
   */
  isContentSafe(content) {
    if (typeof content !== "string") return true;

    const dangerousPatterns = [
      /<script[\s\S]*?>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[\s\S]*?>/i,
      /<object[\s\S]*?>/i,
      /<embed[\s\S]*?>/i,
      /<form[\s\S]*?>/i,
      /<input[\s\S]*?>/i,
    ];

    return !dangerousPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Get icon class for validation type
   */
  getIconClass(type) {
    const iconMap = {
      error: "fas fa-exclamation-circle",
      success: "fas fa-check-circle",
      warning: "fas fa-exclamation-triangle",
      info: "fas fa-info-circle",
    };
    return iconMap[type] || iconMap.info;
  }

  /**
   * Create validation message element safely
   */
  createValidationElement(type, message, fieldId) {
    // Validate and sanitize inputs
    const safeType = this.validateType(type);
    const safeMessage = this.sanitizeInput(message);
    const safeFieldId = this.sanitizeInput(fieldId);

    // Security validation
    if (!this.isContentSafe(message)) {
      console.warn(
        "🚨 Security: Potentially unsafe validation message content detected and sanitized"
      );
    }

    // Log potential security issues
    if (message !== safeMessage || type !== safeType) {
      console.warn("🛡️ Security: Validation message content was sanitized", {
        originalMessage: message,
        sanitizedMessage: safeMessage,
        originalType: type,
        sanitizedType: safeType,
      });
    }

    // 🛡️ SECURE: Create message element using DOM methods
    const messageElement = document.createElement("div");
    messageElement.className = `validation-message validation-${safeType}`;
    messageElement.setAttribute("data-field", safeFieldId);
    messageElement.setAttribute("role", "alert");
    messageElement.setAttribute("aria-live", "polite");

    // Create icon safely
    const iconElement = document.createElement("i");
    iconElement.className = `validation-icon ${this.getIconClass(safeType)}`;
    iconElement.setAttribute("aria-hidden", "true");

    // Create text span safely
    const textElement = document.createElement("span");
    textElement.className = "validation-text";
    textElement.textContent = safeMessage; // 🛡️ SAFE: textContent prevents XSS

    // Assemble message element
    messageElement.appendChild(iconElement);
    messageElement.appendChild(textElement);

    return messageElement;
  }

  /**
   * Show validation message for a specific field with security enhancements
   */
  showValidationMessage(field, type, message, duration = 3000) {
    try {
      if (!field) {
        console.warn("🚨 Security: No field provided for validation message");
        return;
      }

      // Prevent spam attacks
      if (this.activeMessages.size >= this.maxActiveMessages) {
        console.warn("🚨 Security: Maximum validation messages reached, preventing spam");
        return;
      }

      // Validate inputs
      const sanitizedMessage = this.sanitizeInput(message);
      const validatedType = this.validateType(type);
      const safeDuration = Math.max(1000, Math.min(30000, Number(duration) || 3000));

      // Get field information safely
      const fieldId = this.sanitizeInput(field.id || field.name || "unknown");
      const formGroup = field.closest(".form-group");

      if (!formGroup) {
        console.warn("🚨 Security: Form group not found for validation message");
        return;
      }

      // Clear existing message and timeout for this field
      this.clearValidationMessage(fieldId);

      // 🛡️ SECURE: Create message element safely
      const messageElement = this.createValidationElement(validatedType, sanitizedMessage, fieldId);

      // Add to form group
      formGroup.appendChild(messageElement);

      // Store reference
      this.activeMessages.set(fieldId, messageElement);

      // Show with animation
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.classList.add("show");
        }
      }, 50);

      // Auto-hide after duration
      const timeout = setTimeout(() => {
        this.clearValidationMessage(fieldId);
      }, safeDuration);

      this.messageTimeouts.set(fieldId, timeout);

      // Safe accessibility announcement
      this.announceValidation(sanitizedMessage, validatedType);
    } catch (error) {
      console.error("🚨 Security: Error showing validation message:", error);
      // Fallback: show basic browser alert for critical errors
      if (type === "error" && message) {
        alert(`Validation Error: ${this.sanitizeInput(message)}`);
      }
    }
  }

  /**
   * Clear validation message for a specific field
   */
  clearValidationMessage(fieldId) {
    try {
      const safeFieldId = this.sanitizeInput(fieldId);

      // Clear timeout
      if (this.messageTimeouts.has(safeFieldId)) {
        clearTimeout(this.messageTimeouts.get(safeFieldId));
        this.messageTimeouts.delete(safeFieldId);
      }

      // Remove message element
      if (this.activeMessages.has(safeFieldId)) {
        const messageElement = this.activeMessages.get(safeFieldId);
        if (messageElement && messageElement.parentNode) {
          messageElement.classList.remove("show");
          setTimeout(() => {
            if (messageElement.parentNode) {
              messageElement.parentNode.removeChild(messageElement);
            }
          }, 200);
        }
        this.activeMessages.delete(safeFieldId);
      }
    } catch (error) {
      console.error("🚨 Security: Error clearing validation message:", error);
    }
  }

  /**
   * Clear all validation messages safely
   */
  clearAllValidationMessages() {
    try {
      // Clear all timeouts
      this.messageTimeouts.forEach((timeout, fieldId) => {
        try {
          clearTimeout(timeout);
        } catch (error) {
          console.error("🚨 Security: Error clearing timeout:", error);
        }
      });
      this.messageTimeouts.clear();

      // Remove all message elements
      this.activeMessages.forEach((messageElement, fieldId) => {
        try {
          if (messageElement && messageElement.parentNode) {
            messageElement.classList.remove("show");
            setTimeout(() => {
              if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
              }
            }, 200);
          }
        } catch (error) {
          console.error("🚨 Security: Error removing message element:", error);
        }
      });
      this.activeMessages.clear();

      // Remove any orphaned validation messages safely
      try {
        document.querySelectorAll(".validation-message").forEach((element) => {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        });
      } catch (error) {
        console.error("🚨 Security: Error removing orphaned messages:", error);
      }

      console.log("🧹 All validation messages cleared safely");
    } catch (error) {
      console.error("🚨 Security: Error clearing all validation messages:", error);
    }
  }

  /**
   * Announce validation to screen readers safely
   */
  announceValidation(message, type) {
    try {
      const safeMessage = this.sanitizeInput(message);
      const safeType = this.validateType(type);

      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", "polite");
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";

      // 🛡️ SAFE: Use textContent to prevent XSS in screen reader announcements
      const announcementText = `${safeType === "error" ? "Error" : safeType === "success" ? "Success" : safeType === "warning" ? "Warning" : "Info"}: ${safeMessage}`;
      announcement.textContent = announcementText;

      document.body.appendChild(announcement);

      setTimeout(() => {
        if (announcement.parentNode) {
          document.body.removeChild(announcement);
        }
      }, 1000);
    } catch (error) {
      console.error("🚨 Security: Error announcing validation:", error);
    }
  }

  /**
   * Get current message count (for debugging/monitoring)
   */
  getActiveMessageCount() {
    return this.activeMessages.size;
  }

  /**
   * Get messages for a specific field
   */
  getMessagesForField(fieldId) {
    const safeFieldId = this.sanitizeInput(fieldId);
    return this.activeMessages.has(safeFieldId) ? this.activeMessages.get(safeFieldId) : null;
  }

  /**
   * Validate if field is safe to attach messages to
   */
  isFieldSafe(field) {
    if (!field || typeof field.closest !== "function") {
      return false;
    }

    // Check if field is in a form group
    const formGroup = field.closest(".form-group");
    return !!formGroup;
  }

  /**
   * Security method: validate all current messages
   */
  validateAllMessages() {
    let issuesFound = 0;

    this.activeMessages.forEach((messageElement, fieldId) => {
      try {
        if (!messageElement.parentNode) {
          console.warn("🚨 Security: Orphaned message element detected");
          this.activeMessages.delete(fieldId);
          issuesFound++;
        }

        const textElement = messageElement.querySelector(".validation-text");
        if (textElement && !this.isContentSafe(textElement.textContent)) {
          console.warn("🚨 Security: Unsafe content detected in active message");
          this.clearValidationMessage(fieldId);
          issuesFound++;
        }
      } catch (error) {
        console.error("🚨 Security: Error validating message:", error);
        issuesFound++;
      }
    });

    return { issuesFound, totalMessages: this.activeMessages.size };
  }

  /**
   * Emergency cleanup method
   */
  emergencyCleanup() {
    try {
      console.warn("🚨 Security: Performing emergency cleanup of validation system");

      // Force clear all timeouts
      this.messageTimeouts.forEach((timeout) => clearTimeout(timeout));
      this.messageTimeouts.clear();

      // Force clear all messages
      this.activeMessages.clear();

      // Remove all validation message elements from DOM
      document.querySelectorAll(".validation-message").forEach((element) => {
        try {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        } catch (error) {
          console.error("Error removing element:", error);
        }
      });

      console.log("✅ Emergency cleanup completed");
    } catch (error) {
      console.error("🚨 Security: Emergency cleanup failed:", error);
    }
  }
}

// Backward compatibility layer
class ValidationManager extends SecureValidationManager {
  constructor() {
    super();
    console.log("🛡️ Secure Validation Manager initialized");
  }
}

// Create global instance
window.validationManager = new ValidationManager();

// Enhanced global shortcut functions with validation
window.showValidationMessage = function (field, type, message, duration) {
  try {
    window.validationManager.showValidationMessage(field, type, message, duration);
  } catch (error) {
    console.error("🚨 Global showValidationMessage failed:", error);
    // Fallback for critical validation errors
    if (type === "error") {
      alert(`Validation Error: ${String(message || "Unknown error")}`);
    }
  }
};

window.clearValidationMessage = function (fieldId) {
  try {
    window.validationManager.clearValidationMessage(fieldId);
  } catch (error) {
    console.error("🚨 Global clearValidationMessage failed:", error);
  }
};

window.clearAllValidationMessages = function () {
  try {
    window.validationManager.clearAllValidationMessages();
  } catch (error) {
    console.error("🚨 Global clearAllValidationMessages failed:", error);
    // Emergency fallback
    window.validationManager.emergencyCleanup();
  }
};

// Additional security utilities
window.ValidationSecurity = {
  /**
   * Validate validation parameters before showing
   */
  validateParams(field, type, message) {
    const isValid =
      window.validationManager.isFieldSafe(field) &&
      window.validationManager.isContentSafe(message);

    if (!isValid) {
      console.warn("🚨 Security: Potentially unsafe validation parameters blocked");
      return false;
    }

    return true;
  },

  /**
   * Safe validation wrapper that pre-validates content
   */
  safeShowValidation(field, type, message, duration) {
    if (this.validateParams(field, type, message)) {
      window.showValidationMessage(field, type, message, duration);
    } else {
      console.error("🚨 Validation blocked due to security validation failure");
    }
  },

  /**
   * Get validation system status
   */
  getSystemStatus() {
    return {
      activeMessages: window.validationManager.getActiveMessageCount(),
      validation: window.validationManager.validateAllMessages(),
    };
  },
};

// Security event logging
document.addEventListener("DOMContentLoaded", () => {
  console.log("🛡️ Secure Validation System loaded with the following protections:");
  console.log("  ✅ XSS prevention via safe DOM creation");
  console.log("  ✅ Input sanitization for all message content");
  console.log("  ✅ Message type validation");
  console.log("  ✅ Content safety validation");
  console.log("  ✅ Spam prevention (max 20 active messages)");
  console.log("  ✅ Length limits (max 500 chars)");
  console.log("  ✅ Safe screen reader announcements");
  console.log("  ✅ Emergency cleanup capabilities");
});
