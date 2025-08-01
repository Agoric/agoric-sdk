import type { Zone } from '@agoric/zone';
import type { MovementDesc } from './type-guards-steps.ts';
import { makeTracer } from '@agoric/internal';

const iterfaceTODO = undefined;

const trace = makeTracer('PPLN');

export const preparePlanner = (zone: Zone) => {
  return zone.exoClass('Planner', iterfaceTODO, () => ({}), {
    submit(portfolioId: number, plan: MovementDesc[]) {
      trace({ portfolioId, plan });
    },
  });
};
