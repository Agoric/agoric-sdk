// @ts-check

import { E, passStyleOf } from '@endo/far';
import { makePaymentsHelper } from './payments.js';

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
 * @param {{ receive: (payment: *) => Promise<Amount> }} opts.depositFacet
 * @param {object} opts.powers
 * @param {import('./types').Cell<number>} opts.powers.lastOfferId
 * @param {Pick<Console, 'info'| 'error'>} opts.powers.logger
 * @param {(spec: import('./invitations').InvitationSpec) => ERef<Invitation>} opts.powers.invitationFromSpec
 * @param {(brand: Brand) => import('./types').RemotePurse} opts.powers.purseForBrand
 * @param {(status: OfferStatus) => void} opts.onStatusChange
 * @param {(offerId: number, continuation: import('./types').RemoteInvitationMakers) => void} opts.onNewContinuingOffer
 */
export const makeOfferExecutor = ({
  zoe,
  depositFacet,
  powers,
  onStatusChange,
  onNewContinuingOffer,
}) => {
  const { invitationFromSpec, lastOfferId, logger, purseForBrand } = powers;

  return {
    /**
     * Take an offer description provided in capData, augment it with payments and call zoe.offer()
     *
     * @param {OfferSpec} offerSpec
     * @returns {Promise<void>} when the offer has been sent to Zoe; payouts go into this wallet's purses
     * @throws if any parts of the offer can be determined synchronously to be invalid
     */
    async executeOffer(offerSpec) {
      logger.info('starting executeOffer', offerSpec.id);

      const paymentsManager = makePaymentsHelper(purseForBrand, depositFacet);

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
        logger.error('OFFER ERROR:', err);
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
        logger.info(id, 'seated');

        // publish 'result'
        E.when(
          E(seatRef).getOfferResult(),
          result => {
            const passStyle = passStyleOf(result);
            logger.info(id, 'offerResult', passStyle, result);
            // someday can we get TS to type narrow based on the passStyleOf result match?
            switch (passStyle) {
              case 'bigint':
              case 'boolean':
              case 'null':
              case 'number':
              case 'string':
              case 'symbol':
              case 'undefined':
                updateStatus({ result });
                break;
              case 'copyRecord':
                // @ts-expect-error result narrowed by passStyle
                if ('invitationMakers' in result) {
                  // @ts-expect-error result narrowed by passStyle
                  // save for continuing invitation offer
                  onNewContinuingOffer(id, result.invitationMakers);
                }
                // copyRecord is valid to publish but not safe as it may have private info
                updateStatus({ result: UNPUBLISHED_RESULT });
                break;
              default:
                // drop the result
                updateStatus({ result: UNPUBLISHED_RESULT });
            }
          },
          handleError,
        );

        // publish 'numWantsSatisfied'
        E.when(
          E(seatRef).numWantsSatisfied(),
          numSatisfied => {
            logger.info(id, 'numSatisfied', numSatisfied);
            if (numSatisfied === 0) {
              updateStatus({ numWantsSatisfied: 0 });
            }
            updateStatus({
              numWantsSatisfied: numSatisfied,
            });
          },
          handleError,
        );

        // publish 'payouts'
        // This will block until all payouts succeed, but user will be updated
        // as each payout will trigger its corresponding purse notifier.
        E.when(
          E(seatRef).getPayouts(),
          payouts =>
            paymentsManager.depositPayouts(payouts).then(amountsOrDeferred => {
              updateStatus({ payouts: amountsOrDeferred });
            }),
          handleError,
        );
      } catch (err) {
        handleError(err);
      }
    },
  };
};
harden(makeOfferExecutor);
