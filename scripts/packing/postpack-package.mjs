#!/usr/bin/env node
/**
 * @file Unified postpack script for all packages.
 *
 * This script handles cleanup after npm pack completes:
 * 1. Restores .ts files that were deleted during prepack (via git checkout)
 * 2. Removes generated .d.ts, .d.ts.map, .js, and .mts files (via git clean)
 *
 * Usage: yarn run -T postpack-package (from any package directory)
 */
import { execSync } from 'node:child_process';
import path from 'node:path';

// Package directory from INIT_CWD (set by yarn) or current directory
const packageDir = process.env.INIT_CWD || process.cwd();

console.log(`postpack-package: ${path.basename(packageDir)}`);

// Step 1: Restore any .ts files that were deleted during prepack
// git checkout only affects tracked files, so untracked generated files stay deleted
console.log('  → restoring .ts files');
try {
  execSync("git checkout -- '*.ts'", {
    cwd: packageDir,
    stdio: 'inherit',
  });
} catch {
  // May fail if no .ts files were tracked, which is fine
}

// Step 2: Remove generated declaration files and .js files
// git clean only removes untracked files, so committed files are safe
console.log('  → cleaning generated files');
try {
  execSync("git clean -f '*.d.ts' '*.d.ts.map' '*.js' '*.mts' '*.d.mts.map' ", {
    cwd: packageDir,
    stdio: 'inherit',
  });
} catch {
  // May fail if nothing to clean, which is fine
}

console.log('postpack-package: done');
