import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';

import '@agoric/governance/exported.js';

import { AmountMath, AmountShape, BrandShape, IssuerShape } from '@agoric/ertp';
import { GovernorFacetI } from '@agoric/governance';
import { makeTracer } from '@agoric/internal';
import { initEmpty, M, mustMatch } from '@agoric/store';
import {
  prepareExoClassKit,
  provide,
  provideDurableMapStore,
} from '@agoric/vat-data';
import { assertKeywordName } from '@agoric/zoe/src/cleanProposal.js';
import {
  atomicRearrange,
  makeRecorderTopic,
  provideAll,
  provideEmptySeat,
  unitAmount,
} from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

import { makeCollectFeesInvitation } from '../collectFees.js';
import {
  setWakeupsForNextAuction,
  watchForGovernanceChange,
} from './liquidation.js';
import {
  provideVaultParamManagers,
  SHORTFALL_INVITATION_KEY,
  vaultParamPattern,
} from './params.js';
import {
  prepareVaultManagerKit,
  provideAndStartVaultManagerKits,
} from './vaultManager.js';

const { Fail, quote: q } = assert;

const trace = makeTracer('VD', true);

/**
 * @typedef {{
 *   collaterals: Brand[];
 *   rewardPoolAllocation: AmountKeywordRecord;
 * }} MetricsNotification
 *
 * @typedef {Readonly<{}>} ImmutableState
 *
 * @typedef {{}} MutableState
 *
 * @typedef {ImmutableState & MutableState} State
 *
 * @typedef {{
 *   burnDebt: BurnDebt;
 *   getGovernedParams: (
 *     collateralBrand: Brand,
 *   ) => import('./vaultManager.js').GovernedParamGetters;
 *   getDirectorParams: () => import('./vaultManager.js').DirectorParamGetters;
 *   mintAndTransfer: MintAndTransfer;
 *   getShortfallReporter: () => Promise<
 *     import('../reserve/assetReserve.js').ShortfallReporter
 *   >;
 * }} FactoryPowersFacet
 *
 * @typedef {Readonly<{
 *   state: State;
 * }>} MethodContext
 *
 * @typedef {import('@agoric/governance/src/contractGovernance/paramManager').ParamManager<
 *     import('./params.js').VaultDirectorParams
 *   >} VaultDirectorParamManager
 */

const shortfallInvitationKey = 'shortfallInvitation';

/**
 * @param {import('@agoric/ertp').Baggage} baggage
 * @param {import('./vaultFactory.js').VaultFactoryZCF} zcf
 * @param {VaultDirectorParamManager} directorParamManager
 * @param {ZCFMint<'nat'>} debtMint
 * @param {ERef<import('@agoric/time/src/types').TimerService>} timer
 * @param {ERef<import('../auction/auctioneer.js').AuctioneerPublicFacet>} auctioneer
 * @param {ERef<StorageNode>} storageNode
 * @param {ERef<Marshaller>} marshaller
 * @param {import('@agoric/zoe/src/contractSupport/recorder.js').MakeRecorderKit} makeRecorderKit
 * @param {import('@agoric/governance/src/contractGovernance/paramManager.js').ParamGovernanceExoMakers} paramMakerKit
 */
const prepareVaultDirector = (
  baggage,
  zcf,
  directorParamManager,
  debtMint,
  timer,
  auctioneer,
  storageNode,
  marshaller,
  makeRecorderKit,
  paramMakerKit,
) => {
  /** @type {import('../reserve/assetReserve.js').ShortfallReporter} */
  let shortfallReporter;

  /** For holding newly minted tokens until transferred */
  const { zcfSeat: mintSeat } = zcf.makeEmptySeatKit();

  const rewardPoolSeat = provideEmptySeat(zcf, baggage, 'rewardPoolSeat');

  /** @type {MapStore<Brand, number>} index of manager for the given collateral */
  const collateralManagers = provideDurableMapStore(
    baggage,
    'collateralManagers',
  );

  /**
   * A powerful object; it carries the ability to modify parameters. This is
   * mitigated by ensuring that vaultManagers only have access to a read facet.
   * Notice that only creator.getParamManagerRetriever() provides access to
   * powerful facets of the paramManagers.
   *
   * vaultManagers get access to factoryPowers, which has getGovernedParams(),
   * which only provides access to the ability to read parameters. Also notice
   * that the VaultDirector's creator facet isn't accessed outside this file.
   */
  const vaultParamManagers = provideVaultParamManagers(
    baggage,
    makeRecorderKit,
  );

  const metricsKit = makeRecorderKit(
    storageNode,
    /** @type {import('@agoric/zoe/src/contractSupport/recorder.js').TypedMatcher<MetricsNotification>} */ (
      M.any()
    ),
    'metrics',
  );

  const managersNode = E(storageNode).makeChildNode('managers');

  /** @returns {MetricsNotification} */
  const sampleMetrics = () => {
    return harden({
      collaterals: Array.from(collateralManagers.keys()),
      rewardPoolAllocation: rewardPoolSeat.getCurrentAllocation(),
    });
  };
  const writeMetrics = () => E(metricsKit.recorder).write(sampleMetrics());

  const updateShortfallReporter = async () => {
    const oldInvitation = baggage.has(shortfallInvitationKey)
      ? baggage.get(shortfallInvitationKey)
      : undefined;
    const newInvitation = await directorParamManager.getInternalParamValue(
      SHORTFALL_INVITATION_KEY,
    );

    // Update the values
    const zoe = zcf.getZoeService();
    ({ shortfallReporter } = await provideAll(baggage, {
      shortfallReporter: () => E(E(zoe).offer(newInvitation)).getOfferResult(),
    }));

    if (oldInvitation === undefined) {
      baggage.init(shortfallInvitationKey, newInvitation);
    } else {
      baggage.set(shortfallInvitationKey, newInvitation);
    }
  };

  /** @type {FactoryPowersFacet} */
  const factoryPowers = Far('vault factory powers', {
    /**
     * Get read-only params for this manager and its director.
     *
     * @param {Brand} brand
     */
    getGovernedParams: brand => {
      return vaultParamManagers.getParamReader(brand);
    },
    getDirectorParams: () => directorParamManager.accessors().behavior,

    /**
     * Let the manager add rewards to the rewardPoolSeat without exposing the
     * rewardPoolSeat to them.
     *
     * @type {MintAndTransfer}
     */
    mintAndTransfer: (mintReceiver, toMint, fee, nonMintTransfers) => {
      const kept = AmountMath.subtract(toMint, fee);
      debtMint.mintGains(harden({ Minted: toMint }), mintSeat);
      /** @type {TransferPart[]} */
      const transfers = [
        ...nonMintTransfers,
        [mintSeat, rewardPoolSeat, { Minted: fee }],
        [mintSeat, mintReceiver, { Minted: kept }],
      ];
      try {
        atomicRearrange(zcf, harden(transfers));
      } catch (e) {
        console.error('mintAndTransfer failed to rearrange', e);
        // If the rearrange fails, burn the newly minted tokens.
        // Assume this won't fail because it relies on the internal mint.
        // (Failure would imply much larger problems.)
        debtMint.burnLosses(harden({ Minted: toMint }), mintSeat);
        throw e;
      }
      void writeMetrics();
    },
    getShortfallReporter: async () => {
      await updateShortfallReporter();
      return shortfallReporter;
    },
    /**
     * @param {Amount<'nat'>} toBurn
     * @param {ZCFSeat} seat
     */
    burnDebt: (toBurn, seat) => {
      debtMint.burnLosses(harden({ Minted: toBurn }), seat);
    },
  });

  // defines kinds. No top-level awaits before this finishes
  const makeVaultManagerKit = prepareVaultManagerKit(baggage, {
    makeRecorderKit,
    marshaller,
    factoryPowers,
    zcf,
  });

  const vaultManagers = provideAndStartVaultManagerKits(baggage);

  /** @type {(brand: Brand) => VaultManager} */
  const managerForCollateral = brand => {
    const managerIndex = collateralManagers.get(brand);
    const manager = vaultManagers.get(managerIndex).self;
    manager || Fail`no manager ${managerIndex} for collateral ${brand}`;
    return manager;
  };

  // TODO helper to make all the topics at once
  const topics = harden({
    metrics: makeRecorderTopic('Vault Factory metrics', metricsKit),
  });

  /** @param {(vm: VaultManager) => void} fn */
  const allManagersDo = fn => {
    for (const managerIndex of collateralManagers.values()) {
      const vm = vaultManagers.get(managerIndex).self;
      fn(vm);
    }
  };

  const makeWaker = (name, func) => {
    return Far(name, {
      wake: timestamp => func(timestamp),
    });
  };

  /**
   * "Director" of the vault factory, overseeing "vault managers".
   *
   * @param {import('./vaultFactory.js').VaultFactoryZCF} zcf
   * @param {VaultDirectorParamManager} directorParamManager
   * @param {ZCFMint<'nat'>} debtMint
   */
  const makeVaultDirector = prepareExoClassKit(
    baggage,
    'VaultDirector',
    {
      creator: GovernorFacetI,
      machine: M.interface('machine', {
        addVaultType: M.call(IssuerShape, M.string(), M.record()).returns(
          M.promise(),
        ),
        makeCollectFeesInvitation: M.call().returns(M.promise()),
        getRewardAllocation: M.call().returns({ Minted: AmountShape }),
        makePriceLockWaker: M.call().returns(M.remotable('TimerWaker')),
        makeLiquidationWaker: M.call().returns(M.remotable('TimerWaker')),
        makeReschedulerWaker: M.call().returns(M.remotable('TimerWaker')),
      }),
      public: M.interface('public', {
        getCollateralManager: M.call(BrandShape).returns(
          M.remotable('vaultManager'),
        ),
        getDebtIssuer: M.call().returns(IssuerShape),
        getPublicTopics: M.call().returns(M.promise()),
        getGovernedParams: M.call({ collateralBrand: BrandShape }).returns(
          M.record(),
        ),
        getParamDescriptions: M.call({ collateralBrand: BrandShape }).returns(
          M.record(),
        ),
      }),
      helper: M.interface('helper', {
        resetWakeupsForNextAuction: M.call().returns(M.promise()),
        start: M.call().returns(M.promise()),
        getters: M.call().returns(M.any()),
      }),
    },
    initEmpty,
    {
      creator: {
        getParamMgrRetriever: () =>
          Far('paramManagerRetriever', {
            /** @param {VaultFactoryParamPath} paramPath */
            get: (
              paramPath = { key: /** @type {const} */ 'governedParams' },
            ) => {
              if (paramPath.key === 'governedParams') {
                return directorParamManager;
              } else if (paramPath.key.collateralBrand) {
                return vaultParamManagers.get(paramPath.key.collateralBrand);
              } else {
                assert.fail('Unsupported paramPath');
              }
            },
          }),
        /** @param {string} name */
        getInvitation(name) {
          return directorParamManager.getInternalParamValue(name);
        },
        getLimitedCreatorFacet() {
          return this.facets.machine;
        },
        /** @returns {ERef<GovernedApis>} */
        getGovernedApis() {
          // @ts-expect-error cast
          return Far('governedAPIs', {});
        },
        getGovernedApiNames() {
          return harden([]);
        },
        setOfferFilter: strings => zcf.setOfferFilter(strings),
      },
      machine: {
        // TODO move this under governance #3924
        /**
         * @param {Issuer<'nat'>} collateralIssuer
         * @param {Keyword} collateralKeyword
         * @param {VaultManagerParamValues} initialParamValues
         */
        async addVaultType(
          collateralIssuer,
          collateralKeyword,
          initialParamValues,
        ) {
          trace('addVaultType', collateralKeyword, initialParamValues);
          mustMatch(
            collateralIssuer,
            M.remotable('Issuer'),
            'collateralIssuer',
          );
          assertKeywordName(collateralKeyword);
          mustMatch(
            initialParamValues,
            vaultParamPattern,
            'initialParamValues',
          );
          await zcf.saveIssuer(collateralIssuer, collateralKeyword);
          const collateralBrand = zcf.getBrandForIssuer(collateralIssuer);
          // We create only one vault per collateralType.
          !collateralManagers.has(collateralBrand) ||
            Fail`Collateral brand ${q(collateralBrand)} has already been added`;

          // zero-based index of the manager being made
          const managerIndex = vaultManagers.length();
          const managerId = `manager${managerIndex}`;
          const managerStorageNode = await E(managersNode).makeChildNode(
            managerId,
          );
          const govStorageNode = await E(managerStorageNode).makeChildNode(
            'governance',
          );

          vaultParamManagers.addParamManager(
            collateralBrand,
            managerStorageNode,
            govStorageNode,
            initialParamValues,
            paramMakerKit,
          );

          const startTimeStamp = await E(timer).getCurrentTimestamp();

          const collateralUnit = await unitAmount(collateralBrand);

          const kit = await makeVaultManagerKit({
            debtMint,
            collateralBrand,
            collateralUnit,
            descriptionScope: managerId,
            startTimeStamp,
            storageNode: managerStorageNode,
          });
          vaultManagers.add(kit);
          vaultManagers.length() - 1 === managerIndex ||
            Fail`mismatch VaultManagerKit count`;
          const { self: vm } = kit;
          vm || Fail`no vault`;
          collateralManagers.init(collateralBrand, managerIndex);
          void writeMetrics();
          return vm;
        },
        makeCollectFeesInvitation() {
          return makeCollectFeesInvitation(
            zcf,
            rewardPoolSeat,
            debtMint.getIssuerRecord().brand,
            'Minted',
          );
        },
        // XXX accessors for tests
        getRewardAllocation() {
          return rewardPoolSeat.getCurrentAllocation();
        },

        makeLiquidationWaker() {
          return makeWaker('liquidationWaker', _timestamp => {
            // XXX floating promise
            allManagersDo(vm => vm.liquidateVaults(auctioneer));
          });
        },
        makeReschedulerWaker() {
          const { facets } = this;
          return makeWaker('reschedulerWaker', () => {
            void facets.helper.resetWakeupsForNextAuction();
          });
        },
        makePriceLockWaker() {
          return makeWaker('priceLockWaker', () => {
            allManagersDo(vm => vm.lockOraclePrices());
          });
        },
      },
      public: {
        /** @param {Brand} brandIn */
        getCollateralManager(brandIn) {
          collateralManagers.has(brandIn) ||
            Fail`Not a supported collateral type ${brandIn}`;
          return managerForCollateral(brandIn).getPublicFacet();
        },
        getDebtIssuer() {
          return debtMint.getIssuerRecord().issuer;
        },
        getPublicTopics(collateralBrand) {
          if (collateralBrand) {
            return vaultParamManagers.get(collateralBrand).getPublicTopics();
          }
          return E.when(directorParamManager.getPublicTopics(), publicTopics =>
            harden({
              metrics: topics.metrics,
              ...publicTopics,
            }),
          );
        },
        /** @param {{ collateralBrand: Brand }} selector */
        getGovernedParams({ collateralBrand }) {
          return vaultParamManagers.get(collateralBrand).getParamDescriptions();
        },
        /** @param {{ collateralBrand: Brand }} selector */
        getParamDescriptions({ collateralBrand }) {
          return vaultParamManagers.get(collateralBrand).getParamDescriptions();
        },
      },
      helper: {
        resetWakeupsForNextAuction() {
          const { facets } = this;

          const priceLockWaker = facets.machine.makePriceLockWaker();
          const liquidationWaker = facets.machine.makeLiquidationWaker();
          const rescheduleWaker = facets.machine.makeReschedulerWaker();
          return setWakeupsForNextAuction(
            auctioneer,
            timer,
            priceLockWaker,
            liquidationWaker,
            rescheduleWaker,
          );
        },
        getters(collateralBrand) {
          return vaultParamManagers.getParamReader(collateralBrand);
        },
        /** Start non-durable processes (or restart if needed after vat restart) */
        async start() {
          const { helper, machine } = this.facets;

          await helper.resetWakeupsForNextAuction();
          updateShortfallReporter().catch(err =>
            console.error(
              '🛠️ updateShortfallReporter failed during start(); repair by updating governance',
              err,
            ),
          );
          // independent of the other one which can be canceled
          const rescheduleWaker = machine.makeReschedulerWaker();
          void watchForGovernanceChange(auctioneer, timer, rescheduleWaker);
        },
      },
    },
  );
  return makeVaultDirector;
};
harden(prepareVaultDirector);

/**
 * Prepare the VaultDirector kind, get or make the singleton
 *
 * @type {(
 *   ...pvdArgs: Parameters<typeof prepareVaultDirector>
 * ) => ReturnType<ReturnType<typeof prepareVaultDirector>>}
 */
export const provideDirector = (...args) => {
  // defines kinds. No top-level awaits before this finishes
  const makeVaultDirector = prepareVaultDirector(...args);

  const [baggage] = args;

  return provide(baggage, 'director', makeVaultDirector);
};
harden(provideDirector);
