// @ts-check
import { Errors } from './errors.js';

export const getChainInfo = async networkConfig => {
  let chainId;
  let rpcs;
  try {
    const res = await fetch(networkConfig);
    const { chainName, rpcAddrs } = await res.json();
    chainId = chainName;
    rpcs = rpcAddrs;
  } catch {
    throw Error(Errors.networkConfig);
  }

  return { chainId, rpcs };
};
