import {
  makeTracer,
  mustMatch,
  type Remote,
  type TypedPattern,
} from '@agoric/internal';
import type {
  Marshaller,
  StorageNode,
} from '@agoric/internal/src/lib-chainStorage.js';
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
import { E } from '@endo/far';
import type { CopyRecord } from '@endo/pass-style';
import { M } from '@endo/patterns';
import type { HostInterface } from '../../async-flow/src/types.ts';
import { preparePortfolioKit, type PortfolioKit } from './portfolio.exo.ts';
import * as flows from './portfolio.flows.ts';
import {
  AxelarChainsMapShape,
  makeProposalShapes,
  OfferArgsShapeFor,
  type AxelarChainsMap,
  type LocalAccount,
  type NobleAccount,
} from './type-guards.ts';

const trace = makeTracer('PortC');

const interfaceTODO = undefined;

type PortfolioPrivateArgs = OrchestrationPowers & {
  assetInfo: [Denom, DenomDetail & { brandKey?: string }][];
  chainInfo: Record<string, ChainInfo>;
  marshaller: Marshaller;
  storageNode: Remote<StorageNode>;
  axelarChainsMap: AxelarChainsMap;
};

const privateArgsShape: TypedPattern<PortfolioPrivateArgs> = {
  ...(OrchestrationPowersShape as CopyRecord),
  marshaller: M.remotable('marshaller'),
  storageNode: M.remotable('storageNode'),
  chainInfo: M.recordOf(M.string(), ChainInfoShape),
  assetInfo: M.arrayOf([M.string(), DenomDetailShape]),
  axelarChainsMap: AxelarChainsMapShape,
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
  const {
    chainInfo,
    assetInfo,
    axelarChainsMap,
    timerService,
    marshaller,
    storageNode,
  } = privateArgs;
  const { brands } = zcf.getTerms();
  const { orchestrateAll, zoeTools, chainHub, vowTools } = tools;

  assert(brands.BLD, 'BLD missing from brands in terms');

  // TODO: only on 1st incarnation
  registerChainsAndAssets(chainHub, brands, chainInfo, assetInfo, {
    log: trace,
  });

  const proposalShapes = makeProposalShapes(brands.BLD);

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
  const ctx1 = {
    zoeTools,
    chainHubTools,
    axelarChainsMap,
  };
  const { rebalance } = orchestrateAll({ rebalance: flows.rebalance }, ctx1);

  const makePortfolioKit = preparePortfolioKit(zone, {
    zcf,
    vowTools,
    rebalance,
    proposalShapes,
    axelarChainsMap,
    timer: timerService,
    portfoliosNode: E(storageNode).makeChildNode('portfolios'),
    marshaller,
    usdcBrand: brands.BLD,
  });

  const portfolios = zone.mapStore<number, PortfolioKit>('portfolios');
  const { openPortfolio } = orchestrateAll(
    { openPortfolio: flows.openPortfolio },
    {
      ...ctx1,
      makePortfolioKit: (() => {
        const portfolioId = portfolios.getSize();
        const it = makePortfolioKit({ portfolioId });
        portfolios.init(portfolioId, it);
        return it;
      }) as any, // XXX Guest...
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
