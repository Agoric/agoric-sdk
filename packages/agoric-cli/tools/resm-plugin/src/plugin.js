// eslint-disable-next-line import/no-extraneous-dependencies
import { Far } from '@endo/marshal';
import { start } from './output';

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
