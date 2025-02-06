import { Fail } from '@endo/errors';
import { denomHash } from '../utils/denomHash.js';

/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {Orchestrator, OrchestrationFlow} from '@agoric/orchestration';
 * @import {MakeStrideStakingTap, SupportedHostChainShape} from './elys-contract-tap-kit.js';
 * @import {ChainHub} from '../exos/chain-hub.js';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeStrideStakingTap: MakeStrideStakingTap;
 *   chainHub: GuestInterface<ChainHub>;
 * }} ctx
 * @param {{
 *   chainNames: string[];
 *  supportedHostChains: MapStore<any, any>
 * }} offerArgs
 */
export const makeICAHookAccounts = async (
  orch,
  { makeStrideStakingTap, chainHub },
  { chainNames,supportedHostChains },
) => {

  const allRemoteChains = await Promise.all(
    chainNames.map(n => orch.getChain(n)),
  );
  const agoric = await orch.getChain('agoric');
  const { chainId: agoricChainId } = await agoric.getChainInfo();
  const localAccount = await agoric.makeAccount();
  const localChainAddress = await localAccount.getAddress();

  // stride ICA
  const stride = await orch.getChain('stride');
  const { chainId: strideChainId } = await stride.getChainInfo();
  const strideICAAccount = await stride.makeAccount();
  const strideICAChainAddress = await strideICAAccount.getAddress();
  
  // Elys ICA
  const elys = await orch.getChain('elys');
  const { chainId: elysChainId } = await elys.getChainInfo();
  const elysICAAccount = await elys.makeAccount();
  const elysICAChainAddress = await elysICAAccount.getAddress();

  // all remote chains supported for the auto-staking
  for (const remoteChain of allRemoteChains) {
    
    const { chainId, stakingTokens } = await remoteChain.getChainInfo();
    if (!stakingTokens || stakingTokens.length === 0) {
      throw new Error(`${chainId} does not have stakingTokens in config`);
    }
    
    const remoteDenom = stakingTokens[0].denom;
    remoteDenom ||
      Fail`${chainId || chainId} does not have stakingTokens in config`;
      const remoteICAAccount = await remoteChain.makeAccount();
      const remoteChainICAAddress = await remoteICAAccount.getAddress();
    // get the connection info between agoric and remote chain
    const { transferChannel } = await chainHub.getConnectionInfo(
      agoricChainId,
      chainId,
    );

    const localDenom = `ibc/${denomHash({ denom: remoteDenom, channelId: transferChannel.channelId })}`;
    const hostChainName = hostChainChainIdToNameMap.get(chainId)
    hostChainName || Fail`${chainId} does not have a mapping to host chain name`;

    /** @type {SupportedHostChainShape} */
    const hostChainInfo = {
      sourceChannel: transferChannel.counterPartyChannelId,
      remoteDenom: remoteDenom,
      localDenom: localDenom,
      hostChainName: hostChainName ?? '', // never undefined
      hostAccountICA: remoteICAAccount,
      hostChainAddressICA: remoteChainICAAddress,
    };
    supportedHostChains.init(hostChainInfo.sourceChannel, hostChainInfo)
  } 
  // const passablesupportedHostChains = makeCopyMap(supportedHostChains)
  // Every time the `localAccount` receives remoteDenom from any of the host chains over IBC
  // it will auto delegate to the stride and send the st token to the elys ICA account
  const tap = makeStrideStakingTap({
    localAccount,
    strideICAAccount,
    elysICAAccount,
    localChainAddress,
    strideICAChainAddress,
    elysICAChainAddress,
    supportedHostChains
  });

  // @ts-expect-error tap.receiveUpcall: 'Vow<void> | undefined' not assignable to 'Promise<any>'
  await localAccount.monitorTransfers(tap);

  return localAccount;
};
harden(makeICAHookAccounts);

const hostChainChainIdToNameMap = new Map([
  ['cosmoshub-4', 'cosmoshub'],
  ['osmosis-1', 'osmosis'],
  ['agoric-1', 'agoric'],
  ['elys-1', 'elys'],
  ['stride-1', 'stride'],
]);

harden(hostChainChainIdToNameMap)