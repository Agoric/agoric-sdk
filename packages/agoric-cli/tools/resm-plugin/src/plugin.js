// @jessie-check

import { Far } from '@endo/marshal';
import { start } from './output.js';

export const bootPlugin = () => {
  return Far('plugin', {
    start(_opts) {
      console.log(start);
      return Far('plugin start', {
        async ping() {
          return 'pong';
        },
      });
    },
  });
};
