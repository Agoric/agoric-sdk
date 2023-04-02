import { makePromiseKit } from '@endo/promise-kit';
import { Far, E } from '@endo/far';

export function buildRootObject(vatPowers) {
  // we use testLog to attempt to deliver messages even after we're supposed
  // to be cut off
  const { testLog } = vatPowers;

  return Far('root', {
    foo(arg) {
      testLog(`FOO ${arg}`);
      return `FOO SAYS ${arg}`;
    },

    never() {
      return makePromiseKit().promise; // never fires
    },

    dieHappy(completion) {
      vatPowers.exitVat(completion);
    },

    dieSad(reason) {
      vatPowers.exitVatWithFailure(reason);
    },

    dieHappyButTalkToMeFirst(other, completion) {
      vatPowers.exitVat(completion);
      E(other).query('not dead quite yet');
    },

    dieSadButTalkToMeFirst(other, reason) {
      vatPowers.exitVatWithFailure(reason);
      E(other).query('not dead quite yet (but soon)');
    },

    dieReturningAPresence(other) {
      vatPowers.exitVat({ message: 'your ad here', emissary: other });
    },

    async elsewhere(other, arg) {
      testLog(`QUERY ${arg}`);
      const answer = await E(other).query(arg);
      testLog(`ANSWER ${answer}`);
      return answer;
    },
  });
}
