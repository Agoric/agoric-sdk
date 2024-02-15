/** @file Mock IBC Server */
// @ts-check
import { E, Far } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';

const { quote: q, Fail } = assert;
const { log } = console;

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

  /** @type {Array<[label: string, resolve: () => void, reject: () => void]>} */
  const queue = [];

  /** @type {ListenHandler} */
  const listener = Far('L', {
    async onAccept(_port, _localAddr, _remoteAddr, _listenHandler) {
      const ch = Far('CH', {
        async onReceive(_c, packetBytes) {
          log('Receiving Data', packetBytes);
          assert.typeof(packetBytes, 'string');
          const { promise, resolve, reject } = makePromiseKit();
          queue.push([
            'onReceive',
            () => resolve(`got ${packetBytes}`),
            reject,
          ]);
          return promise;
        },
        async onOpen(_c, localAddr, remoteAddr, _connectionHandler) {
          log('onOpen', { localAddr, remoteAddr });
          const { promise, resolve, reject } = makePromiseKit();
          queue.push(['onOpen', resolve, reject]);
          return promise;
        },
      });
      const { promise, resolve, reject } = makePromiseKit();
      queue.push(['onAccept', () => resolve(ch), reject]);
      return promise;
    },
    async onListen(port, _listenHandler) {
      console.debug(`listening on echo port: ${port}`);
      const { promise, resolve, reject } = makePromiseKit();
      queue.push(['onListen', resolve, reject]);
      return promise;
    },
  });

  const creatorFacet = Far('CF', {
    /**
     * Assert that the next pending operation has the expected label and release it.
     *
     * @param {string} expectedLabel
     * @returns {Promise<void>}
     */
    dequeue: async expectedLabel => {
      queue.length > 0 ||
        Fail`got empty queue when expecting ${q(expectedLabel)}`;
      const [label, resolve, reject] = /** @type {any} */ (queue.shift());
      if (label === expectedLabel) {
        resolve();
        return;
      }
      reject(Error(`expecting to dequeue ${expectedLabel} but saw ${label}`));
      Fail`expecting to dequeue ${q(expectedLabel)} but saw ${q(label)}`;
    },
    listen: async () => {
      await E(boundPort).addListener(listener);
    },
  });

  return { creatorFacet };
};
