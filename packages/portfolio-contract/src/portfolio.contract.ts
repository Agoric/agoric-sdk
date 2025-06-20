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
import { preparePortfolioKit } from './portfolio.exo.ts';
import * as flows from './portfolio.flows.ts';
import {
  EVMContractAddressesShape,
  makeProposalShapes,
  OfferArgsShapeFor,
  type EVMContractAddresses,
} from './type-guards.ts';

const trace = makeTracer('PortC');

const interfaceTODO = undefined;

type PortfolioPrivateArgs = OrchestrationPowers & {
  assetInfo: [Denom, DenomDetail & { brandKey?: string }][];
  chainInfo: Record<string, ChainInfo>;
  marshaller: Marshaller;
  contract: EVMContractAddresses;
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
  const { brands } = zcf.getTerms();
  const { orchestrateAll, zoeTools, chainHub, vowTools } = tools;

  assert(brands.USDC, 'USDC missing from brands in terms');

  // TODO: only on 1st incarnation
  registerChainsAndAssets(
    chainHub,
    brands,
    privateArgs.chainInfo,
    privateArgs.assetInfo,
    { log: trace },
  );

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
    vowTools,
    rebalance,
    proposalShapes,
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
