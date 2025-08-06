import { makeTracer } from '@agoric/internal';
import { type Vow } from '@agoric/vow';
import type { Zone } from '@agoric/zone';
import type { MovementDesc, OfferArgsFor } from './type-guards-steps.ts';
import type { PortfolioKit } from './portfolio.exo.ts';

const iterfaceTODO = undefined;

const trace = makeTracer('PPLN');

export const preparePlanner = (
  zone: Zone,
  {
    rebalance,
    zcf,
    getPortfolio,
  }: {
    rebalance: (
      seat: ZCFSeat,
      offerArgs: OfferArgsFor['rebalance'],
      kit: unknown, // XXX avoid circular reference
    ) => Vow<any>; // XXX HostForGuest???
    zcf: ZCF;
    getPortfolio: (id: number) => PortfolioKit;
  },
) => {
  return zone.exoClass('Planner', iterfaceTODO, () => ({}), {
    submit(portfolioId: number, plan: MovementDesc[]): Vow<void> {
      trace('TODO: vet plan', { portfolioId, plan });
      const { zcfSeat: emptySeat } = zcf.makeEmptySeatKit();
      const pKit = getPortfolio(portfolioId);
      return rebalance(emptySeat, { flow: plan }, pKit);
    },
  });
};
