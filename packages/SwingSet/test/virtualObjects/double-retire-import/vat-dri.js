/* global VatData */
import { Far } from '@endo/far';
// import { defineKind } from '@agoric/vat-data';
const { defineKind } = VatData;

function initialize(arg) {
  return harden({ arg });
}
const behavior = {
  get({ state }) {
    return state.arg;
  },
  set({ state }, arg) {
    state.arg = harden(arg);
  },
};
const makeVir = defineKind('virtual', initialize, behavior);

function buildVirtuals(sensor0, sensor1) {
  // eslint-disable-next-line no-unused-vars
  const vir0 = makeVir(sensor0); // gets o+10/1, data holds o-50
  // If I only make one vir, its Representative doesn't get dropped, I
  // don't know why. If I make two, the first gets dropped but not the
  // second.

  // eslint-disable-next-line no-unused-vars
  const vir1 = makeVir(sensor1); // o+10/2, data holds o-51

  // We drop everything at the same time. The finalizers run on the
  // vir0 Representative and both Presences (but not vir1,
  // why??). `possiblyDeadSet` has [o+10/1, o-50, o-51]. The o+10/1
  // sorts earlier, so we entry the 'for (const baseRef of
  // deadBaseRefs)' loop with [o+10/1, o-50, o-51]:
  // * o+10/1 : vrm.possibleVirtualObjectDeath() finds that it is
  //            unreferenced by exports or vdata, so it is
  //            deleted. While deleting o+10/1, the o-50 sensor0
  //            object is decreffed, adding it back to
  //            `possiblyDeadSet`. The 'gcAgain' return value is true,
  //            because vdata was deleted (which might have released
  //            a Remotable or Promise), scheduling another loop pass.
  // * o-50 : vrm.isPresenceReachable reports no refcount, so o-50 is
  //          added to importsToDrop. vrm.isVrefRecognizable reports
  //          no refcount, so o-50 is also added to importsToRetire
  // * o-51 : vrm.isPresenceReachable reports a non-zero refcount
  //          because (for some reason) o+10/2 is still alive, so o-51
  //          is not added to importsToDrop or importsToRetire

  // Now the gcAgain/doMore flag causes the loop to be repeated,
  // starting with a gcAndFinalize() (which doesn't yield anything
  // here). However o-50 is in possiblyDeadSet, and makes it into
  // deadSet, and is examined by vrm.isPresenceReachable, which
  // reports no refcount, so it is added *again* into importsToDrop
  // and importsToRetire. Because these are Arrays and not Sets, we
  // attempt `syscall.dropImports([o-50,o-50])`, which happens to
  // succeed, and then `syscall.retireImports([o-50,o-50])`, which
  // fails when the second copy tries to look up a c-list entry that
  // was deleted by the first copy.
}

export function buildRootObject() {
  return Far('root', {
    ping() {
      return 0;
    },
    buildVir(sensor0, sensor1) {
      return buildVirtuals(sensor0, sensor1);
    },
  });
}
