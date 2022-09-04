// @ts-check

import { isNat } from '@agoric/nat';
import { E, Far, passStyleOf } from '@endo/far';

// XXX Partial<> seems to apply to all ProposalRecords, not just this one
/**
 * @typedef {{
 *   id: number,
 *   invitationSpec: import('./invitations').InvitationSpec,
 *   proposal: Partial<ProposalRecord>,
 *   offerArgs?: Record<string, any>
 * }} OfferSpec
 */

// TODO enum with explanation
/** @typedef {'pending' | 'seated' | 'satisfied' | 'refunded' | 'error' | 'paid'} OfferState
 * pending: offered to Zoe
 * seated: Zoe provided a seat
 * satisfied: numWantsSatified > 0
 * refunded: numWantsSatified = 0
 * paid: payouts for satified wants are in purses
 * error: unspecified error
 */

/**
 * @typedef {import('./offers.js').OfferSpec & {
 * state: OfferState,
 * numWantsSatisfied?: number
 * result?: unknown,
 * }} OfferStatus
 */

// TOOD validate at runtime
/** @type {(fromCapData: ERef<import('@endo/captp').Unserialize<unknown>>) => (capData: import('./types').WalletCapData<OfferSpec>) => OfferSpec} */
const makeOfferSpecUnmarshaller = fromCapData => capData =>
  E(fromCapData)(capData);
harden(makeOfferSpecUnmarshaller);

// TODO(PS0) make into a virtual kind https://github.com/Agoric/agoric-sdk/issues/5894
// but wait for Far classes to be available https://github.com/Agoric/agoric-sdk/pull/5960
// Though maybe durability should just be on wallet object and these facets be volatile. (moving lastOfferId up to baggage)
/**
 *
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<Marshaller['unserialize']>} fromCapData
 * @param {(spec: import('./invitations').InvitationSpec) => ERef<Invitation>} invitationFromSpec
 * @param {(give: AmountKeywordRecord) => PaymentPKeywordRecord} sufficientPayments
 * @param {(status: OfferStatus) => void} publishOfferStatus
 * @param {(payments: PaymentPKeywordRecord) => Promise<AmountKeywordRecord>} payIntoPurses
 * @param {(offerId: number, continuation: import('./continuing').InvitationMakers) => void} saveContinuingOffer
 */
export const makeOffersFacet = (
  // xxx probably want an option arg
  zoe,
  fromCapData,
  invitationFromSpec,
  sufficientPayments,
  // xxx should this kind know about "publishing" or just say "onOfferStatusChange"
  publishOfferStatus,
  payIntoPurses,
  saveContinuingOffer,
) => {
  // To ensure every offer ID is unique we require that each is a number greater
  // than has ever been used. This high water mark is sufficient to track that.
  let lastOfferId = 0;

  assert(fromCapData, 'missing fromCapData');
  const unmarshallOfferSpec = makeOfferSpecUnmarshaller(fromCapData);

  return Far('offers facet', {
    /**
     * Take an offer description provided in capData, augment it with payments and call zoe.offer()
     *
     * @param {import('./types').WalletCapData<import('./offers.js').OfferSpec>} capData
     * @returns {Promise<void>} when the offer has been sent to Zoe; payouts go into this wallet's purses
     * @throws if any parts of the offer can be determined synchronously to be invalid
     */
    executeOffer: async capData => {
      // 1. Prepare values and validate synchronously.
      // Any of these may throw.

      const offerSpec = await unmarshallOfferSpec(capData);

      const { id, invitationSpec, proposal, offerArgs } = offerSpec;
      assert(invitationSpec, 'offer missing invitationSpec');
      assert(proposal, 'offer missing proposal');

      assert(isNat(id), 'offer id must be a positive number');
      assert(id > lastOfferId, 'offer id must be greater than all previous');

      const invitation = invitationFromSpec(invitationSpec);

      const paymentKeywordRecord = proposal?.give
        ? sufficientPayments(proposal.give)
        : undefined;

      // TODO validate we have issuers for all the 'wants' so the results can be put into purses

      // 2. Begin executing offer

      console.log('executing offer', id, proposal, offerArgs);

      // consume id for publishing
      lastOfferId = id;

      /** @type {OfferStatus} */
      let status = {
        ...offerSpec,
        state: 'pending', // i.e. sent to zoe, which is about to happen
      };
      /** @param {Partial<OfferStatus>} changes */
      const updateStatus = changes => {
        status = { ...status, ...changes };
        publishOfferStatus(status);
      };

      // TODO ensure that if any of this fails we have to get the offer payments out and put them back in the purses
      void E(zoe)
        .offer(invitation, proposal, paymentKeywordRecord, offerArgs)
        .then(seat => {
          updateStatus({ state: 'seated' });

          E.when(
            seat.getOfferResult(),
            result => {
              const passStyle = passStyleOf(result);
              console.log('offerResult', passStyle, result);
              // someday can we get TS to type narrow based on the passStyleOf result match?
              switch (passStyle) {
                case 'copyRecord':
                  if ('invitationMakers' in result) {
                    // save for continuing invitation offer
                    saveContinuingOffer(id, result.invitationMakers);
                  }
                  // TODO only if it's pure data (how to verify? copyRecord recursively?)
                  // ??? have another status or rely on presence of result? This can happen after satisfied
                  updateStatus({ result });
                  break;
                default:
                // drop the result
                // TODO include something in the offer result about that
              }
            },
            err => {
              console.error('ERROR getting offer results', err);
              updateStatus({ state: 'error' });
            },
          );

          return seat.numWantsSatisfied().then(numSatisfied => {
            if (numSatisfied === 0) {
              // ??? refunded or rejected? it's really that your offer was rejected and users should know that means they got their payments back
              // hmm, but when?
              updateStatus({ numWantsSatisfied: 0, state: 'refunded' });
            }
            // ??? need 'satisfied' state? answer should be the same as for including 'result' above
            updateStatus({
              numWantsSatisfied: numSatisfied,
              state: 'satisfied',
            });
            return seat.getPayouts();
          });
        })
        // TODO make sure a hanging payout doesn't wedge the rest
        // so we have to publish as each keyword deposits
        .then(payouts => payIntoPurses(payouts))
        .then(_amounts => {
          // ??? publish amounts?
          updateStatus({ state: 'paid' });
        })
        .catch(err => {
          console.error('ERROR!', err);
          updateStatus({ state: 'error' });
        });
    },

    /**
     * Contracts can use this to generate a valid (monotonic) offer ID by incrementing.
     * In most cases it will be faster to get this from RPC query.
     */
    getLastOfferId: () => lastOfferId,
  });
};
harden(makeOffersFacet);
