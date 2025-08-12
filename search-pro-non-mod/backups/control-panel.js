// Simple control panel bridge between tour and control panel- Placeholder text only Template. Create everyhing else from here

let currentPlaceholder = "Search... Type * for all";

// Show status message
function showStatus(message, type = "info") {
  const statusEl = document.getElementById("statusMessage");
  statusEl.textContent = message;
  statusEl.className = `status-message status-message--${type}`;
  statusEl.style.display = "block";

  setTimeout(() => {
    statusEl.style.display = "none";
  }, 3000);
}

// Apply settings to tour
function applySettings() {
  const placeholderInput = document.getElementById("placeholder");
  currentPlaceholder = placeholderInput.value;

  // Save for live preview
  const config = {
    searchBar: {
      placeholder: currentPlaceholder,
    },
  };

  localStorage.setItem("searchProLiveConfig", JSON.stringify(config));
  showStatus(
    "Settings applied to tour! Refresh tour to see changes.",
    "success",
  );
}

// Save configuration file
function saveSettings() {
  const placeholderInput = document.getElementById("placeholder");
  currentPlaceholder = placeholderInput.value;

  const configContent = `// Search Pro Configuration
window.searchProConfig = {
    searchBar: {
        placeholder: "${currentPlaceholder}"
    },
    // FORCE DISABLE BUSINESS DATA COMPLETELY
    businessData: {
        useBusinessData: false,
        replaceTourData: false,
        includeStandaloneEntries: false,
        businessDataFile: "",
        businessDataDir: "",
        matchField: "id",
        businessDataUrl: ""
    }
};

// Auto-apply when search loads
(function() {
    function applyConfig() {
        if (window.searchFunctions && window.searchFunctions.updateConfig) {
            window.searchFunctions.updateConfig(window.searchProConfig);
            console.log('[Search] Applied persistent configuration - Business data disabled');
            return true;
        }
        return false;
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => {
                if (!applyConfig()) {
                    let attempts = 0;
                    const interval = setInterval(() => {
                        attempts++;
                        if (applyConfig() || attempts >= 10) {
                            clearInterval(interval);
                        }
                    }, 1000);
                }
            }, 500);
        });
    } else {
        applyConfig();
    }
})();`;

  // Download the file
  const blob = new Blob([configContent], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "search-pro-config.js";
  a.click();
  URL.revokeObjectURL(url);

  showStatus(
    "Configuration file downloaded! Replace your search-pro-config.js content and refresh tour.",
    "success",
  );
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", function () {
  console.log("Control panel initialized");
});
