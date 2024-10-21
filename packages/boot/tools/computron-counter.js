// @ts-check

/**
 * @typedef {Awaited<ReturnType<typeof import('@agoric/swingset-vat').makeSwingsetController>>} Controller
 */

// excerpted from launch-chain.js around line 254

/**
 * @typedef {object} BeansPerUnit
 * @property {bigint} blockComputeLimit
 * @property {bigint} vatCreation
 * @property {bigint} xsnapComputron
 */

/**
 * @param {BeansPerUnit} beansPerUnit
 * @param {boolean} [ignoreBlockLimit]
 */
export function computronCounter(
  { blockComputeLimit, vatCreation, xsnapComputron },
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
