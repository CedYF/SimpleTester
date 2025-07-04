# AdManage Test Server

Automated Playwright tests for AdManage application with real-time progress tracking.

## Features

- ✅ **Automated browser testing** with Playwright
- 📊 **Real-time progress tracking** with live UI updates
- 🔄 **GitHub Actions integration** for CI/CD
- 🐳 **Docker containerized** deployment
- 📈 **Health monitoring** endpoint
- ⏱️ **Elapsed time counter** (Vercel-style)

## Quick Start

1. Deploy to Railway using the button above
2. Configure environment variables
3. Access your test server at `https://your-app.railway.app`

## Endpoints

### Web UI
- `GET /` - Interactive test runner with progress bar

### API Endpoints
- `GET /run-admanage-tests` - Synchronous test execution (for CI/CD)
- `POST /run-admanage-tests-async` - Asynchronous test execution
- `GET /test-status/:id` - Check test progress
- `GET /health` - Health check endpoint

## Local Development

```bash
# Install dependencies
npm install

# Run server locally
npm start

# Run tests directly
npm test
```

Open http://localhost:3456 in your browser

## Environment Variables

- `PORT` - Server port (default: 3456)
- `HEADLESS` - Run tests in headless mode (default: true)
- `TEST_SPEED` - Test execution speed: FAST, NORMAL, SAFE (default: FAST)

## Test Categories

### ✅ Implemented Tests
- Gallery Mode inputs and global defaults
- Table Mode row updates and CTA changes
- Media Loader (3 items)
- Launch Status Switch toggle
- Special Testing toggle with modal

### 🔜 Coming Soon
- Relaunch Functionality
- Multi Format (Double/Triple Placement)
- Flexible & Carousel modes
- Account switching
- Multi Language support
- Template assignments
- External media loaders (Google Drive, Dropbox, Meta Library)

## Railway Deployment

The server uses Docker for consistent deployment. Railway will automatically:
1. Build the Docker image with Playwright v1.40.0
2. Install Chromium browser
3. Start the Express server on port 3456
4. Make endpoints available via HTTPS

## GitHub Actions Integration

Add your Railway URL as a GitHub secret:
- Name: `RAILWAY_SERVER_URL`
- Value: `https://your-app.railway.app`

The workflow will run tests on:
- Push to main branch
- Pull requests
- Daily at 2 AM UTC
- Manual trigger

## Troubleshooting

### Railway Deployment Issues
1. **Playwright not found**: Docker build will handle installation
2. **Tests timeout**: Increase `TEST_SPEED` to NORMAL or SAFE
3. **Memory issues**: Railway provides sufficient resources by default

### Test Failures
1. Check Railway logs: `railway logs`
2. Verify AdManage.ai is accessible
3. Ensure login credentials are correct
4. Check element selectors haven't changed

## Security Notes

- Never commit credentials to the repository
- Use environment variables for sensitive data
- Consider adding authentication to endpoints for production use
- Add rate limiting to prevent abuse