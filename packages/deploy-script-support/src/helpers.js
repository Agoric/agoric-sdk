// @ts-check
import '@agoric/zoe/exported.js';
import { E } from '@endo/far';

import { makeInstall } from './install.js';
import { makeOfferAndFindInvitationAmount } from './offer.js';
import { makeStartInstance } from './startInstance.js';
import { makeDepositInvitation } from './depositInvitation.js';
import { makeSaveIssuer } from './saveIssuer.js';
import { makeGetBundlerMaker } from './getBundlerMaker.js';
import { assertOfferResult } from './assertOfferResult.js';
import { installInPieces } from './installInPieces.js';
import { makeWriteCoreProposal } from './writeCoreProposal.js';

export * from './createBundles.js';

// These are also hard-coded in lib-wallet.js.
// TODO: Add methods to the wallet to access these without hard-coding
// on this end.
const ZOE_INVITE_PURSE_PETNAME = 'Default Zoe invite purse';

export const makeHelpers = async (homePromise, endowments) => {
  const { zoe, wallet, scratch, board } = E.get(homePromise);

  const { bundleSource, lookup } = endowments;

  const walletAdmin = E(wallet).getAdminFacet();
  const installationManager = E(walletAdmin).getInstallationManager();
  const instanceManager = E(walletAdmin).getInstanceManager();
  const issuerManager = E(walletAdmin).getIssuerManager();

  // TODO: Rather than using one purse with a hard-coded petname, find
  // a better solution.
  const zoeInvitationPurse = E(walletAdmin).getPurse(ZOE_INVITE_PURSE_PETNAME);

  // Create the methods

  const install = makeInstall(bundleSource, zoe, installationManager, board);

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

  const getBundlerMaker = makeGetBundlerMaker(
    { board, scratch, zoe },
    { bundleSource, lookup },
  );

  const writeCoreProposal = makeWriteCoreProposal(homePromise, endowments, {
    installInPieces,
    getBundlerMaker,
  });

  return harden({
    install,
    startInstance,
    offer,
    findInvitationAmount,
    installInPieces,
    getBundlerMaker,
    saveIssuer,
    depositInvitation,
    assertOfferResult,
    writeCoreProposal,
  });
};
