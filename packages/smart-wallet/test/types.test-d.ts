import {
  expectAssignable,
  expectNotAssignable,
  expectNotType,
  expectType,
} from 'tsd';

import type { CopyRecord, Passable } from '@endo/marshal';
import type { OfferSpec } from '../src/offers.js';

declare const offerSpec: OfferSpec;

// Check that offerSpec has the expected properties
expectType<OfferSpec>(offerSpec);
expectType<string>(offerSpec.id);
expectType<object>(offerSpec.invitationSpec);
expectType<object>(offerSpec.proposal);
expectNotType<undefined>(offerSpec.offerArgs);
expectNotType<undefined>(offerSpec.saveResult);

// XXX Argument of type 'ResultPlan | undefined' is not assignable to parameter of type 'Passable'.
//   Type 'ResultPlan' is not assignable to type 'Passable'.
//     Type 'ResultPlan' is not assignable to type 'CopyRecordInterface<PassableCap, Error>'.
//       Index signature for type 'string' is missing in type 'ResultPlan'.
expectNotAssignable<Passable>(offerSpec.saveResult);
// the work-around
expectAssignable<Passable>(offerSpec.saveResult as CopyRecord | undefined);
