// @ts-check
import { makeExo } from '@agoric/store';
import { E } from '@endo/far';

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     transferMiddleware: import('../vat-transfer.js').TransferMiddleware;
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
    upcall: async param => JSON.stringify(param),
  });

  // TODO put something in promise space to unregister this one and register again
  // or maybe put all imperative stuff into promise space
  await E(transferMiddleware).registerTap(target, tap);

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
