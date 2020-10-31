// @ts-check
import { assert, details } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { trade } from '../contractSupport';

import '../../exported';

/**
 * This contract provides oracle queries for a fee or for pay.
 *
 * @type {ContractStartFn}
 *
 */
const start = async zcf => {
  const { oracleDescription } = zcf.getTerms();

  const {
    brands: { Fee: feeBrand },
    maths: { Fee: feeMath },
  } = zcf.getTerms();

  /** @type {OracleHandler} */
  let handler;
  /** @type {string} */
  const description = oracleDescription;

  const { zcfSeat: feeSeat } = zcf.makeEmptySeatKit();

  let lastIssuerNonce = 0;
  /** @type {string} */
  let revoked;

  /** @type {OracleCreatorFacet} */
  const realCreatorFacet = {
    async addFeeIssuer(issuerP) {
      lastIssuerNonce += 1;
      const keyword = `OracleFee${lastIssuerNonce}`;
      await zcf.saveIssuer(issuerP, keyword);
    },
    makeWithdrawInvitation(total = false) {
      return zcf.makeInvitation(seat => {
        const gains = total
          ? feeSeat.getCurrentAllocation()
          : seat.getProposal().want;
        trade(zcf, { seat: feeSeat, gains: {} }, { seat, gains });
        seat.exit();
        return 'liquidated';
      }, 'oracle liquidation');
    },
    getCurrentFees() {
      return feeSeat.getCurrentAllocation();
    },
  };

  const creatorFacet = harden({
    initialize(privateParams) {
      const { oracleHandler } = privateParams;
      handler = oracleHandler;
      return realCreatorFacet;
    },
  });

  /** @type {OraclePublicFacet} */
  const publicFacet = harden({
    getDescription() {
      return description;
    },
    async query(query) {
      try {
        if (revoked) {
          throw Error(revoked);
        }
        const noFee = feeMath.getEmpty();
        const { requiredFee, reply } = await E(handler).onQuery(query, noFee);
        if (revoked) {
          throw Error(revoked);
        }
        assert(
          !requiredFee || feeMath.isGTE(noFee, requiredFee),
          details`Oracle required a fee but the query had none`,
        );
        return reply;
      } catch (e) {
        E(handler).onError(query, e);
        throw e;
      }
    },
    async makeQueryInvitation(query) {
      /** @type {OfferHandler} */
      const offerHandler = async seat => {
        try {
          if (revoked) {
            throw Error(revoked);
          }

          const fee = await seat.getAmountAllocated('Fee', feeBrand);
          if (revoked) {
            throw Error(revoked);
          }

          const { requiredFee, reply } = await E(handler).onQuery(query, fee);
          if (requiredFee) {
            trade(
              zcf,
              { seat, gains: {} },
              { seat: feeSeat, gains: { Fee: requiredFee } },
            );
          }

          seat.exit();
          E(handler).onReply(query, reply, requiredFee);
          return reply;
        } catch (e) {
          seat.kickOut(e);
          E(handler).onError(query, e);
          throw e;
        }
      };
      return zcf.makeInvitation(offerHandler, 'oracle query', { query });
    },
  });

  const creatorInvitation = zcf.makeInvitation(
    async seat =>
      harden({
        exit() {
          trade(
            zcf,
            { seat: feeSeat, gains: {} },
            { seat, gains: feeSeat.getCurrentAllocation() },
          );
          seat.exit();
          feeSeat.exit();
          revoked = `Oracle ${description} revoked`;
          return 'liquidated';
        },
      }),
    'oracle total liquidation',
  );

  return { creatorFacet, publicFacet, creatorInvitation };
};

harden(start);
export { start };
