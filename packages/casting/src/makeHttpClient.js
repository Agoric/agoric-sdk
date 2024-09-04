// @ts-check

const { freeze } = Object;

const filterBadStatus = res => {
  if (res.status >= 400) {
    throw Error(`Bad status on response: ${res.status}`);
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
 * @param {typeof window.fetch} fetch
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
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };
      return fetch(url, settings)
        .then(filterBadStatus)
        .then(res => res.json());
    },
  });
};
