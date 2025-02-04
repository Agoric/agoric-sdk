import { Fail } from '@endo/errors';
import { denomHash } from '../utils/denomHash.js';

/**
 * @import {ResolvedPublicTopic} from '@agoric/zoe/src/contractSupport/topics.js';
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {CosmosValidatorAddress, Orchestrator, CosmosInterchainService, Denom, OrchestrationAccount, StakingAccountActions, OrchestrationFlow} from '@agoric/orchestration';
 * @import {MakeStrideStakingTap} from './elys-contract-tap-kit.js';
 * @import {MakePortfolioHolder} from '../exos/portfolio-holder-kit.js';
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
 * }} offerArgs
 */
export const makeICAHookAccounts = async (
  orch,
  { makeStrideStakingTap, chainHub },
  { chainNames },
) => {

  const allRemoteChains = await Promise.all(
    chainNames.map(n => orch.getChain(n)),
  );
  const [agoric] = await Promise.all([orch.getChain('agoric')]);
  const agoricChainId = (await agoric.getChainInfo()).chainId;
  const [localAccount] = await Promise.all([agoric.makeAccount()]);
  const [localChainAddress] = await Promise.all([localAccount.getAddress()]);

  // stride ICA
  const [stride] = await Promise.all([orch.getChain('stride')]);
  const strideChainId = (await stride.getChainInfo()).chainId;
  const [strideICAAccount] = await Promise.all([stride.makeAccount()]);
  const [strideICAChainAddress] = await Promise.all([strideICAAccount.getAddress()]);
  
  // Elys ICA
  const [elys] = await Promise.all([orch.getChain('elys')]);
  const elysChainId = (await elys.getChainInfo()).chainId;
  const [elysICAAccount] = await Promise.all([elys.makeAccount()]);
  const [elysICAChainAddress] = await Promise.all([elysICAAccount.getAddress()]);

  const supportedHostChains = new Map()
  // all remote chains supported for the auto-staking
  for (const remoteChain of allRemoteChains) {

    const { chainId, stakingTokens } = await remoteChain.getChainInfo();
    const remoteDenom = stakingTokens[0].denom;
    remoteDenom ||
      Fail`${chainId || chainId} does not have stakingTokens in config`;

    const [remoteICAAccount] = await Promise.all([remoteChain.makeAccount()]);
    const [remoteChainICAAddress] = await Promise.all([
      remoteICAAccount.getAddress(),
    ]);
    // get the connection info between agoric and remote chain
    const { transferChannel } = await chainHub.getConnectionInfo(
      agoricChainId,
      chainId,
    );

    const localDenom = `ibc/${denomHash({ denom: remoteDenom, channelId: transferChannel.channelId })}`;
    const hostChainName = hostChainChainIdToNameMap.get(chainId)
    hostChainName || Fail`${chainId} does not have a mapping to host chain name`;

    const hostChainInfo = {
      sourceChannel: transferChannel.counterPartyChannelId,
      remoteDenom,
      localDenom,
      hostChainName,
      remoteICAAccount,
      remoteChainICAAddress
    }
    supportedHostChains.set(hostChainInfo.sourceChannel, hostChainInfo)
  }

  // Every time the `localAccount` receives remoteDenom from any of the host chains over IBC
  // it will auto delegate to the stride and send the st token to the elys ICA account
  const tap = makeStrideStakingTap({
    localAccount,
    strideICAAccount,
    elysICAAccount, // TODO: update fetched chain json for elys
    localChainAddress,
    strideICAChainAddress,
    elysICAChainAddress,
    supportedHostChains
  });

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