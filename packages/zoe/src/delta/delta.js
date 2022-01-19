// @ts-check

import { makeScalarMapStore, fit } from '@agoric/store';
import {
  addToAllocation,
  subtractFromAllocation,
} from '../contractFacet/allocationMath.js';
import { AllocationDeltasShape } from './typeGuards.js';
import './types.js';

/**
 * @template S
 * @type {ApplyDeltas<S>}
 */
export const applyDeltas = (seatMgr, uncleanDeltas) => {
  const cleanDelta = udelta => {
    if ('add' in udelta) {
      const { seat, add } = udelta;
      return harden({ seat, add: seatMgr.cleanAllocation(add) });
    }
    const { seat, subtract } = udelta;
    return harden({ seat, subtract: seatMgr.cleanAllocation(subtract) });
  };

  fit(uncleanDeltas, AllocationDeltasShape);
  const deltas = uncleanDeltas.map(cleanDelta);
  /** @type {MapStore<S, Allocation>} */
  const allocationMap = makeScalarMapStore();
  const getAllocation = seat =>
    allocationMap.has(seat) ? allocationMap.get(seat) : harden({});

  // Do all the adds before the subtracts, so subtract only fails when
  // it should.
  for (const delta of deltas) {
    if ('add' in delta) {
      const { seat, add } = delta;
      allocationMap.set(seat, addToAllocation(getAllocation(seat), add));
    }
  }
  for (const delta of deltas) {
    if ('subtract' in delta) {
      const { seat, subtract } = delta;
      allocationMap.set(
        seat,
        subtractFromAllocation(getAllocation(seat), subtract),
      );
    }
  }
  return allocationMap.snapshot();
};
