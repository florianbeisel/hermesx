#!/bin/bash

# Exit on error
set -e

# Configuration
VM_NAME="Windows11-Build"
VM_RAM="4096"  # 4GB
VM_CORES="4"
VM_STORAGE="64"  # 64GB
SHARED_DIR="$HOME/UTM/shared"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}Setting up UTM build environment...${NC}"

# Check if UTM is installed
if ! command -v utm &> /dev/null; then
    echo -e "${RED}UTM is not installed. Please install it from https://mac.getutm.app${NC}"
    exit 1
fi

# Create shared directory if it doesn't exist
echo "Creating shared directory..."
mkdir -p "$SHARED_DIR"

# Print setup instructions
echo -e "\n${GREEN}UTM VM Setup Instructions:${NC}"
echo "1. Download Windows 11 ARM64 ISO"
echo "2. Create new VM in UTM with these settings:"
echo "   - Name: $VM_NAME"
echo "   - RAM: ${VM_RAM}MB"
echo "   - CPU Cores: $VM_CORES"
echo "   - Storage: ${VM_STORAGE}GB"
echo "3. Mount $SHARED_DIR as a shared folder"
echo -e "\n${GREEN}After Windows is installed:${NC}"
echo "1. Install Node.js 20 (ARM64)"
echo "2. Install Git"
echo "3. Install Visual Studio Build Tools"
echo "4. Clone the repository"
echo "5. Run scripts/build-windows.ps1"

# Create a README in the shared directory
cat > "$SHARED_DIR/README.md" << EOL
# Windows Build Environment

This directory is shared between your Mac host and the Windows VM.
Build artifacts will be placed here when running the build script.

## Setup Checklist

- [ ] Windows 11 ARM64 installed
- [ ] Node.js 20 installed
- [ ] Git installed
- [ ] Visual Studio Build Tools installed
- [ ] Repository cloned
- [ ] Build script tested

## Build Instructions

1. Start the VM
2. Open PowerShell as Administrator
3. Navigate to the repository
4. Run: \`./scripts/build-windows.ps1\`

Build artifacts will appear in this directory.
EOL

echo -e "\n${GREEN}Setup complete!${NC}"
echo "See $SHARED_DIR/README.md for next steps" 