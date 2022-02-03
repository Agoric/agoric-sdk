import { Far } from '@endo/marshal';

export function buildRootObject(_vatPowers) {
  return Far('root', {
    encourageMe(name) {
      console.log(`=> encouragementBot.encourageMe got the name: ${name}`);
      return `${name}, you are awesome, keep it up!\nbot vat is happy`;
    },
  });
}
