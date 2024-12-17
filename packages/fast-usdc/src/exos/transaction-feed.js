import { makeTracer } from '@agoric/internal';
import { prepareDurablePublishKit } from '@agoric/notifier';
import { keyEQ, M } from '@endo/patterns';
import { Fail } from '@endo/errors';
import { CctpTxEvidenceShape } from '../type-guards.js';
import { defineInertInvitation } from '../utils/zoe.js';
import { prepareOperatorKit } from './operator-kit.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {OperatorKit} from './operator-kit.js';
 * @import {CctpTxEvidence} from '../types.js';
 */

const trace = makeTracer('TxFeed', true);

/** Name in the invitation purse (keyed also by this contract instance) */
export const INVITATION_MAKERS_DESC = 'oracle operator invitation';

const TransactionFeedKitI = harden({
  operatorPowers: M.interface('Transaction Feed Admin', {
    attest: M.call(CctpTxEvidenceShape, M.string()).returns(),
  }),
  creator: M.interface('Transaction Feed Creator', {
    // TODO narrow the return shape to OperatorKit
    initOperator: M.call(M.string()).returns(M.record()),
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
      /** @type {MapStore<string, MapStore<string, CctpTxEvidence>>} */
      const pending = zone.mapStore('pending', {
        durable: true,
      });
      return { operators, pending };
    },
    {
      creator: {
        /**
         * An "operator invitation" is an invitation to be an operator in the
         * oracle network, with the able to submit data to submit evidence of
         * CCTP transactions.
         *
         * @param {string} operatorId unique per contract instance
         * @returns {Promise<Invitation<OperatorKit>>}
         */
        makeOperatorInvitation(operatorId) {
          const { creator } = this.facets;
          trace('makeOperatorInvitation', operatorId);

          return zcf.makeInvitation(
            /** @type {OfferHandler<OperatorKit>} */
            seat => {
              seat.exit();
              return creator.initOperator(operatorId);
            },
            INVITATION_MAKERS_DESC,
          );
        },
        /** @param {string} operatorId */
        initOperator(operatorId) {
          const { operators, pending } = this.state;
          trace('initOperator', operatorId);

          const operatorKit = makeOperatorKit(
            operatorId,
            this.facets.operatorPowers,
          );
          operators.init(operatorId, operatorKit);
          pending.init(
            operatorId,
            zone.detached().mapStore('pending evidence'),
          );

          return operatorKit;
        },

        /** @param {string} operatorId */
        async removeOperator(operatorId) {
          const { operators } = this.state;
          trace('removeOperator', operatorId);
          const operatorKit = operators.get(operatorId);
          operatorKit.admin.disable();
          operators.delete(operatorId);
        },
      },
      operatorPowers: {
        /**
         * Add evidence from an operator.
         *
         * NB: the operatorKit is responsible for
         *
         * @param {CctpTxEvidence} evidence
         * @param {string} operatorId
         */
        attest(evidence, operatorId) {
          const { operators, pending } = this.state;
          trace('submitEvidence', operatorId, evidence);

          // TODO validate that it's a valid for Fast USDC before accepting
          // E.g. that the `recipientAddress` is the FU settlement account and that
          // the EUD is a chain supported by FU.
          const { txHash } = evidence;

          // accept the evidence
          {
            const pendingStore = pending.get(operatorId);
            if (pendingStore.has(txHash)) {
              trace(`operator ${operatorId} already reported ${txHash}`);
            } else {
              pendingStore.init(txHash, evidence);
            }
          }

          // check agreement
          const found = [...pending.values()].filter(store =>
            store.has(txHash),
          );
          trace('found these stores with the txHash', found.length);
          const minAttestations = Math.ceil(operators.getSize() / 2);
          trace(
            'transaction',
            txHash,
            'has',
            found.length,
            'of',
            minAttestations,
            'necessary attestations',
          );
          if (found.length < minAttestations) {
            return;
          }

          let lastEvidence;
          for (const store of found) {
            const next = store.get(txHash);
            if (lastEvidence) {
              if (keyEQ(lastEvidence, next)) {
                lastEvidence = next;
              } else {
                trace(
                  '🚨 conflicting evidence for',
                  txHash,
                  ':',
                  lastEvidence,
                  '!=',
                  next,
                );
                Fail`conflicting evidence for ${txHash}`;
              }
            }
            lastEvidence = next;
          }

          // sufficient agreement, so remove from pending and publish
          for (const store of found) {
            store.delete(txHash);
          }
          trace(
            'stores with the txHash after delete()',
            [...pending.values()].filter(store => store.has(txHash)).length,
          );
          trace('publishing evidence', evidence);
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
