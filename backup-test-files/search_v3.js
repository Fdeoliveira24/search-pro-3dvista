/*
====================================
3DVista Enhanced Search Script
Version: 3.1.0
Last Updated: 04/17/2025
Description: Core search functionality for 3DVista tours with improved element detection, 
filtering options, and better UI interactions. Configured via direct JavaScript.
====================================
*/

window.tourSearchFunctions = (function() {
    // Constants for configuration
    const BREAKPOINTS = {
        mobile: 768,
        tablet: 1024
    };
    
    // Configuration factory functions for better organization
    function createDisplayConfig() {
        return {
            showGroupHeaders: false,
            showGroupCount: true,
            showIconsInResults: true,
            onlySubtitles: false,
            showSubtitlesInResults: true,
            showParentLabel: true,
            showParentInfo: true,
            showParentTags: true,
            showParentType: true
        };
    }
    
    function createContentConfig() {
        return {
            unlabeledWithSubtitles: true,
            unlabeledWithTags: true,
            completelyBlank: true,
            elements: {
                includeHotspots: true,
                includePolygons: true,
                includeVideos: true,
                includeWebframes: true,
                includeImages: true,
                includeText: true,
                includeProjectedImages: true,
                includeElements: true,
                skipEmptyLabels: false,
                minLabelLength: 0
            }
        };
    }
    
    function createFilterConfig() {
        return {
            mode: "none",
            allowedValues: [],
            blacklistedValues: [],
            allowedMediaIndexes: [],
            blacklistedMediaIndexes: [],
            elementTypes: {
                mode: "none",
                allowedTypes: [],
                blacklistedTypes: []
            },
            elementLabels: {
                mode: "none",
                allowedValues: [],
                blacklistedValues: []
            },
            tagFiltering: {
                mode: "none",
                allowedTags: [],
                blacklistedTags: []
            }
        };
    }
    
    function createLabelConfig() {
        return {
            subtitles: true,
            tags: true,
            elementType: true,
            parentWithType: false,
            customText: '[Unnamed Item]'
        };
    }
    
    function createStyleConfig() {
        return {
            searchField: {
                borderRadius: {
                    topLeft: 35,
                    topRight: 35,
                    bottomRight: 35,
                    bottomLeft: 35
                }
            },
            searchResults: {
                borderRadius: {
                    topLeft: 5,
                    topRight: 5,
                    bottomRight: 5,
                    bottomLeft: 5
                }
            },
            colors: {
                searchBackground: '#f4f3f2',
                searchText: '#1a1a1a',
                placeholderText: '#94a3b8',
                searchIcon: '#94a3b8',
                clearIcon: '#94a3b8',
                resultsBackground: '#ffffff',
                groupHeaderColor: '#64748b',
                groupCountColor: '#94a3b8',
                resultHover: '#f0f0f0',
                resultBorderLeft: '#dd0e0e',
                resultText: '#1e293b',
                resultSubtitle: '#64748b',
                resultIconColor: '#6e85f7',
                resultSubtextColor: '#000000'
            }
        };
    }
    
    function createSearchBarConfig() {
        return {
            placeholder: 'Search...',
            width: 350,
            position: {
                top: 70,
                right: 70,
                left: null,
                bottom: null
            },
            useResponsive: true,
            mobilePosition: {
                top: 90,
                left: 20,
                right: 20,
                bottom: null
            }
        };
    }
    
    // Private variables with improved structure
    let _config = {
        autoHide: {
            mobile: false,  // Changed to false for better mobile UX
            desktop: false
        },
        
        mobileBreakpoint: BREAKPOINTS.mobile,
        minSearchChars: 2,
        
        showTagsInResults: true,
        
        includeContent: createContentConfig(),
        useAsLabel: createLabelConfig(),
        display: createDisplayConfig(),
        filter: createFilterConfig(),
        
        elementTriggering: {
            initialDelay: 300,  // Reduced for better responsiveness
            maxRetries: 3,
            retryInterval: 300,
            maxRetryInterval: 1000,  // Cap for exponential backoff
            baseRetryInterval: 300   // Base for exponential backoff
        },
        
        appearance: createStyleConfig(),
        searchBar: createSearchBarConfig()
    };

    let _initialized = false;
    let _searchHistory = {
        maxItems: 5,
        storageKey: 'tourSearchHistory',
        save(term) {
            if (!term || typeof term !== 'string' || term.trim() === '') {
                return false;
            }
            
            try {
                const history = this.get();
                const termLower = term.toLowerCase().trim();
                const index = history.findIndex(h => h.toLowerCase() === termLower);
                
                if (index > -1) {
                    history.splice(index, 1);
                }
                
                history.unshift(term.trim());
                
                // Limit the size of history
                if (history.length > this.maxItems) {
                    history.length = this.maxItems;
                }
                
                // Check storage size
                const serialized = JSON.stringify(history);
                if (serialized.length > 5000) {
                    history.length = Math.max(1, history.length - 2);
                }
                
                localStorage.setItem(this.storageKey, JSON.stringify(history));
                return true;
            } catch (error) {
                console.warn('Failed to save search history:', error);
                return false;
            }
        },
        get() {
            try {
                const stored = localStorage.getItem(this.storageKey);
                if (!stored) return [];
                
                const parsed = JSON.parse(stored);
                
                // Validate parsed data is an array
                if (!Array.isArray(parsed)) {
                    console.warn('Invalid search history format, resetting');
                    this.clear();
                    return [];
                }
                
                // Filter out any invalid entries
                return parsed.filter(item => typeof item === 'string' && item.trim() !== '');
            } catch (error) {
                console.warn('Failed to retrieve search history:', error);
                return [];
            }
        },
        clear() {
            try {
                localStorage.removeItem(this.storageKey);
                return true;
            } catch (error) {
                console.warn('Failed to clear search history:', error);
                return false;
            }
        }
    };

    // Improved utility functions
    function _debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function _preprocessSearchTerm(term) {
        if (!term) return '';
        
        // Handle special character search
        if (/[0-9\-_]/.test(term)) {
            return `'${term}`;
        }
        
        return term;
    }

    // Improved element type detection with better structure
    function _getElementType(overlay, label) {
        if (!overlay) return 'Element';
        
        try {
            // Use direct class property (most reliable)
            if (overlay.class) {
                const className = overlay.class;
                
                // Map specific class names to types
                const classNameMap = {
                    'FramePanoramaOverlay': 'Webframe',
                    'QuadVideoPanoramaOverlay': 'Video',
                    'ImagePanoramaOverlay': 'Image',
                    'TextPanoramaOverlay': 'Text'
                };
                
                if (classNameMap[className]) {
                    return classNameMap[className];
                }
                
                if (className === 'HotspotPanoramaOverlay') {
                    // For hotspots, check functional indicators
                    if (overlay.data) {
                        if (overlay.data.hasPanoramaAction) return 'Hotspot';
                        if (overlay.data.hasText) return 'Text';
                        if (overlay.data.isPolygon) return 'Polygon';
                    }
                    
                    // Label-based heuristics for hotspots
                    const overlayLabel = (overlay.label || label || '').toLowerCase();
                    if (overlayLabel.includes('polygon')) return 'Polygon';
                    if (overlayLabel === 'image') return 'Image';
                    if (overlayLabel.includes('info-')) return 'Hotspot';
                    
                    return 'Hotspot';
                }
            }
            
            // Try get method if class property not available
            if (typeof overlay.get === 'function') {
                try {
                    const className = overlay.get('class');
                    const classNameMap = {
                        'FramePanoramaOverlay': 'Webframe',
                        'QuadVideoPanoramaOverlay': 'Video',
                        'ImagePanoramaOverlay': 'Image',
                        'TextPanoramaOverlay': 'Text'
                    };
                    
                    if (classNameMap[className]) {
                        return classNameMap[className];
                    }
                    
                    if (className === 'HotspotPanoramaOverlay') {
                        try {
                            const data = overlay.get('data') || {};
                            if (data.hasPanoramaAction) return 'Hotspot';
                            if (data.hasText) return 'Text';
                            if (data.isPolygon) return 'Polygon';
                        } catch (e) {
                            console.warn('Error checking hotspot data:', e);
                        }
                        
                        // Use label as fallback
                        const overlayLabel = (overlay.label || label || '').toLowerCase();
                        if (overlayLabel.includes('polygon')) return 'Polygon';
                        if (overlayLabel === 'image') return 'Image';
                        if (overlayLabel.includes('info-')) return 'Hotspot';
                        
                        return 'Hotspot';
                    }
                } catch (e) {
                    console.warn('Error getting class via get method:', e);
                }
            }
            
            // Check unique properties if class methods failed
            const propertyChecks = [
                { props: ['url', 'data.url'], type: 'Webframe' },
                { props: ['video', 'data.video'], type: 'Video' },
                { props: ['vertices', 'polygon', 'data.vertices', 'data.polygon'], type: 'Polygon' }
            ];
            
            for (const check of propertyChecks) {
                for (const prop of check.props) {
                    if (prop.includes('.')) {
                        // Handle nested properties
                        const [parent, child] = prop.split('.');
                        if (overlay[parent] && overlay[parent][child]) {
                            return check.type;
                        }
                    } else if (overlay[prop]) {
                        return check.type;
                    }
                }
            }

            // Last resort: label-based detection
            const overlayLabel = (overlay.label || label || '').toLowerCase();
            if (overlayLabel) {
                const labelMatches = [
                    { pattern: 'web', type: 'Webframe' },
                    { pattern: 'video', type: 'Video' },
                    { pattern: 'image', type: 'Image' },
                    { pattern: 'text', type: 'Text' },
                    { pattern: 'polygon', type: 'Polygon' },
                    { pattern: 'goto', type: 'Hotspot' },
                    { pattern: 'info', type: 'Hotspot' }
                ];
                
                for (const match of labelMatches) {
                    if (match.pattern === overlayLabel || overlayLabel.includes(match.pattern)) {
                        return match.type;
                    }
                }
            }
            
            return 'Element';
        } catch (error) {
            console.warn('Error in getElementType:', error);
            return 'Element';
        }
    }

    // Improved filter function with better error handling
    function _shouldIncludeElement(elementType, label, tags) {
        try {
            // Skip empty labels if configured
            if (!label && _config.includeContent.elements.skipEmptyLabels) {
                return false;
            }

            // Check minimum label length
            if (label && 
                _config.includeContent.elements.minLabelLength > 0 && 
                label.length < _config.includeContent.elements.minLabelLength) {
                return false;
            }

            // Apply element type filtering
            const typeFilterMode = _config.filter.elementTypes?.mode;
            if (typeFilterMode === "whitelist" && Array.isArray(_config.filter.elementTypes?.allowedTypes) && 
                _config.filter.elementTypes.allowedTypes.length > 0) {
                if (!_config.filter.elementTypes.allowedTypes.includes(elementType)) {
                    return false;
                }
            } else if (typeFilterMode === "blacklist" && Array.isArray(_config.filter.elementTypes?.blacklistedTypes) && 
                       _config.filter.elementTypes.blacklistedTypes.length > 0) {
                if (_config.filter.elementTypes.blacklistedTypes.includes(elementType)) {
                    return false;
                }
            }

            // Apply label filtering
            const labelFilterMode = _config.filter.elementLabels?.mode;
            if (label && labelFilterMode === "whitelist" && Array.isArray(_config.filter.elementLabels?.allowedValues) && 
                _config.filter.elementLabels.allowedValues.length > 0) {
                if (!_config.filter.elementLabels.allowedValues.some(value => label.includes(value))) {
                    return false;
                }
            } else if (label && labelFilterMode === "blacklist" && Array.isArray(_config.filter.elementLabels?.blacklistedValues) && 
                       _config.filter.elementLabels.blacklistedValues.length > 0) {
                if (_config.filter.elementLabels.blacklistedValues.some(value => label.includes(value))) {
                    return false;
                }
            }

            // Add tag filtering logic
            const tagFilterMode = _config.filter.tagFiltering?.mode;
            if (Array.isArray(tags) && tags.length > 0) {
                if (tagFilterMode === "whitelist" && Array.isArray(_config.filter.tagFiltering?.allowedTags) && 
                    _config.filter.tagFiltering.allowedTags.length > 0) {
                    if (!tags.some(tag => _config.filter.tagFiltering.allowedTags.includes(tag))) {
                        return false;
                    }
                } else if (tagFilterMode === "blacklist" && Array.isArray(_config.filter.tagFiltering?.blacklistedTags) && 
                          _config.filter.tagFiltering.blacklistedTags.length > 0) {
                    if (tags.some(tag => _config.filter.tagFiltering.blacklistedTags.includes(tag))) {
                        return false;
                    }
                }
            } else if (tagFilterMode === "whitelist" && Array.isArray(_config.filter.tagFiltering?.allowedTags) && 
                      _config.filter.tagFiltering.allowedTags.length > 0) {
                return false;
            }

            // Check element type against configuration
            const elementTypeMap = {
                'Hotspot': 'includeHotspots',
                'Polygon': 'includePolygons',
                'Video': 'includeVideos',
                'Webframe': 'includeWebframes',
                'Image': 'includeImages',
                'Text': 'includeText',
                'ProjectedImage': 'includeProjectedImages',
                'Element': 'includeElements'
            };
            
            const configKey = elementTypeMap[elementType];
            if (configKey) {
                return _config.includeContent.elements[configKey] !== false;
            }
            
            // Try pluralized version for custom types
            const pluralizedKey = `include${elementType}s`;
            if (_config.includeContent.elements[pluralizedKey] !== undefined) {
                return _config.includeContent.elements[pluralizedKey];
            }
            
            // Default to include if not specifically configured
            return true;
        } catch (error) {
            console.warn('Error in element filtering:', error);
            return false;
        }
    }

    // Improved element triggering with exponential backoff
    function _triggerElement(tour, elementId, callback) {
        if (!tour || !elementId) {
            console.warn('Invalid tour or elementId for trigger');
            if (callback) callback(false);
            return;
        }
        
        const config = _config.elementTriggering;
        let retryCount = 0;
        
        // Uses exponential backoff for retries
        const getBackoffTime = (attempt) => {
            const baseTime = config.baseRetryInterval;
            const exponentialTime = baseTime * Math.pow(1.5, attempt);
            return Math.min(exponentialTime, config.maxRetryInterval);
        };
        
        const attemptTrigger = () => {
            try {
                if (!tour || !tour.player) {
                    console.warn('Tour or player not available');
                    if (callback) callback(false);
                    return;
                }
                
                // Find element using multiple strategies
                const element = findElementById(tour, elementId);
                
                if (element) {
                    console.log(`Element found: ${elementId}`);
                    
                    // Try multiple trigger methods in sequence
                    const triggerMethods = [
                        { name: 'trigger', fn: (el) => el.trigger('click') },
                        { name: 'click', fn: (el) => el.click() },
                        { name: 'onClick', fn: (el) => el.onClick() }
                    ];
                    
                    for (const method of triggerMethods) {
                        try {
                            if (typeof element[method.name] === 'function' || 
                                (method.name === 'onClick' && element.onClick)) {
                                method.fn(element);
                                console.log(`Element triggered successfully using ${method.name}`);
                                if (callback) callback(true);
                                return;
                            }
                        } catch (e) {
                            console.warn(`Error with ${method.name} method:`, e);
                        }
                    }
                    
                    // If we get here, all trigger methods failed
                    console.warn('All trigger methods failed for element:', elementId);
                }
                
                // Element not found or trigger failed, retry if possible
                retryCount++;
                if (retryCount < config.maxRetries) {
                    const backoffTime = getBackoffTime(retryCount);
                    console.log(`Element trigger attempt ${retryCount} failed, retrying in ${backoffTime}ms...`);
                    setTimeout(attemptTrigger, backoffTime);
                } else {
                    console.warn(`Failed to trigger element ${elementId} after ${config.maxRetries} attempts`);
                    if (callback) callback(false);
                }
            } catch (error) {
                console.warn(`Error in triggerElement: ${error.message}`);
                if (callback) callback(false);
            }
        };
        
        // Helper to find element by ID
        function findElementById(tour, id) {
            let element = null;
            
            // Method 1: Direct getById
            try {
                element = tour.player.getById(id);
                if (element) return element;
            } catch (e) {
                console.warn('getById method failed:', e);
            }
            
            // Method 2: get method
            try {
                element = tour.get(id) || tour.player.get(id);
                if (element) return element;
            } catch (e) {
                console.warn('get method failed:', e);
            }
            
            // Method 3: getAllIDs and find
            try {
                if (typeof tour.player.getAllIDs === 'function') {
                    const allIds = tour.player.getAllIDs();
                    if (allIds.includes(id)) {
                        return tour.player.getById(id);
                    }
                }
            } catch (e) {
                console.warn('getAllIDs method failed:', e);
            }
            
            return null;
        }
        
        // Start first attempt after initial delay
        setTimeout(attemptTrigger, config.initialDelay);
    }

    // Improved styling application with better cleanup
    function _applySearchStyling() {
        const searchContainer = document.getElementById('searchContainer');
        if (!searchContainer) {
            console.warn('Search container not found, styling not applied');
            return;
        }
        
        // Apply container position based on device
        const position = _config.searchBar.position;
        const isMobile = window.innerWidth <= _config.mobileBreakpoint;
        
        // Set positioning attribute for CSS targeting
        if (position.left !== null && position.right === null) {
            searchContainer.setAttribute('data-position', 'left');
        } else if (position.left !== null && position.left === '50%') {
            searchContainer.setAttribute('data-position', 'center');
        } else {
            searchContainer.setAttribute('data-position', 'right');
        }
        
        // Create or update style element
        let styleElement = document.getElementById('search-custom-vars');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'search-custom-vars';
            document.head.appendChild(styleElement);
        }
        
        // Generate CSS variables from config
        const colors = _config.appearance.colors;
        const cssVars = `
            :root {
                --search-background: ${colors.searchBackground};
                --search-text: ${colors.searchText};
                --placeholder-text: ${colors.placeholderText};
                --search-icon: ${colors.searchIcon};
                --clear-icon: ${colors.clearIcon};
                --results-background: ${colors.resultsBackground};
                --group-header-color: ${colors.groupHeaderColor};
                --group-count-color: ${colors.groupCountColor};
                --result-hover: ${colors.resultHover};
                --result-border-left: ${colors.resultBorderLeft};
                --result-text: ${colors.resultText};
                --result-subtitle: ${colors.resultSubtitle};
                --result-icon-color: ${colors.resultIconColor};
                --result-subtext-color: ${colors.resultSubtextColor};
            }
        `;
        
        // Apply responsive positioning
        const positionCSS = isMobile && _config.searchBar.useResponsive 
            ? `
                #searchContainer {
                    position: fixed;
                    top: ${_config.searchBar.mobilePosition.top}px;
                    left: ${_config.searchBar.mobilePosition.left}px;
                    right: ${_config.searchBar.mobilePosition.right}px;
                    width: calc(100% - ${_config.searchBar.mobilePosition.left * 2}px);
                    z-index: 9999;
                }
            `
            : `
                #searchContainer {
                    position: fixed;
                    ${position.top !== null ? `top: ${position.top}px;` : ''}
                    ${position.right !== null ? `right: ${position.right}px;` : ''}
                    ${position.left !== null ? `left: ${position.left}px;` : ''}
                    ${position.bottom !== null ? `bottom: ${position.bottom}px;` : ''}
                    width: ${_config.searchBar.width}px;
                    z-index: 9999;
                }
            `;
            
        // Add display options for headers, counts, and icons
        const displayCSS = `
            ${!_config.display.showGroupHeaders ? `
            #searchContainer .results-group .group-header .group-title {
                display: none;
            }
            
            #searchContainer .results-group .group-header {
                justify-content: flex-end;
                padding-right: 10px;
                padding-top: 6px;
                padding-bottom: 4px;
            }
            
            #searchContainer .results-group {
                margin-top: 5px;
            }
            ` : ''}
            
            ${!_config.display.showGroupCount ? `
            #searchContainer .group-count {
                display: none;
            }
            ` : ''}
            
            ${!_config.display.showIconsInResults ? `
            #searchContainer .result-icon,
            #searchContainer .search-result-icon,
            #searchContainer .result-item .result-icon {
                display: none;
            }
            ` : ''}
            
            .result-tags {
                display: ${_config.showTagsInResults ? 'block' : 'none'};
            }
        `;
        
        // Apply border radius for search field and results
        const fieldRadius = _config.appearance.searchField.borderRadius;
        const resultsRadius = _config.appearance.searchResults.borderRadius;
        
        const borderRadiusCSS = `
            #searchContainer .search-field {
                border-top-left-radius: ${Math.min(fieldRadius.topLeft, 50)}px;
                border-top-right-radius: ${Math.min(fieldRadius.topRight, 50)}px;
                border-bottom-right-radius: ${Math.min(fieldRadius.bottomRight, 50)}px;
                border-bottom-left-radius: ${Math.min(fieldRadius.bottomLeft, 50)}px;
            }
            
            #searchContainer .search-results {
                border-top-left-radius: ${Math.min(resultsRadius.topLeft, 10)}px;
                border-top-right-radius: ${Math.min(resultsRadius.topRight, 10)}px;
                border-bottom-right-radius: ${Math.min(resultsRadius.bottomRight, 10)}px;
                border-bottom-left-radius: ${Math.min(resultsRadius.bottomLeft, 10)}px;
            }
        `;
        
        // Combine all styles
        styleElement.textContent = cssVars + positionCSS + displayCSS + borderRadiusCSS;
        
        // Apply placeholder text to search input
        const searchInput = searchContainer.querySelector('#tourSearch');
        if (searchInput) {
            searchInput.placeholder = _config.searchBar.placeholder;
        }
        
        console.log('Search styling applied successfully');
    }

    // Initialize search with improved DOM handling
    function _initializeSearch(tour) {
        console.log('Initializing enhanced search with element support v2.1...');
        window.tourInstance = tour;
        
        // Prevent duplicate initialization
        if (window.searchListInitialized || window.searchListInitiinitialized) {
            console.log('Search already initialized, skipping...');
            return;
        }
        
        // Validate requirements
        const searchContainer = document.getElementById('searchContainer');
        if (!searchContainer) {
            console.error('Search container not found, cannot initialize search');
            return;
        }
        
        if (!tour || !tour.mainPlayList) {
            console.error('Tour or mainPlayList not available, cannot initialize search');
            return;
        }
        
        // Create search UI components if needed
        _createSearchInterface(searchContainer);
        
        // Core search state
        let currentSearchTerm = '';
        let fuse = null;
        
        // Initialize Fuse search index
        const prepareFuse = () => {
            try {
                const items = tour.mainPlayList.get('items');
                if (!items || !Array.isArray(items) || items.length === 0) {
                    throw new Error('Tour playlist items not available or empty');
                }
                
                const fuseData = [];
                const filterMode = _config.filter.mode;
                const allowedValues = _config.filter.allowedValues || [];
                const blacklistedValues = _config.filter.blacklistedValues || [];
                const allowedMediaIndexes = _config.filter.allowedMediaIndexes || [];
                const blacklistedMediaIndexes = _config.filter.blacklistedMediaIndexes || [];
                
                // Process each panorama
                items.forEach((item, index) => {
                    try {
                        // Get media data safely
                        const media = item.get('media');
                        if (!media) {
                            console.warn(`No media found for item at index ${index}`);
                            return;
                        }
                        
                        // Get panorama metadata
                        const data = _safeGetData(media);
                        const label = data?.label?.trim() || '';
                        const subtitle = data?.subtitle?.trim() || '';
                        
                        // Apply content filtering
                        if (!_shouldIncludePanorama(label, subtitle, data?.tags, index, filterMode, 
                            allowedValues, blacklistedValues, allowedMediaIndexes, blacklistedMediaIndexes)) {
                            return;
                        }
                        
                        // Determine display label for the panorama
                        const displayLabel = _getDisplayLabel(label, subtitle, data?.tags);
                        
                        // Add panorama to search index
                        fuseData.push({
                            type: 'Panorama',
                            index,
                            label: displayLabel,
                            originalLabel: label,
                            subtitle: subtitle,
                            tags: Array.isArray(data?.tags) ? data.tags : [],
                            item,
                            boost: label ? 1.5 : 1.0
                        });
                        
                        // Process overlay elements (hotspots, etc.)
                        const overlays = _getOverlays(media, tour, item);
                        _processOverlays(overlays, fuseData, index, displayLabel);
                        
                    } catch (error) {
                        console.warn(`Error processing item at index ${index}:`, error);
                    }
                });
                
                // Create Fuse.js search index
                fuse = new Fuse(fuseData, {
                    keys: [
                        { name: 'label', weight: 1 },
                        { name: 'subtitle', weight: 0.8 },
                        { name: 'tags', weight: 0.6 },
                        { name: 'parentLabel', weight: 0.3 }
                    ],
                    includeScore: true,
                    threshold: 0.4,
                    distance: 40,
                    minMatchCharLength: 1,
                    useExtendedSearch: true,
                    ignoreLocation: true,
                    location: 0
                });
                
                console.log(`Indexed ${fuseData.length} items for search`);
            } catch (error) {
                console.error('Error preparing Fuse index:', error);
                
                // Create an empty fuse instance as fallback
                fuse = new Fuse([], {
                    keys: ['label'],
                    includeScore: true
                });
            }
        };
        
        // Helper for getting data safely
        function _safeGetData(obj) {
            if (!obj) return {};
            
            try {
                if (obj.data) return obj.data;
                if (typeof obj.get === 'function') {
                    return obj.get('data') || {};
                }
                return {};
            } catch (e) {
                console.warn('Error getting data:', e);
                return {};
            }
        }
        
        // Helper to check if a panorama should be included
        function _shouldIncludePanorama(label, subtitle, tags, index, filterMode, 
            allowedValues, blacklistedValues, allowedMediaIndexes, blacklistedMediaIndexes) {
            
            // Apply whitelist/blacklist filters
            if (filterMode === "whitelist") {
                if (label) {
                    if (!allowedValues.includes(label)) {
                        if (!subtitle || !allowedValues.includes(subtitle)) return false;
                    }
                } else {
                    if (subtitle && !allowedValues.includes(subtitle)) return false;
                }
            } else if (filterMode === "blacklist") {
                if (label && blacklistedValues.includes(label)) return false;
                if (subtitle && blacklistedValues.includes(subtitle)) return false;
            }
            
            // For completely blank items
            const hasTags = Array.isArray(tags) && tags.length > 0;
            if (!label && !subtitle && !hasTags) {
                // Check media index filtering
                if (filterMode === "whitelist" && allowedMediaIndexes.length > 0) {
                    if (!allowedMediaIndexes.includes(index)) return false;
                }
                if (filterMode === "blacklist" && blacklistedMediaIndexes.length > 0) {
                    if (blacklistedMediaIndexes.includes(index)) return false;
                }
                if (!_config.includeContent.completelyBlank) return false;
            }
            
            // Skip unlabeled items based on configuration
            if (!label) {
                const hasSubtitle = Boolean(subtitle);
                
                const shouldInclude = 
                    (hasSubtitle && _config.includeContent.unlabeledWithSubtitles) ||
                    (hasTags && _config.includeContent.unlabeledWithTags) ||
                    (!hasSubtitle && !hasTags && _config.includeContent.completelyBlank);
                
                if (!shouldInclude) return false;
            }
            
            return true;
        }
        
        // Helper to get display label
        function _getDisplayLabel(label, subtitle, tags) {
            if (_config.display.onlySubtitles && subtitle) {
                return subtitle;
            } 
            
            if (!label) {
                if (subtitle && _config.useAsLabel.subtitles) {
                    return subtitle;
                } 
                
                if (Array.isArray(tags) && tags.length > 0 && _config.useAsLabel.tags) {
                    return tags.join(', ');
                } 
                
                if (_config.useAsLabel.elementType) {
                    return 'Panorama';
                }
                
                return _config.useAsLabel.customText;
            }
            
            return label;
        }
        
        // Helper to get overlays from multiple sources
        function _getOverlays(media, tour, item) {
            const overlays = [];
            const overlayDetectionMethods = [
                // Method 1: media.get('overlays')
                () => {
                    try {
                        const mediaOverlays = media.get('overlays');
                        if (Array.isArray(mediaOverlays) && mediaOverlays.length > 0) {
                            return mediaOverlays;
                        }
                    } catch (e) {
                        console.debug('Method 1 overlay detection failed:', e);
                    }
                    return null;
                },
                
                // Method 2: media.overlays
                () => {
                    try {
                        if (Array.isArray(media.overlays) && media.overlays.length > 0) {
                            return media.overlays;
                        }
                    } catch (e) {
                        console.debug('Method 2 overlay detection failed:', e);
                    }
                    return null;
                },
                
                // Method 3: item's overlays directly
                () => {
                    try {
                        if (Array.isArray(item.overlays) && item.overlays.length > 0) {
                            return item.overlays;
                        }
                    } catch (e) {
                        console.debug('Method 3 overlay detection failed:', e);
                    }
                    return null;
                },
                
                // Method 4: overlaysByTags
                () => {
                    try {
                        if (typeof media.get === 'function') {
                            const tagOverlays = media.get('overlaysByTags');
                            if (tagOverlays && typeof tagOverlays === 'object') {
                                const result = [];
                                Object.values(tagOverlays).forEach(tagGroup => {
                                    if (Array.isArray(tagGroup)) {
                                        result.push(...tagGroup);
                                    }
                                });
                                if (result.length > 0) {
                                    return result;
                                }
                            }
                        }
                    } catch (e) {
                        console.debug('Method 4 overlay detection failed:', e);
                    }
                    return null;
                },
                
                // Method 5: Look for child elements in the tour.player
                () => {
                    try {
                        if (tour.player && typeof tour.player.getByClassName === 'function') {
                            const allOverlays = tour.player.getByClassName('PanoramaOverlay');
                            if (Array.isArray(allOverlays) && allOverlays.length > 0) {
                                // Filter to only get overlays that belong to this panorama
                                return allOverlays.filter(overlay => {
                                    try {
                                        const parentMedia = overlay.get('media');
                                        return parentMedia && parentMedia.get('id') === media.get('id');
                                    } catch (e) {
                                        return false;
                                    }
                                });
                            }
                        }
                    } catch (e) {
                        console.debug('Method 5 overlay detection failed:', e);
                    }
                    return null;
                }
            ];
            
            // Try each method in sequence
            for (const method of overlayDetectionMethods) {
                const result = method();
                if (result) {
                    overlays.push(...result);
                    break;
                }
            }
            
            return overlays;
        }
        
        // Process overlay elements
        function _processOverlays(overlays, fuseData, parentIndex, parentLabel) {
            if (!Array.isArray(overlays) || overlays.length === 0) {
                return;
            }
            
            overlays.forEach((overlay, overlayIndex) => {
                try {
                    // Get overlay data safely
                    const overlayData = _safeGetData(overlay);
                    
                    // Get overlay label
                    let overlayLabel = '';
                    if (overlayData.label) {
                        overlayLabel = overlayData.label.trim();
                    } else if (overlay.label) {
                        overlayLabel = overlay.label.trim();
                    } else if (typeof overlay.get === 'function') {
                        try {
                            const label = overlay.get('label');
                            if (label) overlayLabel = label.trim();
                        } catch (e) {}
                    }
                    
                    // If still no label, try to use other properties like text content
                    if (!overlayLabel && typeof overlay.get === 'function') {
                        try {
                            const textContent = overlay.get('text');
                            if (textContent) {
                                overlayLabel = textContent.substring(0, 30);
                                if (textContent.length > 30) overlayLabel += '...';
                            }
                        } catch (e) {}
                    }
                    
                    // Skip if empty label and configured to do so
                    if (!overlayLabel && _config.includeContent.elements.skipEmptyLabels) return;
                    
                    // Get element type
                    let elementType = _getElementType(overlay, overlayLabel);
                    if (overlayLabel.includes('info-') || overlayLabel.includes('info_')) {
                        elementType = 'Hotspot';
                    }
                    
                    // Apply element filtering
                    const elementTags = Array.isArray(overlayData.tags) ? overlayData.tags : [];
                    if (!_shouldIncludeElement(elementType, overlayLabel, elementTags)) {
                        return;
                    }
                    
                    // Get element ID safely
                    let elementId = null;
                    if (overlay.id) {
                        elementId = overlay.id;
                    } else if (typeof overlay.get === 'function') {
                        try {
                            elementId = overlay.get('id');
                        } catch (e) {}
                    }
                    
                    // Create a fallback label if needed
                    let displayLabel = overlayLabel;
                    if (!displayLabel) {
                        displayLabel = `${elementType} ${parentIndex}.${overlayIndex}`;
                    }
                    
                    // Add to search data
                    fuseData.push({
                        type: elementType,
                        label: displayLabel,
                        tags: elementTags,
                        parentIndex: parentIndex,
                        parentLabel: parentLabel,
                        id: elementId,
                        boost: 0.8
                    });
                } catch (overlayError) {
                    console.warn(`Error processing overlay at index ${overlayIndex}:`, overlayError);
                }
            });
        }
        
        // Create the search UI components if not present
        function _createSearchInterface(container) {
            // Create search field if missing
            if (!container.querySelector('#tourSearch')) {
                const searchField = document.createElement('div');
                searchField.className = 'search-field';
                searchField.innerHTML = `
                    <input type="text" id="tourSearch" placeholder="${_config.searchBar.placeholder}" autocomplete="off">
                    <div class="icon-container">
                        <div class="search-icon" aria-hidden="true"></div>
                        <button class="clear-button" aria-label="Clear search">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                `;
                container.insertBefore(searchField, container.firstChild);
            }
            
            // Create search results container if missing
            if (!container.querySelector('.search-results')) {
                const resultsContainer = document.createElement('div');
                resultsContainer.className = 'search-results';
                
                // Add results section
                const resultsSection = document.createElement('div');
                resultsSection.className = 'results-section';
                resultsContainer.appendChild(resultsSection);
                
                // Add no-results message
                const noResults = document.createElement('div');
                noResults.className = 'no-results';
                noResults.innerHTML = '<p>No results found</p>';
                resultsContainer.appendChild(noResults);
                
                container.appendChild(resultsContainer);
            }
        }
        
        // Text highlighting with improved safety
        const highlightMatch = (text, term) => {
            if (!text || !term || term === '*') return text || '';
            
            try {
                // Sanitize the search term to prevent regex errors
                const sanitizedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp(`(${sanitizedTerm})`, 'gi');
                return text.replace(regex, '<mark>$1</mark>');
            } catch (e) {
                console.warn('Error highlighting text:', e);
                return text;
            }
        };
        
        // Get icon HTML for element types
        const getTypeIcon = (type) => {
            const icons = {
                Panorama: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                              <circle cx="12" cy="10" r="3"></circle>
                          </svg>`,
                Hotspot: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                             <circle cx="12" cy="12" r="3"></circle>
                             <circle cx="12" cy="12" r="9"></circle>
                          </svg>`,
                Polygon: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                             <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>`,
                Video: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                           <rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect>
                           <polygon points="10 9 15 12 10 15" fill="currentColor"></polygon>
                        </svg>`,
                Webframe: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect x="2" y="2" width="20" height="16" rx="2" ry="2"></rect>
                              <line x1="2" y1="6" x2="22" y2="6"></line>
                           </svg>`,
                Image: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                           <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                           <circle cx="8.5" cy="8.5" r="1.5"></circle>
                           <path d="M21 15l-5-5L5 21"></path>
                        </svg>`,
                ProjectedImage: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                   <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                   <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                   <path d="M21 15l-5-5L5 21"></path>
                                   <line x1="3" y1="3" x2="21" y2="21"></line>
                                </svg>`,
                Text: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="4" y1="7" x2="20" y2="7"></line>
                          <line x1="4" y1="12" x2="20" y2="12"></line>
                          <line x1="4" y1="17" x2="14" y2="17"></line>
                       </svg>`,
                Element: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                             <circle cx="12" cy="12" r="9"></circle>
                          </svg>`
            };
            
            // Return the icon for the specified type, or a default if not found
            return icons[type] || icons['Element'];
        };

        // Render search history
        const renderSearchHistory = () => {
            const history = _searchHistory.get();
            if (!history.length) return '';
            
            return `
                <div class="search-history">
                    <div class="history-header">
                        <h3>Recent Searches</h3>
                        <button class="clear-history">Clear</button>
                    </div>
                    <div class="history-items">
                        ${history.map(term => `
                            <button class="history-item">
                                <svg class="history-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10s10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8s8 3.589 8 8s-3.589 8-8 8zm1-8h4v2h-6V7h2v5z"/>
                                </svg>
                                ${term}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        };

        // Group and sort search results
        const groupAndSortResults = (matches) => {
            // Create object to hold grouped results
            const grouped = matches.reduce((acc, match) => {
                const type = match.item.type;
                if (!acc[type]) acc[type] = [];
                acc[type].push(match);
                return acc;
            }, {});
            
            // Sort items within each group alphabetically
            Object.keys(grouped).forEach(type => {
                grouped[type].sort((a, b) => {
                    // Primary sort by label
                    const labelCompare = a.item.label.localeCompare(b.item.label);
                    if (labelCompare !== 0) return labelCompare;
                    
                    // Secondary sort by parent (if applicable)
                    if (a.item.parentLabel && b.item.parentLabel) {
                        return a.item.parentLabel.localeCompare(b.item.parentLabel);
                    }
                    
                    return 0;
                });
            });
            
            return grouped;
        };

// Main search function with improved error handling
const performSearch = () => {
    const searchContainer = document.getElementById('searchContainer');
    if (!searchContainer) {
        console.error('Search container not found');
        return;
    }
    
    const searchInput = searchContainer.querySelector('#tourSearch');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    const clearButton = searchContainer.querySelector('.clear-button');
    const searchIcon = searchContainer.querySelector('.search-icon');
    const resultsList = searchContainer.querySelector('.results-section');
    const noResults = searchContainer.querySelector('.no-results');
    const resultsContainer = searchContainer.querySelector('.search-results');
    
    if (!resultsContainer || !resultsList || !noResults) {
        console.error('Search UI components not found');
        return;
    }

    // Update UI based on search term
    if (searchTerm.length > 0) {
        if (clearButton) clearButton.classList.add('visible');
        if (searchIcon) searchIcon.style.opacity = '0';
    } else {
        if (clearButton) clearButton.classList.remove('visible');
        if (searchIcon) searchIcon.style.opacity = '1';
    }

    // Skip if search term hasn't changed
    if (searchTerm === currentSearchTerm) return;
    currentSearchTerm = searchTerm;
    
    // Reset results list
    resultsList.innerHTML = '';
    
    // Handle empty search
    if (!searchTerm) {
        noResults.style.display = 'none';
        resultsContainer.classList.remove('visible');
        resultsContainer.style.display = 'none';
        resultsList.innerHTML = renderSearchHistory();
        return;
    }
    
    // Check minimum character requirement
    if (searchTerm !== '*' && searchTerm.length < _config.minSearchChars) {
        noResults.style.display = 'none';
        resultsContainer.classList.remove('visible');
        resultsList.innerHTML = `
            <div class="search-min-chars">
                <p>Please type at least ${_config.minSearchChars} characters to search</p>
            </div>
        `;
        return;
    }
    
    // Show results container with animation
    resultsContainer.style.display = 'block';
    setTimeout(() => resultsContainer.classList.add('visible'), 10);
    
    try {
        // Ensure fuse index is initialized
        if (!fuse) {
            console.warn('Search index not initialized, preparing now...');
            prepareFuse();
        }
        
        // Perform search
        let matches;
        if (searchTerm === '*') {
            // Wildcard search shows all items
            matches = fuse._docs ? fuse._docs.map((item, index) => ({
                item,
                score: 0,
                refIndex: index
            })) : [];
        } else {
            // Process search term for special characters
            const processedTerm = _preprocessSearchTerm(searchTerm);
            
            // Allow exact matching with = prefix
            if (typeof processedTerm === 'string' && processedTerm.startsWith('=')) {
                matches = fuse.search({ $or: [{ label: processedTerm }] });
            } else {
                matches = fuse.search(processedTerm);
            }
        }
        
        // Handle no results case
        if (!matches || !matches.length) {
            resultsList.style.display = 'none';
            noResults.style.display = 'flex';
            return;
        }
        
        // Display results
        resultsList.style.display = 'block';
        noResults.style.display = 'none';
        
        // Group and sort results
        const groupedResults = groupAndSortResults(matches);

        // Apply type filtering based on config
        if (_config.filter.typeFilter?.mode === "whitelist" && 
            Array.isArray(_config.filter.typeFilter?.allowedTypes) && 
            _config.filter.typeFilter.allowedTypes.length > 0) {
            // Only keep allowed result types
            Object.keys(groupedResults).forEach(type => {
                if (!_config.filter.typeFilter.allowedTypes.includes(type)) {
                    delete groupedResults[type];
                }
            });
        } else if (_config.filter.typeFilter?.mode === "blacklist" && 
                  Array.isArray(_config.filter.typeFilter?.blacklistedTypes) && 
                  _config.filter.typeFilter.blacklistedTypes.length > 0) {
            // Remove blacklisted result types
            Object.keys(groupedResults).forEach(type => {
                if (_config.filter.typeFilter.blacklistedTypes.includes(type)) {
                    delete groupedResults[type];
                }
            });
        }
        
        // Render each group of results
        Object.entries(groupedResults).forEach(([type, results]) => {
            const groupEl = document.createElement('div');
            groupEl.className = 'results-group';
            groupEl.setAttribute('data-type', type);
            
            // Create group header
            groupEl.innerHTML = `
                <div class="group-header">
                    <span class="group-title">${type}</span>
                    <span class="group-count">${results.length} result${results.length !== 1 ? 's' : ''}</span>
                </div>
            `;
            
            // Render each result item
            results.forEach((result) => {
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                resultItem.setAttribute('role', 'option');
                resultItem.setAttribute('tabindex', '0');
                resultItem.dataset.type = result.item.type;
                
                if (result.item.id) {
                    resultItem.dataset.id = result.item.id;
                }
                
                if (result.item.parentIndex !== undefined) {
                    resultItem.dataset.parentIndex = result.item.parentIndex;
                }
                
                if (result.item.index !== undefined) {
                    resultItem.dataset.index = result.item.index;
                }
                
                // Show parent info for child elements if configured to do so
                const parentInfo = (result.item.type !== 'Panorama' && 
                                   result.item.parentLabel && 
                                   _config.display.showParentInfo !== false) 
                    ? `<div class="result-parent">in ${highlightMatch(result.item.parentLabel, searchTerm)}</div>`
                    : '';
                                
                // Build result item content
                resultItem.innerHTML = `
                <div class="result-icon">${getTypeIcon(result.item.type)}</div>
                <div class="result-content">
                    <div class="result-text">${highlightMatch(result.item.label, searchTerm)}</div>
                    ${parentInfo}
                    ${result.item.tags && result.item.tags.length > 0 && _config.showTagsInResults ? `
                        <div class="result-tags">
                            Tags: ${highlightMatch(Array.isArray(result.item.tags) ? result.item.tags.join(', ') : result.item.tags, searchTerm)}
                        </div>
                    ` : ''}
                    ${(!_config.display.onlySubtitles && result.item.subtitle && _config.display.showSubtitlesInResults !== false) ? `
                        <div class="result-description">${highlightMatch(result.item.subtitle, searchTerm)}</div>
                    ` : ''}
                </div>
                `;
                
                // Add click handler with improved element triggering
                resultItem.addEventListener('click', () => {
                    // Handle different element types
                    if (result.item.type === 'Panorama') {
                        // Direct navigation for panoramas
                        if (tour && tour.mainPlayList && typeof result.item.index === 'number') {
                            try {
                                tour.mainPlayList.set('selectedIndex', result.item.index);
                                console.log(`Navigated to panorama at index ${result.item.index}`);
                            } catch (e) {
                                console.error(`Error navigating to panorama: ${e.message}`);
                            }
                        }
                    } else if (result.item.parentIndex !== undefined) {
                        // For child elements, navigate to parent panorama first
                        if (tour && tour.mainPlayList) {
                            try {
                                tour.mainPlayList.set('selectedIndex', result.item.parentIndex);
                                console.log(`Navigated to parent panorama at index ${result.item.parentIndex}`);
                                
                                // Then trigger the element with retry logic
                                if (result.item.id) {
                                    _triggerElement(tour, result.item.id, (success) => {
                                        if (success) {
                                            console.log(`Successfully triggered element ${result.item.id}`);
                                        } else {
                                            console.warn(`Failed to trigger element ${result.item.id}`);
                                        }
                                    });
                                }
                            } catch (e) {
                                console.error(`Error navigating to parent panorama: ${e.message}`);
                            }
                        }
                    }
                    
                    // Save search term to history
                    _searchHistory.save(searchTerm);
                    
                    // Clear search input
                    if (searchInput) {
                        searchInput.value = '';
                        searchInput.focus();
                    }
                    
                    // Auto-hide based on configuration
                    const isMobile = window.innerWidth <= _config.mobileBreakpoint;
                    if ((isMobile && _config.autoHide.mobile) ||
                        (!isMobile && _config.autoHide.desktop)) {
                        _toggleSearch(false);
                    }
                });
                
                // Add keyboard navigation
                resultItem.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        resultItem.click();
                    }
                });
                
                // Add to group
                groupEl.appendChild(resultItem);
            });
            
            // Add group to results list
            resultsList.appendChild(groupEl);
        });
    } catch (error) {
        console.error('Search error:', error);
        // Show error message in results
        resultsList.innerHTML = `
            <div class="search-error">
                <p>An error occurred while searching. Please try again.</p>
                <p class="search-error-details">${error.message}</p>
            </div>
        `;
    }
};

// Set up keyboard navigation
const keyboardManager = {
    init(searchContainer, searchInput, performSearch) {
        if (!searchContainer || !searchInput) {
            console.error('Invalid parameters for keyboard manager');
            return;
        }
        
        let selectedIndex = -1;
        let resultItems = [];
        
        // Update the selected item in the results
        const updateSelection = (newIndex) => {
            resultItems = searchContainer.querySelectorAll('.result-item');
            
            if (!resultItems.length) return;
            
            // Clear previous selection
            if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
                resultItems[selectedIndex].classList.remove('selected');
                resultItems[selectedIndex].setAttribute('aria-selected', 'false');
            }
            
            // Set new selection
            selectedIndex = newIndex;
            
            if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
                const selectedItem = resultItems[selectedIndex];
                selectedItem.classList.add('selected');
                selectedItem.setAttribute('aria-selected', 'true');
                selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                selectedItem.focus();
            } else {
                searchInput.focus();
            }
        };
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K to open search
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                _toggleSearch(true);
            }
            
            // Skip if search isn't visible
            if (!searchContainer.classList.contains('visible')) return;
            
            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    // Clear search or hide if already empty
                    if (searchInput.value.trim() !== '') {
                        searchInput.value = '';
                        performSearch();
                        selectedIndex = -1;
                    } else {
                        _toggleSearch(false);
                    }
                    break;
                    
                case 'ArrowDown':
                    e.preventDefault();
                    updateSelection(Math.min(selectedIndex + 1, resultItems.length - 1));
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    updateSelection(Math.max(selectedIndex - 1, -1));
                    break;
                    
                case 'Enter':
                    if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
                        e.preventDefault();
                        resultItems[selectedIndex].click();
                    }
                    break;
                    
                case 'Tab':
                    // Reset selection when tabbing away
                    selectedIndex = -1;
                    break;
            }
        });
        
        // Reset selection when input changes
        searchInput.addEventListener('keyup', _debounce(() => {
            selectedIndex = -1;
        }, 200));
        
        // Handle Enter key in search input
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Click first result if available
                setTimeout(() => {
                    resultItems = searchContainer.querySelectorAll('.result-item');
                    if (resultItems.length > 0) {
                        resultItems[0].click();
                    }
                }, 100);
            }
        });
    }
};

// Prepare the search index
prepareFuse();

// Apply search styling
_applySearchStyling();

// Apply custom CSS for showing/hiding tags
const style = document.createElement('style');
style.textContent = `.result-tags { display: ${_config.showTagsInResults ? 'block' : 'none'}; }`;
style.id = 'search-custom-styles';
document.head.appendChild(style);

// Get key elements
const searchInput = searchContainer.querySelector('#tourSearch');
const clearButton = searchContainer.querySelector('.clear-button');

// Bind input event with debounce
if (searchInput) {
    searchInput.addEventListener('input', _debounce(performSearch, 150));
    
    // Special handling for mobile touch events
    if ('ontouchstart' in window) {
        searchInput.addEventListener('touchend', (e) => {
            searchInput.focus();
        });
    }
}

// Bind clear button
if (clearButton) {
    clearButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (searchInput) {
            searchInput.value = '';
            performSearch();
            searchInput.focus();
        }
        
        // If on mobile, also close the search completely if configured
        if (window.innerWidth <= _config.mobileBreakpoint && _config.autoHide.mobile) {
            _toggleSearch(false);
        }
    });
}

// Bind search icon for wildcard search
const searchIcon = searchContainer.querySelector('.search-icon');
if (searchIcon) {
    searchIcon.style.cursor = 'pointer';
    searchIcon.addEventListener('click', () => {
        if (searchInput) {
            searchInput.value = '*';
            performSearch();
        }
    });
}

// Close search when clicking outside
document.addEventListener('click', (e) => {
    // Skip if search isn't visible
    if (!searchContainer.classList.contains('visible')) return;
    
    // Close if click is outside search container
    if (!searchContainer.contains(e.target)) {
        _toggleSearch(false);
    }
});

// Special mobile handling
if ('ontouchstart' in window) {
    document.addEventListener('touchstart', (e) => {
        if (searchContainer.classList.contains('visible') && 
            !searchContainer.contains(e.target)) {
            _toggleSearch(false);
        }
    });
}

// Set up keyboard navigation
keyboardManager.init(searchContainer, searchInput, performSearch);

// Bind history-related click events
searchContainer.addEventListener('click', (e) => {
    // Handle history item clicks
    if (e.target.closest('.history-item')) {
        const term = e.target.closest('.history-item').textContent.trim();
        if (searchInput) {
            searchInput.value = term;
            performSearch();
        }
    }
    
    // Handle clear history button
    if (e.target.closest('.clear-history')) {
        _searchHistory.clear();
        performSearch();
    }
});

// Mark initialization as complete
window.searchListInitialized = true;
window.searchListInitiinitialized = true;
_initialized = true;
console.log('Enhanced search initialized successfully');

// Apply window resize handler for styling
window.addEventListener('resize', _debounce(() => {
    _applySearchStyling();
}, 250));
}

// Toggle search visibility with improved transitions
function _toggleSearch(show) {
const searchContainer = document.getElementById('searchContainer');
if (!searchContainer) {
    console.error('Search container not found');
    return;
}

// Get elements
const resultsContainer = searchContainer.querySelector('.search-results');
const searchInput = searchContainer.querySelector('#tourSearch');
const clearButton = searchContainer.querySelector('.clear-button');
const searchIcon = searchContainer.querySelector('.search-icon');

// Show search
if (show) {
    // Update display before animation
    searchContainer.style.display = 'block';
    
    // Ensure it's within viewport bounds
    const viewportHeight = window.innerHeight;
    const searchContainerRect = searchContainer.getBoundingClientRect();
    const searchContainerTop = searchContainerRect.top;
    const searchContainerHeight = searchContainerRect.height;
    
    // Adjust position if needed to keep within viewport
    if (searchContainerTop + searchContainerHeight > viewportHeight) {
        const newTop = Math.max(10, viewportHeight - searchContainerHeight - 20);
        searchContainer.style.top = newTop + 'px';
    }
    
    // Trigger animation on next frame
    requestAnimationFrame(() => {
        searchContainer.classList.add('visible');
        
        // Focus input field
        if (searchInput) {
            searchInput.focus();
            searchInput.dispatchEvent(new Event('input'));
        }
    });
} else {
    // Hide search
    searchContainer.classList.remove('visible');
    
    // Hide results immediately
    if (resultsContainer) {
        resultsContainer.classList.remove('visible');
        resultsContainer.style.display = 'none';
    }
    
    // Clean up after animation
    setTimeout(() => {
        // Hide container
        searchContainer.style.display = 'none';
        
        // Reset input and UI
        if (searchInput) {
            searchInput.value = '';
            searchInput.blur();
        }
        
        if (clearButton) {
            clearButton.classList.remove('visible');
        }
        
        if (searchIcon) {
            searchIcon.style.opacity = '1';
        }
        
        // Clear results
        const resultsList = searchContainer.querySelector('.results-section');
        if (resultsList) {
            resultsList.innerHTML = '';
        }
        
        // Hide any error messages
        const noResults = searchContainer.querySelector('.no-results');
        if (noResults) {
            noResults.style.display = 'none';
        }
    }, 200); // Match the CSS transition duration
}
}

// PUBLIC API
return {
// Initialize search functionality
initializeSearch: function(tour) {
    try {
        if (!tour) {
            throw new Error('Tour instance is required for initialization');
        }
        
        _initializeSearch(tour);
    } catch (error) {
        console.error('Search initialization failed:', error);
    }
},

// Toggle search visibility
toggleSearch: function(show) {
    _toggleSearch(show);
},

// Update configuration with deep merge
updateConfig: function(newConfig) {
    try {
        if (!newConfig || typeof newConfig !== 'object') {
            throw new Error('Invalid configuration object');
        }
        
        // Deep merge function
        function deepMerge(target, source) {
            // Handle null/undefined values
            if (!source) return target;
            if (!target) return source;
            
            for (const key in source) {
                // Skip prototype properties and undefined values
                if (!Object.prototype.hasOwnProperty.call(source, key) || source[key] === undefined) {
                    continue;
                }
                
                // Deep merge for objects that aren't arrays
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    // Create empty target object if needed
                    if (!target[key] || typeof target[key] !== 'object') {
                        target[key] = {};
                    }
                    
                    // Recurse for nested objects
                    deepMerge(target[key], source[key]);
                } else {
                    // Direct assignment for primitives and arrays
                    target[key] = source[key];
                }
            }
            
            return target;
        }
        
        // Merge new configuration
        _config = deepMerge(_config, newConfig);
        
        // Apply styling updates
        _applySearchStyling();
        
        // Reinitialize if already initialized
        if (_initialized && window.tourInstance) {
            _initializeSearch(window.tourInstance);
        }
        
        return this.getConfig();
    } catch (error) {
        console.error('Error updating configuration:', error);
        return this.getConfig();
    }
},

// Get current config (clone to prevent direct modification)
getConfig: function() {
    try {
        return JSON.parse(JSON.stringify(_config));
    } catch (error) {
        console.error('Error getting configuration:', error);
        return {};
    }
},

// Search history management
searchHistory: {
    get: function() {
        return _searchHistory.get();
    },
    clear: function() {
        return _searchHistory.clear();
    },
    save: function(term) {
        return _searchHistory.save(term);
    }
},

// Utility functions (exposed for potential extension)
utils: {
    debounce: _debounce,
    getElementType: _getElementType,
    triggerElement: _triggerElement
}
};
})();

// Make search available globally
window.searchFunctions = window.tourSearchFunctions;