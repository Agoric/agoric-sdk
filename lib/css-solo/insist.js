export function insist(condition, exceptionStr) {
  if (!condition) {
    throw new Error(exceptionStr);
  }
}
