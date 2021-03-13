import { Far } from '@agoric/marshal';

/**
 * Makes the appropriate exitObj, which runs in ZCF and allows the seat's owner
 * to request the position be exited.
 */

/** @type {MakeExitObj} */
export const makeExitObj = () => {
  return Far('exitObj', {
    exit: () => {
      throw new Error(
        `Only seats with the exit rule "onDemand" can exit at will`,
      );
    },
  });
};
