/**
 * @file Primarily a testing fixture, but also serves as an example of how to
 *   leverage basic functionality of the Orchestration API with async-flow.
 */
import { Fail } from '@endo/errors';
import { M, mustMatch } from '@endo/patterns';

/**
 * @import {DenomArg, OrchestrationAccount, OrchestrationFlow, Orchestrator} from '@agoric/orchestration';
 * @import {ResolvedPublicTopic} from '@agoric/zoe/src/contractSupport/topics.js';
 * @import {JsonSafe} from '@agoric/cosmic-proto';
 * @import {RequestQuery} from '@agoric/cosmic-proto/tendermint/abci/types.js';
 * @import {OrchestrationPowers} from '../utils/start-helper.js';
 * @import {MakePortfolioHolder} from '../exos/portfolio-holder-kit.js';
 * @import {OrchestrationTools} from '../utils/start-helper.js';
 */

/**
 * Create an OrchestrationAccount for a specific chain and return a continuing
 * offer with invitations makers for Delegate, WithdrawRewards, Transfer, etc.
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {any} _ctx
 * @param {ZCFSeat} seat
 * @param {{ chainName: string }} offerArgs
 */
export const makeOrchAccount = async (orch, _ctx, seat, { chainName }) => {
  seat.exit(); // no funds exchanged
  mustMatch(chainName, M.string());
  const remoteChain = await orch.getChain(chainName);
  const orchAccount = await remoteChain.makeAccount();
  return orchAccount.asContinuingOffer();
};
harden(makeOrchAccount);

/**
 * Create accounts on multiple chains and return them in a single continuing
 * offer with invitations makers for Delegate, WithdrawRewards, Transfer, etc.
 * Calls to the underlying invitationMakers are proxied through the
 * `MakeInvitation` invitation maker.
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {MakePortfolioHolder} ctx.makePortfolioHolder
 * @param {ZCFSeat} seat
 * @param {{ chainNames: string[] }} offerArgs
 */
export const makePortfolioAccount = async (
  orch,
  { makePortfolioHolder },
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
harden(makePortfolioAccount);

/**
 * Send a query and get the response back in an offer result. This invitation is
 * for testing only. In a real scenario it's better to use an RPC or API client
 * and vstorage to retrieve data for a frontend. Queries should only be
 * leveraged if contract logic requires it.
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {any} _ctx
 * @param {ZCFSeat} seat
 * @param {{ chainName: string; msgs: JsonSafe<RequestQuery>[] }} offerArgs
 */
export const sendQuery = async (orch, _ctx, seat, { chainName, msgs }) => {
  seat.exit(); // no funds exchanged
  mustMatch(chainName, M.string());
  if (chainName === 'agoric') throw Fail`ICQ not supported on local chain`;
  const remoteChain = await orch.getChain(chainName);
  const queryResponse = await remoteChain.query(msgs);
  console.debug('sendQuery response:', queryResponse);
  return queryResponse;
};
harden(sendQuery);

/**
 * Create an account and send a query and get the response back in an offer
 * result. Like `sendQuery`, this invitation is for testing only. In a real
 * scenario it doesn't make much sense to send a query immediately after the
 * account is created - it won't have any funds.
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {any} _ctx
 * @param {ZCFSeat} seat
 * @param {{ chainName: string; denom: DenomArg }} offerArgs
 */
export const makeAccountAndSendBalanceQuery = async (
  orch,
  _ctx,
  seat,
  { chainName, denom },
) => {
  seat.exit(); // no funds exchanged
  mustMatch(chainName, M.string());
  if (chainName === 'agoric') throw Fail`ICQ not supported on local chain`;
  const remoteChain = await orch.getChain(chainName);
  const orchAccount = await remoteChain.makeAccount();
  const queryResponse = await orchAccount.getBalance(denom);
  console.debug('getBalance response:', queryResponse);
  return queryResponse;
};
harden(makeAccountAndSendBalanceQuery);
