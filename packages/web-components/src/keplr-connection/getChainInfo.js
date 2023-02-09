// @ts-check
import { Errors } from './errors';

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
    throw new Error(Errors.networkConfig);
  }

  return { chainId, rpcs };
};
