// @ts-check
// TODO: move to @agoric/client-utils?

/**
 * @import {LCD} from './cosmos-api.js'
 */

/** @param {LCD} lcd */
export const makeVStorage = lcd => {
  const { getJSON } = lcd;

  const href = (path = 'published', { kind = 'data' } = {}) =>
    `/agoric/vstorage/${kind}/${path}`;
  // height=0 is the same as omitting height and implies the highest block
  const headers = height =>
    height ? { 'x-cosmos-block-height': `${height}` } : undefined;

  const readStorage = (
    path = 'published',
    { kind = 'data', height = 0 } = {},
  ) =>
    getJSON(href(path, { kind }), { headers: headers(height) }).catch(err => {
      throw Error(
        `cannot read ${kind} of ${path}: ${err.message} ${err?.cause?.message}`,
        { cause: err },
      );
    });
  const readCell = (path, opts) =>
    readStorage(path, opts)
      .then(data => data.value)
      .then(s => (s === '' ? {} : JSON.parse(s)));

  return {
    lcd,
    readStorage,
    readCell,
  };
};
