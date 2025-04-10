import { makePromiseKit } from '@endo/promise-kit';
import { Far, E } from '@endo/far';
import { panic } from '@agoric/internal';

export function buildRootObject(vatPowers) {
  // we use testLog to attempt to deliver messages even after we're supposed
  // to be cut off
  const { testLog } = vatPowers;

  const hold = [];

  return Far('root', {
    foo(arg) {
      testLog(`FOO ${arg}`);
      return `FOO SAYS ${arg}`;
    },

    holdPromise(p) {
      hold.push(p);
    },

    never() {
      return makePromiseKit().promise; // never fires
    },

    dieHappy(completion) {
      vatPowers.exitVat(completion);
    },

    dieSad(reason) {
      panic(reason);
    },

    dieHappyButTalkToMeFirst(other, completion) {
      vatPowers.exitVat(completion);
      E(other).query('not dead quite yet');
    },

    dieSadButTalkToMeFirst(other, reason) {
      panic(reason);
      E(other).query('Should be unobservable because happens after panic');
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
