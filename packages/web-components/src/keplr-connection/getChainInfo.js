// @ts-check
import { Errors } from './errors.js';

export const getChainInfo = async networkConfig => {
  let chainId;
  let rpcs;
  try {
    // eslint-disable-next-line @jessie.js/no-nested-await
    const res = await fetch(networkConfig);
    // eslint-disable-next-line @jessie.js/no-nested-await
    const { chainName, rpcAddrs } = await res.json();
    chainId = chainName;
    rpcs = rpcAddrs;
  } catch {
    throw Error(Errors.networkConfig);
  }

  return { chainId, rpcs };
};
