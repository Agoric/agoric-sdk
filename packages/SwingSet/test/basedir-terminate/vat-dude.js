/* global harden */

export function buildRootObject() {
  return harden({
    dude() {
      return 'DUDE';
    },
  });
}
