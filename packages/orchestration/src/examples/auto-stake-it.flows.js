import { Fail } from '@endo/errors';
import { denomHash } from '../utils/denomHash.js';

/**
 * @import {ResolvedPublicTopic} from '@agoric/zoe/src/contractSupport/topics.js';
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {CosmosValidatorAddress, Orchestrator, CosmosInterchainService, Denom, OrchestrationAccount, StakingAccountActions, OrchestrationFlow} from '@agoric/orchestration';
 * @import {MakeStakingTap} from './auto-stake-it-tap-kit.js';
 * @import {MakePortfolioHolder} from '../exos/portfolio-holder-kit.js';
 * @import {ChainHub} from '../exos/chain-hub.js';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeStakingTap: MakeStakingTap;
 *   makePortfolioHolder: MakePortfolioHolder;
 *   chainHub: GuestInterface<ChainHub>;
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {{
 *   chainName: string;
 *   validator: CosmosValidatorAddress;
 * }} offerArgs
 */
export const makeAccounts = async (
  orch,
  { makeStakingTap, makePortfolioHolder, chainHub },
  seat,
  { chainName, validator },
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
  if (chainId !== validator.chainId) {
    Fail`validator chainId ${validator.chainId} does not match remote chainId ${chainId}`;
  }
  const [localAccount, stakingAccount] = await Promise.all([
    agoric.makeAccount(),
    /** @type {Promise<OrchestrationAccount<any> & StakingAccountActions>} */ (
      remoteChain.makeAccount()
    ),
  ]);

  const [localChainAddress, remoteChainAddress] = await Promise.all([
    localAccount.getAddress(),
    stakingAccount.getAddress(),
  ]);
  const agoricChainId = (await agoric.getChainInfo()).chainId;
  const { transferChannel } = await chainHub.getConnectionInfo(
    agoricChainId,
    chainId,
  );
  assert(transferChannel.counterPartyChannelId, 'unable to find sourceChannel');

  const localDenom = `ibc/${denomHash({ denom: remoteDenom, channelId: transferChannel.channelId })}`;

  // Every time the `localAccount` receives `remoteDenom` over IBC, delegate it.
  const tap = makeStakingTap({
    localAccount,
    stakingAccount,
    validator,
    localChainAddress,
    remoteChainAddress,
    sourceChannel: transferChannel.counterPartyChannelId,
    remoteDenom,
    localDenom,
  });
  // XXX consider storing appRegistration, so we can .revoke() or .updateTargetApp()
  // @ts-expect-error tap.receiveUpcall: 'Vow<void> | undefined' not assignable to 'Promise<any>'
  await localAccount.monitorTransfers(tap);

  const accountEntries = harden(
    /** @type {[string, OrchestrationAccount<any>][]} */ ([
      ['agoric', localAccount],
      [chainName, stakingAccount],
    ]),
  );
  const publicTopicEntries = harden(
    /** @type {[string, ResolvedPublicTopic<unknown>][]} */ (
      await Promise.all(
        accountEntries.map(async ([name, account]) => {
          const { account: topicRecord } = await account.getPublicTopics();
          return [name, topicRecord];
        }),
      )
    ),
  );
  const portfolioHolder = makePortfolioHolder(
    accountEntries,
    publicTopicEntries,
  );
  return portfolioHolder.asContinuingOffer();
};
harden(makeAccounts);
