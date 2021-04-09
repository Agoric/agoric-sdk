import { test } from '../tools/prepare-test-env-ava';

import buildCommsDispatch from '../src/vats/comms';
import { flipRemoteSlot } from '../src/vats/comms/parseRemoteSlot';
import { makeState, makeStateKit } from '../src/vats/comms/state';
import { makeCListKit } from '../src/vats/comms/clist';
import { addRemote } from '../src/vats/comms/remote';
import { debugState } from '../src/vats/comms/dispatch';
import { commsVatDriver } from './commsVatDriver';

test('provideRemoteForLocal', t => {
  const s = makeState(0);
  const stateKit = makeStateKit(s);
  const fakeSyscall = {};
  const clistKit = makeCListKit(s, fakeSyscall, stateKit);
  const { provideRemoteForLocal } = clistKit;
  const { remoteID } = addRemote(s, 'remote1', 'o-1');

  // n.b.: duplicated provideRemoteForLocal() call is not a cut-n-paste error
  // but a test that translation is stable
  t.is(provideRemoteForLocal(remoteID, 'lo4'), 'ro-20');
  t.is(provideRemoteForLocal(remoteID, 'lo4'), 'ro-20');
  t.is(provideRemoteForLocal(remoteID, 'lo5'), 'ro-21');
});

function mockSyscall() {
  const sends = [];
  const syscall = harden({
    send(targetSlot, method, args) {
      sends.push([targetSlot, method, args]);
      return 'r-1';
    },
    subscribe(_targetSlot) {},
  });
  return { syscall, sends };
}

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function encodeArgs(body) {
  return capdata(JSON.stringify([body]), []);
}

test('transmit', t => {
  // look at machine A, on which some local vat is sending messages to a
  // remote 'bob' on machine B
  const { syscall, sends } = mockSyscall();
  const d = buildCommsDispatch(syscall, 'fakestate', 'fakehelpers');
  const { state, clistKit } = debugState.get(d);
  const {
    provideKernelForLocal,
    provideLocalForKernel,
    provideLocalForRemote,
    getLocalForRemote,
  } = clistKit;
  // add the remote, and an object to send at
  const transmitterID = 'o-1';
  const aliceKernel = 'o-10';
  const aliceLocal = provideLocalForKernel(aliceKernel);
  const { remoteID } = addRemote(state, 'remote1', transmitterID);
  const bobLocal = provideLocalForRemote(remoteID, 'ro-23');
  const bobKernel = provideKernelForLocal(bobLocal);

  // now tell the comms vat to send a message to a remote machine, the
  // equivalent of bob!foo()
  d.deliver(bobKernel, 'foo', capdata('argsbytes', []), null);
  t.deepEqual(sends.shift(), [
    transmitterID,
    'transmit',
    encodeArgs('1:0:deliver:ro+23:foo:;argsbytes'),
  ]);

  // bob!bar(alice, bob)
  d.deliver(
    bobKernel,
    'bar',
    capdata('argsbytes', [aliceKernel, bobKernel]),
    null,
  );
  t.deepEqual(sends.shift(), [
    transmitterID,
    'transmit',
    encodeArgs('2:0:deliver:ro+23:bar::ro-20:ro+23;argsbytes'),
  ]);
  // the outbound ro-20 should match an inbound ro+20, both represent 'alice'
  t.is(getLocalForRemote(remoteID, 'ro+20'), aliceLocal);
  // do it again, should use same values
  d.deliver(
    bobKernel,
    'bar',
    capdata('argsbytes', [aliceKernel, bobKernel]),
    null,
  );
  t.deepEqual(sends.shift(), [
    transmitterID,
    'transmit',
    encodeArgs('3:0:deliver:ro+23:bar::ro-20:ro+23;argsbytes'),
  ]);

  // bob!cat(alice, bob, ayana)
  const ayana = 'o-11';
  d.deliver(
    bobKernel,
    'cat',
    capdata('argsbytes', [aliceKernel, bobKernel, ayana]),
    null,
  );
  t.deepEqual(sends.shift(), [
    transmitterID,
    'transmit',
    encodeArgs('4:0:deliver:ro+23:cat::ro-20:ro+23:ro-21;argsbytes'),
  ]);
});

test('receive', t => {
  // look at machine B, which is receiving remote messages aimed at a local
  // vat's object 'bob'
  const { syscall, sends } = mockSyscall();
  const d = buildCommsDispatch(syscall, 'fakestate', 'fakehelpers');
  const { state, clistKit } = debugState.get(d);
  const {
    provideLocalForKernel,
    getKernelForLocal,
    getLocalForKernel,
    provideRemoteForLocal,
    getRemoteForLocal,
    getLocalForRemote,
  } = clistKit;
  // add the remote, and an object to send at
  const transmitterID = 'o-1';
  const bobKernel = 'o-5';
  const bobLocal = provideLocalForKernel(bobKernel);
  const { remoteID, receiverID } = addRemote(state, 'remote1', transmitterID);
  const bobRemote = flipRemoteSlot(provideRemoteForLocal(remoteID, bobLocal));
  t.is(bobRemote, 'ro+20');

  // now pretend the transport layer received a message from remote1, as if
  // the remote machine had performed bob!foo()
  d.deliver(
    receiverID,
    'receive',
    encodeArgs(`1:0:deliver:${bobRemote}:foo:;argsbytes`),
    null,
  );
  t.deepEqual(sends.shift(), [bobKernel, 'foo', capdata('argsbytes')]);

  // bob!bar(alice, bob)
  d.deliver(
    receiverID,
    'receive',
    encodeArgs(`2:0:deliver:${bobRemote}:bar::ro-20:${bobRemote};argsbytes`),
    null,
  );
  const expectedAliceKernel = 'o+31';
  t.deepEqual(sends.shift(), [
    bobKernel,
    'bar',
    capdata('argsbytes', [expectedAliceKernel, bobKernel]),
  ]);
  // if we were to send o+31/lo11, the other side should get ro+20, which is alice
  t.is(getRemoteForLocal(remoteID, 'lo11'), 'ro+20');
  t.is(getLocalForRemote(remoteID, 'ro-20'), 'lo11');
  t.is(getKernelForLocal('lo11'), expectedAliceKernel);
  t.is(getLocalForKernel(expectedAliceKernel), 'lo11');

  // bob!bar(alice, bob), again, to test stability
  // also test absent sequence number
  d.deliver(
    receiverID,
    'receive',
    encodeArgs(`:0:deliver:${bobRemote}:bar::ro-20:${bobRemote};argsbytes`),
    null,
  );
  t.deepEqual(sends.shift(), [
    bobKernel,
    'bar',
    capdata('argsbytes', [expectedAliceKernel, bobKernel]),
  ]);

  // bob!cat(alice, bob, ayana)
  const expectedAyanaKernel = 'o+32';
  d.deliver(
    receiverID,
    'receive',
    encodeArgs(
      `4:0:deliver:${bobRemote}:cat::ro-20:${bobRemote}:ro-21;argsbytes`,
    ),
    null,
  );
  t.deepEqual(sends.shift(), [
    bobKernel,
    'cat',
    capdata('argsbytes', [expectedAliceKernel, bobKernel, expectedAyanaKernel]),
  ]);

  // react to bad sequence number
  t.throws(
    () =>
      d.deliver(
        receiverID,
        'receive',
        encodeArgs(`47:deliver:${bobRemote}:bar::ro-20:${bobRemote};argsbytes`),
        null,
      ),
    { message: /unexpected recv seqNum .*/ },
  );

  // make sure comms can tolerate dropExports, even if it's a no-op
  d.dropExports([expectedAliceKernel, expectedAyanaKernel]);
});

// This tests the various pathways through the comms vat driver.  This has the
// side effect of testing a large portion of the pathways through the comms vat,
// but it is not intended to do that, so don't freak out if there are obvious
// comms vat cases that are not exercised here.
test('comms vat driver', t => {
  const {
    _,
    done,
    setupRemote,
    importFromRemote,
    exportToRemote,
    newImportObject,
    newExportObject,
    newImportPromise,
    newExportPromise,
  } = commsVatDriver(t);

  /* const _oCommsRoot = '@o+0'; // root of the local comms vat (i.e., what's under test) */

  const oLarry = newImportObject('k'); // some object in a local vat, wired to remote
  const oLisa = newImportObject('k'); // some object in a local vat, wired to remote
  const oLou = newImportObject('k'); // some object in a local vat, not wired to remote

  // test setup of remotes with imports and exports
  setupRemote('a');
  const [oAlice, oaAlice] = importFromRemote('a', 21, 'alice');
  const [oAmy, oaAmy] = importFromRemote('a', 22, 'amy');
  const oaLarry = exportToRemote('a', 11, oLarry);
  /* const _oaLisa = */ exportToRemote('a', 12, oLisa);

  setupRemote('b');
  const [_oBob, _oaBob] = importFromRemote('b', 31, 'bob');
  const [_oBert, _oaBert] = importFromRemote('b', 32, 'bert');
  /* const _obLarry = */ exportToRemote('b', 11, oLarry);
  /* const _obLisa = */ exportToRemote('b', 12, oLisa);

  setupRemote('c');
  const [_oCarol, _oaCarol] = importFromRemote('c', 41, 'carol');
  const [_oClem, _oaClem] = importFromRemote('c', 42, 'clem');
  /* const _ocLarry = */ exportToRemote('c', 11, oLarry);
  /* const ocLisa = */ exportToRemote('c', 12, oLisa);

  // Send a message to a remote object
  const pHelloAliceR = newImportPromise('k');
  _('k>m', oAlice, 'hello', pHelloAliceR, 'argz');
  const paHelloAliceR = newExportPromise('a');
  _('a<m', oaAlice, 'hello', paHelloAliceR, 'argz');

  // Send a message to a different remote object
  const pHelloAgainR = newImportPromise('k');
  _('k>m', oAmy, 'helloAgain', pHelloAgainR, 42);
  const paHelloAgainR = newExportPromise('a');
  _('a<m', oaAmy, 'helloAgain', paHelloAgainR, 42);

  // Remote resolves result of first message, leaves second hanging
  _('a>r', [paHelloAliceR, false, 'huzzah!']);
  _('k<r', [pHelloAliceR, false, 'huzzah!']);

  // Remote sends a message to a local object and then local resolves the
  // result.
  const paHelloLarryR = newImportPromise('a');
  _('a>m', oaLarry, 'hiLarry', paHelloLarryR, 99);
  const pHelloLarryR = newExportPromise('k');
  _('k<m', oLarry, 'hiLarry', pHelloLarryR, 99);
  _('k<s', pHelloLarryR);
  _('k>r', [pHelloLarryR, false, 'yes']);
  _('a<r', [paHelloLarryR, false, 'yes']);

  // Send a message to a remote object with a (previously unexported) local
  // object as a parameter, then receive the result.
  let pResult = newImportPromise('k');
  _('k>m', oAlice, 'passObjOut', pResult, oLou);
  let paResult = newExportPromise('a');
  const oaLou = newExportObject('a');
  _('a<m', oaAlice, 'passObjOut', paResult, oaLou);
  _('a>r', [paResult, false, 47]);
  _('k<r', [pResult, false, 47]);

  // Remote sends a message to a local object with a (previously unseen) remote
  // object as a parameter, then local resolves the result.
  paResult = newImportPromise('a');
  const oaArnold = newImportObject('a');
  _('a>m', oaLarry, 'passObjIn', paResult, oaArnold);
  pResult = newExportPromise('k');
  const oArnold = newExportObject('k');
  _('k<m', oLarry, 'passObjIn', pResult, oArnold);
  _('k<s', pResult);
  _('k>r', [pResult, false, 42]);
  _('a<r', [paResult, false, 42]);

  done();
});

test('retire result promise on outbound message', t => {
  const {
    _,
    done,
    state,
    setupRemote,
    importFromRemote,
    newImportPromise,
    newExportPromise,
    refOf,
    flipRefOf,
  } = commsVatDriver(t);

  setupRemote('a');
  const remoteA = state.remotes.get(state.names.get('a'));
  const [oAlice, oaAlice] = importFromRemote('a', 21, 'alice');

  // Larry sends a message to Alice...
  const pResult = newImportPromise('k');
  _('k>m', oAlice, 'hello', pResult, 47);
  const paResult = newExportPromise('a');
  _('a<m', oaAlice, 'hello', paResult, 47);

  // There should be appropriate c-list entries for the result pathway
  const plResult = state.fromKernel.get(refOf(pResult));
  t.truthy(plResult);
  t.is(state.toKernel.get(plResult), refOf(pResult));
  t.is(remoteA.toRemote.get(plResult), flipRefOf(paResult));
  t.is(remoteA.fromRemote.get(refOf(paResult)), plResult);

  // ...and then Alice resolves the answer
  _('a>r', [paResult, false, 42]);
  _('k<r', [pResult, false, 42]);

  // Now all those c-list entries should be gone
  t.falsy(state.fromKernel.has(refOf(pResult)));
  t.falsy(state.toKernel.has(plResult));
  t.falsy(remoteA.toRemote.has(plResult));
  t.falsy(remoteA.fromRemote.has(refOf(paResult)));

  done();
});

test('retire result promise on inbound message', t => {
  const {
    _,
    done,
    state,
    setupRemote,
    exportToRemote,
    newImportObject,
    newImportPromise,
    newExportPromise,
    refOf,
    flipRefOf,
  } = commsVatDriver(t);

  setupRemote('a');
  const remoteA = state.remotes.get(state.names.get('a'));
  const oLarry = newImportObject('k');
  const oaLarry = exportToRemote('a', 11, oLarry);

  // Alice sends a message to Larry...
  const paResult = newImportPromise('a');
  _('a>m', oaLarry, 'hello', paResult, 47);
  const pResult = newExportPromise('k');
  _('k<m', oLarry, 'hello', pResult, 47);
  _('k<s', pResult);

  // There should be appropriate c-list entries for the result pathway
  const plResult = state.fromKernel.get(refOf(pResult));
  t.truthy(plResult);
  t.is(state.toKernel.get(plResult), refOf(pResult));
  t.is(remoteA.toRemote.get(plResult), flipRefOf(paResult));
  t.is(remoteA.fromRemote.get(refOf(paResult)), plResult);

  // ...and then Larry resolves the answer
  _('k>r', [pResult, false, 42]);
  _('a<r', [paResult, false, 42]);

  // Now the kernel c-list entries and the outbound remote c-list entry should
  // be gone but the inbound remote c-list entry should still be there
  t.falsy(state.fromKernel.has(refOf(pResult)));
  t.falsy(state.toKernel.has(plResult));
  t.falsy(remoteA.toRemote.has(plResult));
  t.truthy(remoteA.fromRemote.has(refOf(paResult)));

  // Then the remote sends some traffic, which will contain an ack
  _('a>m', oaLarry, 'more', undefined);
  _('k<m', oLarry, 'more', undefined);

  // And now the inbound remote c-list entry should be gone too.
  t.falsy(remoteA.fromRemote.has(refOf(paResult)));

  done();
});

// prettier-ignore
test('retire inbound promises', t => {
  const {
    _,
    done,
    state,
    setupRemote,
    exportToRemote,
    newImportObject,
    newImportPromise,
    newExportPromise,
    refOf,
    flipRefOf,
  } = commsVatDriver(t);

  setupRemote('a');
  const remoteA = state.remotes.get(state.names.get('a'));
  const oLarry = newImportObject('k');
  const oaLarry = exportToRemote('a', 11, oLarry);

  // Alice sends a message to Larry containing two promises...
  const paPromise1 = newImportPromise('a');
  const paPromise2 = newImportPromise('a');
  _('a>m', oaLarry, 'hello', undefined, paPromise1, paPromise2);
  const pPromise1 = newExportPromise('k');
  const pPromise2 = newExportPromise('k');
  _('k<m', oLarry, 'hello', undefined, pPromise1, pPromise2);

  // There should be appropriate c-list entries for both promises
  const plPromise1 = state.fromKernel.get(refOf(pPromise1));
  t.truthy(plPromise1);
  t.is(state.toKernel.get(plPromise1), refOf(pPromise1));
  t.is(remoteA.toRemote.get(plPromise1), flipRefOf(paPromise1));
  t.is(remoteA.fromRemote.get(refOf(paPromise1)), plPromise1);

  const plPromise2 = state.fromKernel.get(refOf(pPromise2));
  t.truthy(plPromise2);
  t.is(state.toKernel.get(plPromise2), refOf(pPromise2));
  t.is(remoteA.toRemote.get(plPromise2), flipRefOf(paPromise2));
  t.is(remoteA.fromRemote.get(refOf(paPromise2)), plPromise2);

  // ...and then Alice resolves the promises, recursively referencing each other
  _('a>r', [paPromise1, false, [paPromise2]], [paPromise2, false, [paPromise1]]);
  _('k<r', [pPromise1, false, [pPromise2]], [pPromise2, false, [pPromise1]]);

  // Now all the c-list entries should be gone
  t.falsy(state.fromKernel.has(refOf(pPromise1)));
  t.falsy(state.toKernel.has(plPromise1));
  t.falsy(remoteA.toRemote.has(plPromise1));
  t.falsy(remoteA.fromRemote.has(refOf(paPromise1)));

  t.falsy(state.fromKernel.has(refOf(pPromise2)));
  t.falsy(state.toKernel.has(plPromise2));
  t.falsy(remoteA.toRemote.has(plPromise2));
  t.falsy(remoteA.fromRemote.has(refOf(paPromise2)));

  done();
});

// prettier-ignore
test('retire outbound promises', t => {
  const {
    _,
    done,
    state,
    setupRemote,
    importFromRemote,
    exportToRemote,
    newImportObject,
    newImportPromise,
    newExportPromise,
    refOf,
    flipRefOf,
  } = commsVatDriver(t);

  setupRemote('a');
  const remoteA = state.remotes.get(state.names.get('a'));
  const [oAlice, oaAlice] = importFromRemote('a', 21, 'alice');
  const oLarry = newImportObject('k');
  const oaLarry = exportToRemote('a', 11, oLarry);

  // Larry sends a message to Alice containing two promises...
  const pPromise1 = newImportPromise('k');
  const pPromise2 = newImportPromise('k');
  _('k>m', oAlice, 'hello', undefined, pPromise1, pPromise2);
  _('k<s', pPromise1);
  _('k<s', pPromise2);
  const paPromise1 = newExportPromise('a');
  const paPromise2 = newExportPromise('a');
  _('a<m', oaAlice, 'hello', undefined, paPromise1, paPromise2);

  // There should be appropriate c-list entries for both promises
  const plPromise1 = state.fromKernel.get(refOf(pPromise1));
  t.truthy(plPromise1);
  t.is(state.toKernel.get(plPromise1), refOf(pPromise1));
  t.is(remoteA.toRemote.get(plPromise1), flipRefOf(paPromise1));
  t.is(remoteA.fromRemote.get(refOf(paPromise1)), plPromise1);

  const plPromise2 = state.fromKernel.get(refOf(pPromise2));
  t.truthy(plPromise2);
  t.is(state.toKernel.get(plPromise2), refOf(pPromise2));
  t.is(remoteA.toRemote.get(plPromise2), flipRefOf(paPromise2));
  t.is(remoteA.fromRemote.get(refOf(paPromise2)), plPromise2);

  // ...and then Larry resolves the promises, recursively referencing each other
  _('k>r', [pPromise1, false, [pPromise2]], [pPromise2, false, [pPromise1]]);
  _('a<r', [paPromise1, false, [paPromise2]], [paPromise2, false, [paPromise1]]);

  // Now the kernel c-list entries and the outbound remote c-list entries should
  // be gone but the inbound remote c-list entries should still be there
  t.falsy(state.fromKernel.has(refOf(pPromise1)));
  t.falsy(state.toKernel.has(plPromise1));
  t.falsy(remoteA.toRemote.has(plPromise1));
  t.truthy(remoteA.fromRemote.has(refOf(paPromise1)));

  t.falsy(state.fromKernel.has(refOf(pPromise2)));
  t.falsy(state.toKernel.has(plPromise2));
  t.falsy(remoteA.toRemote.has(plPromise2));
  t.truthy(remoteA.fromRemote.has(refOf(paPromise2)));

  // Then the remote sends some traffic, which will contain an ack
  _('a>m', oaLarry, 'more', undefined);
  _('k<m', oLarry, 'more', undefined);

  // And now the inbound remote c-list entries should be gone too.
  t.falsy(remoteA.fromRemote.has(refOf(paPromise1)));
  t.falsy(remoteA.fromRemote.has(refOf(paPromise2)));

  done();
});

// The next two tests only exercise the case of an outbound resolve and an
// inbound message crossing in flight.  The opposite case, an inbound resolve
// and an outbound message, experiences the asynchrony in the comms vat at the
// other end of the remote connection, which in this test world doesn't exist
// because everything other than the local comms vat is make believe here.

// prettier-ignore
test('outbound promise resolution and inbound message to it crossing in flight', t => {
  const {
    _,
    done,
    setupRemote,
    importFromRemote,
    newImportObject,
    newExportObject,
    newImportPromise,
    newExportPromise,
    refOf,
  } = commsVatDriver(t);

  setupRemote('a');
  const [oAlice, oaAlice] = importFromRemote('a', 21, 'alice');

  // Larry sends a message to Alice containing a promise for which Larry is the
  // decider...
  const pPromise = newImportPromise('k');
  _('k>m', oAlice, 'hello', undefined, pPromise);
  _('k<s', pPromise);
  const paPromise = newExportPromise('a');
  _('a<m', oaAlice, 'hello', undefined, paPromise);

  // ...and then Larry resolves the promise to Lisa
  const oLisa = newImportObject('k');
  const oaLisa = newExportObject('a');
  _('k>r', [pPromise, false, oLisa]);
  _('a:l', 1); // lag Alice so she acks resolve after she sends 'talkback'
  _('a<r', [paPromise, false, oaLisa]);

  // Meanwhile, Alice sends a message to the promise without having seen the
  // resolution, so comms vat sends it to Lisa itself.
  _('a>m', paPromise, 'talkback', undefined);
  _('k<m', oLisa, 'talkback', undefined);

  _('a:l', 0); // lag ends, talking to the now retired promise should error
  t.throws(
    () => _('a>m', paPromise, 'talkback', undefined),
    { message: `"${refOf(paPromise)}" must already be in "remote1 (a)"` },
  );

  done();
});

test('outbound promise resolution and inbound message containing it crossing in flight', t => {
  const {
    _,
    done,
    setupRemote,
    importFromRemote,
    exportToRemote,
    newImportObject,
    newExportObject,
    newImportPromise,
    newExportPromise,
  } = commsVatDriver(t);

  setupRemote('a');
  const [oAlice, oaAlice] = importFromRemote('a', 21, 'alice');
  const oLarry = newImportObject('k');
  const oaLarry = exportToRemote('a', 11, oLarry);

  // Larry sends a message to Alice containing a promise for which Larry is the
  // decider...
  const pPromise = newImportPromise('k');
  _('k>m', oAlice, 'hello', undefined, pPromise);
  _('k<s', pPromise);
  const paPromise = newExportPromise('a');
  _('a<m', oaAlice, 'hello', undefined, paPromise);

  // ...and then Larry resolves the promise to Lisa
  const oLisa = newImportObject('k');
  const oaLisa = newExportObject('a');
  _('k>r', [pPromise, false, oLisa]);
  _('a:l', 1); // lag Alice so she acks resolve after she sends 'talkback'
  _('a<r', [paPromise, false, oaLisa]);

  // Meanwhile, Alice sends a message containing the promise as an arg without
  // having seen the resolution, so comms vat sends it to Lisa itself.
  _('a>m', oaLarry, 'talkback', undefined, paPromise);
  const pPromise2 = newExportPromise('k');
  _('k<m', oLarry, 'talkback', undefined, pPromise2);
  _('k<r', [pPromise2, false, oLisa]);

  done();
});

test('resolutions crossing in flight', t => {
  const {
    _,
    done,
    setupRemote,
    importFromRemote,
    newImportObject,
    newExportObject,
    newImportPromise,
    newExportPromise,
  } = commsVatDriver(t);

  setupRemote('a');
  const [oAlice, oaAlice] = importFromRemote('a', 21, 'alice');

  // Larry sends a message to Alice expecting a result Y and containing a
  // promise X as an argument.
  const pPromiseX = newImportPromise('k');
  const pPromiseY = newImportPromise('k');
  _('k>m', oAlice, 'hello', pPromiseY, pPromiseX);
  _('k<s', pPromiseX);
  const paPromiseY = newExportPromise('a');
  const paPromiseX = newExportPromise('a');
  _('a<m', oaAlice, 'hello', paPromiseY, paPromiseX);

  // Larry resolves X to Lisa
  const oLisa = newImportObject('k');
  const oaLisa = newExportObject('a');
  _('k>r', [pPromiseX, false, oLisa]);
  _('a:l', 1); // lag Alice so she acks resolve after she sends resolve of Y
  _('a<r', [paPromiseX, false, oaLisa]);

  // Meanwhile, Alice resolves Y to a value containing X.
  _('a>r', [paPromiseY, false, [paPromiseX]]);

  // Resolution of X from comms vat to Alice crosses with the resolution of Y from
  // Alice to the comms vat, so that the resolution of Y arrives containing an X
  // which is already known to the comms vat to be Lisa.

  // Comms vat delivers (to Larry) a resolve of Y to a value containing X`
  // and a resolve of X' to Lisa.
  const pPromiseX2 = newExportPromise('k');
  _('k<r', [pPromiseY, false, [pPromiseX2]], [pPromiseX2, false, oLisa]);

  done();
});

test('intra comms vat message routing', t => {
  const {
    _,
    done,
    setupRemote,
    importFromRemote,
    exportToRemote,
    newImportObject,
    newExportObject,
  } = commsVatDriver(t);

  setupRemote('a');
  const [_oAlice, _oaAlice] = importFromRemote('a', 21, 'alice');
  const oLarry = newImportObject('k');
  const oaLarry = exportToRemote('a', 11, oLarry);

  setupRemote('b');
  const [oBob, obBob] = importFromRemote('b', 31, 'bob');

  // Alice sends Amy to Larry
  const oaAmy = newImportObject('a');
  _('a>m', oaLarry, 'meetAmy', undefined, oaAmy);
  const oAmy = newExportObject('k');
  _('k<m', oLarry, 'meetAmy', undefined, oAmy);

  // Larry sends Amy to Bob
  _('k>m', oBob, 'meetAmy', undefined, oAmy);
  const obAmy = newExportObject('b');
  _('b<m', obBob, 'meetAmy', undefined, obAmy);

  // Bob sends a Bert to Amy
  const obBert = newImportObject('b');
  _('b>m', obAmy, 'meetBert', undefined, obBert);
  const oaBert = newExportObject('a');
  _('a<m', oaAmy, 'meetBert', undefined, oaBert);

  done();
});
