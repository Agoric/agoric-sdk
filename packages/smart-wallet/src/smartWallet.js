import {
  AmountMath,
  AmountShape,
  BrandShape,
  DisplayInfoShape,
  IssuerShape,
  PaymentShape,
  PurseShape,
} from '@agoric/ertp';
import { StorageNodeShape } from '@agoric/internal';
import { observeNotifier } from '@agoric/notifier';
import { M, mustMatch } from '@agoric/store';
import { appendToStoredArray } from '@agoric/store/src/stores/store-utils.js';
import { makeScalarBigMapStore, prepareExoClassKit } from '@agoric/vat-data';
import {
  prepareRecorderKit,
  SubscriberShape,
  TopicsRecordShape,
} from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/far';
import { makeInvitationsHelper } from './invitations.js';
import { makeOfferExecutor } from './offers.js';
import { shape } from './typeGuards.js';
import { objectMapStoragePath } from './utils.js';

const { Fail, quote: q } = assert;

/**
 * @file Smart wallet module
 *
 * @see {@link ../README.md}}
 */

/**
 * @typedef {{
 *   method: 'executeOffer'
 *   offer: import('./offers.js').OfferSpec,
 * }} ExecuteOfferAction
 */

/**
 * @typedef {{
 *   method: 'tryExitOffer'
 *   offerId: import('./offers.js').OfferId,
 * }} TryExitOfferAction
 */

// Discriminated union. Possible future messages types:
// maybe suggestIssuer for https://github.com/Agoric/agoric-sdk/issues/6132
// setting petnames and adding brands for https://github.com/Agoric/agoric-sdk/issues/6126
/**
 * @typedef { ExecuteOfferAction | TryExitOfferAction } BridgeAction
 */

/**
 * Purses is an array to support a future requirement of multiple purses per brand.
 *
 * Each map is encoded as an array of entries because a Map doesn't serialize directly.
 * We also considered having a vstorage key for each offer but for now are sticking with this design.
 *
 * Cons
 *    - Reserializes previously written results when a new result is added
 *    - Optimizes reads though writes are on-chain (~100 machines) and reads are off-chain (to 1 machine)
 *
 * Pros
 *    - Reading all offer results happens much more (>100) often than storing a new offer result
 *    - Reserialization and writes are paid in execution gas, whereas reads are not
 *
 * This design should be revisited if ever batch querying across vstorage keys become cheaper or reads be paid.
 *
 * @typedef {{
 *   purses: Array<{brand: Brand, balance: Amount}>,
 *   offerToUsedInvitation: Array<[ offerId: string, usedInvitation: Amount ]>,
 *   offerToPublicSubscriberPaths: Array<[ offerId: string, publicTopics: { [subscriberName: string]: string } ]>,
 *   liveOffers: Array<[import('./offers.js').OfferId, import('./offers.js').OfferStatus]>,
 * }} CurrentWalletRecord
 */

/**
 * @typedef {{ updated: 'offerStatus', status: import('./offers.js').OfferStatus }
 *   | { updated: 'balance'; currentAmount: Amount }
 *   | { updated: 'walletAction'; status: { error: string } }
 * } UpdateRecord Record of an update to the state of this wallet.
 *
 * Client is responsible for coalescing updates into a current state. See `coalesceUpdates` utility.
 *
 * The reason for this burden on the client is that publishing
 * the full history of offers with each change is untenable.
 *
 * `balance` update supports forward-compatibility for more than one purse per
 * brand. An additional key will be needed to disambiguate. For now the brand in
 * the amount suffices.
 */

/**
 * @typedef {{
 *   brand: Brand,
 *   displayInfo: DisplayInfo,
 *   issuer: Issuer,
 *   petname: import('./types').Petname
 * }} BrandDescriptor
 * For use by clients to describe brands to users. Includes `displayInfo` to save a remote call.
 */

// imports
/** @typedef {import('./types').RemotePurse} RemotePurse */

/**
 * @typedef {{
 *   address: string,
 *   bank: ERef<import('@agoric/vats/src/vat-bank').Bank>,
 *   currentStorageNode: StorageNode,
 *   invitationPurse: Purse<'set'>,
 *   walletStorageNode: StorageNode,
 * }} UniqueParams
 *
 * @typedef {Pick<MapStore<Brand, BrandDescriptor>, 'has' | 'get' | 'values'>} BrandDescriptorRegistry
 * @typedef {{
 *   agoricNames: ERef<import('@agoric/vats').NameHub>,
 *   registry: BrandDescriptorRegistry,
 *   invitationIssuer: Issuer<'set'>,
 *   invitationBrand: Brand<'set'>,
 *   invitationDisplayInfo: DisplayInfo,
 *   publicMarshaller: Marshaller,
 *   zoe: ERef<ZoeService>,
 * }} SharedParams
 *
 * @typedef {ImmutableState & MutableState} State
 * - `brandPurses` is precious and closely held. defined as late as possible to reduce its scope.
 * - `offerToInvitationMakers` is precious and closely held.
 * - `offerToPublicSubscriberPaths` is precious and closely held.
 * - `purseBalances` is a cache of what we've received from purses. Held so we can publish all balances on change.
 *
 * @typedef {Readonly<UniqueParams & {
 *   paymentQueues: MapStore<Brand, Array<import('@endo/far').FarRef<Payment>>>,
 *   offerToInvitationMakers: MapStore<string, import('./types').RemoteInvitationMakers>,
 *   offerToPublicSubscriberPaths: MapStore<string, Record<string, string>>,
 *   offerToUsedInvitation: MapStore<string, Amount>,
 *   purseBalances: MapStore<RemotePurse, Amount>,
 *   updateRecorderKit: import('@agoric/zoe/src/contractSupport/recorder.js').RecorderKit<UpdateRecord>,
 *   currentRecorderKit: import('@agoric/zoe/src/contractSupport/recorder.js').RecorderKit<CurrentWalletRecord>,
 *   liveOffers: MapStore<import('./offers.js').OfferId, import('./offers.js').OfferStatus>,
 *   liveOfferSeats: WeakMapStore<import('./offers.js').OfferId, UserSeat<unknown>>,
 * }>} ImmutableState
 *
 * @typedef {{
 * }} MutableState
 */

/**
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {SharedParams} shared
 */
export const prepareSmartWallet = (baggage, shared) => {
  const { registry: _, ...passableShared } = shared;
  mustMatch(
    harden(passableShared),
    harden({
      agoricNames: M.eref(M.remotable('agoricNames')),
      invitationIssuer: IssuerShape,
      invitationBrand: BrandShape,
      invitationDisplayInfo: DisplayInfoShape,
      publicMarshaller: M.remotable('Marshaller'),
      zoe: M.eref(M.remotable('ZoeService')),
    }),
  );

  const makeRecorderKit = prepareRecorderKit(baggage, shared.publicMarshaller);

  /**
   *
   * @param {UniqueParams} unique
   * @returns {State}
   */
  const initState = unique => {
    // Some validation of inputs.
    mustMatch(
      unique,
      harden({
        address: M.string(),
        bank: M.eref(M.remotable()),
        invitationPurse: PurseShape,
        currentStorageNode: M.eref(StorageNodeShape),
        walletStorageNode: M.eref(StorageNodeShape),
      }),
    );

    const preciousState = {
      // Payments that couldn't be deposited when received.
      // NB: vulnerable to uncapped growth by unpermissioned deposits.
      paymentQueues: makeScalarBigMapStore('payments queues', {
        durable: true,
      }),
      // Invitation amounts to save for persistent lookup
      offerToUsedInvitation: makeScalarBigMapStore(
        'invitation amounts by offer',
        {
          durable: true,
        },
      ),
      // Invitation makers yielded by offer results
      offerToInvitationMakers: makeScalarBigMapStore(
        'invitation makers by offer',
        {
          durable: true,
        },
      ),
      // Public subscribers yielded by offer results
      offerToPublicSubscriberPaths: makeScalarBigMapStore(
        'public subscribers by offer',
        {
          durable: true,
        },
      ),
    };

    /** @type {import('@agoric/zoe/src/contractSupport/recorder.js').RecorderKit<UpdateRecord>} */
    const updateRecorderKit = makeRecorderKit(unique.walletStorageNode);
    // NB: state size must not grow monotonically
    // This is the node that UIs subscribe to for everything they need.
    // e.g. agoric follow :published.wallet.agoric1nqxg4pye30n3trct0hf7dclcwfxz8au84hr3ht
    /** @type {import('@agoric/zoe/src/contractSupport/recorder.js').RecorderKit<CurrentWalletRecord>} */
    const currentRecorderKit = makeRecorderKit(unique.currentStorageNode);

    const nonpreciousState = {
      // What purses have reported on construction and by getCurrentAmountNotifier updates.
      purseBalances: makeScalarBigMapStore('purse balances', { durable: true }),
      updateRecorderKit,
      currentRecorderKit,
      liveOffers: makeScalarBigMapStore('live offers', { durable: true }),
      // Keep seats separate from the offers because we don't want to publish these.
      liveOfferSeats: makeScalarBigMapStore('live offer seats', {
        durable: true,
      }),
    };

    return {
      ...unique,
      ...nonpreciousState,
      ...preciousState,
    };
  };

  const behaviorGuards = {
    helper: M.interface('helperFacetI', {
      assertUniqueOfferId: M.call(M.string()).returns(),
      updateBalance: M.call(PurseShape, AmountShape).optional('init').returns(),
      publishCurrentState: M.call().returns(),
      watchPurse: M.call(M.eref(PurseShape)).returns(M.promise()),
    }),
    deposit: M.interface('depositFacetI', {
      receive: M.callWhen(M.await(M.eref(PaymentShape))).returns(AmountShape),
    }),
    offers: M.interface('offers facet', {
      executeOffer: M.call(shape.OfferSpec).returns(M.promise()),
      tryExitOffer: M.call(M.scalar()).returns(M.promise()),
    }),
    self: M.interface('selfFacetI', {
      handleBridgeAction: M.call(shape.StringCapData, M.boolean()).returns(
        M.promise(),
      ),
      getDepositFacet: M.call().returns(M.remotable()),
      getOffersFacet: M.call().returns(M.remotable()),
      getCurrentSubscriber: M.call().returns(SubscriberShape),
      getUpdatesSubscriber: M.call().returns(SubscriberShape),
      getPublicTopics: M.call().returns(TopicsRecordShape),
    }),
  };

  /**
   * Make the durable object to return, but taking some parameters that are awaited by a wrapping function.
   * This is necessary because the class kit construction helpers, `initState` and `finish` run synchronously
   * and the child storage node must be awaited until we have durable promises.
   */
  const makeWalletWithResolvedStorageNodes = prepareExoClassKit(
    baggage,
    'SmartWallet',
    behaviorGuards,
    initState,
    {
      helper: {
        /**
         * Assert this ID is unique with respect to what has been stored. The
         * wallet doesn't store every offer ID but the offers for which it
         * doesn't are unlikely to be impacted by re-use.
         *
         * @type {(id: string) => void}
         */
        assertUniqueOfferId(id) {
          const {
            liveOffers,
            liveOfferSeats,
            offerToInvitationMakers,
            offerToPublicSubscriberPaths,
            offerToUsedInvitation,
          } = this.state;
          const used =
            liveOffers.has(id) ||
            liveOfferSeats.has(id) ||
            offerToInvitationMakers.has(id) ||
            offerToPublicSubscriberPaths.has(id) ||
            offerToUsedInvitation.has(id);
          !used || Fail`cannot re-use offer id ${id}`;
        },
        /**
         * @param {RemotePurse} purse
         * @param {Amount<any>} balance
         */
        updateBalance(purse, balance) {
          const { purseBalances, updateRecorderKit } = this.state;
          if (purseBalances.has(purse)) {
            purseBalances.set(purse, balance);
          } else {
            purseBalances.init(purse, balance);
          }
          void updateRecorderKit.recorder.write({
            updated: 'balance',
            currentAmount: balance,
          });
          const { helper } = this.facets;
          helper.publishCurrentState();
        },

        publishCurrentState() {
          const {
            currentRecorderKit,
            offerToUsedInvitation,
            offerToPublicSubscriberPaths,
            purseBalances,
            liveOffers,
          } = this.state;
          void currentRecorderKit.recorder.write({
            purses: [...purseBalances.values()].map(a => ({
              brand: a.brand,
              balance: a,
            })),
            offerToUsedInvitation: [...offerToUsedInvitation.entries()],
            offerToPublicSubscriberPaths: [
              ...offerToPublicSubscriberPaths.entries(),
            ],
            liveOffers: [...liveOffers.entries()],
          });
        },

        /** @type {(purse: ERef<RemotePurse>) => Promise<void>} */
        async watchPurse(purseRef) {
          const { address } = this.state;

          const purse = await purseRef; // promises don't fit in durable storage

          const { helper } = this.facets;
          // publish purse's balance and changes
          void E.when(
            E(purse).getCurrentAmount(),
            balance => helper.updateBalance(purse, balance),
            err =>
              console.error(
                address,
                'initial purse balance publish failed',
                err,
              ),
          );
          void observeNotifier(E(purse).getCurrentAmountNotifier(), {
            updateState(balance) {
              helper.updateBalance(purse, balance);
            },
            fail(reason) {
              console.error(address, `failed updateState observer`, reason);
            },
          });
        },
      },
      /**
       * Similar to {DepositFacet} but async because it has to look up the purse.
       */
      deposit: {
        /**
         * Put the assets from the payment into the appropriate purse.
         *
         * If the purse doesn't exist, we hold the payment in durable storage.
         *
         * @param {import('@endo/far').FarRef<Payment>} payment
         * @returns {Promise<Amount>} amounts for deferred deposits will be empty
         */
        async receive(payment) {
          const { paymentQueues: queues, bank, invitationPurse } = this.state;
          const { registry, invitationBrand } = shared;
          const brand = await E(payment).getAllegedBrand();

          // When there is a purse deposit into it
          if (registry.has(brand)) {
            const purse = E(bank).getPurse(brand);
            // @ts-expect-error deposit does take a FarRef<Payment>
            return E(purse).deposit(payment);
          } else if (invitationBrand === brand) {
            // @ts-expect-error deposit does take a FarRef<Payment>
            return E(invitationPurse).deposit(payment);
          }

          // When there is no purse, save the payment into a queue.
          // It's not yet ever read but a future version of the contract can
          appendToStoredArray(queues, brand, payment);
          return AmountMath.makeEmpty(brand);
        },
      },
      offers: {
        /**
         * Take an offer description provided in capData, augment it with payments and call zoe.offer()
         *
         * @param {import('./offers.js').OfferSpec} offerSpec
         * @returns {Promise<void>} after the offer has been both seated and exited by Zoe.
         * @throws if any parts of the offer can be determined synchronously to be invalid
         */
        async executeOffer(offerSpec) {
          const { facets, state } = this;
          const {
            address,
            bank,
            invitationPurse,
            offerToInvitationMakers,
            offerToUsedInvitation,
            offerToPublicSubscriberPaths,
            updateRecorderKit,
          } = this.state;
          const { invitationBrand, zoe, invitationIssuer, registry } = shared;

          facets.helper.assertUniqueOfferId(String(offerSpec.id));

          const logger = {
            info: (...args) => console.info('wallet', address, ...args),
            error: (...args) => console.error('wallet', address, ...args),
          };

          const executor = makeOfferExecutor({
            zoe,
            depositFacet: facets.deposit,
            invitationIssuer,
            powers: {
              invitationFromSpec: makeInvitationsHelper(
                zoe,
                shared.agoricNames,
                invitationBrand,
                invitationPurse,
                offerToInvitationMakers.get,
              ),
              /**
               * @param {Brand} brand
               * @returns {Promise<RemotePurse>}
               */
              purseForBrand: async brand => {
                if (registry.has(brand)) {
                  // @ts-expect-error RemotePurse cast
                  return E(bank).getPurse(brand);
                } else if (invitationBrand === brand) {
                  // @ts-expect-error RemotePurse cast
                  return invitationPurse;
                }
                throw Fail`cannot find/make purse for ${brand}`;
              },
              logger,
            },
            onStatusChange: offerStatus => {
              logger.info('offerStatus', offerStatus);

              void updateRecorderKit.recorder.write({
                updated: 'offerStatus',
                status: offerStatus,
              });

              const isSeatExited = 'numWantsSatisfied' in offerStatus;
              if (isSeatExited) {
                if (state.liveOfferSeats.has(offerStatus.id)) {
                  state.liveOfferSeats.delete(offerStatus.id);
                }

                if (state.liveOffers.has(offerStatus.id)) {
                  state.liveOffers.delete(offerStatus.id);
                  facets.helper.publishCurrentState();
                }
              }
            },
            /** @type {(offerId: string, invitationAmount: Amount<'set'>, invitationMakers: import('./types').RemoteInvitationMakers, publicSubscribers?: import('./types').PublicSubscribers | import('@agoric/zoe/src/contractSupport').TopicsRecord) => Promise<void>} */
            onNewContinuingOffer: async (
              offerId,
              invitationAmount,
              invitationMakers,
              publicSubscribers,
            ) => {
              offerToUsedInvitation.init(offerId, invitationAmount);
              offerToInvitationMakers.init(offerId, invitationMakers);
              const pathMap = await objectMapStoragePath(publicSubscribers);
              if (pathMap) {
                logger.info('recording pathMap', pathMap);
                offerToPublicSubscriberPaths.init(offerId, pathMap);
              }
              facets.helper.publishCurrentState();
            },
          });

          return executor.executeOffer(offerSpec, seatRef => {
            state.liveOffers.init(offerSpec.id, offerSpec);
            facets.helper.publishCurrentState();
            state.liveOfferSeats.init(offerSpec.id, seatRef);
          });
        },
        /**
         * Take an offer's id, look up its seat, try to exit.
         *
         * @param {import('./offers.js').OfferId} offerId
         * @returns {Promise<void>}
         * @throws if the seat can't be found or E(seatRef).tryExit() fails.
         */
        async tryExitOffer(offerId) {
          const seatRef = this.state.liveOfferSeats.get(offerId);
          await E(seatRef).tryExit();
        },
      },
      self: {
        /**
         * Umarshals the actionCapData and delegates to the appropriate action handler.
         *
         * @param {import('@endo/marshal').CapData<string>} actionCapData of type BridgeAction
         * @param {boolean} [canSpend]
         * @returns {Promise<void>}
         */
        handleBridgeAction(actionCapData, canSpend = false) {
          const { publicMarshaller } = shared;

          const { offers } = this.facets;

          /** @param {Error} err */
          const recordError = err => {
            const { address, updateRecorderKit } = this.state;
            console.error('wallet', address, 'handleBridgeAction error:', err);
            void updateRecorderKit.recorder.write({
              updated: 'walletAction',
              status: { error: err.message },
            });
          };

          // use E.when to retain distributed stack trace
          return E.when(
            E(publicMarshaller).fromCapData(actionCapData),
            /** @param {BridgeAction} action */
            action => {
              try {
                switch (action.method) {
                  case 'executeOffer': {
                    canSpend || Fail`executeOffer requires spend authority`;
                    return offers.executeOffer(action.offer);
                  }
                  case 'tryExitOffer': {
                    assert(canSpend, 'tryExitOffer requires spend authority');
                    return offers.tryExitOffer(action.offerId);
                  }
                  default: {
                    throw Fail`invalid handle bridge action ${q(action)}`;
                  }
                }
              } catch (err) {
                // record synchronous error in the action delegator above
                // but leave async rejections alone because the offer handler recorded them
                // with greater detail
                recordError(err);
              }
            },
            // record errors in the unserialize and leave the rejection handled
            recordError,
          );
        },
        getDepositFacet() {
          return this.facets.deposit;
        },
        getOffersFacet() {
          return this.facets.offers;
        },
        /** @deprecated use getPublicTopics */
        getCurrentSubscriber() {
          return this.state.currentRecorderKit.subscriber;
        },
        /** @deprecated use getPublicTopics */
        getUpdatesSubscriber() {
          return this.state.updateRecorderKit.subscriber;
        },
        getPublicTopics() {
          const { currentRecorderKit, updateRecorderKit } = this.state;
          return harden({
            current: {
              description: 'Current state of wallet',
              subscriber: currentRecorderKit.subscriber,
              storagePath: currentRecorderKit.recorder.getStoragePath(),
            },
            updates: {
              description: 'Changes to wallet',
              subscriber: updateRecorderKit.subscriber,
              storagePath: updateRecorderKit.recorder.getStoragePath(),
            },
          });
        },
      },
    },
    {
      finish: ({ state, facets }) => {
        const { invitationPurse } = state;
        const { helper } = facets;

        // @ts-expect-error RemotePurse cast
        void helper.watchPurse(invitationPurse);
      },
    },
  );

  /**
   * @param {Omit<UniqueParams, 'currentStorageNode' | 'walletStorageNode'> & {walletStorageNode: ERef<StorageNode>}} uniqueWithoutChildNodes
   */
  const makeSmartWallet = async uniqueWithoutChildNodes => {
    const [walletStorageNode, currentStorageNode] = await Promise.all([
      uniqueWithoutChildNodes.walletStorageNode,
      E(uniqueWithoutChildNodes.walletStorageNode).makeChildNode('current'),
    ]);

    return makeWalletWithResolvedStorageNodes(
      harden({
        ...uniqueWithoutChildNodes,
        currentStorageNode,
        walletStorageNode,
      }),
    ).self;
  };
  return makeSmartWallet;
};
harden(prepareSmartWallet);

/** @typedef {Awaited<ReturnType<ReturnType<typeof prepareSmartWallet>>>} SmartWallet */
