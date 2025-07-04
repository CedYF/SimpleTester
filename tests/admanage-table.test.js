import { test, expect } from '@playwright/test';
import { 
  switchToTableView, 
  testTableModeRowUpdates, 
  testTableModeCTA 
} from '../lib/table-helpers.js';

test.describe('AdManage Table Mode Tests', () => {
  test('Table Mode Tests Only', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes timeout
    
    const startTime = Date.now();
    
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
    
    // ========== LOGIN SECTION ==========
    console.log('\n[TABLE] ========== STARTING TABLE MODE TEST ==========');
    console.log(`[TABLE] [${((Date.now() - startTime) / 1000).toFixed(1)}s] Navigating to sign in page...`);
    
    await page.goto('https://admanage.ai/sign_in_fb', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Wait for login form to be ready
    console.log(`[TABLE] [${((Date.now() - startTime) / 1000).toFixed(1)}s] Waiting for login form...`);
    const emailInput = await page.locator('#email-input-test');
    const passwordInput = await page.locator('#password-input-test');
    
    // Ensure elements are visible and ready
    await emailInput.waitFor({ state: 'visible', timeout: 30000 });
    await passwordInput.waitFor({ state: 'visible', timeout: 30000 });
    
    // Add small delay to ensure form is fully loaded
    await page.waitForTimeout(500);
    
    console.log(`[TABLE] [${((Date.now() - startTime) / 1000).toFixed(1)}s] Filling in login credentials...`);
    
    // Fill credentials sequentially with verification
    await emailInput.clear();
    await emailInput.fill('nickferlando@gmail.com');
    
    await passwordInput.clear();
    await passwordInput.fill('Cedric123123!');
    
    // Verify values were entered
    const emailValue = await emailInput.inputValue();
    const passwordValue = await passwordInput.inputValue();
    
    if (!emailValue || !passwordValue) {
      console.log(`[TABLE] [${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Login fields not filled properly, retrying...`);
      await emailInput.fill('nickferlando@gmail.com');
      await passwordInput.fill('Cedric123123!');
    }
    
    // Click sign in button
    console.log(`[TABLE] [${((Date.now() - startTime) / 1000).toFixed(1)}s] Clicking sign in button...`);
    const signInButton = await page.locator('#sign-in-button-test');
    await signInButton.click();
    
    // Wait for navigation to launch page
    console.log(`[TABLE] [${((Date.now() - startTime) / 1000).toFixed(1)}s] Waiting for redirect to launch page...`);
    await page.waitForURL('**/launch', { timeout: 60000 });
    console.log(`[TABLE] [${((Date.now() - startTime) / 1000).toFixed(1)}s] ✓ Successfully logged in and reached launch page`);
    
    // Minimal wait for page stabilization
    await page.waitForTimeout(1000);
    
    // ========== TABLE MODE TESTS ==========
    console.log('\n[TABLE] ========== TABLE MODE TESTS ==========');
    
    // First need to do minimal gallery setup to get an ad set selected
    console.log('\n[TABLE] --- Quick Gallery Setup for Table Mode ---');
    try {
      // Just select an ad set quickly
      const adSetSelector = await page.locator('input[placeholder*="Search by Ad Set"]');
      await adSetSelector.click();
      await adSetSelector.fill('v1');
      await page.waitForTimeout(500);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      
      // Confirm selection if button exists
      const confirmButton = await page.locator('#confirm-selection-button-adset-selector');
      if (await confirmButton.isVisible({ timeout: 1000 })) {
        await confirmButton.click();
      }
      
      await page.waitForTimeout(1000);
    } catch (error) {
      console.log(`[TABLE] [${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Ad set selection skipped: ${error.message}`);
    }
    
    // Switch to table view
    console.log('\n[TABLE] --- Switching to Table View ---');
    const rowCount = await switchToTableView(page, startTime);
    
    // Test 3: Table Mode Row Updates
    console.log('\n[TABLE] --- Test 1: Table Mode Row Updates ---');
    const tableRowUpdatesPass = await testTableModeRowUpdates(page, startTime);
    
    if (tableRowUpdatesPass) {
      console.log(`[TABLE] [${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Table Mode Row Updates Test: PASSED`);
    } else {
      console.log(`[TABLE] [${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Table Mode Row Updates Test: FAILED`);
    }
    
    // Test 4: Table Mode CTA
    console.log('\n[TABLE] --- Test 2: Table Mode CTA Updates ---');
    const tableCTAPass = await testTableModeCTA(page, startTime);
    
    if (tableCTAPass) {
      console.log(`[TABLE] [${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Table Mode CTA Test: PASSED`);
    } else {
      console.log(`[TABLE] [${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Table Mode CTA Test: FAILED`);
    }
    
    // ========== FINAL SUMMARY ==========
    const endTime = Date.now();
    const executionTime = ((endTime - startTime) / 1000).toFixed(1);
    
    console.log('\n[TABLE] ========== TABLE MODE TEST SUMMARY ==========');
    console.log(`[TABLE] [${executionTime}s] Total execution time: ${executionTime}s`);
    
    const allTestsPassed = tableRowUpdatesPass && tableCTAPass;
    
    if (!allTestsPassed) {
      const failedCount = [tableRowUpdatesPass, tableCTAPass].filter(result => !result).length;
      console.log(`\n[TABLE] ❌ TESTS FAILED: ${failedCount}/2 table tests failed`);
      throw new Error(`${failedCount} out of 2 table tests failed.`);
    } else {
      console.log(`\n[TABLE] ✅ ALL TABLE TESTS PASSED!`);
    }
  });
});