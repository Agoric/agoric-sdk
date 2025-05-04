import type {
  ChainHub,
  CosmosChainInfo,
  OrchestrationAccount,
  OrchestrationFlow,
  Orchestrator,
  Denom,
} from '@agoric/orchestration';
import type { GuestInterface, GuestOf } from '@agoric/async-flow';
import type { LocalOrchestrationAccountKit } from '@agoric/orchestration/src/exos/local-orchestration-account';
import type { Vow } from '@agoric/vow';
import { Fail } from '@endo/errors';
import { makeTracer } from '@agoric/internal';
import type { TargetApp } from '@agoric/vats/src/bridge-target';

const trace = makeTracer('SwapAndSend');

type SwapInfo = {
  destAddr: string;
  receiverAddr: string;
  outDenom: Denom;
  slippage: { slippagePercentage: string; windowSeconds: number };
  onFailedDelivery: string;
  nextMemo?: string;
};

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
  tools: { localTransfer; withdrawToSeat };
};

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {SendContext} ctx
 * @param {amount: bigint; denom: string; swapDenom: string; sender: string; receiver: string} args
 */
export const swapAndSend = async (
  orch: Orchestrator,
  ctx: SendContext,
  {
    amount,
    denom,
    swapDenom,
    sender,
    receiver,
  }: {
    amount: bigint;
    denom: Denom;
    swapDenom: Denom;
    sender: string;
    receiver: string;
  },
) => {
  // FIXME: this is a placeholder
  console.log('swapAndSend', { amount, denom, swapDenom, sender, receiver });
  const {
    chainHub,
    localAccountHolder: localAccountHolderP,
    log,
    tools: _,
  } = ctx;

  const sharedLocalAccount = await localAccountHolderP;

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
      slippagePercentage: '1.0', // Default 1% slippage | Default Value as of now
      windowSeconds: 30, // Default 30 second window
    },
    onFailedDelivery: sender, // Return funds to sender if delivery fails
  } as SwapInfo;

  const memo = buildXCSMemo(offerArgs);
  trace(memo);

  await sharedLocalAccount.transfer(
    {
      value: receiver as `${string}1${string}`,
      encoding: 'bech32',
      chainId: /** @type {CosmosChainInfo} */ cosmosOsmosisChainInfo.chainId,
    },
    { denom, value: BigInt(amount) },
    { memo },
  );
  void log(`completed transfer to ${receiver}`);

  return 'Done';
};
