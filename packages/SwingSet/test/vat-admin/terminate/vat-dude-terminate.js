/* global harden */
import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

export function buildRootObject(vatPowers) {
  // we use testLog to attempt to deliver messages even after we're supposed
  // to be cut off
  const { testLog } = vatPowers;

  return harden({
    foo(arg) {
      testLog(`FOO ${arg}`);
      return `FOO SAYS ${arg}`;
    },

    never() {
      return makePromiseKit().promise; // never fires
    },

    async elsewhere(other, arg) {
      testLog(`QUERY ${arg}`);
      const answer = await E(other).query(arg);
      testLog(`ANSWER ${answer}`);
      return answer;
    },
  });
}
