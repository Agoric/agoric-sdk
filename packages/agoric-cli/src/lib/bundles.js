// @ts-check
/* eslint-env node */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';

import { ZipReader } from '@endo/zip';

/** @import {Bundle} from '@agoric/swingset-vat'; */
/** @import {CoreEvalPlan} from '@agoric/deploy-script-support/src/writeCoreEvalParts.js' */

// exported for testing
export const PACKAGE_NAME_RE = /^(?:@[^/]+\/)?[^/]+/;

/**
 * @typedef {{ name: string, label: string, location: string, modules: Record<string, {compartment: string, module: string}>}} Compartment
 */

/**
 * @typedef CompartmentMap
 * @property {string[]} tags
 * @property {{compartment: string, module: string}} entry
 * @property {Record<string, Compartment>} compartments
 */

/** @param {Bundle} bundleObj*/
export const extractBundleInfo = async bundleObj => {
  if (bundleObj.moduleFormat !== 'endoZipBase64') {
    throw Error('only endoZipBase64 is supported');
  }

  const contents = Buffer.from(bundleObj.endoZipBase64, 'base64');

  const zipReader = new ZipReader(contents);
  const { files } = zipReader;

  const cmapEntry = files.get('compartment-map.json');
  /** @type {CompartmentMap} */
  const compartmentMap = JSON.parse(Buffer.from(cmapEntry.content).toString());

  // XXX mapIter better but requires SES
  const fileSizes = Object.fromEntries(
    Array.from(files.values()).map(f => [
      f.name,
      // bundle contents are not compressed
      f.content.length,
    ]),
  );

  return { compartmentMap, fileSizes };
};

// UNTIL https://github.com/endojs/endo/issues/1656
/** @param {string} bundleFilename */
export const statBundle = async bundleFilename => {
  const bundle = fs.readFileSync(bundleFilename, 'utf8');
  /** @type {Bundle} */
  const bundleObj = JSON.parse(bundle);
  console.log('\nBUNDLE', bundleObj.moduleFormat, bundleFilename);

  const info = await extractBundleInfo(bundleObj);
  assert(info, 'no bundle info');

  /** @type {Record<string, number>} */
  const byPackage = {};
  let totalSize = 0;
  for (const [filename, size] of Object.entries(info.fileSizes)) {
    totalSize += size;
    if (filename === 'compartment-map.json') {
      continue;
    }
    const packageName = filename.match(PACKAGE_NAME_RE)?.[0];
    assert(packageName, `invalid filename ${filename}`);
    byPackage[packageName] ||= 0;
    byPackage[packageName] += size;
  }

  console.log('Sum of file sizes in each package:');
  console.table(byPackage);

  console.log('total size:', totalSize);
  console.log('\nTo explore the contents:\n');
  console.log(
    `  DIR=$(mktemp -d); cat ${bundleFilename} | jq -r .endoZipBase64 | base64 -d | tar xC $DIR; open $DIR`,
  );
};

/** @param {string} path */
export const statPlans = async path => {
  const files = await fs.promises.readdir(path);
  const planfiles = files.filter(f => f.endsWith('plan.json'));

  for (const planfile of planfiles) {
    /** @type {CoreEvalPlan} */
    const plan = JSON.parse(fs.readFileSync(join(path, planfile), 'utf8'));
    console.log('\n**\nPLAN', plan.name);
    for (const bundle of plan.bundles) {
      await statBundle(bundle.fileName);
    }
  }
};
