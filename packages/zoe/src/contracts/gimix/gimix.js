import { E } from '@endo/eventual-send';
import { M } from '@endo/patterns';
import {
  prepareExoClass,
  prepareExoClassKit,
  provide,
  provideDurableMapStore,
} from '@agoric/vat-data';
import { OfferHandlerI } from '../../typeGuards';
import {
  DeliverProposalShape,
  JobReportProposalShape,
  OracleInvitationProposalShape,
  makeWorkAgreementProposalShape,
  ReportShape,
  JobsReportContinuingIKit,
  GimixContractFacetsIKit,
} from './typeGuards.js';

const { Fail, quote: q } = assert;

/**
 * @typedef {object} GiMiXTerms
 * @property {import('@agoric/vats').NameHub} namesByAddress
 * @property {import('@agoric/time/src/types').TimerService} timer
 */

/**
 * @param {ZCF<GiMiXTerms>} zcf
 */
export const prepare = async (zcf, _privateArgs, baggage) => {
  const { namesByAddress } = zcf.getTerms();

  const workByJob = provideDurableMapStore(
    baggage,
    'JobWork',
    harden({
      keyShape: M.nat(),
      valueShape: {
        issueURL: M.string(),
        requestorSeat: M.remotable('requestorSeat'),
      },
    }),
  );

  const makeDeliverHandler = prepareExoClass(
    baggage,
    'DeliverHandler',
    OfferHandlerI,
    (requestorSeat, report) => ({
      requestorSeat,
      report,
    }),
    {
      handle(responderSeat) {
        const {
          state: { requestorSeat, report },
        } = this;
        const { jobID } = report;

        workByJob.delete(jobID);
        if (requestorSeat.hasExited()) {
          // TODO check that the deadline actually has expired.
          // Otherwise, report mysterious failure.
          const reason = RangeError(`Offer deadline expired`);
          responderSeat.fail(reason);
          throw reason;
        }
        // TODO Where all the action happens
      },
    },
    harden({
      stateShape: {
        requestorSeat: M.remotable('ZCFSeat'),
        report: ReportShape,
      },
    }),
  );

  const makeJobReportHandler = prepareExoClass(
    baggage,
    'JobReportHandler',
    OfferHandlerI,
    report => ({ report }),
    {
      handle(_seat) {
        const {
          state: { report },
        } = this;
        const { deliverDepositAddr, jobID, issueURL } = report;

        const depositFacetP = E(namesByAddress).lookup(deliverDepositAddr);
        workByJob.has(jobID) || Fail`Gimix job ${q(jobID)} not found`;
        const { issueURL: expectedIssueURL, requestorSeat } =
          workByJob.get(jobID);
        expectedIssueURL === issueURL ||
          Fail`Gimix job ${q(jobID)} expected issue ${q(
            expectedIssueURL,
          )} not ${q(issueURL)}`;
        const deliverInvitation = zcf.makeInvitation(
          makeDeliverHandler(requestorSeat, report),
          'gimix delivery',
          report,
          DeliverProposalShape,
        );
        return E(depositFacetP).receive(deliverInvitation);
      },
    },
    harden({
      stateShape: {
        report: ReportShape,
      },
    }),
  );

  const makeJobReportContinuing = prepareExoClassKit(
    baggage,
    'JobsReportContinuing',
    JobsReportContinuingIKit,
    () => ({}),
    {
      invitationMakers: {
        JobReport(report) {
          return zcf.makeInvitation(
            makeJobReportHandler(report),
            'gimix job report',
            report,
            JobReportProposalShape,
          );
        },
      },
      kitMustHaveMultipleFacets: {},
    },
    harden({
      stateShape: {},
    }),
  );

  const makeOracleInvitationHandler = prepareExoClass(
    baggage,
    'OracleInvitationHandler',
    OfferHandlerI,
    () => ({}),
    {
      handle(_seat) {
        return makeJobReportContinuing();
      },
    },
    harden({
      stateShape: {},
    }),
  );

  const NEXT_JOB_ID_VAR = 'nextGimixJobID';
  provide(baggage, NEXT_JOB_ID_VAR, () => 0n);

  // Hazard: Sequential assignment leaks info about how many previous
  // ones were allocated. This could both be a side channel and a covert
  // channel, i.e., the source of the leakage may be inadvertantly or
  // purposely leaking. However, this is a confidentiality-only leak,
  // and our current assumption of a public transparent chain makes
  // and the info at stake public anyway.
  const getNextJobID = () => {
    const nextGimixJobID = baggage.get(NEXT_JOB_ID_VAR);
    baggage.set(NEXT_JOB_ID_VAR, nextGimixJobID + 1n);
    return nextGimixJobID;
  };

  const makeWorkAgreementHandler = prepareExoClass(
    baggage,
    'WorkAgreementHandler',
    OfferHandlerI,
    issueURL => ({ issueURL }),
    {
      handle(requestorSeat) {
        const {
          state: { issueURL },
        } = this;

        const jobID = getNextJobID();
        workByJob.init(
          jobID,
          harden({
            issueURL,
            requestorSeat,
          }),
        );
        return jobID;
      },
    },
    harden({
      stateShape: {
        issueURL: M.string(),
      },
    }),
  );

  const makeGimixContractFacets = prepareExoClassKit(
    baggage,
    'GimixContractFacets',
    GimixContractFacetsIKit,
    () => ({}),
    {
      creatorFacet: {
        makeOracleInvitation() {
          return zcf.makeInvitation(
            makeOracleInvitationHandler(),
            'gimix oracle invitation',
            undefined,
            OracleInvitationProposalShape,
          );
        },
      },
      publicFacet: {
        makeWorkAgreementInvitation(issueURL) {
          return zcf.makeInvitation(
            makeWorkAgreementHandler(issueURL),
            'gimix work agreement',
            harden({
              issueURL,
            }),
            // eslint-disable-next-line no-use-before-define
            makeWorkAgreementProposalShape(oracleBrand, issueURL),
          );
        },
      },
    },
    harden({
      stateShape: {},
    }),
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
    { elementShape: M.string() }, // `Fixed ${issueURL}`
  );

  const { brand: oracleBrand } = gimixOracleMint.getIssuerRecord();

  return makeGimixContractFacets();
};
harden(prepare);
