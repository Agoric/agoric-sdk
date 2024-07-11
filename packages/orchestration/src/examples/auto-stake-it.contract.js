import {
  EmptyProposalShape,
  InvitationShape,
} from '@agoric/zoe/src/typeGuards.js';
import { Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import { withOrchestration } from '../utils/start-helper.js';
import { prepareChainHubAdmin } from '../exos/chain-hub-admin.js';
import { prepareStakingTap } from './auto-stake-it-tap-kit.js';
import { preparePortfolioHolder } from '../exos/portfolio-holder-kit.js';

/**
 * @import {TimerService} from '@agoric/time';
 * @import {ResolvedPublicTopic} from '@agoric/zoe/src/contractSupport/topics.js';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {NameHub} from '@agoric/vats';
 * @import {Remote} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {CosmosValidatorAddress, Orchestrator, CosmosInterchainService, Denom, OrchestrationAccount, StakingAccountActions} from '@agoric/orchestration';
 * @import {MakeStakingTap} from './auto-stake-it-tap-kit.js';
 * @import {MakePortfolioHolder} from '../exos/portfolio-holder-kit.js';
 * @import {ChainHub} from '../exos/chain-hub.js';
 * @import {OrchestrationTools} from '../utils/start-helper.js';
 */

/**
 * @typedef {{
 *   localchain: Remote<LocalChain>;
 *   orchestrationService: Remote<CosmosInterchainService>;
 *   storageNode: Remote<StorageNode>;
 *   timerService: Remote<TimerService>;
 *   agoricNames: Remote<NameHub>;
 * }} OrchestrationPowers
 */

/**
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
 *   localDenom: Denom;
 * }} offerArgs
 */
const makeAccountsHandler = async (
  orch,
  { makeStakingTap, makePortfolioHolder, chainHub },
  seat,
  {
    chainName,
    validator,
    // TODO localDenom is user supplied, until #9211
    localDenom,
  },
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

/**
 * AutoStakeIt allows users to to create an auto-forwarding address that
 * transfers and stakes tokens on a remote chain when received.
 *
 * To be wrapped with `withOrchestration`.
 *
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 * }} _privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
const contract = async (
  zcf,
  _privateArgs,
  zone,
  { chainHub, orchestrate, vowTools },
) => {
  const makeStakingTap = prepareStakingTap(
    zone.subZone('stakingTap'),
    vowTools,
  );
  const makePortfolioHolder = preparePortfolioHolder(
    zone.subZone('portfolio'),
    vowTools,
  );

  const makeAccounts = orchestrate(
    'makeAccounts',
    { makeStakingTap, makePortfolioHolder, chainHub },
    makeAccountsHandler,
  );

  const publicFacet = zone.exo(
    'AutoStakeIt Public Facet',
    M.interface('AutoStakeIt Public Facet', {
      makeAccountsInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeAccountsInvitation() {
        return zcf.makeInvitation(
          makeAccounts,
          'Make Accounts',
          undefined,
          EmptyProposalShape,
        );
      },
    },
  );

  const creatorFacet = prepareChainHubAdmin(zone, chainHub);

  return { publicFacet, creatorFacet };
};

export const start = withOrchestration(contract);

/** @typedef {typeof start} AutoStakeItSF */
