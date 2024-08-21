import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';
import { Stable } from '@agoric/internal/src/tokens.js';
import { makeGovernedTerms as makeGovernedATerms } from '../auction/params.js';

const trace = makeTracer('NewAuction', true);

/**
 * @typedef {PromiseSpaceOf<{
 *   auctionsUpgradeComplete: boolean;
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
      zoe,
      board,
      chainTimerService,
      priceAuthority,
      chainStorage,
      economicCommitteeCreatorFacet: electorateCreatorFacet,
      auctioneerKit: legacyKitP,
    },
    produce: { newAuctioneerKit, auctionsUpgradeComplete },
    instance: {
      consume: { reserve: reserveInstance },
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

  newAuctioneerKit.resolve(
    harden({
      label: 'auctioneer',
      creatorFacet: governedCreatorFacet,
      adminFacet: governorStartResult.adminFacet,
      publicFacet: governedPublicFacet,
      instance: governedInstance,

      governor: governorStartResult.instance,
      governorCreatorFacet: governorStartResult.creatorFacet,
      governorAdminFacet: governorStartResult.adminFacet,
    }),
  );
  // don't overwrite auctioneerKit or auction instance yet. Wait until
  // upgrade-vault.js

  auctionsUpgradeComplete.resolve(true);
};

export const ADD_AUCTION_MANIFEST = harden({
  [addAuction.name]: {
    consume: {
      zoe: true,
      board: true,
      chainTimerService: true,
      priceAuthority: true,
      chainStorage: true,
      economicCommitteeCreatorFacet: true,
      auctioneerKit: true,
    },
    produce: {
      newAuctioneerKit: true,
      auctionsUpgradeComplete: true,
    },
    instance: {
      consume: { reserve: true },
    },
    installation: {
      consume: {
        auctioneer: true,
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
