// @ts-check
import { toAscii } from '@cosmjs/encoding';

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
export const makeCastingSpec = specString => {
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
