/**
 * @file Primarily a testing fixture, but also serves as an example of how to
 *   leverage basic functionality of the Orchestration API with async-flow.
 */
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M, mustMatch } from '@endo/patterns';
import { withOrchestration } from '../utils/start-helper.js';
import { preparePortfolioHolder } from '../exos/portfolio-holder-kit.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationAccount, Orchestrator} from '@agoric/orchestration';
 * @import {ResolvedPublicTopic} from '@agoric/zoe/src/contractSupport/topics.js';
 * @import {OrchestrationPowers} from '../utils/start-helper.js';
 * @import {MakePortfolioHolder} from '../exos/portfolio-holder-kit.js';
 * @import {OrchestrationTools} from '../utils/start-helper.js';
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
 * Create accounts on multiple chains and return them in a single continuing
 * offer with invitations makers for Delegate, WithdrawRewards, Transfer, etc.
 * Calls to the underlying invitationMakers are proxied through the
 * `MakeInvitation` invitation maker.
 *
 * @param {Orchestrator} orch
 * @param {MakePortfolioHolder} makePortfolioHolder
 * @param {ZCFSeat} seat
 * @param {{ chainNames: string[] }} offerArgs
 */
const makePortfolioAcctHandler = async (
  orch,
  makePortfolioHolder,
  seat,
  { chainNames },
) => {
  seat.exit(); // no funds exchanged
  mustMatch(chainNames, M.arrayOf(M.string()));
  const allChains = await Promise.all(chainNames.map(n => orch.getChain(n)));
  const allAccounts = await Promise.all(allChains.map(c => c.makeAccount()));

  const accountEntries = harden(
    /** @type {[string, OrchestrationAccount<any>][]} */ (
      chainNames.map((chainName, index) => [chainName, allAccounts[index]])
    ),
  );
  const publicTopicEntries = harden(
    /** @type {[string, ResolvedPublicTopic<unknown>][]} */ (
      await Promise.all(
        accountEntries.map(async ([name, account]) => {
          const { account: topicRecord } = await account.getPublicTopics();
          return [name, topicRecord];
        }),
      )
    ),
  );
  const portfolioHolder = makePortfolioHolder(
    accountEntries,
    publicTopicEntries,
  );

  return portfolioHolder.asContinuingOffer();
};

/**
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 * }} _privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
const contract = async (zcf, _privateArgs, zone, { orchestrate, vowTools }) => {
  const makePortfolioHolder = preparePortfolioHolder(
    zone.subZone('portfolio'),
    vowTools,
  );

  const makeOrchAccount = orchestrate(
    'makeOrchAccount',
    undefined,
    makeOrchAccountHandler,
  );

  const makePortfolioAccount = orchestrate(
    'makePortfolioAccount',
    makePortfolioHolder,
    makePortfolioAcctHandler,
  );

  const publicFacet = zone.exo(
    'Basic Flows Public Facet',
    M.interface('Basic Flows PF', {
      makeOrchAccountInvitation: M.callWhen().returns(InvitationShape),
      makePortfolioAccountInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeOrchAccountInvitation() {
        return zcf.makeInvitation(
          makeOrchAccount,
          'Make an Orchestration Account',
        );
      },
      makePortfolioAccountInvitation() {
        return zcf.makeInvitation(
          makePortfolioAccount,
          'Make an Orchestration Account',
        );
      },
    },
  );

  return { publicFacet };
};

export const start = withOrchestration(contract);

/** @typedef {typeof start} BasicFlowsSF */
