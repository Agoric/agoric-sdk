// This entire package is now deprecated, with its code migrated
// to `@endo/marshal` and `@agoric/store` with the exports renamed to their
// modern names.
//
// This package remains for now in order to
// re-export the new names from `@endo/marshal` and `@agoric/store` under
// the old deprecated names that this package used to export. Please update
// uses to the new names as imported from `@endo/marshal`
// and`@agoric/store`.

import { keyEQ, isKey, assertKey } from '@agoric/store';
import { deeplyFulfilled } from '@endo/marshal';

/** @deprecated Use `keyEQ` from `'@agoric/store'` */
export const sameStructure = keyEQ;

/** @deprecated Use `isKey` from `'@agoric/store'` */
export const isComparable = isKey;

/** @deprecated Use `assertKey` from `'@agoric/store'` */
export const mustBeComparable = assertKey;

/** @deprecated Use `deeplyFulfilled` from `'@endo/marshal'` */
export const allComparable = deeplyFulfilled;
