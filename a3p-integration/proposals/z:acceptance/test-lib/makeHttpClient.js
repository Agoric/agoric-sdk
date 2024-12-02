import { assert } from '@endo/errors';
import { Far } from '@endo/far';

/**
 * gRPC-gateway REST API access
 *
 * @see {@link https://docs.cosmos.network/v0.45/core/grpc_rest.html#rest-server Cosmos SDK REST Server}
 *
 * Note: avoid Legacy REST routes, per
 * {@link https://docs.cosmos.network/v0.45/migrations/rest.html Cosmos SDK REST Endpoints Migration}.
 *
 * @param {string} apiAddress nodes default to port 1317
 * @param {object} io
 * @param {typeof fetch} io.fetch
 */
export const makeAPI = (apiAddress, { fetch }) => {
  assert.typeof(apiAddress, 'string');

  /**
   * @param {string} href
   * @param {object} [options]
   * @param {Record<string, string>} [options.headers]
   */
  const getJSON = (href, options = {}) => {
    const opts = {
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };
    const url = `${apiAddress}${href}`;
    return fetch(url, opts).then(r => {
      if (!r.ok) throw Error(r.statusText);
      return r.json().then(data => {
        return data;
      });
    });
  };

  return Far('LCD', {
    getJSON,
    latestBlock: () => getJSON(`/cosmos/base/tendermint/v1beta1/blocks/latest`),
  });
};
/** @typedef {ReturnType<typeof makeAPI>} LCD */
