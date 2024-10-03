import {
  startLife,
  test as avaTest,
} from '@agoric/swingset-vat/tools/prepare-strict-test-env-ava.js';

import { environmentOptionsListHas } from '@endo/env-options';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareTestAsyncFlowTools } from './_utils.js';

/**
 * @import {ExecutionContext, SerialFn, TodoFn} from 'ava'
 * @import {Zone} from '@agoric/base-zone'
 */

export * from '@agoric/swingset-vat/tools/prepare-strict-test-env-ava.js';

export const asyncFlowVerbose = () => {
  // TODO figure out how we really want to control this.
  return environmentOptionsListHas('DEBUG', 'async-flow-verbose');
};

/**
 * @typedef {{ zone: Zone; } & ReturnType<typeof prepareTestAsyncFlowTools>} AsyncLifeTools
 */

/**
 * @typedef {Parameters<typeof startLife>[2] & {
 *   panicHandler?: import('./_utils.js').TestAsyncFlowPanicHandler;
 * }} StartAsyncLifeOptions
 */

/**
 * @template {any} RT
 * @param {ExecutionContext} t
 * @param {(tools: AsyncLifeTools) => RT} build
 * @param {(tools: Awaited<RT>) => Promise<void> | void} [run]
 * @param {StartAsyncLifeOptions} [options]
 */
export const startAsyncLife = async (
  t,
  build,
  run,
  { panicHandler, ...startOptions } = {},
) =>
  startLife(
    async baggage => {
      const rootZone = makeDurableZone(baggage, 'durableRoot');
      const asyncFlowTools = prepareTestAsyncFlowTools(
        t,
        rootZone.subZone('admin'),
        { panicHandler },
      );
      const tools = await build({
        zone: rootZone.subZone('contract'),
        ...asyncFlowTools,
      });
      return tools;
    },
    run,
    startOptions,
  );

/**
 * @param {SerialFn} test
 */
const makeTestAsyncLifeFn =
  test =>
  /**
   * @template {any} RT
   * @param {string} title
   * @param {(t: ExecutionContext, tools: AsyncLifeTools) => RT} build
   * @param {(t: ExecutionContext, tools: Awaited<RT>) => Promise<void> | void} [run]
   * @param {StartAsyncLifeOptions} [options]
   */
  (title, build, run, options) => {
    return test(title, async t =>
      startAsyncLife(
        t,
        tools => build(t, tools),
        typeof run === 'function' ? tools => run(t, tools) : undefined,
        options,
      ),
    );
  };

/**
 * @param {SerialFn} test
 * @returns {ReturnType<typeof makeTestAsyncLifeFn> & {
 *   failing: ReturnType<typeof makeTestAsyncLifeFn>;
 *   only: ReturnType<typeof makeTestAsyncLifeFn>;
 *   skip: ReturnType<typeof makeTestAsyncLifeFn>;
 *   todo: TodoFn;
 * }}
 */
const makeTestAsyncLife = test => {
  const testAsyncLife = makeTestAsyncLifeFn(test);
  for (const subTestName of ['failing', 'only', 'skip', 'todo']) {
    Object.defineProperty(testAsyncLife, subTestName, {
      value: makeTestAsyncLifeFn(test[subTestName]),
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  harden(testAsyncLife);
  // @ts-expect-error define
  return testAsyncLife;
};

export const testAsyncLife = makeTestAsyncLife(avaTest.serial);
