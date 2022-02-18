import { Far } from '@endo/marshal';

const log = console.log;

export const buildRootObject = _vatPowers =>
  Far('root', {
    encourageMe: name => {
      log(`=> encouragementBot.encourageMe got the name: ${name}`);
      return `${name}, you are awesome, keep it up!\nbot vat is happy`;
    },
  });
