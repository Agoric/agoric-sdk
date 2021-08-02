// @ts-check

import { makeMetaTagged } from '@agoric/marshal';

export const M = harden({
  any: () => makeMetaTagged('match:any', undefined),
  style: keyStyle => makeMetaTagged('match:keyStyle', keyStyle),
  and: (...patts) => makeMetaTagged('match:and', patts),
  or: (...patts) => makeMetaTagged('match:or', patts),
  gte: rightSide => makeMetaTagged('match:gte', rightSide),
  lte: rightSide => makeMetaTagged('match:lte', rightSide),
});
