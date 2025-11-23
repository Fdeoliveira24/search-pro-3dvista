try {
    var searchContainer = document.getElementById('searchContainer');
    if (searchContainer) {
        if (!window.searchListInitiinitialized) {
            window.tourSearchFunctions.initializeSearch(this);
        }
        window.tourSearchFunctions.toggleSearch(searchContainer.style.display !== 'block');
    }
} catch (error) {
    console.error('Button action error - Check if initialization is complete:', error);
}
