/**
 * @import {ExecutionContext, Implementation, TestFn} from 'ava';
 */
/**
 * Run the test and retry once if it fails.
 *
 * @param {TestFn} test - AVA test driver function.
 * @param {string} title - The title of the test.
 * @param {Implementation<unknown[]>} predicate - The test implementation.
 */
export const avaRetry = (test, title, predicate) => {
  test(
    title,
    /** @param {ExecutionContext} t */ async t => {
      const result = await t.try(predicate);
      if (result.passed) {
        result.commit();
      } else {
        result.discard();
        const retryResult = await t.try(predicate);
        retryResult.commit();
      }
    },
  );
};
