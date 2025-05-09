/**
 * Run the test and retry once if it fails.
 *
 * @param {any} test - AVA test driver function.
 * @param {string} title - The title of the test.
 * @param {import('ava').Implementation<unknown[]>} predicate - The test
 *   implementation.
 */
export const avaRetry = (test, title, predicate) => {
  test(title, async t => {
    const result = await t.try(predicate);
    if (result.passed) {
      result.commit();
    } else {
      result.discard();
      const retryResult = await t.try(predicate);
      retryResult.commit();
    }
  });
};
