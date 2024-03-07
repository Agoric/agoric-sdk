// @jessie-check

import { makeExo } from '@endo/exo';
import { M } from '@endo/patterns';
import { start } from './output.js';

export const bootPlugin = () => {
  return makeExo(
    'plugin',
    M.interface('plugin', {}, { defaultGuards: 'passable' }),
    {
      start(_opts) {
        console.log(start);
        return makeExo(
          'plugin start',
          M.interface('plugin start', {}, { defaultGuards: 'passable' }),
          {
            async ping() {
              return 'pong';
            },
          },
        );
      },
    },
  );
};
