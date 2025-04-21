/**
 * Search Pro Loader
 * 
 * Handles dynamic loading of resources and initializes the search functionality.
 * This ensures the search CSS is loaded before the search UI is rendered.
 */

(function() {
    console.log('[SearchLoader] Initializing...');
    
    // First, inject the CSS stylesheet
    injectStylesheet();
    
    // After resources are loaded, initialize search when the page is ready
    window.addEventListener('load', function() {
        initializeSearch();
    });
    
    /**
     * Injects the search stylesheet into the document head
     */
    function injectStylesheet() {
        // Check if stylesheet is already loaded
        const existingStylesheet = document.querySelector('link[href*="search_v4.css"]');
        if (existingStylesheet) {
            console.log('[SearchLoader] Stylesheet already loaded, skipping injection');
            return;
        }
        
        // Create link element
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'search-pro/css/search_v4.css'; // Fix: Corrected path to match actual file location
        link.id = 'search-pro-stylesheet';
        
        // Insert at the end of head
        document.head.appendChild(link);
        
        // Monitor for load/error events
        link.onload = function() {
            console.log('[SearchLoader] Stylesheet injected');
        };
        
        link.onerror = function() {
            console.error('[SearchLoader] Failed to load stylesheet: ' + link.href);
            // Fallback to inline loading as emergency measure
            const fallbackLink = document.createElement('link');
            fallbackLink.rel = 'stylesheet';
            fallbackLink.href = 'search_v4.css'; // Try alternate path
            document.head.appendChild(fallbackLink);
        };
    }
    
    /**
     * Initializes the search functionality when resources are ready
     */
    function initializeSearch() {
        if (window.tourSearchFunctions && typeof window.tourSearchFunctions.initializeSearch === 'function') {
            console.log('[SearchLoader] Starting search initialization');
            
            // Wait a moment to ensure CSS is loaded
            setTimeout(function() {
                try {
                    // Initialize the search with the configuration
                    window.tourSearchFunctions.initializeSearch({
                        containerSelector: '#searchContainer',
                        inputId: 'tourSearch',
                        debug: true
                    });
                    console.log('[SearchLoader] Search initialized successfully');
                } catch (error) {
                    console.error('[SearchLoader] Error initializing search:', error);
                }
            }, 100);
        } else {
            console.error('[SearchLoader] Search functions not available');
        }
    }
})();