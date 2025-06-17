import { makeTracer, mustMatch, type TypedPattern } from '@agoric/internal';
import {
  ChainInfoShape,
  DenomDetailShape,
  OrchestrationPowersShape,
  registerChainsAndAssets,
  withOrchestration,
  type ChainInfo,
  type Denom,
  type DenomDetail,
  type OrchestrationPowers,
  type OrchestrationTools,
} from '@agoric/orchestration';
import type { ZCF } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import type { Zone } from '@agoric/zone';
import type { CopyRecord } from '@endo/pass-style';
import { M } from '@endo/patterns';
<<<<<<< HEAD
import { preparePortfolioKit } from './portfolio.exo.ts';
=======
import { TimerServiceShape } from '@agoric/time';
import { preparePortfolioKit, type LocalAccount } from './portfolio.exo.ts';
>>>>>>> d7daaa4b04 (chore: use timeService to add wait() in flows)
import * as flows from './portfolio.flows.ts';
import {
  EVMContractAddressesShape,
  makeProposalShapes,
  OfferArgsShapeFor,
  type EVMContractAddresses,
} from './type-guards.ts';

const { keys } = Object;
const trace = makeTracer('PortC');

const interfaceTODO = undefined;

<<<<<<< HEAD
type PortfolioPrivateArgs = OrchestrationPowers & {
  assetInfo: [Denom, DenomDetail & { brandKey?: string }][];
  chainInfo: Record<string, ChainInfo>;
  marshaller: Marshaller;
  contract: EVMContractAddresses;
=======
const privateArgsShape = {
  ...(OrchestrationPowersShape as CopyRecord),
  marshaller: M.remotable('marshaller'),
  contractAddresses: M.splitRecord({
    aavePool: M.string(),
    compound: M.string(),
    factory: M.string(),
    usdc: M.string(),
  }),
  axelarChainsMap: M.recordOf(
    M.or(...keys(AxelarChains)),
    M.splitRecord({
      caip: M.string(),
      // Axelar chain Ids differ between mainnet and testnet environments.
      // Reference: https://github.com/axelarnetwork/axelarjs-sdk/blob/f84c8a21ad9685091002e24cac7001ed1cdac774/src/chains/supported-chains-list.ts
      axelarId: M.string(),
    }),
  ),
  timer: TimerServiceShape,
  chainInfo: M.recordOf(M.string(), ChainInfoShape),
  assetInfo: M.arrayOf([M.string(), DenomDetailShape]),
  // TODO: remove once we deploy package pr is merged
  poolMetricsNode: M.remotable(),
>>>>>>> d7daaa4b04 (chore: use timeService to add wait() in flows)
};

const privateArgsShape: TypedPattern<PortfolioPrivateArgs> = {
  ...(OrchestrationPowersShape as CopyRecord),
  marshaller: M.remotable('marshaller'),
  contract: EVMContractAddressesShape,
  chainInfo: M.recordOf(M.string(), ChainInfoShape),
  assetInfo: M.arrayOf([M.string(), DenomDetailShape]),
};

export const meta = {
  privateArgsShape,
};
harden(meta);

export const contract = async (
  zcf: ZCF,
  privateArgs: PortfolioPrivateArgs,
  zone: Zone,
  tools: OrchestrationTools,
) => {
  const { chainInfo, assetInfo, contractAddresses, axelarChainsMap, timer } =
    privateArgs;
  const { brands } = zcf.getTerms();
  const { orchestrateAll, zoeTools, chainHub, vowTools } = tools;

  assert(brands.USDC, 'USDC missing from brands in terms');

  // TODO: only on 1st incarnation
  registerChainsAndAssets(chainHub, brands, chainInfo, assetInfo, {
    log: trace,
  });

  const proposalShapes = makeProposalShapes(brands.USDC);

  const inertSubscriber: ResolvedPublicTopic<never>['subscriber'] = {
    getUpdateSince() {
      assert.fail('use off-chain queries');
    },
    subscribeAfter() {
      assert.fail('use off-chain queries');
    },
  };

  // UNTIL #11309
  const chainHubTools = {
    getDenom: chainHub.getDenom.bind(chainHub),
  };
  const { rebalance } = orchestrateAll(
    { rebalance: flows.rebalance },
    {
      zoeTools,
      chainHubTools,
      contract: privateArgs.contract,
    },
  );

  const makePortfolioKit = preparePortfolioKit(zone, {
    zcf,
<<<<<<< HEAD
    vowTools,
    rebalance,
    proposalShapes,
=======
    axelarChainsMap,
    timer,
    vowTools,
  });
  const { makeLocalAccount, openPortfolio } = orchestrateAll(flows, {
    zoeTools,
    makePortfolioKit,
    axelarChainsMap,
    contractAddresses,
    chainHub,
    inertSubscriber,
>>>>>>> d7daaa4b04 (chore: use timeService to add wait() in flows)
  });
  const { openPortfolio } = orchestrateAll(
    { openPortfolio: flows.openPortfolio },
    {
      zoeTools,
      makePortfolioKit: makePortfolioKit as any, // XXX Guest...
      chainHubTools,
      contract: privateArgs.contract,
      inertSubscriber,
    },
  );

  trace('TODO: baggage test');

  const publicFacet = zone.exo('PortfolioPub', interfaceTODO, {
    makeOpenPortfolioInvitation() {
      trace('makeOpenPortfolioInvitation');
      return zcf.makeInvitation(
        (seat, offerArgs) => {
          mustMatch(offerArgs, OfferArgsShapeFor.openPortfolio);
          return openPortfolio(seat, offerArgs);
        },
        'openPortfolio',
        undefined,
        proposalShapes.openPortfolio,
      );
    },
  });

  return { publicFacet };
};
harden(contract);

export const start = withOrchestration(contract);
harden(start);
