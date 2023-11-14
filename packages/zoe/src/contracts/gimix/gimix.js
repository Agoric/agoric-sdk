/* eslint-disable no-unused-vars */
import { prepareExoClass, prepareExoClassKit } from '@agoric/vat-data';
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
        // eslint-disable-next-line no-use-before-define
        const jobReportContinuing = makeJobReportContinuing();
        return jobReportContinuing;
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

  const makeJobReportContinuing = prepareExoClassKit(
    baggage,
    'JobsReportContinuing',
    {
      invitationMakers: M.interface('makeJobReportInvitation', {
        JobReport: M.call().returns(M.any()),
      })
    },
    () => ({}),
    {
      invitationMakers: {
        JobReport() {
          const { facets, state } = this;
          return makeJobReportInvitation();
        },
      },
    }
  );

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

  const GimixContractFacetsI = harden({
    creatorFacet: M.interface('GimixCreatorFacet', {
      makeOracleInvitation: M.call().returns(M.any()),
    }),
    publicFacet: M.interface('GimixPublicFacet', {
      makeWorkAgreementInvitation: M.call().returns(M.any()),
    }),
  });

  const makeGimixContractFacets = prepareExoClassKit(
    baggage,
    'GimixContractFacets',
    GimixContractFacetsI,
    () => ({}),
    {
      creatorFacet: {
        makeOracleInvitation() {
          const { facets, state } = this;
          return makeOracleInvitation();
        },
      },
      publicFacet: {
        makeWorkAgreementInvitation() {
          const { facets, state } = this;
          return makeWorkAgreementInvitation();
        }
      },
    },
  );

  const gimixContractFacets = makeGimixContractFacets();

  return gimixContractFacets;
};
harden(prepare);
