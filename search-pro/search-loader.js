/**
 * Simple Search Pro Loader for 3DVista Tours
 * Just loads the scripts and doesn't interfere with button functionality
 * Version: 1.0.0
 */

// Keep track of loading state
let scriptsLoaded = false;

// Helper for debug logging
function log(...args) {
    console.log('[SearchLoader]', ...args);
}

// Load the search stylesheet
function loadSearchCSS() {
    // Check if already loaded
    const existingLinks = document.querySelectorAll('link[rel="stylesheet"]');
    for (const link of existingLinks) {
        if (link.href.includes('search-pro/search_v4.css')) {
            log('Stylesheet already loaded, skipping');
            return true;
        }
    }

    log('Loading search stylesheet...');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'search-pro/search_v4.css';
    document.head.appendChild(link);
    return true;
}

// Load the search JavaScript
function loadSearchJS() {
    // Check if already loaded
    if (typeof window.tourSearchFunctions !== 'undefined') {
        log('Search functions already loaded, skipping');
        return true;
    }

    log('Loading search JavaScript...');
    const script = document.createElement('script');
    script.src = 'search-pro/search_v4.js';
    script.async = false;
    document.body.appendChild(script);
    return true;
}

// Main initialization function
function loadAndInitialize() {
    log('Starting...');
    
    // Load CSS
    loadSearchCSS();
    
    // Load JS
    loadSearchJS();
    
    // Mark as loaded
    scriptsLoaded = true;
    
    log('Search scripts loaded. The button will handle initialization.');
    console.log('[SearchLoader] tourSearchFunctions:', window.tourSearchFunctions);
}

// Run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAndInitialize);
} else {
    // Page already loaded
    loadAndInitialize();
}

// Expose a minimal API (but don't override any functions)
window.searchLoaderFunctions = {
    loadCSS: loadSearchCSS,
    loadJS: loadSearchJS
};