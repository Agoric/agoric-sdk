// @ts-check
import '@agoric/zoe/exported.js';
import { E } from '@endo/far';

import { makeInstall } from './install.js';
import { makeOfferAndFindInvitationAmount } from './offer.js';
import { makeStartInstance } from './startInstance.js';
import { makeDepositInvitation } from './depositInvitation.js';
import { makeSaveIssuer } from './saveIssuer.js';
import { assertOfferResult } from './assertOfferResult.js';

// These are also hard-coded in lib-wallet.js.
// TODO: Add methods to the wallet to access these without hard-coding
// on this end.
const ZOE_INVITE_PURSE_PETNAME = 'Default Zoe invite purse';

export const makeHelpers = async (homePromise, endowments) => {
  const { zoe, wallet, board } = E.get(homePromise);

  const walletAdmin = E(wallet).getAdminFacet();
  const installationManager = E(walletAdmin).getInstallationManager();
  const instanceManager = E(walletAdmin).getInstanceManager();
  const issuerManager = E(walletAdmin).getIssuerManager();

  // TODO: Rather than using one purse with a hard-coded petname, find
  // a better solution.
  const zoeInvitationPurse = E(walletAdmin).getPurse(ZOE_INVITE_PURSE_PETNAME);

  // Create the methods

  const install = makeInstall(
    endowments.bundleSource,
    zoe,
    installationManager,
    board,
  );

  const startInstance = makeStartInstance(
    issuerManager,
    instanceManager,
    zoe,
    zoeInvitationPurse,
  );

  const { offer, findInvitationAmount } = makeOfferAndFindInvitationAmount(
    walletAdmin,
    zoe,
    zoeInvitationPurse,
  );

  const saveIssuer = makeSaveIssuer(walletAdmin, issuerManager);

  const depositInvitation = makeDepositInvitation(zoeInvitationPurse);

  return {
    install,
    startInstance,
    offer,
    findInvitationAmount,
    saveIssuer,
    depositInvitation,
    assertOfferResult,
  };
};
