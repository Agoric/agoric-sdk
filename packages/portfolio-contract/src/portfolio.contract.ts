import { makeTracer } from '@agoric/internal';
import {
  OrchestrationPowersShape,
  withOrchestration,
  type OrchestrationAccount,
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
  const { orchestrateAll, zoeTools } = tools;

  assert(brands.USDC, 'USDC missing from brands in terms');
  const proposalShapes = {
    openPortfolio: M.splitRecord({
      give: { In: makeNatAmountShape(brands.USDC) },
    }),
  };

  const { makeLocalAccount, openPortfolio } = orchestrateAll(flows, {
    zoeTools,
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
