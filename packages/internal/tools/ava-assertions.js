/**
 * Assert that the contents of `array` are
 * [like]{@link https://github.com/avajs/ava/blob/main/docs/03-assertions.md#likeactual-selector-message}
 * those of `expected`, including having matching lengths, with pretty diffs in
 * case of mismatch.
 *
 * @param {import('ava').ExecutionContext} t
 * @param {unknown[]} array
 * @param {unknown[]} expected
 * @param {string} [message]
 */
export const arrayIsLike = (t, array, expected, message) => {
  const actualLength = array.length;
  const expectedLength = expected.length;
  const actualExcess = actualLength - expectedLength;
  const comparable =
    actualExcess > 0
      ? [...expected, ...Array.from({ length: actualExcess })]
      : expected;
  t.like(array, comparable, message);

  if (actualLength === expectedLength) return;

  const extended = [...array, ...Array.from({ length: -actualExcess })];
  t.deepEqual(extended, array, message);
};
