// @ts-check
import { Errors } from './errors';

export const getChainId = async networkConfig => {
  let chainId;
  try {
    // eslint-disable-next-line @jessie.js/no-nested-await
    const res = await fetch(networkConfig);
    // eslint-disable-next-line @jessie.js/no-nested-await
    const { chainName } = await res.json();
    chainId = chainName;
  } catch {
    throw new Error(Errors.networkConfig);
  }

  return chainId;
};
