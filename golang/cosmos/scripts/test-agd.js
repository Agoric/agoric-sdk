#!/usr/bin/env node

// Test script to verify agd binary installation works correctly

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function main() {
  console.log('Testing agd binary installation...');

  try {
    // Test 1: Check if agd binary exists
    const agdPath = path.join(__dirname, '..', 'agd');
    const agdExists = fs.existsSync(agdPath);
    console.log(`✓ agd binary exists: ${agdExists}`);

    if (!agdExists) {
      console.error('✗ agd binary not found');
      process.exit(1);
    }

    // Test 2: Check if agd is executable
    const stats = fs.statSync(agdPath);
    const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
    console.log(`✓ agd is executable: ${isExecutable}`);

    if (!isExecutable) {
      console.error('✗ agd binary is not executable');
      process.exit(1);
    }

    // Test 3: Test agd version command
    const { stdout } = await runCommand(`${agdPath} version`);
    const version = stdout.trim();
    console.log(`✓ agd version: ${version}`);

    if (!version.match(/^\d+\.\d+\.\d+/)) {
      console.error('✗ Invalid version format');
      process.exit(1);
    }

    // Test 4: Test agd help command
    const { stdout: helpOutput } = await runCommand(`${agdPath} --help`);
    const hasHelpText = helpOutput.includes('Usage:') || helpOutput.includes('Available Commands:');
    console.log(`✓ agd help command works: ${hasHelpText}`);

    if (!hasHelpText) {
      console.error('✗ agd help command failed');
      process.exit(1);
    }

    // Test 5: Check platform-specific binary selection
    const platform = os.platform();
    const arch = os.arch();
    console.log(`✓ Platform: ${platform} ${arch}`);

    console.log('\n✅ All tests passed! agd binary is properly installed and functional.');
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}