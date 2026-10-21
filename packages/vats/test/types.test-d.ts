/**
 * @file uses .ts syntax to be able to declare types (e.g. of kit.creatorFacet
 *   as {}) because "there is no JavaScript syntax for passing a a type
 *   argument"
 *   https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
 */

import { expectNotType, expectType } from 'tsd';

import type { Instance } from '@agoric/zoe/src/zoeService/utils.js';
import type { start as provisionPoolStart } from '../src/provisionPool.js';
import type { WellKnownSpaces } from '../src/core/types.js';

const mock = null as any;

const spaces: WellKnownSpaces = mock;

expectType<Instance<typeof provisionPoolStart>>(
  await spaces.instance.consume.provisionPool,
);
expectType<Instance<typeof provisionPoolStart>>(
  // @ts-expect-error to check against `any` Instance
  await spaces.instance.consume.walletFactory,
);
expectNotType<Instance<typeof provisionPoolStart>>(
  await spaces.instance.consume.walletFactory,
);
