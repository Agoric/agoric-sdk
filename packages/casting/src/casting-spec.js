// @ts-check
import * as encodingStar from '@cosmjs/encoding';
import { E, getInterfaceOf } from '@endo/far';

import './types.js';

const { toAscii } = encodingStar;

/**
 * @param {string} storagePath
 * @returns {import('./types').CastingSpec}
 */
const swingsetPathToCastingSpec = storagePath =>
  harden({
    storeName: 'swingset',
    storeSubkey: toAscii(`swingset/data:${storagePath}`),
  });

const PATH_SEPARATOR_BYTE = '.'.charCodeAt(0);
const DATA_PREFIX_BYTES = new Uint8Array([0]);

/**
 * @param {string} storagePath
 * @param {string} [storeName]
 * @returns {import('./types').CastingSpec}
 */
const vstoragePathToCastingSpec = (storagePath, storeName = 'vstorage') => {
  const elems = storagePath ? storagePath.split('.') : [];
  const buf = toAscii(`${elems.length}.${storagePath}`);
  return harden({
    storeName,
    storeSubkey: buf.map(b => (b === PATH_SEPARATOR_BYTE ? 0 : b)),
    dataPrefixBytes: DATA_PREFIX_BYTES,
  });
};

export const DEFAULT_PATH_CONVERTER = vstoragePathToCastingSpec;

/**
 * @type {Record<string, (path: string) => import('./types').CastingSpec>}
 */
export const pathPrefixToConverters = harden({
  'swingset:': swingsetPathToCastingSpec,
  'vstore:': vstoragePathToCastingSpec,
  ':': DEFAULT_PATH_CONVERTER,
});

/**
 * @param {string} specString
 * @returns {import('./types').CastingSpec}
 */
export const makeCastingSpecFromString = specString => {
  assert.typeof(specString, 'string');
  const match = specString.match(/^([^:.]*:)(.*)/);
  assert(
    match,
    `spec string ${specString} does not match 'PREFIX:PATH' or ':PATH'`,
  );
  const kind = match[1];
  const storePath = match[2];
  const converter = pathPrefixToConverters[kind];
  assert(converter, `Unknown pathKind ${kind}`);
  return converter(storePath);
};

const te = new TextEncoder();

/**
 * @param {any} specObj
 * @returns {import('./types').CastingSpec}
 */
export const makeCastingSpecFromObject = specObj => {
  const { storeName, storeSubkey, dataPrefixBytes, subscription, notifier } =
    specObj;
  if (subscription || notifier) {
    return harden({
      subscription,
      notifier,
    });
  }
  let subkey = storeSubkey;
  if (typeof storeSubkey === 'string') {
    subkey = te.encode(storeSubkey);
  }
  let dataPrefix = dataPrefixBytes;
  if (typeof dataPrefixBytes === 'string') {
    dataPrefix = te.encode(dataPrefixBytes);
  }
  return harden({
    storeName,
    storeSubkey: subkey,
    dataPrefixBytes: dataPrefix,
  });
};

/**
 * @param {ERef<any>} specCap
 * @returns {Promise<import('./types').CastingSpec>}
 */
export const makeCastingSpecFromRef = async specCap => {
  const specObj = await E(specCap).getStoreKey();
  return makeCastingSpecFromObject(specObj);
};

/**
 * Create an abstract type from a given source representation
 *
 * @param {ERef<unknown>} sourceP
 * @returns {Promise<import('./types').CastingSpec>}
 */
export const makeCastingSpec = async sourceP => {
  const spec = await sourceP;
  if (typeof spec === 'string') {
    return makeCastingSpecFromString(spec);
  }
  // @ts-expect-error type detection
  const { storeName, subscription, notifier } = spec;
  if (storeName || subscription || notifier) {
    return makeCastingSpecFromObject(spec);
  }
  if (getInterfaceOf(spec)) {
    return makeCastingSpecFromRef(spec);
  }
  assert.fail(`CastingSpec ${spec} is not a string, object, or ref`);
};
