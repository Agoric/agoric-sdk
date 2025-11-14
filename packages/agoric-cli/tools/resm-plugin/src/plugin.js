// @jessie-check

import { Far } from '@endo/marshal';
import { start } from './output.js';

// @ts-expect-error TS1287: A top-level 'export' modifier cannot be used on value declarations in a CommonJS module when 'verbatimModuleSyntax' is enabled.
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
