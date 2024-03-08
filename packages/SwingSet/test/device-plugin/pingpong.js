import { Far } from '@endo/far';

export function bootPlugin() {
  return makeExo(
    'iface',
    M.interface('iface', {}, { defaultGuards: 'passable' }),
    {
      start(opts) {
        const { prefix } = opts;
        return makeExo(
          'iface2',
          M.interface('iface2', {}, { defaultGuards: 'passable' }),
          {
            ping(msg) {
              return `${prefix}${msg}`;
            },
          },
        );
      },
    },
  );
}
