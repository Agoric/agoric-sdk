export function buildRootObject(vatPowers) {
  vatPowers.testLog(`bootstrap called`);
  return harden({});
}
