# AdManage Test Server Deployment Guide

## Railway Deployment

### Prerequisites
- Railway account
- GitHub repository with this code

### Deployment Steps

1. **Connect GitHub to Railway**
   - Go to Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose this repository

2. **Configure Environment Variables**
   ```
   PORT=3456
   NODE_ENV=production
   HEADLESS=true
   TEST_SPEED=FAST
   ```

3. **Add Build Command** (in Railway settings)
   ```bash
   npm install && npx playwright install chromium
   ```

4. **Set Start Command**
   ```bash
   npm start
   ```

### Available Endpoints

#### 1. Health Check
```bash
GET https://your-app.railway.app/health
```

#### 2. Run AdManage Tests
```bash
GET https://your-app.railway.app/run-admanage-tests
```

**Response Example (Success):**
```json
{
  "success": true,
  "timestamp": "2024-01-07T10:30:00.000Z",
  "summary": {
    "totalImplementedTests": 5,
    "passedTests": 5,
    "failedTests": 0
  },
  "testResults": {
    "Gallery Mode": "✅ PASSED",
    "Row Testing (Table Mode)": "✅ PASSED",
    "Special Testing": "✅ PASSED",
    "Media Loader": "✅ PASSED",
    "Launch Status Switch": "✅ PASSED"
  },
  "executionTime": "36.4",
  "message": "All AdManage tests passed successfully!"
}
```

**Response Example (Failure):**
```json
{
  "success": false,
  "timestamp": "2024-01-07T10:30:00.000Z",
  "summary": {
    "totalImplementedTests": 5,
    "passedTests": 4,
    "failedTests": 1
  },
  "testResults": {
    "Gallery Mode": "✅ PASSED",
    "Row Testing (Table Mode)": "❌ FAILED",
    "Special Testing": "✅ PASSED",
    "Media Loader": "✅ PASSED",
    "Launch Status Switch": "✅ PASSED"
  },
  "executionTime": "36.4",
  "message": "Some tests failed",
  "failureDetails": "Details about what failed..."
}
```

### GitHub Actions Integration

1. **Add Railway URL as GitHub Secret**
   - Go to your GitHub repo settings
   - Navigate to Secrets and variables > Actions
   - Add new secret: `RAILWAY_SERVER_URL`
   - Value: `https://your-app.railway.app`

2. **The workflow will:**
   - Run tests on push to main
   - Run tests on pull requests
   - Run tests daily at 2 AM UTC
   - Allow manual trigger

### Testing the Endpoint

#### Using curl:
```bash
curl https://your-app.railway.app/run-admanage-tests
```

#### Using the test script:
```bash
./test-endpoint.sh https://your-app.railway.app
```

### Monitoring

- Railway provides logs at: https://railway.app/project/[project-id]/logs
- GitHub Actions results at: https://github.com/[owner]/[repo]/actions

### Troubleshooting

1. **Tests timeout on Railway**
   - Increase memory allocation in Railway settings
   - Ensure Playwright dependencies are installed

2. **Authentication errors**
   - Make sure test credentials are set as environment variables
   - Check if AdManage is accessible from Railway servers

3. **GitHub Action fails**
   - Verify `RAILWAY_SERVER_URL` secret is set correctly
   - Check Railway logs for server errors

### Security Notes

- The `/run-admanage-tests` endpoint is public by default
- Consider adding authentication if needed:
  ```javascript
  app.get('/run-admanage-tests', authenticateRequest, async (req, res) => {
    // ... test logic
  });
  ```

- Add rate limiting to prevent abuse:
  ```javascript
  const rateLimit = require('express-rate-limit');
  const testLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // limit each IP to 5 requests per windowMs
  });
  
  app.get('/run-admanage-tests', testLimiter, async (req, res) => {
    // ... test logic
  });
  ```