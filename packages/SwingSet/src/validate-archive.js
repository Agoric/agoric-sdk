// @ts-check
import crypto from 'crypto';

import { assert } from '@agoric/assert';
import { decodeBase64 } from '@endo/base64';
import { readZip } from '@endo/zip';

function computeSha512(bytes) {
  const hash = crypto.createHash('sha512');
  hash.update(bytes);
  return hash.digest().toString('hex');
}

/**
 * @callback HashFn
 * @param {Uint8Array} bundle
 * @returns {string} hash
 */

async function computeArchiveHash(bundle) {
  // const { computeSha512 } = options;
  const { moduleFormat, endoZipBase64 } = bundle;
  assert.equal(moduleFormat, 'endoZipBase64');
  const archiveBytes = decodeBase64(endoZipBase64);
  const archive = await readZip(archiveBytes, '<unknown>');
  const compartmentMapBytes = await archive.read('compartment-map.json');
  const sha512 = computeSha512(compartmentMapBytes);
  return sha512;
}

const sha512RE = new RegExp('^[0-9a-f]{128}$');

/**
 * @param { EndoZipBase64Bundle } bundle
 * @returns { Promise<BundleID> }
 */
export async function computeBundleID(bundle) {
  const sha512 = await computeArchiveHash(bundle);
  assert(sha512RE.test(sha512), `${sha512} does not look like a SHA512 hash`);
  return `b1-${sha512}`;
}
