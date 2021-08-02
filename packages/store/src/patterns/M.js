// @ts-check

import { makeTagged } from '@agoric/marshal';

export const M = harden({
  any: () => makeTagged('match:any', undefined),
  kind: keyKind => makeTagged('match:kind', keyKind),
  and: (...patts) => makeTagged('match:and', patts),
  or: (...patts) => makeTagged('match:or', patts),
  gte: rightSide => makeTagged('match:gte', rightSide),
  lte: rightSide => makeTagged('match:lte', rightSide),
});
