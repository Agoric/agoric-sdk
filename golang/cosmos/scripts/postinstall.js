#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

// Detect the current platform and architecture
const platform = os.platform();
const arch = os.arch();

// Map Node.js platform and architecture to our binary names
function getBinaryName() {
  const platformMap = {
    'linux': 'linux',
    'darwin': 'darwin',
    'win32': 'windows'
  };
  
  const archMap = {
    'x64': 'amd64',
    'arm64': 'arm64'
  };
  
  const mappedPlatform = platformMap[platform];
  const mappedArch = archMap[arch];
  
  if (!mappedPlatform || !mappedArch) {
    throw new Error(`Unsupported platform: ${platform} ${arch}`);
  }
  
  const extension = platform === 'win32' ? '.exe' : '';
  return `agd-${mappedPlatform}-${mappedArch}${extension}`;
}

// Main installation function
function installBinary() {
  try {
    const binaryName = getBinaryName();
    const sourcePath = path.join(__dirname, '..', 'build', 'npm-binaries', binaryName);
    const destPath = path.join(__dirname, '..', 'agd' + (platform === 'win32' ? '.exe' : ''));
    
    // Check if the source binary exists
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Binary not found: ${sourcePath}`);
    }
    
    // Copy the binary to the root of the package
    fs.copyFileSync(sourcePath, destPath);
    
    // Make sure the binary is executable on Unix systems
    if (platform !== 'win32') {
      fs.chmodSync(destPath, '755');
    }
    
    console.log(`Successfully installed agd binary for ${platform} ${arch}`);
  } catch (error) {
    console.error('Error installing agd binary:', error.message);
    process.exit(1);
  }
}

// Only run if this script is being executed directly
if (require.main === module) {
  installBinary();
}

module.exports = { installBinary, getBinaryName };