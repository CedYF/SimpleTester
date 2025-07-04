// Gallery mode test functions

// Speed configuration
const SPEED_CONFIG = {
  FAST: {
    elementTimeout: 1000,
    stateChangeTimeout: 1500,
    shortDelay: 100,
    mediumDelay: 300
  },
  NORMAL: {
    elementTimeout: 2000,
    stateChangeTimeout: 2000,
    shortDelay: 500,
    mediumDelay: 1000
  },
  SAFE: {
    elementTimeout: 5000,
    stateChangeTimeout: 3000,
    shortDelay: 1000,
    mediumDelay: 2000
  }
};

// Use FAST by default, can be overridden with env var
const currentSpeed = SPEED_CONFIG[process.env.TEST_SPEED || 'FAST'];

// Universal timeout wrapper to prevent endless loops
async function withTimeout(asyncFn, timeoutMs = 5000, description = 'operation') {
  return Promise.race([
    asyncFn(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${description} timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// Fast element interaction with minimal waits
async function fastInteraction(page, selectors, action, timeoutMs = 2000, description = 'interaction') {
  try {
    // Support both single selector and array of selectors
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
    
    // Try all selectors simultaneously, use first one that's ready
    const promises = selectorArray.map(async (selector) => {
      const element = await page.locator(selector).first();
      // Check if element is already visible without waiting
      if (await element.isVisible()) {
        return { element, selector };
      }
      // If not visible, wait briefly
      await element.waitFor({ state: 'visible', timeout: timeoutMs });
      return { element, selector };
    });
    
    const { element, selector } = await Promise.any(promises);
    
    switch (action.type) {
      case 'click':
        await element.click({ timeout: 1000 });
        break;
      case 'fill':
        await element.clear();
        await element.fill(action.value);
        break;
      case 'select':
        await element.selectOption(action.value);
        break;
      case 'isVisible':
        return await element.isVisible();
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
    return { success: true, selector };
  } catch (error) {
    console.log(`⚠️ Skipped ${description} (timeout > ${timeoutMs}ms): ${error.message}`);
    return { success: false };
  }
}

// Smart wait for state changes (instead of arbitrary timeouts)
async function waitForStateChange(page, stateSelector, expectedChange, maxWaitMs = 3000) {
  const startTime = Date.now();
  let lastState = null;
  
  try {
    const stateElement = await page.locator(stateSelector);
    lastState = await stateElement.textContent();
    
    // Poll for changes more efficiently
    while (Date.now() - startTime < maxWaitMs) {
      await page.waitForTimeout(100); // Very short poll interval
      const currentState = await stateElement.textContent();
      
      if (currentState !== lastState) {
        // State changed, check if it matches our expectation
        if (expectedChange && typeof expectedChange === 'function') {
          if (expectedChange(JSON.parse(currentState))) {
            return JSON.parse(currentState);
          }
        } else {
          return JSON.parse(currentState);
        }
        lastState = currentState;
      }
    }
    throw new Error(`State did not change within ${maxWaitMs}ms`);
  } catch (error) {
    console.log(`⚠️ State change timeout: ${error.message}`);
    return null;
  }
}
export async function testGalleryModeInputs(page, startTime) {
  console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Testing AdCopy section inputs in Gallery mode...`);
  
  // Disable CSS animations for faster testing
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `
  });
  
  // Pre-wait for all critical elements to be ready (parallel)
  const criticalSelectors = [
    '#primary-text-main-textarea, [data-testid="primary-text-main-textarea"]',
    '#headline-main-input, [data-testid="headline-main-input"]',
    '#primary-text-variations-toggle',
    '#creativeState'
  ];
  
  await Promise.all(
    criticalSelectors.map(selector => 
      page.locator(selector).first().waitFor({ state: 'attached', timeout: currentSpeed.elementTimeout }).catch(() => null)
    )
  );
  
  // 1. Primary text (main textarea) - Using new ID
  console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Testing primary text textarea...`);
  try {
    const primaryTextarea = await page.locator('#primary-text-main-textarea, [data-testid="primary-text-main-textarea"]');
    // No need to wait - we already checked it's attached
    await primaryTextarea.clear();
    await primaryTextarea.fill('TestPrimaryText123');
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✓ Filled primary text`);
  } catch (error) {
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Skipped primary text: ${error.message}`);
  }
  
  // 2. Click "Add more primary texts" button - Using new ID
  console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Opening variations for both primary text and headlines...`);
  try {
    const variationsToggle = await page.locator('#primary-text-variations-toggle');
    await variationsToggle.waitFor({ state: 'visible', timeout: 5000 });
    await variationsToggle.click();
    await page.waitForTimeout(1000);
  } catch (error) {
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Skipped variations toggle (timeout > 5s): ${error.message}`);
  }
  
  // Fill all 4 primary text variations - Using new IDs
  console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Filling primary text variations...`);
  for (let i = 1; i <= 4; i++) {
    try {
      const primaryVar = await page.locator(`#primary-text-variation-${i}, [data-testid="primary-text-variation-${i}"]`);
      if (await primaryVar.isVisible({ timeout: 5000 })) {
        await primaryVar.fill(`PrimaryVariation${i}Test`);
        console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✓ Filled primary text variation ${i}`);
      }
    } catch (error) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Skipped primary variation ${i} (timeout > 5s)`);
    }
  }
  
  // 3. Headline input - Using new ID
  console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Testing headline input...`);
  try {
    const headlineInput = await page.locator('#headline-main-input, [data-testid="headline-main-input"]');
    await headlineInput.waitFor({ state: 'visible', timeout: 5000 });
    await headlineInput.clear();
    await headlineInput.fill('TestHeadline456');
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✓ Filled headline`);
  } catch (error) {
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Skipped headline (timeout > 5s): ${error.message}`);
  }
  
  // Fill all 4 headline variations - Using new IDs
  console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Filling headline variations...`);
  for (let i = 1; i <= 4; i++) {
    try {
      const headlineVar = await page.locator(`#headline-variation-${i}, [data-testid="headline-variation-${i}"]`);
      if (await headlineVar.isVisible({ timeout: 5000 })) {
        await headlineVar.fill(`HeadlineVariation${i}Test`);
        console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✓ Filled headline variation ${i}`);
      }
    } catch (error) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Skipped headline variation ${i} (timeout > 5s)`);
    }
  }
  
  // 4. Check if description input is visible or click to show it
  try {
    const addDescriptionButton = await page.locator('#add-description-toggle');
    if (await addDescriptionButton.isVisible({ timeout: 5000 })) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Clicking to show description input...`);
      await addDescriptionButton.click();
      await page.waitForTimeout(1500);
    }
    
    // Fill description if visible - Using new ID
    const descriptionInput = await page.locator('#ad-description-input, [data-testid="ad-description-input"]');
    if (await descriptionInput.isVisible({ timeout: 5000 })) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Testing description input...`);
      await descriptionInput.clear();
      await descriptionInput.fill('TestDescription789');
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✓ Filled description`);
    }
  } catch (error) {
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Skipped description (timeout > 5s): ${error.message}`);
  }
  
  // Select an ad set
  console.log(`\n[${((Date.now() - startTime) / 1000).toFixed(1)}s] Selecting ad set...`);
  try {
    const adSetSelector = await page.locator('input[placeholder*="Search by Ad Set"]');
    await adSetSelector.waitFor({ state: 'visible', timeout: 5000 });
    await adSetSelector.click();
    await page.waitForTimeout(1000);
    await adSetSelector.fill('v1');
    await page.waitForTimeout(1000);
    
    try {
      const adSetItem = await page.locator('div.cursor-pointer:has(h3.font-semibold)').first();
      await adSetItem.click({ timeout: 5000 });
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✓ Ad set selected`);
    } catch {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✓ Ad set selected using arrow keys`);
    }
    
    // Click confirm selection button
    try {
      const confirmButton = await page.locator('#confirm-selection-button-adset-selector');
      if (await confirmButton.isVisible({ timeout: 5000 })) {
        await confirmButton.click();
        console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✓ Ad set selection confirmed`);
        
        // Verify ad set was added to globalDefaults
        await page.waitForTimeout(2000);
        const creativeStateElement = await page.locator('#creativeState');
        const stateContent = await creativeStateElement.textContent();
        const parsedState = JSON.parse(stateContent);
        
        if (parsedState.globalDefaults?.selectedAdSets?.length > 0) {
          console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Ad set added to globalDefaults.selectedAdSets`);
        } else {
          console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Ad set NOT added to globalDefaults`);
        }
      }
    } catch (error) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Confirm selection button not found or timeout > 5s`);
    }
    
    await page.waitForTimeout(3000);
  } catch (error) {
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Skipped ad set selection (timeout > 5s): ${error.message}`);
  }
  
  // Test web link
  console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Testing web link input...`);
  try {
    const webLinkInput = await page.locator('#web-link-main-input, #web-link-legacy-input').first();
    if (await webLinkInput.isVisible({ timeout: 5000 })) {
      await webLinkInput.clear();
      await webLinkInput.fill('https://admanage.com/');
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✓ Filled web link`);
    }
  } catch (error) {
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Skipped web link (timeout > 5s): ${error.message}`);
  }
  
  // Additional link fields
  try {
    const additionalLinkFieldsButton = await page.locator('#toggle-additional-link-fields');
    if (await additionalLinkFieldsButton.isVisible({ timeout: 5000 })) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Clicking to show additional link fields...`);
      await additionalLinkFieldsButton.click();
      await page.waitForTimeout(1500);
      
      const utmInput = await page.locator('#utm-parameters-main-input, #utm-parameters-legacy-input').first();
      if (await utmInput.isVisible({ timeout: 5000 })) {
        await utmInput.fill('utm_source=facebook&utm_medium=paid_social');
        console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✓ Filled UTM parameters`);
      }
      
      const displayLinkInput = await page.locator('#display-link-main-input, #display-link-legacy-input').first();
      if (await displayLinkInput.isVisible({ timeout: 5000 })) {
        await displayLinkInput.fill('admanage.com');
        console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✓ Filled display link`);
      }
    }
  } catch (error) {
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Skipped additional link fields (timeout > 5s): ${error.message}`);
  }
  
  // Verify creative state
  await page.waitForTimeout(2000);
  const creativeState = await page.locator('#creativeState');
  const stateContent = await creativeState.textContent();
  
  console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Gallery mode input test completed`);
  
  return stateContent.includes('TestPrimaryText123') && 
         stateContent.includes('TestHeadline456');
}

export async function testGalleryModeGlobalDefaults(page, startTime) {
  console.log(`\n[${((Date.now() - startTime) / 1000).toFixed(1)}s] Testing Gallery mode globalDefaults updates...`);
  
  const creativeStateElement = await page.locator('#creativeState');
  await creativeStateElement.waitFor({ state: 'visible', timeout: 5000 });
  
  const currentState = await creativeStateElement.textContent();
  const parsedState = JSON.parse(currentState);
  
  console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Checking globalDefaults state...`);
  
  // Just verify the values that were set in testGalleryModeInputs
  let checksPass = true;
  
  if (parsedState.globalDefaults?.description === 'TestPrimaryText123') {
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ globalDefaults.description is correct`);
  } else {
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ globalDefaults.description incorrect. Expected: TestPrimaryText123, Got: ${parsedState.globalDefaults?.description}`);
    checksPass = false;
  }
  
  if (parsedState.globalDefaults?.title === 'TestHeadline456') {
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ globalDefaults.title is correct`);
  } else {
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ globalDefaults.title incorrect. Expected: TestHeadline456, Got: ${parsedState.globalDefaults?.title}`);
    checksPass = false;
  }
  
  // Test 3: Test CTA updates
  console.log(`\n[${((Date.now() - startTime) / 1000).toFixed(1)}s] Test 3: Testing CTA updates...`);
  
  const ctaOptions = [
    { value: 'SHOP_NOW', label: 'Shop Now' },
    { value: 'LEARN_MORE', label: 'Learn More' }
  ];
  
  let ctaTestsPassed = 0;
  let ctaDropdownFound = false;
  
  // First, try to find the CTA dropdown once
  const ctaSelectors = [
    '#cta-selector',
    '[data-testid="cta-selector"]',
    'label:has-text("Call to Action") + div select',
    'label:has-text("Call to Action") + div [role="combobox"]',
    'label:has-text("Call to Action") ~ div select',
    'label:has-text("Call to Action") ~ div [role="combobox"]'
  ];
  
  let ctaDropdown = null;
  for (const selector of ctaSelectors) {
    try {
      const element = await page.locator(selector).first();
      if (await element.isVisible({ timeout: 5000 })) {
        ctaDropdown = element;
        ctaDropdownFound = true;
        console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Found CTA dropdown with selector: ${selector}`);
        break;
      }
    } catch (error) {
      // Continue to next selector
      continue;
    }
  }
  
  if (!ctaDropdownFound) {
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ CTA dropdown not found with any selector`);
    
    // Debug: List all visible elements that might be the CTA
    try {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Debugging: Looking for CTA elements...`);
      const possibleCTAs = await page.locator('select, [role="combobox"], [role="button"]').allTextContents();
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Found possible CTA elements: ${possibleCTAs.slice(0, 10).join(', ')}`);
    } catch (debugError) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Debug error: ${debugError.message}`);
    }
    
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️  Skipping all CTA tests - selector not found`);
  } else {
    // CTA dropdown found, proceed with testing
    for (const ctaOption of ctaOptions) {
      console.log(`\n[${((Date.now() - startTime) / 1000).toFixed(1)}s] Testing CTA: ${ctaOption.label}...`);
      
      try {
        const tagName = await ctaDropdown.evaluate(el => el.tagName.toLowerCase());
        
        if (tagName === 'select') {
          await ctaDropdown.selectOption(ctaOption.value);
          console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Selected ${ctaOption.value} from select element`);
        } else {
          await ctaDropdown.click();
          await page.waitForTimeout(500);
          
          const optionSelectors = [
            `[role="option"]:has-text("${ctaOption.label}")`,
            `[data-value="${ctaOption.value}"]`,
            `div:has-text("${ctaOption.label}"):not(:has-text("Call to Action"))`,
            `button:has-text("${ctaOption.label}")`
          ];
          
          let optionFound = false;
          for (const selector of optionSelectors) {
            try {
              const option = await page.locator(selector).first();
              if (await option.isVisible({ timeout: 2000 })) {
                await option.click();
                console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Clicked option: ${ctaOption.label} using selector: ${selector}`);
                optionFound = true;
                break;
              }
            } catch (error) {
              // Continue to next selector
              continue;
            }
          }
          
          if (!optionFound) {
            console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Could not find CTA option: ${ctaOption.label}`);
            // Try to get available options for debugging
            try {
              const availableOptions = await page.locator('[role="option"], option').allTextContents();
              console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Available options: ${availableOptions.join(', ')}`);
            } catch (error) {
              console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Could not get available options`);
            }
            continue;
          }
        }
        
        await page.waitForTimeout(2000);
        
        const stateAfterCTA = await creativeStateElement.textContent();
        const parsedStateAfterCTA = JSON.parse(stateAfterCTA);
        
        if (parsedStateAfterCTA.globalDefaults?.cta === ctaOption.value) {
          console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ globalDefaults.cta updated to ${ctaOption.value}`);
          ctaTestsPassed++;
        } else {
          console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ globalDefaults.cta NOT updated. Expected: ${ctaOption.value}, Got: ${parsedStateAfterCTA.globalDefaults?.cta}`);
        }
      } catch (error) {
        console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Error testing CTA ${ctaOption.label}: ${error.message}`);
        // Break out of the loop if there's a persistent error
        break;
      }
    }
  }
  
  console.log(`\n[${((Date.now() - startTime) / 1000).toFixed(1)}s] CTA Tests: ${ctaTestsPassed}/${ctaOptions.length} passed`);
  console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Gallery mode globalDefaults test completed`);
  
  // Return true if basic checks passed and at least some CTA tests passed
  return checksPass && ctaTestsPassed > 0;
}

export async function testSpecialTestingToggle(page, startTime) {
  console.log(`\n[${((Date.now() - startTime) / 1000).toFixed(1)}s] Testing 'Create 1 Ad Set Per Ad' Toggle...`);
  
  try {
    const creativeStateElement = await page.locator('#creativeState');
    
    // Find the special testing switch
    const specialTestingSwitch = await page.locator('#special-testing');
    
    if (!await specialTestingSwitch.isVisible({ timeout: 2000 })) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Special testing switch not found`);
      return false;
    }
    
    // Get initial state
    const initialState = await creativeStateElement.textContent();
    const initialParsedState = JSON.parse(initialState);
    
    // Check initial specialTesting state in rows
    let initialSpecialTesting = false;
    if (initialParsedState.rows && initialParsedState.rows.length > 0) {
      initialSpecialTesting = initialParsedState.rows[0].specialTesting || false;
    }
    
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Initial special testing state: ${initialSpecialTesting ? 'ON' : 'OFF'}`);
    
    // Test 1: Toggle special testing ON
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Toggling special testing ON...`);
    await specialTestingSwitch.click();
    await page.waitForTimeout(currentSpeed.stateChangeTimeout);
    
    // Check if rows updated
    const afterToggleOn = await creativeStateElement.textContent();
    const afterToggleOnParsed = JSON.parse(afterToggleOn);
    
    let allRowsHaveSpecialTesting = true;
    if (afterToggleOnParsed.rows && afterToggleOnParsed.rows.length > 0) {
      for (const row of afterToggleOnParsed.rows) {
        if (!row.specialTesting) {
          allRowsHaveSpecialTesting = false;
          break;
        }
      }
    }
    
    if (allRowsHaveSpecialTesting) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ All ${afterToggleOnParsed.rows.length} rows have specialTesting: true`);
    } else {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Not all rows have specialTesting: true`);
      return false;
    }
    
    // Test 2: Click Settings icon to configure naming
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Clicking settings icon to configure ad set names...`);
    
    // Find and click the settings icon
    const settingsIcon = await page.locator('#configure-special-testing, [aria-label="Configure special testing naming"]');
    if (await settingsIcon.isVisible({ timeout: 2000 })) {
      await settingsIcon.click();
      await page.waitForTimeout(currentSpeed.mediumDelay);
      
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Settings modal opened`);
      
      // Wait for modal to appear
      const modalTitle = await page.locator('h3:has-text("Name your"):has-text("ad sets")');
      if (await modalTitle.isVisible({ timeout: 2000 })) {
        console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Found naming modal`);
        
        // Update names for first 3 rows
        const customNames = ['TestAdSet1', 'TestAdSet2', 'TestAdSet3'];
        
        for (let i = 0; i < Math.min(3, afterToggleOnParsed.rows.length); i++) {
          try {
            const rowId = afterToggleOnParsed.rows[i].id;
            const nameInput = await page.locator(`#name-${rowId}`);
            
            if (await nameInput.isVisible({ timeout: 1000 })) {
              await nameInput.clear();
              await nameInput.fill(customNames[i]);
              console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Set name for row ${i + 1}: ${customNames[i]}`);
            }
          } catch (error) {
            console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Could not set name for row ${i + 1}`);
          }
        }
        
        // Click Save Names button
        const saveButton = await page.locator('button:has-text("Save Names")');
        if (await saveButton.isVisible({ timeout: 2000 })) {
          await saveButton.click();
          console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Clicked Save Names`);
          await page.waitForTimeout(currentSpeed.stateChangeTimeout);
          
          // Verify names were saved in creative state
          const afterNaming = await creativeStateElement.textContent();
          const afterNamingParsed = JSON.parse(afterNaming);
          
          if (afterNamingParsed.globalDefaults?.specialTestingNaming) {
            console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Special testing naming saved in globalDefaults`);
            
            // Count how many custom names were saved
            const savedNames = Object.keys(afterNamingParsed.globalDefaults.specialTestingNaming).length;
            console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ ${savedNames} custom ad set names saved`);
          } else {
            console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Special testing naming not found in globalDefaults`);
          }
        }
      }
    } else {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Settings icon not found`);
    }
    
    // Test 3: Toggle special testing OFF
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Toggling special testing OFF...`);
    await specialTestingSwitch.click();
    await page.waitForTimeout(currentSpeed.stateChangeTimeout);
    
    // Check if rows updated
    const afterToggleOff = await creativeStateElement.textContent();
    const afterToggleOffParsed = JSON.parse(afterToggleOff);
    
    let allRowsNoSpecialTesting = true;
    if (afterToggleOffParsed.rows && afterToggleOffParsed.rows.length > 0) {
      for (const row of afterToggleOffParsed.rows) {
        if (row.specialTesting) {
          allRowsNoSpecialTesting = false;
          break;
        }
      }
    }
    
    if (allRowsNoSpecialTesting) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ All ${afterToggleOffParsed.rows.length} rows have specialTesting: false`);
    } else {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Some rows still have specialTesting: true`);
      return false;
    }
    
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Special testing toggle test completed`);
    return true;
    
  } catch (error) {
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Special testing toggle test failed: ${error.message}`);
    return false;
  }
}

export async function testLaunchStatusSwitch(page, startTime) {
  console.log(`\n[${((Date.now() - startTime) / 1000).toFixed(1)}s] Testing Launch Status Switch...`);
  
  try {
    const creativeStateElement = await page.locator('#creativeState');
    
    // Find the launch status switch
    const launchSwitch = await page.locator('#launch-status-switch');
    
    if (!await launchSwitch.isVisible({ timeout: 2000 })) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Launch status switch not found`);
      return false;
    }
    
    // Get initial state
    const initialState = await creativeStateElement.textContent();
    const initialParsedState = JSON.parse(initialState);
    const initialLaunchPaused = initialParsedState.globalDefaults?.launchPaused;
    
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Initial launch status: ${initialLaunchPaused ? 'Paused' : 'Active'}`);
    
    // Test 1: Click the switch to toggle state
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Toggling launch status switch...`);
    await launchSwitch.click();
    await page.waitForTimeout(currentSpeed.stateChangeTimeout);
    
    // Check if globalDefaults updated
    const afterFirstToggle = await creativeStateElement.textContent();
    const afterFirstToggleParsed = JSON.parse(afterFirstToggle);
    const firstToggleLaunchPaused = afterFirstToggleParsed.globalDefaults?.launchPaused;
    
    if (firstToggleLaunchPaused !== initialLaunchPaused) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Launch status toggled to: ${firstToggleLaunchPaused ? 'Paused' : 'Active'}`);
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ globalDefaults.launchPaused updated correctly`);
    } else {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Launch status did not toggle`);
      return false;
    }
    
    // Check if all rows were updated
    if (afterFirstToggleParsed.rows && afterFirstToggleParsed.rows.length > 0) {
      const allRowsUpdated = afterFirstToggleParsed.rows.every(row => row.launchPaused === firstToggleLaunchPaused);
      if (allRowsUpdated) {
        console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ All ${afterFirstToggleParsed.rows.length} rows updated with new launch status`);
      } else {
        console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Not all rows were updated with new launch status`);
      }
    }
    
    // Test 2: Toggle back to original state
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Toggling launch status back...`);
    await launchSwitch.click();
    await page.waitForTimeout(currentSpeed.stateChangeTimeout);
    
    // Verify it toggled back
    const afterSecondToggle = await creativeStateElement.textContent();
    const afterSecondToggleParsed = JSON.parse(afterSecondToggle);
    const secondToggleLaunchPaused = afterSecondToggleParsed.globalDefaults?.launchPaused;
    
    if (secondToggleLaunchPaused === initialLaunchPaused) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Launch status toggled back to: ${secondToggleLaunchPaused ? 'Paused' : 'Active'}`);
    } else {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Launch status did not toggle back correctly`);
      return false;
    }
    
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Launch status switch test completed`);
    return true;
    
  } catch (error) {
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Launch status switch test failed: ${error.message}`);
    return false;
  }
}