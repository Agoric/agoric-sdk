/**
 * @file smart-wallet test tools
 * @see {mockWalletFactory}
 */
// @ts-check
import { E, Far } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';

// eslint-disable-next-line import/no-extraneous-dependencies
import { makeNotifier } from '@agoric/notifier';
import { allValues, mapValues } from '../src/examples/airdrop/objectTools.js';

/**
 * @import {ERef} from '@endo/far';
 * @import {OfferSpec} from '@agoric/smart-wallet/src/offers.js';
 * @import {UpdateRecord} from '@agoric/smart-wallet/src/smartWallet.js';
 * @import {InvitationSpec} from '@agoric/smart-wallet/src/invitations.js';
 * @import {Brand, Purse, Payment} from '@agoric/ertp/src/types.js';
 * @import {PromiseKit} from '@endo/promise-kit';
 */

const { values } = Object;
const { Fail, quote: q } = assert;

const DEPOSIT_FACET_KEY = 'depositFacet'; // XXX does agoric-sdk export this?

/**
 * @param {{
 *   zoe: ERef<ZoeService>;
 *   namesByAddressAdmin: ERef<import('@agoric/vats').NameAdmin>;
 * }} powers
 * @param {IssuerKeywordRecord} issuerKeywordRecord
 *
 * @typedef {Awaited<
 *   ReturnType<
 *     Awaited<ReturnType<typeof mockWalletFactory>['makeSmartWallet']>
 *   >
 * >} MockWallet
 */
export const mockWalletFactory = (
  { zoe, namesByAddressAdmin },
  issuerKeywordRecord,
) => {
  /** @param {string} address */
  const makeSmartWallet = async address => {
    const { nameAdmin: addressAdmin } = await E(
      namesByAddressAdmin,
    ).provideChild(address, [DEPOSIT_FACET_KEY]);

    const entries = await Promise.all(
      values(issuerKeywordRecord).map(async issuer => {
        const purse = await E(issuer).makeEmptyPurse();
        const brand = await E(issuer).getBrand();
        /** @type {[Brand, Purse]} */
        const entry = [brand, purse];
        return entry;
      }),
    );
    const purseByBrand = new Map(entries);
    const invitationBrand = await E(E(zoe).getInvitationIssuer()).getBrand();
    purseByBrand.has(invitationBrand) ||
      Fail`no invitation issuer / purse / brand`;
    const invitationPurse = purseByBrand.get(invitationBrand);
    assert(invitationPurse);

    const depositFacet = Far('DepositFacet', {
      /** @param {Payment} pmt */
      receive: async pmt => {
        const pBrand = await E(pmt).getAllegedBrand();
        if (!purseByBrand.has(pBrand))
          throw Error(`brand not known/supported: ${pBrand}`);
        const purse = purseByBrand.get(pBrand);
        assert(purse);
        const amt = await E(purse).deposit(pmt);
        console.log('receive', address, amt);
        return amt;
      },
    });
    await E(addressAdmin).default(DEPOSIT_FACET_KEY, depositFacet);

    /** @param {InvitationSpec & { source: 'contract' }} invitationSpec */
    const getContractInvitation = invitationSpec => {
      const {
        instance,
        publicInvitationMaker,
        invitationArgs = [],
      } = invitationSpec;
      const pf = E(zoe).getPublicFacet(instance);
      return E(pf)[publicInvitationMaker](...invitationArgs);
    };

    /** @param {InvitationSpec & { source: 'purse' }} invitationSpec */
    const getPurseInvitation = async invitationSpec => {
      const invitationAmount = await E(invitationPurse).getCurrentAmount();
      // TODO: check instance too
      const detail = invitationAmount.value.find(
        d => d.description === invitationSpec.description,
      );
      detail ||
        Fail`${q(invitationSpec.description)} not found in ${q(
          invitationAmount,
        )}`;
      return E(invitationPurse).withdraw(
        harden({ brand: invitationAmount.brand, value: [detail] }),
      );
    };

    const offerToInvitationMakers = new Map();
    /** @param {InvitationSpec & { source: 'continuing' }} spec */
    const getContinuingInvitation = async spec => {
      const { previousOffer, invitationMakerName, invitationArgs = [] } = spec;
      const makers =
        offerToInvitationMakers.get(previousOffer) ||
        Fail`${previousOffer} not found`;
      return E(makers)[invitationMakerName](...invitationArgs);
    };
    const seatById = new Map();
    const tryExit = id =>
      E(seatById.get(id) || Fail`${id} not found`).tryExit();

    /**
     * Execute an offer (spec) and return a stream of updates that would be sent
     * to vstorage.
     *
     * @param {OfferSpec} offerSpec
     * @returns {AsyncGenerator<UpdateRecord>}
     */
    async function* executeOffer(offerSpec) {
      const { invitationSpec, proposal = {}, offerArgs } = offerSpec;
      const { source } = invitationSpec;
      const getter =
        {
          contract: getContractInvitation,
          purse: getPurseInvitation,
          continuing: getContinuingInvitation,
        }[source] || Fail`unsupported source: ${source}`;
      const invitation = await getter(invitationSpec);
      const pmts = await allValues(
        mapValues(proposal.give || {}, async amt => {
          const { brand } = amt;
          if (!purseByBrand.has(brand))
            throw Error(`brand not known/supported: ${brand}`);
          const purse = purseByBrand.get(brand);
          assert(purse);
          return E(purse).withdraw(amt);
        }),
      );
      // XXX throwing here is unhandled somehow.
      const seat = await E(zoe).offer(invitation, proposal, pmts, offerArgs);
      seatById.set(offerSpec.id, seat);
      //   console.log(address, offerSpec.id, 'got seat');
      yield { updated: 'offerStatus', status: offerSpec };
      const result0 = await E(seat).getOfferResult();
      const result = typeof result0 === 'object' ? 'UNPUBLISHED' : result0;
      //   console.log(address, offerSpec.id, 'got result', result);
      yield { updated: 'offerStatus', status: { ...offerSpec, result } };
      if (typeof result0 === 'object' && 'invitationMakers' in result0) {
        offerToInvitationMakers.set(offerSpec.id, result0.invitationMakers);
      }
      const [payouts, numWantsSatisfied] = await Promise.all([
        E(seat).getPayouts(),
        E(seat).numWantsSatisfied(),
      ]);
      yield {
        updated: 'offerStatus',
        status: { ...offerSpec, result, numWantsSatisfied },
      };
      const amts = await allValues(
        mapValues(payouts, pmtP =>
          Promise.resolve(pmtP).then(pmt => depositFacet.receive(pmt)),
        ),
      );
      //   console.log(address, offerSpec.id, 'got payouts', amts);
      yield {
        updated: 'offerStatus',
        status: { ...offerSpec, result, numWantsSatisfied, payouts: amts },
      };
    }

    /**
     * Get a stream of balance updates for a purse of a given brand.
     *
     * @param {Brand} brand
     */
    async function* purseUpdates(brand) {
      const purse =
        purseByBrand.get(brand) ||
        Fail`no purse for ${q(brand)}; issuer missing? ${q(
          issuerKeywordRecord,
        )}`;
      const n = makeNotifier(E(purse).getCurrentAmountNotifier());
      for await (const amount of n) {
        yield amount;
      }
    }

    return {
      deposit: depositFacet,
      offers: Far('Offers', { executeOffer, tryExit }),
      peek: Far('Wallet Peek', { purseUpdates }),
    };
  };

  return harden({ makeSmartWallet });
};

/**
 * Seat-like API from wallet updates
 *
 * @param {AsyncGenerator<UpdateRecord>} updates
 */
export const seatLike = updates => {
  const sync = {
    result: makePromiseKit(),
    /** @type {PromiseKit<AmountKeywordRecord>} */
    payouts: makePromiseKit(),
  };
  (async () => {
    await null;
    try {
      // XXX an error here is somehow and unhandled rejection
      for await (const update of updates) {
        if (update.updated !== 'offerStatus') continue;
        const { result, payouts } = update.status;
        if ('result' in update.status) sync.result.resolve(result);
        if ('payouts' in update.status && payouts) {
          sync.payouts.resolve(payouts);
          console.debug('paid out', update.status.id);
          return;
        }
      }
    } catch (reason) {
      sync.result.reject(reason);
      sync.payouts.reject(reason);
      throw reason;
    }
  })();
  return harden({
    getOfferResult: () => sync.result.promise,
    getPayoutAmounts: () => sync.payouts.promise,
  });
};
