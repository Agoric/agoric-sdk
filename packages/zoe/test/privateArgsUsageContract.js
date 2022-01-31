// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

/** @type {ContractStartFn} */
const start = (_zcf, privateArgs) => {
  const creatorFacet = Far('creatorFacet', {
    usePrivateArgs: () => E(privateArgs.myArg).doTest(),
  });
  return harden({ creatorFacet });
};
harden(start);
export { start };
