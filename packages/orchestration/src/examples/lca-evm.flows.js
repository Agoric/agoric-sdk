// @ts-check
import { Fail } from '@endo/errors';
import { denomHash } from '../utils/denomHash.js';
import { Far } from '@endo/far';
import { prepareEVMTransactionKit } from './evm-transaction-kit.js';

/**
 * @import {GuestInterface, GuestOf} from '@agoric/async-flow';
 * @import {Orchestrator, OrchestrationFlow} from '@agoric/orchestration';
 * @import {MakeEvmTap} from './evm-tap-kit';
 * @import {MakePortfolioHolder} from '../../src/exos/portfolio-holder-kit.js';
 * @import {ChainHub} from '../../src/exos/chain-hub.js';
 * @import {Vow} from '@agoric/vow';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeEvmTap: MakeEvmTap;
 *   makePortfolioHolder: MakePortfolioHolder;
 *   chainHub: GuestInterface<ChainHub>;
 *   log: GuestOf<(msg: string) => Vow<void>>;
 *   baggage: import('@agoric/vat-data').Baggage;
 *   zcf: { ZCF };
 * }} ctx
 * @param {ZCFSeat} seat
 */
export const createAndMonitorLCA = async (
  orch,
  { log, makeEvmTap, chainHub, baggage, zcf },
  seat,
) => {
  log('Inside createAndMonitorLCA');
  const [agoric, remoteChain] = await Promise.all([
    orch.getChain('agoric'),
    orch.getChain('axelar'),
  ]);
  const { chainId, stakingTokens } = await remoteChain.getChainInfo();
  const remoteDenom = stakingTokens[0].denom;
  remoteDenom || Fail`${chainId} does not have stakingTokens in config`;

  const localAccount = await agoric.makeAccount();
  log('localAccount created successfully');
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
  log('tap created successfully');
  // XXX consider storing appRegistration, so we can .revoke() or .updateTargetApp()
  // @ts-expect-error tap.receiveUpcall: 'Vow<void> | undefined' not assignable to 'Promise<any>'
  await localAccount.monitorTransfers(tap);
  log('Monitoring transfers setup successfully');

  const makeEVMTransactionKit = prepareEVMTransactionKit(
    baggage,
    { zcf },
    { city: 'PAK' },
  );

  seat.exit();
  return makeEVMTransactionKit();
};
harden(createAndMonitorLCA);
