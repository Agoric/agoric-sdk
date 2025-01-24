// define these here, in one place, so both the builder and the
// client-facing API can see the same paths

import { fileURLToPath } from 'url';

/** @param {string} path */
const resolve = path => fileURLToPath(new URL(path, import.meta.url));

export const bundlePaths = {
  lockdown: resolve('../dist/lockdown.bundle'),
  lockdownDebug: resolve('../dist/lockdown-debug.bundle'),
  objectInspect: resolve('../dist/object-inspect.js'),
};

export const hashPaths = {
  lockdown: resolve('../dist/lockdown.bundle.sha256'),
  lockdownDebug: resolve('../dist/lockdown-debug.bundle.sha256'),
};

export const entryPaths = {
  lockdown: resolve('../lib/ses-boot.js'),
  lockdownDebug: resolve('../lib/ses-boot-debug.js'),
  objectInspect: resolve('../lib/object-inspect.js'),
};
