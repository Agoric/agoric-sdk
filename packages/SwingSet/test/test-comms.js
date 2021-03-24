import { test } from '../tools/prepare-test-env-ava';

import buildCommsDispatch from '../src/vats/comms';
import { flipRemoteSlot } from '../src/vats/comms/parseRemoteSlot';
import { makeState, makeStateKit } from '../src/vats/comms/state';
import { makeCListKit } from '../src/vats/comms/clist';
import { addRemote } from '../src/vats/comms/remote';
import { debugState } from '../src/vats/comms/dispatch';

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
    encodeArgs('1:deliver:ro+23:foo:;argsbytes'),
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
    encodeArgs('2:deliver:ro+23:bar::ro-20:ro+23;argsbytes'),
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
    encodeArgs('3:deliver:ro+23:bar::ro-20:ro+23;argsbytes'),
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
    encodeArgs('4:deliver:ro+23:cat::ro-20:ro+23:ro-21;argsbytes'),
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
    encodeArgs(`1:deliver:${bobRemote}:foo:;argsbytes`),
    null,
  );
  t.deepEqual(sends.shift(), [bobKernel, 'foo', capdata('argsbytes')]);

  // bob!bar(alice, bob)
  d.deliver(
    receiverID,
    'receive',
    encodeArgs(`2:deliver:${bobRemote}:bar::ro-20:${bobRemote};argsbytes`),
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
    encodeArgs(`:deliver:${bobRemote}:bar::ro-20:${bobRemote};argsbytes`),
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
      `4:deliver:${bobRemote}:cat::ro-20:${bobRemote}:ro-21;argsbytes`,
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
