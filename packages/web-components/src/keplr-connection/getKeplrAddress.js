// @ts-check
import { onLoadP } from './onLoad.js';
import { Errors } from './errors.js';

/**
 * @param {string} chainId
 */
export const getKeplrAddress = async chainId => {
  await onLoadP;
  if (!('keplr' in window)) {
    throw Error(Errors.noKeplr);
  }
  /** @type {import('@keplr-wallet/types').Keplr} */
  // @ts-expect-error cast (checked above)
  const keplr = window.keplr;

  try {
    await keplr.enable(chainId);
  } catch {
    throw Error(Errors.enableKeplr);
  }
  const offlineSigner = keplr.getOfflineSigner(chainId);

  const accounts = await offlineSigner.getAccounts();

  return accounts[0].address;
};
