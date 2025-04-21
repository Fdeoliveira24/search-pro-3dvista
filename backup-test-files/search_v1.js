/*
====================================
3DVista Enhanced Search Script
Version: 2.0.2
Last Updated: 04/17/2025
Description: Core search functionality for 3DVista tours with element detection, 
filtering options, and improved UI interactions. Configured via direct JavaScript.
====================================
*/

window.tourSearchFunctions = (function() {
    // Private variables
    let _config = {
        autoHide: {
            mobile: true,
            desktop: false
        },
        
        mobileBreakpoint: 768,
        minSearchChars: 2,
        
        showTagsInResults: false,
        
        includeContent: {
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
        },
        
        useAsLabel: {
            subtitles: true,
            tags: true,
            elementType: true,
            parentWithType: false,
            customText: '[Unnamed Item]'
        },
        
        display: {
            onlySubtitles: false,
            showSubtitlesInResults: true,
            showParentLabel: true,
            showParentInfo: true,
            showParentTags: true,
            showParentType: true,
            showGroupHeaders: false,
            showGroupCount: true,
            showIconsInResults: true
        },
        
        filter: {
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
        },
        
        elementTriggering: {
            initialDelay: 500,
            maxRetries: 3,
            retryInterval: 300
        },
        
        // Added settings for styling
        appearance: {
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
        },
        
        searchBar: {
            placeholder: 'Search...',
            width: 350,
            position: {
                top: 70,
                right: 70,
                left: null,
                bottom: null
            },
            useResponsive: false,
            mobilePosition: {
                top: 90,
                left: 20,
                right: 20,
                bottom: null
            }
        }
    };

    let _initialized = false;

    // Utility functions
    function _debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    function _preprocessSearchTerm(term) {
        if (/[0-9\-_]/.test(term)) {
            return `'${term}`;
        }
        return term;
    }

    function _getElementType(overlay, label) {
        if (!overlay) return 'Element';
        
        try {
            // PRIMARY: Use the class property directly
            if (overlay.class) {
                const className = overlay.class;
                
                if (className === 'FramePanoramaOverlay') return 'Webframe';
                if (className === 'QuadVideoPanoramaOverlay') return 'Video';
                if (className === 'ImagePanoramaOverlay') return 'Image';
                if (className === 'TextPanoramaOverlay') return 'Text';
                
                if (className === 'HotspotPanoramaOverlay') {
                    // For hotspots, check functional indicators via data property
                    if (overlay.data) {
                        if (overlay.data.hasPanoramaAction) return 'Hotspot';
                        if (overlay.data.hasText) return 'Text';
                        if (overlay.data.isPolygon) return 'Polygon';
                    }
                    
                    // Use label-based heuristics as fallback
                    const overlayLabel = (overlay.label || label || '').toLowerCase();
                    
                    if (overlayLabel.includes('polygon')) return 'Polygon';
                    if (overlayLabel === 'image') return 'Image';
                    if (overlayLabel.includes('info-')) return 'Hotspot';
                    
                    return 'Hotspot';
                }
            }
            
            // SECONDARY: Use get method
            if (typeof overlay.get === 'function') {
                try {
                    const className = overlay.get('class');
                    
                    if (className === 'FramePanoramaOverlay') return 'Webframe';
                    if (className === 'QuadVideoPanoramaOverlay') return 'Video';
                    if (className === 'ImagePanoramaOverlay') return 'Image';
                    if (className === 'TextPanoramaOverlay') return 'Text';
                    
                    if (className === 'HotspotPanoramaOverlay') {
                        // Check data properties
                        try {
                            const data = overlay.get('data') || {};
                            if (data.hasPanoramaAction) return 'Hotspot';
                            if (data.hasText) return 'Text';
                            if (data.isPolygon) return 'Polygon';
                        } catch (e) {}
                        
                        // Use label as fallback
                        const overlayLabel = (overlay.label || label || '').toLowerCase();
                        if (overlayLabel.includes('polygon')) return 'Polygon';
                        if (overlayLabel === 'image') return 'Image';
                        if (overlayLabel.includes('info-')) return 'Hotspot';
                        
                        return 'Hotspot';
                    }
                } catch (e) {}
            }
            
            // TERTIARY: Check unique properties
            if (overlay.url || (overlay.data && overlay.data.url)) return 'Webframe';
            if (overlay.video || (overlay.data && overlay.data.video)) return 'Video';
            if (overlay.vertices || overlay.polygon || 
                (overlay.data && (overlay.data.vertices || overlay.data.polygon))) return 'Polygon';
            
            // Additional property checks
            if (overlay.video) return 'Video';
            if (overlay.url) return 'Webframe';
            if (overlay.vertices) return 'Polygon';
            if (overlay.items) return 'Hotspot';

            // QUATERNARY: Use label patterns
            const overlayLabel = (overlay.label || label || '').toLowerCase();
            if (overlayLabel) {
                if (overlayLabel === 'web') return 'Webframe';
                if (overlayLabel.includes('video')) return 'Video';
                if (overlayLabel === 'image') return 'Image';
                if (overlayLabel.includes('text')) return 'Text';
                if (overlayLabel.includes('polygon')) return 'Polygon';
                if (overlayLabel.includes('goto') || overlayLabel.includes('info')) return 'Hotspot';
            }
            
            return 'Element';
        } catch (error) {
            console.warn('Error in getElementType:', error);
            return 'Element';
        }
    }

    function _shouldIncludeElement(elementType, label, tags) {
        try {
            // Skip empty labels if configured
            if (!label && _config.includeContent.elements.skipEmptyLabels) return false;

            // Check minimum label length
            if (label && label.length < _config.includeContent.elements.minLabelLength) return false;

            // Apply element type filtering
            const typeFilterMode = _config.filter.elementTypes?.mode;
            if (typeFilterMode === "whitelist" && _config.filter.elementTypes?.allowedTypes?.length > 0) {
                if (!_config.filter.elementTypes.allowedTypes.includes(elementType)) {
                    return false;
                }
            } else if (typeFilterMode === "blacklist" && _config.filter.elementTypes?.blacklistedTypes?.length > 0) {
                if (_config.filter.elementTypes.blacklistedTypes.includes(elementType)) {
                    return false;
                }
            }

            // Apply label filtering
            const labelFilterMode = _config.filter.elementLabels?.mode;
            if (label && labelFilterMode === "whitelist" && _config.filter.elementLabels?.allowedValues?.length > 0) {
                if (!_config.filter.elementLabels.allowedValues.some(value => label.includes(value))) {
                    return false;
                }
            } else if (label && labelFilterMode === "blacklist" && _config.filter.elementLabels?.blacklistedValues?.length > 0) {
                if (_config.filter.elementLabels.blacklistedValues.some(value => label.includes(value))) {
                    return false;
                }
            }

            // Add tag filtering logic
            const tagFilterMode = _config.filter.tagFiltering?.mode;
            if (tags && Array.isArray(tags) && tags.length > 0) {
                if (tagFilterMode === "whitelist" && _config.filter.tagFiltering?.allowedTags?.length > 0) {
                    if (!tags.some(tag => _config.filter.tagFiltering.allowedTags.includes(tag))) {
                        return false;
                    }
                } else if (tagFilterMode === "blacklist" && _config.filter.tagFiltering?.blacklistedTags?.length > 0) {
                    if (tags.some(tag => _config.filter.tagFiltering.blacklistedTags.includes(tag))) {
                        return false;
                    }
                }
            } else if (tagFilterMode === "whitelist" && _config.filter.tagFiltering?.allowedTags?.length > 0) {
                return false;
            }

            // Check element type against configuration
            switch (elementType) {
                case 'Hotspot':
                    return _config.includeContent.elements.includeHotspots;
                case 'Polygon':
                    return _config.includeContent.elements.includePolygons;
                case 'Video':
                    return _config.includeContent.elements.includeVideos;
                case 'Webframe':
                    return _config.includeContent.elements.includeWebframes;
                case 'Image':
                    return _config.includeContent.elements.includeImages;
                case 'Text':
                    return _config.includeContent.elements.includeText;
                case 'ProjectedImage':
                    return _config.includeContent.elements.includeProjectedImages;
                case 'Element':
                    return _config.includeContent.elements.includeElements !== false;
                default:
                    const configKey = `include${elementType}s`;
                    if (_config.includeContent.elements[configKey] !== undefined) {
                        return _config.includeContent.elements[configKey];
                    }
                    return true;
            }
        } catch (error) {
            console.warn('Error checking if element should be included:', error);
            return false;
        }
    }

    function _triggerElement(tour, elementId, callback) {
        const config = _config.elementTriggering;
        let retryCount = 0;
        
        const attemptTrigger = () => {
            try {
                if (!tour || !tour.player) {
                    if (callback) callback(false);
                    return;
                }
                
                // Try to get element by ID
                let element;
                try {
                    element = tour.player.getById(elementId);
                } catch (e) {
                    // Try alternative methods
                    try {
                        element = tour.get(elementId) || tour.player.get(elementId);
                    } catch (e2) {}
                }
                
                // If element was found, try to trigger it
                if (element) {
                    console.log(`Element found: ${elementId}`);
                    
                    // Try different trigger methods
                    let triggered = false;
                    
                    // Method 1: trigger('click')
                    if (typeof element.trigger === 'function') {
                        try {
                            element.trigger('click');
                            triggered = true;
                        } catch (e) {
                            console.warn(`Error with trigger method: ${e.message}`);
                        }
                    }
                    
                    // Method 2: click()
                    if (!triggered && typeof element.click === 'function') {
                        try {
                            element.click();
                            triggered = true;
                        } catch (e) {
                            console.warn(`Error with click method: ${e.message}`);
                        }
                    }
                    
                    // Method 3: onClick
                    if (!triggered && element.onClick) {
                        try {
                            element.onClick();
                            triggered = true;
                        } catch (e) {
                            console.warn(`Error with onClick method: ${e.message}`);
                        }
                    }
                    
                    if (triggered) {
                        if (callback) callback(true);
                        return;
                    }
                }
                
                // Retry if needed
                retryCount++;
                if (retryCount < config.maxRetries) {
                    console.log(`Element trigger attempt ${retryCount} failed, retrying in ${config.retryInterval}ms...`);
                    setTimeout(attemptTrigger, config.retryInterval);
                } else {
                    console.warn(`Failed to trigger element ${elementId} after ${config.maxRetries} attempts`);
                    if (callback) callback(false);
                }
            } catch (error) {
                console.warn(`Error in triggerElement: ${error.message}`);
                if (callback) callback(false);
            }
        };
        
        // Start first attempt after initial delay
        setTimeout(attemptTrigger, config.initialDelay);
    }

    // Apply styling to the search container
    function _applySearchStyling() {
        const searchContainer = document.getElementById('searchContainer');
        if (!searchContainer) return;
        
        // Apply container position
        const position = _config.searchBar.position;
        const isMobile = window.innerWidth <= _config.mobileBreakpoint;
        
        // Apply CSS variables for colors
        const styleElement = document.createElement('style');
        styleElement.id = 'search-custom-vars';
        
        const colors = _config.appearance.colors;
        styleElement.textContent = `
            :root {
                --search-background: ${colors.searchBackground} !important;
                --search-text: ${colors.searchText} !important;
                --placeholder-text: ${colors.placeholderText} !important;
                --search-icon: ${colors.searchIcon} !important;
                --clear-icon: ${colors.clearIcon} !important;
                --results-background: ${colors.resultsBackground} !important;
                --group-header-color: ${colors.groupHeaderColor} !important;
                --group-count-color: ${colors.groupCountColor} !important;
                --result-hover: ${colors.resultHover} !important;
                --result-border-left: ${colors.resultBorderLeft} !important;
                --result-text: ${colors.resultText} !important;
                --result-subtitle: ${colors.resultSubtitle} !important;
                --result-icon-color: ${colors.resultIconColor} !important;
                --result-subtext-color: ${colors.resultSubtextColor} !important;
            }
            
            #searchContainer {
                position: fixed !important;
                transform: none !important;
                z-index: 9999 !important;
                ${isMobile && _config.searchBar.useResponsive ? `
                    top: ${_config.searchBar.mobilePosition.top}px !important;
                    left: ${_config.searchBar.mobilePosition.left}px !important;
                    right: ${_config.searchBar.mobilePosition.right}px !important;
                    width: calc(100% - 40px) !important;
                ` : `
                    ${position.top !== null ? `top: ${position.top}px !important;` : ''}
                    ${position.right !== null ? `right: ${position.right}px !important;` : ''}
                    ${position.left !== null ? `left: ${position.left}px !important;` : ''}
                    ${position.bottom !== null ? `bottom: ${position.bottom}px !important;` : ''}
                    width: ${_config.searchBar.width}px !important;
                `}
            }
            
            /* Additional CSS - make sure to remove any .search-history, .history-header, .history-items, and .history-item styles */
        `;
        
        // Apply border radius for search field and results
        const fieldRadius = _config.appearance.searchField.borderRadius;
        const resultsRadius = _config.appearance.searchResults.borderRadius;
        
        styleElement.textContent += `
            #searchContainer .search-field {
                border-top-left-radius: ${Math.min(fieldRadius.topLeft, 50)}px !important;
                border-top-right-radius: ${Math.min(fieldRadius.topRight, 50)}px !important;
                border-bottom-right-radius: ${Math.min(fieldRadius.bottomRight, 50)}px !important;
                border-bottom-left-radius: ${Math.min(fieldRadius.bottomLeft, 50)}px !important;
            }
            
            #searchContainer .search-results {
                border-top-left-radius: ${Math.min(resultsRadius.topLeft, 10)}px !important;
                border-top-right-radius: ${Math.min(resultsRadius.topRight, 10)}px !important;
                border-bottom-right-radius: ${Math.min(resultsRadius.bottomRight, 10)}px !important;
                border-bottom-left-radius: ${Math.min(resultsRadius.bottomLeft, 10)}px !important;
            }
        `;
        
        // Remove existing style element if it exists
        const existingStyle = document.getElementById('search-custom-vars');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // Add the style to the document
        document.head.appendChild(styleElement);
        
        // Apply placeholder text
        const searchInput = searchContainer.querySelector('#tourSearch');
        if (searchInput) {
            searchInput.placeholder = _config.searchBar.placeholder;
        }
        
        console.log('Search styling applied successfully');
    }

    // Initialize search
    function _initializeSearch(tour) {
        console.log('Initializing enhanced search with element support v2.0...');
        window.tourInstance = tour;
        
        if (window.searchListInitialized || window.searchListInitiinitialized) {
            console.log('Search already initialized, skipping...');
            return;
        }
        
        const searchContainer = document.getElementById('searchContainer');
        if (!searchContainer || !tour || !tour.mainPlayList) {
            console.warn('Search initialization failed: missing requirements');
            return;
        }
        
        // Create search field if missing
        if (!searchContainer.querySelector('#tourSearch')) {
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
            searchContainer.insertBefore(searchField, searchContainer.firstChild);
        }
        
        // Create search results container if missing
        if (!searchContainer.querySelector('.search-results')) {
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
            
            searchContainer.appendChild(resultsContainer);
        }
        
        let currentSearchTerm = '';
        let fuse;
        
        // Prepare Fuse.js index
        const prepareFuse = () => {
            try {
                const items = tour.mainPlayList.get('items');
                const fuseData = [];
                const filterMode = _config.filter.mode;
                const allowedValues = _config.filter.allowedValues || [];
                const blacklistedValues = _config.filter.blacklistedValues || [];
                const allowedMediaIndexes = _config.filter.allowedMediaIndexes || [];
                const blacklistedMediaIndexes = _config.filter.blacklistedMediaIndexes || [];
                
                items.forEach((item, index) => {
                    try {
                        const media = item.get('media');
                        if (!media) {
                            console.warn(`No media found for item at index ${index}`);
                            return;
                        }
                        
                        // Safely get data
                        let data;
                        try {
                            data = media.get('data') || {};
                        } catch (e) {
                            console.warn(`Error getting data for item at index ${index}: ${e.message}`);
                            data = {};
                        }
                        
                        const label = data?.label?.trim() || '';
                        const subtitle = data?.subtitle?.trim() || '';
                        
                        // Apply whitelist/blacklist filtering if enabled
                        if (filterMode === "whitelist") {
                            if (label) {
                                if (!allowedValues.includes(label)) {
                                    if (!subtitle || !allowedValues.includes(subtitle)) return;
                                }
                            } else {
                                if (subtitle && !allowedValues.includes(subtitle)) return;
                            }
                        } else if (filterMode === "blacklist") {
                            if (label && blacklistedValues.includes(label)) return;
                            if (subtitle && blacklistedValues.includes(subtitle)) return;
                        }
                        
                        // For completely blank items
                        const hasTags = Array.isArray(data?.tags) && data.tags.length > 0;
                        if (!label && !subtitle && !hasTags) {
                            // Check media index filtering
                            if (filterMode === "whitelist" && allowedMediaIndexes.length > 0) {
                                if (!allowedMediaIndexes.includes(index)) return;
                            }
                            if (filterMode === "blacklist" && blacklistedMediaIndexes.length > 0) {
                                if (blacklistedMediaIndexes.includes(index)) return;
                            }
                            if (!_config.includeContent.completelyBlank) return;
                        }
                        
                        // Skip unlabeled items based on configuration
                        if (!label) {
                            const hasSubtitle = Boolean(subtitle);
                            
                            const shouldInclude = 
                                (hasSubtitle && _config.includeContent.unlabeledWithSubtitles) ||
                                (hasTags && _config.includeContent.unlabeledWithTags) ||
                                (!hasSubtitle && !hasTags && _config.includeContent.completelyBlank);
                            
                            if (!shouldInclude) return;
                        }
                        
                        // Determine display label
                        let displayLabel;
                        if (_config.display.onlySubtitles && subtitle) {
                            displayLabel = subtitle;
                        } else if (!label) {
                            if (subtitle && _config.useAsLabel.subtitles) {
                                displayLabel = subtitle;
                            } else if (hasTags && _config.useAsLabel.tags) {
                                displayLabel = data.tags.join(', ');
                            } else if (_config.useAsLabel.elementType) {
                                displayLabel = 'Panorama';
                            } else {
                                displayLabel = _config.useAsLabel.customText;
                            }
                        } else {
                            displayLabel = label;
                        }
                        
                        // Truncate long labels
                        if (displayLabel && displayLabel.length > 40) {
                            displayLabel = displayLabel.substring(0, 40) + '...';
                        }
                        
                        // Add panorama item to Fuse index
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
                        
                        // Process overlays (elements) for the panorama
                        try {
                            // Try multiple ways to get overlays
                            let overlays = [];
                            
                            // Method 1: media.get('overlays')
                            try {
                                const mediaOverlays = media.get('overlays');
                                if (Array.isArray(mediaOverlays)) {
                                    overlays = mediaOverlays;
                                }
                            } catch (e) {}
                            
                            // Method 2: media.overlays
                            if (overlays.length === 0 && Array.isArray(media.overlays)) {
                                overlays = media.overlays;
                            }
                            
                            // Method 3: item's overlays directly
                            if (overlays.length === 0 && Array.isArray(item.overlays)) {
                                overlays = item.overlays;
                            }
                            
                            // Method 4: Check if media has a .get('overlaysByTags') method
                            if (overlays.length === 0 && typeof media.get === 'function') {
                                try {
                                    const tagOverlays = media.get('overlaysByTags');
                                    if (tagOverlays && typeof tagOverlays === 'object') {
                                        Object.values(tagOverlays).forEach(tagGroup => {
                                            if (Array.isArray(tagGroup)) {
                                                overlays = overlays.concat(tagGroup);
                                            }
                                        });
                                    }
                                } catch (e) {}
                            }
                            
                            // Method 5: Look for child elements in the tour.player
                            if (overlays.length === 0 && tour.player && typeof tour.player.getByClassName === 'function') {
                                try {
                                    const allOverlays = tour.player.getByClassName('PanoramaOverlay');
                                    if (Array.isArray(allOverlays)) {
                                        // Filter to only get overlays that belong to this panorama
                                        overlays = allOverlays.filter(overlay => {
                                            try {
                                                const parentMedia = overlay.get('media');
                                                return parentMedia && parentMedia.get('id') === media.get('id');
                                            } catch (e) {
                                                return false;
                                            }
                                        });
                                    }
                                } catch (e) {}
                            }
                            
                            // Process found overlays
                            overlays.forEach((overlay, overlayIndex) => {
                                try {
                                    // Get overlay data safely
                                    let overlayData = {};
                                    if (overlay.data) {
                                        overlayData = overlay.data;
                                    } else if (typeof overlay.get === 'function') {
                                        try {
                                            overlayData = overlay.get('data') || {};
                                        } catch (e) {}
                                    }
                            
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
                            
                                    // If still no label, try to use other properties
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
                                    let elementLabel = overlayLabel;
                                    if (!elementLabel) {
                                        elementLabel = `${elementType} ${index}.${overlayIndex}`;
                                    }
                            
                                    // Add to search data
                                    fuseData.push({
                                        type: elementType,
                                        label: elementLabel,
                                        tags: Array.isArray(overlayData.tags) ? overlayData.tags : [],
                                        parentIndex: index,
                                        parentLabel: displayLabel,
                                        id: elementId,
                                        boost: 0.8
                                    });
                                } catch (overlayError) {
                                    console.warn(`Error processing overlay at index ${overlayIndex}:`, overlayError);
                                }
                            });
                        } catch (overlaysError) {
                            console.warn(`Error accessing overlays for panorama at index ${index}:`, overlaysError);
                        }
                    } catch (error) {
                        console.warn(`Error processing item at index ${index}:`, error);
                    }
                });
                
                // Create Fuse index with appropriate configuration
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

        // Highlight matching text
        const highlightMatch = (text, term) => {
            if (!text || !term) return text || '';
            try {
                const regex = new RegExp(`(${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
                return text.replace(regex, '<mark>$1</mark>');
            } catch (e) {
                return text;
            }
        };
        
        // Get icon HTML based on element type
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
            return icons[type] || icons['Element'];
        };

        // Process search results: group and sort by type
        const groupAndSortResults = (matches) => {
            const grouped = matches.reduce((acc, match) => {
                const type = match.item.type;
                if (!acc[type]) acc[type] = [];
                acc[type].push(match);
                return acc;
            }, {});
            Object.keys(grouped).forEach(type => {
                grouped[type].sort((a, b) => a.item.label.localeCompare(b.item.label));
            });
            return grouped;
        };

        // Main search function
        const performSearch = () => {
            const searchInput = searchContainer.querySelector('#tourSearch');
            const searchTerm = searchInput.value.trim();
            const clearButton = searchContainer.querySelector('.clear-button');
            const searchIcon = searchContainer.querySelector('.search-icon');
            const resultsList = searchContainer.querySelector('.results-section');
            const noResults = searchContainer.querySelector('.no-results');
            const resultsContainer = searchContainer.querySelector('.search-results');

            // Update button visibility based on search term
            if (searchTerm.length > 0) {
                clearButton.classList.add('visible');
                searchIcon.style.opacity = '0';
            } else {
                clearButton.classList.remove('visible');
                searchIcon.style.opacity = '1';
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
                // Perform search
                let matches;
                if (searchTerm === '*') {
                    // Wildcard search shows all items
                    matches = fuse._docs.map((item, index) => ({
                        item,
                        score: 0,
                        refIndex: index
                    }));
                } else {
                    // Process and perform fuzzy search
                    const processedTerm = _preprocessSearchTerm(searchTerm);
                    matches = (typeof processedTerm === 'string' && processedTerm.startsWith('=')) 
                        ? fuse.search({ $or: [{ label: processedTerm }] })
                        : fuse.search(processedTerm);
                }
                
                // Handle no results case
                if (!matches.length) {
                    resultsList.style.display = 'none';
                    noResults.style.display = 'flex';
                    return;
                }
                
                // Display results
                resultsList.style.display = 'block';
                noResults.style.display = 'none';
                
                // Group and sort results
                const groupedResults = groupAndSortResults(matches);

                // Apply type filtering
                if (_config.filter.typeFilter?.mode === "whitelist" && _config.filter.typeFilter?.allowedTypes?.length > 0) {
                    // Only keep allowed result types
                    Object.keys(groupedResults).forEach(type => {
                        if (!_config.filter.typeFilter.allowedTypes.includes(type)) {
                            delete groupedResults[type];
                        }
                    });
                } else if (_config.filter.typeFilter?.mode === "blacklist" && _config.filter.typeFilter?.blacklistedTypes?.length > 0) {
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
                        
                        // Show parent info for child elements if configured to do so
                        const parentInfo = (result.item.type !== 'Panorama' && result.item.parentLabel && 
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
                            if (result.item.type === 'Panorama') {
                                // Direct navigation for panoramas
                                tour.mainPlayList.set('selectedIndex', result.item.index);
                            } else if (result.item.parentIndex !== undefined) {
                                // For child elements, navigate to parent panorama first
                                tour.mainPlayList.set('selectedIndex', result.item.parentIndex);
                                
                                // Then trigger the element with retry logic
                                if (result.item.id) {
                                    _triggerElement(tour, result.item.id);
                                }
                            }
                            
                            // Clear search input
                            searchInput.value = '';
                            searchInput.focus();
                            
                            // Auto-hide based on configuration
                            const isMobile = window.innerWidth <= _config.mobileBreakpoint;
                            if ((isMobile && _config.autoHide.mobile) ||
                                (!isMobile && _config.autoHide.desktop)) {
                                _toggleSearch(false);
                            }
                        });
                        
                        // Add to group
                        groupEl.appendChild(resultItem);
                    });
                    
                    // Add group to results list
                    resultsList.appendChild(groupEl);
                });
            } catch (error) {
                console.warn('Search error:', error);
                // Show error message in results
                resultsList.innerHTML = `
                    <div class="search-error">
                        <p>An error occurred while searching. Please try again.</p>
                    </div>
                `;
            }
        };

        // Set up keyboard navigation
        const keyboardManager = {
            init(searchContainer, searchInput, performSearch) {
                let selectedIndex = -1;
                let resultItems = [];
                const updateSelection = (newIndex) => {
                    resultItems = searchContainer.querySelectorAll('.result-item');
                    if (!resultItems.length) return;
                    if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
                        resultItems[selectedIndex].classList.remove('selected');
                        resultItems[selectedIndex].setAttribute('aria-selected', 'false');
                    }
                    selectedIndex = newIndex;
                    if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
                        const selectedItem = resultItems[selectedIndex];
                        selectedItem.classList.add('selected');
                        selectedItem.setAttribute('aria-selected', 'true');
                        selectedItem.scrollIntoView({ block: 'nearest' });
                        selectedItem.focus();
                    } else {
                        searchInput.focus();
                    }
                };
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        _toggleSearch(true);
                    }
                    if (!searchContainer.classList.contains('visible')) return;
                    switch (e.key) {
                        case 'Escape':
                            e.preventDefault();
                            searchInput.value = '';
                            performSearch();
                            selectedIndex = -1;
                            break;
                        case 'ArrowDown':
                            e.preventDefault();
                            updateSelection(Math.min(selectedIndex + 1, resultItems.length - 1));
                            break;
                        case 'ArrowUp':
                            e.preventDefault();
                            updateSelection(Math.max(selectedIndex - 1, -1));
                            if (selectedIndex === -1) searchInput.focus();
                            break;
                        case 'Enter':
                            e.preventDefault();
                            if (selectedIndex >= 0 && selectedIndex < resultItems.length)
                                resultItems[selectedIndex].click();
                            break;
                    }
                });
                searchInput.addEventListener('keyup', _debounce(() => {
                    selectedIndex = -1;
                }, 200));
                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        resultItems = searchContainer.querySelectorAll('.result-item');
                        if (resultItems.length > 0) resultItems[0].click();
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
        searchInput.addEventListener('input', _debounce(performSearch, 100));
        
        // Bind clear button
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                searchInput.value = '';
                performSearch();
                searchInput.focus();
            });
        }
        
        // Bind search icon for wildcard search
        const searchIcon = searchContainer.querySelector('.search-icon');
        if (searchIcon) {
            searchIcon.style.cursor = 'pointer';
            searchIcon.addEventListener('click', () => {
                searchInput.value = '*';
                performSearch();
            });
        }
        
        // Set up keyboard navigation
        keyboardManager.init(searchContainer, searchInput, performSearch);

        // Mark initialization as complete
        window.searchListInitialized = true;
        window.searchListInitiinitialized = true;
        _initialized = true;
        console.log('Enhanced search initialized successfully');
        
        // Apply window resize handler
        window.addEventListener('resize', _debounce(() => {
            _applySearchStyling();
        }, 250));
    }

    // Toggle search visibility
    function _toggleSearch(show) {
        const searchContainer = document.getElementById('searchContainer');
        if (!searchContainer) return;
        
        const resultsContainer = searchContainer.querySelector('.search-results');
        const searchInput = searchContainer.querySelector('#tourSearch');
        const clearButton = searchContainer.querySelector('.clear-button');
        const searchIcon = searchContainer.querySelector('.search-icon');
        
        // Show search
        if (show) {
            // Make container visible
            searchContainer.style.display = 'block';
            
            // Adjust position to ensure it's visible in viewport
            const viewportHeight = window.innerHeight;
            const searchContainerRect = searchContainer.getBoundingClientRect();
            const searchContainerTop = searchContainerRect.top;
            const searchContainerHeight = searchContainerRect.height;
            
            // If container would go off-screen, adjust its position
            if (searchContainerTop + searchContainerHeight > viewportHeight) {
                const newTop = Math.max(10, viewportHeight - searchContainerHeight - 20);
                searchContainer.style.top = newTop + 'px';
            }
            
            // Add visible class and focus input on next frame
            requestAnimationFrame(() => {
                searchContainer.classList.add('visible');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.dispatchEvent(new Event('input'));
                }
            });
        } else {
            // Hide search
            searchContainer.classList.remove('visible');
            if (resultsContainer) resultsContainer.classList.remove('visible');
            
            // Clean up after animation
            setTimeout(() => {
                searchContainer.style.display = 'none';
                if (searchInput) searchInput.value = '';
                if (clearButton) clearButton.classList.remove('visible');
                if (searchIcon) searchIcon.style.opacity = '1';
            }, 200);
        }
    }

    // PUBLIC API
    return {
        // Initialize search functionality
        initializeSearch: function(tour) {
            if (!tour) {
                console.error('Tour instance is required for initialization');
                return;
            }
            _initializeSearch(tour);
        },
        
        // Toggle search visibility
        toggleSearch: function(show) {
            _toggleSearch(show);
        },
        
        // Update configuration
        updateConfig: function(newConfig) {
            // Deep merge the new config with the existing config
            function deepMerge(target, source) {
                for (const key in source) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        if (!target[key]) Object.assign(target, { [key]: {} });
                        deepMerge(target[key], source[key]);
                    } else {
                        Object.assign(target, { [key]: source[key] });
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
            
            return _config;
        },
        
        // Get current config (clone to prevent direct modification)
        getConfig: function() {
            return JSON.parse(JSON.stringify(_config));
        },
        
        // Utility functions
        debounce: _debounce,
        getElementType: _getElementType,
        triggerElement: _triggerElement
    };
})();

// Make search available globally
window.searchFunctions = window.tourSearchFunctions;