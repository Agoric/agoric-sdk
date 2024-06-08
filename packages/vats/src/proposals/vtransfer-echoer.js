// @ts-check
import { makeExo } from '@agoric/store';
import { E } from '@endo/far';

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     transferMiddleware: import('../transfer.js').TransferMiddleware;
 *   };
 * }} powers
 * @param {object} options
 * @param {{ target: string }} options.options
 */
export const echoVtransfer = async (
  { consume: { transferMiddleware } },
  { options: { target } },
) => {
  console.warn(`=== vtransfer echoer targeting ${target}`);

  // a tap that simply returns what it received
  const tap = makeExo('echoer', undefined, {
    // ack value must be stringlike
    receiveUpcall: async param => JSON.stringify(param),
  });

  await E(transferMiddleware).registerActiveTap(target, tap);

  console.warn('=== vtransfer echoer registered');
};

export const getManifestForVtransferEchoer = (_powers, { target }) => ({
  manifest: {
    [echoVtransfer.name]: {
      consume: {
        transferMiddleware: 'transferMiddleware',
      },
    },
  },
  options: {
    target,
  },
});
