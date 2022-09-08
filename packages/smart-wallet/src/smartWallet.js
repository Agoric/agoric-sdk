// @ts-check
import { AmountShape, PaymentShape } from '@agoric/ertp';
import { isNat } from '@agoric/nat';
import {
  makeStoredPublishKit,
  observeIteration,
  observeNotifier,
} from '@agoric/notifier';
import { fit, M, makeHeapFarInstance, makeScalarMapStore } from '@agoric/store';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { E, Far } from '@endo/far';
import { makeInvitationsHelper } from './invitations.js';
import { makeOffersFacet } from './offers.js';
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
 *
 * @param {{
 * address: string,
 * bank: ERef<import('@agoric/vats/src/vat-bank').Bank>,
 * }} unique
 * @param {{
 * agoricNames: ERef<NameHub>,
 * board: ERef<Board>,
 * invitationIssuer: ERef<Issuer<'set'>>,
 * invitationBrand: Brand<'set'>,
 * storageNode: ERef<StorageNode>,
 * zoe: ERef<ZoeService>,
 * }} shared
 */
export const makeSmartWallet = async (
  { address, bank },
  { board, invitationBrand, invitationIssuer, storageNode, zoe },
) => {
  assert.typeof(address, 'string', 'invalid address');
  assert(bank, 'missing bank');
  assert(invitationIssuer, 'missing invitationIssuer');
  assert(invitationBrand, 'missing invitationBrand');
  assert(storageNode, 'missing storageNode');
  // cache
  const [invitationPurse, marshaller] = await Promise.all([
    E(invitationIssuer).makeEmptyPurse(),
    E(board).getReadonlyMarshaller(),
  ]);

  // #region STATE

  // - brandPurses is precious and closely held. defined as late as possible to reduce its scope.
  // - offerToInvitationMakers is precious and closely held.
  // - lastOfferId is precious but not closely held
  // - brandDescriptors will be precious. Currently it includes invitation brand and  what we've received from the bank manager.
  // - purseBalances is a cache of what we've received from purses. Held so we can publish all balances on change.

  /**
   * To ensure every offer ID is unique we require that each is a number greater
   * than has ever been used. This high water mark is sufficient to track that.
   *
   * @type {number}
   */
  let lastOfferId = 0;

  /**
   * Invitation makers yielded by offer results
   *
   * @type {MapStore<number, import('./types').RemoteInvitationMakers>}
   */
  const offerToInvitationMakers = makeScalarBigMapStore('invitation makers', {
    durable: true,
  });

  /** @type {MapStore<Brand, BrandDescriptor>} */
  const brandDescriptors = makeScalarMapStore();

  /**
   * What purses have reported on construction and by getCurrentAmountNotifier updates.
   *
   * @type {MapStore<RemotePurse, Amount>}
   */
  const purseBalances = makeScalarMapStore();

  // #endregion

  // #region publishing
  // NB: state size must not grow monotonically
  // This is the node that UIs subscribe to for everything they need.
  // e.g. agoric follow :published.wallet.agoric1nqxg4pye30n3trct0hf7dclcwfxz8au84hr3ht
  const myWalletStorageNode = E(storageNode).makeChildNode(address);

  /** @type {StoredPublishKit<UpdateRecord>} */
  const updatePublishKit = makeStoredPublishKit(
    myWalletStorageNode,
    marshaller,
  );

  /**
   * @param {RemotePurse} purse
   * @param {Amount} balance
   * @param {'init'} [init]
   */
  const updateBalance = (purse, balance, init) => {
    if (init) {
      purseBalances.init(purse, balance);
    } else {
      purseBalances.set(purse, balance);
    }
    updatePublishKit.publisher.publish({
      updated: 'balance',
      currentAmount: balance,
    });
  };

  // #endregion

  // #region issuer management
  /**
   * Private purses. This assumes one purse per brand, which will be valid in MN-1 but not always.
   *
   * @type {MapStore<Brand, RemotePurse>}
   */
  const brandPurses = makeScalarBigMapStore('brand purses', { durable: true });

  /** @type { (desc: Omit<BrandDescriptor, 'displayInfo'>, purse: RemotePurse) => Promise<void>} */
  const addBrand = async (desc, purseRef) => {
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

    // publish purse's balance and changes
    E.when(
      E(purse).getCurrentAmount(),
      balance => updateBalance(purse, balance, 'init'),
      err =>
        console.error(address, 'initial purse balance publish failed', err),
    );
    observeNotifier(E(purse).getCurrentAmountNotifier(), {
      updateState(balance) {
        updateBalance(purse, balance);
      },
      fail(reason) {
        console.error(address, `failed updateState observer`, reason);
      },
    });

    updatePublishKit.publisher.publish({ updated: 'brand', descriptor });
  };

  // Ensure a purse for each issuer
  addBrand(
    {
      brand: invitationBrand,
      issuer: invitationIssuer,
      petname: 'invitations',
    },
    // @ts-expect-error cast to RemotePurse
    /** @type {RemotePurse} */ (invitationPurse),
  );
  // watch the bank for new issuers to make purses out of
  observeIteration(E(bank).getAssetSubscription(), {
    async updateState(desc) {
      /** @type {RemotePurse} */
      // @ts-expect-error cast to RemotePurse
      const purse = E(bank).getPurse(desc.brand);
      await addBrand(
        {
          brand: desc.brand,
          issuer: desc.issuer,
          petname: desc.proposedName,
        },
        purse,
      );
    },
  });
  // #endregion

  /**
   * Similar to {DepositFacet} but async because it has to look up the purse.
   */
  // TODO(PS0) decide whether to match canonical `DepositFacet'. it would have to take a local Payment.
  const depositFacet = makeHeapFarInstance(
    'smart wallet deposit facet',
    M.interface('depositFacetI', {
      receive: M.callWhen(M.await(M.eref(PaymentShape))).returns(AmountShape),
    }),
    {
      /**
       * Put the assets from the payment into the appropriate purse
       *
       * @param {Payment} payment
       * @returns {Promise<Amount>}
       * @throws if the purse doesn't exist
       * NB: the previous smart wallet contract would try again each time there's a new issuer.
       * This version does not: 1) for expedience, 2: to avoid resource exhaustion vulnerability.
       */
      receive: async payment => {
        const brand = payment.getAllegedBrand();
        const purse = brandPurses.get(brand);

        return E(purse).deposit(payment);
      },
    },
  );

  const offersFacet = makeOffersFacet({
    zoe,
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
          lastOfferId = id;
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

  /**
   *
   * @param {import('@endo/captp').CapData<string>} actionCapData of type BridgeAction
   * @param {boolean} [canSpend=false]
   */
  const handleBridgeAction = (actionCapData, canSpend = false) => {
    fit(actionCapData, shape.StringCapData);
    return E.when(
      E(marshaller).unserialize(actionCapData),
      /** @param {BridgeAction} action */
      action => {
        switch (action.method) {
          case 'executeOffer':
            assert(canSpend, 'access to offersFacet requires spend authority');
            return E(offersFacet).executeOffer(action.offer);
          default:
            assert.fail(X`invalid handle bridge action ${q(action)}`);
        }
      },
    );
  };

  /**
   * Holders of this object:
   * - vat (transitively from holding the wallet factory)
   * - wallet-ui (which has key material; dapps use wallet-ui to propose actions)
   */
  return Far('SmartWallet', {
    handleBridgeAction,
    getDepositFacet: () => depositFacet,
    getOffersFacet: () => offersFacet,

    getUpdatesSubscriber: () => updatePublishKit.subscriber,
  });
};
harden(makeSmartWallet);

/** @typedef {Awaited<ReturnType<typeof makeSmartWallet>>} SmartWallet */
