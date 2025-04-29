import type {
  OrchestrationAccount,
  OrchestrationFlow,
  Orchestrator,
} from '@agoric/orchestration';
import type { TargetApp } from '@agoric/vats/src/bridge-target.js';
import type { Passable } from '@endo/pass-style';

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

export const swapAndSend = async (
  orch: Orchestrator,
  _ctx: unknown,
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
  throw Error('TODO: implement swapAndSend');
};
