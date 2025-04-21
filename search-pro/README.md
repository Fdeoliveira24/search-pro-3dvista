✅ 3DVista Search Pro – Production Setup Checklist

1. 🔗 FOLDER STRUCTURE
   /search-pro/
     ├── search_v4.js
     ├── search_v4.css
     ├── config-loader.js
     ├── search-loader.js
     ├── config/
     │   └── search-config.json (generated from Export for Server)
     └── fuse.js/dist/fuse.min.js

2. ✅ INDEX.HTM OR INDEX.HTML (Order Matters!)
   • The plugin works with either `index.htm` or `index.html`
   • It will work from any folder level as long as paths remain correct
   • Users can drag and drop the `/search-pro/` folder directly into the tour root

   Example:
   ```html
   <link rel="stylesheet" href="search-pro/search_v4.css" />
   <script src="search-pro/fuse.js/dist/fuse.min.js"></script>
   <script src="search-pro/search_v4.js"></script>
   <script src="search-pro/js/config-loader.js"></script>
   <script src="search-pro/search-loader.js"></script>
   ```

3. 🔘 BUTTON REQUIREMENT
   • Add a 3DVista Button and assign it:
     Action → Button → JS Code:
     window.tourSearchFunctions.initializeSearch(this);

4. ⚙️ SETTINGS
   • Use /search-pro/settings.html to configure
   • Press “Export for Server”
   • Upload result to /search-pro/config/search-config.json

5. 💾 PERSISTENCE
   • Config is stored permanently on disk (not just localStorage)
   • Deep merge logic ensures all nested settings are preserved

6. 🌙 DARK MODE
   • Included and applied by default via CSS variables
   • Controlled via config under `theme.useDarkMode` and `theme.contrastMode`

7. 🚰 DEBUGGING & LOGGING
   • Controlled by `DEBUG` flag inside:
     - search_v4.js
     - config-loader.js
     - search-loader.js
   • Logs include:
     → Script loading sequence
     → Config source (server, localStorage, fallback)
     → Errors and warnings during initialization

8. ❌ MISSING CONFIG?
   • If `search-config.json` is missing or broken, it will fallback to:
     → localStorage
     → defaults
     → console warning

9. 🣟 PRODUCTION CLEANUP CHECKLIST
   • DEBUG logs: disabled by default (`const DEBUG = false`)
   • No minification yet — feature expansion still in progress
   • Scripts structured for modular growth and future enhancements
   • CDN fallback active for Fuse.js
   • Config file validated and complete before deployment

