const { freeze } = Object;

// XXX makeVStorage could / should be layered on this

/**
 * gRPC-gateway REST API access
 *
 * @see {@link https://docs.cosmos.network/v0.45/core/grpc_rest.html#rest-server Cosmos SDK REST Server}
 *
 * Note: avoid Legacy REST routes, per
 * {@link https://docs.cosmos.network/v0.45/migrations/rest.html Cosmos SDK REST Endpoints Migration}.
 *
 * @param {object} io
 * @param {typeof fetch} io.fetch
 * @param {string} apiAddress nodes default to port 1317
 */
export const makeAPI = ({ fetch }, apiAddress = 'http://localhost:1317') => {
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

  return freeze({
    getJSON,
  });
};
/** @typedef {ReturnType<typeof makeAPI>} CosmosAPI */
