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
import type { Zone } from '@agoric/zone';
import type { MapStore } from '@agoric/store';
import type {
  CctpTxEvidence,
  EvidenceWithRisk,
  RiskAssessment,
} from '@agoric/fast-usdc/src/types.js';
import type { ZCF, Invitation } from '@agoric/zoe';
import { defineInertInvitation } from '../utils/zoe.ts';
import { prepareOperatorKit } from './operator-kit.ts';

import type { OperatorKit } from './operator-kit.ts';

const trace = makeTracer('TxFeed', true);

export type OperatorOfferResult = Pick<
  OperatorKit,
  'invitationMakers' | 'operator'
>;

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

const allRisksIdentified = (
  riskStores: MapStore<string, RiskAssessment>[],
  txHash: string,
) => {
  const setOfRisks = new Set() as Set<string>;
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
 * @param zone
 * @param zcf
 */
export const prepareTransactionFeedKit = (zone: Zone, zcf: ZCF) => {
  const kinds = zone.mapStore<string, unknown>('Kinds');
  const makeDurablePublishKit = prepareDurablePublishKit(
    kinds,
    'Transaction Feed',
  );
  const { publisher, subscriber } = makeDurablePublishKit<EvidenceWithRisk>();

  const makeInertInvitation = defineInertInvitation(zcf, 'submitting evidence');

  const makeOperatorKit = prepareOperatorKit(zone, {
    makeInertInvitation,
  });

  return zone.exoClassKit(
    'Fast USDC Feed',
    TransactionFeedKitI,
    () => {
      const operators = zone.mapStore<string, OperatorKit>('operators');
      const pending = zone.mapStore<string, MapStore<string, CctpTxEvidence>>(
        'pending',
      );
      const risks = zone.mapStore<string, MapStore<string, RiskAssessment>>(
        'risks',
      );
      return { operators, pending, risks };
    },
    {
      creator: {
        /**
         * An "operator invitation" is an invitation to be an operator in the
         * oracle network, with the able to submit data to submit evidence of
         * CCTP transactions.
         *
         * @param operatorId unique per contract instance
         */
        makeOperatorInvitation(
          operatorId: string,
        ): Promise<Invitation<OperatorOfferResult>> {
          const { creator } = this.facets;
          trace('makeOperatorInvitation', operatorId);

          return zcf.makeInvitation(seat => {
            seat.exit();
            return creator.initOperator(operatorId);
          }, INVITATION_MAKERS_DESC);
        },
        initOperator(operatorId: string): OperatorOfferResult {
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

        removeOperator(operatorId: string) {
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
         * @param evidence
         * @param riskAssessment
         * @param operatorId
         */
        attest(
          evidence: CctpTxEvidence,
          riskAssessment: RiskAssessment,
          operatorId: string,
        ) {
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

export type TransactionFeedKit = ReturnType<
  ReturnType<typeof prepareTransactionFeedKit>
>;
