import { makeCopyBag } from '@agoric/store';
import { fc } from '@fast-check/ava';

import { AmountMath as m } from '../src/index.js';
import { mockBrand } from './mockBrand.js';

// Perhaps makeCopyBag should coalesce duplicate labels, but for now, it does
// not.
const distinctLabels = pairs =>
  new Set(pairs.map(([label, _qty]) => label)).size === pairs.length;
const positiveCounts = pairs =>
  pairs.filter(([_l, qty]) => qty > 0n).length === pairs.length;
const arbBagContents = fc
  .nat(7)
  .chain(size =>
    fc.array(
      fc.tuple(fc.string(), fc.bigUint({ max: 1_000_000_000_000_000n })),
      { minLength: size, maxLength: size },
    ),
  )
  .filter(pairs => distinctLabels(pairs) && positiveCounts(pairs));

// TODO: should include many non-bag amounts too
export const arbAmount = arbBagContents.map(contents =>
  m.make(mockBrand, harden(makeCopyBag(contents))),
);
