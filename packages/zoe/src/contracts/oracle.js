// @ts-check

import { assert, details as X } from '@agoric/assert';
import { Far } from '@agoric/marshal';
import { amountMath } from '@agoric/ertp';

import '../../exported';

import { E } from '@agoric/eventual-send';
import { trade } from '../contractSupport';

/**
 * This contract provides oracle queries for a fee or for free.
 *
 * @type {ContractStartFn}
 *
 */
const start = async zcf => {
  const feeBrand = zcf.getTerms().brands.Fee;

  /** @type {OracleHandler} */
  let handler;

  /** @type {boolean} */
  let revoked = false;
  const revokedMsg = `Oracle revoked`;

  const { zcfSeat: feeSeat } = zcf.makeEmptySeatKit();

  /** @type {OracleCreatorFacet} */
  const realCreatorFacet = {
    makeWithdrawInvitation(total = false) {
      return zcf.makeInvitation(seat => {
        const gains = total
          ? feeSeat.getCurrentAllocation()
          : seat.getProposal().want;
        trade(zcf, { seat: feeSeat, gains: {} }, { seat, gains });
        seat.exit();
        return 'Successfully withdrawn';
      }, 'withdraw');
    },
    getCurrentFees() {
      return feeSeat.getCurrentAllocation();
    },
    makeShutdownInvitation: () => {
      const shutdown = seat => {
        revoked = true;
        trade(
          zcf,
          { seat: feeSeat, gains: {} },
          { seat, gains: feeSeat.getCurrentAllocation() },
        );
        zcf.shutdown(revokedMsg);
      };
      return zcf.makeInvitation(shutdown, 'shutdown');
    },
  };

  const creatorFacet = Far('creatorFacet', {
    initialize(privateParams) {
      ({ oracleHandler: handler } = privateParams);
      return realCreatorFacet;
    },
  });

  const publicFacet = Far('publicFacet', {
    async query(query) {
      try {
        assert(!revoked, revokedMsg);
        const noFee = amountMath.makeEmpty(feeBrand);
        const { requiredFee, reply } = await E(handler).onQuery(query, noFee);
        assert(
          !requiredFee || amountMath.isGTE(noFee, requiredFee),
          X`Oracle required a fee but the query had none`,
        );
        return reply;
      } catch (e) {
        E(handler).onError(query, e);
        throw e;
      }
    },
    async makeQueryInvitation(query) {
      /** @type {OfferHandler} */
      const doQuery = async querySeat => {
        try {
          const fee = querySeat.getAmountAllocated('Fee', feeBrand);
          const { requiredFee, reply } = await E(handler).onQuery(query, fee);
          if (requiredFee) {
            trade(
              zcf,
              { seat: querySeat, gains: {} },
              { seat: feeSeat, gains: { Fee: requiredFee } },
            );
          }
          querySeat.exit();
          E(handler).onReply(query, reply, requiredFee);
          return reply;
        } catch (e) {
          E(handler).onError(query, e);
          throw e;
        }
      };
      return zcf.makeInvitation(doQuery, 'oracle query', { query });
    },
  });

  return harden({ creatorFacet, publicFacet });
};

harden(start);
export { start };
