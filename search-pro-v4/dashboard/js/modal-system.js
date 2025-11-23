/**
 * Secure Professional Modal System
 * Version 3.2 - Last Update on 11/01/2025 - Search Pro Configuration Loading - Google Sheets / CSV / Business JSON integration, runtime synchronization, Exact matches config, Silence Console Fix
 * Handles confirmation and information modals for critical actions with XSS protection
 *
 * SECURITY ENHANCEMENTS:
 * - Replaced innerHTML with safe DOM creation
 * - Input sanitization for all content
 * - Safe HTML builder for structured content
 * - XSS prevention through content validation
 * - Security logging and monitoring
 */

class SecureModalSystem {
  constructor() {
    this.currentModal = null;
    this.confirmCallback = null;
    this.cancelCallback = null;
    this.autoCloseTimer = null;
    this.eventListenersAttached = false;
    this.maxContentLength = 5000; // Prevent abuse
    this.init();
  }

  /**
   * Initialize modal system
   */
  init() {
    this.createModalContainer();
    this.setupEventListeners();
    console.log("🛡️ Secure Modal system initialized with XSS protection");
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

    // Prevent abuse with length limits
    if (sanitized.length > this.maxContentLength) {
      console.warn("🚨 Security: Modal content truncated due to length limit");
      return sanitized.substring(0, this.maxContentLength) + "...";
    }

    return sanitized;
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
      /<meta[\s\S]*?>/i,
      /<link[\s\S]*?>/i,
    ];

    return !dangerousPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Safe HTML builder for modal content
   * Supports only whitelisted HTML patterns used by the modal system
   */
  buildSafeHTML(htmlString) {
    if (!htmlString || typeof htmlString !== "string") {
      return document.createTextNode("");
    }

    // Security check first
    if (!this.isContentSafe(htmlString)) {
      console.warn("🚨 Security: Dangerous content detected in modal, rendering as plain text");
      const textNode = document.createTextNode(this.sanitizeInput(htmlString));
      return textNode;
    }

    const container = document.createElement("div");

    try {
      // Parse and rebuild safe HTML structures
      this.parseSafeModalHTML(htmlString, container);
    } catch (error) {
      console.error("🚨 Security: HTML parsing failed, falling back to text", error);
      container.textContent = this.sanitizeInput(htmlString);
    }

    return container;
  }

  /**
   * Parse specific modal HTML patterns safely
   */
  parseSafeModalHTML(htmlString, container) {
    // Handle modal-info-box pattern
    const infoBoxRegex = /<div class="modal-info-box">([\s\S]*?)<\/div>/gi;
    const warningBoxRegex = /<div class="modal-warning-box">([\s\S]*?)<\/div>/gi;
    const dangerBoxRegex = /<div class="modal-danger-box">([\s\S]*?)<\/div>/gi;

    let remainingContent = htmlString;
    let hasStructuredContent = false;

    // Process info boxes
    let match;
    while ((match = infoBoxRegex.exec(htmlString)) !== null) {
      const boxContent = match[1];
      const infoBox = this.createInfoBox("info", boxContent);
      container.appendChild(infoBox);
      remainingContent = remainingContent.replace(match[0], "");
      hasStructuredContent = true;
    }

    // Process warning boxes
    while ((match = warningBoxRegex.exec(htmlString)) !== null) {
      const boxContent = match[1];
      const warningBox = this.createInfoBox("warning", boxContent);
      container.appendChild(warningBox);
      remainingContent = remainingContent.replace(match[0], "");
      hasStructuredContent = true;
    }

    // Process danger boxes
    while ((match = dangerBoxRegex.exec(htmlString)) !== null) {
      const boxContent = match[1];
      const dangerBox = this.createInfoBox("danger", boxContent);
      container.appendChild(dangerBox);
      remainingContent = remainingContent.replace(match[0], "");
      hasStructuredContent = true;
    }

    // Handle any remaining content as text
    const cleanedContent = remainingContent.replace(/<\/?div[^>]*>/gi, "").trim();
    if (cleanedContent) {
      const textContent = document.createElement("div");
      textContent.textContent = this.sanitizeInput(cleanedContent);
      if (hasStructuredContent) {
        container.appendChild(textContent);
      } else {
        // If no structured content, just return the text
        container.textContent = this.sanitizeInput(cleanedContent);
      }
    }
  }

  /**
   * Create safe info/warning/danger boxes
   */
  createInfoBox(type, content) {
    const box = document.createElement("div");
    box.className = `modal-${type}-box`;

    // Parse the content for h4 headers and lists
    const h4Regex = /<h4[^>]*>([\s\S]*?)<\/h4>/gi;
    const ulRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;

    let processedContent = content;

    // Handle h4 headers
    let h4Match;
    while ((h4Match = h4Regex.exec(content)) !== null) {
      const headerContent = h4Match[1];
      const header = this.createSafeHeader(headerContent);
      box.appendChild(header);
      processedContent = processedContent.replace(h4Match[0], "");
    }

    // Handle lists
    let ulMatch;
    while ((ulMatch = ulRegex.exec(content)) !== null) {
      const listContent = ulMatch[1];
      const list = this.createSafeList(listContent);
      box.appendChild(list);
      processedContent = processedContent.replace(ulMatch[0], "");
    }

    // Handle any remaining content
    const cleanedContent = processedContent.replace(/<\/?[^>]+>/gi, "").trim();
    if (cleanedContent) {
      const textDiv = document.createElement("div");
      textDiv.textContent = this.sanitizeInput(cleanedContent);
      box.appendChild(textDiv);
    }

    return box;
  }

  /**
   * Create safe header element
   */
  createSafeHeader(headerContent) {
    const header = document.createElement("h4");

    // Extract icon if present
    const iconRegex = /<i class="([^"]*)"[^>]*><\/i>/i;
    const iconMatch = iconRegex.exec(headerContent);

    if (iconMatch) {
      const iconClass = iconMatch[1];
      // Validate icon class for safety
      if (this.isIconClassSafe(iconClass)) {
        const icon = document.createElement("i");
        icon.className = iconClass;
        icon.setAttribute("aria-hidden", "true");
        header.appendChild(icon);
      }
      headerContent = headerContent.replace(iconMatch[0], "");
    }

    // Add the text content safely
    const textContent = headerContent.replace(/<\/?[^>]+>/gi, "").trim();
    const textSpan = document.createElement("span");
    textSpan.textContent = this.sanitizeInput(textContent);
    header.appendChild(textSpan);

    return header;
  }

  /**
   * Create safe list element
   */
  createSafeList(listContent) {
    const list = document.createElement("ul");

    // Extract list items
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;

    while ((liMatch = liRegex.exec(listContent)) !== null) {
      const itemContent = liMatch[1];
      const listItem = document.createElement("li");

      // Handle <strong> tags in list items
      const strongRegex = /<strong[^>]*>([\s\S]*?)<\/strong>/gi;
      let processedItemContent = itemContent;
      let strongMatch;

      while ((strongMatch = strongRegex.exec(itemContent)) !== null) {
        const strongText = strongMatch[1];
        const strongElement = document.createElement("strong");
        strongElement.textContent = this.sanitizeInput(strongText);
        listItem.appendChild(strongElement);
        processedItemContent = processedItemContent.replace(strongMatch[0], "");
      }

      // Handle <code> tags
      const codeRegex = /<code[^>]*>([\s\S]*?)<\/code>/gi;
      let codeMatch;

      while ((codeMatch = codeRegex.exec(processedItemContent)) !== null) {
        const codeText = codeMatch[1];
        const codeElement = document.createElement("code");
        codeElement.textContent = this.sanitizeInput(codeText);
        listItem.appendChild(codeElement);
        processedItemContent = processedItemContent.replace(codeMatch[0], "");
      }

      // Add remaining text content
      const remainingText = processedItemContent.replace(/<\/?[^>]+>/gi, "").trim();
      if (remainingText) {
        const textNode = document.createTextNode(this.sanitizeInput(remainingText));
        listItem.appendChild(textNode);
      }

      list.appendChild(listItem);
    }

    return list;
  }

  /**
   * Validate icon class for safety
   */
  isIconClassSafe(iconClass) {
    // Only allow FontAwesome classes
    const safeIconPattern =
      /^(fas|far|fab|fal|fad)\s+fa-[\w-]+(\s+(fas|far|fab|fal|fad)\s+fa-[\w-]+)*$/;
    return safeIconPattern.test(iconClass);
  }

  /**
   * Create modal container and template - SECURE VERSION
   */
  createModalContainer() {
    // Check if modal already exists
    if (document.getElementById("modalOverlay")) {
      return;
    }

    // 🛡️ SECURE: Create modal structure using DOM methods instead of innerHTML
    const overlay = document.createElement("div");
    overlay.id = "modalOverlay";
    overlay.className = "modal-overlay";

    const container = document.createElement("div");
    container.className = "modal-container";

    // Create header
    const header = this.createModalHeader();

    // Create body
    const body = this.createModalBody();

    // Create footer
    const footer = this.createModalFooter();

    // Assemble modal
    container.appendChild(header);
    container.appendChild(body);
    container.appendChild(footer);
    overlay.appendChild(container);

    // Add to document
    document.body.appendChild(overlay);
  }

  /**
   * Create modal header safely
   */
  createModalHeader() {
    const header = document.createElement("div");
    header.className = "modal-header";

    // Icon container
    const iconContainer = document.createElement("div");
    iconContainer.className = "modal-icon-container";

    const icon = document.createElement("i");
    icon.id = "modalIcon";
    icon.className = "modal-icon";
    iconContainer.appendChild(icon);

    // Title container
    const titleContainer = document.createElement("div");
    titleContainer.className = "modal-title-container";

    const title = document.createElement("h3");
    title.id = "modalTitle";
    title.className = "modal-title";

    const subtitle = document.createElement("p");
    subtitle.id = "modalSubtitle";
    subtitle.className = "modal-subtitle";

    titleContainer.appendChild(title);
    titleContainer.appendChild(subtitle);

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.id = "modalClose";
    closeBtn.className = "modal-close-btn";
    closeBtn.setAttribute("aria-label", "Close modal");
    closeBtn.setAttribute("type", "button");

    const closeIcon = document.createElement("i");
    closeIcon.className = "fas fa-times";
    closeBtn.appendChild(closeIcon);

    // Assemble header
    header.appendChild(iconContainer);
    header.appendChild(titleContainer);
    header.appendChild(closeBtn);

    return header;
  }

  /**
   * Create modal body safely
   */
  createModalBody() {
    const body = document.createElement("div");
    body.className = "modal-body";

    const content = document.createElement("div");
    content.id = "modalContent";
    content.className = "modal-content";

    const details = document.createElement("div");
    details.id = "modalDetails";
    details.className = "modal-details";

    body.appendChild(content);
    body.appendChild(details);

    return body;
  }

  /**
   * Create modal footer safely
   */
  createModalFooter() {
    const footer = document.createElement("div");
    footer.className = "modal-footer";

    const cancelBtn = document.createElement("button");
    cancelBtn.id = "modalCancel";
    cancelBtn.className = "btn btn-secondary modal-btn-cancel";
    cancelBtn.textContent = "Cancel";
    cancelBtn.setAttribute("type", "button");

    const confirmBtn = document.createElement("button");
    confirmBtn.id = "modalConfirm";
    confirmBtn.className = "btn btn-primary modal-btn-confirm";
    confirmBtn.textContent = "Confirm";
    confirmBtn.setAttribute("type", "button");

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);

    return footer;
  }

  /**
   * Setup event listeners - FIXED VERSION WITH DUPLICATE PREVENTION
   */
  setupEventListeners() {
    // CRITICAL FIX: Prevent duplicate event listener attachment
    if (this.eventListenersAttached) {
      console.log("🛑 Event listeners already attached - skipping");
      return;
    }

    const overlay = document.getElementById("modalOverlay");
    const closeBtn = document.getElementById("modalClose");
    const cancelBtn = document.getElementById("modalCancel");
    const confirmBtn = document.getElementById("modalConfirm");

    if (!overlay || !confirmBtn || !cancelBtn) {
      console.warn("⚠️ Modal elements not found - deferring event listener setup");
      return;
    }

    // Store event handlers as instance methods to allow removal
    this.overlayClickHandler = (e) => {
      if (e.target === overlay) {
        e.preventDefault();
        e.stopPropagation();
        console.log("🎯 Modal overlay clicked - closing modal");
        this.closeModal();
      }
    };

    this.closeBtnHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("❌ Modal close button clicked");
      this.closeModal();
    };

    this.cancelBtnHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("❌ Modal cancel button clicked");
      this.handleCancel();
    };

    this.confirmBtnHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("✅ Modal confirm button clicked");
      this.handleConfirm();
    };

    this.keydownHandler = (e) => {
      if (!this.currentModal) return;

      console.log(
        `⌨️ Keyboard event in modal: ${e.key}, ctrlKey: ${e.ctrlKey}, metaKey: ${e.metaKey}`
      );

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          e.stopPropagation();
          console.log("⌨️ Escape key pressed - closing modal");
          this.closeModal();
          break;
        case "Enter":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            console.log("⌨️ Ctrl/Cmd+Enter pressed - confirming modal");
            this.handleConfirm();
          } else {
            console.log("⌨️ Enter key pressed without modifier - ignoring");
          }
          break;
        default:
          console.log(`⌨️ Other key pressed: ${e.key} - no action`);
      }
    };

    // Attach event listeners
    overlay.addEventListener("click", this.overlayClickHandler);
    closeBtn?.addEventListener("click", this.closeBtnHandler);
    cancelBtn.addEventListener("click", this.cancelBtnHandler);
    confirmBtn.addEventListener("click", this.confirmBtnHandler);
    document.addEventListener("keydown", this.keydownHandler);

    this.eventListenersAttached = true;
    console.log("🎯 Secure modal event listeners set up successfully");
  }

  /**
   * Generic modal show method with security enhancements - SECURE VERSION
   */
  showModal(options) {
    const {
      type = "info",
      icon = "fas fa-info-circle",
      title = "Modal",
      subtitle = "",
      content = "",
      details = "",
      confirmText = "OK",
      cancelText = "Cancel",
      confirmClass = "btn-primary",
      hideCancel = false,
      onConfirm = null,
      onCancel = null,
      autoClose = false,
      autoCloseDelay = 0,
    } = options;

    try {
      console.log(
        `🛡️ Secure showModal called - type: ${type}, autoClose: ${autoClose}, delay: ${autoCloseDelay}`
      );

      // Security validation
      if (!this.isContentSafe(content) || !this.isContentSafe(details)) {
        console.warn(
          "🚨 Security: Potentially unsafe modal content detected and will be sanitized"
        );
      }

      // Log potential security issues
      const originalTitle = title;
      const originalSubtitle = subtitle;
      const sanitizedTitle = this.sanitizeInput(title);
      const sanitizedSubtitle = this.sanitizeInput(subtitle);

      if (originalTitle !== sanitizedTitle || originalSubtitle !== sanitizedSubtitle) {
        console.warn("🛡️ Security: Modal title/subtitle was sanitized", {
          originalTitle,
          sanitizedTitle,
          originalSubtitle,
          sanitizedSubtitle,
        });
      }

      // CRITICAL FIX: Clear any existing auto-close timers IMMEDIATELY
      if (this.autoCloseTimer) {
        clearTimeout(this.autoCloseTimer);
        this.autoCloseTimer = null;
        console.log("🔄 Cleared existing auto-close timer");
      }

      // Store callbacks
      this.confirmCallback = onConfirm;
      this.cancelCallback = onCancel;

      // Get modal elements
      const overlay = document.getElementById("modalOverlay");
      if (!overlay) {
        console.error("❌ Modal overlay not found! Creating modal container...");
        this.createModalContainer();
        return this.showModal(options); // Retry after creating container
      }

      const modalIcon = document.getElementById("modalIcon");
      const modalTitle = document.getElementById("modalTitle");
      const modalSubtitle = document.getElementById("modalSubtitle");
      const modalContent = document.getElementById("modalContent");
      const modalDetails = document.getElementById("modalDetails");
      const confirmBtn = document.getElementById("modalConfirm");
      const cancelBtn = document.getElementById("modalCancel");
      const container = overlay.querySelector(".modal-container");

      if (!container) {
        console.error("❌ Modal container not found!");
        return;
      }

      // Set modal type class
      container.className = `modal-container modal-${type}`;

      // 🛡️ SECURE: Set content safely
      if (modalIcon && this.isIconClassSafe(icon)) {
        modalIcon.className = `modal-icon ${icon}`;
      }

      if (modalTitle) modalTitle.textContent = sanitizedTitle;
      if (modalSubtitle) modalSubtitle.textContent = sanitizedSubtitle;

      // 🛡️ SECURE: Handle content and details with safe HTML builder
      if (modalContent) {
        modalContent.innerHTML = ""; // Clear safely
        if (content) {
          const safeContent = this.buildSafeHTML(content);
          modalContent.appendChild(safeContent);
        }
      }

      if (modalDetails) {
        modalDetails.innerHTML = ""; // Clear safely
        if (details) {
          const safeDetails = this.buildSafeHTML(details);
          modalDetails.appendChild(safeDetails);
        }
      }

      // Set button text and styles safely
      if (confirmBtn) {
        confirmBtn.textContent = this.sanitizeInput(confirmText);
        confirmBtn.className = `btn ${confirmClass} modal-btn-confirm`;
      }

      if (cancelBtn) {
        if (hideCancel) {
          cancelBtn.style.display = "none";
        } else {
          cancelBtn.style.display = "inline-flex";
          cancelBtn.textContent = this.sanitizeInput(cancelText);
        }
      }

      // Show modal with animation
      overlay.classList.add("active");
      this.currentModal = type;

      console.log(`✅ Secure modal displayed successfully - type: ${type}`);

      // Focus management
      setTimeout(() => {
        if (confirmBtn && document.getElementById("modalOverlay").classList.contains("active")) {
          if (type !== "success") {
            confirmBtn.focus();
            console.log("🎯 Confirm button focused");
          } else {
            console.log("🎯 Success modal - skipping auto-focus");
          }
        }
      }, 300);

      // Set up auto-close timer (with security restrictions)
      if (autoClose === true && autoCloseDelay > 0 && type !== "success" && type !== "error") {
        console.log(`⏰ Setting up auto-close timer for ${autoCloseDelay}ms (type: ${type})`);
        this.autoCloseTimer = setTimeout(() => {
          console.log(`🔄 Auto-closing ${type} modal after ${autoCloseDelay}ms`);
          if (
            this.currentModal &&
            document.getElementById("modalOverlay").classList.contains("active")
          ) {
            this.handleConfirm();
          }
        }, autoCloseDelay);
      } else {
        console.log(
          `❌ Auto-close disabled - type: ${type}, autoClose: ${autoClose}, delay: ${autoCloseDelay}`
        );
      }
    } catch (error) {
      console.error("🚨 Secure modal creation failed:", error);
      // Fallback to browser alert for critical messages
      if (type === "error" && title) {
        alert(`Error: ${this.sanitizeInput(title)}`);
      }
    }
  }

  /**
   * Show confirmation modal for Apply Settings
   */
  showApplySettingsModal(config, onConfirm, onCancel) {
    this.showModal({
      type: "confirm",
      icon: "fas fa-check-circle",
      title: "Apply Settings",
      subtitle: "Confirm configuration changes",
      content: "Are you sure you want to apply these settings to your tour?",
      details: `
                <div class="modal-warning-box">
                    <h4><i class="fas fa-exclamation-triangle"></i> Important:</h4>
                    <ul>
                        <li>Settings are temporary saved unless downloaded and uploaded to your server</li>
                        <li>Changes will be applied immediately to your browser's local storage</li>
                        <li>Refresh your tour to see the changes take effect</li>
                    </ul>
                </div>
            `,
      confirmText: "Apply Settings",
      cancelText: "Cancel",
      confirmClass: "btn-success",
      onConfirm,
      onCancel,
    });
  }

  /**
   * Show download configuration modal
   */
  showDownloadConfigModal(config, onConfirm, onCancel) {
    let settingsCount;
    try {
      settingsCount = this.countProperties ? this.countProperties(config) : 331;
    } catch (error) {
      console.warn("Error counting properties:", error);
      settingsCount = 331;
    }

    this.showModal({
      type: "info",
      icon: "fas fa-download",
      title: "Download Configuration",
      subtitle: "Export settings as JavaScript file",
      content: "Ready to download your configuration file?",
      details: `
                <div class="modal-info-box">
                    <h4><i class="fas fa-info-circle"></i> File Details</h4>
                    <ul>
                        <li><strong>File Name:</strong> search-pro-config.js</li>
                        <li><strong>File Size:</strong> ~${Math.ceil(JSON.stringify(config).length / 1024)}KB</li>
                    </ul>
                </div>
<div class="modal-info-box">
                    <h4><i class="fas fa-lightbulb"></i> Integration Guide:</h4>
                    <ul>
                    <li>Download the file search-pro-config.js</li>
                    <li>Upload it to the directory:/config/</li>
                    <li>Ensure the full path is: /search-pro-config/config/search-pro-config.js</li>
                    <li>Changes will automatically apply for all users</li>
                    <li>Refresh your application to see changes</li>
                    </ul>
                </div>
            `,
      confirmText: "Download File",
      cancelText: "Cancel",
      confirmClass: "btn-primary",
      onConfirm,
      onCancel,
    });
  }

  /**
   * Show confirmation modal for Load Config
   */
  showLoadConfigModal(onConfirm, onCancel) {
    this.showModal({
      type: "warning",
      icon: "fas fa-upload",
      title: "Load Configuration",
      subtitle: "Import settings from file",
      content: "Loading a configuration file will replace all current settings.",
      details: `
                <div class="modal-warning-box">
                    <h4><i class="fas fa-exclamation-triangle"></i> Important Notice</h4>
                    <ul>
                        <li>All current settings will be overwritten</li>
                        <li>Unsaved changes will be lost</li>
                        <li>This action cannot be undone</li>
                        <li><strong>Only JSON format (.json) files are supported</strong></li>
                    </ul>
                </div>
                <div class="modal-info-box">
                    <h4><i class="fas fa-info-circle"></i> Tip:</h4>
                    <ul>
                        <li>Consider downloading your current configuration as a backup before proceeding.</li>
                    </ul>
                </div>
            `,
      confirmText: "Choose File",
      cancelText: "Cancel",
      confirmClass: "btn-warning",
      onConfirm,
      onCancel,
    });
  }

  /**
   * Show confirmation modal for Reset All
   */
  showResetAllModal(onConfirm, onCancel) {
    this.showModal({
      type: "danger",
      icon: "fas fa-undo-alt",
      title: "Reset All Settings",
      subtitle: "Return to default configuration",
      content: "This will reset ALL settings to their default values.",
      details: `
                <div class="modal-danger-box">
                    <h4><i class="fas fa-exclamation-triangle"></i> This Action Cannot Be Undone</h4>
                    <ul>
                        <li>All current configuration will be lost and replaced with default values.</li>
                    </ul>
                </div>
                <div class="modal-info-box">
                    <h4><i class="fas fa-lightbulb"></i> Recommendation:</h4>
                    <ul>
                        <li>Download your current configuration as a backup before resetting.</li>
                    </ul>
                </div>
            `,
      confirmText: "Reset Everything",
      cancelText: "Keep Settings",
      confirmClass: "btn-danger",
      onConfirm,
      onCancel,
    });
  }

  /**
   * Show error modal with enhanced security
   */
  showErrorModal(action, error, onConfirm) {
    // Sanitize action title
    let title = typeof action === "string" ? this.sanitizeInput(action) : "Operation Failed";

    // Clean up any duplicate "Failed" text
    title = title.replace(/Failed\s+Failed/gi, "Failed");

    // Ensure title ends with "Failed"
    if (!title.match(/Failed\s*$/i)) {
      title += " Failed";
    }

    // Sanitize error information
    let errorMessage = "An error occurred during the operation.";
    let errorDetails = "";

    if (error && error.message) {
      errorMessage = this.sanitizeInput(error.message);

      // Build safe error details based on error type
      if (error.message.includes("malicious")) {
        errorDetails = `
                    <div class="modal-danger-box">
                        <h4><i class="fas fa-exclamation-triangle"></i> Security Alert</h4>
                        <ul>
                            <li><strong>File:</strong> ${this.sanitizeInput(error.file || "Unknown file")}</li>
                            <li><strong>Issue:</strong> The configuration contains patterns that might be security concerns</li>
                            <li><strong>Size:</strong> ${this.sanitizeInput(error.size || "Unknown size")}</li>
                        </ul>
                    </div>
                `;
      } else if (error.message.includes("Invalid JSON format")) {
        errorDetails = `
                    <div class="modal-danger-box">
                        <h4><i class="fas fa-exclamation-triangle"></i> JSON Format Error</h4>
                        <ul>
                            <li><strong>File:</strong> ${this.sanitizeInput(error.file || "Unknown file")}</li>
                            <li><strong>Error:</strong> ${this.sanitizeInput(error.message || "Invalid JSON structure")}</li>
                            <li><strong>Size:</strong> ${this.sanitizeInput(error.size || "Unknown size")}</li>
                        </ul>
                    </div>
                `;
      }
    }

    this.showModal({
      type: "error",
      icon: "fas fa-exclamation-triangle",
      title: title,
      subtitle: "An error occurred",
      content: errorMessage,
      details: errorDetails,
      confirmText: onConfirm ? "Try Again" : "OK",
      cancelText: "Cancel",
      confirmClass: "btn-danger",
      hideCancel: !onConfirm,
      onConfirm,
    });
  }

  /**
   * Close modal
   */
  closeModal() {
    console.log("🚪 Closing modal...");

    const overlay = document.getElementById("modalOverlay");
    if (overlay) {
      overlay.classList.remove("active");
      console.log("✅ Modal overlay hidden");
    }

    // Clear any auto-close timers when manually closing
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
      console.log("🔄 Auto-close timer cleared");
    }

    // Reset modal state
    this.currentModal = null;
    this.confirmCallback = null;
    this.cancelCallback = null;

    console.log("✅ Modal closed successfully");
  }

  /**
   * Handle confirm action
   */
  handleConfirm() {
    console.log("✅ Modal confirm button clicked");

    if (this.confirmCallback) {
      console.log("🎯 Executing confirm callback");
      this.confirmCallback();
    }

    this.closeModal();
  }

  /**
   * Handle cancel action
   */
  handleCancel() {
    console.log("❌ Modal cancel button clicked");

    if (this.cancelCallback) {
      console.log("🎯 Executing cancel callback");
      this.cancelCallback();
    }

    this.closeModal();
  }

  /**
   * Count properties in config object
   */
  countProperties(obj, depth = 0, maxDepth = 5) {
    if (depth > maxDepth || !obj || typeof obj !== "object") {
      return 0;
    }

    let count = 0;

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        count += 1;
        if (typeof obj[key] === "object" && obj[key] !== null) {
          count += this.countProperties(obj[key], depth + 1, maxDepth);
        }
      }
    }

    return count;
  }

  /**
   * Show quick confirm modal
   */
  showQuickConfirm(title, content, onConfirm) {
    this.showModal({
      type: "warning",
      icon: "fas fa-question-circle",
      title,
      content,
      confirmText: "Yes",
      cancelText: "No",
      confirmClass: "btn-warning",
      onConfirm,
      onCancel: () => {},
    });
  }

  /**
   * Show success modal - Now disabled to prevent duplicate toasts
   */
  showSuccessModal(action, details) {
    console.log("🎯 Success modal requested for action (disabled to prevent duplicates):", action);
    // Note: Success messages are now handled by individual components to avoid duplicates
    // This method is kept for backward compatibility but does not show duplicate toasts
  }
}

// Backward compatibility layer
class ModalSystem extends SecureModalSystem {
  constructor() {
    super();
    console.log("🛡️ Secure Modal System initialized with XSS protection");
  }
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = ModalSystem;
}

// Make available globally
window.ModalSystem = ModalSystem;

// Security event logging
document.addEventListener("DOMContentLoaded", () => {
  console.log("🛡️ Secure Modal System loaded with the following protections:");
  console.log("  ✅ XSS prevention via safe DOM creation");
  console.log("  ✅ Input sanitization for all content");
  console.log("  ✅ Safe HTML parsing for structured content");
  console.log("  ✅ Icon class validation");
  console.log("  ✅ Content length limits");
  console.log("  ✅ Security logging and monitoring");
});
