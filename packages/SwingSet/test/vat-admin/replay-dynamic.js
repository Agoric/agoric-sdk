export function buildRootObject() {
  let counter = 0;
  return harden({
    first() {
      counter += 1;
      return counter;
    },
    second() {
      counter += 20;
      return counter;
    },
  });
}
