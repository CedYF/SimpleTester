import { test, expect } from '@playwright/test';
import { 
  testGalleryModeInputs, 
  testGalleryModeGlobalDefaults,
  testLaunchStatusSwitch 
} from '../lib/gallery-helpers.js';
import { testMediaLoader } from '../lib/media-loader-helpers.js';

test.describe('AdManage Gallery Mode Tests', () => {
  test('Gallery Mode Tests Only', async ({ page }) => {
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
    console.log('\n[GALLERY] ========== STARTING GALLERY MODE TEST ==========');
    console.log(`[GALLERY] [${((Date.now() - startTime) / 1000).toFixed(1)}s] Navigating to sign in page...`);
    
    await page.goto('https://admanage.ai/sign_in_fb', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Wait for login form to be ready
    console.log(`[GALLERY] [${((Date.now() - startTime) / 1000).toFixed(1)}s] Waiting for login form...`);
    const emailInput = await page.locator('#email-input-test');
    const passwordInput = await page.locator('#password-input-test');
    
    // Ensure elements are visible and ready
    await emailInput.waitFor({ state: 'visible', timeout: 30000 });
    await passwordInput.waitFor({ state: 'visible', timeout: 30000 });
    
    // Add small delay to ensure form is fully loaded
    await page.waitForTimeout(500);
    
    console.log(`[GALLERY] [${((Date.now() - startTime) / 1000).toFixed(1)}s] Filling in login credentials...`);
    
    // Fill credentials sequentially with verification
    await emailInput.clear();
    await emailInput.fill('nickferlando@gmail.com');
    
    await passwordInput.clear();
    await passwordInput.fill('Cedric123123!');
    
    // Verify values were entered
    const emailValue = await emailInput.inputValue();
    const passwordValue = await passwordInput.inputValue();
    
    if (!emailValue || !passwordValue) {
      console.log(`[GALLERY] [${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Login fields not filled properly, retrying...`);
      await emailInput.fill('nickferlando@gmail.com');
      await passwordInput.fill('Cedric123123!');
    }
    
    // Click sign in button
    console.log(`[GALLERY] [${((Date.now() - startTime) / 1000).toFixed(1)}s] Clicking sign in button...`);
    const signInButton = await page.locator('#sign-in-button-test');
    await signInButton.click();
    
    // Wait for navigation to launch page
    console.log(`[GALLERY] [${((Date.now() - startTime) / 1000).toFixed(1)}s] Waiting for redirect to launch page...`);
    await page.waitForURL('**/launch', { timeout: 60000 });
    console.log(`[GALLERY] [${((Date.now() - startTime) / 1000).toFixed(1)}s] ✓ Successfully logged in and reached launch page`);
    
    // Minimal wait for page stabilization
    await page.waitForTimeout(1000);
    
    // ========== GALLERY MODE TESTS ==========
    console.log('\n[GALLERY] ========== RUNNING GALLERY MODE TESTS ==========');
    
    // Test 1: Media Loader FIRST
    console.log('\n[GALLERY] --- Test 1: Media Loader (Creating Initial Rows) ---');
    const mediaLoaderPass = await testMediaLoader(page, startTime);
    
    if (mediaLoaderPass) {
      console.log(`[GALLERY] [${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Media Loader Test: PASSED`);
    } else {
      console.log(`[GALLERY] [${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Media Loader Test: FAILED`);
    }
    
    // Test 2: Gallery Mode Inputs
    console.log('\n[GALLERY] --- Test 2: Gallery Mode Input Fields ---');
    const galleryInputsPass = await testGalleryModeInputs(page, startTime);
    
    if (galleryInputsPass) {
      console.log(`[GALLERY] [${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Gallery Mode Input Test: PASSED`);
    } else {
      console.log(`[GALLERY] [${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Gallery Mode Input Test: FAILED`);
    }
    
    // Test 3: Launch Status Switch
    console.log('\n[GALLERY] --- Test 3: Launch Status Switch ---');
    const launchStatusPass = await testLaunchStatusSwitch(page, startTime);
    
    if (launchStatusPass) {
      console.log(`[GALLERY] [${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Launch Status Switch Test: PASSED`);
    } else {
      console.log(`[GALLERY] [${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Launch Status Switch Test: FAILED`);
    }
    
    // Test 4: Gallery Mode Global Defaults
    console.log('\n[GALLERY] --- Test 4: Gallery Mode Global Defaults ---');
    const galleryGlobalDefaultsPass = await testGalleryModeGlobalDefaults(page, startTime);
    
    if (galleryGlobalDefaultsPass) {
      console.log(`[GALLERY] [${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Gallery Mode Global Defaults Test: PASSED`);
    } else {
      console.log(`[GALLERY] [${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Gallery Mode Global Defaults Test: FAILED`);
    }
    
    // ========== FINAL SUMMARY ==========
    const endTime = Date.now();
    const executionTime = ((endTime - startTime) / 1000).toFixed(1);
    
    console.log('\n[GALLERY] ========== GALLERY MODE TEST SUMMARY ==========');
    console.log(`[GALLERY] [${executionTime}s] Total execution time: ${executionTime}s`);
    
    const allTestsPassed = mediaLoaderPass && galleryInputsPass && launchStatusPass && galleryGlobalDefaultsPass;
    
    if (!allTestsPassed) {
      const failedCount = [mediaLoaderPass, galleryInputsPass, launchStatusPass, galleryGlobalDefaultsPass].filter(result => !result).length;
      console.log(`\n[GALLERY] ❌ TESTS FAILED: ${failedCount}/4 gallery tests failed`);
      throw new Error(`${failedCount} out of 4 gallery tests failed.`);
    } else {
      console.log(`\n[GALLERY] ✅ ALL GALLERY TESTS PASSED!`);
    }
  });
});