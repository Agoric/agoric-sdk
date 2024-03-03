/** @file Mock IBC Server */
// @ts-check
import { Far } from '@endo/far';
import { V as E } from '@agoric/vat-data/vow.js';

/**
 * @param {ZCF} zcf
 * @param {{
 *   address: string,
 *   networkVat: any
 * }} privateArgs
 * @param {import("@agoric/vat-data").Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { address, networkVat } = privateArgs;
  const myPort = await E(networkVat).bind(address);

  const { log } = console;
  let connP;
  let ackP;

  const ch = Far('CH', {
    async onClose(_c, reason, _connectionHandler) {
      debugger;
    },
  });

  const creatorFacet = Far('CF', {
    connect: remote => {
      log('connect', remote);
      // don't return the promise.
      // We want to test a promise that lasts across cranks.
      connP = E(myPort).connect(
        remote,

        // TODO: handler
      );
    },
    send: data => {
      log('send', data);
      assert(connP, 'must connect first');
      ackP = E(connP).send(data);
    },
    getAck: () => E.when(ackP),
    close: () => E(connP).close(),
    getLocalAddress: async () => {
      return E(myPort).getLocalAddress();
    },
  });

  return { creatorFacet };
};
