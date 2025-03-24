/** @file Exo for @see {prepareTransactionFeedKit} */
import { makeTracer } from '@agoric/internal';
import { prepareDurablePublishKit } from '@agoric/notifier';
import { Fail, quote } from '@endo/errors';
import { keyEQ, M } from '@endo/patterns';
import {
  CctpTxEvidenceShape,
  RiskAssessmentShape,
} from '@agoric/fast-usdc/src/type-guards.js';
import { INVITATION_MAKERS_DESC } from '@agoric/fast-usdc/src/operator-kit-interface.js';
import { defineInertInvitation } from '../utils/zoe.js';
import { prepareOperatorKit } from './operator-kit.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {MapStore} from '@agoric/store';
 * @import {OperatorKit} from './operator-kit.js';
 * @import {CctpTxEvidence, EvidenceWithRisk, RiskAssessment} from '@agoric/fast-usdc/src/types.js';
 */

const trace = makeTracer('TxFeed', true);

/**
 * @typedef {Pick<OperatorKit, 'invitationMakers' | 'operator'>} OperatorOfferResult
 */

const TransactionFeedKitI = harden({
  operatorPowers: M.interface('Transaction Feed Admin', {
    attest: M.call(
      CctpTxEvidenceShape,
      RiskAssessmentShape,
      M.string(),
    ).returns(),
  }),
  creator: M.interface('Transaction Feed Creator', {
    initOperator: M.call(M.string()).returns({
      invitationMakers: M.remotable(),
      operator: M.remotable(),
    }),
    makeOperatorInvitation: M.call(M.string()).returns(M.promise()),
    removeOperator: M.call(M.string()).returns(),
  }),
  public: M.interface('Transaction Feed Public', {
    getEvidenceSubscriber: M.call().returns(M.remotable()),
  }),
});

/**
 * @param {MapStore<string, RiskAssessment>[]} riskStores
 * @param {string} txHash
 */
const allRisksIdentified = (riskStores, txHash) => {
  /**  @type {Set<string>} */
  const setOfRisks = new Set();
  for (const store of riskStores) {
    const next = store.get(txHash);
    for (const risk of next.risksIdentified ?? []) {
      setOfRisks.add(risk);
    }
  }
  return [...setOfRisks.values()].sort();
};

export const stateShape = {
  operators: M.remotable(),
  pending: M.remotable(),
  risks: M.remotable(),
};
harden(stateShape);

/**
 * A TransactionFeed is responsible for finding quorum among oracles.
 *
 * It receives attestations, records their evidence, and when enough oracles
 * agree, publishes the results for the advancer to act on.
 *
 * @param {Zone} zone
 * @param {ZCF} zcf
 */
export const prepareTransactionFeedKit = (zone, zcf) => {
  const kinds = zone.mapStore('Kinds');
  const makeDurablePublishKit = prepareDurablePublishKit(
    kinds,
    'Transaction Feed',
  );
  /** @type {PublishKit<EvidenceWithRisk>} */
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
      const operators = zone.mapStore('operators');
      /** @type {MapStore<string, MapStore<string, CctpTxEvidence>>} */
      const pending = zone.mapStore('pending');
      /** @type {MapStore<string, MapStore<string, RiskAssessment>>} */
      const risks = zone.mapStore('risks');
      return { operators, pending, risks };
    },
    {
      creator: {
        /**
         * An "operator invitation" is an invitation to be an operator in the
         * oracle network, with the able to submit data to submit evidence of
         * CCTP transactions.
         *
         * @param {string} operatorId unique per contract instance
         * @returns {Promise<Invitation<OperatorOfferResult>>}
         */
        makeOperatorInvitation(operatorId) {
          const { creator } = this.facets;
          trace('makeOperatorInvitation', operatorId);

          return zcf.makeInvitation(
            /** @type {OfferHandler<OperatorOfferResult>} */
            seat => {
              seat.exit();
              return creator.initOperator(operatorId);
            },
            INVITATION_MAKERS_DESC,
          );
        },
        /**
         * @param {string} operatorId
         * @returns {OperatorOfferResult}
         */
        initOperator(operatorId) {
          const { operators, pending, risks } = this.state;
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
          risks.init(operatorId, zone.detached().mapStore('risk assessments'));

          // Subset facets to all the off-chain operator needs
          const { invitationMakers, operator } = operatorKit;
          return {
            invitationMakers,
            operator,
          };
        },

        /** @param {string} operatorId */
        removeOperator(operatorId) {
          const { operators, pending, risks } = this.state;
          trace('removeOperator', operatorId);
          const operatorKit = operators.get(operatorId);
          operatorKit.admin.disable();
          operators.delete(operatorId);
          pending.delete(operatorId);
          risks.delete(operatorId);
        },
      },
      operatorPowers: {
        /**
         * Add evidence from an operator.
         *
         * NB: the operatorKit is responsible for revoking access.
         *
         * @param {CctpTxEvidence} evidence
         * @param {RiskAssessment} riskAssessment
         * @param {string} operatorId
         */
        attest(evidence, riskAssessment, operatorId) {
          const { operators, pending, risks } = this.state;
          trace('attest', operatorId, evidence);

          const { txHash } = evidence;

          // accept the evidence
          {
            const pendingStore = pending.get(operatorId);
            if (pendingStore.has(txHash)) {
              trace(`operator ${operatorId} already reported ${txHash}`);
            } else {
              pendingStore.init(txHash, evidence);
              // accept the risk assessment as well
              const riskStore = risks.get(operatorId);
              riskStore.init(txHash, riskAssessment);
            }
          }

          // check agreement
          const found = [...pending.values()].filter(store =>
            store.has(txHash),
          );

          {
            let lastEvidence;
            for (const store of found) {
              const next = store.get(txHash);
              if (lastEvidence && !keyEQ(lastEvidence, next)) {
                // Ignore conflicting evidence, but treat it as an error
                // because it should never happen and needs to be prevented
                // from happening again.
                trace(
                  '🚨 conflicting evidence for',
                  txHash,
                  ':',
                  lastEvidence,
                  '!=',
                  next,
                );
                Fail`conflicting evidence for ${quote(txHash)}`;
              }
              lastEvidence = next;
            }
          }

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
            // wait for more
            return;
          }

          const riskStores = [...risks.values()].filter(store =>
            store.has(txHash),
          );

          // Publish at the threshold of agreement
          if (found.length === minAttestations) {
            // take the union of risks identified from all operators
            const risksIdentified = allRisksIdentified(riskStores, txHash);
            trace('publishing evidence', evidence, risksIdentified);
            publisher.publish({
              evidence,
              risk: { risksIdentified },
            });
            return;
          }

          if (found.length === pending.getSize()) {
            // all have reported so clean up
            for (const store of found) {
              store.delete(txHash);
            }
            for (const store of riskStores) {
              store.delete(txHash);
            }
          }
        },
      },
      public: {
        getEvidenceSubscriber: () => subscriber,
      },
    },
    { stateShape },
  );
};
harden(prepareTransactionFeedKit);

/** @typedef {ReturnType<ReturnType<typeof prepareTransactionFeedKit>>} TransactionFeedKit */
