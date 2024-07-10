import test from 'ava';
import { PACKAGE_NAME_RE } from '../src/lib/bundles.js';

const goodPatterns = [
  ['@agoric/assert-v0.6.0'],
  ['@agoric/base-zone-v0.1.0/', '@agoric/base-zone-v0.1.0'],
  ['@endo/base64-v1.0.5-n1/index.js', '@endo/base64-v1.0.5-n1'],
  ['@endo/base64-v1.0.5-n1/decode.js', '@endo/base64-v1.0.5-n1'],
  [
    '@agoric/store-v0.9.3-dev-37ec151.0+37ec151/src/legacy/legacyWeakMap.js',
    '@agoric/store-v0.9.3-dev-37ec151.0+37ec151',
  ],
  [
    'calypso-contract-v0.1.0/src/proposals/core-proposal.js',
    'calypso-contract-v0.1.0',
  ],
  ['/index.js', undefined],
  ['/src', undefined],
];

test('simple positive', t => {
  for (const pattern of goodPatterns) {
    const name = pattern[0];
    const expected = pattern.length === 2 ? pattern[1] : pattern[0];

    t.is(name.match(PACKAGE_NAME_RE)?.[0], expected);
  }
});

const badPatterns = [
  '/user/name/sdk/node_modules/@agoric/assert-v0.6.0',
  '/random/@agoric/base-zone-v0.1.0/',
];

test('simple negative', t => {
  for (const pattern of badPatterns) {
    t.falsy(pattern.match(PACKAGE_NAME_RE)?.[0], `expected ${pattern} to fail`);
  }
});
