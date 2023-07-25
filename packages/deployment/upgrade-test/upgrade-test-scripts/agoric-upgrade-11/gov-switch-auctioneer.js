// @ts-nocheck
// #xxxport { E } from '@endo/far';
/* global E */

console.log('started switch-auctioneer script');

// TODO: set these bundle-ids to the revised code
const bundleIDs = {
  vaultFactory:
    'b1-ff68ffba61530568d82f0ec7c30eab6fe6a4bf8f4758c268152687c6b680ecf62466fbc1e6af9ddc95db30feb51878df07e80db7b908a7e6c7c7c2e4ccf2a4e9',
  auctioneer:
    'b1-e85289898e66e0423d7ec1c402ac2ced21573f93cf599d593a0533a1e2355ace624cc95c8c8c18c66d44a921511642e87837accd0e728427c269936b040bb886',
};

const STORAGE_PATH = 'auction';

const { fromEntries, keys, values } = Object;

/** @type { <X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
const zip = (xs, ys) => harden(xs.map((x, i) => [x, ys[+i]]));

/** @type { <T extends Record<string, ERef<any>>>(obj: T) => Promise<{ [K in keyof T]: Awaited<T[K]>}> } */
const allValues = async obj => {
  const resolved = await Promise.all(values(obj));
  // @ts-expect-error cast
  return harden(fromEntries(zip(keys(obj), resolved)));
};

// /** @param {#xxxport('../../src/proposals/econ-behaviors').EconomyBootstrapPowers} permittedPowers */
const switchAuctioneer = async permittedPowers => {
  console.log('switchAuctioneer: extracting permitted powers...');
  // see gov-switch-auctioneer-permit.json
  const {
    consume: {
      auctioneerKit: auctioneerKitP,
      chainTimerService: timerService,
      priceAuthority,
      startGovernedUpgradable,
      vaultFactoryKit,
      zoe,
      chainStorage,
      board,
    },
    produce: { auctioneerKit },
    instance: {
      produce: { auctioneer: auctionInstance },
      consume: { reserve: reserveInstance },
    },
    issuer: {
      consume: { IST: stableIssuerP },
    },
  } = permittedPowers;

  /**
   * install, start governed instance, publish results
   */
  const startNewAuctioneer = async () => {
    console.log('startNewAuctioneer: installBundleID etc.');
    const {
      // @ts-expect-error cast XXX missing from type
      // auctioneerKit: { privateArgs }, // TODO, this doesn't work. Find a way to pass in valid private args
      governedParamsOrig,
      installation,
      reservePublicFacet,
      stableIssuer,
      storageNode,
      marshaller,
    } = await allValues({
      auctioneerKit: auctioneerKitP,
      governedParamsOrig: E(
        E.get(auctioneerKitP).publicFacet,
      ).getGovernedParams(),
      installation: E(zoe).installBundleID(bundleIDs.auctioneer, 'auctioneer'),
      reservePublicFacet: E(zoe).getPublicFacet(reserveInstance),
      stableIssuer: stableIssuerP,
      storageNode: E(chainStorage).makeChildNode(STORAGE_PATH),
      marshaller: E(board).getReadonlyMarshaller(),
    });

    const privateArgs = {
      storageNode,
      marshaller,
    };

    const { Electorate: _, ...governedParams } = governedParamsOrig;

    const terms = {
      priceAuthority,
      reservePublicFacet,
      timerService,
      governedParams,
    };

    console.log('startNewAuctioneer: startGovernedUpgradable');
    const kit = await E(startGovernedUpgradable)({
      label: 'auctioneer',
      installation,
      issuerKeywordRecord: { Bid: stableIssuer },
      terms,
      governedParams,
      privateArgs,
    });

    auctioneerKit.reset();
    auctioneerKit.resolve(kit);
    // TODO: test that auctioneer in agoricNames.instance gets updated
    auctionInstance.reset();
    auctionInstance.resolve(kit.instance);

    return kit;
  };

  const newAuctionKit = await startNewAuctioneer();

  // TODO: shut down old auctioneer?

  // upgrade the vaultFactory
  const upgradeVaultFactory = async () => {
    console.log('upgradeVaultFactory...');
    const kit = await vaultFactoryKit;
    // @ts-expect-error cast XXX privateArgs missing from type
    const { privateArgs } = kit;

    /** @type {#xxxport('../../src/vaultFactory/vaultFactory').VaultFactoryContract['privateArgs']} */
    const newPrivateArgs = harden({
      ...privateArgs,
      auctioneerPublicFacet: newAuctionKit.publicFacet,
    });
    const upgradeResult = await E(kit.adminFacet).upgradeContract(
      bundleIDs.vaultFactory,
      newPrivateArgs,
    );
    console.log('upgraded vaultVactory.', upgradeResult);
  };
  await upgradeVaultFactory();
};

switchAuctioneer;
