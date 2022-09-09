// @ts-check
import { AmountMath, AmountShape, PaymentShape } from '@agoric/ertp';
import { isNat } from '@agoric/nat';
import {
  makeStoredPublishKit,
  observeIteration,
  observeNotifier,
} from '@agoric/notifier';
import { M, makeScalarMapStore } from '@agoric/store';
import {
  defineVirtualFarClassKit,
  makeScalarBigMapStore,
  pickFacet,
} from '@agoric/vat-data';
import { E } from '@endo/far';
import { makeInvitationsHelper } from './invitations.js';
import { makeOfferExecutor } from './offers.js';
import { shape } from './typeGuards.js';

const { details: X, quote: q } = assert;

/**
 * @file Smart wallet module
 *
 * @see {@link ../README.md}}
 */

// One method yet but structured to support more. For example,
// maybe suggestIssuer for https://github.com/Agoric/agoric-sdk/issues/6132
// setting petnames and adding brands for https://github.com/Agoric/agoric-sdk/issues/6126
/**
 * @typedef {{
 *   method: 'executeOffer'
 *   offer: import('./offers.js').OfferSpec,
 * }} BridgeAction
 */

/**
 * @typedef {{ updated: 'offerStatus', status: import('./offers.js').OfferStatus } |
 * { updated: 'balance'; currentAmount: Amount } |
 * { updated: 'brand', descriptor: BrandDescriptor }
 * } UpdateRecord Record of an update to the state of this wallet.
 *
 * Client is responsible for coalescing updates into a current state. See `coalesceUpdates` utility.
 *
 * The reason for this burden on the client is that transferring the full state is untenable
 * (because it would grow monotonically).
 *
 * `balance` update supports forward-compatibility for more than one purse per
 * brand. An additional key will be needed to disambiguate. For now the brand in
 * the amount suffices.
 */

/**
 * @typedef {{
 * brand: Brand,
 * displayInfo: DisplayInfo,
 * issuer: ERef<Issuer>,
 * petname: import('./types').Petname
 * }} BrandDescriptor
 * For use by clients to describe brands to users. Includes `displayInfo` to save a remote call.
 */

// imports
/** @typedef {import('./types').RemotePurse} RemotePurse */

/**
 * @typedef {ImmutableState & MutableState} State
 * - `brandPurses` is precious and closely held. defined as late as possible to reduce its scope.
 * - `offerToInvitationMakers` is precious and closely held.
 * - `lastOfferId` is public. While it should survive upgrade, if it doesn't it can be determined from the last `offerStatus` notification.
 * - `brandDescriptors` will be precious. Currently it includes invitation brand and  what we've received from the bank manager.
 * - `purseBalances` is a cache of what we've received from purses. Held so we can publish all balances on change.
 *
 * @typedef {Parameters<initState>[0] & Parameters<initState>[1]} HeldParams
 *
 * @typedef {Readonly<HeldParams & {
 * paymentQueues: MapStore<Brand, Array<import('@endo/far').FarRef<Payment>>>,
 * offerToInvitationMakers: MapStore<number, import('./types').RemoteInvitationMakers>,
 * brandDescriptors: MapStore<Brand, BrandDescriptor>,
 * brandPurses: MapStore<Brand, RemotePurse>,
 * purseBalances: MapStore<RemotePurse, Amount>,
 * updatePublishKit: StoredPublishKit<UpdateRecord>,
 * }>} ImmutableState
 *
 * @typedef {{
 * lastOfferId: number,
 * }} MutableState
 */

/**
 *
 * @param {{
 * address: string,
 * bank: ERef<import('@agoric/vats/src/vat-bank').Bank>,
 * invitationPurse: Purse<'set'>,
 * }} unique
 * @param {{
 * agoricNames: ERef<NameHub>,
 * invitationIssuer: ERef<Issuer<'set'>>,
 * invitationBrand: Brand<'set'>,
 * publicMarshaller: Marshaller,
 * storageNode: ERef<StorageNode>,
 * zoe: ERef<ZoeService>,
 * }} shared
 */
export const initState = (unique, shared) => {
  // TODO move to guard
  // assert.typeof(address, 'string', 'invalid address');
  // assert(bank, 'missing bank');
  // assert(invitationIssuer, 'missing invitationIssuer');
  // assert(invitationBrand, 'missing invitationBrand');
  // assert(invitationPurse, 'missing invitationPurse');
  // assert(storageNode, 'missing storageNode');

  // NB: state size must not grow monotonically
  // This is the node that UIs subscribe to for everything they need.
  // e.g. agoric follow :published.wallet.agoric1nqxg4pye30n3trct0hf7dclcwfxz8au84hr3ht
  const myWalletStorageNode = E(shared.storageNode).makeChildNode(
    unique.address,
  );

  const preciousState = {
    // Private purses. This assumes one purse per brand, which will be valid in MN-1 but not always.
    brandPurses: makeScalarBigMapStore('brand purses', { durable: true }),
    // Payments that couldn't be deposited when received.
    // NB: vulnerable to uncapped growth by unpermissioned deposits.
    paymentQueues: makeScalarBigMapStore('payments queues', {
      durable: true,
    }),
    // Invitation makers yielded by offer results
    offerToInvitationMakers: makeScalarBigMapStore('invitation makers', {
      durable: true,
    }),
    // What purses have reported on construction and by getCurrentAmountNotifier updates.
    purseBalances: makeScalarMapStore(),
  };

  const nonpreciousState = {
    brandDescriptors: makeScalarMapStore(),
    // To ensure every offer ID is unique we require that each is a number greater
    // than has ever been used. This high water mark is sufficient to track that.
    lastOfferId: 0,
    updatePublishKit: harden(
      makeStoredPublishKit(myWalletStorageNode, shared.publicMarshaller),
    ),
  };

  return {
    ...shared,
    ...unique,
    ...nonpreciousState,
    ...preciousState,
  };
};

const behaviorGuards = {
  // xxx updateBalance string not really optional. not exposed so okay to skip guards.
  // helper: M.interface('helperFacetI', {
  //   addBrand: M.call(
  //     {
  //       brand: BrandShape,
  //       issuer: IssuerShape,
  //       petname: M.string(),
  //     },
  //     PurseShape,
  //   ).returns(M.promise()),
  //   updateBalance: M.call(PurseShape, AmountShape, M.opt(M.string())).returns(),
  // }),
  deposit: M.interface('depositFacetI', {
    receive: M.callWhen(M.await(M.eref(PaymentShape))).returns(AmountShape),
  }),
  offers: M.interface('offers facet', {
    executeOffer: M.call(shape.OfferSpec).returns(M.promise()),
    getLastOfferId: M.call().returns(M.number()),
  }),
  self: M.interface('selfFacetI', {
    handleBridgeAction: M.call(shape.StringCapData, M.boolean()).returns(
      M.promise(),
    ),
    getDepositFacet: M.call().returns(M.eref(M.any())),
    getOffersFacet: M.call().returns(M.eref(M.any())),
    getUpdatesSubscriber: M.call().returns(M.eref(M.any())),
  }),
};

// TOOD a utility type that ensures no behavior is defined that doesn't have a guard
const behavior = {
  helper: {
    /**
     * @param {RemotePurse} purse
     * @param {Amount} balance
     * @param {'init'} [init]
     */
    updateBalance(purse, balance, init) {
      const { purseBalances, updatePublishKit } = this.state;
      if (init) {
        purseBalances.init(purse, balance);
      } else {
        purseBalances.set(purse, balance);
      }
      updatePublishKit.publisher.publish({
        updated: 'balance',
        currentAmount: balance,
      });
    },

    /** @type {(desc: Omit<BrandDescriptor, 'displayInfo'>, purse: RemotePurse) => Promise<void>} */
    async addBrand(desc, purseRef) {
      /** @type {State} */
      const {
        address,
        brandDescriptors,
        brandPurses,
        paymentQueues,
        updatePublishKit,
      } = this.state;
      // assert haven't received this issuer before.
      const descriptorsHas = brandDescriptors.has(desc.brand);
      const pursesHas = brandPurses.has(desc.brand);
      assert(
        !(descriptorsHas && pursesHas),
        'repeated brand from bank asset subscription',
      );
      assert(
        !(descriptorsHas || pursesHas),
        'corrupted state; one store has brand already',
      );

      const [purse, displayInfo] = await Promise.all([
        purseRef,
        E(desc.brand).getDisplayInfo(),
      ]);

      // save all five of these in a collection (indexed by brand?) so that when
      // it's time to take an offer description you know where to get the
      // relevant purse. when it's time to make an offer, you know how to make
      // payments. REMEMBER when doing that, need to handle every exception to
      // put the money back in the purse if anything fails.
      const descriptor = { ...desc, displayInfo };
      brandDescriptors.init(desc.brand, descriptor);
      brandPurses.init(desc.brand, purse);

      const { helper } = this.facets;
      // publish purse's balance and changes
      E.when(
        E(purse).getCurrentAmount(),
        balance => helper.updateBalance(purse, balance, 'init'),
        err =>
          console.error(address, 'initial purse balance publish failed', err),
      );
      observeNotifier(E(purse).getCurrentAmountNotifier(), {
        updateState(balance) {
          helper.updateBalance(purse, balance);
        },
        fail(reason) {
          console.error(address, `failed updateState observer`, reason);
        },
      });

      updatePublishKit.publisher.publish({ updated: 'brand', descriptor });

      // deposit queued payments
      const payments = paymentQueues.has(desc.brand)
        ? paymentQueues.get(desc.brand)
        : [];
      const deposits = payments.map(p =>
        // @ts-expect-error deposit does take a FarRef<Payment>
        E(purse).deposit(p),
      );
      Promise.all(deposits).catch(err =>
        console.error('ERROR depositing queued payments', err),
      );
    },
  },
  /**
   * Similar to {DepositFacet} but async because it has to look up the purse.
   */
  // TODO(PS0) decide whether to match canonical `DepositFacet'. it would have to take a local Payment
  deposit: {
    /**
     * Put the assets from the payment into the appropriate purse.
     *
     * If the purse doesn't exist, we hold the payment until it does.
     *
     * @param {import('@endo/far').FarRef<Payment>} payment
     * @returns {Promise<Amount>} amounts for deferred deposits will be empty
     */
    async receive(payment) {
      /** @type {State} */
      const { brandPurses, paymentQueues: queues } = this.state;
      const brand = await E(payment).getAllegedBrand();
      const purse = brandPurses.get(brand);
      if (!purse) {
        if (queues.has(brand)) {
          queues.get(brand).push(payment);
        } else {
          queues.init(brand, [payment]);
        }
        return AmountMath.makeEmpty(brand);
      }

      // @ts-expect-error deposit does take a FarRef<Payment>
      return E(purse).deposit(payment);
    },
  },
  offers: {
    /**
     * Contracts can use this to generate a valid (monotonic) offer ID by incrementing.
     * In most cases it will be faster to get this from RPC query.
     */
    getLastOfferId() {
      /** @type {State} */
      const { lastOfferId } = this.state;
      return lastOfferId;
    },
    /**
     * Take an offer description provided in capData, augment it with payments and call zoe.offer()
     *
     * @param {import('./offers.js').OfferSpec} offerSpec
     * @returns {Promise<void>} when the offer has been sent to Zoe; payouts go into this wallet's purses
     * @throws if any parts of the offer can be determined synchronously to be invalid
     */
    async executeOffer(offerSpec) {
      const { facets, state } = this;
      const {
        zoe,
        brandPurses,
        invitationBrand,
        invitationPurse,
        lastOfferId,
        offerToInvitationMakers,
        updatePublishKit,
      } = this.state;

      const executor = makeOfferExecutor({
        zoe,
        depositFacet: facets.deposit,
        powers: {
          invitationFromSpec: makeInvitationsHelper(
            zoe,
            invitationBrand,
            invitationPurse,
            offerToInvitationMakers.get,
          ),
          purseForBrand: brandPurses.get,
          lastOfferId: {
            get: () => lastOfferId,
            set(id) {
              assert(isNat(id), 'offer id must be a positive number');
              assert(
                id > lastOfferId,
                'offer id must be greater than all previous',
              );
              state.lastOfferId = id;
            },
          },
        },
        onStatusChange: offerStatus =>
          updatePublishKit.publisher.publish({
            updated: 'offerStatus',
            status: offerStatus,
          }),
        onNewContinuingOffer: (offerId, invitationMakers) =>
          offerToInvitationMakers.init(offerId, invitationMakers),
      });
      executor.executeOffer(offerSpec);
    },
  },
  self: {
    /**
     *
     * @param {import('@endo/captp').CapData<string>} actionCapData of type BridgeAction
     * @param {boolean} [canSpend=false]
     */
    handleBridgeAction(actionCapData, canSpend = false) {
      const { publicMarshaller } = this.state;
      const { offers } = this.facets;

      return E.when(
        E(publicMarshaller).unserialize(actionCapData),
        /** @param {BridgeAction} action */
        action => {
          switch (action.method) {
            case 'executeOffer':
              assert(canSpend, 'executeOffer requires spend authority');
              return offers.executeOffer(action.offer);
            default:
              assert.fail(X`invalid handle bridge action ${q(action)}`);
          }
        },
      );
    },
    getDepositFacet() {
      return this.facets.deposit;
    },
    getOffersFacet() {
      return this.facets.offers;
    },

    getUpdatesSubscriber() {
      return this.state.updatePublishKit.subscriber;
    },
  },
};

const finish = ({ state, facets }) => {
  /** @type {State} */
  const { invitationBrand, invitationIssuer, invitationPurse, bank } = state;
  const { helper } = facets;
  // Ensure a purse for each issuer
  helper.addBrand(
    {
      brand: invitationBrand,
      issuer: invitationIssuer,
      petname: 'invitations',
    },
    // @ts-expect-error cast to RemotePurse
    /** @type {RemotePurse} */ (invitationPurse),
  );
  // watch the bank for new issuers to make purses out of
  void observeIteration(E(bank).getAssetSubscription(), {
    async updateState(desc) {
      /** @type {RemotePurse} */
      // @ts-expect-error cast to RemotePurse
      const purse = await E(bank).getPurse(desc.brand);
      await helper.addBrand(
        {
          brand: desc.brand,
          issuer: desc.issuer,
          petname: desc.proposedName,
        },
        purse,
      );
    },
  });
};

const SmartWalletKit = defineVirtualFarClassKit(
  'SmartWallet',
  behaviorGuards,
  initState,
  behavior,
  { finish },
);

/**
 * Holders of this object:
 * - vat (transitively from holding the wallet factory)
 * - wallet-ui (which has key material; dapps use wallet-ui to propose actions)
 */
export const makeSmartWallet = pickFacet(SmartWalletKit, 'self');
harden(makeSmartWallet);

/** @typedef {Awaited<ReturnType<typeof makeSmartWallet>>} SmartWallet */
