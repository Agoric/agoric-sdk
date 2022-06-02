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

export const DEFAULT_PATH_CONVERTER = swingsetPathToStoreKey;

/**
 * @type {Record<string, (path: string) => import('./types').ChainStoreKey>}
 */
export const pathPrefixToConverters = harden({
  'swingset:': swingsetPathToStoreKey,
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
