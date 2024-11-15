import { makeTracer } from '@agoric/internal';
import { prepareDurablePublishKit } from '@agoric/notifier';
import { M } from '@endo/patterns';
import { CctpTxEvidenceShape } from '../typeGuards.js';
import { prepareOperatorKit } from './operator-kit.js';
import { defineInertInvitation } from '../utils/zoe.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {OperatorKit} from './operator-kit.js';
 * @import {CctpTxEvidence} from '../types.js';
 */

const trace = makeTracer('TxFeed', true);

/** Name in the invitation purse (keyed also by this contract instance) */
export const INVITATION_MAKERS_DESC = 'oracle operator invitation';

const TransactionFeedKitI = harden({
  admin: M.interface('Transaction Feed Admin', {
    submitEvidence: M.call(CctpTxEvidenceShape).returns(),
    initOperator: M.call(M.string()).returns(M.promise()),
  }),
  creator: M.interface('Transaction Feed Creator', {
    makeOperatorInvitation: M.call(M.string()).returns(M.promise()),
    removeOperator: M.call(M.string()).returns(),
  }),
  public: M.interface('Transaction Feed Public', {
    getEvidenceSubscriber: M.call().returns(M.remotable()),
  }),
});

/**
 * @param {Zone} zone
 * @param {ZCF} zcf
 */
export const prepareTransactionFeedKit = (zone, zcf) => {
  const kinds = zone.mapStore('Kinds');
  const makeDurablePublishKit = prepareDurablePublishKit(
    kinds,
    'Transaction Feed',
  );
  /** @type {PublishKit<CctpTxEvidence>} */
  const { publisher, subscriber } = makeDurablePublishKit();

  const makeInertInvitation = defineInertInvitation(zcf, 'submitting evidence');

  const makeOperatorKit = prepareOperatorKit(zone, {
    handleEvidence: (operatorId, evidence) => {
      trace('handleEvidence', operatorId, evidence);
    },
    makeInertInvitation,
  });

  return zone.exoClassKit(
    'Fast USDC Feed',
    TransactionFeedKitI,
    () => {
      /** @type {MapStore<string, OperatorKit>} */
      const operators = zone.mapStore('operators', {
        durable: true,
      });
      return { operators };
    },
    {
      creator: {
        /**
         * An "operator invitation" is an invitation to be an operator in the
         * oracle netowrk, with the able to submit data to submit evidence of
         * CCTP transactions.
         *
         * @param {string} operatorId unique per contract instance
         * @returns {Promise<Invitation<OperatorKit>>}
         */
        makeOperatorInvitation(operatorId) {
          const { admin } = this.facets;
          trace('makeOperatorInvitation', operatorId);

          return zcf.makeInvitation(
            /** @type {OfferHandler<OperatorKit>} */
            seat => {
              seat.exit();
              return admin.initOperator(operatorId);
            },
            INVITATION_MAKERS_DESC,
          );
        },
        /** @param {string} operatorId */
        async removeOperator(operatorId) {
          const { operators: oracles } = this.state;
          trace('removeOperator', operatorId);
          const kit = oracles.get(operatorId);
          kit.admin.disable();
          oracles.delete(operatorId);
        },
      },

      admin: {
        /** @param {string} operatorId */
        async initOperator(operatorId) {
          const { operators: oracles } = this.state;
          trace('initOperator', operatorId);

          const oracleKit = makeOperatorKit(operatorId);
          oracles.init(operatorId, oracleKit);

          return oracleKit;
        },

        /** @param {CctpTxEvidence } evidence */
        submitEvidence: evidence => {
          trace('TEMPORARY: Add evidence:', evidence);
          // TODO decentralize
          // TODO validate that it's valid to publish
          publisher.publish(evidence);
        },
      },
      public: {
        getEvidenceSubscriber: () => subscriber,
      },
    },
  );
};
harden(prepareTransactionFeedKit);

/** @typedef {ReturnType<ReturnType<typeof prepareTransactionFeedKit>>} TransactionFeedKit */
