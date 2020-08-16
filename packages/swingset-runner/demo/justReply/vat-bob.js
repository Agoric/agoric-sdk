export function buildRootObject(_vatPowers) {
  return harden({
    hello() {
      console.log(`=> Somebody said hello to Bob`);
      return 'hi there!';
    },
  });
}
