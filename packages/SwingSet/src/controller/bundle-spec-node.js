/* eslint-env node */
import fs from 'fs';
import { parseBundleSpec } from './bundle-spec.js';

/**
 * @param {string} bundleSpecPath
 */
export const readBundleSpecFile = bundleSpecPath =>
  parseBundleSpec(path => fs.readFileSync(path, 'utf-8'), bundleSpecPath);
