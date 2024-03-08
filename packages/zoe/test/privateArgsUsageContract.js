import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

/** @type {ContractStartFn<undefined, {usePrivateArgs: unknown}>} */
const start = (_zcf, privateArgs) => {
  const creatorFacet = makeExo(
    'creatorFacet',
    M.interface('creatorFacet', {}, { defaultGuards: 'passable' }),
    {
      usePrivateArgs: () => E(privateArgs.myArg).doTest(),
    },
  );
  // @ts-expect-error missing publicFacet for ContractStartFn
  return harden({ creatorFacet });
};
harden(start);
export { start };
