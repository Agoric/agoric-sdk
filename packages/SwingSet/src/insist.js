/**
 * A simple assertion guard, ensuring that a particular condition is satisfied
 * before computation is permitted to proceed.  It tests the given condition
 * and throws an error if the condition is not true.
 *
 * @param condition  The condition that must be satisfied
 * @param exceptionStr  String that will be used in the thrown error if the
 *   condition is not satisfied.
 *
 * @throws Error if the the condition is false.
 *
 * @return nothing
 */
export function insist(condition, exceptionStr) {
  if (!condition) {
    throw new Error(exceptionStr);
  }
}
