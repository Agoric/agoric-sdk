#!/usr/bin/env node

/**
 * This script verifies that every package in the @agoric/sdk project has an
 * Agoric-controlled name and its name matches its `private` flag.
 *
 * This helps make more clear when viewing a package name whether it will be published.
 * It's also a backstop against accidentally flipping the `private` flag because
 * our NPM account doesn't have permission to publish to non-Agoric names.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
// eslint-disable-next-line import/no-relative-packages -- one-off script
import { listWorkspaces } from '../packages/agoric-cli/src/lib/packageManager.js';

let hasErrors = false;
const err = msg => {
  console.error(msg);
  hasErrors = true;
};

// Get all workspaces in the project
const workspaces = listWorkspaces({ execFileSync });

// Check each package.json
for (const { name, location } of workspaces) {
  const packageJsonPath = path.join(location, 'package.json');

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const { private: isPrivate } = packageJson;

    // These orgs and name are owned in NPM by OpCo
    const owned =
      name.startsWith('@agoric/') ||
      name.startsWith('@aglocal/') ||
      name === 'agoric';

    if (!owned) {
      err(`Uncontrolled package name ${name}`);
    }

    const isLocal = name.startsWith('@aglocal/');

    if (isLocal && !isPrivate) {
      err(`Package ${name} is a local name but is not marked private`);
    } else if (isPrivate && !isLocal) {
      err(`Package ${name} is a public name but marked private`);
    }
  } catch (error) {
    err(`Error processing ${packageJsonPath}: ${error.message}`);
  }
}

// Exit with error code if any issues were found
process.exit(hasErrors ? 1 : 0);
