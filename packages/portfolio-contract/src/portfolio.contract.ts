import { makeTracer } from '@agoric/internal';
import {
  withOrchestration,
  type OrchestrationAccount,
  type OrchestrationTools,
} from '@agoric/orchestration';
import type { ZCF } from '@agoric/zoe';
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
  _privateArgs,
  zone: Zone,
  tools: OrchestrationTools,
) => {
  const { brands } = zcf.getTerms();
  const { orchestrateAll, zoeTools } = tools;

  assert(brands.USDC, 'USDC missing from brands in terms');

  const proposalShapes = makeProposalShapes(brands.USDC);

  const makePortfolioKit = preparePortfolioKit(zone);
  const { makeLocalAccount, openPortfolio } = orchestrateAll(flows, {
    zoeTools,
    makePortfolioKit,
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
