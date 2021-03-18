/* global require */
// @ts-check
import '@agoric/zoe/exported';
import { E } from '@agoric/eventual-send';

import { makeInstall } from './install';
import { makeResolvePaths } from './resolvePath';
import { makeOfferAndFindInvitationAmount } from './offer';
import { makeLocalAmountManager } from './saveLocalAmountMath';
import { makeStartInstance } from './startInstance';
import { makeDepositInvitation } from './depositInvitation';
import { makeSaveIssuer } from './saveIssuer';
import { assertOfferResult } from './assertOfferResult';

// These are also hard-coded in lib-wallet.js.
// TODO: Add methods to the wallet to access these without hard-coding
// on this end.
const ZOE_INVITE_BRAND_PETNAME = 'zoe invite';
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

  const {
    resolvePathForLocalContract,
    resolvePathForPackagedContract,
  } = makeResolvePaths(endowments.pathResolve, require.resolve);

  const install = makeInstall(
    endowments.bundleSource,
    zoe,
    installationManager,
    board,
  );

  const { saveLocalAmountMaths, getLocalAmountMath } = makeLocalAmountManager(
    issuerManager,
  );

  const startInstance = makeStartInstance(
    issuerManager,
    instanceManager,
    zoe,
    zoeInvitationPurse,
  );

  // Save the Zoe invitation amountMath locally
  await saveLocalAmountMaths([ZOE_INVITE_BRAND_PETNAME]);
  const invitationMath = getLocalAmountMath(ZOE_INVITE_BRAND_PETNAME);

  const { offer, findInvitationAmount } = makeOfferAndFindInvitationAmount(
    walletAdmin,
    zoe,
    zoeInvitationPurse,
    getLocalAmountMath,
    invitationMath,
  );

  const saveIssuer = makeSaveIssuer(
    walletAdmin,
    saveLocalAmountMaths,
    issuerManager,
  );

  const depositInvitation = makeDepositInvitation(zoeInvitationPurse);

  return {
    resolvePathForLocalContract,
    resolvePathForPackagedContract,
    install,
    saveLocalAmountMaths,
    startInstance,
    offer,
    findInvitationAmount,
    saveIssuer,
    depositInvitation,
    assertOfferResult,
  };
};
