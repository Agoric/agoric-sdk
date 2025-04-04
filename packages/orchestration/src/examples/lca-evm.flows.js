// @ts-check
import { Fail } from '@endo/errors';
import { denomHash } from '../utils/denomHash.js';

/**
 * @import {GuestInterface, GuestOf} from '@agoric/async-flow';
 * @import {Orchestrator, OrchestrationFlow} from '@agoric/orchestration';
 * @import {MakeEvmAccountKit} from './evm-account-kit.js';
 * @import {MakePortfolioHolder} from '../../src/exos/portfolio-holder-kit.js';
 * @import {ChainHub} from '../../src/exos/chain-hub.js';
 * @import {Vow} from '@agoric/vow';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeEvmAccountKit: MakeEvmAccountKit;
 *   makePortfolioHolder: MakePortfolioHolder;
 *   chainHub: GuestInterface<ChainHub>;
 *   log: GuestOf<(msg: string) => Vow<void>>;
 * }} ctx
 * @param {ZCFSeat} seat
 */
export const createAndMonitorLCA = async (
  orch,
  { log, makeEvmAccountKit, chainHub },
  seat,
) => {
  void log('Inside createAndMonitorLCA');
  const [agoric, remoteChain] = await Promise.all([
    orch.getChain('agoric'),
    orch.getChain('axelar'),
  ]);
  const { chainId, stakingTokens } = await remoteChain.getChainInfo();
  const remoteDenom = stakingTokens[0].denom;
  remoteDenom || Fail`${chainId} does not have stakingTokens in config`;

  const localAccount = await agoric.makeAccount();
  void log('localAccount created successfully');
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
  const assets = await agoric.getVBankAssetInfo();
  const info = await remoteChain.getChainInfo();
  const evmAccountKit = makeEvmAccountKit({
    localAccount,
    localChainAddress,
    sourceChannel: transferChannel.counterPartyChannelId,
    remoteDenom,
    localDenom,
    assets,
    remoteChainInfo: info,
  });
  void log('tap created successfully');
  // XXX consider storing appRegistration, so we can .revoke() or .updateTargetApp()
  // @ts-expect-error tap.receiveUpcall: 'Vow<void> | undefined' not assignable to 'Promise<any>'
  await localAccount.monitorTransfers(evmAccountKit.tap);
  void log('Monitoring transfers setup successfully');

  seat.exit();
  return harden({ invitationMakers: evmAccountKit.invitationMakers });
};
harden(createAndMonitorLCA);
