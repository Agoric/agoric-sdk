import { Fail } from '@endo/errors';
import { denomHash } from '@agoric/orchestration/src/utils/denomHash.js';

/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {Orchestrator, OrchestrationFlow} from '@agoric/orchestration';
 * @import {MakeEvmTap} from './evm-tap-kit.js';
 * @import {MakePortfolioHolder} from '@agoric/orchestration/src/exos/portfolio-holder-kit.js';
 * @import {ChainHub} from '@agoric/orchestration/src/exos/chain-hub.js';
 */

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
