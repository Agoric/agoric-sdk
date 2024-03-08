import { Far } from '@endo/far';

export const buildRootObject = () => {
  let count = 0;
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      bootstrap: () => 0,
      increment: () => {
        count += 1;
      },
      read: () => count,
    },
  );
};
