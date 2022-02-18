import { Far } from '@endo/marshal';

export const bootPlugin = () =>
  Far('iface', {
    start: opts => {
      const { prefix } = opts;
      return Far('iface2', {
        ping: msg => `${prefix}${msg}`,
      });
    },
  });
