// @ts-check
import '@agoric/zoe/exported';
import { E } from '@agoric/eventual-send';

import { makeInstall } from './install';
import { makeResolvePaths } from './resolvePath';
import { makeOffer } from './offer';
import { makeLocalAmountManager } from './saveLocalAmountMath';
import { makeStartInstance } from './startInstance';
import { makeDepositInvitation } from './depositInvitation';
import { makeSaveIssuer } from './saveIssuer';
import { assertOfferResult } from './assertOfferResult';

export const makeHelpers = (homePromise, endowments) => {
  const { zoe, wallet, board } = E.G(homePromise);

  const walletAdmin = E(wallet).getAdminFacet();
  const installationManager = E(walletAdmin).getInstallationManager();
  const instanceManager = E(walletAdmin).getInstanceManager();
  const issuerManager = E(walletAdmin).getIssuerManager();

  const zoeInvitationPurse = E(walletAdmin).getPurse(
    'Default Zoe invite purse',
  );

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

  const offer = makeOffer(
    walletAdmin,
    zoe,
    zoeInvitationPurse,
    getLocalAmountMath,
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
    saveIssuer,
    depositInvitation,
    assertOfferResult,
  };
};
