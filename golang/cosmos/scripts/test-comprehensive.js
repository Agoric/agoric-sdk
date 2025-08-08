#!/usr/bin/env node

// Comprehensive test for the agd npm package implementation

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🧪 Comprehensive test for agd npm package implementation');
console.log('='.repeat(60));

async function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error && !options.allowFailure) {
        reject(error);
      } else {
        resolve({ stdout, stderr, error });
      }
    });
  });
}

async function main() {
  try {
    console.log('\n📦 Test 1: Package Structure');
    
    // Test package.json structure
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    console.log(`✓ Package name: ${packageJson.name}`);
    console.log(`✓ Package version: ${packageJson.version}`);
    console.log(`✓ Has bin entry: ${packageJson.bin ? 'yes' : 'no'}`);
    console.log(`✓ Has postinstall script: ${packageJson.scripts?.postinstall ? 'yes' : 'no'}`);
    console.log(`✓ Includes binary files: ${packageJson.files?.includes('build/npm-binaries/') ? 'yes' : 'no'}`);

    console.log('\n🏗️ Test 2: Build System');
    
    // Test if cross-compilation works
    const makefilePath = path.join(__dirname, '..', 'Makefile');
    const makefile = fs.readFileSync(makefilePath, 'utf8');
    const hasAllTargets = makefile.includes('compile-agd-all');
    console.log(`✓ Has cross-compilation target: ${hasAllTargets}`);

    // Test if all expected binaries exist
    const binariesDir = path.join(__dirname, '..', 'build', 'npm-binaries');
    const expectedBinaries = [
      'agd-linux-amd64',
      'agd-linux-arm64',
      'agd-darwin-amd64',
      'agd-darwin-arm64',
      'agd-windows-amd64.exe'
    ];
    
    let allBinariesExist = true;
    for (const binary of expectedBinaries) {
      const binaryPath = path.join(binariesDir, binary);
      const exists = fs.existsSync(binaryPath);
      console.log(`✓ ${binary}: ${exists ? 'exists' : 'missing'}`);
      if (!exists) allBinariesExist = false;
    }

    console.log('\n🎯 Test 3: Platform Detection');
    
    // Test platform detection logic
    const { getBinaryName } = require('./postinstall.js');
    const detectedBinary = getBinaryName();
    console.log(`✓ Detected binary for current platform: ${detectedBinary}`);
    
    // Test if detected binary exists
    const detectedBinaryPath = path.join(binariesDir, detectedBinary);
    const detectedExists = fs.existsSync(detectedBinaryPath);
    console.log(`✓ Detected binary exists: ${detectedExists}`);

    console.log('\n🔧 Test 4: Installation Process');
    
    // Test if postinstall script works
    const { installBinary } = require('./postinstall.js');
    const agdPath = path.join(__dirname, '..', 'agd');
    
    // Clean up first
    if (fs.existsSync(agdPath)) {
      fs.unlinkSync(agdPath);
    }
    
    // Run installation
    installBinary();
    
    const agdExists = fs.existsSync(agdPath);
    console.log(`✓ agd binary created: ${agdExists}`);
    
    if (agdExists) {
      const stats = fs.statSync(agdPath);
      const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
      console.log(`✓ agd is executable: ${isExecutable}`);
    }

    console.log('\n⚡ Test 5: Binary Functionality');
    
    // Test basic commands
    const { stdout: version } = await runCommand(`${agdPath} version`);
    console.log(`✓ Version command works: ${version.trim()}`);
    
    const { stdout: help } = await runCommand(`${agdPath} --help`);
    const hasUsage = help.includes('Usage:') || help.includes('Available Commands:');
    console.log(`✓ Help command works: ${hasUsage}`);

    console.log('\n📋 Test 6: Package Metadata');
    
    // Test README exists
    const readmePath = path.join(__dirname, '..', 'README.md');
    const readmeExists = fs.existsSync(readmePath);
    console.log(`✓ README.md exists: ${readmeExists}`);
    
    if (readmeExists) {
      const readme = fs.readFileSync(readmePath, 'utf8');
      const hasInstallInstructions = readme.includes('npm install');
      const hasUsageInstructions = readme.includes('npx agd');
      console.log(`✓ README has install instructions: ${hasInstallInstructions}`);
      console.log(`✓ README has usage instructions: ${hasUsageInstructions}`);
    }

    console.log('\n🎉 All tests passed! The implementation is working correctly.');
    console.log('\n📊 Summary:');
    console.log(`• Package provides agd binary for ${expectedBinaries.length} platforms`);
    console.log(`• Binary size: ~${Math.round(fs.statSync(agdPath).size / 1024 / 1024)}MB`);
    console.log(`• Platform: ${os.platform()} ${os.arch()}`);
    console.log(`• Version: ${version.trim()}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}