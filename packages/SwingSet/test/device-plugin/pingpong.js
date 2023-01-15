import { Far } from '@endo/far';

export function bootPlugin() {
  return Far('iface', {
    start(opts) {
      const { prefix } = opts;
      return Far('iface2', {
        ping(msg) {
          return `${prefix}${msg}`;
        },
      });
    },
  });
}
