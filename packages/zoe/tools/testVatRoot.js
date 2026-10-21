import { makeBuildRootObject } from '../src/contractFacet/buildRootObject.js';
import { makeZCFZygote } from '../src/contractFacet/zcfZygote.js';

// Tests can use a source-level vat root directly instead of re-evaluating the
// bundled ZCF vat code through fakeVatAdmin on every createVat().
export const buildTestRootObject = makeBuildRootObject(makeZCFZygote);
harden(buildTestRootObject);
