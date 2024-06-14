// @ts-check

/// <reference path="../../zoe/exported.js" />

import { E } from '@endo/far';
import bundleSource from '@endo/bundle-source';

import fs from 'fs/promises';
import os from 'os';

import { makeInstall } from './install.js';
import { makeOfferAndFindInvitationAmount } from './offer.js';
import { makeStartInstance } from './startInstance.js';
import { makeCacheAndGetBundleSpec } from './cachedBundleSpec.js';
import { makeDepositInvitation } from './depositInvitation.js';
import { makeSaveIssuer } from './saveIssuer.js';
import { makeGetBundlerMaker } from './getBundlerMaker.js';
import { assertOfferResult } from './assertOfferResult.js';
import { installInPieces } from './installInPieces.js';
import { makeWriteCoreEval } from './writeCoreEvalParts.js';

export * from '@agoric/internal/src/node/createBundles.js';

// These are also hard-coded in lib-wallet.js.
// TODO: Add methods to the wallet to access these without hard-coding
// on this end.
const ZOE_INVITE_PURSE_PETNAME = 'Default Zoe invite purse';

/**
 * @template {Record<PropertyKey, any>} T
 *
 * Lazily populate the returned object's properties from the properties of a
 * source object.  Each `sourceObject` property value is sampled at most once.
 *
 * @param {T} sourceObject
 * @returns {T}
 */
const makeLazyObject = sourceObject => {
  const lazyObject = new Proxy(
    {},
    {
      get(t, key) {
        if (!(key in t)) {
          if (key in sourceObject) {
            t[key] = sourceObject[key];
          }
        }
        return t[key];
      },
    },
  );
  return /** @type {T} */ (lazyObject);
};

export const makeHelpers = async (homePromise, endowments) => {
  // Endowments provided via `agoric run` or `agoric deploy`.
  const {
    now,
    lookup,
    publishBundle,
    pathResolve,
    cacheDir = pathResolve(os.homedir(), '.agoric/cache'),
  } = endowments;

  // Internal-to-this-function lazy dependencies.
  const deps = makeLazyObject({
    get cacheAndGetBundleSpec() {
      return makeCacheAndGetBundleSpec(cacheDir, {
        now,
        fs,
        pathResolve,
      });
    },
    get home() {
      return E.get(homePromise);
    },
    get installationManager() {
      return E(deps.walletAdmin).getInstallationManager();
    },
    get instanceManager() {
      return E(deps.walletAdmin).getInstanceManager();
    },
    get issuerManager() {
      return E(deps.walletAdmin).getIssuerManager();
    },
    get offerAndFind() {
      return makeOfferAndFindInvitationAmount(
        deps.walletAdmin,
        deps.home.zoe,
        deps.zoeInvitationPurse,
      );
    },
    get walletAdmin() {
      return E(deps.home.wallet).getAdminFacet();
    },
    get zoeInvitationPurse() {
      // TODO: Rather than using one purse with a hard-coded petname, find
      // a better solution.
      return E(deps.walletAdmin).getPurse(ZOE_INVITE_PURSE_PETNAME);
    },
  });

  // The memo returned to our callers.
  const helpers = makeLazyObject({
    assertOfferResult,
    get depositInvitation() {
      return makeDepositInvitation(deps.zoeInvitationPurse);
    },
    get findInvitationAmount() {
      return deps.offerAndFind.findInvitationAmount;
    },
    get install() {
      return makeInstall(
        bundleSource,
        deps.home.zoe,
        deps.installationManager,
        deps.home.board,
        publishBundle,
        pathResolve,
      );
    },
    installInPieces,
    get offer() {
      return deps.offerAndFind.offer;
    },
    get saveIssuer() {
      return makeSaveIssuer(deps.walletAdmin, deps.issuerManager);
    },
    get startInstance() {
      return makeStartInstance(
        deps.issuerManager,
        deps.instanceManager,
        deps.home.zoe,
        deps.zoeInvitationPurse,
      );
    },
    get getBundlerMaker() {
      return makeGetBundlerMaker(homePromise, { bundleSource, lookup });
    },
    /** @returns {import('./writeCoreEvalParts.js').WriteCoreEval} */
    get writeCoreEval() {
      return makeWriteCoreEval(homePromise, endowments, {
        getBundleSpec: deps.cacheAndGetBundleSpec,
        getBundlerMaker: helpers.getBundlerMaker,
      });
    },
    /** @deprecated use writeCoreEval */
    get writeCoreProposal() {
      return makeWriteCoreEval(homePromise, endowments, {
        getBundleSpec: deps.cacheAndGetBundleSpec,
        getBundlerMaker: helpers.getBundlerMaker,
      });
    },
  });

  return helpers;
};
