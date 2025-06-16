#!/usr/bin/env node

const fs = require('fs');

console.log('🔍 LLM PageRank Link Testing Suite');
console.log('=====================================\n');

const internalRoutes = [
  '/',
  '/about', 
  '/domains',
  '/rankings',
  '/categories',
  '/tesla-jolt',
  '/domain/tesla.com',
  '/domain/openai.com'
];

async function testInternalRoutes() {
  console.log('📄 Testing Internal Routes:');
  console.log('----------------------------');
  
  let passed = 0;
  let failed = 0;
  
  const appContent = fs.readFileSync('src/App.jsx', 'utf8');
  
  for (const route of internalRoutes) {
    if (route.includes('/domain/')) {
      // Check for dynamic domain route
      if (appContent.includes('path="/domain/:domainName"')) {
        console.log(`✅ ${route} - Dynamic route defined in App.jsx`);
        passed++;
      } else {
        console.log(`❌ ${route} - Dynamic route missing in App.jsx`);
        failed++;
      }
    } else if (appContent.includes(`path="${route}"`) || route === '/') {
      console.log(`✅ ${route} - Route defined in App.jsx`);
      passed++;
    } else {
      console.log(`❌ ${route} - Route missing in App.jsx`);
      failed++;
    }
  }
  
  console.log(`\n📊 Internal Routes: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

async function testStaticAssets() {
  console.log('📁 Testing Static Assets:');
  console.log('-------------------------');
  
  let passed = 0;
  let failed = 0;
  const assets = ['/sitemap.xml', '/robots.txt'];
  
  for (const asset of assets) {
    const filePath = `public${asset}`;
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`✅ ${asset} - File exists (${content.length} bytes)`);
      passed++;
    } else {
      console.log(`❌ ${asset} - File missing`);
      failed++;
    }
  }
  
  console.log(`\n📊 Static Assets: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

async function testComponents() {
  console.log('⚛️  Testing Components:');
  console.log('----------------------');
  
  let passed = 0;
  let failed = 0;
  
  const components = [
    { name: 'IntelligenceDashboard', path: 'src/components/IntelligenceDashboard.jsx' },
    { name: 'TeslaJolt', path: 'src/pages/TeslaJolt.jsx' },
    { name: 'Home', path: 'src/pages/Home.jsx' },
    { name: 'About', path: 'src/pages/About.jsx' }
  ];
  
  for (const component of components) {
    if (fs.existsSync(component.path)) {
      console.log(`✅ ${component.name} - Component exists`);
      passed++;
    } else {
      console.log(`❌ ${component.name} - Component missing`);
      failed++;
    }
  }
  
  console.log(`\n📊 Components: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

async function runTests() {
  const internal = await testInternalRoutes();
  const staticAssets = await testStaticAssets();
  const components = await testComponents();
  
  const totalPassed = internal.passed + staticAssets.passed + components.passed;
  const totalFailed = internal.failed + staticAssets.failed + components.failed;
  
  console.log('🎯 FINAL RESULTS:');
  console.log('=================');
  console.log(`✅ Total Passed: ${totalPassed}`);
  console.log(`❌ Total Failed: ${totalFailed}`);
  console.log(`📊 Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 All tests passed! Ready for deployment.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review and fix issues.');
  }
}

runTests().catch(console.error); 