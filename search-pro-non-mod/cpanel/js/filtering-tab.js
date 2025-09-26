/**
 * Filtering Tab Implementation - Simplified for Debugging
 * 
 * Implements mutual exclusivity between filter groups:
 * - Only one filter group can be active at a time
 * - Groups start in "none" mode with inputs hidden
 * - Activating one group disables all others
 * - Value Match Mode is always visible and active
 */
class FilteringTab {
  constructor(core) {
    this.core = core;
    this.tabId = "filtering";

    // Filter groups in priority order (for resolving conflicts)
    this.filterGroups = ['main', 'mediaIndexes', 'elementTypes', 'elementLabels', 'tagFiltering'];
    this.activeGroup = null;

    // Element types - exact strings from schema
    this.elementTypes = [
      'Panorama', 'Hotspot', 'Polygon', 'Video', 'Webframe', 'Image', 'Text', 
      'ProjectedImage', 'Element', 'Business', 'Container', '3DModel', '3DHotspot', '3DModelObject'
    ];
  }

  /**
   * Initialize the filtering tab
   */
  async init(container) {
    try {
      console.log("[FilteringTab] Initializing");

      // Get current config to determine initial state
      const config = this.core.getConfig();

      // Bind all event listeners
      this.bindEventListeners(container);

      // Initialize UI - start simple
      this.initializeUI(container, config);

      console.log("[FilteringTab] Initialized successfully");
    } catch (error) {
      console.error("[FilteringTab] Initialization error:", error);
    }
  }

  /**
   * Bind all event listeners for the filtering tab
   */
  bindEventListeners(container) {
    console.log("[FilteringTab] Binding event listeners");

    // Mode select listeners for each filter group
    this.filterGroups.forEach(group => {
      const modeSelect = container.querySelector(`[data-group="${group}"]`);
      if (modeSelect) {
        modeSelect.addEventListener('change', (e) => {
          console.log(`[FilteringTab] Mode changed: ${group} -> ${e.target.value}`);
          this.handleModeChange(e.target, container);
        });
        console.log(`[FilteringTab] Bound listener for ${group} mode select`);
      } else {
        console.warn(`[FilteringTab] Could not find mode select for ${group}`);
      }
    });

    // Value match mode selects (always active)
    const whitelistMatchMode = container.querySelector('#whitelistMatchMode');
    const blacklistMatchMode = container.querySelector('#blacklistMatchMode');

    if (whitelistMatchMode) {
      whitelistMatchMode.addEventListener('change', (e) => {
        this.applyPatch({
          filter: { valueMatchMode: { whitelist: e.target.value } }
        });
      });
    }

    if (blacklistMatchMode) {
      blacklistMatchMode.addEventListener('change', (e) => {
        this.applyPatch({
          filter: { valueMatchMode: { blacklist: e.target.value } }
        });
      });
    }

    // Array input listeners (comma-separated values)
    const arrayInputs = container.querySelectorAll('.group-input');
    arrayInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        console.log(`[FilteringTab] Input changed: ${e.target.name} -> ${e.target.value}`);
        this.handleArrayInput(e.target);
      });
    });

    // Element type checkbox listeners
    const elementTypeCheckboxes = container.querySelectorAll('input[name="elementType"]');
    elementTypeCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.handleElementTypeCheckbox(e.target);
      });
    });

    console.log("[FilteringTab] Event listeners bound");
  }

  /**
   * Initialize UI - simplified version
   */
  initializeUI(container, config) {
    const filter = config?.filter || {};
    console.log("[FilteringTab] Initializing UI with filter config:", filter);

    // Determine active group from config
    this.determineActiveGroup(filter);

    // Initialize all mode selects to 'none' first
    this.filterGroups.forEach(group => {
      const modeSelect = container.querySelector(`[data-group="${group}"]`);
      if (modeSelect) {
        modeSelect.value = 'none';
        this.hideGroupInputs(group);
      }
    });

    // Now set the actual values from config
    this.filterGroups.forEach(group => {
      const modeSelect = container.querySelector(`[data-group="${group}"]`);
      if (!modeSelect) return;

      let mode = 'none';
      if (group === 'main') {
        mode = filter.mode || 'none';
      } else {
        mode = filter[group]?.mode || 'none';
      }

      if (mode !== 'none') {
        modeSelect.value = mode;
        this.showGroupInputs(group);
        console.log(`[FilteringTab] Set ${group} mode to ${mode} and showed inputs`);
      }
    });

    // Apply mutual exclusivity if there's an active group
    if (this.activeGroup) {
      this.applyMutualExclusivity(container);
    }

    // Initialize value match modes
    const whitelistMatchMode = container.querySelector('#whitelistMatchMode');
    const blacklistMatchMode = container.querySelector('#blacklistMatchMode');

    if (whitelistMatchMode) {
      whitelistMatchMode.value = filter.valueMatchMode?.whitelist || 'exact';
    }
    if (blacklistMatchMode) {
      blacklistMatchMode.value = filter.valueMatchMode?.blacklist || 'contains';
    }

    // Populate input values
    this.populateInputValues(container, filter);

    console.log("[FilteringTab] UI initialized, active group:", this.activeGroup);
  }

  /**
   * Determine active group from config
   */
  determineActiveGroup(filter) {
    let activeGroups = [];

    // Check each group for active state
    if (filter.mode && filter.mode !== 'none') {
      activeGroups.push('main');
    }
    if (filter.mediaIndexes?.mode && filter.mediaIndexes.mode !== 'none') {
      activeGroups.push('mediaIndexes');
    }
    if (filter.elementTypes?.mode && filter.elementTypes.mode !== 'none') {
      activeGroups.push('elementTypes');
    }
    if (filter.elementLabels?.mode && filter.elementLabels.mode !== 'none') {
      activeGroups.push('elementLabels');
    }
    if (filter.tagFiltering?.mode && filter.tagFiltering.mode !== 'none') {
      activeGroups.push('tagFiltering');
    }

    if (activeGroups.length > 1) {
      // Multiple groups active - keep first in priority order
      console.log("[FilteringTab] Multiple active groups detected, resolving by priority:", activeGroups);
      this.activeGroup = this.filterGroups.find(group => activeGroups.includes(group));

      // Disable conflicting groups
      const disableGroups = activeGroups.filter(group => group !== this.activeGroup);
      let conflictPatch = { filter: {} };
      disableGroups.forEach(group => {
        if (group === 'main') {
          conflictPatch.filter.mode = 'none';
        } else {
          conflictPatch.filter[group] = { mode: 'none' };
        }
      });
      this.applyPatch(conflictPatch);

    } else if (activeGroups.length === 1) {
      this.activeGroup = activeGroups[0];
    } else {
      this.activeGroup = null;
    }

    console.log("[FilteringTab] Active group determined:", this.activeGroup);
  }

  /**
   * Simple function to show group inputs
   */
  showGroupInputs(group) {
    const inputsContainer = document.querySelector(`#${group}Inputs`);
    if (inputsContainer) {
      inputsContainer.style.display = 'block';
      console.log(`[FilteringTab] Showed inputs for ${group}`);
    } else {
      console.warn(`[FilteringTab] Could not find inputs container #${group}Inputs`);
    }
  }

  /**
   * Simple function to hide group inputs
   */
  hideGroupInputs(group) {
    const inputsContainer = document.querySelector(`#${group}Inputs`);
    if (inputsContainer) {
      inputsContainer.style.display = 'none';
      console.log(`[FilteringTab] Hidden inputs for ${group}`);
    } else {
      console.warn(`[FilteringTab] Could not find inputs container #${group}Inputs`);
    }
  }

  /**
   * Handle mode changes - simplified
   */
  handleModeChange(select, container) {
    const group = select.dataset.group;
    const newMode = select.value;

    console.log(`[FilteringTab] Handling mode change: ${group} -> ${newMode}`);

    if (newMode === 'none') {
      // Deactivating group
      this.hideGroupInputs(group);

      if (this.activeGroup === group) {
        this.activeGroup = null;
        this.removeAllDisabling(container);
        console.log("[FilteringTab] Cleared active group, re-enabled all");
      }
    } else {
      // Activating group
      this.showGroupInputs(group);

      if (this.activeGroup && this.activeGroup !== group) {
        // Another group is active - deactivate it
        const currentActiveSelect = container.querySelector(`[data-group="${this.activeGroup}"]`);
        if (currentActiveSelect) {
          currentActiveSelect.value = 'none';
          this.hideGroupInputs(this.activeGroup);
          this.applyModeConfigPatch(this.activeGroup, 'none');
        }
      }

      this.activeGroup = group;
      this.applyMutualExclusivity(container);
      console.log(`[FilteringTab] Set active group to ${group}`);
    }

    // Apply config change
    this.applyModeConfigPatch(group, newMode);
  }

  /**
   * Apply mutual exclusivity by disabling inactive groups
   */
  applyMutualExclusivity(container) {
    if (!this.activeGroup) return;

    this.filterGroups.forEach(group => {
      const groupSection = container.querySelector(`.filter-group[data-group="${group}"]`);
      if (!groupSection) return;

      if (group === this.activeGroup) {
        // Enable active group
        groupSection.classList.remove('disabled-section');
        groupSection.style.opacity = '';
        groupSection.style.pointerEvents = '';
      } else {
        // Disable inactive group
        groupSection.classList.add('disabled-section');
        groupSection.style.opacity = '0.5';
        groupSection.style.pointerEvents = 'none';

        // Keep mode select functional
        const modeSelect = groupSection.querySelector('.filter-mode-select');
        if (modeSelect) {
          modeSelect.style.pointerEvents = 'auto';
          modeSelect.style.opacity = '1';
        }
      }
    });
  }

  /**
   * Remove all disabling when no group is active
   */
  removeAllDisabling(container) {
    this.filterGroups.forEach(group => {
      const groupSection = container.querySelector(`.filter-group[data-group="${group}"]`);
      if (groupSection) {
        groupSection.classList.remove('disabled-section');
        groupSection.style.opacity = '';
        groupSection.style.pointerEvents = '';
      }
    });
  }

  /**
   * Handle array input changes - simplified
   */
  handleArrayInput(input) {
    // Don't process if input is disabled
    if (input.disabled) {
      console.log("[FilteringTab] Ignoring input change - input is disabled");
      return;
    }

    const name = input.name;
    let value = this.parseArrayValue(input.value);

    // Special handling for media indexes
    if (name.includes('mediaIndexes')) {
      value = this.parseMediaIndexes(input.value);
    }

    const patch = this.createPatchFromName(name, value);
    this.applyPatch(patch);
  }

  /**
   * Handle element type checkbox changes
   */
  handleElementTypeCheckbox(checkbox) {
    if (checkbox.disabled) return;

    const modeSelect = document.querySelector('#elementTypesMode');
    const mode = modeSelect ? modeSelect.value : 'none';

    if (mode === 'none') return;

    // Get all checked checkboxes
    const allCheckboxes = document.querySelectorAll('input[name="elementType"]');
    const checkedTypes = Array.from(allCheckboxes)
      .filter(cb => cb.checked && !cb.disabled)
      .map(cb => cb.value);

    // Determine config key based on mode
    const configKey = mode === 'whitelist' ? 'allowedTypes' : 'blacklistedTypes';
    const patch = {
      filter: {
        elementTypes: {
          [configKey]: checkedTypes.length > 0 ? checkedTypes : [""]
        }
      }
    };

    this.applyPatch(patch);
  }

  /**
   * Populate input values from config
   */
  populateInputValues(container, filter) {
    // Main filter values
    const mainAllowed = container.querySelector('#mainAllowedValues');
    const mainBlacklisted = container.querySelector('#mainBlacklistedValues');
    if (mainAllowed) mainAllowed.value = this.arrayToCommaString(filter.allowedValues);
    if (mainBlacklisted) mainBlacklisted.value = this.arrayToCommaString(filter.blacklistedValues);

    // Media indexes
    const mediaAllowed = container.querySelector('#mediaIndexesAllowed');
    const mediaBlacklisted = container.querySelector('#mediaIndexesBlacklisted');
    if (mediaAllowed) mediaAllowed.value = this.arrayToCommaString(filter.mediaIndexes?.allowed);
    if (mediaBlacklisted) mediaBlacklisted.value = this.arrayToCommaString(filter.mediaIndexes?.blacklisted);

    // Element types checkboxes
    const allowedTypes = filter.elementTypes?.allowedTypes || [];
    const blacklistedTypes = filter.elementTypes?.blacklistedTypes || [];
    const activeTypes = filter.elementTypes?.mode === 'whitelist' ? allowedTypes : blacklistedTypes;

    const elementTypeCheckboxes = container.querySelectorAll('input[name="elementType"]');
    elementTypeCheckboxes.forEach(checkbox => {
      checkbox.checked = activeTypes.includes(checkbox.value);
    });

    // Element labels
    const labelsAllowed = container.querySelector('#elementLabelsAllowed');
    const labelsBlacklisted = container.querySelector('#elementLabelsBlacklisted');
    if (labelsAllowed) labelsAllowed.value = this.arrayToCommaString(filter.elementLabels?.allowedValues);
    if (labelsBlacklisted) labelsBlacklisted.value = this.arrayToCommaString(filter.elementLabels?.blacklistedValues);

    // Tag filtering
    const tagsAllowed = container.querySelector('#tagFilteringAllowed');
    const tagsBlacklisted = container.querySelector('#tagFilteringBlacklisted');
    if (tagsAllowed) tagsAllowed.value = this.arrayToCommaString(filter.tagFiltering?.allowedTags);
    if (tagsBlacklisted) tagsBlacklisted.value = this.arrayToCommaString(filter.tagFiltering?.blacklistedTags);
  }

  /**
   * Apply mode configuration patch
   */
  applyModeConfigPatch(group, mode) {
    let patch = { filter: {} };

    if (group === 'main') {
      patch.filter.mode = mode;
    } else {
      patch.filter[group] = { mode: mode };
    }

    this.applyPatch(patch);
  }

  /**
   * Create config patch from dot-notation field name
   */
  createPatchFromName(name, value) {
    const parts = name.split('.');
    let patch = {};
    let current = patch;

    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = {};
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
    return patch;
  }

  /**
   * Parse comma-separated array values
   */
  parseArrayValue(value) {
    if (!value || !value.trim()) return [""];
    return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }

  /**
   * Parse media indexes (must be valid integers as strings)
   */
  parseMediaIndexes(value) {
    if (!value || !value.trim()) return [""];

    return value.split(',')
      .map(item => item.trim())
      .filter(item => /^\d+$/.test(item)) // Only valid non-negative integers
      .map(item => String(item)); // Convert to strings as required by schema
  }

  /**
   * Convert array to comma-separated string for display
   */
  arrayToCommaString(array) {
    if (!array || !Array.isArray(array)) return '';
    // Filter out empty strings and join
    const filtered = array.filter(item => item && item !== "");
    return filtered.length > 0 ? filtered.join(', ') : '';
  }

  /**
   * Apply configuration patch
   */
  applyPatch(patch) {
    try {
      if (typeof window.searchFunctions !== 'undefined' && window.searchFunctions.updateConfig) {
        window.searchFunctions.updateConfig(patch);
        console.log("[FilteringTab] Applied patch:", patch);
      } else {
        console.warn("[FilteringTab] window.searchFunctions.updateConfig not available");
      }
    } catch (error) {
      console.error("[FilteringTab] Error applying patch:", error);
    }
  }

  /**
   * Get the current configuration for this tab
   */
  getTabConfig() {
    try {
      const config = this.core.getConfig();
      return {
        filter: config.filter || {}
      };
    } catch (error) {
      console.error("[FilteringTab] Error getting tab config:", error);
      return { filter: {} };
    }
  }

  /**
   * Validate the tab configuration
   */
  validateTabConfig() {
    try {
      const config = this.core.getConfig();
      const filter = config.filter;
      return filter && typeof filter === 'object';
    } catch (error) {
      console.error("[FilteringTab] Error validating tab config:", error);
      return false;
    }
  }

  /**
   * Reset the tab to defaults
   */
  resetToDefaults() {
    try {
      // Reset all groups to "none" with empty arrays
      const resetPatch = {
        filter: {
          mode: 'none',
          allowedValues: [""],
          blacklistedValues: [""],
          valueMatchMode: {
            whitelist: 'exact',
            blacklist: 'contains'
          },
          mediaIndexes: { 
            mode: 'none', 
            allowed: [""], 
            blacklisted: [""] 
          },
          elementTypes: { 
            mode: 'none', 
            allowedTypes: [""], 
            blacklistedTypes: [""] 
          },
          elementLabels: { 
            mode: 'none', 
            allowedValues: [""], 
            blacklistedValues: [""] 
          },
          tagFiltering: { 
            mode: 'none', 
            allowedTags: [""], 
            blacklistedTags: [""] 
          }
        }
      };

      this.applyPatch(resetPatch);

      // Reset UI state
      this.activeGroup = null;
      const container = document.querySelector(`#${this.tabId}-tab`);
      if (container) {
        setTimeout(() => {
          const config = this.core.getConfig();
          this.initializeUI(container, config);
        }, 100);
      }

      console.log("[FilteringTab] Reset to defaults");
      this.core.showToast("success", "Reset Complete", "Filtering settings reset to defaults");
    } catch (error) {
      console.error("[FilteringTab] Error resetting:", error);
      this.core.showToast("error", "Reset Failed", "Failed to reset filtering settings");
    }
  }
}

// Register the tab
if (typeof window !== 'undefined') {
  window.FilteringTab = FilteringTab;
  console.log("[FilteringTab] Class registered");
}