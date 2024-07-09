/**
 * @file Primarily a testing fixture, but also serves as an example of how to
 *   leverage basic functionality of the Orchestration API with async-flow.
 */
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M, mustMatch } from '@endo/patterns';
import { provideOrchestration } from '../utils/start-helper.js';

/**
 * @import {Baggage} from '@agoric/vat-data';
 * @import {Orchestrator} from '@agoric/orchestration';
 * @import {OrchestrationPowers} from '../utils/start-helper.js';
 */

/**
 * Create an account on a Cosmos chain and return a continuing offer with
 * invitations makers for Delegate, WithdrawRewards, Transfer, etc.
 *
 * @param {Orchestrator} orch
 * @param {undefined} _ctx
 * @param {ZCFSeat} seat
 * @param {{ chainName: string }} offerArgs
 */
const makeOrchAccountHandler = async (orch, _ctx, seat, { chainName }) => {
  seat.exit(); // no funds exchanged
  mustMatch(chainName, M.string());
  const remoteChain = await orch.getChain(chainName);
  const cosmosAccount = await remoteChain.makeAccount();
  return cosmosAccount.asContinuingOffer();
};

/**
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 * }} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { orchestrate, zone } = provideOrchestration(
    zcf,
    baggage,
    privateArgs,
    privateArgs.marshaller,
  );

  /** @type {OfferHandler} */
  const makeOrchAccount = orchestrate(
    'makeOrchAccount',
    undefined,
    makeOrchAccountHandler,
  );

  const publicFacet = zone.exo(
    'Basic Flows Public Facet',
    M.interface('Basic Flows PF', {
      makeOrchAccountInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeOrchAccountInvitation() {
        return zcf.makeInvitation(
          makeOrchAccount,
          'Make an Orchestration Account',
        );
      },
    },
  );

  return { publicFacet };
};

/** @typedef {typeof start} BasicFlowsSF */
