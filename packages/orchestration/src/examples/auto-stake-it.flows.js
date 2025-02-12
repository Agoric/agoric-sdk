import { makeTracer } from '@agoric/internal';
import { atob } from '@endo/base64';
import { Fail } from '@endo/errors';
import { denomHash } from '../utils/denomHash.js';

const trace = makeTracer('AutoStakeItFlows');

/**
 * @import {ResolvedPublicTopic} from '@agoric/zoe/src/contractSupport/topics.js';
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {VTransferIBCEvent} from '@agoric/vats';
 * @import {CosmosValidatorAddress, Orchestrator, OrchestrationAccount, StakingAccountActions, OrchestrationFlow} from '@agoric/orchestration';
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {Guarded} from '@endo/exo';
 * @import {Passable} from '@endo/marshal';
 * @import {MakePortfolioHolder} from '../exos/portfolio-holder-kit.js';
 * @import {ChainHub} from '../exos/chain-hub.js';
 * @import {StakingTapState} from './auto-stake-it.contract.js';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeStakingTap: (
 *     initialState: StakingTapState,
 *   ) => Guarded<{ receiveUpcall: (event: VTransferIBCEvent) => void }>;
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
    config: {
      validator,
      localChainAddress,
      remoteChainAddress,
      sourceChannel: transferChannel.counterPartyChannelId,
      remoteDenom,
      localDenom,
    },
  });
  // XXX consider storing appRegistration, so we can .revoke() or .updateTargetApp()
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

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {StakingTapState['localAccount']} localAccount
 * @param {StakingTapState['stakingAccount']} stakingAccount
 * @param {StakingTapState['config']} config
 * @param {VTransferIBCEvent & Passable} event
 */
export const autoStake = async (
  orch,
  ctx,
  localAccount,
  stakingAccount,
  config,
  event,
) => {
  // ignore packets from unknown channels
  if (event.packet.source_channel !== config.sourceChannel) {
    return;
  }
  const tx = /** @type {FungibleTokenPacketData} */ (
    JSON.parse(atob(event.packet.data))
  );
  trace('receiveUpcall packet data', tx);
  const { remoteDenom, localChainAddress } = config;
  // ignore outgoing transfers
  if (tx.receiver !== localChainAddress.value) {
    return;
  }
  // only interested in transfers of `remoteDenom`
  if (tx.denom !== remoteDenom) {
    return;
  }

  const { localDenom, remoteChainAddress, validator } = config;

  await localAccount.transfer(remoteChainAddress, {
    denom: localDenom,
    value: BigInt(tx.amount),
  });

  await stakingAccount.delegate(validator, {
    denom: remoteDenom,
    value: BigInt(tx.amount),
  });
};
harden(autoStake);
