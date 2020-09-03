export function buildRootObject() {
  return harden({
    explode() {
      // eslint-disable-next-line no-unused-vars
      const hugantuous = Array(4e9); // arbitrarily too big
    },
  });
}
