// @ts-check

/**
 * @param {import("./cosmos-api").LCD} lcd
 */
export const makeVStorage = lcd => {
  const getJSON = (href, options) => lcd.getJSON(href, options);

  // height=0 is the same as omitting height and implies the highest block
  const href = (path = 'published', { kind = 'data' } = {}) =>
    `/agoric/vstorage/${kind}/${path}`;
  const headers = height =>
    height ? { 'x-cosmos-block-height': `${height}` } : undefined;

  const readStorage = (
    path = 'published',
    { kind = 'data', height = 0 } = {},
  ) =>
    getJSON(href(path, { kind }), { headers: headers(height) }).catch(err => {
      throw Error(
        `cannot read ${kind} of ${path}: ${err.message} ${err?.cause.message}`,
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
