#!/bin/bash

echo "Building SYMBIONT Extension..."
echo "=============================="

# Clean dist directory
echo "Cleaning dist directory..."
rm -rf dist/*

# Build workers
echo "Building workers..."
npm run build:workers

# Build main bundles
echo "Building main bundles..."
npm run build

# Copy offscreen.html
echo "Copying offscreen.html..."
cp public/offscreen.html dist/offscreen.html 2>/dev/null || echo "offscreen.html not found in public/, creating..."

# Create offscreen.html if it doesn't exist
if [ ! -f dist/offscreen.html ]; then
  cat > dist/offscreen.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SYMBIONT Offscreen</title>
</head>
<body>
  <canvas id="offscreen-canvas"></canvas>
  <script src="background/OffscreenWebGL.js"></script>
</body>
</html>
EOF
fi

# Verify the build
echo ""
echo "Verifying build..."
node check-extension.js

echo ""
echo "Build complete!"