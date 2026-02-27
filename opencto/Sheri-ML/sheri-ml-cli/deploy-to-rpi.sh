#!/bin/bash
# 🍓 SheriML CLI — Deploy to Raspberry Pi via GCP Tunnel
# This script automates the deployment through the reverse SSH tunnel

set -e

echo "🍓 SheriML CLI Deployment Script"
echo "================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

GCP_IP="34.133.133.219"
GCP_USER="peter"
RPI_PORT="2222"
RPI_USER="admin"

echo -e "${YELLOW}Step 1:${NC} Packaging CLI..."
cd /home/peter
tar czf sheri-ml-cli.tar.gz sheri-ml-cli/{dist,src,package.json,package-lock.json,README.md,BRAND.md,CHANGES.md,RPI-DEPLOY.md,test-cli.sh,tsconfig.json} 2>/dev/null || {
    echo -e "${RED}✗ Failed to create tarball${NC}"
    exit 1
}
echo -e "${GREEN}✓ Created sheri-ml-cli.tar.gz ($(du -h sheri-ml-cli.tar.gz | cut -f1))${NC}"

echo ""
echo -e "${YELLOW}Step 2:${NC} Copying to GCP server..."
scp -o StrictHostKeyChecking=no sheri-ml-cli.tar.gz ${GCP_USER}@${GCP_IP}:~/ && {
    echo -e "${GREEN}✓ Uploaded to GCP${NC}"
} || {
    echo -e "${RED}✗ Failed to upload to GCP${NC}"
    echo "Make sure you have SSH access to ${GCP_USER}@${GCP_IP}"
    exit 1
}

echo ""
echo -e "${YELLOW}Step 3:${NC} Transferring to RPI through tunnel..."
ssh -t ${GCP_USER}@${GCP_IP} "scp -P ${RPI_PORT} sheri-ml-cli.tar.gz ${RPI_USER}@localhost:~/" && {
    echo -e "${GREEN}✓ Transferred to RPI${NC}"
} || {
    echo -e "${RED}✗ Failed to transfer to RPI${NC}"
    echo "Make sure the reverse tunnel is active on GCP"
    exit 1
}

echo ""
echo -e "${YELLOW}Step 4:${NC} Installing on RPI..."
ssh -t ${GCP_USER}@${GCP_IP} "ssh -p ${RPI_PORT} ${RPI_USER}@localhost 'bash -s'" << 'ENDSSH'
set -e

echo "🍓 Installing SheriML CLI on Raspberry Pi..."
echo ""

# Extract
cd ~
tar xzf sheri-ml-cli.tar.gz
cd sheri-ml-cli

# Check Node.js
echo "Checking Node.js version..."
NODE_VERSION=$(node --version 2>/dev/null || echo "not installed")
if [[ "$NODE_VERSION" == "not installed" ]]; then
    echo "❌ Node.js not installed. Please install Node.js 18+ first:"
    echo "   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "   sudo apt-get install -y nodejs"
    exit 1
fi
echo "✓ Node.js: $NODE_VERSION"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install --omit=dev --quiet

# Build (if needed)
echo ""
echo "Building CLI..."
npm run build

# Install globally
echo ""
echo "Installing globally..."
sudo npm uninstall -g @heysalad/sheri-ml-cli 2>/dev/null || true
sudo npm install -g . --quiet

# Verify
echo ""
echo "Verifying installation..."
INSTALLED_VERSION=$(sheri --version 2>/dev/null || echo "failed")
if [[ "$INSTALLED_VERSION" == "0.2.0" ]]; then
    echo "✅ SheriML CLI installed successfully!"
else
    echo "❌ Installation verification failed"
    exit 1
fi

# Test
echo ""
echo "Testing installation..."
sheri --models | head -5

echo ""
echo "🍓 Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Configure API key: sheri config"
echo "  2. Test connection: sheri mcp"
echo "  3. Run a query: sheri \"test\""
echo ""
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}════════════════════════════════════════${NC}"
    echo -e "${GREEN}🍓 Deployment successful!${NC}"
    echo -e "${GREEN}════════════════════════════════════════${NC}"
    echo ""
    echo "To connect to RPI and test:"
    echo "  ssh -t ${GCP_USER}@${GCP_IP} \"ssh -p ${RPI_PORT} ${RPI_USER}@localhost\""
    echo ""
    echo "Then run:"
    echo "  sheri config"
    echo "  sheri --models"
else
    echo ""
    echo -e "${RED}Deployment failed. Check the output above for errors.${NC}"
    exit 1
fi
