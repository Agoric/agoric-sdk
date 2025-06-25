import { assert } from '@endo/errors';
import { Far } from '@endo/far';

const { freeze } = Object;

const jsonType = { 'Content-Type': 'application/json' };

const filterBadStatus = res => {
  if (res.status >= 400) {
    throw new Error(`Bad status on response: ${res.status}`);
  }
  return res;
};

/**
 * Make an RpcClient using explicit access to the network.
 *
 * The RpcClient implementations included in cosmjs
 * such as {@link https://cosmos.github.io/cosmjs/latest/tendermint-rpc/classes/HttpClient.html HttpClient}
 * use ambient authority (fetch or axios) for network access.
 *
 * To facilitate cooperation without vulnerability,
 * as well as unit testing, etc. this RpcClient maker takes
 * network access as a parameter, following
 * {@link https://github.com/Agoric/agoric-sdk/wiki/OCap-Discipline|OCap Discipline}.
 *
 * @param {string} url
 * @param {typeof globalThis.fetch} fetch
 * @returns {import('@cosmjs/tendermint-rpc').RpcClient}
 */
export const makeHttpClient = (url, fetch) => {
  const headers = {}; // XXX needed?

  // based on cosmjs 0.30.1:
  // https://github.com/cosmos/cosmjs/blob/33271bc51cdc865cadb647a1b7ab55d873637f39/packages/tendermint-rpc/src/rpcclients/http.ts#L37
  // https://github.com/cosmos/cosmjs/blob/33271bc51cdc865cadb647a1b7ab55d873637f39/packages/tendermint-rpc/src/rpcclients/httpclient.ts#L25
  return freeze({
    disconnect: () => {
      // nothing to be done
    },

    /**
     * @param {import('@cosmjs/json-rpc').JsonRpcRequest} request
     */
    execute: async request => {
      const settings = {
        method: 'POST',
        body: request ? JSON.stringify(request) : undefined,
        headers: { ...jsonType, ...headers },
      };
      return fetch(url, settings)
        .then(filterBadStatus)
        .then(res => res.json());
    },
  });
};

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
