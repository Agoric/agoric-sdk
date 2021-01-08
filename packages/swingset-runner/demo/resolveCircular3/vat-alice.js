export function buildRootObject(_vatPowers) {
  return harden({
    acceptPromise(_p) {
      console.log('Alice got p');
    },
  });
}
