import { E } from '@endo/far';
import type { StartedInstanceKit } from './utils.js';

const someContractStartFn = (
  zcf: ZCF,
  privateArgs: { someNumber: number; someString: string },
) => ({});

type PsmInstanceKit = StartedInstanceKit<typeof someContractStartFn>;

const psmInstanceKit: PsmInstanceKit = null as any;

// @ts-expect-error missing privateArgs argument
void E(psmInstanceKit.adminFacet).restartContract();

const partial = {
  someNumber: 1,
};
// @ts-expect-error missing member of privateArgs argument
void E(psmInstanceKit.adminFacet).restartContract(partial);

// valid privateArgs now with 'marshaller'
void E(psmInstanceKit.adminFacet).restartContract({
  ...partial,
  someString: 'str',
});

// @ts-expect-error missing member of privateArgs argument
void E(psmInstanceKit.adminFacet).upgradeContract('whatever', partial);
// valid privateArgs now with 'marshaller'
void E(psmInstanceKit.adminFacet).upgradeContract('whatever', {
  ...partial,
  someString: 'str',
});
