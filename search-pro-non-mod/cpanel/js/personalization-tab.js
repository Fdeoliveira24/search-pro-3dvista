/**
 * Personalization Tab Handler
 * Manages user interface customization and preference settings
 */
class PersonalizationTab {
  constructor(core) {
    this.core = core;
    this.container = null;
    this.shortcutRecording = null;
    this.defaultPersonalization = this.getDefaultPersonalization();
    
    // Bind methods
    this.handleColorChange = this.handleColorChange.bind(this);
    this.handleRangeChange = this.handleRangeChange.bind(this);
    this.handleShortcutRecord = this.handleShortcutRecord.bind(this);
    this.handleClearData = this.handleClearData.bind(this);
    this.applyThemeChanges = this.applyThemeChanges.bind(this);
  }

  /**
   * Initialize the personalization tab
   */
  init(container) {
    try {
      this.container = container;
      this.setupEventListeners();
      this.populateFields();
      this.applyCurrentSettings();
      
      console.log('[Personalization] Tab initialized successfully');
    } catch (error) {
      console.error('[Personalization] Error initializing tab:', error);
    }
  }

  /**
   * Get default personalization settings
   */
  getDefaultPersonalization() {
    return {
      theme: {
        interface: 'auto',
        accentColor: '#007bff',
        fontSize: 14,
        enableAnimations: true
      },
      behavior: {
        autoSaveInterval: 30,
        tooltipDelay: 500,
        confirmDangerousActions: true,
        showAdvancedOptions: false
      },
      sidebar: {
        width: 280,
        position: 'left',
        autoCollapse: true,
        showTabIcons: true
      },
      shortcuts: {
        enabled: true,
        save: 'Ctrl+S',
        toggleSidebar: 'Ctrl+B',
        export: 'Ctrl+E',
        reset: 'Ctrl+Alt+R'
      },
      notifications: {
        showSuccess: true,
        showErrors: true,
        duration: 5,
        position: 'top-right'
      },
      privacy: {
        rememberSettings: true,
        enableAnalytics: false,
        dataRetentionPeriod: '365'
      }
    };
  }

  /**
   * Setup event listeners for all form controls
   */
  setupEventListeners() {
    if (!this.container) return;

    // Color picker and text input sync
    const accentColor = this.container.querySelector('#accentColor');
    const accentColorText = this.container.querySelector('#accentColorText');
    
    if (accentColor && accentColorText) {
      accentColor.addEventListener('input', this.handleColorChange);
      accentColorText.addEventListener('input', this.handleColorChange);
    }

    // Range inputs with value display
    const rangeInputs = this.container.querySelectorAll('.form-range');
    rangeInputs.forEach(input => {
      input.addEventListener('input', this.handleRangeChange);
    });

    // Shortcut recording buttons
    const shortcutBtns = this.container.querySelectorAll('.shortcut-record-btn');
    shortcutBtns.forEach(btn => {
      btn.addEventListener('click', this.handleShortcutRecord);
    });

    // Clear data button
    const clearDataBtn = this.container.querySelector('#clearAllData');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', this.handleClearData);
    }

    // Theme change listener
    const interfaceTheme = this.container.querySelector('#interfaceTheme');
    if (interfaceTheme) {
      interfaceTheme.addEventListener('change', this.applyThemeChanges);
    }

    // General form change listener
    this.container.addEventListener('change', (e) => {
      if (e.target.matches('.form-input, .form-select, .form-checkbox, .form-range, .form-color-input')) {
        this.savePersonalizationSettings();
        this.applyCurrentSettings();
      }
    });

    // Reset section buttons
    const resetButtons = this.container.querySelectorAll('.reset-section-button');
    resetButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const section = e.target.closest('button').getAttribute('data-section');
        this.resetSection(section);
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
  }

  /**
   * Handle color input changes (sync color picker and text input)
   */
  handleColorChange(e) {
    const accentColor = this.container.querySelector('#accentColor');
    const accentColorText = this.container.querySelector('#accentColorText');
    
    if (e.target.id === 'accentColor') {
      accentColorText.value = e.target.value;
    } else if (e.target.id === 'accentColorText') {
      if (this.isValidHexColor(e.target.value)) {
        accentColor.value = e.target.value;
      }
    }
    
    this.applyThemeChanges();
  }

  /**
   * Handle range input changes (update value display)
   */
  handleRangeChange(e) {
    const rangeValue = e.target.parentNode.querySelector('.range-value');
    if (rangeValue) {
      let value = e.target.value;
      let unit = '';
      
      switch (e.target.id) {
        case 'fontSize':
          unit = 'px';
          break;
        case 'sidebarWidth':
          unit = 'px';
          break;
        case 'notificationDuration':
          unit = 's';
          break;
        default:
          unit = '';
      }
      
      rangeValue.textContent = `${value}${unit}`;
    }
  }

  /**
   * Handle shortcut recording
   */
  handleShortcutRecord(e) {
    const button = e.target.closest('button');
    const shortcutType = button.getAttribute('data-shortcut');
    const input = this.container.querySelector(`#shortcut${shortcutType.charAt(0).toUpperCase() + shortcutType.slice(1)}`);
    
    if (!input) return;

    if (this.shortcutRecording) {
      // Cancel current recording
      this.cancelShortcutRecording();
    }

    // Start recording
    this.shortcutRecording = {
      type: shortcutType,
      input: input,
      button: button,
      originalValue: input.value
    };

    input.value = 'Press keys...';
    input.classList.add('recording');
    button.innerHTML = '<i class="fas fa-times"></i>';
    button.classList.add('recording');

    // Set timeout to cancel recording after 10 seconds
    this.shortcutTimeout = setTimeout(() => {
      this.cancelShortcutRecording();
    }, 10000);
  }

  /**
   * Cancel shortcut recording
   */
  cancelShortcutRecording() {
    if (!this.shortcutRecording) return;

    const { input, button, originalValue } = this.shortcutRecording;
    
    input.value = originalValue;
    input.classList.remove('recording');
    button.innerHTML = '<i class="fas fa-edit"></i>';
    button.classList.remove('recording');
    
    if (this.shortcutTimeout) {
      clearTimeout(this.shortcutTimeout);
    }
    
    this.shortcutRecording = null;
  }

  /**
   * Handle global keydown for shortcut recording
   */
  handleGlobalKeydown(e) {
    if (this.shortcutRecording) {
      e.preventDefault();
      e.stopPropagation();
      
      const keys = [];
      if (e.ctrlKey) keys.push('Ctrl');
      if (e.altKey) keys.push('Alt');
      if (e.shiftKey) keys.push('Shift');
      if (e.metaKey) keys.push('Cmd');
      
      if (e.key && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Shift' && e.key !== 'Meta') {
        keys.push(e.key.toUpperCase());
      }
      
      if (keys.length > 1) { // At least one modifier + one key
        const shortcutString = keys.join('+');
        this.shortcutRecording.input.value = shortcutString;
        this.saveShortcut(this.shortcutRecording.type, shortcutString);
        this.cancelShortcutRecording();
      }
    } else {
      // Handle active shortcuts
      this.handleActiveShortcuts(e);
    }
  }

  /**
   * Handle active keyboard shortcuts
   */
  handleActiveShortcuts(e) {
    const settings = this.getPersonalizationSettings();
    if (!settings.shortcuts.enabled) return;

    const currentShortcut = this.getShortcutString(e);
    
    // Check if current shortcut matches any configured shortcuts
    Object.entries(settings.shortcuts).forEach(([action, shortcut]) => {
      if (action !== 'enabled' && shortcut === currentShortcut) {
        e.preventDefault();
        this.executeShortcutAction(action);
      }
    });
  }

  /**
   * Get shortcut string from keyboard event
   */
  getShortcutString(e) {
    const keys = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    if (e.metaKey) keys.push('Cmd');
    keys.push(e.key.toUpperCase());
    return keys.join('+');
  }

  /**
   * Execute shortcut action
   */
  executeShortcutAction(action) {
    switch (action) {
      case 'save':
        this.core.saveConfiguration();
        this.showNotification('Settings saved!', 'success');
        break;
      case 'toggleSidebar':
        this.core.toggleSidebar();
        break;
      case 'export':
        this.core.exportConfiguration();
        break;
      case 'reset':
        if (confirm('Are you sure you want to reset all settings?')) {
          this.resetAllSettings();
        }
        break;
    }
  }

  /**
   * Save shortcut setting
   */
  saveShortcut(type, shortcutString) {
    const settings = this.getPersonalizationSettings();
    settings.shortcuts[type] = shortcutString;
    this.savePersonalizationSettings(settings);
  }

  /**
   * Handle clear all data
   */
  handleClearData(e) {
    e.preventDefault();
    
    const settings = this.getPersonalizationSettings();
    const shouldConfirm = settings.behavior.confirmDangerousActions;
    
    if (shouldConfirm) {
      const confirmed = confirm(
        'Are you sure you want to clear ALL stored data?\n\n' +
        'This will permanently delete:\n' +
        '• All configuration settings\n' +
        '• Personalization preferences\n' +
        '• Saved configurations\n\n' +
        'This action cannot be undone!'
      );
      
      if (!confirmed) return;
    }

    // Clear all localStorage data
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('searchPro')) {
        localStorage.removeItem(key);
      }
    });

    // Reset to defaults
    this.resetAllSettings();
    this.showNotification('All data cleared successfully', 'success');
  }

  /**
   * Apply theme changes to the interface
   */
  applyThemeChanges() {
    const settings = this.getPersonalizationSettings();
    const root = document.documentElement;
    
    // Apply theme
    if (settings.theme.interface === 'dark') {
      document.body.classList.add('dark-theme');
    } else if (settings.theme.interface === 'light') {
      document.body.classList.remove('dark-theme');
    } else {
      // Auto theme - detect system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    }
    
    // Apply accent color
    root.style.setProperty('--accent-color', settings.theme.accentColor);
    
    // Apply font size
    root.style.setProperty('--interface-font-size', `${settings.theme.fontSize}px`);
    
    // Apply animations
    if (settings.theme.enableAnimations) {
      document.body.classList.remove('no-animations');
    } else {
      document.body.classList.add('no-animations');
    }
    
    // Apply sidebar settings
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.style.width = `${settings.sidebar.width}px`;
      
      if (settings.sidebar.position === 'right') {
        sidebar.classList.add('sidebar-right');
      } else {
        sidebar.classList.remove('sidebar-right');
      }
    }
  }

  /**
   * Populate form fields with current settings
   */
  populateFields() {
    if (!this.container) return;

    const settings = this.getPersonalizationSettings();
    
    // Populate all form fields based on settings
    this.populateFormFromObject(this.container, settings, 'personalization');
    
    // Update range value displays
    const rangeInputs = this.container.querySelectorAll('.form-range');
    rangeInputs.forEach(input => {
      this.handleRangeChange({ target: input });
    });
    
    // Sync color inputs
    const accentColor = this.container.querySelector('#accentColor');
    const accentColorText = this.container.querySelector('#accentColorText');
    if (accentColor && accentColorText) {
      accentColor.value = settings.theme.accentColor;
      accentColorText.value = settings.theme.accentColor;
    }
  }

  /**
   * Recursively populate form from object
   */
  populateFormFromObject(container, obj, prefix = '') {
    Object.entries(obj).forEach(([key, value]) => {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursively handle nested objects
        this.populateFormFromObject(container, value, fieldName);
      } else {
        // Handle primitive values
        const field = container.querySelector(`[name="${fieldName}"]`);
        if (field) {
          if (field.type === 'checkbox') {
            field.checked = Boolean(value);
          } else {
            field.value = value;
          }
        }
      }
    });
  }

  /**
   * Apply current settings to the interface
   */
  applyCurrentSettings() {
    this.applyThemeChanges();
    // Add other setting applications as needed
  }

  /**
   * Reset specific section to defaults
   */
  resetSection(sectionName) {
    const defaults = this.defaultPersonalization;
    const settings = this.getPersonalizationSettings();
    
    switch (sectionName) {
      case 'themeAppearance':
        settings.theme = { ...defaults.theme };
        break;
      case 'interfaceBehavior':
        settings.behavior = { ...defaults.behavior };
        break;
      case 'sidebarPreferences':
        settings.sidebar = { ...defaults.sidebar };
        break;
      case 'keyboardShortcuts':
        settings.shortcuts = { ...defaults.shortcuts };
        break;
      case 'notificationPreferences':
        settings.notifications = { ...defaults.notifications };
        break;
      case 'dataPrivacy':
        settings.privacy = { ...defaults.privacy };
        break;
    }
    
    this.savePersonalizationSettings(settings);
    this.populateFields();
    this.applyCurrentSettings();
    this.showNotification(`${this.getSectionDisplayName(sectionName)} reset to defaults`, 'success');
  }

  /**
   * Get display name for section
   */
  getSectionDisplayName(sectionName) {
    const names = {
      themeAppearance: 'Theme & Appearance',
      interfaceBehavior: 'Interface Behavior',
      sidebarPreferences: 'Sidebar Preferences',
      keyboardShortcuts: 'Keyboard Shortcuts',
      notificationPreferences: 'Notification Preferences',
      dataPrivacy: 'Data & Privacy'
    };
    return names[sectionName] || sectionName;
  }

  /**
   * Reset all settings to defaults
   */
  resetAllSettings() {
    this.savePersonalizationSettings(this.defaultPersonalization);
    this.populateFields();
    this.applyCurrentSettings();
    this.showNotification('All personalization settings reset to defaults', 'success');
  }

  /**
   * Get current personalization settings
   */
  getPersonalizationSettings() {
    try {
      const stored = localStorage.getItem('searchProPersonalization');
      if (stored) {
        return { ...this.defaultPersonalization, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('[Personalization] Error loading settings:', error);
    }
    return { ...this.defaultPersonalization };
  }

  /**
   * Save personalization settings
   */
  savePersonalizationSettings(settings = null) {
    try {
      const settingsToSave = settings || this.collectFormData();
      localStorage.setItem('searchProPersonalization', JSON.stringify(settingsToSave));
      console.log('[Personalization] Settings saved successfully');
    } catch (error) {
      console.error('[Personalization] Error saving settings:', error);
    }
  }

  /**
   * Collect form data into settings object
   */
  collectFormData() {
    if (!this.container) return this.defaultPersonalization;

    const formData = new FormData();
    const inputs = this.container.querySelectorAll('.form-input, .form-select, .form-checkbox, .form-range, .form-color-input');
    
    const settings = JSON.parse(JSON.stringify(this.defaultPersonalization));
    
    inputs.forEach(input => {
      const name = input.name;
      if (name && name.startsWith('personalization.')) {
        const path = name.replace('personalization.', '').split('.');
        let current = settings;
        
        // Navigate to the correct nested object
        for (let i = 0; i < path.length - 1; i++) {
          if (!current[path[i]]) current[path[i]] = {};
          current = current[path[i]];
        }
        
        // Set the value
        const finalKey = path[path.length - 1];
        if (input.type === 'checkbox') {
          current[finalKey] = input.checked;
        } else if (input.type === 'number' || input.type === 'range') {
          current[finalKey] = parseInt(input.value) || 0;
        } else {
          current[finalKey] = input.value;
        }
      }
    });
    
    return settings;
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-${this.getNotificationIcon(type)}"></i>
        <span>${message}</span>
      </div>
      <button class="notification-close">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // Position notification
    const settings = this.getPersonalizationSettings();
    notification.style.position = 'fixed';
    notification.style.zIndex = '10000';
    notification.style.padding = '12px 16px';
    notification.style.borderRadius = '6px';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    notification.style.maxWidth = '400px';
    notification.style.backgroundColor = type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1';
    notification.style.border = `1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'}`;
    notification.style.color = type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460';
    
    // Set position
    this.positionNotification(notification, settings.notifications.position);
    
    document.body.appendChild(notification);
    
    // Auto-remove after duration
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, (settings.notifications.duration || 5) * 1000);
    
    // Close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => notification.remove());
  }

  /**
   * Position notification based on preference
   */
  positionNotification(element, position) {
    switch (position) {
      case 'top-right':
        element.style.top = '20px';
        element.style.right = '20px';
        break;
      case 'top-left':
        element.style.top = '20px';
        element.style.left = '20px';
        break;
      case 'bottom-right':
        element.style.bottom = '20px';
        element.style.right = '20px';
        break;
      case 'bottom-left':
        element.style.bottom = '20px';
        element.style.left = '20px';
        break;
      case 'top-center':
        element.style.top = '20px';
        element.style.left = '50%';
        element.style.transform = 'translateX(-50%)';
        break;
      case 'bottom-center':
        element.style.bottom = '20px';
        element.style.left = '50%';
        element.style.transform = 'translateX(-50%)';
        break;
    }
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type) {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'exclamation-triangle';
      case 'warning': return 'exclamation-circle';
      default: return 'info-circle';
    }
  }

  /**
   * Validate hex color
   */
  isValidHexColor(hex) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
  }

  /**
   * Get tab configuration
   */
  getTabConfig() {
    return {
      id: 'personalization',
      title: 'Personalization',
      icon: 'fas fa-user-cog',
      order: 9
    };
  }

  /**
   * Validate tab data
   */
  validateTab() {
    // Personalization settings don't need validation as they're all optional preferences
    return { isValid: true, errors: [] };
  }

  /**
   * Apply settings (called when configuration is applied)
   */
  applySettings() {
    this.applyCurrentSettings();
    return true;
  }

  /**
   * Cleanup method
   */
  destroy() {
    if (this.shortcutTimeout) {
      clearTimeout(this.shortcutTimeout);
    }
    
    document.removeEventListener('keydown', this.handleGlobalKeydown);
    
    // Remove any active notifications
    const notifications = document.querySelectorAll('.notification');
    notifications.forEach(notification => notification.remove());
  }
}

// Export for use
window.PersonalizationTab = PersonalizationTab;