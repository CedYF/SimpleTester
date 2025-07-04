import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { chromium, firefox, webkit } from 'playwright';
import { spawn } from 'child_process';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3456;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Store test results and active connections
const testResults = new Map();
const activeConnections = new Map();

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('subscribe', (testId) => {
    socket.join(`test-${testId}`);
    activeConnections.set(testId, socket.id);
    
    // Send current status if test is already running
    const currentResult = testResults.get(testId);
    if (currentResult) {
      socket.emit('test-update', {
        testId,
        ...currentResult
      });
    }
  });
  
  socket.on('unsubscribe', (testId) => {
    socket.leave(`test-${testId}`);
    activeConnections.delete(testId);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Clean up any subscriptions
    for (const [testId, socketId] of activeConnections.entries()) {
      if (socketId === socket.id) {
        activeConnections.delete(testId);
      }
    }
  });
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Playwright Test Server is running with WebSocket support',
    endpoints: {
      '/health': 'Health check',
      '/run-tests': 'Run Playwright tests',
      '/run-script': 'Run a Playwright script',
      '/results/:id': 'Get test results',
      '/screenshot': 'Take a screenshot of a URL',
      'WebSocket': 'Connect to socket.io for real-time updates'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Run AdManage tests endpoint for GitHub Actions
app.get('/run-admanage-tests', async (req, res) => {
  console.log('Starting AdManage tests via HTTP request...');
  
  try {
    // Run the tests using child process
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execPromise = promisify(exec);
    
    // Set environment variables for fast headless execution
    const env = {
      ...process.env,
      HEADLESS: 'true',
      TEST_SPEED: 'FAST',
      CI: 'true'
    };
    
    // Execute the test command
    const { stdout, stderr } = await execPromise('npm run test:headless', {
      cwd: __dirname,
      env,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    // Parse the output to check if all tests passed
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
    
    // If tests failed, include failure details
    if (!allTestsPassed) {
      response.failureDetails = output.match(/FAILURE ANALYSIS[\s\S]*?RECOMMENDED ACTIONS/)?.[0] || 'No failure details available';
    }
    
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

// Run Playwright tests from a test file
app.post('/run-tests', upload.single('testFile'), async (req, res) => {
  const testId = Date.now().toString();
  const { testPath, config } = req.body;
  
  try {
    // If a file was uploaded, use it; otherwise use the provided path
    let testFilePath;
    if (req.file) {
      testFilePath = req.file.path;
    } else if (testPath) {
      testFilePath = path.join(__dirname, 'tests', testPath);
    } else {
      return res.status(400).json({ error: 'No test file provided' });
    }

    // Start test execution
    testResults.set(testId, { status: 'running', startTime: new Date() });
    
    res.json({ 
      testId, 
      status: 'started',
      message: 'Tests are running in the background' 
    });

    // Run tests asynchronously
    runPlaywrightTests(testId, testFilePath, config);
    
    // Clean up uploaded file after a delay
    if (req.file) {
      setTimeout(() => fs.unlink(req.file.path).catch(() => {}), 60000);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run a custom Playwright script
app.post('/run-script', async (req, res) => {
  const { script, browser = 'chromium' } = req.body;
  
  if (!script) {
    return res.status(400).json({ error: 'No script provided' });
  }

  try {
    const result = await executePlaywrightScript(script, browser);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Take a screenshot
app.post('/screenshot', async (req, res) => {
  const { url, browser = 'chromium', options = {} } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const browserInstance = await getBrowser(browser).launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browserInstance.newPage();
    
    // Set viewport if specified
    if (options.viewport) {
      await page.setViewportSize(options.viewport);
    }
    
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Wait for specific selector if provided
    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector);
    }
    
    const screenshot = await page.screenshot({
      fullPage: options.fullPage || false,
      type: options.type || 'png'
    });
    
    await browserInstance.close();
    
    // Return base64 encoded screenshot
    res.json({
      success: true,
      screenshot: screenshot.toString('base64'),
      mimeType: `image/${options.type || 'png'}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get test results
app.get('/results/:id', (req, res) => {
  const result = testResults.get(req.params.id);
  
  if (!result) {
    return res.status(404).json({ error: 'Test results not found' });
  }
  
  res.json(result);
});

// Helper function to get browser instance
function getBrowser(browserName) {
  switch (browserName) {
    case 'firefox':
      return firefox;
    case 'webkit':
      return webkit;
    default:
      return chromium;
  }
}

// Execute Playwright script
async function executePlaywrightScript(script, browserName) {
  const browser = await getBrowser(browserName).launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Create a function from the script string
    const scriptFunction = new Function('page', 'browser', 'context', script);
    
    // Execute the script
    const result = await scriptFunction(page, browser, context);
    
    return result;
  } finally {
    await browser.close();
  }
}

// Run Playwright tests using the test runner with real-time updates
function runPlaywrightTests(testId, testFilePath, config = {}) {
  const args = ['playwright', 'test', testFilePath];
  
  // Add configuration options
  if (config.headed) args.push('--headed');
  // if (config.browser) args.push('--browser', config.browser);
  if (config.workers) args.push('--workers', config.workers.toString());
  if (config.retries) args.push('--retries', config.retries.toString());
  
  // Use both dot and json reporters for progress and results
  args.push('--reporter', 'dot,json');
  
  const testProcess = spawn('npx', args, {
    env: { ...process.env, FORCE_COLOR: '0' },
    shell: true
  });
  
  let output = '';
  let errorOutput = '';
  let lastProgress = 0;
  let progressEmitted = false;
  
  // Emit initial status
  io.to(`test-${testId}`).emit('test-update', {
    testId,
    status: 'running',
    progress: 0,
    message: 'Starting tests...'
  });
  
  testProcess.stdout.on('data', (data) => {
    const chunk = data.toString();
    output += chunk;
    
    // Parse progress from output
    const progressMatch = chunk.match(/(\d+)\/(\d+)/);
    let progress;
    if (progressMatch) {
      const [, completed, total] = progressMatch;
      progress = Math.round((parseInt(completed) / parseInt(total)) * 100);
    } else {
      progress = lastProgress; // fallback to last known progress
    }
    if (progress > lastProgress) {
      lastProgress = progress;
      progressEmitted = true;
      io.to(`test-${testId}`).emit('test-update', {
        testId,
        status: 'running',
        progress: progress || 0,
        message: `Running tests: ${progressMatch ? progressMatch[1] : '?'} / ${progressMatch ? progressMatch[2] : '?'}`,
        currentTest: extractCurrentTest(chunk)
      });
    }
    // Always emit at least one progress update if nothing matches
    if (!progressEmitted) {
      io.to(`test-${testId}`).emit('test-update', {
        testId,
        status: 'running',
        progress: 0,
        message: 'Running...'
      });
      progressEmitted = true;
    }
    
    // Emit live output
    io.to(`test-${testId}`).emit('test-output', {
      testId,
      output: chunk,
      type: 'stdout'
    });
  });
  
  testProcess.stderr.on('data', (data) => {
    const chunk = data.toString();
    errorOutput += chunk;
    
    // Emit error output
    io.to(`test-${testId}`).emit('test-output', {
      testId,
      output: chunk,
      type: 'stderr'
    });
  });
  
  testProcess.on('close', (code) => {
    const endTime = new Date();
    const result = testResults.get(testId);
    
    try {
      // Try to parse JSON output
      const jsonOutput = output.match(/\{[\s\S]*\}/)?.[0];
      const testReport = jsonOutput ? JSON.parse(jsonOutput) : null;
      
      const finalResult = {
        ...result,
        status: code === 0 ? 'passed' : 'failed',
        endTime,
        duration: endTime - result.startTime,
        exitCode: code,
        report: testReport,
        output: output.substring(0, 10000), // Limit output size
        errors: errorOutput,
        progress: 100
      };
      
      testResults.set(testId, finalResult);
      
      // Emit final result
      io.to(`test-${testId}`).emit('test-complete', {
        testId,
        ...finalResult
      });
    } catch (error) {
      const errorResult = {
        ...result,
        status: 'error',
        endTime,
        duration: endTime - result.startTime,
        error: error.message,
        output,
        errors: errorOutput,
        progress: 100
      };
      
      testResults.set(testId, errorResult);
      
      io.to(`test-${testId}`).emit('test-complete', {
        testId,
        ...errorResult
      });
    }
  });
}

// Helper function to extract current test name from output
function extractCurrentTest(output) {
  const testMatch = output.match(/Running.*?[\s]+(.*?)$/m);
  return testMatch ? testMatch[1] : null;
}

// Start server
httpServer.listen(PORT, () => {
  console.log(`Playwright Test Server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});