/**
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {AgoricChainMethods, ChainAddress, IcaAccountMethods, LocalAccountMethods, Orchestrator, OrchestrationFlow, OrchestrationAccount} from '@agoric/orchestration'
 * @import {TargetApp} from '@agoric/vats/src/bridge-target'
 * @import {CopyRecord, Passable} from '@endo/pass-style'
 */

import { Nat } from '@endo/nat';
import { decodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';

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

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {unknown} _ctx
 */
export const makeNobleAccount = async (orch, _ctx) => {
  const chainNoble = await orch.getChain('noble');
  const nobleAccount = await chainNoble.makeAccount();
  return nobleAccount;
};

/**
 * @typedef {CopyRecord & {
 *   hook: OrchestrationAccount<any> & LocalAccountMethods;
 *   noble: OrchestrationAccount<any> & IcaAccountMethods;
 * }} Accounts
 */

/**
 * cf. CCTP docs https://developers.circle.com/stablecoins/supported-domains
 */
const domains = {
  ethereum: 0,
  solana: 5,
};

// Left pad the mint recipient address with 0's to 32 bytes
const frobEthThingy = rawMintRecipient => {
  const cleanedMintRecipient = rawMintRecipient.replace(/^0x/, '');
  const zeroesNeeded = 64 - cleanedMintRecipient.length;
  const mintRecipient = '0'.repeat(zeroesNeeded) + cleanedMintRecipient;
  const buffer = Buffer.from(mintRecipient, 'hex');
  return new Uint8Array(buffer);
};

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {unknown} _ctx
 * @param {import('@agoric/vats').VTransferIBCEvent & Passable} event
 * @param {Accounts} accounts
 */
export const sendToEth = async (orch, _ctx, event, accounts) => {
  const { packet } = event;
  // IOU: if (packet.source_channel !== sourceChannel)

  const tx = /** @type {FungibleTokenPacketData} */ (
    JSON.parse(atob(packet.data))
  );
  console.log('@@@@tx', tx);

  const { amount, denom: denom } = tx;
  assert.equal(denom, 'uusdc');

  const hookAcct = await accounts.hook;
  const nobleAcct = await accounts.noble;
  const nobleAddr = await nobleAcct.getAddress();
  await hookAcct.transfer(nobleAddr, {
    denom: denom,
    value: Nat(BigInt(amount)),
  });
  const { value: from } = await hookAcct.getAddress();

  const { query } = decodeAddressHook(tx.receiver);
  const { dest } = query;
  assert.typeof(dest, 'string');

  // TODO: fees?!?!

  // register mapping from chainlist (eth is 1) to domain (eth is 0) in chainHub
  const ethChainAddr = { ethChainId: 1, address: frobEthThingy(dest) };
  nobleAcct.depositForBurn({ amount, denom }, ethChainAddr);

  const msg = {
    typeUrl: '/circle.cctp.v1.MsgDepositForBurn',
    value: {
      from,
      amount,
      destinationDomain: domains.ethereum,
      mintRecipient: frobEthThingy(dest),
      burnToken: denom,
    },
  };

  throw Error('IOU');
};

const ethChainId = '1';

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {unknown} _ctx
 * @param {import('@agoric/vats').VTransferIBCEvent & Passable} event
 * @param {Accounts} accounts
 */
export const sendToEthNiceLevel2 = async (orch, _ctx, event, accounts) => {
  const hookAcct = await accounts.hook;

  const { packet } = event;
  0;
  const tx = /** @type {FungibleTokenPacketData} */ (
    JSON.parse(atob(packet.data))
  );
  console.log('@@@@tx', tx);

  // this contract pays CCTP fees

  const { amount, denom: denom } = tx;
  await hookAcct.transfer(
    { chainId: ethChainId, value: '0xDEADBEEF...', encoding: 'ethereum' },
    { amount, denom },
  );

  // if USDC (ibc/...), decide based on dest ChainAddress whether to use CCTP
  // fees: CCTP is presumably cheaper than some other IBC route
};
