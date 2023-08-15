import { Far } from '@endo/far';

const log = console.log;

export function buildRootObject() {
  return Far('root', {
    encourageMe(name) {
      log(`=> encouragementBot.encourageMe got the name: ${name}`);
      return `${name}, you are awesome, keep it up!\nbot vat is happy`;
    },
  });
}
