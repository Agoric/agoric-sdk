import { onLoadP } from './onLoad';
import { Errors } from './errors';

export const getKeplrAddress = async chainId => {
  await onLoadP;
  try {
    // eslint-disable-next-line @jessie.js/no-nested-await
    await window.keplr.enable(chainId);
  } catch {
    throw new Error(Errors.enableKeplr);
  }
  const offlineSigner = window.getOfflineSigner(chainId);

  const accounts = await offlineSigner.getAccounts();

  return accounts[0].address;
};
