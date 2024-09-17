import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { Stable } from '@agoric/internal/src/tokens.js';
import { E } from '@endo/far';

import { makeGovernedTerms as makeGovernedATerms } from '../auction/params.js';

const trace = makeTracer('NewAuction', true);

/**
 * @typedef {PromiseSpaceOf<{
 *   auctionUpgradeNewInstance: Instance;
 * }>} interlockPowers
 */

/**
 * @param {import('./econ-behaviors.js').EconomyBootstrapPowers &
 *   interlockPowers} powers
 * @param {{ options: { auctionsRef: { bundleID: string } } }} options
 */
export const addAuction = async (
  {
    consume: {
      agoricNamesAdmin,
      auctioneerKit: legacyKitP,
      board,
      chainStorage,
      chainTimerService,
      economicCommitteeCreatorFacet: electorateCreatorFacet,
      econCharterKit,
      priceAuthority,
      zoe,
    },
    produce: { auctioneerKit: produceAuctioneerKit, auctionUpgradeNewInstance },
    instance: {
      consume: { reserve: reserveInstance },
      produce: { auctioneer: auctionInstance },
    },
    installation: {
      consume: { contractGovernor: contractGovernorInstallation },
      produce: { auctioneer: produceInstallation },
    },
    issuer: {
      consume: { [Stable.symbol]: stableIssuerP },
    },
  },
  { options },
) => {
  trace('addAuction start', options);
  const STORAGE_PATH = 'auction';
  const { auctionsRef } = options;

  const poserInvitationP = E(electorateCreatorFacet).getPoserInvitation();
  const bundleID = auctionsRef.bundleID;
  /**
   * @type {Promise<
   *   Installation<import('../../src/auction/auctioneer.js')['start']>
   * >}
   */
  const installationP = E(zoe).installBundleID(bundleID);
  produceInstallation.reset();
  produceInstallation.resolve(installationP);

  const [
    initialPoserInvitation,
    electorateInvitationAmount,
    stableIssuer,
    legacyKit,
  ] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
    stableIssuerP,
    legacyKitP,
  ]);

  // Each field has an extra layer of type +  value:
  // AuctionStartDelay: { type: 'relativeTime', value: { relValue: 2n, timerBrand: Object [Alleged: timerBrand] {} } }
  /** @type {any} */
  const paramValues = await E(legacyKit.publicFacet).getGovernedParams();
  const params = harden({
    StartFrequency: paramValues.StartFrequency.value,
    ClockStep: paramValues.ClockStep.value,
    StartingRate: paramValues.StartingRate.value,
    LowestRate: paramValues.LowestRate.value,
    DiscountStep: paramValues.DiscountStep.value,
    AuctionStartDelay: paramValues.AuctionStartDelay.value,
    PriceLockPeriod: paramValues.PriceLockPeriod.value,
  });
  const timerBrand = await E(chainTimerService).getTimerBrand();

  const storageNode = await makeStorageNodeChild(chainStorage, STORAGE_PATH);
  const marshaller = await E(board).getReadonlyMarshaller();

  const reservePublicFacet = await E(zoe).getPublicFacet(reserveInstance);

  const auctionTerms = makeGovernedATerms(
    { storageNode, marshaller },
    chainTimerService,
    priceAuthority,
    reservePublicFacet,
    {
      ...params,
      ElectorateInvitationAmount: electorateInvitationAmount,
      TimerBrand: timerBrand,
    },
  );

  const installation = await installationP;

  const governorTerms = await deeplyFulfilledObject(
    harden({
      timer: chainTimerService,
      governedContractInstallation: installation,
      governed: {
        terms: auctionTerms,
        issuerKeywordRecord: { Bid: stableIssuer },
        storageNode,
        marshaller,
        label: 'auctioneer',
      },
    }),
  );

  /** @type {GovernorStartedInstallationKit<typeof installationP>} */
  const governorStartResult = await E(zoe).startInstance(
    contractGovernorInstallation,
    undefined,
    governorTerms,
    harden({
      electorateCreatorFacet,
      governed: {
        initialPoserInvitation,
        storageNode,
        marshaller,
      },
    }),
    'auctioneer.governor',
  );

  const [governedInstance, governedCreatorFacet, governedPublicFacet] =
    await Promise.all([
      E(governorStartResult.creatorFacet).getInstance(),
      E(governorStartResult.creatorFacet).getCreatorFacet(),
      E(governorStartResult.creatorFacet).getPublicFacet(),
    ]);

  const allIssuers = await E(zoe).getIssuers(legacyKit.instance);
  const { Bid: _istIssuer, ...auctionIssuers } = allIssuers;
  await Promise.all(
    Object.keys(auctionIssuers).map(kwd =>
      E(governedCreatorFacet).addBrand(
        /** @type {Issuer<'nat'>} */ (auctionIssuers[kwd]),
        kwd,
      ),
    ),
  );

  const kit = harden({
    label: 'auctioneer',
    creatorFacet: governedCreatorFacet,
    adminFacet: governorStartResult.adminFacet,
    publicFacet: governedPublicFacet,
    instance: governedInstance,

    governor: governorStartResult.instance,
    governorCreatorFacet: governorStartResult.creatorFacet,
    governorAdminFacet: governorStartResult.adminFacet,
  });
  produceAuctioneerKit.reset();
  produceAuctioneerKit.resolve(kit);

  // introduce economic committee charter to new auctioneer
  // cf addGovernorsToEconCharter() in committee-proposal.js
  await E(E.get(econCharterKit).creatorFacet).addInstance(
    kit.instance,
    kit.governorCreatorFacet,
    kit.label,
  );

  auctionInstance.reset();
  await auctionInstance.resolve(governedInstance);
  // belt and suspenders; the above is supposed to also do this
  await E(E(agoricNamesAdmin).lookupAdmin('instance')).update(
    'auctioneer',
    governedInstance,
  );

  auctionUpgradeNewInstance.resolve(governedInstance);
};

export const ADD_AUCTION_MANIFEST = harden({
  [addAuction.name]: {
    consume: {
      agoricNamesAdmin: true,
      auctioneerKit: true,
      board: true,
      chainStorage: true,
      chainTimerService: true,
      econCharterKit: true,
      economicCommitteeCreatorFacet: true,
      priceAuthority: true,
      zoe: true,
    },
    produce: {
      auctioneerKit: true,
      auctionUpgradeNewInstance: true,
    },
    instance: {
      consume: { reserve: true },
      produce: { auctioneer: true },
    },
    installation: {
      consume: {
        contractGovernor: true,
      },
      produce: { auctioneer: true },
    },
    issuer: {
      consume: { [Stable.symbol]: true },
    },
  },
});

/**
 * Add a new auction to a chain that already has one.
 *
 * @param {object} _ign
 * @param {any} addAuctionOptions
 */
export const getManifestForAddAuction = async (_ign, addAuctionOptions) => {
  return {
    manifest: ADD_AUCTION_MANIFEST,
    options: addAuctionOptions,
  };
};
