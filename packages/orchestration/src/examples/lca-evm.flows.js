// @ts-check
import { Fail } from '@endo/errors';
import { denomHash } from '../utils/denomHash.js';
import { ethers } from 'ethers';

/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {Orchestrator, OrchestrationFlow} from '@agoric/orchestration';
 * @import {MakeEvmTap} from './evm-tap-kit';
 * @import {MakePortfolioHolder} from '../../src/exos/portfolio-holder-kit.js';
 * @import {ChainHub} from '../../src/exos/chain-hub.js';
 */

const test = () => {
  const abiCoder = ethers.utils.defaultAbiCoder;

  const message = 'Hello, Blockchain!';
  const sourceChain = 'Ethereum';
  const sourceAddress = '0x0830c9d8f05D1dcAE3406102420C29bBb287C199';
  const payload = abiCoder.encode(['string'], ['fraz']);

  const payload2 = abiCoder.encode(
    ['string', 'string', 'bytes'],
    [sourceChain, sourceAddress, payload],
  );
  console.log('Encoded payload2:', payload2);

  const payload3 = abiCoder.encode(
    ['string', 'string[]', 'string[]', 'bytes'],
    [
      'receive_message_evm',
      ['source_chain', 'source_address', 'payload'],
      ['string', 'string', 'bytes'],
      payload2,
    ],
  );
  console.log('Encoded payload3:', payload3);
};

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeEvmTap: MakeEvmTap;
 *   makePortfolioHolder: MakePortfolioHolder;
 *   chainHub: GuestInterface<ChainHub>;
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {{
 *   chainName: string;
 * }} offerArgs
 */
export const createAndMonitorLCA = async (
  orch,
  { makeEvmTap, chainHub },
  seat,
  { chainName },
) => {
  seat.exit(); // no funds exchanged
  const [agoric, remoteChain] = await Promise.all([
    orch.getChain('agoric'),
    orch.getChain(chainName),
  ]);
  test();
  const { chainId, stakingTokens } = await remoteChain.getChainInfo();
  const remoteDenom = stakingTokens[0].denom;
  remoteDenom ||
    Fail`${chainId || chainName} does not have stakingTokens in config`;

  const localAccount = await agoric.makeAccount();
  const localChainAddress = await localAccount.getAddress();
  console.log('Local Chain Address:', localChainAddress);

  const agoricChainId = (await agoric.getChainInfo()).chainId;
  const { transferChannel } = await chainHub.getConnectionInfo(
    agoricChainId,
    chainId,
  );
  assert(transferChannel.counterPartyChannelId, 'unable to find sourceChannel');

  const localDenom = `ibc/${denomHash({
    denom: remoteDenom,
    channelId: transferChannel.channelId,
  })}`;

  // Every time the `localAccount` receives `remoteDenom` over IBC, delegate it.
  const tap = makeEvmTap({
    localAccount,
    localChainAddress,
    sourceChannel: transferChannel.counterPartyChannelId,
    remoteDenom,
    localDenom,
  });
  // XXX consider storing appRegistration, so we can .revoke() or .updateTargetApp()
  // @ts-expect-error tap.receiveUpcall: 'Vow<void> | undefined' not assignable to 'Promise<any>'
  await localAccount.monitorTransfers(tap);

  return localChainAddress.value;
};
harden(createAndMonitorLCA);
