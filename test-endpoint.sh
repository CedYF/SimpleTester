#!/bin/bash

# Test the AdManage tests endpoint
# Usage: ./test-endpoint.sh [server-url]

SERVER_URL=${1:-"http://localhost:3456"}

echo "🧪 Testing AdManage endpoint at: $SERVER_URL"
echo "================================================"

# Make the request
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$SERVER_URL/run-admanage-tests")

# Extract HTTP code and body
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

# Parse JSON using basic tools (works without jq)
success=$(echo "$body" | grep -o '"success":[^,]*' | cut -d: -f2)
message=$(echo "$body" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
execution_time=$(echo "$body" | grep -o '"executionTime":"[^"]*"' | cut -d'"' -f4)

echo "HTTP Status: $http_code"
echo "Success: $success"
echo "Message: $message"
echo "Execution Time: ${execution_time}s"
echo ""

# Pretty print the JSON if jq is available
if command -v jq &> /dev/null; then
    echo "Full Response:"
    echo "$body" | jq '.'
else
    echo "Full Response (install jq for pretty printing):"
    echo "$body"
fi

# Exit with appropriate code
if [ "$success" = "true" ]; then
    echo ""
    echo "✅ Tests passed!"
    exit 0
else
    echo ""
    echo "❌ Tests failed!"
    exit 1
fi