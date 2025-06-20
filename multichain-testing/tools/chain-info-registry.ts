import { convertChainInfo } from '@agoric/orchestration/src/utils/registry.js';

import type { IBCInfo, Chains } from '@chain-registry/types';

/**
 * Chain registry running in Starship
 *
 * https://github.com/cosmology-tech/starship/blob/main/starship/proto/registry/service.proto
 *
 * http://localhost:8081/chains
 * http://localhost:8081/chain_ids
 * http://localhost:8081/ibc
 */
export const getStarshipChainInfo = async ({
  baseUrl = 'http://localhost:8081',
  fetch = globalThis.fetch,
  getJSON = (ref: string) =>
    fetch(`${baseUrl}/${ref}`).then(r => {
      if (r.status !== 200) throw Error(`${baseUrl}/${ref}: ${r.statusText}`);
      return r.json();
    }),
} = {}) => {
  const { chains }: { chains: Chains } = await getJSON('chains');
  const ibc: { data: IBCInfo[] } = await getJSON(`ibc`);
  return convertChainInfo({ chains, ibcData: ibc.data });
};
