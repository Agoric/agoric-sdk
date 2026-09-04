import { NonNullish, makeTracer } from '@agoric/internal';
import { makeError, q } from '@endo/errors';
import { M, mustMatch } from '@endo/patterns';

const trace = makeTracer('SwapAnything.Flow');

const { entries } = Object;

/**
 * @typedef {{
 *   destAddr: string;
 *   receiverAddr: string;
 *   outDenom: Denom;
 *   slippage: { slippagePercentage: string; windowSeconds: number };
 *   onFailedDelivery: string;
 *   fromAccount?: string;
 *   nextMemo?: string;
 * }} SwapInfo
 *
 * @import {GuestInterface, GuestOf} from '@agoric/async-flow';
 * @import {Denom} from '@agoric/orchestration';
 * @import {ZCFSeat} from '@agoric/zoe';
 * @import {Vow} from '@agoric/vow';
 * @import {LocalOrchestrationAccountKit} from '../exos/local-orchestration-account.js';
 * @import {ZoeTools} from '../utils/zoe-tools.js';
 * @import {Orchestrator, OrchestrationFlow, ChainHub, CosmosChainInfo, DenomAmount} from '../types.js';
 */

const denomForBrand = async (orch, brand) => {
  const agoric = await orch.getChain('agoric');
  const assets = await agoric.getVBankAssetInfo();
  const { denom } = NonNullish(
    assets.find(a => a.brand === brand),
    `${brand} not registered in ChainHub`,
  );
  return denom;
};

/**
 * @param {SwapInfo} swapInfo
 * @returns {string}
 */
const buildXCSMemo = swapInfo => {
  const memo = {
    wasm: {
      contract: swapInfo.destAddr,
      msg: {
        osmosis_swap: {
          output_denom: swapInfo.outDenom,
          slippage: {
            twap: {
              window_seconds: swapInfo.slippage.windowSeconds,
              slippage_percentage: swapInfo.slippage.slippagePercentage,
            },
          },
          receiver: swapInfo.receiverAddr,
          on_failed_delivery: swapInfo.onFailedDelivery,
          nextMemo: swapInfo.nextMemo,
        },
      },
    },
  };

  return JSON.stringify(memo);
};

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {GuestInterface<ChainHub>} ctx.chainHub
 * @param {Promise<GuestInterface<LocalOrchestrationAccountKit['holder']>>} ctx.sharedLocalAccountP
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {GuestOf<(msg: string, level?: string) => Vow<void>>} ctx.log
 * @param {ZCFSeat} seat
 * @param {SwapInfo} offerArgs
 */

// Ref: https://github.com/osmosis-labs/osmosis/tree/main/cosmwasm/contracts/crosschain-swaps#via-ibc
export const swapIt = async (
  orch,
  {
    chainHub,
    sharedLocalAccountP,
    log,
    zoeTools: { localTransfer, withdrawToSeat },
  },
  seat,
  offerArgs,
) => {
  mustMatch(
    offerArgs,
    M.splitRecord(
      {
        destAddr: M.string(),
        receiverAddr: M.string(),
        outDenom: M.string(),
        onFailedDelivery: M.string(),
        slippage: { slippagePercentage: M.string(), windowSeconds: M.number() },
      },
      { nextMemo: M.string() },
    ),
  );
  void log('Begin swapIt');

  const { receiverAddr, destAddr } = offerArgs;
  // NOTE the proposal shape ensures that the `give` is a single asset
  const { give } = seat.getProposal();
  const [[_kw, amt]] = entries(give);
  trace(`sending {${amt.value}} from osmosis to ${receiverAddr}`);
  const denom = await denomForBrand(orch, amt.brand);

  /**
   * @type {any} XXX methods returning vows
   *   https://github.com/Agoric/agoric-sdk/issues/9822
   */
  const sharedLocalAccount = await sharedLocalAccountP;

  /**
   * Helper function to recover if IBC Transfer fails
   *
   * @param {Error} e
   */
  const recoverFailedTransfer = async e => {
    await withdrawToSeat(sharedLocalAccount, seat, give);
    const errorMsg = `IBC Transfer failed ${q(e)}`;
    trace(`ERROR: ${errorMsg}`);
    void log(errorMsg, 'error');
    seat.fail(errorMsg);
    throw makeError(errorMsg);
  };

  const [_a, osmosisChainInfo, _connection] =
    await chainHub.getChainsAndConnection('agoric', 'osmosis');

  trace(`got info for chain: osmosis ${osmosisChainInfo}`);
  trace(osmosisChainInfo);

  await localTransfer(seat, sharedLocalAccount, give);
  trace(`completed transfer to localAccount`);

  try {
    const memo = buildXCSMemo(offerArgs);
    trace(memo);
    void log(`sending transfer with ${q(memo)}`);

    await sharedLocalAccount.transfer(
      {
        value: destAddr,
        encoding: 'bech32',
        chainId: /** @type {CosmosChainInfo} */ (osmosisChainInfo).chainId,
      },
      { denom, value: amt.value },
      { memo },
    );
    trace(`completed transfer to ${destAddr}`);
  } catch (e) {
    void log(`transfer error ${q(e)}`, 'error');
    return recoverFailedTransfer(e);
  }

  seat.exit();
  return 'transfer complete, seat exited';
};
harden(swapIt);

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} _orch
 * @param {object} ctx
 * @param {GuestInterface<ChainHub>} ctx.chainHub
 * @param {Promise<GuestInterface<LocalOrchestrationAccountKit['holder']>>} ctx.sharedLocalAccountP
 * @param {GuestOf<(msg: string, level?: string) => Vow<void>>} ctx.log
 * @param {DenomAmount} transferInfo
 * @param {SwapInfo} memoArgs
 */
export const swapAnythingViaHook = async (
  _orch,
  { chainHub, sharedLocalAccountP, log },
  { denom, value },
  memoArgs,
) => {
  mustMatch(
    memoArgs,
    M.splitRecord(
      {
        destAddr: M.string(),
        receiverAddr: M.string(),
        outDenom: M.string(),
        onFailedDelivery: M.string(),
        slippage: { slippagePercentage: M.string(), windowSeconds: M.number() },
        fromAccount: M.string(),
      },
      { nextMemo: M.string() },
    ),
  );

  /**
   * Helper function to recover if IBC Transfer fails
   *
   * @param {Error} e
   */
  const recoverFailedTransfer = async e => {
    const senderAccount = fromAccount?.split(':') ?? [];
    const [_chain, chainId, address] = senderAccount;
    await sharedLocalAccount.transfer(
      {
        value: address,
        encoding: 'bech32',
        chainId,
      },
      { denom, value },
    );

    const errorMsg = `IBC Transfer failed ${q(e)}`;
    trace(`ERROR: ${errorMsg}`);
    void log(errorMsg, 'error');
    throw makeError(errorMsg);
  };

  const { receiverAddr, destAddr, fromAccount } = memoArgs;
  trace(`sending {${value}} from osmosis to ${receiverAddr}`);

  /**
   * @type {any} XXX methods returning vows
   *   https://github.com/Agoric/agoric-sdk/issues/9822
   */
  const sharedLocalAccount = await sharedLocalAccountP;

  const [_a, osmosisChainInfo, _connection] =
    await chainHub.getChainsAndConnection('agoric', 'osmosis');

  trace(`got info for chain: osmosis ${osmosisChainInfo}`);
  trace(osmosisChainInfo);

  try {
    const memo = buildXCSMemo(memoArgs);

    await sharedLocalAccount.transfer(
      {
        value: destAddr,
        encoding: 'bech32',
        chainId: /** @type {CosmosChainInfo} */ (osmosisChainInfo).chainId,
      },
      { denom, value },
      { memo },
    );
    trace(`completed transfer to ${destAddr}`);
  } catch (e) {
    void log(`transfer error ${q(e)}`, 'error');
    return recoverFailedTransfer(e);
  }
};
harden(swapAnythingViaHook);
