// @ts-check

import { assert } from '@endo/errors';
import {
  BeansPerBlockComputeLimit,
  BeansPerVatCreation,
  BeansPerXsnapComputron,
} from './sim-params.js';

const { hasOwn } = Object;

/**
 * @typedef {object} BeansPerUnit
 * @property {bigint} blockComputeLimit
 * @property {bigint} vatCreation
 * @property {bigint} xsnapComputron
 */

/**
 * Return a stateful run policy that supports two phases: first allow
 * non-cleanup work (presumably deliveries) until an overrideable computron
 * budget is exhausted, then (iff no work was done and at least one vat cleanup
 * budget field is positive) a cleanup phase that allows cleanup work (and
 * presumably nothing else) until one of those fields is exhausted.
 * https://github.com/Agoric/agoric-sdk/issues/8928#issuecomment-2053357870
 *
 * @param {object} params
 * @param {BeansPerUnit} params.beansPerUnit
 * @param {import('@agoric/swingset-vat').CleanupBudget} [params.vatCleanupBudget]
 * @param {boolean} [ignoreBlockLimit]
 * @returns {import('./launch-chain.js').ChainRunPolicy}
 */
export function computronCounter(
  { beansPerUnit, vatCleanupBudget },
  ignoreBlockLimit = false,
) {
  const {
    [BeansPerBlockComputeLimit]: blockComputeLimit,
    [BeansPerVatCreation]: vatCreation,
    [BeansPerXsnapComputron]: xsnapComputron,
  } = beansPerUnit;
  assert.typeof(blockComputeLimit, 'bigint');
  assert.typeof(vatCreation, 'bigint');
  assert.typeof(xsnapComputron, 'bigint');

  let totalBeans = 0n;
  const shouldRun = () => ignoreBlockLimit || totalBeans < blockComputeLimit;

  const remainingCleanups = { default: Infinity, ...vatCleanupBudget };
  const defaultCleanupBudget = remainingCleanups.default;
  let cleanupStarted = false;
  let cleanupDone = false;
  const cleanupPossible = Object.values(remainingCleanups).some(n => n > 0);
  if (!cleanupPossible) cleanupDone = true;
  /** @type {() => (false | import('@agoric/swingset-vat').CleanupBudget)} */
  const allowCleanup = () =>
    cleanupStarted && !cleanupDone && { ...remainingCleanups };
  const startCleanup = () => {
    assert(!cleanupStarted);
    cleanupStarted = true;
    return totalBeans === 0n && !cleanupDone;
  };
  const didCleanup = details => {
    for (const [phase, count] of Object.entries(details.cleanups)) {
      if (phase === 'total') continue;
      if (!hasOwn(remainingCleanups, phase)) {
        // TODO: log unknown phases?
        remainingCleanups[phase] = defaultCleanupBudget;
      }
      remainingCleanups[phase] -= count;
      if (remainingCleanups[phase] <= 0) cleanupDone = true;
    }
    // We return true to allow processing of any BOYD/GC prompted by cleanup,
    // even if cleanup as such is now done.
    return true;
  };

  const policy = harden({
    vatCreated() {
      totalBeans += vatCreation;
      return shouldRun();
    },
    crankComplete(details = {}) {
      assert.typeof(details, 'object');
      if (details.computrons) {
        assert.typeof(details.computrons, 'bigint');

        // TODO: xsnapComputron should not be assumed here.
        // Instead, SwingSet should describe the computron model it uses.
        totalBeans += details.computrons * xsnapComputron;
      }
      return shouldRun();
    },
    crankFailed() {
      const failedComputrons = 1000000n; // who knows, 1M is as good as anything
      totalBeans += failedComputrons * xsnapComputron;
      return shouldRun();
    },
    emptyCrank() {
      return shouldRun();
    },
    allowCleanup,
    didCleanup,

    shouldRun,
    remainingBeans: () =>
      ignoreBlockLimit ? undefined : blockComputeLimit - totalBeans,
    totalBeans: () => totalBeans,
    startCleanup,
  });
  return policy;
}
