/**
 * @file contract to start other contracts (PROTOTYPE)
 *
 * An experiment in delegating the right to start new contracts
 * from the full set of stakers to something smaller.
 *
 * WARNING: anyone can start anything for free.
 *
 * Options:
 *   - charge a fee to start a contract
 *   - charge a fee to install a bundle
 *   - use a governed API (in the sense of @agoric/governance)
 *     for install, start
 *   - use a governed API for install
 *   - use a governed API for access to bootstrap powers
 *
 * Issues:
 *   - adminFacet is NOT SAVED. UPGRADE IS IMPOSSIBLE
 *   - smartWallet provides no effective way to provide privateArgs
 */

import { E, Far } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import { InstallationShape, IssuerRecordShape } from '../../typeGuards.js';
import { depositToSeat } from '../../contractSupport/zoeHelpers.js';

/** @template SF @typedef {import('../../zoeService/utils').StartParams<SF>} StartParams<SF> */

const { Fail } = assert;

// /** @type {ContractMeta} */
// const meta = {};

/**
 * @see {ZoeService.startInstance}
 */
export const StartOptionsShape = M.and(
  M.or({ bundleID: M.string() }, { installation: InstallationShape }),
  M.partial({
    issuerKeywordRecord: IssuerRecordShape,
    customTerms: M.any(),
    privateArgs: M.any(),
    instanceLabel: M.string(),
  }),
);
// TODO: generate types from shapes (IOU issue #)
/**
 * @template SF
 * @typedef {(
 *  { bundleID: string } | { installation: Installation<SF> }
 * ) & Partial<{
 *   issuerKeywordRecord: Record<string, Issuer>,
 *   customTerms: StartParams<SF>['terms'],
 *   privateArgs: StartParams<SF>['privateArgs'],
 *   instanceLabel: string,
 * }>} StartOptions
 */

const noHandler = () => Fail`no handler`;
const NoProposalShape = M.not(M.any());

/**
 * @param {ZCF} zcf
 * @param {unknown} _privateArgs
 * @param {unknown} _baggage
 */
export const start = (zcf, _privateArgs, _baggage) => {
  const zoe = zcf.getZoeService();
  const invitationIssuerP = E(zoe).getInvitationIssuer();

  // NOTE: opts could be moved to offerArgs to
  // save one layer of closure, but
  // this way makes the types more discoverable via publicFacet

  /**
   * Make an invitation to to start a contract.
   * The payouts include an invitation whose details
   * include the resulting contract instance (and installation).
   * Since the smartWallet publishes the balance
   * of a user's invitation purse, this will
   * make the instance and installation visible in vstorage.
   *
   * @template {import('../../zoeService/utils').ContractStartFunction} SF
   * @param {StartOptions<SF>} opts
   */
  const makeStartInvitation = async opts => {
    mustMatch(opts, StartOptionsShape);

    /** @param {ZCFSeat} seat */
    const handleStart = async seat => {
      const installation = await ('installation' in opts
        ? opts.installation
        : E(zoe).installBundleID(opts.bundleID));

      const { issuerKeywordRecord, customTerms, privateArgs, instanceLabel } =
        opts;
      /** @type {StartedInstanceKit<SF>} */
      const it = await E(zoe).startInstance(
        installation,
        issuerKeywordRecord,
        customTerms,
        privateArgs,
        instanceLabel,
      );
      // WARNING: adminFacet is dropped
      const { instance, creatorFacet } = it;

      const handlesInDetails = zcf.makeInvitation(
        noHandler,
        'started',
        { instance, installation },
        NoProposalShape,
      );
      const amt = await E(invitationIssuerP).getAmountOf(handlesInDetails);
      await depositToSeat(
        zcf,
        seat,
        { Started: amt },
        { Started: handlesInDetails },
      );
      seat.exit();
      return harden({ invitationMakers: creatorFacet });
    };
    return zcf.makeInvitation(handleStart, 'start');
  };

  const publicFacet = Far('PublicFacet', {
    makeStartInvitation,
  });

  return { publicFacet };
};
