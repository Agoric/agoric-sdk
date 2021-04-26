import { test } from '../tools/prepare-test-env-ava';

import buildCommsDispatch from '../src/vats/comms';
import { flipRemoteSlot } from '../src/vats/comms/parseRemoteSlot';
import { makeState } from '../src/vats/comms/state';
import { makeCListKit } from '../src/vats/comms/clist';
import { debugState } from '../src/vats/comms/dispatch';
import {
  makeMessage,
  makeDropExports,
  makeRetireExports,
  makeRetireImports,
} from './util';
import { commsVatDriver } from './commsVatDriver';

test('provideRemoteForLocal', t => {
  const s = makeState(null, 0);
  s.initialize();
  const fakeSyscall = {};
  const clistKit = makeCListKit(s, fakeSyscall);
  const { provideRemoteForLocal } = clistKit;
  const { remoteID } = s.addRemote('remote1', 'o-1');

  // n.b.: duplicated provideRemoteForLocal() call is not a cut-n-paste error
  // but a test that translation is stable
  t.is(provideRemoteForLocal(remoteID, 'lo4'), 'ro-20');
  t.is(provideRemoteForLocal(remoteID, 'lo4'), 'ro-20');
  t.is(provideRemoteForLocal(remoteID, 'lo5'), 'ro-21');
});

function mockSyscall() {
  const sends = [];
  const fakestore = new Map();
  const syscall = harden({
    send(targetSlot, method, args) {
      sends.push([targetSlot, method, args]);
      return 'r-1';
    },
    subscribe(_targetSlot) {},
    vatstoreGet(key) {
      return fakestore.get(key);
    },
    vatstoreSet(key, value) {
      fakestore.set(key, value);
    },
    vatstoreDelete(key) {
      fakestore.delete(key);
    },
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
  const dispatch = buildCommsDispatch(syscall, 'fakestate', 'fakehelpers');
  const { state, clistKit } = debugState.get(dispatch);
  state.initialize();
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
  const { remoteID } = state.addRemote('remote1', transmitterID);
  const bobLocal = provideLocalForRemote(remoteID, 'ro-23');
  const bobKernel = provideKernelForLocal(bobLocal);

  // now tell the comms vat to send a message to a remote machine, the
  // equivalent of bob!foo()
  dispatch(makeMessage(bobKernel, 'foo', capdata('argsbytes', [])));
  t.deepEqual(sends.shift(), [
    transmitterID,
    'transmit',
    encodeArgs('1:0:deliver:ro+23:foo:;argsbytes'),
  ]);

  // bob!bar(alice, bob)
  dispatch(
    makeMessage(
      bobKernel,
      'bar',
      capdata('argsbytes', [aliceKernel, bobKernel]),
    ),
  );
  t.deepEqual(sends.shift(), [
    transmitterID,
    'transmit',
    encodeArgs('2:0:deliver:ro+23:bar::ro-20:ro+23;argsbytes'),
  ]);
  // the outbound ro-20 should match an inbound ro+20, both represent 'alice'
  t.is(getLocalForRemote(remoteID, 'ro+20'), aliceLocal);
  // do it again, should use same values
  dispatch(
    makeMessage(
      bobKernel,
      'bar',
      capdata('argsbytes', [aliceKernel, bobKernel]),
    ),
  );
  t.deepEqual(sends.shift(), [
    transmitterID,
    'transmit',
    encodeArgs('3:0:deliver:ro+23:bar::ro-20:ro+23;argsbytes'),
  ]);

  // bob!cat(alice, bob, ayana)
  const ayanaKernel = 'o-11';
  dispatch(
    makeMessage(
      bobKernel,
      'cat',
      capdata('argsbytes', [aliceKernel, bobKernel, ayanaKernel]),
    ),
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
  const dispatch = buildCommsDispatch(syscall, 'fakestate', 'fakehelpers');
  const { state, clistKit } = debugState.get(dispatch);
  state.initialize();
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
  const { remoteID, receiverID } = state.addRemote('remote1', transmitterID);
  const bobRemote = flipRemoteSlot(provideRemoteForLocal(remoteID, bobLocal));
  t.is(bobRemote, 'ro+20');

  // now pretend the transport layer received a message from remote1, as if
  // the remote machine had performed bob!foo()
  dispatch(
    makeMessage(
      receiverID,
      'receive',
      encodeArgs(`1:0:deliver:${bobRemote}:foo:;argsbytes`),
    ),
  );
  t.deepEqual(sends.shift(), [bobKernel, 'foo', capdata('argsbytes')]);

  // bob!bar(alice, bob)
  dispatch(
    makeMessage(
      receiverID,
      'receive',
      encodeArgs(`2:0:deliver:${bobRemote}:bar::ro-20:${bobRemote};argsbytes`),
    ),
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
  dispatch(
    makeMessage(
      receiverID,
      'receive',
      encodeArgs(`:0:deliver:${bobRemote}:bar::ro-20:${bobRemote};argsbytes`),
    ),
  );
  t.deepEqual(sends.shift(), [
    bobKernel,
    'bar',
    capdata('argsbytes', [expectedAliceKernel, bobKernel]),
  ]);

  // bob!cat(alice, bob, ayana)
  const expectedAyanaKernel = 'o+32';
  dispatch(
    makeMessage(
      receiverID,
      'receive',
      encodeArgs(
        `4:0:deliver:${bobRemote}:cat::ro-20:${bobRemote}:ro-21;argsbytes`,
      ),
    ),
  );
  t.deepEqual(sends.shift(), [
    bobKernel,
    'cat',
    capdata('argsbytes', [expectedAliceKernel, bobKernel, expectedAyanaKernel]),
  ]);

  // react to bad sequence number
  t.throws(
    () =>
      dispatch(
        makeMessage(
          receiverID,
          'receive',
          encodeArgs(
            `47:deliver:${bobRemote}:bar::ro-20:${bobRemote};argsbytes`,
          ),
        ),
      ),
    { message: /unexpected recv seqNum .*/ },
  );

  // make sure comms can tolerate GC operations, even if they're a no-op
  dispatch(makeDropExports(expectedAliceKernel, expectedAyanaKernel));
  dispatch(makeRetireExports(expectedAliceKernel, expectedAyanaKernel));
  // Sending retireImport into a vat that hasn't yet emitted dropImport is
  // rude, and would only happen if the exporter unilaterally revoked the
  // object's identity. Normally the kernel would only send retireImport
  // after receiving dropImport (and sending a dropExport into the exporter,
  // and getting a retireExport from the exporter, gracefully terminating the
  // object's identity). We do it the rude way because it's good enough to
  // test the comms vat can tolerate it, but we may have to update this when
  // we implement retireImport for real.
  dispatch(makeRetireImports(bobKernel));
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
  const remoteA = state.getRemote(state.getRemoteIDForName('a'));
  const [oAlice, oaAlice] = importFromRemote('a', 21, 'alice');

  // Larry sends a message to Alice...
  const pResult = newImportPromise('k');
  _('k>m', oAlice, 'hello', pResult, 47);
  const paResult = newExportPromise('a');
  _('a<m', oaAlice, 'hello', paResult, 47);

  // There should be appropriate c-list entries for the result pathway
  const plResult = state.mapFromKernel(refOf(pResult));
  t.truthy(plResult);
  t.is(state.mapToKernel(plResult), refOf(pResult));
  t.is(remoteA.mapToRemote(plResult), flipRefOf(paResult));
  t.is(remoteA.mapFromRemote(refOf(paResult)), plResult);
  t.is(state.getPromiseStatus(plResult), 'unresolved');

  // ...and then Alice resolves the answer
  _('a>r', [paResult, false, 42]);
  _('k<r', [pResult, false, 42]);

  // Now all those c-list entries and the local promise itself should be gone
  t.falsy(state.mapFromKernel(refOf(pResult)));
  t.falsy(state.mapToKernel(plResult));
  t.falsy(remoteA.mapToRemote(plResult));
  t.falsy(remoteA.mapFromRemote(refOf(paResult)));
  t.is(state.getPromiseStatus(plResult), undefined);

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
  const remoteA = state.getRemote(state.getRemoteIDForName('a'));
  const oLarry = newImportObject('k');
  const oaLarry = exportToRemote('a', 11, oLarry);

  // Alice sends a message to Larry...
  const paResult = newImportPromise('a');
  _('a>m', oaLarry, 'hello', paResult, 47);
  const pResult = newExportPromise('k');
  _('k<m', oLarry, 'hello', pResult, 47);
  _('k<s', pResult);

  // There should be appropriate c-list entries for the result pathway
  const plResult = state.mapFromKernel(refOf(pResult));
  t.truthy(plResult);
  t.is(state.mapToKernel(plResult), refOf(pResult));
  t.is(remoteA.mapToRemote(plResult), flipRefOf(paResult));
  t.is(remoteA.mapFromRemote(refOf(paResult)), plResult);
  t.is(state.getPromiseStatus(plResult), 'unresolved');

  // ...and then Larry resolves the answer
  _('k>r', [pResult, false, 42]);
  _('a<r', [paResult, false, 42]);

  // Now the kernel c-list entries and the outbound remote c-list entry should
  // be gone but the inbound remote c-list entry should still be there.  The
  // result promise should also still be there, but be in a resolved state.
  t.falsy(state.mapFromKernel(refOf(pResult)));
  t.falsy(state.mapToKernel(plResult));
  t.falsy(remoteA.mapToRemote(plResult));
  t.truthy(remoteA.mapFromRemote(refOf(paResult)));
  t.is(state.getPromiseStatus(plResult), 'fulfilled');

  // Then the remote sends some traffic, which will contain an ack
  _('a>m', oaLarry, 'more', undefined);
  _('k<m', oLarry, 'more', undefined);

  // And now the inbound remote c-list entry and the promise itself should be
  // gone too.
  t.falsy(remoteA.mapFromRemote(refOf(paResult)));
  t.is(state.getPromiseStatus(plResult), undefined);

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
  const remoteA = state.getRemote(state.getRemoteIDForName('a'));
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
  const plPromise1 = state.mapFromKernel(refOf(pPromise1));
  t.truthy(plPromise1);
  t.is(state.mapToKernel(plPromise1), refOf(pPromise1));
  t.is(remoteA.mapToRemote(plPromise1), flipRefOf(paPromise1));
  t.is(remoteA.mapFromRemote(refOf(paPromise1)), plPromise1);

  const plPromise2 = state.mapFromKernel(refOf(pPromise2));
  t.truthy(plPromise2);
  t.is(state.mapToKernel(plPromise2), refOf(pPromise2));
  t.is(remoteA.mapToRemote(plPromise2), flipRefOf(paPromise2));
  t.is(remoteA.mapFromRemote(refOf(paPromise2)), plPromise2);

  // ...and then Alice resolves the promises, recursively referencing each other
  _('a>r', [paPromise1, false, [paPromise2]], [paPromise2, false, [paPromise1]]);
  _('k<r', [pPromise1, false, [pPromise2]], [pPromise2, false, [pPromise1]]);

  // Now all the c-list entries should be gone
  t.falsy(state.mapFromKernel(refOf(pPromise1)));
  t.falsy(state.mapToKernel(plPromise1));
  t.falsy(remoteA.mapToRemote(plPromise1));
  t.falsy(remoteA.mapFromRemote(refOf(paPromise1)));

  t.falsy(state.mapFromKernel(refOf(pPromise2)));
  t.falsy(state.mapToKernel(plPromise2));
  t.falsy(remoteA.mapToRemote(plPromise2));
  t.falsy(remoteA.mapFromRemote(refOf(paPromise2)));

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
  const remoteA = state.getRemote(state.getRemoteIDForName('a'));
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
  const plPromise1 = state.mapFromKernel(refOf(pPromise1));
  t.truthy(plPromise1);
  t.is(state.mapToKernel(plPromise1), refOf(pPromise1));
  t.is(remoteA.mapToRemote(plPromise1), flipRefOf(paPromise1));
  t.is(remoteA.mapFromRemote(refOf(paPromise1)), plPromise1);

  const plPromise2 = state.mapFromKernel(refOf(pPromise2));
  t.truthy(plPromise2);
  t.is(state.mapToKernel(plPromise2), refOf(pPromise2));
  t.is(remoteA.mapToRemote(plPromise2), flipRefOf(paPromise2));
  t.is(remoteA.mapFromRemote(refOf(paPromise2)), plPromise2);

  // ...and then Larry resolves the promises, recursively referencing each other
  _('k>r', [pPromise1, false, [pPromise2]], [pPromise2, false, [pPromise1]]);
  _('a<r', [paPromise1, false, [paPromise2]], [paPromise2, false, [paPromise1]]);

  // Now the kernel c-list entries and the outbound remote c-list entries should
  // be gone but the inbound remote c-list entries should still be there
  t.falsy(state.mapFromKernel(refOf(pPromise1)));
  t.falsy(state.mapToKernel(plPromise1));
  t.falsy(remoteA.mapToRemote(plPromise1));
  t.truthy(remoteA.mapFromRemote(refOf(paPromise1)));

  t.falsy(state.mapFromKernel(refOf(pPromise2)));
  t.falsy(state.mapToKernel(plPromise2));
  t.falsy(remoteA.mapToRemote(plPromise2));
  t.truthy(remoteA.mapFromRemote(refOf(paPromise2)));

  // Then the remote sends some traffic, which will contain an ack
  _('a>m', oaLarry, 'more', undefined);
  _('k<m', oLarry, 'more', undefined);

  // And now the inbound remote c-list entries should be gone too.
  t.falsy(remoteA.mapFromRemote(refOf(paPromise1)));
  t.falsy(remoteA.mapFromRemote(refOf(paPromise2)));

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
    state,
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

  // Promise should now exist in the comms vat in an unresolved state
  const plPromise = state.mapFromKernel(refOf(pPromise));
  t.is(state.getPromiseStatus(plPromise), 'unresolved');

  // ...and then Larry resolves the promise to Lisa
  const oLisa = newImportObject('k');
  const oaLisa = newExportObject('a');
  _('k>r', [pPromise, false, oLisa]);
  _('a:l', 1); // lag Alice so she acks resolve after she sends 'talkback'
  _('a<r', [paPromise, false, oaLisa]);

  // Promise should now be fulfilled in the comms vat
  t.is(state.getPromiseStatus(plPromise), 'fulfilled');

  // Meanwhile, Alice sends a message to the promise without having seen the
  // resolution, so comms vat sends it to Lisa itself.
  _('a>m', paPromise, 'talkback', undefined);
  _('k<m', oLisa, 'talkback', undefined);

  // Promise should still be in the comms vat, because no ack yet
  t.is(state.getPromiseStatus(plPromise), 'fulfilled');

  _('a:l', 0); // lag ends, talking to the now retired promise should error
  t.throws(
    () => _('a>m', paPromise, 'talkback', undefined),
    { message: `"${refOf(paPromise)}" must already be in remote "r1 (a)"` },
  );

  // Alice should be able to address Lisa directly & the promise should be gone
  _('a>m', oaLisa, 'moretalk', undefined);
  _('k<m', oLisa, 'moretalk', undefined);
  t.is(state.getPromiseStatus(plPromise), undefined);

  done();
});

test('outbound promise resolution and inbound message containing it crossing in flight', t => {
  const {
    _,
    done,
    state,
    setupRemote,
    importFromRemote,
    exportToRemote,
    newImportObject,
    newExportObject,
    newImportPromise,
    newExportPromise,
    refOf,
  } = commsVatDriver(t);

  setupRemote('a');
  const remoteA = state.getRemote(state.getRemoteIDForName('a'));
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

  // Promise should now exist in the comms vat in an unresolved state
  const plPromise = remoteA.mapFromRemote(refOf(paPromise));
  t.is(state.getPromiseStatus(plPromise), 'unresolved');

  // ...and then Larry resolves the promise to Lisa
  const oLisa = newImportObject('k');
  const oaLisa = newExportObject('a');
  _('k>r', [pPromise, false, oLisa]);
  _('a:l', 1); // lag Alice so she acks resolve after she sends 'talkback'
  _('a<r', [paPromise, false, oaLisa]);

  // Promise should now be fulfilled in the comms vat
  t.is(state.getPromiseStatus(plPromise), 'fulfilled');

  // Meanwhile, Alice sends a message containing the promise as an arg without
  // having seen the resolution, so comms vat sends it to Lisa itself.
  _('a>m', oaLarry, 'talkback', undefined, paPromise);
  const pPromise2 = newExportPromise('k');
  _('k<m', oLarry, 'talkback', undefined, pPromise2);
  _('k<r', [pPromise2, false, oLisa]);
  _('a:l', 0); // get rid of the lag so next message catches up the acks

  // Alice should be able to address Lisa directly & the promise should be gone
  _('a>m', oaLisa, 'moretalk', undefined);
  _('k<m', oLisa, 'moretalk', undefined);
  t.is(state.getPromiseStatus(plPromise), undefined);

  done();
});

test('resolutions crossing in flight', t => {
  const {
    _,
    done,
    state,
    setupRemote,
    importFromRemote,
    exportToRemote,
    newImportObject,
    newExportObject,
    newImportPromise,
    newExportPromise,
    refOf,
  } = commsVatDriver(t);

  setupRemote('a');
  const [oAlice, oaAlice] = importFromRemote('a', 21, 'alice');
  const oLarry = newImportObject('k');
  const oaLarry = exportToRemote('a', 11, oLarry);

  // Larry sends a message to Alice expecting a result Y and containing a
  // promise X as an argument.
  const pPromiseX = newImportPromise('k');
  const pPromiseY = newImportPromise('k');
  _('k>m', oAlice, 'hello', pPromiseY, pPromiseX);
  _('k<s', pPromiseX);
  const paPromiseY = newExportPromise('a');
  const paPromiseX = newExportPromise('a');
  _('a<m', oaAlice, 'hello', paPromiseY, paPromiseX);

  // Both X and Y should now exist in the comms vat in an unresolved state
  const plPromiseX = state.mapFromKernel(refOf(pPromiseX));
  t.is(state.getPromiseStatus(plPromiseX), 'unresolved');
  const plPromiseY = state.mapFromKernel(refOf(pPromiseY));
  t.is(state.getPromiseStatus(plPromiseY), 'unresolved');

  // Larry resolves X to Lisa
  const oLisa = newImportObject('k');
  const oaLisa = newExportObject('a');
  _('k>r', [pPromiseX, false, oLisa]);
  _('a:l', 1); // lag Alice so she acks resolve after she sends resolve of Y
  _('a<r', [paPromiseX, false, oaLisa]);

  // X should be fulfilled but Y still unresolved
  t.is(state.getPromiseStatus(plPromiseX), 'fulfilled');
  t.is(state.getPromiseStatus(plPromiseY), 'unresolved');

  // Meanwhile, Alice resolves Y to a value containing X.
  _('a>r', [paPromiseY, false, [paPromiseX]]);

  // Resolution of X from comms vat to Alice crosses with the resolution of Y from
  // Alice to the comms vat, so that the resolution of Y arrives containing an X
  // which is already known to the comms vat to be Lisa.

  // Comms vat delivers (to Larry) a resolve of Y to a value containing X`
  // and a resolve of X' to Lisa.
  const pPromiseX2 = newExportPromise('k');
  _('k<r', [pPromiseY, false, [pPromiseX2]], [pPromiseX2, false, oLisa]);
  _('a:l', 0); // get rid of the lag so next message catches up the acks

  // X should still be fulfilled awaiting ack from Alice, but Y is now gone
  // since the resolve went from Alice into the kernel
  t.is(state.getPromiseStatus(plPromiseX), 'fulfilled');
  t.is(state.getPromiseStatus(plPromiseY), undefined);

  // Another message from Alice should bring the acks up to date, which will
  // make X disappear
  _('a>m', oaLarry, 'moretalk', undefined);
  _('k<m', oLarry, 'moretalk', undefined);
  t.is(state.getPromiseStatus(plPromiseX), undefined);

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

test('return promise sent to third party', t => {
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
  } = commsVatDriver(t);

  setupRemote('a');
  const [oAlice, oaAlice] = importFromRemote('a', 21, 'alice');
  const oLarry = newImportObject('k');
  /* const oaLarry = */ exportToRemote('a', 11, oLarry);

  setupRemote('b');
  const [oBob, obBob] = importFromRemote('b', 31, 'bob');
  const obLarry = exportToRemote('b', 11, oLarry);

  // Larry sends a request to Alice expecting a result
  const pResult = newImportPromise('k');
  _('k>m', oAlice, 'doSomething', pResult);
  const paResult = newExportPromise('a');
  _('a<m', oaAlice, 'doSomething', paResult);
  const plResult = state.mapFromKernel(refOf(pResult));

  // Larry sends the result promise to Bob
  _('k>m', oBob, 'considerThis', undefined, pResult);
  _('k<s', pResult);
  const pbResult = newExportPromise('b');
  _('b<m', obBob, 'considerThis', undefined, pbResult);

  // Alice resolves the result, notifying both Larry and Bob
  _('a>r', [paResult, false, 42]);
  _('b<r', [pbResult, false, 42]);
  _('k<r', [pResult, false, 42]);

  // Promise is still there until Bob acks the resolve, then it goes away
  t.is(state.getPromiseStatus(plResult), 'fulfilled');
  _('b>m', obLarry, 'hi', undefined);
  _('k<m', oLarry, 'hi', undefined);
  t.is(state.getPromiseStatus(plResult), undefined);

  done();
});

function twoAcksTest(t, aliceFirst) {
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
  } = commsVatDriver(t);

  setupRemote('a');
  const [oAlice, oaAlice] = importFromRemote('a', 21, 'alice');
  const oLarry = newImportObject('k');
  const oaLarry = exportToRemote('a', 11, oLarry);

  setupRemote('b');
  const [oBob, obBob] = importFromRemote('b', 31, 'bob');
  const obLarry = exportToRemote('b', 11, oLarry);

  // Larry sends a message to Alice containing a promise
  const pPromise = newImportPromise('k');
  _('k>m', oAlice, 'hello', undefined, pPromise);
  _('k<s', pPromise);
  const paPromise = newExportPromise('a');
  _('a<m', oaAlice, 'hello', undefined, paPromise);
  const plPromise = state.mapFromKernel(refOf(pPromise));

  // Larry sends a message to Bob containing the same promise
  _('k>m', oBob, 'hello', undefined, pPromise);
  _('k<s', pPromise);
  const pbPromise = newExportPromise('b');
  _('b<m', obBob, 'hello', undefined, pbPromise);

  // Larry resolves the promise, notifying both Alice and Bob
  _('k>r', [pPromise, false, 42]);
  _('a<r', [paPromise, false, 42]);
  _('b<r', [pbPromise, false, 42]);

  // Promise is still there before any acks
  t.is(state.getPromiseStatus(plPromise), 'fulfilled');

  // First remote acks, but it's still there
  if (aliceFirst) {
    _('a>m', oaLarry, 'hi', undefined);
    _('k<m', oLarry, 'hi', undefined);
  } else {
    _('b>m', obLarry, 'hi', undefined);
    _('k<m', oLarry, 'hi', undefined);
  }
  t.is(state.getPromiseStatus(plPromise), 'fulfilled');

  // Second remote acks and promise goes away
  if (aliceFirst) {
    _('b>m', obLarry, 'hi', undefined);
    _('k<m', oLarry, 'hi', undefined);
  } else {
    _('a>m', oaLarry, 'hi', undefined);
    _('k<m', oLarry, 'hi', undefined);
  }
  t.is(state.getPromiseStatus(plPromise), undefined);

  done();
}

test('promise sent to two remotes, Alice acks before Bob', t => {
  twoAcksTest(t, true);
});

test('promise sent to two remotes, Bob acks before Alice', t => {
  twoAcksTest(t, false);
});

function nestedPromisesTestLarryOuter(t, larryInner) {
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
  } = commsVatDriver(t);

  setupRemote('a');
  const [oAlice, oaAlice] = importFromRemote('a', 21, 'alice');
  const oLarry = newImportObject('k');
  const oaLarry = exportToRemote('a', 11, oLarry);

  let pPromiseInner;
  let paPromiseInner;
  if (!larryInner) {
    // Alice sends a message to Larry containing the inner promise
    paPromiseInner = newImportPromise('a');
    _('a>m', oaLarry, 'hello', undefined, paPromiseInner);
    pPromiseInner = newExportPromise('k');
    _('k<m', oLarry, 'hello', undefined, pPromiseInner);
  }

  // Larry sends a message to Alice containing the outer promise
  const pPromiseOuter = newImportPromise('k');
  _('k>m', oAlice, 'hello', undefined, pPromiseOuter);
  _('k<s', pPromiseOuter);
  const paPromiseOuter = newExportPromise('a');
  _('a<m', oaAlice, 'hello', undefined, paPromiseOuter);
  const plPromiseOuter = state.mapFromKernel(refOf(pPromiseOuter));

  // Larry resolves the outer promise to a value containing the inner promise
  if (larryInner) {
    pPromiseInner = newImportPromise('k');
  }
  _('k>r', [pPromiseOuter, false, pPromiseInner]);
  if (larryInner) {
    _('k<s', pPromiseInner);
    paPromiseInner = newExportPromise('a');
  }
  _('a<r', [paPromiseOuter, false, paPromiseInner]);
  const plPromiseInner = state.mapFromKernel(refOf(pPromiseInner));

  // Outer promise is fulfilled, inner is still unresolved
  t.is(state.getPromiseStatus(plPromiseOuter), 'fulfilled');
  t.is(state.getPromiseStatus(plPromiseInner), 'unresolved');

  // Somebody resolves the inner promise
  if (larryInner) {
    _('k>r', [pPromiseInner, false, 42]);
    _('a<r', [paPromiseInner, false, 42]);
  } else {
    _('a>r', [paPromiseInner, false, 42]);
    _('k<r', [pPromiseInner, false, 42]);
  }

  if (larryInner) {
    // Both promises are still there, fulfilled before any acks
    t.is(state.getPromiseStatus(plPromiseOuter), 'fulfilled');
    t.is(state.getPromiseStatus(plPromiseInner), 'fulfilled');

    // Alice acks, both promises disappear
    _('a>m', oaLarry, 'hi', undefined);
    _('k<m', oLarry, 'hi', undefined);
  }
  t.is(state.getPromiseStatus(plPromiseOuter), undefined);
  t.is(state.getPromiseStatus(plPromiseInner), undefined);

  done();
}

test('Nested promises, Larry outer, Larry inner', t => {
  nestedPromisesTestLarryOuter(t, true);
});

test('Nested promises, Larry outer, Alice inner', t => {
  nestedPromisesTestLarryOuter(t, false);
});

function nestedPromisesTestAliceOuter(t, larryInner) {
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
  } = commsVatDriver(t);

  setupRemote('a');
  const [oAlice, oaAlice] = importFromRemote('a', 21, 'alice');
  const oLarry = newImportObject('k');
  const oaLarry = exportToRemote('a', 11, oLarry);

  let pPromiseInner;
  let paPromiseInner;
  if (larryInner) {
    // Larry sends a message to Alice containing the inner promise
    pPromiseInner = newImportPromise('k');
    _('k>m', oAlice, 'hello', undefined, pPromiseInner);
    paPromiseInner = newExportPromise('a');
    _('k<s', pPromiseInner);
    _('a<m', oaAlice, 'hello', undefined, paPromiseInner);
  }

  // Alice sends a message to Larry containing the outer promise
  const paPromiseOuter = newImportPromise('a');
  _('a>m', oaLarry, 'hello', undefined, paPromiseOuter);
  const pPromiseOuter = newExportPromise('k');
  _('k<m', oLarry, 'hello', undefined, pPromiseOuter);
  const plPromiseOuter = state.mapFromKernel(refOf(pPromiseOuter));

  // Alice resolves the outer promise to a value containing the inner promise
  if (!larryInner) {
    paPromiseInner = newImportPromise('a');
  }
  _('a>r', [paPromiseOuter, false, paPromiseInner]);
  if (!larryInner) {
    pPromiseInner = newExportPromise('k');
  }
  _('k<r', [pPromiseOuter, false, pPromiseInner]);
  const plPromiseInner = state.mapFromKernel(refOf(pPromiseInner));

  // Outer promise is gone, inner is still unresolved
  t.is(state.getPromiseStatus(plPromiseOuter), undefined);
  t.is(state.getPromiseStatus(plPromiseInner), 'unresolved');

  // Somebody resolves the inner promise
  if (larryInner) {
    _('k>r', [pPromiseInner, false, 42]);
    _('a<r', [paPromiseInner, false, 42]);
  } else {
    _('a>r', [paPromiseInner, false, 42]);
    _('k<r', [pPromiseInner, false, 42]);
  }

  if (larryInner) {
    // Inner promise is still there, fulfilled before any acks
    t.is(state.getPromiseStatus(plPromiseInner), 'fulfilled');

    // Alice acks, inner promise disappears
    _('a>m', oaLarry, 'hi', undefined);
    _('k<m', oLarry, 'hi', undefined);
  }
  t.is(state.getPromiseStatus(plPromiseInner), undefined);

  done();
}

test('Nested promises, Alice outer, Larry inner', t => {
  nestedPromisesTestAliceOuter(t, true);
});

test('Nested promises, Alice outer, Alice inner', t => {
  nestedPromisesTestAliceOuter(t, false);
});
