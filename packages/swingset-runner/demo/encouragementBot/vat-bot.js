import { Far } from '@endo/marshal';

export function buildRootObject() {
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      encourageMe(name) {
        console.log(`=> encouragementBot.encourageMe got the name: ${name}`);
        return `${name}, you are awesome, keep it up!\nbot vat is happy`;
      },
    },
  );
}
