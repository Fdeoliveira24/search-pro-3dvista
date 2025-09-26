// Clear all Search Pro cache
console.log("🗑️ CLEARING ALL SEARCH PRO CACHE");

const searchProKeys = [
  'searchProLastAppliedConfig',
  'searchProConfigUpdate',
  'searchPro_brandText',
  'searchProLastConfigApplied', 
  'searchProConfig',
  'searchProLiveConfig'
];

searchProKeys.forEach(key => {
  localStorage.removeItem(key);
  console.log(`🗑️ Removed: ${key}`);
});

console.log("✅ All Search Pro cache cleared");
console.log("🔄 Refreshing page...");
window.location.reload();