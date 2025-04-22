/**
 * Search Pro Settings Schema
 * 
 * Defines the complete schema for search plugin settings including:
 * - Default values
 * - UI representation information
 * - Validation rules
 * - Grouping structure
 */

const SETTINGS_SCHEMA = {
    // Schema metadata
    version: '2.0.0', // Updated schema version
    
    // Previous versions for migration mapping
    previousVersions: ['1.0.0'],
    
    // Schema changes between versions for migration
    versionChanges: {
        '1.0.0': {
            addedPaths: [
                'theme.typography',
                'appearance.searchWidth',
                'appearance.searchResults.maxHeight',
                'position.preset',
                'position.offsets'
            ],
            transformPaths: {
                // Define any path transformations like:
                // 'old.path': 'new.path'
            },
            removedPaths: [
                // List paths that were removed
            ]
        }
    },
    
    // Default values for all configurable settings
    defaults: {
        // General settings
        autoHide: {
            mobile: false,
            desktop: true
        },
        mobileBreakpoint: 768,
        minSearchChars: 2,
        showTagsInResults: true,
        
        // Position settings
        position: {
            preset: 'top-right', // Can be 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center-top', or 'custom'
            offsets: {
                top: 70,
                left: null,
                right: 70,
                bottom: null
            }
        },
        
        // Display settings
        display: {
            showGroupHeaders: true,
            showGroupCount: true,
            showIconsInResults: true,
            onlySubtitles: false,
            showSubtitlesInResults: true,
            showParentLabel: true,
            showParentInfo: true,
            showParentTags: true,
            showParentType: true,
            hideEmptyLabels: false
        },
        
        // Content inclusion settings
        includeContent: {
            unlabeledWithSubtitles: true,
            unlabeledWithTags: true,
            completelyBlank: false,
            elements: {
                includeOverlays: true,
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
        
        // Filtering options
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
        
        // Fallback label logic
        useAsLabel: {
            subtitles: true,
            tags: true,
            elementType: true,
            parentWithType: true,
            customText: '[Unnamed Item]'
        },
        
        // Appearance settings
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
                },
                maxHeight: 500 // NEW: Add default max height
            },
            colors: {
                searchBackground: '#ffffff',
                searchText: '#1a1a1a',
                placeholderText: '#94a3b8',
                searchIcon: '#94a3b8',
                clearIcon: '#94a3b8',
                resultsBackground: '#ffffff',
                groupHeaderColor: '#20293A',
                groupCountColor: '#94a3b8',
                resultHover: '#f0f0f0',
                resultBorderLeft: '#3b82f6',
                resultText: '#1e293b',
                resultSubtitle: '#64748b',
                resultIconColor: '#6e85f7',
                resultSubtextColor: '#64748b'
            },
            searchWidth: 350 // NEW: Add default search width
        },
        
        // Search bar settings
        searchBar: {
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
        },
        
        // Display labels for group headers
        displayLabels: {
            Panorama: 'Panorama',
            Hotspot: 'Hotspot',
            Polygon: 'Polygon',
            Video: 'Video',
            Webframe: 'Webframe',
            Image: 'Image',
            Text: 'Text',
            ProjectedImage: 'Projected Image',
            Element: 'Element',
            Container: 'Container'
        },
        
        // Theme settings
        theme: {
            useDarkMode: null,
            useSystemPreference: true,
            contrastMode: 'normal',
            customClass: '',
            animation: {
                speed: 'normal',
                type: 'fade'
            },
            typography: { // NEW: Add typography settings
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: 16,
                letterSpacing: 0
            }
        },
        
        // Element triggering settings
        elementTriggering: {
            initialDelay: 300,
            maxRetries: 3,
            retryInterval: 300,
            maxRetryInterval: 1000,
            baseRetryInterval: 300
        }
    },
    
    // UI representation for settings
    ui: {
        groups: [
            {
                id: 'general',
                label: 'General',
                icon: 'settings',
                settings: [
                    {
                        path: 'autoHide.mobile',
                        label: 'Auto-hide on Mobile',
                        type: 'boolean',
                        description: 'Automatically hide search after selecting a result (mobile)'
                    },
                    {
                        path: 'autoHide.desktop',
                        label: 'Auto-hide on Desktop',
                        type: 'boolean',
                        description: 'Automatically hide search after selecting a result (desktop)'
                    },
                    {
                        path: 'minSearchChars',
                        label: 'Minimum Search Characters',
                        type: 'number',
                        min: 1,
                        max: 5,
                        description: 'Minimum number of characters required to start searching'
                    },
                    {
                        path: 'mobileBreakpoint',
                        label: 'Mobile Breakpoint',
                        type: 'number',
                        min: 320,
                        max: 1200,
                        description: 'Screen width (in pixels) below which mobile layout is used'
                    }
                ]
            },
            {
                id: 'appearance',
                label: 'Appearance',
                icon: 'palette',
                settings: [
                    // NEW: Theme toggle dropdown
                    {
                        path: 'theme.useDarkMode',
                        label: 'Theme Mode',
                        type: 'select',
                        options: [
                            { value: null, label: 'Auto (System Preference)' },
                            { value: true, label: 'Dark Mode' },
                            { value: false, label: 'Light Mode' }
                        ],
                        description: 'Choose the theme mode for the search interface'
                    },
                    // Add placeholder text control
                    {
                        path: 'searchBar.placeholder',
                        label: 'Search Field Placeholder',
                        type: 'text',
                        description: 'Text that appears in the search bar before a user types'
                    },
                    // NEW: Typography settings
                    {
                        path: 'theme.typography.fontFamily',
                        label: 'Font Family',
                        type: 'select',
                        options: [
                            { value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', label: 'System Default' },
                            { value: 'Arial, sans-serif', label: 'Arial' },
                            { value: '"Helvetica Neue", Helvetica, sans-serif', label: 'Helvetica' },
                            { value: 'Georgia, serif', label: 'Georgia' },
                            { value: '"Times New Roman", Times, serif', label: 'Times New Roman' },
                            { value: 'Verdana, sans-serif', label: 'Verdana' },
                            { value: 'Tahoma, Geneva, sans-serif', label: 'Tahoma' }
                        ],
                        description: 'Font family for search interface text'
                    },
                    {
                        path: 'theme.typography.fontSize',
                        label: 'Font Size',
                        type: 'number',
                        min: 12,
                        max: 24,
                        description: 'Base font size in pixels'
                    },
                    {
                        path: 'theme.typography.letterSpacing',
                        label: 'Letter Spacing',
                        type: 'number',
                        min: -1,
                        max: 2,
                        step: 0.1,
                        description: 'Letter spacing in pixels'
                    },
                    // NEW: Search width
                    {
                        path: 'appearance.searchWidth',
                        label: 'Search Bar Width',
                        type: 'number',
                        min: 200,
                        max: 800,
                        description: 'Width of the search bar in pixels (desktop only)'
                    },
                    // NEW: Results panel max height
                    {
                        path: 'appearance.searchResults.maxHeight',
                        label: 'Results Panel Max Height',
                        type: 'number',
                        min: 200,
                        max: 1000,
                        description: 'Maximum height of the results panel in pixels'
                    },
                    // Add border radius sections
                    {
                        type: 'section',
                        label: 'Search Field Border Radius'
                    },
                    {
                        path: 'appearance.searchField.borderRadius.topLeft',
                        label: 'Top Left Radius',
                        type: 'number',
                        min: 0,
                        max: 50,
                        description: 'Top-left corner radius for the search field (px)'
                    },
                    {
                        path: 'appearance.searchField.borderRadius.topRight',
                        label: 'Top Right Radius',
                        type: 'number',
                        min: 0,
                        max: 50
                    },
                    {
                        path: 'appearance.searchField.borderRadius.bottomRight',
                        label: 'Bottom Right Radius',
                        type: 'number',
                        min: 0,
                        max: 50
                    },
                    {
                        path: 'appearance.searchField.borderRadius.bottomLeft',
                        label: 'Bottom Left Radius',
                        type: 'number',
                        min: 0,
                        max: 50
                    },
                    {
                        type: 'section',
                        label: 'Results Panel Border Radius'
                    },
                    {
                        path: 'appearance.searchResults.borderRadius.topLeft',
                        label: 'Top Left Radius',
                        type: 'number',
                        min: 0,
                        max: 50,
                        description: 'Top-left corner radius for the results panel'
                    },
                    {
                        path: 'appearance.searchResults.borderRadius.topRight',
                        label: 'Top Right Radius',
                        type: 'number',
                        min: 0,
                        max: 50
                    },
                    {
                        path: 'appearance.searchResults.borderRadius.bottomRight',
                        label: 'Bottom Right Radius',
                        type: 'number',
                        min: 0,
                        max: 50
                    },
                    {
                        path: 'appearance.searchResults.borderRadius.bottomLeft',
                        label: 'Bottom Left Radius',
                        type: 'number',
                        min: 0,
                        max: 50
                    },
                    // Existing color settings
                    {
                        path: 'appearance.colors.searchBackground',
                        label: 'Search Background Color',
                        type: 'color',
                        description: 'Background color of the search field'
                    },
                    {
                        path: 'appearance.colors.searchText',
                        label: 'Search Text Color',
                        type: 'color',
                        description: 'Text color in the search field'
                    },
                    {
                        path: 'appearance.colors.resultsBackground',
                        label: 'Results Background Color',
                        type: 'color',
                        description: 'Background color of the search results container'
                    },
                    {
                        path: 'appearance.colors.resultHover',
                        label: 'Result Hover Color',
                        type: 'color',
                        description: 'Background color when hovering over a result item'
                    },
                    {
                        path: 'appearance.colors.resultBorderLeft',
                        label: 'Result Accent Color',
                        type: 'color',
                        description: 'Left border color for result items on hover'
                    },
                    {
                        path: 'appearance.colors.resultText',
                        label: 'Result Text Color',
                        type: 'color',
                        description: 'Color of result item text'
                    }
                ]
            },
            {
                id: 'position',
                label: 'Position',
                icon: 'move',
                settings: [
                    {
                        path: 'position.preset',
                        label: 'Position Preset',
                        type: 'select',
                        options: [
                            { value: 'top-left', label: 'Top Left' },
                            { value: 'top-right', label: 'Top Right' },
                            { value: 'bottom-left', label: 'Bottom Left' },
                            { value: 'bottom-right', label: 'Bottom Right' },
                            { value: 'center-top', label: 'Center Top' },
                            { value: 'custom', label: 'Manual (Custom)' }
                        ],
                        description: 'Choose a predefined position or define custom offsets'
                    },
                    {
                        path: 'position.offsets.top',
                        label: 'Top Offset (px)',
                        type: 'number',
                        min: 0,
                        max: 1000,
                        description: 'Distance from top edge (applies only in custom mode)',
                        dependsOn: {
                            path: 'position.preset',
                            value: 'custom'
                        }
                    },
                    {
                        path: 'position.offsets.left',
                        label: 'Left Offset (px)',
                        type: 'number',
                        min: 0,
                        max: 1000,
                        description: 'Distance from left edge (applies only in custom mode)',
                        dependsOn: {
                            path: 'position.preset',
                            value: 'custom'
                        }
                    },
                    {
                        path: 'position.offsets.right',
                        label: 'Right Offset (px)',
                        type: 'number',
                        min: 0,
                        max: 1000,
                        description: 'Distance from right edge (applies only in custom mode)',
                        dependsOn: {
                            path: 'position.preset',
                            value: 'custom'
                        }
                    },
                    {
                        path: 'position.offsets.bottom',
                        label: 'Bottom Offset (px)',
                        type: 'number',
                        min: 0,
                        max: 1000,
                        description: 'Distance from bottom edge (applies only in custom mode)',
                        dependsOn: {
                            path: 'position.preset',
                            value: 'custom'
                        }
                    }
                ]
            },
            {
                id: 'display',
                label: 'Display',
                icon: 'eye',
                settings: [
                    {
                        path: 'display.showGroupHeaders',
                        label: 'Show Group Headers',
                        type: 'boolean',
                        description: 'Display headers for each result group (Panorama, Hotspot, etc.)'
                    },
                    {
                        path: 'display.showGroupCount',
                        label: 'Show Group Count',
                        type: 'boolean',
                        description: 'Display the count of results in each group'
                    },
                    {
                        path: 'display.showIconsInResults',
                        label: 'Show Icons in Results',
                        type: 'boolean',
                        description: 'Display icons next to search results'
                    },
                    {
                        path: 'display.showSubtitlesInResults',
                        label: 'Show Subtitles in Results',
                        type: 'boolean',
                        description: 'Display subtitle text in search results'
                    },
                    {
                        path: 'showTagsInResults',
                        label: 'Show Tags in Results',
                        type: 'boolean',
                        description: 'Display tags in search results when available'
                    },
                    {
                        path: 'display.onlySubtitles',
                        label: 'Only Show Subtitles',
                        type: 'boolean',
                        description: 'Use subtitles instead of labels when available'
                    },
                    {
                        path: 'display.showTagsInResults',
                        label: 'Show Tags in Results',
                        type: 'boolean'
                    },
                    {
                        path: 'display.showSubtitlesInResults',
                        label: 'Show Subtitles',
                        type: 'boolean'
                    },
                    {
                        path: 'display.onlySubtitles',
                        label: 'Only Show Subtitles',
                        type: 'boolean'
                    },
                    {
                        path: 'display.showParentLabel',
                        label: 'Show Parent Label',
                        type: 'boolean'
                    },
                    {
                        path: 'display.showParentInfo',
                        label: 'Show Parent Info',
                        type: 'boolean'
                    },
                    {
                        path: 'display.showParentTags',
                        label: 'Show Parent Tags',
                        type: 'boolean'
                    },
                    {
                        path: 'display.showParentType',
                        label: 'Show Parent Type',
                        type: 'boolean'
                    },
                    {
                        path: 'display.showIconsInResults',
                        label: 'Show Icons in Results',
                        type: 'boolean'
                    },
                    {
                        path: 'display.showGroupHeaders',
                        label: 'Show Category Headers',
                        type: 'boolean'
                    },
                    {
                        path: 'display.showGroupCount',
                        label: 'Show Results Count',
                        type: 'boolean'
                    },
                    {
                        path: 'display.hideEmptyLabels',
                        label: 'Hide Empty Labels',
                        type: 'boolean'
                    }
                ]
            },
            {
                id: 'content',
                label: 'Content',
                icon: 'layers',
                settings: [
                    {
                        path: 'includeContent.unlabeledWithSubtitles',
                        label: 'Include Unlabeled with Subtitles',
                        type: 'boolean',
                        description: 'Include items without labels that have subtitles'
                    },
                    {
                        path: 'includeContent.unlabeledWithTags',
                        label: 'Include Unlabeled with Tags',
                        type: 'boolean',
                        description: 'Include items without labels that have tags'
                    },
                    {
                        path: 'includeContent.completelyBlank',
                        label: 'Include Completely Blank',
                        type: 'boolean',
                        description: 'Include items without labels, subtitles, or tags'
                    },
                    {
                        path: 'includeContent.elements.skipEmptyLabels',
                        label: 'Skip Empty Labels',
                        type: 'boolean',
                        description: 'Skip elements with empty labels'
                    },
                    {
                        path: 'includeContent.elements.minLabelLength',
                        label: 'Minimum Label Length',
                        type: 'number',
                        min: 0,
                        max: 10,
                        description: 'Minimum required length for element labels to be included'
                    },
                    {
                        path: 'includeContent.elements.includeOverlays',
                        label: 'Include Overlays',
                        type: 'boolean',
                        description: 'Include all overlay elements in search results'
                    },
                    {
                        path: 'includeContent.elements.includeHotspots',
                        label: 'Include Hotspots',
                        type: 'boolean',
                        description: 'Include hotspot elements (clickable triggers)'
                    },
                    {
                        path: 'includeContent.elements.includePolygons',
                        label: 'Include Polygons',
                        type: 'boolean',
                        description: 'Include polygon overlays in the search index'
                    },
                    {
                        path: 'includeContent.elements.includeVideos',
                        label: 'Include Videos',
                        type: 'boolean',
                        description: 'Include embedded videos in the search results'
                    },
                    {
                        path: 'includeContent.elements.includeWebframes',
                        label: 'Include Webframes',
                        type: 'boolean',
                        description: 'Include iFrame-based web overlays'
                    },
                    {
                        path: 'includeContent.elements.includeImages',
                        label: 'Include Images',
                        type: 'boolean',
                        description: 'Include still image overlays'
                    },
                    {
                        path: 'includeContent.elements.includeText',
                        label: 'Include Text Elements',
                        type: 'boolean',
                        description: 'Include rich text overlays'
                    },
                    {
                        path: 'includeContent.elements.includeProjectedImages',
                        label: 'Include Projected Images',
                        type: 'boolean',
                        description: 'Include 3D projected image overlays'
                    },
                    {
                        path: 'includeContent.elements.includeElements',
                        label: 'Include Generic Elements',
                        type: 'boolean',
                        description: 'Include other element types not listed above'
                    }
                ]
            },
            {
                id: 'filtering',
                label: 'Filtering',
                icon: 'filter',
                settings: [
                    // 🧹 Content Filtering
                    {
                        type: 'section',
                        label: 'Content Filtering'
                    },
                    {
                        path: 'filter.mode',
                        label: 'Filter Mode',
                        type: 'select',
                        options: [
                            { value: 'none', label: 'None' },
                            { value: 'whitelist', label: 'Whitelist' },
                            { value: 'blacklist', label: 'Blacklist' }
                        ],
                        description: 'Filter items based on labels and subtitles'
                    },
                    {
                        path: 'filter.allowedValues',
                        label: 'Allowed Labels/Subtitles',
                        type: 'textarea',
                        description: 'Comma-separated labels or subtitles to include (only used in Whitelist mode)',
                        dependsOn: {
                            path: 'filter.mode',
                            value: 'whitelist'
                        }
                    },
                    {
                        path: 'filter.blacklistedValues',
                        label: 'Blacklisted Labels/Subtitles',
                        type: 'textarea',
                        description: 'Comma-separated labels or subtitles to exclude (Blacklist mode only)',
                        dependsOn: {
                            path: 'filter.mode',
                            value: 'blacklist'
                        }
                    },

                    // 🏷️ Tag Filtering
                    {
                        type: 'section',
                        label: 'Tag Filtering'
                    },
                    {
                        path: 'filter.tagFiltering.mode',
                        label: 'Tag Filter Mode',
                        type: 'select',
                        options: [
                            { value: 'none', label: 'None' },
                            { value: 'whitelist', label: 'Whitelist' },
                            { value: 'blacklist', label: 'Blacklist' }
                        ],
                        description: 'Filter based on tag values (case-insensitive)'
                    },
                    {
                        path: 'filter.tagFiltering.allowedTags',
                        label: 'Allowed Tags',
                        type: 'textarea',
                        description: 'Comma-separated list of tags to allow'
                    },
                    {
                        path: 'filter.tagFiltering.blacklistedTags',
                        label: 'Blacklisted Tags',
                        type: 'textarea',
                        description: 'Comma-separated list of tags to exclude'
                    },

                    // 🧱 Element Type Filtering
                    {
                        type: 'section',
                        label: 'Element Type Filtering'
                    },
                    {
                        path: 'filter.elementTypes.mode',
                        label: 'Type Filter Mode',
                        type: 'select',
                        options: [
                            { value: 'none', label: 'None' },
                            { value: 'whitelist', label: 'Whitelist' },
                            { value: 'blacklist', label: 'Blacklist' }
                        ],
                        description: 'Filter by type of element (Hotspot, Polygon, etc.)'
                    },
                    {
                        path: 'filter.elementTypes.allowedTypes',
                        label: 'Allowed Types',
                        type: 'textarea',
                        description: 'Comma-separated list of types to include (e.g., Hotspot, Polygon)'
                    },
                    {
                        path: 'filter.elementTypes.blacklistedTypes',
                        label: 'Blacklisted Types',
                        type: 'textarea',
                        description: 'Comma-separated list of types to exclude'
                    },

                    // 🎯 Media Index Filtering
                    {
                        type: 'section',
                        label: 'Media Index Filtering'
                    },
                    {
                        path: 'filter.allowedMediaIndexes',
                        label: 'Allowed Media Indexes',
                        type: 'textarea',
                        description: 'Comma-separated scene indexes to include (Whitelist)'
                    },
                    {
                        path: 'filter.blacklistedMediaIndexes',
                        label: 'Blacklisted Media Indexes',
                        type: 'textarea',
                        description: 'Comma-separated scene indexes to exclude (Blacklist)'
                    }
                ]
            },
            {
                id: 'fallbacks',
                label: 'Fallbacks',
                icon: 'lifebuoy',
                settings: [
                    {
                        type: 'section',
                        label: 'Label Fallback Strategy'
                    },
                    {
                        path: 'useAsLabel.subtitles',
                        label: 'Use Subtitles as Fallback',
                        type: 'boolean',
                        description: 'Use the item\'s subtitle as label if no label is defined'
                    },
                    {
                        path: 'useAsLabel.tags',
                        label: 'Use Tags as Fallback',
                        type: 'boolean',
                        description: 'Use the first tag as label if no label or subtitle exists'
                    },
                    {
                        path: 'useAsLabel.elementType',
                        label: 'Use Element Type as Fallback',
                        type: 'boolean',
                        description: 'Use the overlay or media type (e.g. Hotspot, Image) as label if others are missing'
                    },
                    {
                        path: 'useAsLabel.parentWithType',
                        label: 'Use Parent Name with Type',
                        type: 'boolean',
                        description: 'Combine parent scene name and element type as a fallback (e.g., "Room 3 – Hotspot")'
                    },
                    {
                        path: 'useAsLabel.customText',
                        label: 'Custom Fallback Text',
                        type: 'text',
                        description: 'Default fallback when no label, subtitle, tag, or type is found'
                    }
                ]
            },
            {
                id: 'advanced',
                label: 'Advanced',
                icon: 'code',
                settings: [
                    {
                        path: 'elementTriggering.maxRetries',
                        label: 'Max Click Retries',
                        type: 'number',
                        min: 1,
                        max: 10,
                        description: 'Maximum number of retries when clicking an element'
                    },
                    {
                        path: 'elementTriggering.initialDelay',
                        label: 'Initial Click Delay',
                        type: 'number',
                        min: 0,
                        max: 1000,
                        description: 'Initial delay before clicking an element (ms)'
                    }
                ]
            },
            {
                id: 'management',
                label: 'Management',
                icon: 'database',
                settings: []
            }
        ]
    },
    
    // Validation rules for settings
    validation: {
        // Validate specific paths with custom validators
        validators: {
            'minSearchChars': (value) => {
                return typeof value === 'number' && value >= 1 && value <= 10;
            },
            'appearance.searchWidth': (value) => {
                return typeof value === 'number' && value >= 100 && value <= 1000;
            },
            'appearance.searchResults.maxHeight': (value) => {
                return typeof value === 'number' && value >= 100 && value <= 2000;
            },
            'mobileBreakpoint': (value) => {
                return typeof value === 'number' && value >= 300 && value <= 1200;
            },
            'theme.typography.fontSize': (value) => {
                return typeof value === 'number' && value >= 8 && value <= 30;
            },
            'theme.typography.letterSpacing': (value) => {
                return typeof value === 'number' && value >= -5 && value <= 10;
            },
            'position.offsets.top': (value) => {
                return value === null || (typeof value === 'number' && value >= 0 && value <= 1000);
            },
            'position.offsets.left': (value) => {
                return value === null || (typeof value === 'number' && value >= 0 && value <= 1000);
            },
            'position.offsets.right': (value) => {
                return value === null || (typeof value === 'number' && value >= 0 && value <= 1000);
            },
            'position.offsets.bottom': (value) => {
                return value === null || (typeof value === 'number' && value >= 0 && value <= 1000);
            },
            'includeContent.elements.minLabelLength': (value) => typeof value === 'number' && value >= 0 && value <= 20
        },
        
        // Type validators for different setting types
        typeValidators: {
            'boolean': (value) => typeof value === 'boolean',
            'number': (value) => typeof value === 'number' && !isNaN(value),
            'string': (value) => typeof value === 'string',
            'color': (value) => typeof value === 'string' && /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(value),
            'array': (value) => Array.isArray(value),
            'select': (value, setting) => {
                // Special handling for null value in select
                if (value === null && setting.options && setting.options.some(option => option.value === null)) {
                    return true;
                }
                
                // If the setting has an enum property, validate against it
                if (setting.enum) {
                    return setting.enum.includes(value);
                }
                
                // Otherwise, just check if there's a matching option
                if (setting.options) {
                    return setting.options.some(option => option.value === value);
                }
                
                return true;
            }
        },
        
        // Dependency rules for conditional validation
        dependencies: {
            'filter.allowedValues': { 
                dependsOn: 'filter.mode', 
                validWhen: (mode) => mode === 'whitelist' 
            },
            'filter.blacklistedValues': { 
                dependsOn: 'filter.mode', 
                validWhen: (mode) => mode === 'blacklist' 
            },
            'filter.elementTypes.allowedTypes': { 
                dependsOn: 'filter.elementTypes.mode', 
                validWhen: (mode) => mode === 'whitelist' 
            },
            'filter.elementTypes.blacklistedTypes': { 
                dependsOn: 'filter.elementTypes.mode', 
                validWhen: (mode) => mode === 'blacklist' 
            },
            'filter.tagFiltering.allowedTags': { 
                dependsOn: 'filter.tagFiltering.mode', 
                validWhen: (mode) => mode === 'whitelist' 
            },
            'filter.tagFiltering.blacklistedTags': { 
                dependsOn: 'filter.tagFiltering.mode', 
                validWhen: (mode) => mode === 'blacklist' 
            },
            'theme.typography.fontFamily': {
                dependsOn: 'theme.typography',
                validWhen: (typography) => typography !== null
            },
            'theme.typography.fontSize': {
                dependsOn: 'theme.typography',
                validWhen: (typography) => typography !== null
            },
            'theme.typography.letterSpacing': {
                dependsOn: 'theme.typography',
                validWhen: (typography) => typography !== null
            },
            'position.offsets.top': { 
                dependsOn: 'position.preset', 
                validWhen: (preset) => preset === 'custom' 
            },
            'position.offsets.left': { 
                dependsOn: 'position.preset', 
                validWhen: (preset) => preset === 'custom' 
            },
            'position.offsets.right': { 
                dependsOn: 'position.preset', 
                validWhen: (preset) => preset === 'custom' 
            },
            'position.offsets.bottom': { 
                dependsOn: 'position.preset', 
                validWhen: (preset) => preset === 'custom' 
            }
        }
    }
};

/**
 * Get the full default settings object
 * @returns {Object} Default settings
 */
function getDefaultSettings() {
    return JSON.parse(JSON.stringify(SETTINGS_SCHEMA.defaults));
}

/**
 * Get the UI schema for rendering settings controls
 * @returns {Object} UI schema
 */
function getUISchema() {
    return JSON.parse(JSON.stringify(SETTINGS_SCHEMA.ui));
}

/**
 * Get the current schema version
 * @returns {string} Schema version
 */
function getSchemaVersion() {
    return SETTINGS_SCHEMA.version;
}

/**
 * Validate a complete settings object against the schema
 * @param {Object} settings Settings object to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
function validateSettings(settings) {
    const result = {
        isValid: true,
        errors: []
    };
    
    // Extract all settings from the UI schema
    const allSettings = [];
    SETTINGS_SCHEMA.ui.groups.forEach(group => {
        group.settings.forEach(setting => {
            allSettings.push(setting);
        });
    });
    
    // Validate each setting
    allSettings.forEach(setting => {
        const path = setting.path;
        const value = getValueFromPath(settings, path);
        
        // Skip if nullable and null/undefined
        if (setting.nullable && (value === null || value === undefined)) {
            return;
        }
        
        // Check if this field should be validated based on dependencies
        if (SETTINGS_SCHEMA.validation.dependencies && SETTINGS_SCHEMA.validation.dependencies[path]) {
            const dependency = SETTINGS_SCHEMA.validation.dependencies[path];
            const dependentValue = getValueFromPath(settings, dependency.dependsOn);
            
            // Skip validation if the dependent value doesn't meet the condition
            if (!dependency.validWhen(dependentValue)) {
                return;
            }
        }
        
        // Check custom validator if exists
        if (SETTINGS_SCHEMA.validation.validators[path]) {
            const isValid = SETTINGS_SCHEMA.validation.validators[path](value);
            if (!isValid) {
                result.isValid = false;
                result.errors.push({
                    path,
                    message: `Invalid value for ${setting.label}`
                });
            }
        }
        
        // Check enum values if present
        if (setting.enum && value !== null && value !== undefined) {
            if (!setting.enum.includes(value)) {
                result.isValid = false;
                result.errors.push({
                    path,
                    message: `Value must be one of: ${setting.enum.join(', ')}`
                });
            }
        }
        
        // Check range values if present
        if (setting.range && value !== null && value !== undefined) {
            const [min, max] = setting.range;
            if (value < min || value > max) {
                result.isValid = false;
                result.errors.push({
                    path,
                    message: `Value must be between ${min} and ${max}`
                });
            }
        }
        
        // Check type validator if exists
        if (setting.type && SETTINGS_SCHEMA.validation.typeValidators[setting.type]) {
            // Only validate if value is not null/undefined or if nullable is false
            if (!setting.nullable || (value !== null && value !== undefined)) {
                const isValid = SETTINGS_SCHEMA.validation.typeValidators[setting.type](value, setting);
                if (!isValid) {
                    result.isValid = false;
                    result.errors.push({
                        path,
                        message: `Type error for ${setting.label}, expected ${setting.type}`
                    });
                }
            }
        }
    });
    
    return result;
}

/**
 * Migrate settings from an older schema version to the current version
 * @param {Object} settings Settings object to migrate
 * @param {string} fromVersion Version of the settings object (defaults to '1.0.0')
 * @returns {Object} Migrated settings object
 */
function migrateSettings(settings, fromVersion = '1.0.0') {
    // If already current version, return as is
    if (fromVersion === SETTINGS_SCHEMA.version) {
        return JSON.parse(JSON.stringify(settings));
    }
    
    // If version not recognized, use basic migration
    if (!SETTINGS_SCHEMA.previousVersions.includes(fromVersion)) {
        console.warn(`Unknown settings version: ${fromVersion}, applying basic migration`);
        return mergeWithDefaults(settings);
    }
    
    // Get the changes needed for this migration
    const versionChanges = SETTINGS_SCHEMA.versionChanges[fromVersion];
    if (!versionChanges) {
        console.warn(`No version changes defined for migration from ${fromVersion}`);
        return mergeWithDefaults(settings);
    }
    
    // Create a deep clone to avoid modifying the input
    let migratedSettings = JSON.parse(JSON.stringify(settings));
    
    // Get current defaults
    const defaults = getDefaultSettings();
    
    // Add new paths from defaults
    if (versionChanges.addedPaths && versionChanges.addedPaths.length > 0) {
        versionChanges.addedPaths.forEach(path => {
            const defaultValue = getValueFromPath(defaults, path);
            
            // Only add if the path doesn't already exist
            if (getValueFromPath(migratedSettings, path) === undefined && defaultValue !== undefined) {
                setValueAtPath(migratedSettings, path, defaultValue);
            }
        });
    }
    
    // Transform paths if needed
    if (versionChanges.transformPaths) {
        Object.entries(versionChanges.transformPaths).forEach(([oldPath, newPath]) => {
            const oldValue = getValueFromPath(migratedSettings, oldPath);
            
            // Only transform if the old path has a value
            if (oldValue !== undefined) {
                setValueAtPath(migratedSettings, newPath, oldValue);
                
                // Remove the old path by finding its parent object and property name
                const oldPathParts = oldPath.split('.');
                const oldProperty = oldPathParts.pop();
                const oldParentPath = oldPathParts.join('.');
                const oldParent = oldParentPath ? getValueFromPath(migratedSettings, oldParentPath) : migratedSettings;
                
                if (oldParent && oldProperty in oldParent) {
                    delete oldParent[oldProperty];
                }
            }
        });
    }
    
    // Remove deprecated paths
    if (versionChanges.removedPaths && versionChanges.removedPaths.length > 0) {
        versionChanges.removedPaths.forEach(path => {
            const pathParts = path.split('.');
            const property = pathParts.pop();
            const parentPath = pathParts.join('.');
            const parent = parentPath ? getValueFromPath(migratedSettings, parentPath) : migratedSettings;
            
            if (parent && property in parent) {
                delete parent[property];
            }
        });
    }
    
    // Ensure all required paths exist by merging with defaults
    return mergeWithDefaults(migratedSettings);
}

/**
 * Merge settings with defaults to ensure all required properties exist
 * @param {Object} settings Settings object to merge with defaults
 * @returns {Object} Merged settings object
 * @private
 */
function mergeWithDefaults(settings) {
    const defaults = getDefaultSettings();
    
    // Helper function to perform a deep merge
    function deepMerge(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    // Create key if it doesn't exist in target
                    if (!target[key] || typeof target[key] !== 'object') {
                        target[key] = {};
                    }
                    deepMerge(target[key], source[key]);
                } else if (target[key] === undefined) {
                    // Only copy if target doesn't have this key
                    target[key] = source[key];
                }
            }
        }
        return target;
    }
    
    // Merge settings with defaults, preserving existing values
    return deepMerge(JSON.parse(JSON.stringify(settings)), defaults);
}

/**
 * Helper function to get a value from an object using a dot-notation path
 * @param {Object} obj Object to retrieve value from
 * @param {string} path Dot-notation path (e.g., 'appearance.colors.searchBackground')
 * @returns {*} Value at the specified path, or undefined if not found
 */
function getValueFromPath(obj, path) {
    if (!obj || !path) return undefined;
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
        if (current === undefined || current === null) {
            return undefined;
        }
        current = current[part];
    }
    
    return current;
}

/**
 * Helper function to set a value in an object using a dot-notation path
 * @param {Object} obj Object to set value in
 * @param {string} path Dot-notation path
 * @param {*} value Value to set
 * @returns {Object} The modified object
 */
function setValueAtPath(obj, path, value) {
    if (!obj || !path) return obj;
    
    const parts = path.split('.');
    let current = obj;
    
    // Navigate to the parent object
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        
        // Create the path if it doesn't exist
        if (!current[part]) {
            current[part] = {};
        }
        
        current = current[part];
    }
    
    // Set the value on the parent object
    current[parts[parts.length - 1]] = value;
    
    return obj;
}

// For CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SETTINGS_SCHEMA,
        getDefaultSettings,
        getUISchema,
        getSchemaVersion,
        validateSettings,
        migrateSettings,
        getValueFromPath,
        setValueAtPath
    };
}

// For ES modules environments
export {
    SETTINGS_SCHEMA,
    getDefaultSettings,
    getUISchema,
    getSchemaVersion,
    validateSettings,
    migrateSettings,
    getValueFromPath,
    setValueAtPath
};