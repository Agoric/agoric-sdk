import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { Stable } from '@agoric/internal/src/tokens.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { getInterfaceOf, E } from '@endo/far';

const trace = makeTracer('ReplaceFeeDistributer', true);

/**
 * Start the reward distributor.
 *
 * @param {import('./econ-behaviors').EconomyBootstrapPowers} powers
 * @param {{
 *   options: {
 *     keywordShares: Record<string, bigint>;
 *     collectionInterval: bigint;
 *   };
 * }} options
 */
export const replaceFeeDistributor = async (
  {
    consume: {
      chainTimerService,
      bankManager,
      vaultFactoryKit,
      periodicFeeCollectors,
      reserveKit,
      zoe,
      contractKits: contractKitsP,
    },
    produce: {
      feeDistributorKit,
      periodicFeeCollectors: periodicFeeCollectorsP,
    },
    instance: {
      produce: { feeDistributor: feeDistributorP },
    },
    installation: {
      consume: { feeDistributor },
    },
    issuer: {
      consume: { [Stable.symbol]: centralIssuerP },
    },
    brand: {
      consume: { [Stable.symbol]: centralBrandP },
    },
  },
  { options },
) => {
  trace('replaceFeeDistributer', options);

  const { keywordShares, collectionInterval } = options;

  const feeDistributorTerms = await deeplyFulfilledObject(
    harden({
      timerService: chainTimerService,
      collectionInterval,
      keywordShares,
    }),
  );
  trace('feeDistributorTerms', feeDistributorTerms);

  const [centralIssuer, centralBrand, contractKits] = await Promise.all([
    centralIssuerP,
    centralBrandP,
    contractKitsP,
  ]);

  const rewardDistributorDepositFacet = await E(bankManager)
    .getRewardDistributorDepositFacet(Stable.denom, {
      issuer: centralIssuer,
      brand: centralBrand,
    })
    .catch(e => {
      console.error('Cannot create fee collector deposit facet', e);
      return undefined;
    });

  /**
   * @type {StartedInstanceKit<
   *   typeof import('@agoric/inter-protocol/src/feeDistributor.js').start
   * >}
   */
  const instanceKit = await E(zoe).startInstance(
    feeDistributor,
    { Fee: centralIssuer },
    feeDistributorTerms,
    undefined,
    'feeDistributor',
  );
  await E(instanceKit.creatorFacet).setDestinations({
    ...(rewardDistributorDepositFacet && {
      RewardDistributor: E(
        instanceKit.creatorFacet,
      ).makeDepositFacetDestination(rewardDistributorDepositFacet),
    }),
    Reserve: E(instanceKit.creatorFacet).makeOfferDestination(
      zoe,
      'Collateral',
      E.get(reserveKit).publicFacet,
      'makeAddCollateralInvitation',
    ),
  });

  trace('Clearing the old instance from bootstrap powers...');
  feeDistributorKit.reset();
  feeDistributorP.reset();

  trace('Now introduce the new instance');
  feeDistributorKit.resolve(
    harden({ ...instanceKit, label: 'feeDistributor' }),
  );
  feeDistributorP.resolve(instanceKit.instance);

  const periodicCollectors = await periodicFeeCollectors;
  trace(
    `Stop periodicCollectors of the old instance. Number of collectors: ${periodicCollectors.getSize()}`,
  );
  for await (const [key, collector] of periodicCollectors.entries()) {
    trace('Getting debugName', key);
    // @ts-expect-error incomplete PeriodicFeeCollector type
    const debugName = await E(collector).getDebugName();
    trace(`Stopping ${debugName}...`);
    await E(collector).stop();
  }
  periodicFeeCollectorsP.reset();

  trace('Old collectors cleared. Start creating and setting new ones.');

  const collectorKit = {
    vaultFactory: E.get(vaultFactoryKit).creatorFacet,
  };
  const newCollectorStore = makeScalarBigMapStore('periodicCollectors', {
    durable: true,
  });
  await Promise.all(
    Object.entries(collectorKit).map(async ([debugName, collectorFacet]) => {
      const collector = E(instanceKit.creatorFacet).makeContractFeeCollector(
        zoe,
        collectorFacet,
      );
      const periodicCollector = await E(
        instanceKit.creatorFacet,
      ).startPeriodicCollection(debugName, collector);
      newCollectorStore.init(periodicCollectors.getSize(), periodicCollector);
    }),
  );

  trace('Write newCollectorStore in periodicFeeCollectors');
  periodicFeeCollectorsP.resolve(newCollectorStore);

  trace('Write to contractKits');
  const label = getInterfaceOf(instanceKit.instance);
  const kit = harden({ ...instanceKit, label });
  contractKits.init(kit.instance, kit);

  trace('Done.');
};
harden(replaceFeeDistributor);

const t = 'replaceFeeDistributor';
export const getManifestForReplaceFeeDistributor = async (
  { restoreRef },
  { feeDistributorRef, ...feeDistributorOptions },
) => ({
  manifest: {
    [replaceFeeDistributor.name]: {
      consume: {
        chainTimerService: t,
        bankManager: t,
        vaultFactoryKit: t,
        periodicFeeCollectors: t,
        reserveKit: t,
        zoe: t,
        contractKits: t,
      },
      produce: {
        feeDistributorKit: t,
        periodicFeeCollectors: t,
      },
      instance: {
        produce: { feeDistributor: t },
      },
      installation: {
        consume: { feeDistributor: t },
      },
      issuer: {
        consume: { [Stable.symbol]: t },
      },
      brand: {
        consume: { [Stable.symbol]: t },
      },
    },
  },
  installations: {
    feeDistributor: restoreRef(feeDistributorRef),
  },
  options: { ...feeDistributorOptions },
});
