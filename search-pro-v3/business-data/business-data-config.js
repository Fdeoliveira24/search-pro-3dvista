/**
 * Business Data Configuration for Search Module
 * ===========================================
 * This file uses JavaScript to define business data with detailed comments
 * It includes a function to download the data as a business.json file
 *
 * USAGE:
 * 1. Edit the business data objects as needed
 * 2. Run downloadBusinessData() in your browser console to download the JSON file
 * 3. Place the downloaded business.json in your search-pro-v3/business-data/ folder
 */

// Make the download function global so it can be called from console
window.downloadBusinessData = function () {
  const jsonOutput = JSON.stringify(businessData, null, 2);
  const blob = new Blob([jsonOutput], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = "business.json";
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
  console.log("✅ Business data downloaded as 'business.json'");
};

// Define business data with comprehensive comments
const businessData = [
  /**
   * Make sure you add this <script src="search-pro-v3/business-data/business-data-config.js"></script> to your page
   * PANORAMAS (Main Virtual Tour Areas)
   * ===================================
   * Each panorama needs:
   * - id: Must match a tour element id, name, or tag
   * - name: User-friendly display name (Short name recommended)
   * - description: Description for search results
   * - matchTags: Array of tags that can match this item. It must be inside square brackets [].
   * - imageUrl: Web URL for thumbnail (optional)
   * - localImage: Path to local image file (recommended)
   * - elementType: Should be "Panorama" for main tour areas
   * - parentId: Leave empty for panoramas
   */
  {
    id: "Room-1", // ID must match a tour element id, title, or tag
    name: "Main Room 1", // Display name shown in search results
    description: "The main entrance area", // Display description for search results
    matchTags: ["Room-1"], // Alternative IDs or tags that can match this panorama
    imageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=400&fit=crop", // External image URL (optional)
    localImage: "search-pro-v3/assets/images/room-1.jpg", // Local image path (recommended)
    elementType: "Panorama", // Type of element - "Panorama" for main scenes
    parentId: "", // Empty for panoramas (they are top-level elements)
  },
  {
    id: "MyCoolTag_01", // This ID matches a special tag in the tour
    name: "Tagged Cool Tag", // Friendly display name
    description: "Room with special tagging", // Detailed description
    matchTags: ["MyCoolTag_01"], // Alternative matching tags
    imageUrl:
      "https://images.unsplash.com/photo-1465101162946-4377e57745c3?w=400&h=400&fit=crop",
    localImage: "search-pro-v3/assets/images/cool-tag-01.jpg",
    elementType: "Panorama",
    parentId: "",
  },
  {
    id: "Room-3", // Match Room-3 panorama in the tour
    name: "Conference Area 3", // More descriptive name than the ID
    description: "Facility-3 meeting space", // Detailed description
    matchTags: ["Room-3"], // Can match by this tag too
    imageUrl:
      "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=400&h=400&fit=crop",
    localImage: "search-pro-v3/assets/images/room-3.jpg",
    elementType: "Panorama",
    parentId: "",
  },

  /**
   * ADDITIONAL PANORAMAS
   * ===================
   * You can add as many panoramas as needed
   */
  {
    id: "Facility-4", // Modern facility room
    name: "Facility-4 Room",
    description: "Modern facility room with advanced features",
    matchTags: ["MyCoolTag_04", "Facility-4", "MyCoolTour_3_and_4"], // Multiple tags increase match chances
    imageUrl:
      "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=400&h=400&fit=crop",
    localImage: "search-pro-v3/assets/images/facility-4.jpg",
    elementType: "Panorama",
    parentId: "",
  },
  {
    id: "Model-01", // 3D model showcase room
    name: "3D Model Mansion",
    description: "3D model showcase area",
    matchTags: ["Model-01"],
    imageUrl:
      "https://images.unsplash.com/photo-1519985176271-adb1088fa94c?w=400&h=400&fit=crop",
    localImage: "search-pro-v3/assets/images/3d-model.jpg", // Local image path is preferred
    elementType: "Panorama",
    parentId: "",
  },
  {
    id: "Technimark-360-video-sample", // 360 degree video panorama
    name: "360 Video Tech", // Simplified display name
    description: "Technimark 360 video demonstration", // Detailed description
    matchTags: ["Technimark-360-video-sample"], // Match by this exact ID
    imageUrl:
      "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400&h=400&fit=crop",
    localImage: "search-pro-v3/assets/images/360-video.jpg",
    elementType: "Panorama",
    parentId: "",
  },

  /**
   * HOTSPOTS (Interactive Points)
   * ============================
   * Hotspots need:
   * - id: Must match hotspot id in the tour
   * - parentId: The panorama ID where this hotspot exists
   * - elementType: "Hotspot" for navigation or info points
   */
  {
    id: "GoToRoom-2", // Navigation hotspot ID
    name: "My 1st Hotspot", // User-friendly name
    description: "Navigation hotspot to room 2", // Describes what this hotspot does
    matchTags: ["GoToRoom-2"], // Alternative ways to match this hotspot
    imageUrl:
      "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=400&h=400&fit=crop",
    localImage: "search-pro-v3/assets/images/hotspot-1.jpg",
    elementType: "Hotspot", // Type is "Hotspot" for navigation points
    parentId: "Room-1", // This hotspot exists in the Room-1 panorama
  },
  {
    id: "Info-to_Video-360", // Info hotspot for 360 video
    name: "My 2nd Hotspot - Video Info Hotspot", // Descriptive name
    description: "Information about 360 video", // What this hotspot provides
    matchTags: ["Info-to_Video-360"], // Tag matching
    imageUrl:
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&h=400&fit=crop",
    localImage: "search-pro-v3/assets/images/info-hotspot.jpg",
    elementType: "Hotspot", // Information hotspot
    parentId: "Room-1", // Located in Room-1
  },

  /**
   * OTHER OVERLAY ELEMENTS
   * =====================
   * Webframes, Polygons, Videos, and other interactive elements
   */
  {
    id: "Web", // Webframe element ID
    name: "My Web Content Google", // Display name
    description: "Web frame overlay", // Description of what this element shows
    matchTags: ["Web"], // Match by this tag
    imageUrl:
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=400&h=400&fit=crop",
    localImage: "search-pro-v3/assets/images/web-frame.jpg",
    elementType: "Webframe", // Type for web content frames
    parentId: "Room-1", // Located in Room-1
  },
  {
    id: "MyCoolPolygon01", // Polygon element ID
    name: "Cool Polygon 1", // User-friendly name
    description: "Interactive polygon area", // What this polygon represents
    matchTags: ["MyCoolPolygon01"], // Match by this tag
    imageUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    localImage: "search-pro-v3/assets/images/polygon-1.jpg",
    elementType: "Polygon", // Type for polygon areas
    parentId: "MyCoolTag_01", // Located in the panorama with ID MyCoolTag_01
  },
  {
    id: "MyProjectedImage", // Projected image element ID
    name: "Projected Image 1", // Display name
    description: "Special projected image", // What this image shows
    matchTags: ["MyProjectedImage"], // Match by this tag
    imageUrl:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=400&fit=crop",
    localImage: "search-pro-v3/assets/images/projected-image.jpg",
    elementType: "ProjectedImage", // Type for projected images
    parentId: "MyCoolTag_01", // Located in the panorama with ID MyCoolTag_01
  },
  {
    id: "MyCoolPlaceholderVideo", // Video element ID
    name: "Placeholder Video 1", // Display name
    description: "Sample video content", // Description of video content
    matchTags: ["MyCoolPlaceholderVideo"], // Match by this tag
    imageUrl:
      "https://images.unsplash.com/photo-1454023492550-5696f8ff10e1?w=400&h=400&fit=crop",
    localImage: "search-pro-v3/assets/images/video-1.jpg",
    elementType: "Video", // Type for video elements
    parentId: "Facility-4", // Located in Facility-4 panorama
  },

  /**
   * ADVANCED MATCHING EXAMPLES
   * =========================
   * Elements that use tag-based matching instead of direct ID matching
   */
  {
    id: "", // Empty ID - will rely on matchTags for matching
    name: "Facility-4 Panorama", // Display name
    description: "Modern facility room with advanced features", // Description
    matchTags: ["Facility-4"], // Match by this tag only
    imageUrl:
      "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=400&h=400&fit=crop",
    localImage: "search-pro-v3/assets/images/facility-4-alt.jpg",
    elementType: "Panorama",
    parentId: "", // Empty for panoramas
  },
  {
    id: "", // Empty ID - will rely on matchTags for matching
    name: "Untitled Panorama 1", // Display name for a panorama with no ID
    description: "Panorama with no attributes", // Description
    matchTags: ["Untitled Panorama 1"], // Match by this tag
    imageUrl:
      "https://images.unsplash.com/photo-1543039625-15d420c30b44?w=400&h=400&fit=crop",
    localImage: "search-pro-v3/assets/images/untitled-panorama.jpg",
    elementType: "Panorama",
    parentId: "",
  },

  /**
   * ADDITIONAL ELEMENTS
   * ==================
   * Add more elements as needed following the patterns above
   */
];

// Also expose the data directly for inspection in console
window._businessDataSource = businessData;

// Add this to your utility functions
function _normalizeImagePath(path, tryAlternateFormats = true) {
  if (!path) return "";

  // If it's already an absolute URL, return as is
  if (path.startsWith("http") || path.startsWith("//")) {
    return path;
  }

  // Handle relative paths - ensure they're based on the right root
  const baseUrl =
    window.location.origin +
    window.location.pathname.substring(
      0,
      window.location.pathname.lastIndexOf("/"),
    );

  // Remove any leading slash for clean joining
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${baseUrl}/${cleanPath}`;
}

// Then update findBusinessMatch function to include:
function findBusinessMatch(tourElement) {
  // ... existing matching code ...

  // After finding a match but before returning it:
  if (businessMatch) {
    // Normalize image paths in business data
    if (businessMatch.imageUrl) {
      businessMatch.imageUrl = _normalizeImagePath(businessMatch.imageUrl);
    }

    if (businessMatch.localImage) {
      businessMatch.localImage = _normalizeImagePath(businessMatch.localImage);
    }

    // If no imageUrl but has localImage, use localImage as imageUrl
    if (!businessMatch.imageUrl && businessMatch.localImage) {
      businessMatch.imageUrl = businessMatch.localImage;
    }
  }

  return businessMatch;
}

console.log("✅ Business data configuration loaded!");
console.log("ℹ️ To download as JSON file, run: downloadBusinessData()");
