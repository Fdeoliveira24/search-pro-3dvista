/******************************************************
 * ultimate-3dvista-debugger.js
 * Combines debug logic from:
 *   - tour-debuger-v1.js
 *   - tour-debug-4.js
 *   - tour-debug-v5.js
 *   - tour-debug-v6.js
 * into a single unified debug script.
 ******************************************************/

window.tourDebug = (function(){
  // --------------------------------------------------
  // SHARED FILTERS (from v6) - optional toggles
  // --------------------------------------------------
  let filters = {
    showInvisible: false,        // if true, includes overlays that are 'visible=false'
    logOnlyMediaHotspots: false  // if true, logs only hotspots with openable media
  };

  // --------------------------------------------------
  // getElementType / getOverlayAttributes
  // Merged from v5 and v6 - using v6 as final authority
  // --------------------------------------------------
  function getElementType(overlay) {
    if (!overlay) return 'Unknown';

    // If invisible and the user doesn't want to see it, skip
    if (overlay.get('visible') === false && !filters.showInvisible) {
      return 'Hidden'; 
    }

    const className = overlay.get('class');
    const data = overlay.get('data') || {};
    const label = (data.label || '').toLowerCase();

    // Hotspot detection
    if (className === 'HotspotPanoramaOverlay') {
      if (data.trigger === true || label.includes('trigger')) return 'Trigger';
      if (label.includes('button') || data.isButton) return 'Button';
      if (label.includes('polygon')) return 'Polygon';
      if (label.includes('image')) return 'Projected Image';
      if (label.includes('info') || label.includes('text')) return 'Text';
      if (data.hasOpenableMedia && !data.hasPanoramaAction) return 'Hotspot-VideoLauncher';
      return 'Hotspot';
    }

    // Other classes
    switch (className) {
      case 'QuadVideoPanoramaOverlay':
        return 'Video';
      case 'FramePanoramaOverlay':
        if (label.includes('floor') || label.includes('map')) return 'Floorplan';
        return 'Webframe';
      case 'ImagePanoramaOverlay':
        return 'Image';
      default:
        return className || 'Element';
    }
  }

  function getOverlayAttributes(overlay) {
    if (!overlay) return {};
    const data = overlay.get('data') || {};
    const attributeMap = {};

    ['id','class','label','title','subtitle','description'].forEach(prop => {
      const val = overlay.get(prop) || data[prop];
      if (val !== undefined) attributeMap[prop] = val;
    });

    const overlayClass = overlay.get('class');
    if (overlayClass === 'HotspotPanoramaOverlay') {
      attributeMap.hasPanoramaAction = data.hasPanoramaAction;
      attributeMap.hasOpenableMedia = data.hasOpenableMedia;
      attributeMap.targets = data.targets;
    }
    if (overlayClass === 'QuadVideoPanoramaOverlay') {
      attributeMap.videoUrl = data.video?.url;
      attributeMap.videoAutoplay = data.video?.autoplay;
    }
    if (overlayClass === 'FramePanoramaOverlay') {
      attributeMap.url = data.url;
      attributeMap.frameWidth = data.width;
      attributeMap.frameHeight = data.height;
    }

    return attributeMap;
  }

  // --------------------------------------------------
  // toggleFilter (from v6) - let you toggle debug filters
  // --------------------------------------------------
  function toggleFilter(key) {
    if (key in filters) {
      filters[key] = !filters[key];
      console.log(`Filter "${key}" set to`, filters[key]);
    } else {
      console.warn(`Unknown filter: ${key}`);
    }
  }

  // --------------------------------------------------
  // BASIC INSPECTIONS (from v1, v4) 
  // They are very similar, so we’ll unify them into 
  // two separate methods: inspectBasicV1 and inspectBasicV4
  // --------------------------------------------------
  function inspectBasicV1() {
    console.log('=== [tourDebug] BASIC INSPECTION (v1) ===');
    if (!window.tour?.player) {
      console.warn('Tour or player not initialized');
      return;
    }

    try {
      // 1. List all playlists
      const playlists = window.tour.player.getByClassName('PlayList');
      console.log('\n--- All Playlists (v1) ---');
      if (!playlists || playlists.length === 0) {
        console.log('No playlists found.');
      } else {
        playlists.forEach((pl, pIdx) => {
          console.log(`\nPlaylist #${pIdx+1}, ID=${pl.get('id')}, Name=${pl.get('data')?.name||'N/A'}`);
          const items = pl.get('items');
          if (!items || !items.length) {
            console.log('  No items in playlist');
            return;
          }
          items.forEach((item, idx) => {
            const media = item.get('media');
            if (!media) {
              console.log(`  Item ${idx+1}: No media`);
              return;
            }
            const label = media.get('label');
            const subtitle = media.get('subtitle')|| media.get('data')?.subtitle;
            const title = media.get('title')|| media.get('data')?.title;
            console.log(`  Item ${idx+1}:`, {
              id: media.get('id'), label, subtitle, title
            });
          });
        });
      }

      // 2. List containers
      console.log('\n--- All Containers (v1) ---');
      const containers = window.tour.player.getByClassName('Container');
      containers.forEach(c => {
        console.log('Container:', {
          id: c.get('id'),
          label: c.get('data')?.label,
          name: c.get('data')?.name,
          visible: c.get('visible')
        });
      });

      // 3. List hotspots
      console.log('\n--- All Hotspots (v1) ---');
      playlists.forEach((pl) => {
        const items = pl.get('items');
        items.forEach((item, idx) => {
          const media = item.get('media');
          if (!media || media.get('class') !== 'Panorama') return;
          const overlays = media.get('overlays');
          if (!overlays) return;
          console.log(`Panorama "${media.get('data')?.label||idx}":`);
          overlays.forEach(ov => {
            const data = ov.get('data');
            console.log('  Hotspot:', {
              label: data?.label,
              hasPanoramaAction: data?.hasPanoramaAction,
              id: ov.get('id'),
              class: ov.get('class')
            });
          });
        });
      });

      // 4. Inspect player methods
      const player = window.tour.player;
      const protoMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(player))
        .filter(x=>typeof player[x]==='function');
      const directMethods = Object.keys(player)
        .filter(x=>typeof player[x]==='function');
      const allMethods = Array.from(new Set([...protoMethods, ...directMethods]));
      console.log('\nPlayer Methods (v1):', allMethods);

      // Check getMainViewer existence
      if (typeof player.getMainViewer === 'function') {
        console.log('getMainViewer exists (v1).');
      } else {
        console.log('getMainViewer does NOT exist (v1).');
      }

    } catch(e) {
      console.error('Error in inspectBasicV1:', e);
    }
  }

  function inspectBasicV4() {
    console.log('=== [tourDebug] BASIC INSPECTION (v4) ===');
    if (!window.tour?.player) {
      console.warn('Tour or player not initialized');
      return;
    }
    // This is nearly identical to v1, but we keep it separate if you want to see
    // that it was "v4" or do minimal changes for demonstration.
    inspectBasicV1();
  }

  // --------------------------------------------------
  // ENHANCED INSPECTION (from v5)
  // A deeper look that categorizes elements, etc.
  // --------------------------------------------------
  function inspectEnhancedV5() {
    console.log('=== [tourDebug] ENHANCED INSPECTION (v5) ===');
    if (!window.tour?.player) {
      console.warn('Tour/player not initialized');
      return;
    }

    try {
      const player = window.tour.player;
      const playlists = player.getByClassName('PlayList');
      if (!playlists || !playlists.length) {
        console.log('No playlists found (v5).');
        return;
      }

      // Tally of elements
      const elementCounts = {
        Panorama: 0, Hotspot: 0, Polygon: 0, Video: 0, Image: 0,
        'Projected Image': 0, Webframe: 0, Floorplan: 0, Text: 0, Other: 0
      };
      const elementsByType = {
        Panorama: [], Hotspot: [], Polygon: [], Video: [],
        Image: [], 'Projected Image': [], Webframe: [], Floorplan: [],
        Text: [], Other: []
      };

      // Inspect each playlist -> item -> media -> overlays
      playlists.forEach((playlist) => {
        const items = playlist.get('items');
        items.forEach((item) => {
          const media = item.get('media');
          if (!media) return;
          if (media.get('class')==='Panorama') {
            elementCounts.Panorama++;
            elementsByType.Panorama.push({
              id: media.get('id'),
              label: media.get('label') || media.get('data')?.label,
              playlistId: playlist.get('id')
            });

            // Overlays
            const overlays = media.get('overlays')||[];
            overlays.forEach(ov => {
              const etype = getElementType(ov);
              if (!(etype in elementCounts)) {
                elementCounts.Other++;
              } else {
                elementCounts[etype]++;
              }

              const attr = getOverlayAttributes(ov);
              const rec = {
                id: ov.get('id'),
                parentPanorama: media.get('label')||media.get('data')?.label||media.get('id'),
                attributes: attr
              };
              if (etype in elementsByType) {
                elementsByType[etype].push(rec);
              } else {
                elementsByType.Other.push({ ...rec, actualType: etype });
              }

              // If logging only media hotspots
              if (filters.logOnlyMediaHotspots && attr.hasOpenableMedia) {
                console.warn(`[v5] Media Hotspot: ${attr.label || 'Unlabeled'}`, attr);
              }
            });
          }
        });
      });

      console.log('[v5] Element Counts:', elementCounts);
      Object.keys(elementsByType).forEach(type => {
        if (!elementsByType[type].length) return;
        console.log(`\n[v5] ${type} Elements (${elementsByType[type].length}):`);
        elementsByType[type].slice(0,10).forEach((el,i)=>{
          console.log(`  ${i+1}. ${el.id} in ${el.parentPanorama}`);
          console.log('     Attributes:', el.attributes);
        });
        if (elementsByType[type].length>10) {
          console.log(`  ...and ${elementsByType[type].length-10} more items`);
        }
      });

    } catch(e) {
      console.error('Error in inspectEnhancedV5:', e);
    }
  }

  // --------------------------------------------------
  // ENHANCED INSPECTION (from v6) 
  // This is similar to v5 but we keep it separate 
  // so you can see changes (ex: final code from v6).
  // --------------------------------------------------
  function inspectEnhancedV6() {
    console.log('=== [tourDebug] ENHANCED INSPECTION (v6) ===');
    if (!window.tour?.player) {
      console.warn('Tour/player not initialized');
      return;
    }

    const player = window.tour.player;
    const playlists = player.getByClassName('PlayList');
    if (!playlists?.length) {
      console.log('No playlists found (v6).');
      return;
    }

    const elementCounts = {};
    const elementsByType = {};

    // build overlay lists
    playlists.forEach(pl=>{
      const items = pl.get('items');
      items.forEach(item=>{
        const media = item.get('media');
        if (!media || media.get('class')!=='Panorama') return;

        const overlays = media.get('overlays')||[];
        overlays.forEach(ov => {
          const etype = getElementType(ov);
          const attr = getOverlayAttributes(ov);
          if (!elementsByType[etype]) {
            elementsByType[etype] = [];
            elementCounts[etype] = 0;
          }
          elementCounts[etype]++;
          elementsByType[etype].push({
            id: ov.get('id'),
            label: attr.label || 'Unnamed',
            attributes: attr
          });

          if (filters.logOnlyMediaHotspots && attr.hasOpenableMedia) {
            console.warn(`[v6] Media Hotspot: ${attr.label}`, attr);
          }
        });
      });
    });

    console.log('[v6] Element Counts:', elementCounts);
    Object.entries(elementsByType).forEach(([type, list]) => {
      console.log(`\n[v6] ${type} (${list.length}):`);
      list.slice(0,10).forEach((item, idx)=>{
        console.log(`  ${idx+1}. ${item.label} [${item.id}]`);
        console.log('      Attributes:', item.attributes);
      });
      if (list.length>10) {
        console.log(`  ...and ${list.length-10} more`);
      }
    });

    console.log('\n[v6] Filters =>', JSON.stringify(filters, null, 2));
  }

  // --------------------------------------------------
  // A universal init that calls the chosen inspection
  // automatically after load. (Optional)
  // --------------------------------------------------
  function init() {
    // By default, we can run "inspectBasicV1()" or "inspectEnhancedV6()" 
    // or any method you prefer automatically.
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        console.log('>>> Running default inspection: Enhanced v6...');
        inspectEnhancedV6();
      }, 1200);
    });
  }

  // Start once the script loads
  init();

  // Return an object so you can call them manually:
  return {
    // toggles
    toggleFilter,

    // repeated from the merged scripts
    getElementType,
    getOverlayAttributes,

    // original “basic” from the older scripts
    inspectBasicV1,
    inspectBasicV4,

    // enhanced from v5, v6
    inspectEnhancedV5,
    inspectEnhancedV6,
  };
})();

/**
 * 3DVista Tour Debugging Script
 * This script helps analyze the tour object structure for development purposes
 * Version: 1.0.0
 */

(function() {
    // Wait for tour to be fully loaded
    window.addEventListener('load', function() {
        // Give the tour a moment to initialize all its components
        setTimeout(initializeDebugger, 2000);
    });

    function initializeDebugger() {
        console.log("%c3DVista Tour Debugger", "font-size:20px; color:#3b82f6; font-weight:bold;");
        console.log("%cThis script analyzes the tour object structure", "color:#64748b;");
        
        if (!window.tour || !window.tour.player) {
            console.error("Tour or tour.player not available yet. Try running debugTour() manually later.");
            window.debugTour = initializeDebugger;
            return;
        }

        // 1. Inspect tour.player.getAllChildren() structure
        console.group("%ctour.player.getAllChildren()", "font-weight:bold; color:#3b82f6;");
        try {
            const allChildren = tour.player.getAllChildren();
            console.log("Total children:", allChildren.length);
            
            // Group children by class
            const childrenByClass = {};
            allChildren.forEach(child => {
                const className = child.get ? child.get('class') : (child.class || 'Unknown');
                if (!childrenByClass[className]) {
                    childrenByClass[className] = [];
                }
                childrenByClass[className].push(child);
            });
            
            // Log summary of classes
            console.log("Children grouped by class:", Object.fromEntries(
                Object.entries(childrenByClass).map(([k, v]) => [k, v.length])
            ));
            
            // Sample a few items from each class
            Object.entries(childrenByClass).forEach(([className, items]) => {
                console.group(`Class: ${className} (${items.length} items)`);
                const sampleSize = Math.min(2, items.length);
                const sample = items.slice(0, sampleSize);
                
                sample.forEach((item, i) => {
                    console.group(`Sample ${i+1}/${sampleSize}`);
                    try {
                        // List common properties
                        const commonProps = ['id', 'data', 'media', 'overlays', 'parent'];
                        const props = {};
                        
                        commonProps.forEach(prop => {
                            try {
                                if (item.get) {
                                    props[prop] = item.get(prop);
                                } else {
                                    props[prop] = item[prop];
                                }
                            } catch(e) {}
                        });
                        
                        // List available methods
                        const methods = [];
                        for (let key in item) {
                            if (typeof item[key] === 'function' && key !== 'get') {
                                methods.push(key);
                            }
                        }
                        
                        console.log("Properties:", props);
                        console.log("Methods:", methods.slice(0, 10).join(', ') + (methods.length > 10 ? '...' : ''));
                    } catch(e) {
                        console.error("Error inspecting item:", e);
                    }
                    console.groupEnd();
                });
                console.groupEnd();
            });
        } catch(e) {
            console.error("Error accessing getAllChildren():", e);
        }
        console.groupEnd();

        // 2. Inspect media.get('data') structure
        console.group("%cmedia.get('data') structure", "font-weight:bold; color:#3b82f6;");
        try {
            const items = tour.mainPlayList.get('items');
            if (!items || !items.length) {
                console.log("No items found in tour.mainPlayList");
            } else {
                console.log(`Found ${items.length} items in mainPlayList`);
                
                // Sample up to 3 media items
                for (let i = 0; i < Math.min(3, items.length); i++) {
                    const item = items[i];
                    const media = item.get('media');
                    
                    if (!media) {
                        console.log(`Item ${i} has no media`);
                        continue;
                    }
                    
                    console.group(`Media ${i} structure`);
                    
                    try {
                        // Get media data
                        const mediaData = media.get('data');
                        console.log("media.get('data'):", mediaData);
                        
                        // List all available properties
                        console.log("Available properties on media:");
                        const mediaProps = [];
                        for (let j = 0; j < 20; j++) {  // Try some common property indexes
                            try {
                                const prop = media.get(j);
                                if (prop !== undefined) {
                                    mediaProps.push({index: j, value: prop});
                                }
                            } catch(e) {}
                        }
                        console.table(mediaProps);
                        
                        // Get overlays
                        try {
                            const overlays = media.get('overlays') || [];
                            console.log(`Media has ${overlays.length} overlays`);
                            
                            // Sample an overlay if available
                            if (overlays.length > 0) {
                                console.group("Sample overlay structure");
                                const overlay = overlays[0];
                                
                                // Try different ways to access overlay data
                                console.log("overlay.data:", overlay.data);
                                try { console.log("overlay.get('data'):", overlay.get('data')); } catch(e) {}
                                
                                // Log overlay properties
                                const overlayProps = ['id', 'class', 'label', 'text', 'data', 'media'];
                                const props = {};
                                
                                overlayProps.forEach(prop => {
                                    try {
                                        props[prop] = overlay[prop];
                                    } catch(e) {}
                                    
                                    try {
                                        props[`get('${prop}')`] = overlay.get(prop);
                                    } catch(e) {}
                                });
                                
                                console.log("Overlay properties:", props);
                                
                                // Log methods
                                const methods = [];
                                for (let key in overlay) {
                                    if (typeof overlay[key] === 'function' && key !== 'get') {
                                        methods.push(key);
                                    }
                                }
                                console.log("Available methods:", methods.slice(0, 10));
                                
                                console.groupEnd();
                            }
                        } catch(e) {
                            console.error("Error accessing overlays:", e);
                        }
                    } catch(e) {
                        console.error("Error accessing media data:", e);
                    }
                    
                    console.groupEnd();
                }
            }
        } catch(e) {
            console.error("Error inspecting media data:", e);
        }
        console.groupEnd();

        // 3. Expose debug utilities
        window.tourDebug = {
            // Get all children grouped by class
            getAllChildrenByClass: function() {
                const allChildren = tour.player.getAllChildren();
                const childrenByClass = {};
                allChildren.forEach(child => {
                    const className = child.get ? child.get('class') : (child.class || 'Unknown');
                    if (!childrenByClass[className]) {
                        childrenByClass[className] = [];
                    }
                    childrenByClass[className].push(child);
                });
                return childrenByClass;
            },
            
            // Get media data for a specific index
            getMediaData: function(index = 0) {
                const items = tour.mainPlayList.get('items');
                if (!items || !items[index]) return null;
                
                const media = items[index].get('media');
                return media ? media.get('data') : null;
            },
            
            // Get overlays for a specific media index
            getOverlays: function(mediaIndex = 0) {
                const items = tour.mainPlayList.get('items');
                if (!items || !items[mediaIndex]) return [];
                
                const media = items[mediaIndex].get('media');
                return media ? (media.get('overlays') || []) : [];
            },
            
            // Get current media data
            getCurrentMediaData: function() {
                const currentIndex = tour.mainPlayList.get('selectedIndex');
                return this.getMediaData(currentIndex);
            },
            
            // Get current overlays
            getCurrentOverlays: function() {
                const currentIndex = tour.mainPlayList.get('selectedIndex');
                return this.getOverlays(currentIndex);
            }
        };

        console.log("%cDebug utilities available at window.tourDebug", "color:green; font-weight:bold;");
        console.log("Try tourDebug.getMediaData() or tourDebug.getCurrentOverlays()");
    }
})();
