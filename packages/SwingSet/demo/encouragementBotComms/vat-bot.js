import { Far } from '@endo/far';

export function buildRootObject(vatPowers) {
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      encourageMe(name) {
        vatPowers.testLog(
          `=> encouragementBot.encourageMe got the name: ${name}`,
        );
        return `${name}, you are awesome, keep it up!`;
      },
    },
  );
}
