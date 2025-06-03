import { makeTracer } from '@agoric/internal';
import {
  OrchestrationPowersShape,
  withOrchestration,
  type OrchestrationTools,
} from '@agoric/orchestration';
import type { ZCF } from '@agoric/zoe';
import type { Zone } from '@agoric/zone';
import type { CopyRecord } from '@endo/pass-style';
import { M } from '@endo/patterns';
import * as flows from './portfolio.flows.ts';
import { makeNatAmountShape } from './type-guards.ts';

const trace = makeTracer('PortC');

const interfaceTODO = undefined;

export const meta = M.splitRecord({
  privateArgsShape: {
    ...(OrchestrationPowersShape as CopyRecord),
    marshaller: M.remotable('marshaller'),
  },
});
harden(meta);

export const contract = async (
  zcf: ZCF,
  _privateArgs,
  zone: Zone,
  tools: OrchestrationTools,
) => {
  const { brands } = zcf.getTerms();
  const { orchestrateAll } = tools;
  const { openPortfolio } = orchestrateAll(flows, {});

  assert(brands.USDC, 'USDC missing from brands in terms');
  const proposalShapes = {
    openPortfolio: M.splitRecord({
      give: { In: makeNatAmountShape(brands.USDC) },
    }),
  };

  const publicFacet = zone.exo('PortfolioPub', interfaceTODO, {
    makeOpenPortfolioInvitation() {
      trace('makeOpenPortfolioInvitation');
      return zcf.makeInvitation(
        openPortfolio,
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
