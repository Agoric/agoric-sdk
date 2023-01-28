// @ts-check
import { onLoadP } from './onLoad';
import { Errors } from './errors';

/**
 * @param {string} chainId
 */
export const getKeplrAddress = async chainId => {
  await onLoadP;
  if (!('keplr' in window)) {
    throw new Error(Errors.noKeplr);
  }
  /** @type {import('@keplr-wallet/types').Keplr} */
  // @ts-expect-error cast (checked above)
  const keplr = window.keplr;

  try {
    // eslint-disable-next-line @jessie.js/no-nested-await
    await keplr.enable(chainId);
  } catch {
    throw new Error(Errors.enableKeplr);
  }
  const offlineSigner = keplr.getOfflineSigner(chainId);

  const accounts = await offlineSigner.getAccounts();

  return accounts[0].address;
};
