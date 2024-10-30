// @ts-check

import { assert } from '@endo/errors';
import {
  BeansPerBlockComputeLimit,
  BeansPerVatCreation,
  BeansPerXsnapComputron,
} from './sim-params.js';

/**
 * @typedef {object} BeansPerUnit
 * @property {bigint} blockComputeLimit
 * @property {bigint} vatCreation
 * @property {bigint} xsnapComputron
 */
/**
 * @param {BeansPerUnit} beansPerUnit
 * @param {boolean} [ignoreBlockLimit]
 * @returns {import('./launch-chain.js').ChainRunPolicy}
 */
export function computronCounter(
  {
    [BeansPerBlockComputeLimit]: blockComputeLimit,
    [BeansPerVatCreation]: vatCreation,
    [BeansPerXsnapComputron]: xsnapComputron,
  },
  ignoreBlockLimit = false,
) {
  assert.typeof(blockComputeLimit, 'bigint');
  assert.typeof(vatCreation, 'bigint');
  assert.typeof(xsnapComputron, 'bigint');
  let totalBeans = 0n;
  const shouldRun = () => ignoreBlockLimit || totalBeans < blockComputeLimit;
  const remainingBeans = () =>
    ignoreBlockLimit ? undefined : blockComputeLimit - totalBeans;

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
    shouldRun,
    remainingBeans,
    totalBeans() {
      return totalBeans;
    },
  });
  return policy;
}
