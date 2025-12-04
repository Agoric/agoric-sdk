#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * Embed Ymax machine data into ymax-visualizer.html
 * Usage:
 *   scripts/gen-visualizer-data.mts         # Update the HTML
 *   scripts/gen-visualizer-data.mts --check # Verify HTML matches generated data
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ymaxMachine,
  type YmaxSpec,
} from '../src/model/generated/ymax-machine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTML_PATH = path.resolve(__dirname, '../docs/ymax-visualizer.html');

const SCRIPT_TAG_START =
  '<script id="ymax-machine-data" type="application/json">';
const SCRIPT_TAG_END = '</script>';
const MARKER_REGEX =
  /<script id="ymax-machine-data" type="application\/json">[\s\S]*?<\/script>/;

const args = process.argv.slice(2);
const checkMode = args.includes('--check');

async function main() {
  const spec: YmaxSpec = ymaxMachine;

  // Convert to JSON (compact but readable)
  const jsonData = JSON.stringify(spec, null, 2);

  // Create the script tag content
  const scriptTag = `${SCRIPT_TAG_START}\n${jsonData}\n${SCRIPT_TAG_END}`;

  // Read HTML
  const htmlContent = await fs.readFile(HTML_PATH, 'utf8');

  // Check if marker exists
  if (!MARKER_REGEX.test(htmlContent)) {
    console.error(`Error: Could not find data script tag in ${HTML_PATH}`);
    console.error(`Expected: ${SCRIPT_TAG_START}...${SCRIPT_TAG_END}`);
    process.exitCode = 1;
    return;
  }

  // Replace the script tag content
  const newHtmlContent = htmlContent.replace(MARKER_REGEX, scriptTag);

  if (checkMode) {
    // Check mode: verify HTML matches
    if (htmlContent === newHtmlContent) {
      console.log('✓ ymax-visualizer.html is up to date');
    } else {
      console.error(`Error: ymax-visualizer.html is out of date.`);
      console.error(`Run 'scripts/gen-visualizer-data.mts' to update.`);
      process.exitCode = 1;
    }
  } else {
    // Update mode: write the file
    if (htmlContent === newHtmlContent) {
      console.log('✓ ymax-visualizer.html already up to date');
    } else {
      await fs.writeFile(HTML_PATH, newHtmlContent, 'utf8');
      console.log(
        `✓ Updated ymax-visualizer.html with generated Ymax machine data`,
      );
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exitCode = 1;
});
