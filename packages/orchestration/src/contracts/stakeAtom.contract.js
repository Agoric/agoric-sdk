// @ts-check
/**
 * @file Stake ATOM contract
 *
 */

import { makeTracer } from '@agoric/internal';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { V as E } from '@agoric/vat-data/vow.js';

const trace = makeTracer('StakeAtom');

/**
 *
 * @param {ZCF<{ hostConnectionId: string, controllerConnectionId: string }>} zcf
 * @param {{
 *   orchestration: import('@agoric/vats/src/orchestration').Orchestration;
 * }} privateArgs
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { hostConnectionId, controllerConnectionId } = zcf.getTerms();
  const { orchestration } = privateArgs;

  const zone = makeDurableZone(baggage);

  const publicFacet = zone.exo('StakeAtom', undefined, {
    /**
     * @param {Port} [port] if the user has a bound port and wants to reuse it
     */
    async provideAccount(port) {
      trace(`provideAccount. ${port ? 'Reusing port' : 'Binding new port'}`);
      return E(orchestration).provideAccount(
        hostConnectionId,
        controllerConnectionId,
        port,
      );
    },
  });

  return { publicFacet };
};
