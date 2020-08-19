/* global harden */

export function buildRootObject(vatPowers) {
  // we use testLog to attempt to deliver messages even after we're supposed
  // to be dead and gone
  const { testLog } = vatPowers;

  return harden({
    live() {
      testLog(`I ate'nt dead`);
    },
  });
}
