import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const app = express();
const PORT = process.env.PORT || 3456;
const execPromise = promisify(exec);

// Store test results
const testResults = new Map();

// Middleware
app.use(express.json());

// Homepage with loading UI
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>AdManage Test Runner</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        .button {
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .button:hover { background: #0056b3; }
        .button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .loading {
          display: none;
          margin-top: 20px;
        }
        .progress-bar {
          width: 100%;
          height: 20px;
          background: #e0e0e0;
          border-radius: 10px;
          overflow: hidden;
          margin: 10px 0;
        }
        .progress-fill {
          height: 100%;
          background: #4caf50;
          width: 0%;
          transition: width 0.3s;
        }
        .test-output {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 15px;
          margin-top: 20px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          max-height: 400px;
          overflow-y: auto;
          white-space: pre-wrap;
        }
        .test-item {
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .test-item:last-child { border-bottom: none; }
        .success { color: #28a745; }
        .failed { color: #dc3545; }
        .pending { color: #ffc107; }
        .coming-soon { color: #6c757d; }
        .spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #007bff;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          display: inline-block;
          margin-right: 10px;
          vertical-align: middle;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🧪 AdManage Test Runner</h1>
        <p>Click the button below to run all AdManage tests</p>
        
        <button id="runTests" class="button" onclick="runTests()">Run Tests</button>
        
        <div id="loading" class="loading">
          <h3><span class="spinner"></span>Running Tests... <span id="timer" style="background: #e0e0e0; padding: 2px 8px; border-radius: 4px; font-size: 14px; margin-left: 10px;">0s</span></h3>
          <div class="progress-bar">
            <div id="progressFill" class="progress-fill"></div>
          </div>
          <p id="status">Initializing tests...</p>
          <div id="testList"></div>
        </div>
        
        <div id="output" class="test-output" style="display:none;"></div>
      </div>

      <script>
        let testId = null;
        let startTime = null;
        let timerInterval = null;
        
        function updateTimer() {
          if (startTime) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            document.getElementById('timer').textContent = elapsed + 's';
          }
        }
        
        async function runTests() {
          const button = document.getElementById('runTests');
          const loading = document.getElementById('loading');
          const output = document.getElementById('output');
          const status = document.getElementById('status');
          const testList = document.getElementById('testList');
          const progressFill = document.getElementById('progressFill');
          
          button.disabled = true;
          loading.style.display = 'block';
          output.style.display = 'none';
          output.textContent = '';
          testList.innerHTML = '';
          progressFill.style.width = '0%';
          
          // Start timer
          startTime = Date.now();
          document.getElementById('timer').textContent = '0s';
          timerInterval = setInterval(updateTimer, 100);
          
          try {
            // Start the tests
            const response = await fetch('/run-admanage-tests-async', {
              method: 'POST'
            });
            const data = await response.json();
            testId = data.testId;
            
            // Poll for updates
            const pollInterval = setInterval(async () => {
              try {
                const statusResponse = await fetch(\`/test-status/\${testId}\`);
                const statusData = await statusResponse.json();
                
                // Update progress
                if (statusData.progress) {
                  progressFill.style.width = statusData.progress + '%';
                  status.textContent = statusData.message || 'Running tests...';
                }
                
                // Update test results
                if (statusData.testResults) {
                  updateTestList(statusData.testResults);
                }
                
                // Check if complete
                if (statusData.status === 'completed') {
                  clearInterval(pollInterval);
                  clearInterval(timerInterval);
                  loading.style.display = 'none';
                  button.disabled = false;
                  
                  // Show results
                  output.style.display = 'block';
                  output.innerHTML = formatResults(statusData);
                }
              } catch (error) {
                console.error('Poll error:', error);
              }
            }, 1000);
            
          } catch (error) {
            clearInterval(timerInterval);
            loading.style.display = 'none';
            button.disabled = false;
            output.style.display = 'block';
            output.textContent = 'Error: ' + error.message;
          }
        }
        
        function updateTestList(testResults) {
          const testList = document.getElementById('testList');
          let html = '<div style="margin-top: 20px;">';
          
          for (const [name, result] of Object.entries(testResults)) {
            let className = 'pending';
            let icon = '⏳';
            
            if (result === '✅ PASSED') {
              className = 'success';
              icon = '✅';
            } else if (result === '❌ FAILED') {
              className = 'failed';
              icon = '❌';
            } else if (result === '🔜 COMING SOON') {
              className = 'coming-soon';
              icon = '🔜';
            }
            
            html += \`<div class="test-item \${className}">\${icon} \${name}: \${result}</div>\`;
          }
          
          html += '</div>';
          testList.innerHTML = html;
        }
        
        function formatResults(data) {
          let html = '<h3>Test Results</h3>';
          
          if (data.success) {
            html += '<p class="success">✅ All tests passed!</p>';
          } else {
            html += \`<p class="failed">❌ \${data.message || 'Some tests failed'}</p>\`;
          }
          
          html += \`<p>Execution time: \${data.executionTime}s</p>\`;
          
          // Show test results in a nice format
          if (data.testResults) {
            html += '<div style="margin: 20px 0;">';
            html += '<h4>Test Summary:</h4>';
            
            // Separate implemented vs coming soon
            const implemented = {};
            const comingSoon = {};
            
            for (const [name, result] of Object.entries(data.testResults)) {
              if (result === '🔜 COMING SOON') {
                comingSoon[name] = result;
              } else {
                implemented[name] = result;
              }
            }
            
            // Show implemented tests
            if (Object.keys(implemented).length > 0) {
              html += '<div style="margin: 10px 0;"><strong>Implemented Tests:</strong></div>';
              for (const [name, result] of Object.entries(implemented)) {
                const className = result.includes('PASSED') ? 'success' : 'failed';
                html += \`<div class="test-item \${className}">\${name}: \${result}</div>\`;
              }
            }
            
            // Show failure details if any
            if (data.failureDetails) {
              html += '<div style="margin: 20px 0; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px;">';
              html += '<h4 style="color: #856404; margin-top: 0;">Failure Analysis</h4>';
              html += '<pre style="white-space: pre-wrap; color: #856404; font-size: 12px; font-family: monospace;">' + data.failureDetails.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>';
              html += '</div>';
            }
            
            // Show coming soon tests in collapsed view
            if (Object.keys(comingSoon).length > 0) {
              html += '<details style="margin: 20px 0;">';
              html += '<summary style="cursor: pointer; font-weight: bold;">Coming Soon Tests (' + Object.keys(comingSoon).length + ')</summary>';
              html += '<div style="margin-top: 10px;">';
              for (const [name, result] of Object.entries(comingSoon)) {
                html += \`<div class="test-item coming-soon">\${name}: \${result}</div>\`;
              }
              html += '</div>';
              html += '</details>';
            }
            
            html += '</div>';
          }
          
          // Debug info in collapsed view
          html += '<details style="margin-top: 20px;">';
          html += '<summary style="cursor: pointer;">Debug Information</summary>';
          html += '<pre style="margin-top: 10px; max-height: 400px; overflow-y: auto;">' + JSON.stringify(data, null, 2) + '</pre>';
          html += '</details>';
          
          return html;
        }
      </script>
    </body>
    </html>
  `);
});

// Async endpoint to start tests
app.post('/run-admanage-tests-async', async (req, res) => {
  const testId = Date.now().toString();
  
  // Initialize test status
  testResults.set(testId, {
    status: 'running',
    progress: 0,
    message: 'Starting tests...',
    startTime: new Date()
  });
  
  // Start tests in background
  runTestsInBackground(testId);
  
  res.json({ testId, status: 'started' });
});

// Get test status
app.get('/test-status/:id', (req, res) => {
  const result = testResults.get(req.params.id);
  if (!result) {
    return res.status(404).json({ error: 'Test not found' });
  }
  res.json(result);
});

// Synchronous endpoint for GitHub Actions
app.get('/run-admanage-tests', async (req, res) => {
  console.log('Starting AdManage tests via HTTP request...');
  
  try {
    // Execute the test command with proper environment
    const { stdout, stderr } = await execPromise('npx playwright test tests/admanage-main.test.js --reporter=list', {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HEADLESS: 'true',
        TEST_SPEED: 'FAST',
        CI: 'true',
        FORCE_COLOR: '0'
      },
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    // Parse the output
    const output = stdout + stderr;
    const allTestsPassed = output.includes('ALL IMPLEMENTED TESTS PASSED');
    const testSummaryMatch = output.match(/ALL IMPLEMENTED TESTS PASSED \((\d+)\/(\d+)\)/);
    const failureMatch = output.match(/TESTS FAILED: (\d+)\/(\d+) tests failed/);
    
    // Extract test results
    const testResultsSection = output.match(/Test Results:[\s\S]*?━+/);
    let testResults = {};
    
    if (testResultsSection) {
      const lines = testResultsSection[0].split('\n');
      lines.forEach(line => {
        const match = line.match(/\s*(.+?):\s*(✅ PASSED|❌ FAILED|🔜 COMING SOON)/);
        if (match) {
          testResults[match[1].trim()] = match[2].trim();
        }
      });
    }
    
    // Build response
    const response = {
      success: allTestsPassed,
      timestamp: new Date().toISOString(),
      summary: {
        totalImplementedTests: testSummaryMatch ? parseInt(testSummaryMatch[2]) : 0,
        passedTests: testSummaryMatch ? parseInt(testSummaryMatch[1]) : 0,
        failedTests: failureMatch ? parseInt(failureMatch[1]) : 0
      },
      testResults,
      executionTime: output.match(/Total execution time: ([\d.]+)s/)?.[1] || 'unknown',
      message: allTestsPassed ? 'All AdManage tests passed successfully!' : 'Some tests failed'
    };
    
    // Set appropriate status code
    res.status(allTestsPassed ? 200 : 500).json(response);
    
  } catch (error) {
    console.error('Error running AdManage tests:', error);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
      message: 'Failed to execute tests'
    });
  }
});

// Background test runner
async function runTestsInBackground(testId) {
  const result = testResults.get(testId);
  
  try {
    // Helper to update progress
    const updateProgress = (progress, message, testResultsData = null) => {
      const currentResult = testResults.get(testId);
      testResults.set(testId, { 
        ...currentResult, 
        progress, 
        message,
        ...(testResultsData && { testResults: testResultsData })
      });
    };
    
    updateProgress(5, 'Starting test runner...');
    
    // Create a child process to run tests and capture real-time output
    const { spawn } = await import('child_process');
    const testProcess = spawn('npx', ['playwright', 'test', 'tests/admanage-main.test.js', '--reporter=list'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HEADLESS: 'true',
        TEST_SPEED: 'FAST',
        CI: 'true',
        FORCE_COLOR: '0'
      }
    });
    
    let output = '';
    let currentTestResults = {};
    
    // Process stdout in real-time
    testProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      console.log(chunk); // Log to Railway console
      
      // Parse progress from output with timestamps
      const timestampMatch = chunk.match(/\[(\d+\.\d+)s\]/);
      const currentTime = timestampMatch ? timestampMatch[1] : null;
      
      if (chunk.includes('Navigating to sign in page')) {
        updateProgress(10, 'Navigating to login page...');
      } else if (chunk.includes('Waiting for login form')) {
        updateProgress(12, 'Waiting for login form...');
      } else if (chunk.includes('Filling in login credentials')) {
        updateProgress(15, 'Logging in...');
      } else if (chunk.includes('Clicking sign in button')) {
        updateProgress(17, 'Submitting credentials...');
      } else if (chunk.includes('Waiting for redirect')) {
        updateProgress(18, 'Authenticating...');
      } else if (chunk.includes('Successfully logged in')) {
        updateProgress(20, 'Login successful! Starting tests...');
      } else if (chunk.includes('Test 1: Media Loader')) {
        updateProgress(25, 'Running Media Loader test...');
      } else if (chunk.includes('Clicking Load Media button')) {
        updateProgress(28, 'Loading media items...');
      } else if (chunk.includes('Media Loader Test: PASSED')) {
        updateProgress(35, '✅ Media Loader test passed!');
      } else if (chunk.includes('Test 2: Gallery Mode Input')) {
        updateProgress(40, 'Testing Gallery Mode inputs...');
      } else if (chunk.includes('Gallery Mode Input Test: PASSED')) {
        updateProgress(45, '✅ Gallery inputs test passed!');
      } else if (chunk.includes('Test 3: Launch Status Switch')) {
        updateProgress(50, 'Testing Launch Status switch...');
      } else if (chunk.includes('Launch Status Switch Test: PASSED')) {
        updateProgress(55, '✅ Launch Status test passed!');
      } else if (chunk.includes('Test 4: Special Testing Toggle')) {
        updateProgress(60, 'Testing Special Testing toggle...');
      } else if (chunk.includes('Special Testing Toggle Test: PASSED')) {
        updateProgress(65, '✅ Special Testing test passed!');
      } else if (chunk.includes('Test 5: Gallery Mode Global Defaults')) {
        updateProgress(70, 'Testing Global Defaults...');
      } else if (chunk.includes('Gallery Mode Global Defaults Test: PASSED')) {
        updateProgress(75, '✅ Global Defaults test passed!');
      } else if (chunk.includes('Switching to Table View')) {
        updateProgress(80, 'Switching to Table Mode...');
      } else if (chunk.includes('Test 6: Table Mode Row Updates')) {
        updateProgress(85, 'Testing Table Mode rows...');
      } else if (chunk.includes('Table Mode Row Updates Test: PASSED')) {
        updateProgress(88, '✅ Table rows test passed!');
      } else if (chunk.includes('Test 7: Table Mode CTA')) {
        updateProgress(90, 'Testing Table Mode CTAs...');
      } else if (chunk.includes('Table Mode CTA Test: PASSED')) {
        updateProgress(93, '✅ Table CTA test passed!');
      } else if (chunk.includes('FINAL TEST SUMMARY')) {
        updateProgress(95, 'Generating final report...');
      } else if (chunk.includes('ALL IMPLEMENTED TESTS PASSED')) {
        updateProgress(98, '🎉 All tests passed!');
      }
      
      // Update test results in real-time
      const testMatch = chunk.match(/\s*(.+?):\s*(✅ PASSED|❌ FAILED|🔜 COMING SOON)/);
      if (testMatch) {
        currentTestResults[testMatch[1].trim()] = testMatch[2].trim();
        const currentState = testResults.get(testId);
        updateProgress(currentState.progress, currentState.message, currentTestResults);
      }
    });
    
    testProcess.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    // Wait for process to complete
    await new Promise((resolve, reject) => {
      testProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Test process exited with code ${code}`));
        }
      });
      
      testProcess.on('error', reject);
    });
    
    const allTestsPassed = output.includes('ALL IMPLEMENTED TESTS PASSED');
    
    // Extract test results
    const testResultsSection = output.match(/Test Results:[\s\S]*?━+/);
    let testResultsData = {};
    
    if (testResultsSection) {
      const lines = testResultsSection[0].split('\n');
      lines.forEach(line => {
        const match = line.match(/\s*(.+?):\s*(✅ PASSED|❌ FAILED|🔜 COMING SOON)/);
        if (match) {
          testResultsData[match[1].trim()] = match[2].trim();
        }
      });
    }
    
    // Extract failure details
    let failureDetails = null;
    const failureAnalysisMatch = output.match(/========== FAILURE ANALYSIS ==========[\s\S]*?========== RECOMMENDED ACTIONS ==========/);
    if (failureAnalysisMatch) {
      failureDetails = failureAnalysisMatch[0];
    }
    
    // Extract test counts
    const testFailureMatch = output.match(/❌ TESTS FAILED: (\d+)\/(\d+) tests failed/);
    const failedCount = testFailureMatch ? parseInt(testFailureMatch[1]) : 0;
    const totalCount = testFailureMatch ? parseInt(testFailureMatch[2]) : 0;
    
    // Update final result
    testResults.set(testId, {
      ...result,
      status: 'completed',
      progress: 100,
      success: allTestsPassed,
      testResults: currentTestResults || testResultsData,
      executionTime: output.match(/Total execution time: ([\d.]+)s/)?.[1] || Math.floor((Date.now() - new Date(result.startTime)) / 1000),
      message: allTestsPassed ? 'All tests passed!' : `${failedCount} of ${totalCount} tests failed`,
      failureDetails: failureDetails,
      failedCount: failedCount,
      totalCount: totalCount,
      output: output.substring(0, 10000) // Increase output size for better debugging
    });
    
  } catch (error) {
    testResults.set(testId, {
      ...result,
      status: 'completed',
      progress: 100,
      success: false,
      error: error.message,
      message: 'Failed to execute tests'
    });
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`AdManage Test Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});