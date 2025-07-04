# AdManage Launch Page Tester

A Playwright-based testing tool for AdManage.ai's launch page functionality.

## Overview

This project provides an automated test that:
1. Logs into AdManage.ai using provided credentials
2. Navigates to the launch page
3. Tests the textarea functionality by entering text
4. Verifies that the creative state updates correctly

## Features

- **Web Interface**: Clean UI to run tests and view real-time results
- **Real-time Updates**: Live test progress via WebSocket connections
- **Headless/Headed Mode**: Toggle browser visibility during tests
- **Express Server**: Backend API for test execution

## Project Structure

```
SimpleTester/
├── tests/
│   └── admanage-simple.js    # Main test file
├── public/
│   └── index.html            # Web interface
├── server.js                 # Express server with WebSocket support
├── playwright.config.js      # Playwright configuration
├── package.json             # Dependencies
└── dbConfig.js              # Database configuration (if needed)
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3456 in your browser

## Running Tests

### Via Web Interface
1. Navigate to http://localhost:3456
2. Click "Run Test" button
3. Check "Show Browser" to see the test execution
4. View real-time progress and results

### Via Command Line
```bash
# Default - shows browser
npm test

# Run in headless mode (no browser window)
npm run test:headless
```

## Test Details

The test performs the following steps:
1. Navigates to https://admanage.ai/sign_in_fb
2. Enters email and password
3. Submits login form
4. Waits for redirect to /launch page
5. Finds the `textarea#primaryText` element
6. Types "Cedric123" into the textarea
7. Verifies that the creative state (`pre#creativeState`) contains "Cedric123"

## Configuration

- **Port**: Default 3456 (configurable via PORT environment variable)
- **Headless Mode**: Toggle in web interface or via CLI flags
- **Timeout**: 30 seconds for page loads, configurable in playwright.config.js

## API Endpoints

- `GET /` - Server status and available endpoints
- `GET /health` - Health check
- `POST /run-tests` - Execute Playwright tests
- `GET /results/:id` - Get test results by ID
- WebSocket at `/` for real-time updates

## Requirements

- Node.js >= 18.0.0
- Chrome/Chromium browser