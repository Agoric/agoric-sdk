// @ts-check
const { freeze } = Object;

/**
 * @see {@link https://docs.cosmos.network/v0.46/core/grpc_rest.html#rest-server}
 */
export const defaultAPIPort = 1317;
export const localAPI = `http://localhost:${defaultAPIPort}`;

/**
 * @param {string} apiURL
 * @param {object} io
 * @param {typeof fetch} io.fetch
 */
export const makeLCD = (apiURL, { fetch }) => {
  if (typeof apiURL !== 'string') throw TypeError(typeof apiURL);

  /**
   * @param {string} href
   * @param {object} [options]
   * @param {Record<string, string>} [options.headers]
   */
  const getJSON = async (href, options = {}) => {
    const opts = {
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };
    const url = `${apiURL}${href}`;
    const r = await fetch(url, opts);
    if (!r.ok) throw Error(r.statusText);
    return r.json();
  };

  return freeze({
    getJSON,
    latestBlock: () => getJSON(`/cosmos/base/tendermint/v1beta1/blocks/latest`),
  });
};
/** @typedef {ReturnType<makeLCD>} LCD */
