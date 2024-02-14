/** @file Mock IBC Server */
// @ts-check
import { E, Far } from '@endo/far';

/**
 * @param {ZCF} zcf
 * @param {{
 *   myPort: Port
 * }} privateArgs
 * @param {import("@agoric/vat-data").Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { myPort } = privateArgs;

  const { log } = console;
  let connP;
  let ackP;

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
    getAck: () => ackP,
    close: () => E(connP).close(),
  });

  return { creatorFacet };
};
