import harden from '@agoric/harden';
import { test } from 'tape-promise/tape';
import buildCommsDispatch from '../src/vats/comms';
import { flipRemoteSlot } from '../src/vats/comms/parseRemoteSlot';
import { makeState } from '../src/vats/comms/state';
import { addRemote } from '../src/vats/comms/remote';
import {
  getInbound,
  getOutbound,
  mapInbound,
  mapOutbound,
} from '../src/vats/comms/clist';
import { debugState } from '../src/vats/comms/dispatch';

test('mapOutbound', t => {
  const s = makeState();
  const { remoteID } = addRemote(s, 'remote1', 'o-1');
  t.equal(mapOutbound(s, remoteID, 'o-4'), 'ro-20');
  t.equal(mapOutbound(s, remoteID, 'o-4'), 'ro-20');
  t.equal(mapOutbound(s, remoteID, 'o-5'), 'ro-21');
  t.throws(
    () => mapOutbound(s, remoteID, 'o+5'),
    /sending non-remote object o\+5 to remote machine/,
  );
  t.end();
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
  const state = debugState.get(d);
  // add the remote, and an object to send at
  const transmitterID = 'o-1';
  const alice = 'o-10';
  const { remoteID } = addRemote(state, 'remote1', transmitterID);
  const bob = mapInbound(state, remoteID, 'ro-23');

  // now tell the comms vat to send a message to a remote machine, the
  // equivalent of bob!foo()
  d.deliver(bob, 'foo', capdata('argsbytes', []), null);
  t.deepEquals(sends.shift(), [
    transmitterID,
    'transmit',
    encodeArgs('deliver:ro+23:foo:;argsbytes'),
  ]);

  // bob!bar(alice, bob)
  d.deliver(bob, 'bar', capdata('argsbytes', [alice, bob]), null);
  t.deepEquals(sends.shift(), [
    transmitterID,
    'transmit',
    encodeArgs('deliver:ro+23:bar::ro-20:ro+23;argsbytes'),
  ]);
  // the outbound ro-20 should match an inbound ro+20, both represent 'alice'
  t.equal(getInbound(state, remoteID, 'ro+20'), alice);
  // do it again, should use same values
  d.deliver(bob, 'bar', capdata('argsbytes', [alice, bob]), null);
  t.deepEquals(sends.shift(), [
    transmitterID,
    'transmit',
    encodeArgs('deliver:ro+23:bar::ro-20:ro+23;argsbytes'),
  ]);

  // bob!cat(alice, bob, ayana)
  const ayana = 'o-11';
  d.deliver(bob, 'cat', capdata('argsbytes', [alice, bob, ayana]), null);
  t.deepEquals(sends.shift(), [
    transmitterID,
    'transmit',
    encodeArgs('deliver:ro+23:cat::ro-20:ro+23:ro-21;argsbytes'),
  ]);

  t.end();
});

test('receive', t => {
  // look at machine B, which is receiving remote messages aimed at a local
  // vat's object 'bob'
  const { syscall, sends } = mockSyscall();
  const d = buildCommsDispatch(syscall, 'fakestate', 'fakehelpers');
  const state = debugState.get(d);
  // add the remote, and an object to send at
  const transmitterID = 'o-1';
  const bob = 'o-10';
  const { remoteID, receiverID } = addRemote(state, 'remote1', transmitterID);
  const remoteBob = flipRemoteSlot(mapOutbound(state, remoteID, bob));
  t.equal(remoteBob, 'ro+20');

  // now pretend the transport layer received a message from remote1, as if
  // the remote machine had performed bob!foo()
  d.deliver(
    receiverID,
    'receive',
    encodeArgs(`deliver:${remoteBob}:foo:;argsbytes`),
    null,
  );
  t.deepEquals(sends.shift(), [bob, 'foo', capdata('argsbytes')]);

  // bob!bar(alice, bob)
  d.deliver(
    receiverID,
    'receive',
    encodeArgs(`deliver:${remoteBob}:bar::ro-20:${remoteBob};argsbytes`),
    null,
  );
  t.deepEquals(sends.shift(), [
    bob,
    'bar',
    capdata('argsbytes', ['o+11', bob]),
  ]);
  // if we were to send o+11, the other side should get ro+20, which is alice
  t.equal(getOutbound(state, remoteID, 'o+11'), 'ro+20');

  // bob!bar(alice, bob)
  d.deliver(
    receiverID,
    'receive',
    encodeArgs(`deliver:${remoteBob}:bar::ro-20:${remoteBob};argsbytes`),
    null,
  );
  t.deepEquals(sends.shift(), [
    bob,
    'bar',
    capdata('argsbytes', ['o+11', bob]),
  ]);

  // bob!cat(alice, bob, ayana)
  d.deliver(
    receiverID,
    'receive',
    encodeArgs(`deliver:${remoteBob}:cat::ro-20:${remoteBob}:ro-21;argsbytes`),
    null,
  );
  t.deepEquals(sends.shift(), [
    bob,
    'cat',
    capdata('argsbytes', ['o+11', bob, 'o+12']),
  ]);

  t.end();
});
