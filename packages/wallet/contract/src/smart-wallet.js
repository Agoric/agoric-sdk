// @ts-check
import { E } from '@endo/far';
import '@agoric/deploy-script-support/exported.js';
import '@agoric/zoe/exported.js';
import spawn from '../../api/src/wallet.js';

import '../../api/src/types.js';

/**
 *
 * TODO: multi-tennant wallet
 *
 * @param {ZCF} zcf
 */
export const start = async zcf => {
  const { agoricNames, bank, namesByAddress, myAddressNameAdmin, board } =
    zcf.getTerms();
  const zoe = zcf.getZoeService();
  const walletVat = spawn({
    agoricNames,
    namesByAddress,
    myAddressNameAdmin,
    zoe,
    board,
    localTimerService: undefined,
  });

  const wallet = await E(walletVat).getWallet(bank);

  return { creatorFacet: wallet };
};
