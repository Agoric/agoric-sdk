/**
 * @import {Orchestrator, OrchestrationFlow, ChainAddress} from '@agoric/orchestration'
 * @import {TargetApp} from '@agoric/vats/src/bridge-target'
 * @import {Passable} from '@endo/pass-style'
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {unknown} _ctx
 * @param {TargetApp & Passable} tap
 */
export const makeHookAccount = async (orch, _ctx, tap) => {
  const agoricChain = await orch.getChain('agoric');
  const hookAccount = await agoricChain.makeAccount();

  const registration = hookAccount.monitorTransfers(tap);
  console.warn('TODO: keep registration', registration);

  return hookAccount;
};
harden(makeHookAccount);

const destinationDomain = 0;
/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {unknown} _ctx
 * @param {ChainAddress['value']} from
 * @param {{ denom: string; amount: string }} howMuch
 * @param {import('@agoric/cosmic-proto/address-hooks.js').HookQuery} hookStuff
 */
export const sendToEth = async (
  orch,
  _ctx,
  from,
  { denom, amount },
  hookStuff,
) => {
  console.log('@@@', { denom, amount });

  assert.equal(denom, 'uusdc');

  const msg = {
    typeUrl: '/circle.cctp.v1.MsgDepositForBurn',
    value: {
      from,
      amount,
      destinationDomain: domains.ethereum,
      mintRecipient: mintRecipientBytes,
      burnToken: denom,
    },
  };

  throw Error('IOU');
};
