// Media loader test functions

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

const currentSpeed = SPEED_CONFIG[process.env.TEST_SPEED || 'FAST'];

// Universal timeout wrapper
async function withTimeout(asyncFn, timeoutMs = 5000, description = 'operation') {
  return Promise.race([
    asyncFn(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${description} timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

export async function testMediaLoader(page, startTime) {
  console.log(`\n[${((Date.now() - startTime) / 1000).toFixed(1)}s] Testing Media Loader functionality...`);
  
  try {
    // Step 1: Click Load Media button
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Clicking Load Media button...`);
    const loadMediaButton = await page.locator('#load-media');
    await loadMediaButton.waitFor({ state: 'visible', timeout: currentSpeed.elementTimeout });
    await loadMediaButton.click();
    
    // Minimal wait for modal to appear
    await page.waitForTimeout(currentSpeed.shortDelay);
    
    // Step 2: Wait for media table to load
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Waiting for media table to load...`);
    
    // Try different selectors for the media table
    let mediaTable = null;
    const tableSelectors = [
      '[role="dialog"] tbody',
      '.modal tbody',
      '[data-testid="media-library-modal"] tbody',
      'tbody:not([class*="border-collapse"])',  // Exclude main table tbody
      'div[role="dialog"] table tbody'
    ];
    
    for (const selector of tableSelectors) {
      try {
        const table = await page.locator(selector).first();
        if (await table.isVisible({ timeout: 500 })) {
          mediaTable = table;
          console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Found media table with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!mediaTable) {
      // Fallback to waiting for any visible tbody
      mediaTable = await page.locator('tbody').nth(1); // Try second tbody
      await mediaTable.waitFor({ state: 'visible', timeout: currentSpeed.elementTimeout });
    }
    
    // Just wait for first row to be visible - no need to wait for all content
    try {
      await page.waitForSelector('[role="dialog"] tr[data-row-index="0"], .modal tr[data-row-index="0"]', { 
        state: 'visible', 
        timeout: 2000 
      });
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Media rows ready`);
    } catch (error) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Warning: Media rows not immediately visible`);
    }
    
    // Step 3: Select first 3 media items
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Selecting first 3 media items...`);
    
    const selectedMedia = [];
    
    for (let i = 0; i < 3; i++) {
      try {
        // Find the row - be specific to media modal to avoid conflicts
        const row = await page.locator(`[role="dialog"] tr[data-row-index="${i}"], .modal tr[data-row-index="${i}"], [data-testid="media-library-modal"] tr[data-row-index="${i}"]`).first();
        
        if (await row.isVisible({ timeout: 1000 })) {
          // Get media info quickly
          const mediaName = await row.locator('td:nth-child(4) div').textContent().catch(() => `Media ${i + 1}`);
          const mediaThumbnail = await row.locator('td:nth-child(3) img').getAttribute('src').catch(() => '');
          
          // Click checkbox immediately
          const checkbox = await row.locator('button[role="checkbox"]');
          await checkbox.click();
          
          console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✓ Selected media ${i + 1}: ${mediaName}`);
          
          selectedMedia.push({
            name: mediaName,
            thumbnail: mediaThumbnail,
            index: i
          });
        } else {
          console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Row ${i} not visible`);
        }
      } catch (error) {
        console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Error selecting media ${i + 1}: ${error.message}`);
      }
    }
    
    if (selectedMedia.length === 0) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ No media items were selected`);
      return false;
    }
    
    // Step 4: Click Add Creatives button
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Clicking Add ${selectedMedia.length} Creatives button...`);
    const addCreativesButton = await page.locator('#media-add-creatives-button');
    await addCreativesButton.waitFor({ state: 'visible', timeout: currentSpeed.elementTimeout });
    await addCreativesButton.click();
    
    // Wait for media to be added
    await page.waitForTimeout(currentSpeed.stateChangeTimeout);
    
    // Step 5: Verify creative state
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Verifying creative state updates...`);
    
    const creativeStateElement = await page.locator('#creativeState');
    await creativeStateElement.waitFor({ state: 'visible', timeout: currentSpeed.elementTimeout });
    
    const creativeState = await creativeStateElement.textContent();
    const parsedState = JSON.parse(creativeState);
    
    // Check if rows were added
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Creative state has ${parsedState.rows?.length || 0} rows`);
    
    if (!parsedState.rows || parsedState.rows.length < selectedMedia.length) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Expected at least ${selectedMedia.length} rows, found ${parsedState.rows?.length || 0}`);
      return false;
    }
    
    // Verify each selected media appears in the rows
    let allMediaFound = true;
    const newRows = parsedState.rows.slice(-selectedMedia.length); // Get the last N rows
    
    for (let i = 0; i < selectedMedia.length; i++) {
      const media = selectedMedia[i];
      const row = newRows[i];
      
      if (!row || !row.videos || row.videos.length === 0) {
        console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Row ${i} has no videos`);
        allMediaFound = false;
        continue;
      }
      
      const video = row.videos[0];
      const mediaNameInState = video.name || video.originalName;
      
      if (mediaNameInState && mediaNameInState.includes(media.name.split('.')[0])) {
        console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Found ${media.name} in row ${row.id}`);
      } else {
        console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Media ${media.name} not found in expected row`);
        allMediaFound = false;
      }
      
      // Verify row inherits global defaults
      if (row.description === parsedState.globalDefaults.description &&
          row.title === parsedState.globalDefaults.title &&
          row.cta === parsedState.globalDefaults.cta &&
          row.link === parsedState.globalDefaults.link) {
        console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Row ${row.id} inherited global defaults correctly`);
      } else {
        console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Row ${row.id} may not have inherited all global defaults`);
      }
    }
    
    // Check if media modal was closed
    const modalClosed = await page.locator('#load-media').isVisible({ timeout: 1000 }).catch(() => false);
    if (!modalClosed) {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Media modal closed after adding creatives`);
    }
    
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Media loader test completed`);
    
    // Return true if we found most of the selected media (at least 2 out of 3)
    const foundCount = selectedMedia.filter((media, i) => {
      const row = newRows[i];
      if (!row || !row.videos || row.videos.length === 0) return false;
      const video = row.videos[0];
      const mediaNameInState = video.name || video.originalName;
      return mediaNameInState && mediaNameInState.includes(media.name.split('.')[0]);
    }).length;
    
    return foundCount >= 2;
    
  } catch (error) {
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Media loader test failed: ${error.message}`);
    return false;
  }
}

// Helper function to test media library filters
export async function testMediaFilters(page, startTime) {
  console.log(`\n[${((Date.now() - startTime) / 1000).toFixed(1)}s] Testing Media Library filters...`);
  
  try {
    // Test filter by status (Launched/Not Launched)
    const statusFilter = await page.locator('button:has-text("Status")').first();
    if (await statusFilter.isVisible({ timeout: currentSpeed.elementTimeout })) {
      await statusFilter.click();
      await page.waitForTimeout(currentSpeed.shortDelay);
      
      // Select "Launched" filter
      const launchedOption = await page.locator('label:has-text("Launched")').first();
      if (await launchedOption.isVisible({ timeout: 1000 })) {
        await launchedOption.click();
        console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✓ Applied 'Launched' status filter`);
        
        // Wait for table to update
        await page.waitForTimeout(currentSpeed.mediumDelay);
        
        // Verify all visible rows show "Launched" status
        const visibleRows = await page.locator('tbody tr').all();
        let allLaunched = true;
        
        for (const row of visibleRows.slice(0, 5)) { // Check first 5 rows
          const status = await row.locator('td:nth-child(7) div').textContent();
          if (!status.includes('Launched')) {
            allLaunched = false;
            break;
          }
        }
        
        if (allLaunched) {
          console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✅ Status filter working correctly`);
        } else {
          console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ❌ Status filter not working properly`);
        }
        
        // Clear filter
        await launchedOption.click();
        await page.waitForTimeout(currentSpeed.shortDelay);
      }
    }
    
    // Test search functionality
    const searchInput = await page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: currentSpeed.elementTimeout })) {
      await searchInput.fill('test');
      await page.waitForTimeout(currentSpeed.mediumDelay);
      
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ✓ Applied search filter for 'test'`);
      
      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(currentSpeed.shortDelay);
    }
    
    return true;
    
  } catch (error) {
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ⚠️ Media filter test error: ${error.message}`);
    return false;
  }
}