import { Fail, q } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { prepareExoClass, provideDurableSetStore } from '@agoric/vat-data';
import { M, initEmpty } from '@agoric/store';
import { TimestampShape } from '@agoric/time';

import {
  isOnDemandExitRule,
  isAfterDeadlineExitRule,
  isWaivedExitRule,
} from '../typeGuards.js';

const ExitObjectI = M.interface('ExitObject', { exit: M.call().returns() });
const WakerI = M.interface('Waker', {
  wake: M.call(TimestampShape).returns(),
  schedule: M.call().returns(),
});

/**
 * Makes a function that makes exitObjects. The maker is executed in ZCF. It
 * returns an object than can be passed to Zoe when a seat is created so Zoe can
 * inform ZCF if and when the seat's owner calls seat.exit().
 */

export const makeMakeExiter = baggage => {
  const activeWakers = provideDurableSetStore(baggage, 'activeWakers');

  const makeExitable = prepareExoClass(
    baggage,
    'ExitObject',
    ExitObjectI,
    zcfSeat => ({ zcfSeat }),
    {
      exit() {
        const { state } = this;
        state.zcfSeat.exit();
        state.zcfSeat = undefined;
      },
    },
    {
      stateShape: harden({
        zcfSeat: M.any(),
      }),
    },
  );
  const makeWaived = prepareExoClass(
    baggage,
    'ExitWaived',
    ExitObjectI,
    initEmpty,
    {
      exit() {
        // in this case the user has no ability to exit their seat on demand
        throw Error(
          `Only seats with the exit rule "onDemand" can exit at will`,
        );
      },
    },
  );
  const makeWaker = prepareExoClass(
    baggage,
    'Waker',
    WakerI,
    (zcfSeat, afterDeadline) => ({ zcfSeat, afterDeadline }),
    {
      wake(_when) {
        const { state, self } = this;

        activeWakers.delete(self);
        // The contract may have exited the seat after satisfying it or
        // rejecting it, but the onDemand exit waker will still fire.
        if (!state.zcfSeat.hasExited()) {
          state.zcfSeat.exit();
        }
      },
      schedule() {
        const { state, self } = this;

        E(state.afterDeadline.timer)
          .setWakeup(state.afterDeadline.deadline, self)
          .catch(reason => {
            console.error(
              `The seat could not be made with the provided timer ${state.afterDeadline.timer} and deadline ${state.afterDeadline.deadline}`,
            );
            console.error(reason);
            state.zcfSeat.fail(reason);
            throw reason;
          });
      },
    },
  );

  // On revival, reschedule all the active wakers.
  for (const waker of activeWakers.values()) {
    waker.schedule();
  }

  /**
   * Makes the appropriate exitObj, which runs in ZCF and allows the seat's owner
   * to request the position be exited.
   *
   * @type {MakeExitObj}
   */
  return (proposal, zcfSeat) => {
    const { exit } = proposal;

    if (isOnDemandExitRule(exit)) {
      // Allow the user to exit their seat on demand. Note: we must wrap
      // it in an object to send it back to Zoe because our marshalling layer
      // only allows two kinds of objects: records (no methods and only
      // data) and presences (local proxies for objects that may have
      // methods).
      return makeExitable(zcfSeat);
    }

    if (isAfterDeadlineExitRule(exit)) {
      const waker = makeWaker(zcfSeat, exit.afterDeadline);
      activeWakers.add(waker);
      // Automatically exit the seat after deadline.
      waker.schedule();
    }

    if (isWaivedExitRule(exit) || isAfterDeadlineExitRule(exit)) {
      return makeWaived();
    }

    throw Fail`exit kind was not recognized: ${q(exit)}`;
  };
};
