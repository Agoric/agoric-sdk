/**
 * @file uses .ts syntax to be able to declare types (e.g. of kit.creatorFacet
 *   as {}) because "there is no JavaScript syntax for passing a a type
 *   argument"
 *   https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
 */

import { expectNotType, expectType } from 'tsd';

import type { WellKnownSpaces } from '../src/core/types.js';

const mock = null as any;

const spaces: WellKnownSpaces = mock;

type ReserveInstance = Awaited<
  WellKnownSpaces['instance']['consume']['reserve']
>;
type ProvisionPoolInstance = Awaited<
  WellKnownSpaces['instance']['consume']['provisionPool']
>;

expectType<ReserveInstance>(await spaces.instance.consume.reserve);
expectType<never>(
  // @ts-expect-error keep check that reserve/provisionPool are not identical
  await spaces.instance.consume.provisionPool,
);
expectNotType<ReserveInstance & ProvisionPoolInstance>(
  await spaces.instance.consume.provisionPool,
);
