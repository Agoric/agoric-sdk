/**
 * @file Testing fixture for Local and Interchain Queries
 */
import { makeTracer } from '@agoric/internal';
import { Fail, q } from '@endo/errors';
import { M, mustMatch } from '@endo/patterns';

const trace = makeTracer('BasicFlows');

/**
 * @import {Chain, DenomArg, OrchestrationFlow, Orchestrator, ICQQueryFunction, CosmosChainInfo} from '@agoric/orchestration';
 * @import {QueryManyFn} from '@agoric/vats/src/localchain.js';
 */

/**
 * Send a query to a remote chain and get the response back in an offer result.
 * This invitation is for testing only. In a real scenario it's better to use an
 * RPC or API client and vstorage to retrieve data for a frontend. Queries
 * should only be leveraged if contract logic requires it.
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {any} _ctx
 * @param {ZCFSeat} seat
 * @param {{ chainName: string; msgs: Parameters<ICQQueryFunction>[0] }} offerArgs
 */
export const sendICQQuery = async (orch, _ctx, seat, { chainName, msgs }) => {
  seat.exit(); // no funds exchanged
  mustMatch(chainName, M.string());
  if (chainName === 'agoric') throw Fail`ICQ not supported on local chain`;
  const remoteChain =
    /** @type {Chain<CosmosChainInfo & { icqEnabled: true }>} */ (
      await orch.getChain(chainName)
    );
  const queryResponse = await remoteChain.query(msgs);
  trace('SendICQQuery response:', queryResponse);
  // `quote` to ensure offerResult (array) is visible in smart-wallet
  return q(queryResponse).toString();
};
harden(sendICQQuery);

/**
 * Create an account, send a balance query, and get the response back in an
 * offer result. Like `sendQuery`, this invitation is for testing only. In a
 * real scenario it doesn't make much sense to send a query immediately after
 * the account is created - it won't have any funds.
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {any} _ctx
 * @param {ZCFSeat} seat
 * @param {{ chainName: string; denom: DenomArg }} offerArgs
 */
export const makeAccountAndGetBalanceQuery = async (
  orch,
  _ctx,
  seat,
  { chainName, denom },
) => {
  seat.exit(); // no funds exchanged
  mustMatch(chainName, M.string());
  const chain = await orch.getChain(chainName);
  const orchAccount = await chain.makeAccount();
  const queryResponse = await orchAccount.getBalance(denom);
  trace('Balance Query response:', queryResponse);
  // `quote` to ensure offerResult (record) is visible in smart-wallet
  return q(queryResponse).toString();
};
harden(makeAccountAndGetBalanceQuery);

/**
 * Create an account, send an all balances query, and get the response back in
 * an offer result. Like `sendQuery`, this invitation is for testing only. In a
 * real scenario it doesn't make much sense to send a query immediately after
 * the account is created - it won't have any funds.
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {any} _ctx
 * @param {ZCFSeat} seat
 * @param {{ chainName: string }} offerArgs
 */
export const makeAccountAndGetBalancesQuery = async (
  orch,
  _ctx,
  seat,
  { chainName },
) => {
  seat.exit(); // no funds exchanged
  mustMatch(chainName, M.string());
  const chain = await orch.getChain(chainName);
  const orchAccount = await chain.makeAccount();
  const queryResponse = await orchAccount.getBalances();
  trace('All Balances Query response:', queryResponse);
  // `quote` to ensure offerResult (record) is visible in smart-wallet
  return q(queryResponse).toString();
};
harden(makeAccountAndGetBalancesQuery);

/**
 * Send a query to the local chain and get the response back in an offer result.
 * This invitation is for testing only. In a real scenario it's better to use an
 * RPC or API client and vstorage to retrieve data for a frontend. Queries
 * should only be leveraged if contract logic requires it.
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {any} _ctx
 * @param {ZCFSeat} seat
 * @param {{
 *   msgs: Parameters<QueryManyFn>[0];
 * }} offerArgs
 */
export const sendLocalQuery = async (orch, _ctx, seat, { msgs }) => {
  seat.exit(); // no funds exchanged
  const remoteChain = await orch.getChain('agoric');
  const queryResponse = await remoteChain.query(msgs);
  trace('Local Query response:', queryResponse);
  // `quote` to ensure offerResult (array) is visible in smart-wallet
  return q(queryResponse).toString();
};
harden(sendLocalQuery);
