import { Far } from '@endo/far';

export function buildRootObject(vatPowers) {
  return Far('root', {
    encourageMe(name) {
      vatPowers.testLog(
        `=> encouragementBot.encourageMe got the name: ${name}`,
      );
      return `${name}, you are awesome, keep it up!`;
    },
  });
}
