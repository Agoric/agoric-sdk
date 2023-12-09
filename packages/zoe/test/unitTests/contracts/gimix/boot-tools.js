// @ts-check

import { Far } from '@endo/far';
import { makeNameHubKit, makePromiseSpace } from '@agoric/vats';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import { createRequire } from 'module';

/** @typedef {Awaited<ReturnType<typeof import('@endo/bundle-source/cache.js').makeNodeBundleCache>>} BundleCache */

const myRequire = createRequire(import.meta.url);

/**
 * @param {BundleCache} bundleCache
 */
const loadBundles = async bundleCache => {
  const dir1 = '../../../../src/contracts/gimix';
  const load1 = name =>
    bundleCache.load(myRequire.resolve(`${dir1}/${name}.js`), name);
  const bundles = {
    contractStarter: await load1('contractStarter'),
    postalSvc: await load1('postalSvc'),
    terminalIncarnation: await load1('terminalIncarnation'),
  };
  return bundles;
};

/**
 * Wrap Zoe exo in a record so that we can override methods.
 *
 * Roughly equivalent to {@link bindAllMethods}
 * in @agoric/internal, but that's a private API and
 * this contract should perhaps not be in agoric-sdk.
 *
 * @param {ZoeService} zoeExo
 */
export const wrapZoe = zoeExo => {
  /** @type {ZoeService} */
  // @ts-expect-error mock
  const mock = {
    // XXX all the methods used in this test; there may be others.
    getFeeIssuer: () => zoeExo.getFeeIssuer(),
    getInvitationIssuer: () => zoeExo.getInvitationIssuer(),
    installBundleID: (...args) => zoeExo.installBundleID(...args),
    startInstance: (...args) => zoeExo.startInstance(...args),
    getTerms: (...args) => zoeExo.getTerms(...args),
    getPublicFacet: (...args) => zoeExo.getPublicFacet(...args),
    offer: (...args) => zoeExo.offer(...args),
  };
  return mock;
};

/**
 * @param {ZoeService} zoeService
 * @param {{[name: string]: EndoBundle}} bundles
 *
 * TODO: use makeFakeVatAdmin instead
 *
 * @typedef {*} EndoBundle // TODO
 */
export const makeZoeWithBundles = (zoeService, bundles) => {
  /** @param {string} bID */
  const install1BundleID = bID => {
    for (const [name, bundle] of Object.entries(bundles)) {
      if (bID === `b1-${bundle.endoZipBase64Sha512}`) {
        console.log(`installing`, name);
        return zoeService.install(bundle);
      }
    }
    throw bID;
  };

  const zoe = Far('ZoeService', {
    ...wrapZoe(zoeService),
    installBundleID: install1BundleID,
  });

  return zoe;
};

/**
 * @template CTX
 * @param {import('ava').ExecutionContext<CTX>} t
 * @param {ZoeService} zoeService
 * @param {BundleCache} bundleCache
 * @param {ERef<{[name: string]: EndoBundle}>} [bundlesP]
 */
export const makeTestBootPowers = async (
  t,
  zoeService,
  bundleCache,
  bundlesP = loadBundles(bundleCache),
) => {
  const bundles = await bundlesP;
  const bootstrap = async () => {
    const { produce, consume } = makePromiseSpace();

    const zoe = makeZoeWithBundles(zoeService, bundles);
    produce.zoe.resolve(zoe);

    const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
      makeNameHubKit();
    const spaces = await makeWellKnownSpaces(agoricNamesAdmin, t.log, [
      'installation',
      'instance',
    ]);

    produce.agoricNames.resolve(agoricNames);

    const { nameAdmin: namesByAddressAdmin } = makeNameHubKit();
    produce.namesByAddressAdmin.resolve(namesByAddressAdmin);

    /** @type {BootstrapPowers}}  */
    // @ts-expect-error mock
    const powers = { produce, consume, ...spaces };

    return powers;
  };

  const powers = await bootstrap();
  return { bundles, powers };
};
