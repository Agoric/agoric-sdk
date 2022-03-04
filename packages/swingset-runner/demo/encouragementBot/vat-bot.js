import { Far } from '@endo/marshal';

const log = console.log;
export function buildRootObject(_vatPowers) {
  // TODO: add a controller command to get the test log
  // const log = vatPowers.testLog;
  return Far('root', {
    encourageMe(name) {
      log(`=> encouragementBot.encourageMe got the name: ${name}`);
      return `${name}, you are awesome, keep it up!`;
    },
  });
}
