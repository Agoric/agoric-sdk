import { Far } from '@endo/far';

export function buildRootObject(vatPowers) {
  const log = vatPowers.testLog;
  return Far('root', {
    encourageMe(name) {
      log(`=> encouragementBot.encourageMe got the name: ${name}`);
      return `${name}, you are awesome, keep it up!`;
    },
  });
}
