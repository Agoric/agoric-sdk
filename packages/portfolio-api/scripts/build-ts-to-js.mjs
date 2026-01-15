#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file Transform .ts files to .js using ts-blank-space for NPM publishing.
 *
 * This script finds all .ts files in src/ (excluding .d.ts files) and generates
 * corresponding .js files by stripping TypeScript type annotations.
 *
 * The codebase uses a "type-stripping" approach where TypeScript files contain
 * only erasable syntax (type annotations, not enums or namespaces). This allows
 * the same source to work:
 * - At development time: via ts-blank-space/register node loader
 * - At publish time: by generating .js files with types stripped
 *
 * Usage:
 *   scripts/build-ts-to-js.mjs
 *   scripts/build-ts-to-js.mjs --check  # verify files are current
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tsBlankSpace from 'ts-blank-space';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

const args = process.argv.slice(2);
const checkMode = args.includes('--check');

/**
 * Recursively find all .ts files in a directory.
 * Excludes .d.ts declaration files.
 */
async function findTsFiles(dir = srcDir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  /** @type {string[]} */
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findTsFiles(fullPath)));
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.d.ts')
    ) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

/**
 * Transform a .ts file to .js by stripping types.
 *
 * @param {string} tsPath - Path to the .ts file
 * @returns {Promise<string>} - Transformed .js content
 */
async function transformFile(tsPath) {
  const tsContent = await fs.readFile(tsPath, 'utf-8');

  /** @type {string[]} */
  const errors = [];
  /** @type {string} */
  const jsContent = tsBlankSpace(tsContent, node => {
    const text = node.getText?.() || String(node);
    errors.push(`Unsupported syntax at ${tsPath}: ${text.slice(0, 50)}`);
  });

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return jsContent;
}

async function main() {
  const tsFiles = await findTsFiles();

  if (tsFiles.length === 0) {
    console.log('No .ts files found in src/');
    return;
  }

  console.log(`Found ${tsFiles.length} .ts file(s) to transform`);

  let hasChanges = false;

  for (const tsPath of tsFiles) {
    const jsPath = tsPath.replace(/\.ts$/, '.js');
    const relPath = path.relative(srcDir, tsPath);

    const jsContent = await transformFile(tsPath);

    if (checkMode) {
      // Check if .js file exists and matches
      try {
        const existingJs = await fs.readFile(jsPath, 'utf-8');
        if (existingJs !== jsContent) {
          console.error(
            `MISMATCH: ${relPath} -> ${relPath.replace(/\.ts$/, '.js')}`,
          );
          hasChanges = true;
        }
      } catch {
        console.error(`MISSING: ${relPath.replace(/\.ts$/, '.js')}`);
        hasChanges = true;
      }
    } else {
      // Write the .js file
      await fs.writeFile(jsPath, jsContent);
      console.log(`  ${relPath} -> ${relPath.replace(/\.ts$/, '.js')}`);
    }
  }

  if (checkMode && hasChanges) {
    console.error(
      '\nRun "scripts/build-ts-to-js.mjs" to update generated files',
    );
    process.exit(1);
  }

  if (!checkMode) {
    console.log('Done!');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
