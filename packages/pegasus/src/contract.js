// @ts-check
import { prepareVowTools } from '@agoric/vow/vat.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { makePegasus } from './pegasus.js';

/**
 * @import {Remote} from '@agoric/vow';
 * @import {ContractStartFn} from '@agoric/zoe';
 * @import {Pegasus} from './pegasus.js';
 * @import {NameHub} from '@agoric/vats';
 * @import {BoardDepositFacet} from './types.js';
 */

export const start =
  /**
   * @type {ContractStartFn<Pegasus, never, {}, {
   *   board: Remote<BoardDepositFacet>,
   *   namesByAddress: Remote<NameHub>
   * }>}
   */
  (
    /** @type {unknown} */ (
      (zcf, privateArgs, baggage) => {
        const zone = makeDurableZone(baggage);

        const whenZone = zone.subZone('when');
        const { when } = prepareVowTools(whenZone);

        const { board, namesByAddress } = privateArgs;

        // start requires that the object passed in must be durable. Given that we
        // haven't made pegasus durable yet, we'll wrap its non-durable methods within
        // an exo object to workaround this requirement.
        // @ts-expect-error makePegasus returns a remotable object
        const publicFacet = zone.exo('PublicFacet', undefined, {
          ...makePegasus({ zcf, board, namesByAddress, when }),
        });

        return harden({
          publicFacet,
        });
      }
    )
  );
harden(start);
