/* eslint-disable no-unused-vars */
import { prepareExoClass, prepareExoClassKit } from '@agoric/vat-data';
import { M, makeCopyBag } from '@endo/patterns';
import { AmountShape } from '@agoric/ertp';
import { TimestampShape } from '@agoric/time';
import { OfferHandlerI, TimerShape } from '../../typeGuards';

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

const JobsReportContinuingIKit = {
  invitationMakers: M.interface('JobReportInvitationMaker', {
    JobReport: M.call().returns(M.any()),
  }),
};

const GimixContractFacetsIKit = harden({
  creatorFacet: M.interface('GimixCreatorFacetKit', {
    makeOracleInvitation: M.call().returns(M.any()),
  }),
  publicFacet: M.interface('GimixPublicFacet', {
    makeWorkAgreementInvitation: M.call().returns(M.any()),
  }),
});

/**
 * @param {ZCF<GiMiXTerms>} zcf
 */
export const prepare = async (zcf, _privateArgs, baggage) => {
  const { namesByAddress } = zcf.getTerms();

  const makeJobReportHandler = prepareExoClass(
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

  const makeJobReportContinuing = prepareExoClassKit(
    baggage,
    'JobsReportContinuing',
    JobsReportContinuingIKit,
    () => ({}),
    {
      invitationMakers: {
        JobReport() {
          const { facets, state } = this;
          // eslint-disable-next-line no-use-before-define
          return makeJobReportInvitation();
        },
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

  const makeWorkAgreementHandler = prepareExoClass(
    baggage,
    'WorkAgreementHandler',
    OfferHandlerI,
    issueURL => ({ issueURL }),
    {
      handle(seat) {
        const {
          self,
          state: { issueURL },
        } = this;
        const jobId = 'placeholder42';
        return jobId;
      },
    },
  );

  const makeGimixContractFacets = prepareExoClassKit(
    baggage,
    'GimixContractFacets',
    GimixContractFacetsIKit,
    () => ({}),
    {
      creatorFacet: {
        makeOracleInvitation() {
          const { facets, state } = this;
          // eslint-disable-next-line no-use-before-define
          return makeOracleInvitation();
        },
      },
      publicFacet: {
        makeWorkAgreementInvitation(issueURL) {
          const { facets, state } = this;
          // eslint-disable-next-line no-use-before-define
          return makeWorkAgreementInvitation(issueURL);
        },
      },
    },
  );

  // ///////////////////////////////////////////////////////////////////////////
  //
  // The following `await` terminates the synchronous prelude of the `prepare`
  // function.
  // In this contract, we choose to use a fixed set of calls to the
  // `prepare*` functions, which means they all need to happen up front
  // before any interesting activity.
  // To be extra disciplined, we call all the `prepare*` functions above,
  // during the synchronous prelude.
  // This choice prevents us from using lexical nesting within actions,
  // and so all state must be provided as durable instance state.
  // (This is sometimes known as "lambda lifting".)
  // As an experiment in upgrade tolerance, we make all exposed abstractions
  // durable and upgradable, including offer handlers. By making the
  // offer handlers durable, their invitations should remain valid
  // across an upgrade.
  //
  // We continue in the same lexical scope below, so all the top level
  // variables declared an initialized after the synchronous prelude
  // are in scope above. But they can only be used by the code above
  // after they have been initialized.
  //
  // ///////////////////////////////////////////////////////////////////////////

  const gimixOracleMint = await zcf.makeZCFMint(
    'GimixOracle',
    'copyBag',
    undefined,
    { elementShape: M.string() }, // The issueURL
  );

  const { brand: oracleBrand, issuer: oracleIssuer } =
    gimixOracleMint.getIssuerRecord();

  const makeJobReportInvitation = () => {
    const jobReportHandler = makeJobReportHandler();

    const jobReportInvitationP = zcf.makeInvitation(
      jobReportHandler,
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

  const makeWorkAgreementInvitation = issueURL => {
    const workAgreementHandler = makeWorkAgreementHandler(issueURL);

    const WorkAgreementProposalShape = M.splitRecord({
      give: { Acceptance: AmountShape },
      want: {
        Stamp: {
          brand: oracleBrand,
          value: makeCopyBag([[`Fixed ${issueURL}`, 1n]]),
        },
      },
      exit: {
        afterDeadline: {
          timer: M.eref(TimerShape),
          deadline: TimestampShape,
        },
      },
    });

    const workAgreementP = zcf.makeInvitation(
      workAgreementHandler,
      'gimix work agreement',
      harden({
        issueURL,
      }),
      WorkAgreementProposalShape,
    );
    return workAgreementP;
  };

  const gimixContractFacets = makeGimixContractFacets();

  return gimixContractFacets;
};
harden(prepare);
