// @ts-check
import { AmountMath } from '@agoric/ertp';
import {
  makeStoredPublishKit,
  observeIteration,
  observeNotifier,
} from '@agoric/notifier';
import { makeScalarMapStore } from '@agoric/store';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { E, Far } from '@endo/far';
import { makeInvitationsHelper } from './invitations.js';
import { makeOffersFacet } from './offers.js';
import {
  depositPaymentsIntoPurses,
  withdrawPaymentsFromPurses,
} from './utils.js';

/**
 * @file Smart wallet module
 *
 * # Design notes
 * Money comes in:
 * 1. on depositFacet
 * 2. proceeds/payouts of an offer
 * Money goes out: ONLY by making offers
 *
 * # Requirements
 * - State must not grow too large.
 * - If JS runtime dies no assets are lost.
 *   ??? what happens if you withdraw $10 from your purse to a payment for your offer and JS dies before you take payouts?
 *
 * # Non-requirements
 * - Multiple purses per brand. When this is a requirement we'll need some way
 *   to specify in offer execution which purses to take funds from. For UX we
 *   shouldn't require that specificity unless there are multiple purses. When
 *   there are, lack of specifier could throw or we could have a "default" purse
 *   for each brand.
 */

/** @typedef {Array<BrandDescriptor>} BrandsRecord */

/**
 * @typedef {Array<{ currentAmount: Amount }>} BalancesRecord
 *
 * Array to support batching updates. The currentAmount key exists to allow disambiguation of what purse
 * the amount is for. We currently only support one purse per brand so the brand in the currentAmount
 * suffices, but this structure allows for forward-compatibility with multiple purses per brand.
 */

// TODO remove petname? what will UI show then? look up in agoricNames?
// when we introduce petnames, we can have a fallback to default whenever it's omitted
/**
 * @typedef {{
 * brand: Brand,
 * displayInfo: DisplayInfo,
 * issuer: ERef<Issuer>,
 * petname: import('./types').Petname
 * }} BrandDescriptor
 * For use by clients to describe brands to users. Includes `displayInfo` to save a remote call.
 */

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
 * storageNode: ERef<StorageNode>,
 * zoe: ERef<ZoeService>,
 * }} shared
 */
export const makeSmartWallet = async (
  { address, bank },
  { board, invitationIssuer, storageNode, zoe },
) => {
  assert.typeof(address, 'string', 'invalid address');
  assert(bank, 'missing bank');
  assert(invitationIssuer, 'missing invitationIssuer');
  assert(storageNode, 'missing storageNode');
  const invitationBrand = await E(invitationIssuer).getBrand();
  const marshaller = await E(board).getReadonlyMarshaller();

  // #region STATE

  // - brandPurses is precious and closely held. defined as late as possible to reduce its scope.
  // - offerToInvitationMakers is precious and closely held.
  // - brandDescriptors is a cache of what we've received from the bank manager. Its brands are the keys of brandPurses.
  // - purseBalances is a cache of what we've received from purses. Held so we can publish all balances on change.

  /**
   * Invitation makers yielded by offer results
   *
   * @type {MapStore<number, import('./continuing').InvitationMakers>}
   */
  const offerToInvitationMakers = makeScalarBigMapStore('invitation makers', {
    durable: true,
  });

  /**
   * What we've been told by the Bank
   *
   * @type {MapStore<Brand, BrandDescriptor>} */
  const brandDescriptors = makeScalarMapStore();

  /**
   * What purses have reported on construction and by getCurrentAmountNotifier updates.
   *
   * @type {MapStore<Purse, Amount>} */
  const purseBalances = makeScalarMapStore();

  // #endregion

  // #region publishing
  // NB: state size must not grow monotonically
  // wallets subscribe to this node over RPC so provide whatever they need.
  // e.g. agoric follow :published.wallet.agoric1nqxg4pye30n3trct0hf7dclcwfxz8au84hr3ht
  // TODO publish "latest" style keys: `latestOfferStatus`, `latestIssuer`, `latestBalance`.
  const myWalletStorageNode = E(storageNode).makeChildNode(address);

  /** @type {PublishKit<BrandsRecord>} */
  const brandsPublishKit = makeStoredPublishKit(
    E(myWalletStorageNode).makeChildNode('brands'),
    marshaller,
  );

  const publishBrands = async () => {
    const brands = Array.from(brandDescriptors.values());
    brandsPublishKit.publisher.publish(brands);
  };

  /** @type {PublishKit<import('./offers.js').OfferStatus>} */
  const offerPublishKit = makeStoredPublishKit(
    E(myWalletStorageNode).makeChildNode('offers'),
    marshaller,
  );

  /** @type {StoredPublishKit<BalancesRecord>} */
  const balancesPublishKit = makeStoredPublishKit(
    E(myWalletStorageNode).makeChildNode('balances'),
    marshaller,
  );
  /**
   * @param {Purse} purse
   * @param {Amount} balance
   * @param {'init'} [init]
   */
  const updateBalance = (purse, balance, init) => {
    if (init) {
      purseBalances.init(purse, balance);
    } else {
      purseBalances.set(purse, balance);
    }
    balancesPublishKit.publisher.publish(
      Array.from(purseBalances.values()).map(b => ({
        currentAmount: b,
      })),
    );
  };

  // #endregion

  // #region issuer management
  /**
   * Private purses.This assumes one purse per brand, which will be valid in MN-1 but not always.
   *
   * @type {MapStore<Brand, ERef<Purse<'set'>>>}
   */
  const brandPurses = makeScalarBigMapStore('brand purses', { durable: true });

  /** @type { (desc: Omit<BrandDescriptor, 'displayInfo'>) => Promise<void>} */
  const addBrand = async desc => {
    console.log('DEBUG addBrand', desc);
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
      E(desc.issuer).makeEmptyPurse(),
      E(desc.brand).getDisplayInfo(),
    ]);

    // save all five of these in a collection (indexed by brand?) so that when
    // it's time to take an offer description you know where to get the
    // relevant purse. when it's time to make an offer, you know how to make
    // payments. REMEMBER when doing that, need to handle every exception to
    // put the money back in the purse if anything fails.
    brandDescriptors.init(desc.brand, { ...desc, displayInfo });
    brandPurses.init(desc.brand, purse);

    // publish purse's balance and changes
    E.when(
      purse.getCurrentAmount(),
      balance => updateBalance(purse, balance, 'init'),
      err => console.error('initial purse balance publish failed', err),
    );
    observeNotifier(E(purse).getCurrentAmountNotifier(), {
      updateState(balance) {
        updateBalance(purse, balance);
      },
      fail(reason) {
        console.error(`failed updateState observer`, reason);
      },
    });

    publishBrands();
  };

  // Ensure a purse for each issuer
  addBrand({
    brand: invitationBrand,
    issuer: invitationIssuer,
    petname: 'invitations',
  });
  // watch the bank for new issuers to make purses out of
  observeIteration(E(bank).getAssetSubscription(), {
    async updateState(desc) {
      await addBrand({
        brand: desc.brand,
        issuer: desc.issuer,
        petname: desc.proposedName,
      });
    },
  });
  // #endregion

  /**
   * Similar to {DepositFacet} but async because it has to look up the purse.
   */
  const depositFacet = Far('smart wallet deposit facet', {
    /**
     * Put the assets from the payment into the appropriate purse
     *
     * @param {ERef<Payment>} paymentE
     * @param {Brand} paymentBrand must match the payment's brand. passed in to save lookup.
     * @returns {Promise<Amount>}
     * @throws if the purse doesn't exist
     * ??? PRODUCT: should it instead wait for an issuer/purse to put it in?
     */
    receive: (paymentE, paymentBrand) => {
      const purse = brandPurses.get(paymentBrand);

      return E.when(paymentE, payment => E(purse).deposit(payment));
    },
  });

  // XXX refactor the invitation fetching
  /**
   * @param {import('./invitations.js').InvitationsPurseQuery} query
   * @returns {Promise<Invitation>}
   */
  const findInvitationInPurse = async query => {
    const purse = brandPurses.get(invitationBrand);
    const purseAmount = await E(purse).getCurrentAmount();
    const match = AmountMath.getValue(invitationBrand, purseAmount).find(
      details => details.description === query.description,
      // FIXME match instance too
    );
    console.log('DEBUG findInvitationInPurse', { purseAmount, query, match });
    assert(match, `no match for query ${query} `);
    const toWithDraw = AmountMath.make(invitationBrand, harden([match]));
    console.log('.... ', { toWithDraw });

    return E(purse).withdraw(toWithDraw);
  };
  const invitationFromSpec = makeInvitationsHelper(
    zoe,
    findInvitationInPurse,
    offerToInvitationMakers.get,
  );
  const sufficientPayments = give =>
    withdrawPaymentsFromPurses(give, brandPurses.get);
  const offersFacet = makeOffersFacet(
    zoe,
    // @ts-expect-error faulty EGetters type
    E.get(marshaller).unserialize,
    invitationFromSpec,
    sufficientPayments,
    offerPublishKit.publisher.publish,
    payouts => depositPaymentsIntoPurses(payouts, brandPurses.get),
    (offerId, invitationMakers) =>
      offerToInvitationMakers.init(offerId, invitationMakers),
  );

  /* Design notes:
   * - an ocap to suggestIssuer() should not have authority to withdraw from purses (so no executeOffer() or applyMethod())
   * XXX refactor for POLA
   */
  /**
   * Holders of this object:
   * - vat (transitively from holding the wallet factory)
   * - wallet-ui (which has key material; dapps use wallet-ui to propose actions)
   */
  return Far('SmartWallet', {
    getDepositFacet: () => depositFacet,
    getOffersFacet: () => offersFacet,

    getDataFeeds: () => ({
      balances: {
        subscriber: balancesPublishKit.subscriber,
      },
      brands: {
        subscriber: brandsPublishKit.subscriber,
      },
      offers: {
        subscriber: offerPublishKit.subscriber,
      },
    }),
  });
};
harden(makeSmartWallet);

/** @typedef {Awaited<ReturnType<typeof makeSmartWallet>>} SmartWallet */
