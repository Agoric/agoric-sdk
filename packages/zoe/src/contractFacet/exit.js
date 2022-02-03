// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

import {
  isOnDemandExitRule,
  isAfterDeadlineExitRule,
  isWaivedExitRule,
} from '../typeGuards.js';

/**
 * Makes the appropriate exitObj, which runs in ZCF and allows the seat's owner
 * to request the position be exited.
 */

/** @type {MakeExitObj} */
export const makeExitObj = (proposal, zcfSeat) => {
  const { exit } = proposal;

  if (isOnDemandExitRule(exit)) {
    // Allow the user to exit their seat on demand. Note: we must wrap
    // it in an object to send it back to Zoe because our marshalling layer
    // only allows two kinds of objects: records (no methods and only
    // data) and presences (local proxies for objects that may have
    // methods).
    return Far('exitObj', {
      exit: zcfSeat.exit,
    });
  }

  if (isAfterDeadlineExitRule(exit)) {
    // Automatically exit the seat after deadline.
    E(exit.afterDeadline.timer)
      .setWakeup(
        exit.afterDeadline.deadline,
        Far('wakeObj', {
          wake: zcfSeat.exit,
        }),
      )
      .catch(reason => {
        console.error(
          `The seat could not be made with the provided timer ${exit.afterDeadline.timer} and deadline ${exit.afterDeadline.deadline}`,
        );
        console.error(reason);
        zcfSeat.fail(reason);
        throw reason;
      });
  }

  if (isWaivedExitRule(exit) || isAfterDeadlineExitRule(exit)) {
    /** @type {ExitObj} */
    return Far('exitObj', {
      exit: () => {
        // if exitKind is 'waived' the user has no ability to exit their seat
        // on demand
        throw Error(
          `Only seats with the exit rule "onDemand" can exit at will`,
        );
      },
    });
  }

  assert.fail(X`exit kind was not recognized: ${q(exit)}`);
};
