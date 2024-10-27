// @ts-check
import { E, Far } from '@endo/far';
import { makeNameHubKit, makePromiseSpace } from '@agoric/vats';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKitForTest } from '@agoric/zoe/tools/setup-zoe.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeScalarMapStore } from '@agoric/store';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { makeMockChainStorageRoot } from '@agoric/internal/src/storage-test-utils.js';

import '@agoric/vats/src/core/types-ambient.js';
import '@agoric/zoe/src/zoeService/types-ambient.js';
export const getBundleId = bundle => `b1-${bundle.endoZipBase64Sha512}`;

const { entries } = Object;

/**
 * Make powers (zoe, timer and name services, etc.) sufficient to test deploying
 * and using contracts. priceAuthority is a dummy.
 *
 * Also return vatAdminState for installing bundles and mock chainStorage with
 * support for getBody().
 *
 * @param {(...args: unknown[]) => void} log
 * @param {string[]} [spaceNames]
 */
export const mockBootstrapPowers = async (
  log,
  spaceNames = ['installation', 'instance', 'issuer', 'brand'],
) => {
  const baggage = makeScalarMapStore('testing');
  const zone = makeDurableZone(baggage);
  const { produce, consume } = makePromiseSpace();

  const { admin, vatAdminState } = makeFakeVatAdmin();
  const { zoeService: zoe, feeMintAccess } = makeZoeKitForTest(admin);
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const feeIssuer = await E(zoe).getFeeIssuer();
  const [invitationBrand, feeBrand] = await Promise.all(
    [invitationIssuer, feeIssuer].map(i => E(i).getBrand()),
  );

  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
    makeNameHubKit();
  const spaces = await makeWellKnownSpaces(agoricNamesAdmin, log, spaceNames);

  const { nameHub: namesByAddress, nameAdmin: namesByAddressAdmin } =
    makeNameHubKit();

  const noop = () => {};
  const modernTime = BigInt(new Date(2024, 6, 1, 9).valueOf() / 1000);
  const chainTimerService = buildManualTimer(noop, modernTime, {
    timeStep: 60n,
  });
  const timerBrand = await E(chainTimerService).getTimerBrand();

  const chainStorage = makeMockChainStorageRoot();
  const board = makeFakeBoard();

  /**
   * @param root0
   * @param root0.installation
   * @param root0.issuerKeywordRecord
   * @param root0.terms
   * @param root0.privateArgs
   * @param root0.label
   *
   * @typedef {Record<Keyword, Issuer<any, any>>} IssuerKeywordRecord
   */
  const startUpgradable = ({
    installation,
    issuerKeywordRecord,
    terms,
    privateArgs,
    label,
  }) =>
    E(zoe).startInstance(
      installation,
      issuerKeywordRecord,
      terms,
      privateArgs,
      label,
    );

  const bldIssuerKit = makeIssuerKit('BLD', 'nat', { decimalPlaces: 6 });
  produce.bldIssuerKit.resolve(bldIssuerKit);
  produce.startUpgradable.resolve(startUpgradable);
  produce.zoe.resolve(zoe);
  produce.feeMintAccess.resolve(feeMintAccess);
  produce.agoricNamesAdmin.resolve(agoricNamesAdmin);
  produce.agoricNames.resolve(agoricNames);
  produce.namesByAddress.resolve(namesByAddress);
  produce.namesByAddressAdmin.resolve(namesByAddressAdmin);
  produce.chainTimerService.resolve(chainTimerService);
  produce.chainStorage.resolve(chainStorage);
  produce.board.resolve(board);
  spaces.brand.produce.timer.resolve(timerBrand);
  spaces.brand.produce.BLD.resolve(bldIssuerKit.brand);
  spaces.brand.produce.IST.resolve(feeBrand);
  spaces.brand.produce.Invitation.resolve(invitationBrand);
  spaces.issuer.produce.BLD.resolve(bldIssuerKit.issuer);
  spaces.issuer.produce.IST.resolve(feeIssuer);
  spaces.issuer.produce.Invitation.resolve(invitationIssuer);
  produce.priceAuthority.resolve(Far('NullPriceAuthority', {}));

  /**
   * @type {BootstrapPowers}
   */
  // @ts-expect-error mock
  const powers = { produce, consume, ...spaces, zone };

  return { powers, vatAdminState, chainStorage };
};

/**
 * @param {BundleCache} bundleCache
 * @param {Record<string, string>} bundleRoots
 * @param {InstallBundle} installBundle
 * @param {(...args: unknown[]) => void} log
 *
 * @typedef {(
 *   id: string,
 *   bundle: CachedBundle,
 *   name: string,
 * ) => Promise<void>} InstallBundle
 *
 *
 * @typedef {Awaited<
 *   ReturnType<import('@endo/bundle-source/cache.js').makeNodeBundleCache>
 * >} BundleCache
 *
 *
 * @typedef {{ moduleFormat: 'endoZipBase64'; endoZipBase64Sha512: string }} CachedBundle
 */
export const installBundles = async (
  bundleCache,
  bundleRoots,
  installBundle,
  log = console.log,
) => {
  /** @type {Record<string, CachedBundle>} */
  const bundles = {};
  await null;
  for (const [name, rootModulePath] of Object.entries(bundleRoots)) {
    const bundle = await bundleCache.load(rootModulePath, name);
    const bundleID = getBundleId(bundle);
    log('publish bundle', name, bundleID.slice(0, 8));
    await installBundle(bundleID, bundle, name);
    bundles[name] = bundle;
  }
  harden(bundles);
  return bundles;
};

export const bootAndInstallBundles = async (t, bundleRoots) => {
  t.log('bootstrap');
  const powersKit = await mockBootstrapPowers(t.log);
  const { vatAdminState } = powersKit;

  const bundles = await installBundles(
    t.context.bundleCache,
    bundleRoots,
    (bundleID, bundle, _name) => vatAdminState.installBundle(bundleID, bundle),
    t.log,
  );
  return { ...powersKit, bundles };
};

const proposalResultDefault = {
  proposal_id: 0,
  content: {
    '@type': '/agoric.swingset.CoreEvalProposal',
  },
  status: 'PROPOSAL_STATUS_PASSED',
  voting_end_time: '2020-01-01T01:00:00.0Z',
};

/**
 * @param {import('ava').ExecutionContext} t
 * @param {BundleCache} bundleCache
 */
export const makeMockTools = async (t, bundleCache) => {
  t.log('bootstrap');
  const { powers, vatAdminState } = await mockBootstrapPowers(t.log);

  const installBundle = async (bundleID, bundle, _name) =>
    vatAdminState.installBundle(bundleID, bundle);

  const iKit = {
    MNY: makeIssuerKit('MNY'),
    Item: makeIssuerKit('Item', AssetKind.SET),
    ATOM: makeIssuerKit('ATOM', AssetKind.NAT, { decimalPlaces: 6 }),
  };
  const { MNY, Item, ATOM } = iKit;
  for (const [name, kit] of entries(iKit)) {
    powers.issuer.produce[name].resolve(kit.issuer);
    powers.brand.produce[name].resolve(kit.brand);
  }

  const { agoricNames, board, zoe, namesByAddressAdmin } = powers.consume;

  // /** @type {Record<string, Issuer<any, any>>} */
  /** @type {Record<string, any>} */
  const smartWalletIssuers = {
    Invitation: await E(zoe).getInvitationIssuer(),
    IST: await E(zoe).getFeeIssuer(),
    MNY: MNY.issuer,
    Item: Item.issuer,
    ATOM: ATOM.issuer,
  };

  const boardMarshaller = await E(board).getPublishingMarshaller();

  let pid = 0;
  const runCoreEval = async ({
    behavior,
    config,
    entryFile: _e,
    name: _todo,
  }) => {
    if (!behavior) throw Error('TODO: run core eval without live behavior');
    await behavior(powers, config);
    pid += 1;
    return { ...proposalResultDefault, proposal_id: pid };
  };

  // XXX marshal context is not fresh. hm.
  const makeQueryTool = () => {
    return Far('QT', {
      toCapData: x => boardMarshaller.toCapData(x), // XXX remote???
      fromCapData: d => boardMarshaller.fromCapData(d),
      queryData: async path => {
        const parts = path.split('.');
        if (parts.shift() !== 'published') throw Error(`not found: ${path}`);
        if (parts.shift() !== 'agoricNames') throw Error(`not found: ${path}`);
        if (parts.length !== 1) throw Error(`not found: ${path}`);
        const hub = E(agoricNames).lookup(parts[0]);
        const kvs = await E(hub).entries();
        boardMarshaller.toCapData(kvs); // remember object identities
        return kvs;
      },
    });
  };

  return {
    makeQueryTool,
    installBundles: (bundleRoots, log) =>
      installBundles(bundleCache, bundleRoots, installBundle, log),
    runCoreEval,
  };
};
