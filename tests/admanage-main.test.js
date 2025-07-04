import { test, expect } from '@playwright/test';
import { 
  testGalleryModeInputs, 
  testGalleryModeGlobalDefaults,
  testLaunchStatusSwitch,
  testSpecialTestingToggle 
} from '../lib/gallery-helpers.js';
import { 
  switchToTableView, 
  testTableModeRowUpdates, 
  testTableModeCTA 
} from '../lib/table-helpers.js';
import { testMediaLoader } from '../lib/media-loader-helpers.js';

test.describe('AdManage Complete Test Suite', () => {
  test('Complete Gallery and Table Mode Tests', async ({ page }) => {
    // Set longer timeout for the entire test
    test.setTimeout(480000); // 8 minutes for all tests
    
    const startTime = Date.now();
    
    // ========== LOGIN SECTION ==========
    console.log('========== STARTING ADMANAGE COMPLETE TEST SUITE ==========');
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Navigating to sign in page...`);
    
    // Block only analytics and tracking, but allow media/images to load
    await page.route('**/*', (route) => {
      const url = route.request().url();
      
      // Block only analytics and tracking scripts
      if (url.includes('analytics') || url.includes('google-analytics') || 
          url.includes('facebook.com/tr') || url.includes('doubleclick') ||
          url.includes('segment') || url.includes('hotjar') || url.includes('mixpanel') ||
          url.includes('gtag') || url.includes('googletagmanager')) {
        return route.abort();
      }
      
      return route.continue();
    });
    
    await page.goto('https://admanage.ai/sign_in_fb', { 
      waitUntil: 'domcontentloaded',
      timeout: 99000 
    });
    
    // Wait for email input to be ready
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Waiting for login form to be ready...`);
    const emailInput = await page.locator('#email-input-test');
    await emailInput.waitFor({ state: 'visible', timeout: 90000 });
    
    // Fill in credentials
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Filling in login credentials...`);
    await emailInput.fill('nickferlando@gmail.com');
    
    const passwordInput = await page.locator('#password-input-test');
    await passwordInput.waitFor({ state: 'visible', timeout: 90000 });
    await passwordInput.fill('Cedric123123!');
    
    // Click sign in button
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Clicking sign in button...`);
    const signInButton = await page.locator('#sign-in-button-test');
    await signInButton.click();
    
    // Wait for navigation to launch page
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Waiting for redirect to launch page...`);
    await page.waitForURL('**/launch', { timeout: 150000 });
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✓ Successfully logged in and reached launch page`);
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // ========== GALLERY MODE TESTS ==========
    console.log('\n========== GALLERY MODE TESTS ==========');
    
    // Test 1: Media Loader FIRST (to add creative rows)
    console.log('\n--- Test 1: Media Loader (Creating Initial Rows) ---');
    const mediaLoaderPass = await testMediaLoader(page, startTime);
    
    if (mediaLoaderPass) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Media Loader Test: PASSED`);
    } else {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Media Loader Test: FAILED`);
    }
    
    // Test 2: Gallery Mode Inputs
    console.log('\n--- Test 2: Gallery Mode Input Fields ---');
    const galleryInputsPass = await testGalleryModeInputs(page, startTime);
    
    if (galleryInputsPass) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Gallery Mode Input Test: PASSED`);
    } else {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Gallery Mode Input Test: FAILED`);
    }
    
    // Test 3: Launch Status Switch
    console.log('\n--- Test 3: Launch Status Switch ---');
    const launchStatusPass = await testLaunchStatusSwitch(page, startTime);
    
    if (launchStatusPass) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Launch Status Switch Test: PASSED`);
    } else {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Launch Status Switch Test: FAILED`);
    }
    
    // Test 4: Special Testing Toggle
    console.log('\n--- Test 4: Special Testing Toggle ---');
    const specialTestingPass = await testSpecialTestingToggle(page, startTime);
    
    if (specialTestingPass) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Special Testing Toggle Test: PASSED`);
    } else {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Special Testing Toggle Test: FAILED`);
    }
    
    // Test 5: Gallery Mode Global Defaults
    console.log('\n--- Test 5: Gallery Mode Global Defaults ---');
    const galleryGlobalDefaultsPass = await testGalleryModeGlobalDefaults(page, startTime);
    
    if (galleryGlobalDefaultsPass) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Gallery Mode Global Defaults Test: PASSED`);
    } else {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Gallery Mode Global Defaults Test: FAILED`);
    }
    
    // ========== TABLE MODE TESTS ==========
    console.log('\n========== TABLE MODE TESTS ==========');
    
    // Switch to table view
    console.log('\n--- Switching to Table View ---');
    const rowCount = await switchToTableView(page, startTime);
    
    // Test 6: Table Mode Row Updates
    console.log('\n--- Test 6: Table Mode Row Updates ---');
    const tableRowUpdatesPass = await testTableModeRowUpdates(page, startTime);
    
    if (tableRowUpdatesPass) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Table Mode Row Updates Test: PASSED`);
    } else {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Table Mode Row Updates Test: FAILED`);
    }
    
    // Test 7: Table Mode CTA
    console.log('\n--- Test 7: Table Mode CTA Updates ---');
    const tableCTAPass = await testTableModeCTA(page, startTime);
    
    if (tableCTAPass) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Table Mode CTA Test: PASSED`);
    } else {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Table Mode CTA Test: FAILED`);
    }
    
    
    // ========== FINAL SUMMARY ==========
    const endTime = Date.now();
    const executionTime = ((endTime - startTime) / 1000).toFixed(1);
    
    console.log('\n========== FINAL TEST SUMMARY ==========');
    console.log(`[${executionTime}s] Total execution time: ${executionTime}s`);
    
    const allTestsPassed = mediaLoaderPass && galleryInputsPass && launchStatusPass &&
                          specialTestingPass && galleryGlobalDefaultsPass && 
                          tableRowUpdatesPass && tableCTAPass;
    
    const testResults = {
      // Implemented Tests
      'Gallery Mode': galleryInputsPass && galleryGlobalDefaultsPass,
      'Row Testing (Table Mode)': tableRowUpdatesPass && tableCTAPass,
      'Special Testing': specialTestingPass,
      'Media Loader': mediaLoaderPass,
      'Launch Status Switch': launchStatusPass,
      
      // Coming Soon Tests
      'Relaunch Functionality': 'COMING SOON',
      'Multi Format Double Placement': 'COMING SOON',
      'Multi Format Triple Placement': 'COMING SOON',
      'Flexible': 'COMING SOON',
      'Carousel': 'COMING SOON',
      'Carousel Multi-placement': 'COMING SOON',
      'Switching Ad Accounts': 'COMING SOON',
      'Switching Instagram Accounts': 'COMING SOON',
      'Multi Language': 'COMING SOON',
      'Ad Copy Template Assigned': 'COMING SOON',
      'Existing Ads Loaded': 'COMING SOON',
      'Google Drive Ads Loaded': 'COMING SOON',
      'Google Drive Link Loaded': 'COMING SOON',
      'Dropbox Link Loaded': 'COMING SOON',
      'Meta Library Loaded': 'COMING SOON'
    };
    
    console.log('\nTest Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const [testName, result] of Object.entries(testResults)) {
      if (result === 'COMING SOON') {
        console.log(`  ${testName}: 🔜 ${result}`);
      } else {
        console.log(`  ${testName}: ${result ? '✅ PASSED' : '❌ FAILED'}`);
      }
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Detailed failure analysis
    if (!allTestsPassed) {
      console.log('\n========== FAILURE ANALYSIS ==========');
      
      if (!galleryInputsPass) {
        console.log('❌ Gallery Mode Inputs FAILED:');
        console.log('   - Issue: Basic input fields (primary text, headline, etc.) not working');
        console.log('   - Likely cause: Element selectors changed or page structure modified');
        console.log('   - Action needed: Check if element IDs still exist on the page');
      }
      
      if (!galleryGlobalDefaultsPass) {
        console.log('❌ Gallery Mode Global Defaults FAILED:');
        console.log('   - Issue: CTA selector not found or not updating globalDefaults');
        console.log('   - Likely cause: CTA dropdown element changed or new ID not implemented');
        console.log('   - Action needed: Verify CTA selector has id="cta-selector" or update selectors');
        console.log('   - Debug info: Check the console above for CTA element detection details');
      }
      
      if (!tableRowUpdatesPass) {
        console.log('❌ Table Mode Row Updates FAILED:');
        console.log('   - Issue: Individual row updates not working correctly');
        console.log('   - Likely cause: Table structure changed or row selectors modified');
        console.log('   - Action needed: Verify table row data-testid attributes exist');
      }
      
      if (!tableCTAPass) {
        console.log('❌ Table Mode CTA FAILED:');
        console.log('   - Issue: CTA dropdowns in table rows not working');
        console.log('   - Likely cause: Table CTA selectors changed');
        console.log('   - Action needed: Check CTA dropdown structure in table rows');
      }
      
      if (!mediaLoaderPass) {
        console.log('❌ Media Loader FAILED:');
        console.log('   - Issue: Media selection and loading not working correctly');
        console.log('   - Likely cause: Load Media button or media table selectors changed');
        console.log('   - Action needed: Verify #load-media button and media table structure');
      }
      
      if (!launchStatusPass) {
        console.log('❌ Launch Status Switch FAILED:');
        console.log('   - Issue: Launch status switch not toggling or not updating globalDefaults');
        console.log('   - Likely cause: Switch element ID changed or state update logic modified');
        console.log('   - Action needed: Verify #launch-status-switch exists and updates state correctly');
      }
      
      if (!specialTestingPass) {
        console.log('❌ Special Testing Toggle FAILED:');
        console.log('   - Issue: Special testing toggle not updating rows.specialTesting property');
        console.log('   - Likely cause: Switch element ID changed or state update logic modified');
        console.log('   - Action needed: Verify #special-testing switch exists and updates all rows');
      }
      
      console.log('\n========== RECOMMENDED ACTIONS ==========');
      console.log('1. Check browser developer tools for element IDs during test run');
      console.log('2. Verify that the new IDs mentioned in the requirements are actually implemented');
      console.log('3. Run test with --headed flag to see what\'s happening: npx playwright test --headed');
      console.log('4. Check the Playwright HTML report: npx playwright show-report');
      
      const implementedTests = Object.values(testResults).filter(result => result !== 'COMING SOON');
      const failedCount = implementedTests.filter(result => !result).length;
      const totalCount = implementedTests.length;
      
      console.log(`\n❌ TESTS FAILED: ${failedCount}/${totalCount} tests failed`);
      throw new Error(`${failedCount} out of ${totalCount} tests failed. See detailed analysis above.`);
    } else {
      const implementedCount = Object.values(testResults).filter(result => result !== 'COMING SOON').length;
      const comingSoonCount = Object.values(testResults).filter(result => result === 'COMING SOON').length;
      
      console.log(`\n✅ ALL IMPLEMENTED TESTS PASSED (${implementedCount}/${implementedCount})`);
      console.log(`📋 ${comingSoonCount} tests planned for future implementation`);
      console.log('🎉 Gallery mode, Table mode, and Special Testing are all functioning properly!');
    }
  });
});