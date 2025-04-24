/** @file contract to pass a capability to an admin */
import { makeTracer } from '@agoric/internal';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { M } from '@endo/patterns';

const trace = makeTracer('WFun2');

const meta = {
  privateArgsShape: { prize: M.record() },
};
harden(meta);

/**
 * @template {Record<string, unknown>} P
 * @param {ZCF} zcf
 * @param {{ prize: P }} privateArgs
 * @param {import("@agoric/swingset-liveslots").Baggage} baggage
 */
export const start = (zcf, { prize }, baggage) => {
  const zone = makeDurableZone(baggage);
  const creatorFacet = zone.exo(
    'cf',
    M.interface('cf', {
      makeInvitation: M.callWhen().returns(M.remotable('Invitation')),
    }),
    {
      makeInvitation() {
        return zcf.makeInvitation(
          seat => {
            trace('admin invitation handler');
            seat.exit();
            zcf.shutdown();
            return prize;
          },
          'admin',
          undefined,
          harden(M.splitRecord({ give: {}, want: {} })),
        );
      },
    },
  );
  return { creatorFacet };
};
harden(start);
