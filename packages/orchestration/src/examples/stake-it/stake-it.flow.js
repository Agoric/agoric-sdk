import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { Fail } from '@endo/errors';
import { heapVowE } from '@agoric/vow/vat.js';
import { M } from '@endo/patterns';
import { provideOrchestration } from '../../utils/start-helper.js';
import { prepareChainHubCreatorFacet } from '../shared/chain-hub-cf.js';
import { prepareMakeStakingTap } from './staking-tap-kit.js';
import { preparePortfolioHolder } from './portfolio-holder-kit.js';

/**
 * GOAL:
 *
 * 1. User invokes offer to have StakeAtom contract create a localchain account
 *    1.a. Then user has a localchain Cosmos account
 * 2. User IBC transfers ATOM (IBC Hub-Agoric) into their Agoric localchain account
 *    2.a. StakeAtom-held localchain account receives assets 2.b. Memo field
 *    indicates invoking StakeAtom hook
 * 3. StakeAtom creates ICA on Cosmos Hub
 * 4. StakeAtom triggers IBC send of ATOM to Cosmos Hub ICA a. MsgTransfer with a
 *    memo indicating the Contract for acknowledgement b. Localchain’s
 *    MsgTransfer sends via the transfer App
 * 5. StakeAtom receives ack it has completed
 * 6. StakeAtom triggers delegation to a Cosmos Hub validator
 */

/**
 * @import {Baggage} from '@agoric/vat-data';
 * @import {TimerService} from '@agoric/time';
 * @import {PublicTopic} from '@agoric/zoe/src/contractSupport/topics.js';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {NameHub} from '@agoric/vats';
 * @import {Remote} from '@agoric/vow';
 * @import {CosmosValidatorAddress, Orchestrator, OrchestrationService, Denom, OrchestrationAccount} from '@agoric/orchestration';
 * @import {MakeStakingTap} from './staking-tap-kit.js';
 * @import {MakePortfolioHolder} from './portfolio-holder-kit.js';
 */

/**
 * @typedef {{
 *   localchain: Remote<LocalChain>;
 *   orchestrationService: Remote<OrchestrationService>;
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
  { makeStakingTap, makePortfolioHolder },
  seat,
  { chainName, validator, localDenom },
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
    remoteChain.makeAccount(),
  ]);

  // Every time the `localAccount` receives ATOM over IBC, delegate it.
  const tap = makeStakingTap({
    localAccount,
    stakingAccount,
    validator,
    remoteDenom,
    // TODO user supplied, until #9211
    localDenom,
  });

  // @ts-expect-error LCA should have .monitorTransfers() method #9212
  await heapVowE(localAccount).monitorTransfers(tap);

  const accountEntries = /** @type {[string, OrchestrationAccount<any>][]} */ ([
    ['agoric', localAccount],
    [chainName, stakingAccount],
  ]);
  const publicTopics = await Promise.all(
    accountEntries.map(async ([name, account]) => {
      const { account: topicRecord } =
        // @ts-expect-error getPublicTopics does not exist on OrchestrationAccountI
        await heapVowE(account).getPublicTopics();
      return /** @type {[string, PublicTopic<unknown>]} */ ([
        name,
        topicRecord,
      ]);
    }),
  );
  debugger;
  const publicTopicsRecord = Object.fromEntries(publicTopics);
  const portfolioHolder = makePortfolioHolder(
    accountEntries,
    publicTopicsRecord,
  );
  console.log('@@@portfolioHolder', portfolioHolder);
  //  FIXME RangeError: Expected "promise" is same as "object".. from storagePath?
  const continuingOffer = portfolioHolder.asContinuingOffer();
  console.log('@@@continuingOffer', continuingOffer);
  return continuingOffer;
};

/**
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 * }} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { chainHub, orchestrate, vowTools, zone } = provideOrchestration(
    zcf,
    baggage,
    privateArgs,
    privateArgs.marshaller,
  );
  const makeCreatorFacet = prepareChainHubCreatorFacet(zone, chainHub);
  const makeStakingTap = prepareMakeStakingTap(
    zone.subZone('stakingTap'),
    vowTools,
  );
  const makePortfolioHolder = preparePortfolioHolder(
    zone.subZone('portfolio'),
    vowTools,
  );

  /** @type {OfferHandler} */
  const makeAccounts = orchestrate(
    'makeAccounts',
    { makeStakingTap, makePortfolioHolder },
    makeAccountsHandler,
  );

  const publicFacet = zone.exo(
    'StakeIt Public Facet',
    M.interface('StakeIt Public Facet', {
      makeAccountsInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeAccountsInvitation() {
        // TODO proposalShape guard
        return zcf.makeInvitation(makeAccounts, 'Make Accounts');
      },
    },
  );

  const creatorFacet = makeCreatorFacet();

  return { publicFacet, creatorFacet };
};
