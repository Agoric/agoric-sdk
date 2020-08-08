/* global harden */

import { allSettled } from './allSettled';

function makeCollect(E, log) {
  function collect(seatE, winPurseE, refundPurseE, name = 'collecting') {
    const results = harden([
      E(seatE)
        .getWinnings()
        .then(winnings => E(winPurseE).depositAll(winnings)),
      // TODO Bug if we replace the comma above with the uncommented
      // out ".then(_ => undefined)," below, somehow we end up trying
      // to marshal an array with holes, rather than an array with
      // undefined elements. This remains true whether we use
      // Promise.all or allSettled
      /* .then(_ => undefined), */
      E(seatE)
        .getRefund()
        .then(refund => refund && E(refundPurseE).depositAll(refund)),
    ]);
    const doneE = allSettled(results);
    Promise.resolve(doneE).then(([wins, refs]) => {
      log(`${name} wins: `, wins, ` refs: `, refs);
    });
    // Use Promise.all here rather than allSettled in order to
    // propagate rejection.
    return Promise.all(results);
  }
  return harden(collect);
}
harden(makeCollect);

export { makeCollect };
