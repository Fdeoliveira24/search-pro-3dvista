/**
 * Secure Logo & Branding Management System - FIXED VERSION
 * Version 3.2 - Last Update on 11/01/2025 - Search Pro Configuration Loading - Google Sheets / CSV / Business JSON integration, runtime synchronization, Exact matches config, Silence Console Fix
 * Handles logo upload, logo URL, and editable brand text with live preview and persistence
 *
 * SECURITY ENHANCEMENTS:
 * - Input sanitization for brand text and URLs
 * - Safe DOM creation instead of HTML injection
 * - Enhanced file upload validation
 * - Secure localStorage operations
 * - XSS prevention through content validation
 * - URL security validation
 *
 * FIX: Direct DOM element integration with modal system
 */

class SecureLogoManager {
  constructor() {
    this.logoElement = null;
    this.currentLogoSrc = null;
    this.supportedFormats = ["jpg", "jpeg", "png", "gif", "svg", "webp"];
    this.maxFileSize = 2 * 1024 * 1024; // 2MB
    this.maxBrandTextLength = 50;
    this.maxUrlLength = 2000;
    this.init();
  }

  /**
   * Initialize logo manager with branding
   */
  init() {
    this.logoElement = document.querySelector(".sidebar-logo");
    if (!this.logoElement) {
      console.warn("Logo element not found");
      return;
    }

    // Double-click logo to open modal
    this.logoElement.addEventListener("dblclick", () => this.showLogoModal());

    // Load saved branding preferences
    setTimeout(() => this.loadBrandingPreferences(), 500);

    console.log("🛡️ Secure Logo Manager with Branding initialized");
  }

  /**
   * Sanitize text input to prevent XSS
   */
  sanitizeInput(input, maxLength = null) {
    if (typeof input !== "string") {
      return String(input || "");
    }

    // Remove HTML tags and decode entities safely
    const temp = document.createElement("div");
    temp.textContent = input;
    const sanitized = temp.innerHTML;

    // Apply length limits if specified
    if (maxLength && sanitized.length > maxLength) {
      console.warn("🚨 Security: Input truncated due to length limit");
      return sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Validate and sanitize URL
   */
  sanitizeUrl(url) {
    if (!url || typeof url !== "string") {
      return "";
    }

    // Basic length check
    if (url.length > this.maxUrlLength) {
      console.warn("🚨 Security: URL truncated due to length limit");
      url = url.substring(0, this.maxUrlLength);
    }

    // 🔧 CRITICAL FIX: Allow data URLs for uploaded images
    if (url.startsWith("data:image/")) {
      // Validate data URL format for security
      if (this.isValidDataUrl(url)) {
        return url; // Allow valid data URLs through
      } else {
        console.warn("🚨 Security: Invalid data URL format detected");
        return "";
      }
    }

    // Remove other dangerous protocols (but keep data: for images)
    const dangerousProtocols = ["javascript:", "vbscript:", "file:", "ftp:"];
    const lowerUrl = url.toLowerCase();

    for (const protocol of dangerousProtocols) {
      if (lowerUrl.startsWith(protocol)) {
        console.warn("🚨 Security: Dangerous protocol detected in URL");
        return "";
      }
    }

    return this.sanitizeInput(url);
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
    ];

    return !dangerousPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Create brand text input section safely
   */
  createBrandTextSection(currentBrandText) {
    const section = document.createElement("div");
    section.className = "modal-section";

    // Create title
    const title = document.createElement("h4");
    title.className = "section-title";

    const icon = document.createElement("i");
    icon.className = "fas fa-font";
    title.appendChild(icon);

    const titleText = document.createTextNode(" Brand Text");
    title.appendChild(titleText);

    // Create input container
    const container = document.createElement("div");
    container.className = "brand-text-group";

    const input = document.createElement("input");
    input.type = "text";
    input.id = "brandTextInput";
    input.className = "form-input";
    input.placeholder = "Enter your app or company name";
    input.value = this.sanitizeInput(currentBrandText, this.maxBrandTextLength);
    input.maxLength = this.maxBrandTextLength;

    container.appendChild(input);

    const helpText = document.createElement("small");
    helpText.className = "help-text";
    helpText.textContent = "This will appear in the sidebar";

    section.appendChild(title);
    section.appendChild(container);
    section.appendChild(helpText);

    return section;
  }

  /**
   * Create file upload section safely
   */
  createFileUploadSection() {
    const section = document.createElement("div");
    section.className = "modal-section";

    // Create title
    const title = document.createElement("h4");
    title.className = "section-title";

    const icon = document.createElement("i");
    icon.className = "fas fa-upload";
    title.appendChild(icon);

    const titleText = document.createTextNode(" Upload Logo");
    title.appendChild(titleText);

    // Create drop zone
    const dropZone = document.createElement("div");
    dropZone.className = "file-drop-zone";
    dropZone.id = "logoDropZone";

    const dropContent = document.createElement("div");
    dropContent.className = "drop-zone-content";

    const uploadIcon = document.createElement("i");
    uploadIcon.className = "fas fa-cloud-upload-alt";

    const dragText = document.createElement("p");
    dragText.textContent = "Drag & drop your logo here";

    const orSpan = document.createElement("span");
    orSpan.textContent = "or";

    const browseBtn = document.createElement("button");
    browseBtn.className = "btn btn-primary";
    browseBtn.textContent = "Browse Files";
    browseBtn.type = "button";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "logoFileInput";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";

    // Safe event handler
    browseBtn.addEventListener("click", (e) => {
      e.preventDefault();
      fileInput.click();
    });

    dropContent.appendChild(uploadIcon);
    dropContent.appendChild(dragText);
    dropContent.appendChild(orSpan);
    dropContent.appendChild(browseBtn);
    dropContent.appendChild(fileInput);

    dropZone.appendChild(dropContent);

    const helpText = document.createElement("small");
    helpText.className = "help-text";
    helpText.textContent = "JPG, PNG, SVG, WebP • Max 2MB • Square format recommended";

    section.appendChild(title);
    section.appendChild(dropZone);
    section.appendChild(helpText);

    return section;
  }

  /**
   * Create URL input section safely
   */
  createUrlInputSection(currentLogoSrc) {
    const section = document.createElement("div");
    section.className = "modal-section";

    // Create title
    const title = document.createElement("h4");
    title.className = "section-title";

    const icon = document.createElement("i");
    icon.className = "fas fa-link";
    title.appendChild(icon);

    const titleText = document.createTextNode(" Or Use Logo URL");
    title.appendChild(titleText);

    // Create URL input group
    const urlGroup = document.createElement("div");
    urlGroup.className = "url-input-group";

    const urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.id = "logoUrlInput";
    urlInput.className = "form-input";
    urlInput.placeholder = "https://example.com/logo.png";

    // Safe URL handling
    const safeCurrentUrl = this.isDataUrl(currentLogoSrc) ? "" : currentLogoSrc || "";
    urlInput.value = this.sanitizeUrl(safeCurrentUrl);

    const applyBtn = document.createElement("button");
    applyBtn.id = "applyLogoUrl";
    applyBtn.className = "btn btn-primary";
    applyBtn.textContent = "Apply URL";
    applyBtn.type = "button";

    urlGroup.appendChild(urlInput);
    urlGroup.appendChild(applyBtn);

    const helpText = document.createElement("small");
    helpText.className = "help-text";
    helpText.textContent = "Enter the direct URL to your logo image";

    section.appendChild(title);
    section.appendChild(urlGroup);
    section.appendChild(helpText);

    return section;
  }

  /**
   * Show logo & branding modal with security enhancements - FIXED VERSION
   */
  showLogoModal() {
    if (!window.searchProControlPanel || !window.searchProControlPanel.modalSystem) {
      alert("Modal system not available");
      return;
    }

    try {
      // Get and sanitize current values
      const originalBrandText = this.getCurrentBrandText();
      const originalLogoSrc = this.getCurrentLogoSrc();

      // Validate current values for safety
      if (!this.isContentSafe(originalBrandText)) {
        console.warn("🚨 Security: Current brand text contains unsafe content");
      }

      // Store original values for cancel
      const safeOriginalBrandText = this.sanitizeInput(originalBrandText, this.maxBrandTextLength);
      const safeOriginalLogoSrc = this.sanitizeUrl(originalLogoSrc);

      // Temp values for modal session
      let tempBrandText = safeOriginalBrandText;
      let tempLogoSrc = safeOriginalLogoSrc;

      // 🛡️ SECURE: Create modal content using DOM methods ONLY
      const modalContainer = document.createElement("div");

      // Create sections safely
      const brandSection = this.createBrandTextSection(safeOriginalBrandText);
      const uploadSection = this.createFileUploadSection();
      const urlSection = this.createUrlInputSection(safeOriginalLogoSrc);

      modalContainer.appendChild(brandSection);
      modalContainer.appendChild(uploadSection);
      modalContainer.appendChild(urlSection);

      // 🔧 FIX: Pass DOM element directly instead of HTML string
      const modalDetails = document.getElementById("modalDetails");

      // Create custom modal with direct DOM manipulation
      this.showCustomModal({
        type: "info",
        icon: "fas fa-image",
        title: "Logo & Branding Settings",
        subtitle: "Customize your application logo and brand name",
        content: "",
        detailsElement: modalContainer, // Pass actual DOM element
        confirmText: "Save Changes",
        cancelText: "Cancel",
        onConfirm: () => {
          try {
            const brandTextInput = document.getElementById("brandTextInput");
            let newBrandText = brandTextInput
              ? this.sanitizeInput(brandTextInput.value.trim(), this.maxBrandTextLength)
              : tempBrandText;

            if (!newBrandText) {
              newBrandText = safeOriginalBrandText; // fallback to original if empty
            }

            // Security validation
            if (!this.isContentSafe(newBrandText)) {
              console.warn("🚨 Security: Brand text contains unsafe content, using fallback");
              newBrandText = safeOriginalBrandText;
            }

            this.setBrandText(newBrandText);
            this.safeLocalStorageSet("searchPro_brandText", newBrandText);

            if (tempLogoSrc !== safeOriginalLogoSrc) {
              const safeTempLogoSrc = this.sanitizeUrl(tempLogoSrc);
              if (this.isValidUrl(safeTempLogoSrc) || this.isDataUrl(safeTempLogoSrc)) {
                this.setLogoFromUrl(safeTempLogoSrc);
                this.safeLocalStorageSet("searchPro_logoSrc", safeTempLogoSrc);
              } else {
                console.warn("🚨 Security: Invalid logo URL, keeping original");
              }
            }

            if (window.toastManager) {
              window.toastManager.showToast(
                "success",
                "Settings Saved",
                "All branding settings have been saved"
              );
            }
          } catch (error) {
            console.error("🚨 Security: Error saving branding settings:", error);
            if (window.toastManager) {
              window.toastManager.showToast(
                "error",
                "Save Failed",
                "Failed to save branding settings"
              );
            }
          }
        },
        onCancel: () => {
          console.log("🎯 Logo modal cancelled - no changes made");
        },
      });

      // Setup event handlers after modal is created
      setTimeout(() => {
        this.setupModalEventHandlers(tempBrandText, tempLogoSrc, (newBrandText, newLogoSrc) => {
          tempBrandText = newBrandText;
          tempLogoSrc = newLogoSrc;
        });
      }, 100);
    } catch (error) {
      console.error("🚨 Security: Error creating logo modal:", error);
      if (window.toastManager) {
        window.toastManager.showToast("error", "Modal Error", "Failed to open branding settings");
      }
    }
  }

  /**
   * Custom modal display with direct DOM element support
   */
  showCustomModal(options) {
    const {
      type = "info",
      icon = "fas fa-info-circle",
      title = "Modal",
      subtitle = "",
      content = "",
      detailsElement = null,
      confirmText = "OK",
      cancelText = "Cancel",
      onConfirm = null,
      onCancel = null,
    } = options;

    // Store callbacks in modal system
    const modalSystem = window.searchProControlPanel.modalSystem;
    modalSystem.confirmCallback = onConfirm;
    modalSystem.cancelCallback = onCancel;

    // Get modal elements
    const overlay = document.getElementById("modalOverlay");
    const modalIcon = document.getElementById("modalIcon");
    const modalTitle = document.getElementById("modalTitle");
    const modalSubtitle = document.getElementById("modalSubtitle");
    const modalContent = document.getElementById("modalContent");
    const modalDetails = document.getElementById("modalDetails");
    const confirmBtn = document.getElementById("modalConfirm");
    const cancelBtn = document.getElementById("modalCancel");
    const container = overlay.querySelector(".modal-container");

    // Set modal type class
    container.className = `modal-container modal-${type}`;

    // Set content safely
    if (modalIcon) modalIcon.className = `modal-icon ${icon}`;
    if (modalTitle) modalTitle.textContent = title;
    if (modalSubtitle) modalSubtitle.textContent = subtitle;
    if (modalContent) modalContent.textContent = content;

    // 🔧 FIX: Direct DOM element insertion
    if (modalDetails && detailsElement) {
      modalDetails.innerHTML = ""; // Clear existing content
      modalDetails.appendChild(detailsElement); // Insert actual DOM element
    }

    // Set button text and styles
    if (confirmBtn) {
      confirmBtn.textContent = confirmText;
      confirmBtn.className = `btn btn-primary modal-btn-confirm`;
    }

    if (cancelBtn) {
      cancelBtn.style.display = "inline-flex";
      cancelBtn.textContent = cancelText;
    }

    // Show modal with animation
    overlay.classList.add("active");
    modalSystem.currentModal = type;

    console.log(`✅ Custom modal displayed successfully - type: ${type}`);

    // Focus management
    setTimeout(() => {
      if (confirmBtn && overlay.classList.contains("active")) {
        confirmBtn.focus();
        console.log("🎯 Confirm button focused");
      }
    }, 300);
  }

  // [Rest of the methods remain the same as in the original secure implementation]

  /**
   * Setup modal event handlers securely
   */
  setupModalEventHandlers(initialBrandText, initialLogoSrc, updateCallback) {
    try {
      // Brand text input handler
      const brandTextInput = document.getElementById("brandTextInput");
      if (brandTextInput) {
        brandTextInput.addEventListener("input", (e) => {
          try {
            const sanitizedValue = this.sanitizeInput(e.target.value, this.maxBrandTextLength);
            updateCallback(sanitizedValue, initialLogoSrc);
          } catch (error) {
            console.error("🚨 Security: Error handling brand text input:", error);
          }
        });
      }

      // File input handler
      const fileInput = document.getElementById("logoFileInput");
      if (fileInput) {
        fileInput.addEventListener("change", (e) => {
          this.handleFileUpload(e, updateCallback, initialBrandText);
        });
      }

      // URL input handlers
      const urlInput = document.getElementById("logoUrlInput");
      const applyUrlBtn = document.getElementById("applyLogoUrl");
      if (urlInput && applyUrlBtn) {
        applyUrlBtn.addEventListener("click", () => {
          this.handleUrlApply(urlInput, updateCallback, initialBrandText);
        });

        urlInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            this.handleUrlApply(urlInput, updateCallback, initialBrandText);
          }
        });
      }

      // Drag & drop
      this.setupSecureDragAndDrop(updateCallback, initialBrandText);
    } catch (error) {
      console.error("🚨 Security: Error setting up modal event handlers:", error);
    }
  }

  /**
   * Handle file upload securely
   */
  handleFileUpload(event, updateCallback, brandText) {
    try {
      const file = event.target.files[0];
      if (!file) return;

      // Enhanced security validation
      const validation = this.validateFileUpload(file);
      if (!validation.isValid) {
        if (window.toastManager) {
          window.toastManager.showToast("error", "Invalid File", validation.error);
        }
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const dataUrl = ev.target.result;
          if (this.isValidDataUrl(dataUrl)) {
            updateCallback(brandText, dataUrl);
            // Clear URL input when file is uploaded
            const urlInput = document.getElementById("logoUrlInput");
            if (urlInput) urlInput.value = "";
          } else {
            console.warn("🚨 Security: Invalid data URL generated");
            if (window.toastManager) {
              window.toastManager.showToast("error", "Invalid File", "File generated invalid data");
            }
          }
        } catch (error) {
          console.error("🚨 Security: Error processing file:", error);
          if (window.toastManager) {
            window.toastManager.showToast("error", "File Error", "Failed to process uploaded file");
          }
        }
      };

      reader.onerror = () => {
        console.error("🚨 Security: FileReader error");
        if (window.toastManager) {
          window.toastManager.showToast("error", "File Error", "Failed to read uploaded file");
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("🚨 Security: Error handling file upload:", error);
    }
  }

  /**
   * Handle URL apply securely
   */
  handleUrlApply(urlInput, updateCallback, brandText) {
    try {
      const url = this.sanitizeUrl(urlInput.value.trim());

      if (url && this.isValidUrl(url)) {
        updateCallback(brandText, url);
        if (window.toastManager) {
          window.toastManager.showToast(
            "success",
            "Logo Updated",
            "Logo URL applied (pending save)"
          );
        }
      } else {
        if (window.toastManager) {
          window.toastManager.showToast("error", "Invalid URL", "Please enter a valid image URL");
        }
      }
    } catch (error) {
      console.error("🚨 Security: Error applying URL:", error);
      if (window.toastManager) {
        window.toastManager.showToast("error", "URL Error", "Failed to apply logo URL");
      }
    }
  }

  /**
   * Setup secure drag and drop
   */
  setupSecureDragAndDrop(updateCallback, brandText) {
    const dropZone = document.getElementById("logoDropZone");
    if (!dropZone) return;

    try {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
      });

      ["dragenter", "dragover"].forEach((eventName) => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add("drag-over"));
      });

      ["dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove("drag-over"));
      });

      dropZone.addEventListener("drop", (e) => {
        try {
          const files = e.dataTransfer.files;
          if (files.length > 0) {
            this.handleDroppedFile(files[0], updateCallback, brandText);
          }
        } catch (error) {
          console.error("🚨 Security: Error handling dropped file:", error);
        }
      });
    } catch (error) {
      console.error("🚨 Security: Error setting up drag and drop:", error);
    }
  }

  /**
   * Handle dropped file securely
   */
  handleDroppedFile(file, updateCallback, brandText) {
    const validation = this.validateFileUpload(file);
    if (!validation.isValid) {
      if (window.toastManager) {
        window.toastManager.showToast("error", "Invalid File", validation.error);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const dataUrl = ev.target.result;
        if (this.isValidDataUrl(dataUrl)) {
          updateCallback(brandText, dataUrl);
          // Clear URL input when file is dropped
          const urlInput = document.getElementById("logoUrlInput");
          if (urlInput) urlInput.value = "";
        } else {
          console.warn("🚨 Security: Invalid data URL from dropped file");
        }
      } catch (error) {
        console.error("🚨 Security: Error processing dropped file:", error);
      }
    };
    reader.readAsDataURL(file);
  }

  /**
   * Enhanced file upload validation
   */
  validateFileUpload(file) {
    // Size check
    if (file.size > this.maxFileSize) {
      return {
        isValid: false,
        error: `File too large (max ${this.maxFileSize / 1024 / 1024}MB)`,
      };
    }

    // Extension check
    if (!this.isValidImageFile(file)) {
      return {
        isValid: false,
        error: "Invalid file type. Only image files are allowed.",
      };
    }

    // File name validation
    const fileName = file.name.toLowerCase();
    const dangerousPatterns = [
      /[<>:"|?*]/, // Invalid filename characters
      /^\./, // Hidden files
      /\.(exe|bat|cmd|scr|js|html|php)$/i, // Dangerous extensions
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(fileName)) {
        return {
          isValid: false,
          error: "Filename contains invalid characters.",
        };
      }
    }

    // MIME type check (can be spoofed but adds layer)
    if (file.type && !file.type.startsWith("image/")) {
      return { isValid: false, error: "File must be an image." };
    }

    return { isValid: true };
  }

  /**
   * Validate data URL
   */
  isValidDataUrl(dataUrl) {
    if (typeof dataUrl !== "string") return false;

    // Check for valid data URL pattern
    const dataUrlPattern = /^data:image\/(jpeg|jpg|png|gif|svg\+xml|webp);base64,/i;
    return dataUrlPattern.test(dataUrl);
  }

  /**
   * Get current brand text safely
   */
  getCurrentBrandText() {
    try {
      const brandElement = document.querySelector(".brand-text");
      if (brandElement) {
        return this.sanitizeInput(brandElement.textContent.trim(), this.maxBrandTextLength);
      }
      const saved = this.safeLocalStorageGet("searchPro_brandText");
      return saved || "Your App Name";
    } catch (error) {
      console.error("🚨 Security: Error getting brand text:", error);
      return "Your App Name";
    }
  }

  /**
   * Get current logo URL safely
   */
  getCurrentLogoSrc() {
    try {
      // Try localStorage first, then DOM
      const saved = this.safeLocalStorageGet("searchPro_logoSrc");
      if (saved) return this.sanitizeUrl(saved);

      if (this.logoElement) {
        const bg = this.logoElement.style.backgroundImage;
        if (bg && bg.startsWith("url(")) {
          const url = bg.slice(5, -2); // remove url("...") wrapper
          return this.sanitizeUrl(url);
        }
      }
      return "";
    } catch (error) {
      console.error("🚨 Security: Error getting logo source:", error);
      return "";
    }
  }

  /**
   * Set brand text in sidebar safely
   */
  setBrandText(text) {
    try {
      const brandElement = document.querySelector(".brand-text");
      if (brandElement) {
        const safeText = this.sanitizeInput(text, this.maxBrandTextLength);
        brandElement.textContent = safeText; // Safe - uses textContent
      }
    } catch (error) {
      console.error("🚨 Security: Error setting brand text:", error);
    }
  }

  /**
   * Set logo from URL safely
   */
  setLogoFromUrl(url) {
    try {
      if (!this.logoElement) {
        console.warn("⚠️ Logo element not found");
        return false;
      }

      let safeUrl = url;

      // Handle data URLs specially - don't re-sanitize them
      if (url && url.startsWith("data:image/")) {
        if (!this.isValidDataUrl(url)) {
          console.warn("🚨 Security: Invalid data URL format");
          return false;
        }
        safeUrl = url; // Data URLs are already validated, use as-is
      } else {
        safeUrl = this.sanitizeUrl(url);
      }

      // Validate final URL
      if (safeUrl && (this.isValidUrl(safeUrl) || this.isDataUrl(safeUrl))) {
        // For data URLs, use them directly; for regular URLs, escape quotes
        const cssUrl = safeUrl.startsWith("data:")
          ? safeUrl
          : safeUrl.replace(/'/g, "\\'").replace(/"/g, '\\"');

        this.logoElement.style.backgroundImage = `url('${cssUrl}')`;
        this.currentLogoSrc = safeUrl;
        console.log(`✅ Logo updated successfully`);
        return true;
      } else {
        console.warn("⚠️ Invalid URL provided for logo");
        return false;
      }
    } catch (error) {
      console.error("🚨 Security: Error setting logo from URL:", error);
      return false;
    }
  }

  /**
   * Check if file is a valid image type
   */
  isValidImageFile(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    return this.supportedFormats.includes(ext);
  }

  /**
   * Enhanced URL validation
   */
  isValidUrl(url) {
    try {
      if (!url || typeof url !== "string") return false;

      const urlObj = new URL(url);

      // Only allow http and https protocols
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return false;
      }

      // Basic hostname validation
      if (!urlObj.hostname || urlObj.hostname.length < 1) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if URL is a data URL
   */
  isDataUrl(url) {
    return typeof url === "string" && url.startsWith("data:image/");
  }

  /**
   * Safe localStorage set operation
   */
  safeLocalStorageSet(key, value) {
    try {
      const safeKey = this.sanitizeInput(key);
      const safeValue = this.sanitizeInput(value);
      localStorage.setItem(safeKey, safeValue);
    } catch (error) {
      console.error("🚨 Security: Error setting localStorage:", error);
    }
  }

  /**
   * Safe localStorage get operation
   */
  safeLocalStorageGet(key, defaultValue = null) {
    try {
      const safeKey = this.sanitizeInput(key);
      const value = localStorage.getItem(safeKey);
      return value ? this.sanitizeInput(value) : defaultValue;
    } catch (error) {
      console.error("🚨 Security: Error getting localStorage:", error);
      return defaultValue;
    }
  }

  /**
   * Load branding preferences safely
   */
  loadBrandingPreferences() {
    try {
      // Load logo preference
      const savedLogo = this.safeLocalStorageGet("searchPro_logoSrc");
      if (savedLogo && (this.isValidUrl(savedLogo) || this.isDataUrl(savedLogo))) {
        this.setLogoFromUrl(savedLogo);
      }

      // Load brand text preference
      const savedText = this.safeLocalStorageGet("searchPro_brandText");
      if (savedText) {
        this.setBrandText(savedText);
      }
    } catch (error) {
      console.error("🚨 Security: Error loading branding preferences:", error);
    }
  }

  /**
   * Test all major Logo Manager functionality and security
   */
  testFunctionality() {
    console.log("🧪 Testing Logo Manager Functionality...");

    // Test 1: Check if brand element exists (should work now!)
    const brandElement = document.querySelector(".brand-text");
    if (brandElement) {
      console.log("✅ Brand element found with .brand-text class");
    } else {
      console.error("❌ Brand element not found!");
      return false;
    }

    // Test 2: Check if logo element exists
    if (!this.logoElement) {
      console.error("❌ Logo element not found!");
      return false;
    }
    console.log("✅ Logo element found");

    // Test 3: Test brand text functionality
    const originalText = this.getCurrentBrandText();
    this.setBrandText("Test Brand");
    const testResult = this.getCurrentBrandText();
    this.setBrandText(originalText); // Restore

    if (testResult === "Test Brand") {
      console.log("✅ Brand text functionality working perfectly");
    } else {
      console.error("❌ Brand text functionality still broken");
      return false;
    }

    // Test 4: Test data URL validation
    const testDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    if (this.isValidDataUrl(testDataUrl)) {
      console.log("✅ Data URL validation working");
    } else {
      console.error("❌ Data URL validation broken");
      return false;
    }

    console.log("🎉 All functionality tests passed! Logo manager is ready.");
    return true;
  }
}

// Backward compatibility layer
class LogoManager extends SecureLogoManager {
  constructor() {
    super();
    console.log("🛡️ Secure Logo Manager initialized with XSS protection and DOM integration fix");
  }
}

// Auto-initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.logoManager = new LogoManager();
});

// Security event logging
document.addEventListener("DOMContentLoaded", () => {
  console.log("🛡️ Fixed Secure Logo Manager loaded with the following protections:");
  console.log("  ✅ XSS prevention via safe DOM creation");
  console.log("  ✅ Input sanitization for brand text and URLs");
  console.log("  ✅ Enhanced file upload validation");
  console.log("  ✅ Secure localStorage operations");
  console.log("  ✅ URL security validation");
  console.log("  ✅ CSS injection prevention");
  console.log("  🔧 FIXED: Direct DOM element integration with modal system");
});
