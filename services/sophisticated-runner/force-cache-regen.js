const CachePopulationScheduler = require('./dist/cache-population-scheduler.js').default;

async function forceRegenerateCache() {
  console.log('🚀 FORCING CACHE REGENERATION WITH CORRECTED SCORING...');
  
  const scheduler = new CachePopulationScheduler();
  
  try {
    await scheduler.populateCache();
    console.log('✅ Cache regeneration completed successfully!');
    console.log('🎯 Microsoft and all other domains should now show realistic scores (not 100%)');
  } catch (error) {
    console.error('❌ Cache regeneration failed:', error);
  }
  
  process.exit(0);
}

forceRegenerateCache(); 