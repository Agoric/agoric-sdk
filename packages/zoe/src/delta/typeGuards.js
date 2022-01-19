// @ts-check

import { M } from '@agoric/store';
import { AmountKeywordRecordShape } from '../typeGuards';

export const AllocationIncrShape = harden({
  seat: M.remotable(),
  add: AmountKeywordRecordShape,
});

export const AllocationDecrShape = harden({
  seat: M.remotable(),
  subtract: AmountKeywordRecordShape,
});

export const AllocationDeltaShape = M.or(
  AllocationIncrShape,
  AllocationDecrShape,
);

export const AllocationDeltasShape = M.arrayOf(AllocationDeltaShape);
