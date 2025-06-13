import { M } from '@endo/patterns';
import { CctpTxEvidenceShape, RiskAssessmentShape } from './type-guards.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {CctpTxEvidence, RiskAssessment} from '@agoric/fast-usdc/src/types.js';
 */

/** Name in the invitation purse (keyed also by this contract instance) */
export const INVITATION_MAKERS_DESC = 'oracle operator invitation';

export const OperatorKitI = {
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
