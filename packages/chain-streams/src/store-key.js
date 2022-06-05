// @ts-check
import { toAscii } from '@cosmjs/encoding';

/**
 * @param {string} storagePath
 * @returns {import('./types').ChainStoreKey}
 */
const swingsetPathToStoreKey = storagePath =>
  harden({
    storeName: 'swingset',
    storeSubkey: toAscii(`swingset/data:${storagePath}`),
  });

const PATH_SEPARATOR_BYTE = '.'.charCodeAt(0);
const DATA_PREFIX_BYTES = new Uint8Array([0]);

/**
 * @param {string} storagePath
 * @param {string} [storeName]
 * @returns {import('./types').ChainStoreKey}
 */
const vstoragePathToStoreKey = (storagePath, storeName = 'vstorage') => {
  const elems = storagePath ? storagePath.split('.') : [];
  const buf = toAscii(`${elems.length}.${storagePath}`);
  return harden({
    storeName,
    storeSubkey: buf.map(b => (b === PATH_SEPARATOR_BYTE ? 0 : b)),
    dataPrefixBytes: DATA_PREFIX_BYTES,
  });
};

export const DEFAULT_PATH_CONVERTER = vstoragePathToStoreKey;

/**
 * @type {Record<string, (path: string) => import('./types').ChainStoreKey>}
 */
export const pathPrefixToConverters = harden({
  'swingset:': swingsetPathToStoreKey,
  'vstore:': vstoragePathToStoreKey,
  ':': DEFAULT_PATH_CONVERTER,
});

/**
 * @param {string} pathSpec
 * @returns {import('./types').ChainStoreKey}
 */
export const makeStoreKey = pathSpec => {
  const match = pathSpec.match(/^([^:.]*:)(.*)/);
  assert(
    match,
    `path spec ${pathSpec} does not match 'PREFIX:PATH' or ':PATH'`,
  );
  const kind = match[1];
  const storePath = match[2];
  const converter = pathPrefixToConverters[kind];
  assert(converter, `Unknown pathKind ${kind}`);
  return converter(storePath);
};
