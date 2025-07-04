# Use Microsoft's official Playwright image
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Install Playwright browsers
RUN npx playwright install chromium

# Set environment variables
ENV NODE_ENV=production
ENV HEADLESS=true
ENV TEST_SPEED=FAST

# Expose port
EXPOSE 3456

# Start the application
CMD ["npm", "start"]