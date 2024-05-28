/* eslint-disable @jessie.js/safe-await-separator */
/**
 * @file uses .ts syntax to be able to declare types (e.g. of kit.creatorFacet
 *   as {}) because "there is no JavaScript syntax for passing a a type
 *   argument"
 *   https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
 */

/// <reference path="../src/core/types-ambient.d.ts" />

import type { start as assetReserveStart } from '@agoric/inter-protocol/src/reserve/assetReserve.js';
import { expectNotType, expectType } from 'tsd';

import type { Instance } from '@agoric/zoe/src/zoeService/utils.js';

const mock = null as any;

const spaces: WellKnownSpaces = mock;

expectType<Instance<typeof assetReserveStart>>(
  await spaces.instance.consume.reserve,
);
expectType<Instance<typeof assetReserveStart>>(
  // @ts-expect-error to check against `any` Instance
  await spaces.instance.consume.provisionPool,
);
expectNotType<Instance<typeof assetReserveStart>>(
  await spaces.instance.consume.provisionPool,
);
