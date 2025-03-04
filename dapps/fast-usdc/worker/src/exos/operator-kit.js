import { makeTracer } from '@agoric/internal';
import { Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import { CctpTxEvidenceShape, RiskAssessmentShape } from '../type-guards.js';

const trace = makeTracer('TxOperator');

/**
 * @import {Zone} from '@agoric/zone';
 * @import {CctpTxEvidence, RiskAssessment} from '../types.js';
 */

/**
 * @typedef {object} OperatorPowers
 * @property {(evidence: CctpTxEvidence, riskAssessment: RiskAssessment, operatorId: string) => void} attest
 */

/**
 * @typedef {object} OperatorStatus
 * @property {boolean} [disabled]
 * @property {string} operatorId
 */

/**
 * @typedef {Readonly<{ operatorId: string, powers: OperatorPowers }> & {disabled: boolean}} State
 */

const OperatorKitI = {
  admin: M.interface('Admin', {
    disable: M.call().returns(),
  }),

  invitationMakers: M.interface('InvitationMakers', {
    SubmitEvidence: M.call(CctpTxEvidenceShape)
      .optional(RiskAssessmentShape)
      .returns(M.promise()),
  }),

  operator: M.interface('Operator', {
    submitEvidence: M.call(CctpTxEvidenceShape)
      .optional(RiskAssessmentShape)
      .returns(),
    getStatus: M.call().returns(M.record()),
  }),
};

/**
 * @param {Zone} zone
 * @param {{ makeInertInvitation: Function }} staticPowers
 */
export const prepareOperatorKit = (zone, staticPowers) =>
  zone.exoClassKit(
    'Operator Kit',
    OperatorKitI,
    /**
     * @param {string} operatorId
     * @param {OperatorPowers} powers facet of the durable transaction feed
     * @returns {State}
     */
    (operatorId, powers) => {
      return {
        operatorId,
        powers,
        disabled: false,
      };
    },
    {
      admin: {
        disable() {
          trace(`operator ${this.state.operatorId} disabled`);
          this.state.disabled = true;
        },
      },
      /**
       * NB: when this kit is an offer result, the smart-wallet will detect the `invitationMakers`
       * key and save it for future offers.
       */
      invitationMakers: {
        /**
         * Provide an API call in the form of an invitation maker, so that the
         * capability is available in the smart-wallet bridge.
         *
         * NB: The `Invitation` object is evidence that the operation took
         * place, rather than as a means of performing it as in the
         * fluxAggregator contract used for price oracles.
         *
         * @param {CctpTxEvidence} evidence
         * @param {RiskAssessment} [riskAssessment]
         * @returns {Promise<Invitation>}
         */
        async SubmitEvidence(evidence, riskAssessment) {
          const { operator } = this.facets;
          operator.submitEvidence(evidence, riskAssessment);
          return staticPowers.makeInertInvitation(
            'evidence was pushed in the invitation maker call',
          );
        },
      },
      operator: {
        /**
         * submit evidence from this operator
         *
         * @param {CctpTxEvidence} evidence
         * @param {RiskAssessment} [riskAssessment]
         * @returns {void}
         */
        submitEvidence(evidence, riskAssessment = {}) {
          const { state } = this;
          !state.disabled || Fail`submitEvidence for disabled operator`;
          state.powers.attest(evidence, riskAssessment, state.operatorId);
        },
        /** @returns {OperatorStatus} */
        getStatus() {
          const { state } = this;
          return {
            operatorId: state.operatorId,
            disabled: state.disabled,
          };
        },
      },
    },
  );

/** @typedef {ReturnType<ReturnType<typeof prepareOperatorKit>>} OperatorKit */
