import { Far } from '@endo/far';

export function buildRootObject() {
  return Far('root', {
    encourageMe(name) {
      console.log(`=> encouragementBot.encourageMe got the name: ${name}`);
      return `${name}, you are awesome, keep it up!\nbot vat is happy`;
    },
  });
}
