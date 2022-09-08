// @ts-check

import { M, makeHeapFarInstance } from '@agoric/store';
import { E, passStyleOf } from '@endo/far';
import { makePaymentsHelper } from './payments.js';
import { shape } from './typeGuards.js';

/**
 * @typedef {{
 *   id: number,
 *   invitationSpec: import('./invitations').InvitationSpec,
 *   proposal: Proposal,
 *   offerArgs?: unknown
 * }} OfferSpec
 */

/** Value for "result" field when the result can't be published */
export const UNPUBLISHED_RESULT = 'UNPUBLISHED';

/**
 * @typedef {import('./offers.js').OfferSpec & {
 * error?: string,
 * numWantsSatisfied?: number
 * result?: unknown | typeof UNPUBLISHED_RESULT,
 * payouts?: AmountKeywordRecord,
 * }} OfferStatus
 */

/* eslint-disable jsdoc/check-param-names -- bug(?) with nested objects */
/**
 * @param {object} opts
 * @param {ERef<ZoeService>} opts.zoe
 * @param {object} opts.powers
 * @param {import('./types').Cell<number>} opts.powers.lastOfferId
 * @param {(spec: import('./invitations').InvitationSpec) => ERef<Invitation>} opts.powers.invitationFromSpec
 * @param {(brand: Brand) => import('./types').RemotePurse} opts.powers.purseForBrand
 * @param {(status: OfferStatus) => void} opts.onStatusChange
 * @param {(offerId: number, continuation: import('./types').RemoteInvitationMakers) => void} opts.onNewContinuingOffer
 */
export const makeOffersFacet = ({
  zoe,
  powers,
  onStatusChange,
  onNewContinuingOffer,
}) => {
  const { invitationFromSpec, lastOfferId, purseForBrand } = powers;

  return makeHeapFarInstance(
    'offers facet',
    M.interface('offers facet', {
      executeOffer: M.call(shape.OfferSpec).returns(M.promise()),
      getLastOfferId: M.call().returns(M.number()),
    }),
    {
      /**
       * Take an offer description provided in capData, augment it with payments and call zoe.offer()
       *
       * @param {OfferSpec} offerSpec
       * @returns {Promise<void>} when the offer has been sent to Zoe; payouts go into this wallet's purses
       * @throws if any parts of the offer can be determined synchronously to be invalid
       */
      executeOffer: async offerSpec => {
        const paymentsManager = makePaymentsHelper(purseForBrand);

        /** @type {OfferStatus} */
        let status = {
          ...offerSpec,
        };
        /** @param {Partial<OfferStatus>} changes */
        const updateStatus = changes => {
          status = { ...status, ...changes };
          onStatusChange(status);
        };
        /**
         * Notify user and attempt to recover
         *
         * @param {Error} err
         */
        const handleError = err => {
          console.error('OFFER ERROR:', err);
          updateStatus({ error: err.toString() });
          paymentsManager.tryReclaimingWithdrawnPayments().then(result => {
            if (result) {
              updateStatus({ result });
            }
          });
        };

        try {
          // 1. Prepare values and validate synchronously.
          const { id, invitationSpec, proposal, offerArgs } = offerSpec;
          // consume id immediately so that all errors can pertain to a particular offer id.
          // This also serves to validate the new id.
          lastOfferId.set(id);

          const invitation = invitationFromSpec(invitationSpec);

          const paymentKeywordRecord = proposal?.give
            ? paymentsManager.withdrawGive(proposal.give)
            : undefined;

          // 2. Begin executing offer
          // No explicit signal to user that we reached here but if anything above
          // failed they'd get an 'error' status update.

          // eslint-disable-next-line @jessie.js/no-nested-await -- unconditional
          const seatRef = await E(zoe).offer(
            invitation,
            proposal,
            paymentKeywordRecord,
            offerArgs,
          );
          // ??? should we notify of being seated?

          // publish 'result'
          E.when(
            E(seatRef).getOfferResult(),
            result => {
              const passStyle = passStyleOf(result);
              console.log('offerResult', passStyle, result);
              // someday can we get TS to type narrow based on the passStyleOf result match?
              switch (passStyle) {
                case 'copyRecord':
                  if ('invitationMakers' in result) {
                    // save for continuing invitation offer
                    onNewContinuingOffer(id, result.invitationMakers);
                  }
                  // ??? are all copyRecord types valid to publish?
                  updateStatus({ result });
                  break;
                default:
                  // drop the result
                  updateStatus({ result: UNPUBLISHED_RESULT });
              }
            },
            handleError,
          );

          // publish 'numWantsSatisfied'
          E.when(E(seatRef).numWantsSatisfied(), numSatisfied => {
            if (numSatisfied === 0) {
              updateStatus({ numWantsSatisfied: 0 });
            }
            updateStatus({
              numWantsSatisfied: numSatisfied,
            });
          });

          // publish 'payouts'
          // This will block until all payouts succeed, but user will be updated
          // as each payout will trigger its corresponding purse notifier.
          E.when(
            E(seatRef).getPayouts(),
            payouts =>
              paymentsManager.depositPayouts(payouts).then(amounts => {
                updateStatus({ payouts: amounts });
              }),
            handleError,
          );
        } catch (err) {
          handleError(err);
        }
      },

      /**
       * Contracts can use this to generate a valid (monotonic) offer ID by incrementing.
       * In most cases it will be faster to get this from RPC query.
       */
      getLastOfferId: lastOfferId.get,
    },
  );
};
harden(makeOffersFacet);
