import { E } from '@endo/far';
import { makeTracer, deeplyFulfilledObject } from '@agoric/internal';
import { makeGovernedTerms } from '@agoric/inter-protocol/src/auction/params.js';

const trace = makeTracer('LiquidationPrep');

const SECONDS_PER_MINUTE = 60n;
const SECONDS_PER_HOUR = 60n * 60n;
const SECONDS_PER_DAY = 24n * SECONDS_PER_HOUR;

export const initManualTimerFaucet = async (powers, { options: { manualTimerRef } }) => {
  trace('InitManualTimerFaucet...');
  trace('Installing manualTimer...', manualTimerRef);
  const {
    consume: { zoe },
    produce: { manualTimerKit },
    instance: {
      produce: { manualTimerInstance },
    },
  } = powers;

  const SECONDS_PER_DAY = 24n * 60n * 60n;

  const terms = harden({
    startValue: 0n,
    timeStep: SECONDS_PER_DAY * 7n,
  });

  const installation = await E(zoe).installBundleID(manualTimerRef.bundleID);
  const instanceFacets = await E(zoe).startInstance(installation, undefined, terms, undefined, 'manualTimerFaucet');

  manualTimerKit.reset();
  manualTimerKit.resolve(instanceFacets);
  manualTimerInstance.reset();
  manualTimerInstance.resolve(instanceFacets.instance);
  trace('Completed...');
};

/**
 * Since the auctioneer is not upgradable, we've to re-deploy it.
 *
 * @param powers
 * @return {Promise<void>}
 */
export const startFakeAuctioneer = async powers => {
  trace('InitAuctioneer...');

  const {
    consume: {
      zoe,
      board,
      priceAuthority,
      chainStorage,
      economicCommitteeCreatorFacet: electorateCreatorFacet,
      manualTimerKit,
    },
    produce: { fakeAuctioneerKit },
    instance: {
      consume: { reserve: reserveInstance },
    },
    installation: {
      consume: { auctioneer: fakeAuctionInstallation, contractGovernor: contractGovernorInstallation },
    },
    issuer: {
      consume: { IST: istIssuerP },
    },
  } = powers;

  const { publicFacet: manualTimerPublicFacet } = await manualTimerKit;
  const manualTimer = await E(manualTimerPublicFacet).getManualTimer();

  const auctionParams = {
    StartFrequency: 1n * SECONDS_PER_HOUR,
    ClockStep: 3n * SECONDS_PER_MINUTE,
    StartingRate: 10500n,
    LowestRate: 6500n,
    DiscountStep: 500n,
    AuctionStartDelay: 2n,
    PriceLockPeriod: SECONDS_PER_HOUR / 2n,
  };

  const poserInvitationP = E(electorateCreatorFacet).getPoserInvitation();

  const [initialPoserInvitation, electorateInvitationAmount] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
  ]);

  const timerBrand = await E(manualTimer).getTimerBrand();

  const marshaller = await E(board).getPublishingMarshaller();
  const storageNode = await E(chainStorage).makeChildNode('fakeAuctioneer');

  const reservePublicFacet = await E(zoe).getPublicFacet(reserveInstance);

  const auctionTerms = makeGovernedTerms(
    { storageNode, marshaller },
    manualTimer,
    priceAuthority,
    reservePublicFacet,
    {
      ...auctionParams,
      ElectorateInvitationAmount: electorateInvitationAmount,
      TimerBrand: timerBrand,
    },
  );

  const bidIssuer = await istIssuerP;

  const governorTerms = await deeplyFulfilledObject(
    harden({
      timer: manualTimer,
      governedContractInstallation: fakeAuctionInstallation,
      governed: {
        terms: auctionTerms,
        issuerKeywordRecord: { Bid: bidIssuer },
        storageNode,
        marshaller,
        label: 'auctioneer',
      },
    }),
  );

  trace('Start auctioneer instance...');
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

  const [governedInstance, governedCreatorFacet, governedPublicFacet] = await Promise.all([
    E(governorStartResult.creatorFacet).getInstance(),
    E(governorStartResult.creatorFacet).getCreatorFacet(),
    E(governorStartResult.creatorFacet).getPublicFacet(),
  ]);

  trace('Reset fakeAuctioneerKit...');
  fakeAuctioneerKit.reset();

  trace('Update kits...');
  fakeAuctioneerKit.resolve(
    harden({
      label: 'fakeAuctioneer',
      creatorFacet: governedCreatorFacet,
      adminFacet: governorStartResult.adminFacet,
      publicFacet: governedPublicFacet,
      instance: governedInstance,

      governor: governorStartResult.instance,
      governorCreatorFacet: governorStartResult.creatorFacet,
      governorAdminFacet: governorStartResult.adminFacet,
    }),
  );

  trace('Completed...');
};

export const upgradeVaultFactory = async (powers, { options: { vaultFactoryInc2Ref } }) => {
  trace('Init upgradeVaultFactory...');
  trace({ vaultFactoryInc2Ref });

  // Update private args with timerService and auctioneerPublicFacet
  const {
    consume: {
      vaultFactoryKit: vfKitP,
      manualTimerKit,
      fakeAuctioneerKit: fakeAuctioneerKitP,
      instancePrivateArgs,
    },
    produce: {
      auctioneerKit,
    },
    instance: {
      produce: {
        auctioneer
      }
    }
  } = powers;

  const { publicFacet } = E.get(manualTimerKit);

  const [
    vaultFactoryKit,
    manualTimer,
    auctioneerPublicFacet,
    fakeAuctioneerKit,
  ] = await Promise.all([
    vfKitP,
    E(publicFacet).getManualTimer(),
    E.get(fakeAuctioneerKitP).publicFacet,
    fakeAuctioneerKitP
  ]);

  const { privateArgs, adminFacet, instance } = vaultFactoryKit;

  const newPrivateArgs = {
    ...privateArgs,
    timerService: manualTimer,
    auctioneerPublicFacet,
  };

  trace('New Private Args');
  trace(newPrivateArgs);

  trace('Saving new private args to diagnostics...');
  await E(instancePrivateArgs).set(instance, newPrivateArgs);

  trace('Upgrading vaultFactory to incarnation 2...');
  await E(adminFacet).upgradeContract(vaultFactoryInc2Ref.bundleID, newPrivateArgs);

  // We do this after upgrading the vaultFactory to make sure it's upgraded
  // with the correct auctioneer version
  trace('Override original auctioneerKit with the fake one...');
  auctioneerKit.reset();
  auctioneerKit.resolve(fakeAuctioneerKit);

  trace('Override original auctioneer instance with the fake one...');
  auctioneer.reset();
  auctioneer.resolve(fakeAuctioneerKit.instance);

  trace('Done.');
}

export const getManifestForInitManualTimerFaucet = async (_powers, { manualTimerRef, vaultFactoryInc2Ref }) =>
  harden({
    manifest: {
      [initManualTimerFaucet.name]: {
        consume: {
          zoe: 'zoe',
        },
        produce: {
          manualTimerKit: true,
        },
        instance: {
          produce: {
            manualTimerInstance: true,
          },
        },
      },
      [startFakeAuctioneer.name]: {
        consume: {
          zoe: 'zoe',
          board: true,
          priceAuthority: true,
          chainStorage: true,
          economicCommitteeCreatorFacet: true,
          manualTimerKit: true,
        },
        produce: {
          fakeAuctioneerKit: true,
        },
        instance: {
          consume: {
            reserve: true,
          },
          produce: {
            auctioneer: true,
          },
        },
        installation: {
          consume: {
            auctioneer: true,
            contractGovernor: true,
          },
        },
        issuer: {
          consume: { IST: true },
        },
      },
      [upgradeVaultFactory.name]: {
        consume: {
          vaultFactoryKit: 'to upgrade the vaultFactory',
          manualTimerKit: 'to replace the chainTimerService',
          fakeAuctioneerKit: 'to replace the original auctioneer',
          instancePrivateArgs: 'to save the new private args',
        },
        produce: {
          auctioneerKit: 'to replace the original auctioneer',
        },
        instance: {
          produce: {
            auctioneer: "to use agops"
          }
        }
      }
    },
    options: { manualTimerRef, vaultFactoryInc2Ref },
  });
