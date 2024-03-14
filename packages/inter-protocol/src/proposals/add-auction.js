import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';
import { Stable } from '@agoric/internal/src/tokens.js';
import { makeGovernedTerms as makeGovernedATerms } from '../auction/params.js';
import { SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from './econ-behaviors.js';

const trace = makeTracer('NewAuction', true);

/**
 * @param {import('./econ-behaviors.js').EconomyBootstrapPowers} powers
 * @param {object} config
 * @param {any} [config.auctionParams]
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
    },
    produce: { newAuctioneerKit },
    instance: {
      consume: { reserve: reserveInstance },
    },
    installation: {
      consume: {
        auctioneer: auctionInstallation,
        contractGovernor: contractGovernorInstallation,
      },
    },
    issuer: {
      consume: { [Stable.symbol]: stableIssuerP },
    },
  },
  {
    auctionParams = {
      StartFrequency: 1n * SECONDS_PER_HOUR,
      ClockStep: 3n * SECONDS_PER_MINUTE,
      StartingRate: 10500n,
      LowestRate: 6500n,
      DiscountStep: 500n,
      AuctionStartDelay: 2n,
      PriceLockPeriod: SECONDS_PER_HOUR / 2n,
    },
  } = {},
) => {
  trace('startAuctioneer');
  const STORAGE_PATH = 'auction';

  const poserInvitationP = E(electorateCreatorFacet).getPoserInvitation();

  const [initialPoserInvitation, electorateInvitationAmount, stableIssuer] =
    await Promise.all([
      poserInvitationP,
      E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
      stableIssuerP,
    ]);

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
      ...auctionParams,
      ElectorateInvitationAmount: electorateInvitationAmount,
      TimerBrand: timerBrand,
    },
  );

  const governorTerms = await deeplyFulfilledObject(
    harden({
      timer: chainTimerService,
      governedContractInstallation: auctionInstallation,
      governed: {
        terms: auctionTerms,
        issuerKeywordRecord: { Bid: stableIssuer },
        storageNode,
        marshaller,
        label: 'auctioneer',
      },
    }),
  );

  /** @type {GovernorStartedInstallationKit<typeof auctionInstallation>} */
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

  // don't overwrite auctioneerKit yet
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
  // don't replace auction instance yet.
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
    },
    produce: {
      newAuctioneerKit: true,
    },
    instance: {
      consume: { reserve: true },
    },
    installation: {
      consume: {
        auctioneer: true,
        contractGovernor: true,
      },
    },
    issuer: {
      consume: { [Stable.symbol]: true },
    },
  },
});

/* Add a new auction to a chain that already has one. */
export const getManifestForAddAuction = async () => {
  return { manifest: ADD_AUCTION_MANIFEST };
};
