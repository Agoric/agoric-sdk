// @ts-nocheck
/* eslint-disable no-unused-vars */
import { prepareExoClass } from '@agoric/vat-data';
import { M } from '@endo/patterns';
import { OfferHandlerI } from '../../typeGuards';

/**
 * @typedef {object} GiMiXTerms
 * @property {import('@agoric/vats').NameHub} namesByAddress
 */

const JobReportProposalShape = M.splitRecord({
  give: {},
  want: {},
  exit: { onDemand: undefined },
});

const OracleInvitationProposalShape = M.splitRecord({
  give: {},
  want: {},
  exit: { onDemand: undefined },
});

const WorkAgreementProposalShape = M.splitRecord({
  give: {},
  want: {},
  exit: { onDemand: undefined },
});

/**
 * @param {ZCF<GiMiXTerms>} zcf
 */
export const prepare = async (zcf, _privateArgs, baggage) => {
  const { namesByAddress } = zcf.getTerms();

  const makeJobReportInvitationHandler = prepareExoClass(
    baggage,
    'JobReportHandler',
    OfferHandlerI,
    () => ({}),
    {
      handle(seat) {
        const { self, state } = this;
        return 'something';
      },
    },
  );

  const makeOracleInvitationHandler = prepareExoClass(
    baggage,
    'OracleInvitationHandler',
    OfferHandlerI,
    () => ({}),
    {
      handle(seat) {
        const { self, state } = this;
        const jobReportInvitationMaker = makeJobReportInvitationHandler();
        return jobReportInvitationMaker;
      },
    },
  );

  const makeWorkAgreementInvitationHandler = prepareExoClass(
    baggage,
    'WorkAgreementHandler',
    OfferHandlerI,
    () => ({}),
    {
      handle(seat) {
        const { self, state } = this;
        const jobId = 'placeholder42';
        return jobId;
      },
    },
  );

  const makeJobReportInvitation = () => {
    const jobReportInvitationHandler = makeJobReportInvitationHandler();

    const jobReportInvitationP = zcf.makeInvitation(
      jobReportInvitationHandler,
      'gimix job report',
      undefined,
      JobReportProposalShape,
    );
    return jobReportInvitationP;
  };

  const makeOracleInvitation = () => {
    const oracleInvitationHandler = makeOracleInvitationHandler();

    const oracleInvitationP = zcf.makeInvitation(
      oracleInvitationHandler,
      'gimix oracle invitation',
      undefined,
      OracleInvitationProposalShape,
    );
    return oracleInvitationP;
  };

  const makeWorkAgreementInvitation = () => {
    const workAgreementInvitationHandler = makeWorkAgreementInvitationHandler();

    const workAgreementP = zcf.makeInvitation(
      workAgreementInvitationHandler,
      'gimix work agreement',
      undefined,
      WorkAgreementProposalShape,
    );
    return workAgreementP;
  };
};
harden(prepare);
