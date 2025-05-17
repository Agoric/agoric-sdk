import { OperatorKitI } from '@agoric/fast-usdc/src/operator-kit-interface.js';
import { makeTracer } from '@agoric/internal';
import type { Zone } from '@agoric/zone';
import { Fail } from '@endo/errors';
import type {
  CctpTxEvidence,
  RiskAssessment,
} from '@agoric/fast-usdc/src/types.js';
import type { Invitation } from '@agoric/zoe';

const trace: (...args: unknown[]) => void = makeTracer('TxOperator');

interface OperatorPowers {
  attest: (
    evidence: CctpTxEvidence,
    riskAssessment: RiskAssessment,
    operatorId: string,
  ) => void;
}

interface OperatorStatus {
  disabled?: boolean;
  operatorId: string;
}

interface State {
  operatorId: string;
  powers: OperatorPowers;
  disabled: boolean;
}

export const prepareOperatorKit = (
  zone: Zone,
  staticPowers: { makeInertInvitation: () => Promise<Invitation> },
) =>
  zone.exoClassKit(
    'Operator Kit',
    OperatorKitI,
    /**
     * @param operatorId
     * @param powers facet of the durable transaction feed
     */
    (operatorId: string, powers: OperatorPowers): State => {
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
         * @param evidence
         * @param riskAssessment
         */
        SubmitEvidence(
          evidence: CctpTxEvidence,
          riskAssessment: RiskAssessment,
        ): Promise<Invitation> {
          const { operator } = this.facets;
          operator.submitEvidence(evidence, riskAssessment);
          return staticPowers.makeInertInvitation();
        },
      },
      operator: {
        /**
         * submit evidence from this operator
         *
         * @param evidence
         * @param riskAssessment
         */
        submitEvidence(
          evidence: CctpTxEvidence,
          riskAssessment: RiskAssessment = {},
        ): void {
          const { state } = this;
          !state.disabled || Fail`submitEvidence for disabled operator`;
          state.powers.attest(evidence, riskAssessment, state.operatorId);
        },
        getStatus(): OperatorStatus {
          const { state } = this;
          return {
            operatorId: state.operatorId,
            disabled: state.disabled,
          };
        },
      },
    },
  );

export type OperatorKit = ReturnType<ReturnType<typeof prepareOperatorKit>>;
