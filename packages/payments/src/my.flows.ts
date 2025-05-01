import type {
  ChainHub,
  CosmosChainInfo,
  OrchestrationAccount,
  OrchestrationFlow,
  Orchestrator,
} from '@agoric/orchestration';
import type { TargetApp } from '@agoric/vats/src/bridge-target.js';
import type { Passable } from '@endo/pass-style';
import type { GuestInterface, GuestOf } from '@agoric/async-flow';
import type { LocalOrchestrationAccountKit } from '@agoric/orchestration/src/exos/local-orchestration-account';
import type { Vow } from '@agoric/vow';
import { Fail } from '@endo/errors';
import { makeTracer } from '@agoric/internal';
import type { ZCFSeat } from '@agoric/zoe';


const trace = makeTracer('SwapAndSend');

export const makeHookAccount = (async (
  orch: Orchestrator,
  _ctx: unknown,
  tap: TargetApp & Passable,
) => {
  const agoricChain = await orch.getChain('agoric');
  const hookAccount =
    (await agoricChain.makeAccount()) as OrchestrationAccount<{
      chainId: 'agoric-any';
    }>;

  const registration = hookAccount.monitorTransfers(tap);
  console.warn('TODO: keep registration', registration);

  return hookAccount;
}) satisfies OrchestrationFlow;
harden(makeHookAccount);


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

type SendContext = {
  chainHub: GuestInterface<ChainHub>;
  localAccountHolder: Promise<
    GuestInterface<LocalOrchestrationAccountKit['holder']>
  >;
  log: GuestOf<(msg: string) => Vow<void>>;
  tools: { localTransfer, withdrawToSeat };
};

export const swapAndSend = async (
  orch: Orchestrator,
  ctx: SendContext,
  seat: ZCFSeat,
  {
    amount,
    denom,
    swapDenom,
    sender,
    receiver,
  }: {
    amount: bigint;
    denom: string;
    swapDenom: string;
    sender: string;
    receiver: string;
  },
) => {
  // FIXME: this is a placeholder
  console.log('swapAndSend', { amount, denom, swapDenom, sender, receiver });
  const { chainHub, localAccountHolder: localAccountHolderP, log, tools } = ctx;

  const sharedLocalAccount = await localAccountHolderP;

  const { give } = seat.getProposal();

   /**
   * Helper function to recover if IBC Transfer fails
   *
   * @param {Error} e
   */
  //  const recoverFailedTransfer = async e => {
  //   await withdrawToSeat(sharedLocalAccount, seat, give);
  //   const errorMsg = `IBC Transfer failed ${q(e)}`;
  //   void log(`ERROR: ${errorMsg}`);
  //   seat.fail(errorMsg);
  //   throw makeError(errorMsg);
  // };

  void log(`Initiating send: ${amount} ${denom} to ${receiver} on Osmosis`);

  const [_a, osmosisChainInfo, connection] =
    await chainHub.getChainsAndConnection('agoric', 'osmosis');

  connection.counterparty || Fail`No IBC connection to Osmosis`;
  const cosmosOsmosisChainInfo = osmosisChainInfo as CosmosChainInfo;
  void log(`got info for chain: osmosis ${cosmosOsmosisChainInfo.chainId}`);
  trace(cosmosOsmosisChainInfo);

  const offerArgs = {
    destAddr: receiver,
    receiverAddr: receiver,
    outDenom: swapDenom,
    slippage: {
      slippagePercentage: '1.0', // Default 1% slippage
      windowSeconds: 30, // Default 30 second window
    },
    onFailedDelivery: sender, // Return funds to sender if delivery fails
  };

 

  try {
    const memo = buildXCSMemo(offerArgs);
    trace(memo)

    await sharedLocalAccount.transfer(
      {
        value: receiver as `${string}1${string}`,
        encoding: 'bech32',
        chainId: /** @type {CosmosChainInfo} */ (cosmosOsmosisChainInfo).chainId,
      },
      { denom, value: amount },
      { memo },
    );
  } catch (e) {
  }




  const result = await Promise.resolve('FIXME: swapAndSend result');
  return result;
};
