import { assert, details as X } from '@agoric/assert';
import { Far } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp';

import { E } from '@endo/eventual-send';
import { atomicTransfer } from '../contractSupport/index.js';

/**
 * This contract provides oracle queries for a fee or for free.
 *
 * @param {ZCF} zcf
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
  const realCreatorFacet = Far('realCreatorFacet', {
    makeWithdrawInvitation(total = false) {
      return zcf.makeInvitation(seat => {
        const gains = total
          ? feeSeat.getCurrentAllocation()
          : seat.getProposal().want;

        atomicTransfer(zcf, harden([[feeSeat, seat, gains]]));

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
        atomicTransfer(
          zcf,
          harden([[feeSeat, seat, feeSeat.getCurrentAllocation()]]),
        );

        zcf.shutdown(revokedMsg);
      };
      return zcf.makeInvitation(shutdown, 'shutdown');
    },
  });

  const creatorFacet = Far('creatorFacet', {
    initialize(privateParams) {
      ({ oracleHandler: handler } = privateParams);
      return realCreatorFacet;
    },
  });

  const publicFacet = Far('publicFacet', {
    /** @param {OracleQuery} query */
    async query(query) {
      try {
        assert(!revoked, revokedMsg);
        const noFee = AmountMath.makeEmpty(feeBrand);
        const { requiredFee, reply } = await E(handler).onQuery(query, noFee);
        !requiredFee ||
          AmountMath.isGTE(noFee, requiredFee) ||
          assert.fail(X`Oracle required a fee but the query had none`);
        return reply;
      } catch (e) {
        E(handler).onError(query, e);
        throw e;
      }
    },
    /** @param {OracleQuery} query */
    async makeQueryInvitation(query) {
      /** @type {OfferHandler} */
      const doQuery = async querySeat => {
        try {
          const fee = querySeat.getAmountAllocated('Fee', feeBrand);
          const { requiredFee, reply } = await E(handler).onQuery(query, fee);
          if (requiredFee) {
            atomicTransfer(
              zcf,
              harden([[querySeat, feeSeat, { Fee: requiredFee }]]),
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
/** @typedef {ContractOf<typeof start>} OracleContract */
/** @typedef {typeof start} OracleStart */
