#!/bin/bash
# SYMBIONT Extension Testing Helper Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     SYMBIONT Extension Testing Environment            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Docker is running"

# Build the extension
echo ""
print_info "Building extension..."
npm run build > /dev/null 2>&1
print_status "Extension built successfully"

# Check if container is already running
if docker ps | grep -q symbiont-chrome-test; then
    print_info "Container is already running"
    CONTAINER_RUNNING=true
else
    CONTAINER_RUNNING=false
fi

# Start or restart container
if [ "$CONTAINER_RUNNING" = false ]; then
    echo ""
    print_info "Starting Docker container..."
    docker-compose -f docker-compose.test.yml up -d > /dev/null 2>&1
    print_status "Container started"
    
    # Wait for container to be ready
    print_info "Waiting for Chrome to start (10 seconds)..."
    sleep 10
else
    echo ""
    print_info "Restarting container to pick up changes..."
    docker-compose -f docker-compose.test.yml restart > /dev/null 2>&1
    sleep 5
fi

# Check container status
if docker ps | grep -q symbiont-chrome-test; then
    print_status "Container is running"
else
    print_error "Container failed to start"
    echo ""
    echo "Check logs with: docker logs symbiont-chrome-test"
    exit 1
fi

# Get container info
CONTAINER_ID=$(docker ps | grep symbiont-chrome-test | awk '{print $1}')
print_info "Container ID: $CONTAINER_ID"

# Check if running in Gitpod
if [ -n "$GITPOD_WORKSPACE_URL" ]; then
    # Extract workspace URL and create public URL
    WORKSPACE_URL=$(echo $GITPOD_WORKSPACE_URL | sed 's/https:\/\///')
    PUBLIC_URL="https://6901-${WORKSPACE_URL}"
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              🚀 TESTING ENVIRONMENT READY              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Access Chrome via noVNC:${NC}"
    echo -e "${YELLOW}$PUBLIC_URL${NC}"
    echo ""
    echo -e "${BLUE}Password:${NC} symbiont123"
    echo ""
    echo -e "${BLUE}Extension Location:${NC} /extension/dist"
    echo ""
else
    # Local environment
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              🚀 TESTING ENVIRONMENT READY              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Access Chrome via noVNC:${NC}"
    echo -e "${YELLOW}http://localhost:6901${NC}"
    echo ""
    echo -e "${BLUE}Password:${NC} symbiont123"
    echo ""
    echo -e "${BLUE}Extension Location:${NC} /extension/dist"
    echo ""
fi

# Instructions
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo "1. Open the URL above in your browser"
echo "2. Enter password: symbiont123"
echo "3. In Chrome, go to: chrome://extensions/"
echo "4. Enable 'Developer mode' (top-right toggle)"
echo "5. Click 'Load unpacked'"
echo "6. Navigate to: /extension/dist"
echo "7. Click 'Select' to load the extension"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  View logs:    docker logs -f symbiont-chrome-test"
echo "  Stop:         docker-compose -f docker-compose.test.yml down"
echo "  Rebuild:      npm run build && ./test-extension.sh"
echo ""
echo -e "${GREEN}Happy Testing! 🧪${NC}"
echo ""
