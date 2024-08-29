import test from 'ava';
import { Far } from '@endo/marshal';
import { kser, kslot } from '@agoric/kmarshal';
import { makeLiveSlots } from '../src/liveslots.js';
import { buildSyscall } from './liveslots-helpers.js';
import { makeStartVat, makeMessage, makeBringOutYourDead } from './util.js';
import { makeMockGC } from './mock-gc.js';

// Test for https://github.com/Agoric/agoric-sdk/issues/9939

test('weakset deletion vs retire', async t => {
  const { syscall, log } = buildSyscall();
  const gcTools = makeMockGC();

  // #9939 was a bug in liveslots that caused a vat to emit
  // syscall.retireImports despite not having done dropImports
  // first. The setup is:
  //
  // * import a Presence (raising the RAM pillar)
  // * store it in a virtual object (raising the vdata pillar)
  // * use it as a key of a voAwareWeakMap or voAwareWeakSet
  // * drop the Presence (dropping the RAM pillar)
  // * do a BOYD
  // * delete the voAwareWeakSet
  // * do a BOYD
  //
  // When the voAwareWeakSet is collected, a finalizer callback named
  // finalizeDroppedCollection is called, which clears the entries,
  // and adds all its vref keys to possiblyRetiredSet. Later, during
  // BOYD, a loop examines possiblyRetiredSet and adds qualified vrefs
  // to importsToRetire, for the syscall.retireImports at the end.
  //
  // That qualification check was sufficient to prevent the retirement
  // of vrefs that still have a RAM pillar, and also vrefs that were
  // being dropped in this particular BOYD, but it was not sufficient
  // to protect vrefs that still have a vdata pillar.

  let myVOAwareWeakSet;
  let myPresence;
  function buildRootObject(vatPowers, _vatParameters, baggage) {
    const { WeakSet } = vatPowers;
    myVOAwareWeakSet = new WeakSet();
    return Far('root', {
      store: p => {
        myPresence = p;
        myVOAwareWeakSet.add(p);
        baggage.init('presence', p);
      },
    });
  }

  const makeNS = () => ({ buildRootObject });
  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, makeNS);
  const { dispatch } = ls;
  await dispatch(makeStartVat(kser()));
  t.truthy(myVOAwareWeakSet);

  await dispatch(makeMessage('o+0', 'store', [kslot('o-1')]));
  t.truthy(myPresence);

  log.length = 0;
  gcTools.kill(myPresence);
  gcTools.flushAllFRs();
  await dispatch(makeBringOutYourDead());

  log.length = 0;
  gcTools.kill(myVOAwareWeakSet);
  gcTools.flushAllFRs();
  await dispatch(makeBringOutYourDead());

  // The imported vref is still reachable by the 'baggage' durable
  // store, so it must not be dropped or retired yet. The bug caused
  // the vref to be retired without first doing a drop, which is a
  // vat-fatal syscall error
  const gcCalls = log.filter(
    l => l.type === 'dropImports' || l.type === 'retireImports',
  );
  t.deepEqual(gcCalls, []);
  log.length = 0;
});
