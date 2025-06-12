import { makeTracer } from '@agoric/internal';
import {
  registerChainsAndAssets,
  withOrchestration,
  type ChainInfo,
  type Denom,
  type DenomDetail,
  type OrchestrationAccount,
  type OrchestrationPowers,
  type OrchestrationTools,
} from '@agoric/orchestration';
import type { ZCF } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import type { Zone } from '@agoric/zone';
import { meta } from './portfolio.contract.meta.ts';
import { preparePortfolioKit } from './portfolio.exo.ts';
import * as flows from './portfolio.flows.ts';
import { makeProposalShapes } from './type-guards.ts';

const trace = makeTracer('PortC');

const interfaceTODO = undefined;

export { meta };

export const contract = async (
  zcf: ZCF,
  privateArgs: OrchestrationPowers & {
    assetInfo: [Denom, DenomDetail & { brandKey?: string }][];
    chainInfo: Record<string, ChainInfo>;
    marshaller: Marshaller;
  },
  zone: Zone,
  tools: OrchestrationTools,
) => {
  const { brands } = zcf.getTerms();
  const { orchestrateAll, zoeTools, chainHub } = tools;

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

  const makePortfolioKit = preparePortfolioKit(zone, zcf);
  const { makeLocalAccount, openPortfolio } = orchestrateAll(flows, {
    zoeTools,
    makePortfolioKit,
    inertSubscriber,
   });

  trace('TODO: baggage test');
  const localV = zone.makeOnce('localV', _ => makeLocalAccount());

  const publicFacet = zone.exo('PortfolioPub', interfaceTODO, {
    makeOpenPortfolioInvitation() {
      trace('makeOpenPortfolioInvitation');
      return zcf.makeInvitation(
        (seat, offerArgs) =>
          openPortfolio(
            seat,
            offerArgs,
            localV as unknown as Promise<
              OrchestrationAccount<{ chainId: 'agoric-any' }>
            >,
          ),
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
