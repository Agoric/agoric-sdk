/** @file Mock IBC Server */
// @ts-check
import { E, Far } from '@endo/far';

/**
 *
 * @param {ZCF} zcf
 * @param {{
 *   boundPort: Port
 * }} privateArgs
 * @param {import("@agoric/vat-data").Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { boundPort } = privateArgs;

  const { log } = console;

  /** @type {ListenHandler} */
  const listener = Far('L', {
    async onAccept(_port, _localAddr, _remoteAddr, _listenHandler) {
      const ch = Far('CH', {
        async onReceive(_c, packetBytes) {
          log('Receiving Data', packetBytes);
        },
        async onOpen(_c, localAddr, remoteAddr, _connectionHandler) {
          log('onOpen', { localAddr, remoteAddr });
        },
      });
      return ch;
    },
    async onListen(port, _listenHandler) {
      console.debug(`listening on echo port: ${port}`);
    },
  });

  const creatorFacet = Far('CF', {
    listen: async () => {
      await E(boundPort).addListener(listener);
    },
  });

  return { creatorFacet };
};
