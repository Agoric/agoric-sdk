// @ts-nocheck
import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { kser, kslot } from '@agoric/kmarshal';
import buildCommsDispatch from '../src/vats/comms/index.js';
import { flipRemoteSlot } from '../src/vats/comms/parseRemoteSlot.js';
import { makeState } from '../src/vats/comms/state.js';
import { makeCListKit } from '../src/vats/comms/clist.js';
import { debugState } from '../src/vats/comms/dispatch.js';
import {
  makeMessage,
  makeResolve,
  makeDropExports,
  makeRetireExports,
  makeRetireImports,
} from './util.js';
import { commsVatDriver } from './commsVatDriver.js';

test('translation', t => {
  const s = makeState(null);
  s.initialize(null, 0);
  const fakeSyscall = {};
  const clistKit = makeCListKit(s, fakeSyscall);
  const { provideRemoteForLocal, provideLocalForRemote } = clistKit;
  const { remoteID } = s.addRemote('remote1', 'o-1');
  const lo4 = s.allocateObject('remote0');
  const lo5 = s.allocateObject('remote0');

  // "export" some objects

  // n.b.: duplicated provideRemoteForLocal() call is not a cut-n-paste error
  // but a test that translation is stable
  t.is(provideRemoteForLocal(remoteID, lo4), 'ro-20');
  t.is(provideRemoteForLocal(remoteID, lo4), 'ro-20');
  t.is(provideRemoteForLocal(remoteID, lo5), 'ro-21');

  const r = s.getRemote(remoteID);
  const seq1 = r.nextSendSeqNum();
  t.is(r.getLastSent(lo4), seq1);
  r.advanceSendSeqNum();
  const seq2 = r.nextSendSeqNum();
  t.not(r.getLastSent(lo4), seq2);
  provideRemoteForLocal(remoteID, lo4);
  t.is(r.getLastSent(lo4), seq2);

  t.deepEqual(s.getImporters(lo4), [remoteID]);
  const { remoteID: remoteID2 } = s.addRemote('remote2', 'o-2');
  provideRemoteForLocal(remoteID2, lo4);
  t.deepEqual(s.getImporters(lo4), [remoteID, remoteID2]);

  r.deleteRemoteMapping(lo4);
  t.deepEqual(s.getImporters(lo4), [remoteID2]);
  t.is(r.mapToRemote(lo4, undefined));
  t.is(r.mapFromRemote(flipRemoteSlot('ro-20')), undefined);

  // now "import" one
  const lo6 = provideLocalForRemote(remoteID, 'ro-30');
  t.is(lo6, 'lo12'); // expected
  t.is(lo6, provideLocalForRemote(remoteID, 'ro-30')); // stable
  t.is(r.mapToRemote(lo6), 'ro+30');
  t.is(r.mapFromRemote('ro-30'), lo6);
  r.deleteRemoteMapping(lo6);
  t.is(r.mapToRemote(lo6), undefined);
  t.is(r.mapFromRemote('ro-30'), undefined);
});

function mockSyscall() {
  const sends = [];
  const resolves = [];
  const gcs = [];
  const subscribes = [];
  const fakestore = new Map();
  const syscall = harden({
    send(targetSlot, methargs, result) {
      if (result) {
        sends.push([targetSlot, methargs, result]);
      } else {
        sends.push([targetSlot, methargs]);
      }
      // return 'r-1';
    },
    resolve(resolutions) {
      for (const resolution of resolutions) {
        resolves.push(resolution);
      }
    },
    subscribe(targetSlot) {
      subscribes.push(targetSlot);
    },
    vatstoreGet(key) {
      return fakestore.get(key);
    },
    vatstoreSet(key, value) {
      fakestore.set(key, value);
    },
    vatstoreDelete(key) {
      fakestore.delete(key);
    },
    dropImports(vrefs) {
      gcs.push(['dropImports', vrefs]);
    },
    retireImports(vrefs) {
      gcs.push(['retireImports', vrefs]);
    },
    retireExports(vrefs) {
      gcs.push(['retireExports', vrefs]);
    },
  });
  return { syscall, sends, resolves, gcs, subscribes, fakestore };
}

/*
function dumpFakestore(fakestore, prefix = '') {
  const keys = Array.from(fakestore.keys());
  keys.sort();
  console.log(`--begin fakestore dump (prefix=${prefix}):`);
  for (const key of keys) {
    if (key.startsWith(prefix)) {
      console.log(`${key} : ${fakestore.get(key)}`);
    }
  }
  console.log(`--end fakestore dump:`);
}
*/

function encodeMsg(method, ...args) {
  return kser([method, args]);
}

test('transmit', t => {
  // look at machine A, on which some local vat is sending messages to a
  // remote 'bob' on machine B
  const { syscall, sends, subscribes, resolves } = mockSyscall();
  const dispatch = buildCommsDispatch(syscall, 'fakestate', 'fakehelpers');
  dispatch(['startVat', kser()]);
  const { state, clistKit } = debugState.get(dispatch);
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
  const { remoteID, receiverID } = state.addRemote('remote1', transmitterID);
  const bobLocal = provideLocalForRemote(remoteID, 'ro-23');
  const bobKernel = provideKernelForLocal(bobLocal);

  // now tell the comms vat to send a message to a remote machine, the
  // equivalent of bob!foo()
  dispatch(makeMessage(bobKernel, 'foo'));
  const fooMethargs = kser(['foo', []]).body;
  t.deepEqual(sends.shift(), [
    transmitterID,
    encodeMsg('transmit', `1:0:deliver:ro+23:;${fooMethargs}`),
  ]);

  // bob!bar(alice, bob)
  dispatch(
    makeMessage(bobKernel, 'bar', [kslot(aliceKernel), kslot(bobKernel)]),
  );
  const barMethargs = kser([
    'bar',
    [kslot(aliceKernel), kslot(bobKernel)],
  ]).body;
  t.deepEqual(sends.shift(), [
    transmitterID,
    encodeMsg('transmit', `2:0:deliver:ro+23::ro-20:ro+23;${barMethargs}`),
  ]);
  // the outbound ro-20 should match an inbound ro+20, both represent 'alice'
  t.is(getLocalForRemote(remoteID, 'ro+20'), aliceLocal);
  // do it again, should use same values
  dispatch(
    makeMessage(bobKernel, 'bar', [kslot(aliceKernel), kslot(bobKernel)]),
  );
  t.deepEqual(sends.shift(), [
    transmitterID,
    encodeMsg('transmit', `3:0:deliver:ro+23::ro-20:ro+23;${barMethargs}`),
  ]);

  // bob!cat(alice, bob, ayana)
  const ayanaKernel = 'o-11';
  dispatch(
    makeMessage(bobKernel, 'cat', [
      kslot(aliceKernel),
      kslot(bobKernel),
      kslot(ayanaKernel),
    ]),
  );
  const catMethargs = kser([
    'cat',
    [kslot(aliceKernel), kslot(bobKernel), kslot(ayanaKernel)],
  ]).body;
  t.deepEqual(sends.shift(), [
    transmitterID,
    encodeMsg(
      'transmit',
      `4:0:deliver:ro+23::ro-20:ro+23:ro-21;${catMethargs}`,
    ),
  ]);

  // bob!ref(res): a message that references its own result promise
  const vpid = 'p-1';
  dispatch(makeMessage(bobKernel, 'ref', [kslot(vpid)], vpid));
  const refMethargs = kser(['ref', [kslot(vpid)]]).body;
  t.deepEqual(sends.shift(), [
    transmitterID,
    encodeMsg('transmit', `5:0:deliver:ro+23:rp-40:rp-40;${refMethargs}`),
  ]);
  // comms is decider, but the promise was briefly in the "decided by
  // kernel" state, so we should see a syscall.subscribe . In an ideal
  // world we'd avoid this.
  t.deepEqual(subscribes, [vpid]);
  // when comms receives a notify, it should do syscall.resolve
  const resolution = kser('resolution');
  const res1 = `1:0:resolve:fulfill:rp+40;${resolution.body}`;
  dispatch(makeMessage(receiverID, 'receive', [res1]));
  t.deepEqual(resolves, [[vpid, false, resolution]]);
});

test('receive', t => {
  // look at machine B, which is receiving remote messages aimed at a local
  // vat's object 'bob'
  const { syscall, sends, gcs, subscribes } = mockSyscall();
  const dispatch = buildCommsDispatch(syscall, 'fakestate', 'fakehelpers');
  dispatch(['startVat', kser()]);
  const { state, clistKit } = debugState.get(dispatch);
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
  const fooMethargs = encodeMsg('foo', 'argsbytes');
  dispatch(
    makeMessage(receiverID, 'receive', [
      `1:0:deliver:${bobRemote}:;${fooMethargs.body}`,
    ]),
  );
  t.deepEqual(sends.shift(), [bobKernel, fooMethargs]);

  // bob!bar(alice, bob)
  const expectedAliceKernel = 'o+31';
  const barMethargs = encodeMsg(
    'bar',
    'argsbytes',
    kslot(expectedAliceKernel),
    kslot(bobKernel),
  );
  dispatch(
    makeMessage(receiverID, 'receive', [
      `2:0:deliver:${bobRemote}::ro-20:${bobRemote};${barMethargs.body}`,
    ]),
  );
  t.deepEqual(sends.shift(), [bobKernel, barMethargs]);
  // if we were to send o+31/lo11, the other side should get ro+20, which is alice
  t.is(getRemoteForLocal(remoteID, 'lo11'), 'ro+20');
  t.is(getLocalForRemote(remoteID, 'ro-20'), 'lo11');
  t.is(getKernelForLocal('lo11'), expectedAliceKernel);
  t.is(getLocalForKernel(expectedAliceKernel), 'lo11');

  // bob!bar(alice, bob), again, to test stability
  // also test absent sequence number
  const barMethargs2 = encodeMsg(
    'bar',
    'argsbytes',
    kslot(expectedAliceKernel),
    kslot(bobKernel),
  );
  dispatch(
    makeMessage(receiverID, 'receive', [
      `:0:deliver:${bobRemote}::ro-20:${bobRemote};${barMethargs2.body}`,
    ]),
  );
  t.deepEqual(sends.shift(), [bobKernel, barMethargs2]);

  // bob!cat(alice, bob, ayana)
  const expectedAyanaKernel = 'o+32';
  const catMethargs = encodeMsg(
    'cat',
    'argsbytes',
    kslot(expectedAliceKernel),
    kslot(bobKernel),
    kslot(expectedAyanaKernel),
  );
  dispatch(
    makeMessage(receiverID, 'receive', [
      `4:0:deliver:${bobRemote}::ro-20:${bobRemote}:ro-21;${catMethargs.body}`,
    ]),
  );
  t.deepEqual(sends.shift(), [bobKernel, catMethargs]);

  // react to bad sequence number
  // THIS CHECK TEMPORARILY DISABLED DUE TO THE SUPPRESION OF REMOTE COMMS ERRORS
  // See issue #3021
  // t.throws(
  //   () =>
  //     dispatch(
  //       makeMessage(
  //         receiverID,
  //         'receive',
  //         [`47:deliver:${bobRemote}::ro-20:${bobRemote};["bar",["argsbytes"]]`],
  //       ),
  //     ),
  //   { message: /unexpected recv seqNum .*/ },
  // );

  // bob!cat(alice, bob, agrippa)
  const expectedAgrippaKernel = 'o+33';
  const catMethargs2 = encodeMsg(
    'cat',
    'argsbytes',
    kslot(expectedAliceKernel),
    kslot(bobKernel),
    kslot(expectedAgrippaKernel),
  );
  dispatch(
    makeMessage(receiverID, 'receive', [
      `5:0:deliver:${bobRemote}::ro-20:${bobRemote}:ro-22;${catMethargs2.body}`,
    ]),
  );
  t.deepEqual(sends.shift(), [bobKernel, catMethargs2]);

  // receive a message that references its own result promise
  const refMethargs = encodeMsg('ref', 'args', kslot('p+40'));
  const ref1 = `6:0:deliver:${bobRemote}:rp-40:rp-40;${refMethargs.body}`;
  dispatch(makeMessage(receiverID, 'receive', [ref1]));
  const ref1msg = [bobKernel, refMethargs, 'p+40'];
  t.deepEqual(sends.shift(), ref1msg);
  // kernel is the decider, so comms should syscall.subscribe
  t.deepEqual(subscribes, ['p+40']);

  // when kernel resolves, it should notify remote
  const resolution = kser('resolution');
  dispatch(makeResolve('p+40', resolution));
  const res1 = `1:6:resolve:fulfill:rp+40;${resolution.body}`;
  t.deepEqual(sends.shift(), [transmitterID, encodeMsg('transmit', res1)]);

  // upstream GC operations should work
  dispatch(makeDropExports(expectedAliceKernel, expectedAyanaKernel));
  const gc1 = `2:6:gc:dropExport:ro+20\ngc:dropExport:ro+21`;
  t.deepEqual(sends.shift(), [transmitterID, encodeMsg('transmit', gc1)]);

  dispatch(makeRetireExports(expectedAliceKernel, expectedAyanaKernel));
  const gc2 = `3:6:gc:retireExport:ro+20\ngc:retireExport:ro+21`;
  t.deepEqual(sends.shift(), [transmitterID, encodeMsg('transmit', gc2)]);
  t.deepEqual(sends, []);

  // sending an upstream drop makes it legal to expect a downstream retire
  dispatch(makeDropExports(expectedAgrippaKernel));
  const gc3 = `4:6:gc:dropExport:ro+22`;
  t.deepEqual(sends.shift(), [transmitterID, encodeMsg('transmit', gc3)]);
  t.deepEqual(sends, []);

  dispatch(makeMessage(receiverID, 'receive', [`7:4:gc:retireImport:ro-22`]));

  t.deepEqual(gcs.shift(), ['retireExports', [expectedAgrippaKernel]]);
  t.deepEqual(gcs, []);
});

test('addEgress', t => {
  const { syscall } = mockSyscall();
  const dispatch = buildCommsDispatch(syscall, 'fakestate', 'fakehelpers');
  dispatch(['startVat', kser()]);
  const { state, clistKit } = debugState.get(dispatch);
  const { getLocalForKernel, getRemoteForLocal } = clistKit;
  const transmitterID = 'o-1';
  const remoteName = 'remote1';
  const { remoteID } = state.addRemote(remoteName, transmitterID);

  // prepare an object for the remote to access
  const index = 12;
  const kfref = 'o-2';
  const methargs = kser([
    'addEgress',
    [remoteName, index, kslot(kfref, 'export')],
  ]);
  const result = 'p-1';
  const vdo = ['message', 'o+0', { methargs, result }];
  dispatch(vdo);

  const lref = getLocalForKernel(kfref);
  const { reachable, recognizable } = state.getRefCounts(lref);
  t.is(reachable, 1n);
  t.is(recognizable, 1n);

  // the outbound rref should be `ro-12`, since we're exporting it, and the
  // remote protocol is exceedingly polite
  const outboundRref = getRemoteForLocal(remoteID, lref);
  t.is(outboundRref, `ro-${index}`);
});

test('addIngress', t => {
  const { syscall, resolves } = mockSyscall();
  const dispatch = buildCommsDispatch(syscall, 'fakestate', 'fakehelpers');
  dispatch(['startVat', kser()]);
  const { state, clistKit } = debugState.get(dispatch);
  const { getLocalForKernel, getRemoteForLocal } = clistKit;
  const transmitterID = 'o-1';
  const remoteName = 'remote1';
  const { remoteID } = state.addRemote(remoteName, transmitterID);

  // pretend the remote has an object for us to access
  const index = 12;
  const iface = 'iface name';
  const methargs = {
    body: JSON.stringify(['addIngress', [remoteName, index, iface]]),
    slots: [],
  };
  const result = 'p-1';
  const vdo = ['message', 'o+0', { methargs, result }];
  dispatch(vdo);

  t.is(resolves.length, 1);
  const kfref = resolves[0][2].slots[0];
  const lref = getLocalForKernel(kfref);

  const { reachable, recognizable } = state.getRefCounts(lref);
  t.is(reachable, 1n);
  t.is(recognizable, 1n);

  // the outbound rref should be `ro+12`, since we're importing it, and the
  // remote protocol is exceedingly polite
  const outboundRref = getRemoteForLocal(remoteID, lref);
  t.is(outboundRref, `ro+${index}`);
});

test('comms gc', t => {
  // we exercise comms on machine A, which is communicating with machine B
  // about various objects that are dropped and retired
  const { syscall, sends, gcs } = mockSyscall();
  const dispatch = buildCommsDispatch(syscall, 'fakestate', 'fakehelpers');
  dispatch(['startVat', kser()]);
  const { state, clistKit: ck } = debugState.get(dispatch);
  const transmitterID = 'o-1'; // vat-tp target for B
  const { remoteID, receiverID } = state.addRemote('B', transmitterID);
  function didTx(exp) {
    t.deepEqual(sends.shift(), [transmitterID, encodeMsg('transmit', exp)]);
  }
  function rx(msg) {
    dispatch(makeMessage(receiverID, 'receive', [msg]));
  }

  // Alice is a Remotable on some vat of machine A
  const aliceKernel = 'o-10';
  // const aliceLocal = ck.provideLocalForKernel(aliceKernel);

  // Bob is ultimately a Remotable on machine B, so is represented as an
  // export of comms A, and a Presence in all other vats on machine A. Local
  // vats talk to 'bobKernel'. When comms A sends a message to bob, it will
  // appear as a syscall.send to 'transmitterID' with a comms message that
  // targets 'bobRemote'
  const bobRemoteInbound = 'ro-13';
  const bobLocal = ck.provideLocalForRemote(remoteID, bobRemoteInbound);
  const bobRemote = ck.provideRemoteForLocal(remoteID, bobLocal); // outbound
  const bobKernel = ck.provideKernelForLocal(bobLocal);
  t.is(bobKernel, 'o+31');
  t.is(bobRemote, 'ro+13');

  // A exports amy, B drops, then retires
  let amyKernel = 'o-11';
  let amyOutbound = 'ro-20'; // expected
  let amyInbound = flipRemoteSlot(amyOutbound);
  // bob~.foo(amy)
  dispatch(makeMessage(bobKernel, 'foo', [kslot(amyKernel)]));
  const fooMethargs = kser(['foo', [kslot(amyKernel)]]).body;
  didTx(`1:0:deliver:${bobRemote}::${amyOutbound};${fooMethargs}`);
  t.deepEqual(sends, []);
  // B-> dropExport(amy), causes commsA to syscall.drop
  rx(`1:1:gc:dropExport:${amyInbound}`);
  t.deepEqual(gcs.shift(), ['dropImports', [amyKernel]]);
  t.deepEqual(gcs, []);
  // B-> retireExport(amy), causes commsA to syscall.retireImport
  rx(`2:1:gc:retireExport:${amyInbound}`);
  t.deepEqual(gcs.shift(), ['retireImports', [amyKernel]]);
  t.deepEqual(gcs, []);

  // A exports amy, B drops+retires in a single message
  amyKernel = 'o-12';
  amyOutbound = 'ro-21'; // expected
  amyInbound = flipRemoteSlot(amyOutbound);
  // bob~.foo(amy)
  dispatch(makeMessage(bobKernel, 'foo', [kslot(amyKernel)]));
  const fooMethargs2 = kser(['foo', [kslot(amyKernel)]]).body;
  didTx(`2:2:deliver:${bobRemote}::${amyOutbound};${fooMethargs2}`);
  t.deepEqual(sends, []);
  // B-> dropExport(amy)+retireExport(amy), commsA does syscall.drop+retire
  rx(`3:2:gc:dropExport:${amyInbound}\ngc:retireExport:${amyInbound}`);
  t.deepEqual(gcs.shift(), ['dropImports', [amyKernel]]);
  t.deepEqual(gcs.shift(), ['retireImports', [amyKernel]]);
  t.deepEqual(gcs, []);

  // A exports amy, B drops, A retires, then "Cross A12" from the diagram
  amyKernel = 'o-13';
  amyOutbound = 'ro-22'; // expected
  amyInbound = flipRemoteSlot(amyOutbound);
  // bob~.foo(amy)
  dispatch(makeMessage(bobKernel, 'foo', [kslot(amyKernel)]));
  const fooMethargs3 = kser(['foo', [kslot(amyKernel)]]).body;
  didTx(`3:3:deliver:${bobRemote}::${amyOutbound};${fooMethargs3}`);
  t.deepEqual(sends, []);
  // B-> dropExport(amy), causes commsA to syscall.drop
  rx(`4:3:gc:dropExport:${amyInbound}`);
  t.deepEqual(gcs.shift(), ['dropImports', [amyKernel]]);
  t.deepEqual(gcs, []);
  // kernelA retires the import, commsA should forward retireImport to B
  dispatch(makeRetireImports(amyKernel));
  didTx(`4:4:gc:retireImport:${amyOutbound}`);
  t.deepEqual(sends, []);
  // pretend commsB had a retire in flight, and they crossed on the wire
  rx(`5:4:gc:retireExport:${amyOutbound}`);
  // that should be ignored
  t.deepEqual(gcs, []);
  t.deepEqual(sends, []);

  // A exports amy, A re-exports amy, B sends uninformed drop, B sends informed drop
  amyKernel = 'o-14';
  amyOutbound = 'ro-23'; // expected
  amyInbound = flipRemoteSlot(amyOutbound);
  // bob~.foo(amy)
  dispatch(makeMessage(bobKernel, 'foo', [kslot(amyKernel)]));
  const fooMethargs4 = kser(['foo', [kslot(amyKernel)]]).body;
  didTx(`5:5:deliver:${bobRemote}::${amyOutbound};${fooMethargs4}`); // first export
  t.deepEqual(sends, []);
  // B-> dropExport(amy), pretend it's stalled on the wire
  const uninformed = `6:5:gc:dropExport:${amyInbound}`; // ack=5=first export
  // bob~.foo(amy) (re-export)
  dispatch(makeMessage(bobKernel, 'foo', [kslot(amyKernel)]));
  const fooMethargs5 = kser(['foo', [kslot(amyKernel)]]).body;
  didTx(`6:5:deliver:${bobRemote}::${amyOutbound};${fooMethargs5}`); // second export
  t.deepEqual(sends, []);
  const informed = `7:6:gc:dropExport:${amyInbound}`; // ack=6=second export
  // first drop finally arrives, should be ignored
  rx(uninformed);
  t.deepEqual(gcs, []);
  rx(informed);
  t.deepEqual(gcs.shift(), ['dropImports', [amyKernel]]);
  t.deepEqual(gcs, []);

  // Now we switch roles, A *imports* bert from B. To import bert, first give
  // B access to alice.
  let bertInbound = 'ro-24';
  let bertKernel = 'o+32'; // expected
  let bertOutbound = flipRemoteSlot(bertInbound);
  dispatch(makeMessage(bobKernel, 'foo', [kslot(aliceKernel)]));
  const aliceOutbound = `ro-24`; // expected
  const aliceInbound = flipRemoteSlot(aliceOutbound);
  didTx(`7:7:deliver:${bobRemote}::${aliceOutbound};${fooMethargs5}`);

  // alice~.bar(bert)
  const barMethargs = encodeMsg('bar', 'args', kslot(bertKernel));
  rx(`8:6:deliver:${aliceInbound}::${bertInbound};${barMethargs.body}`); // first import
  let barmsg = [aliceKernel, barMethargs];
  t.deepEqual(sends.shift(), barmsg);
  t.deepEqual(sends, []);
  t.deepEqual(gcs, []);

  // A drops+retires bert
  dispatch(makeDropExports(bertKernel));
  didTx(`8:8:gc:dropExport:${bertOutbound}`);
  t.deepEqual(sends, []);
  dispatch(makeRetireExports(bertKernel));
  didTx(`9:8:gc:retireExport:${bertOutbound}`);
  t.deepEqual(sends, []);
  // now pretend B sent a retire that crossed on the wire, it should be ignored. Cross B2/3.
  rx(`9:8:gc:retireImport:${bertInbound}`);
  t.deepEqual(gcs, []);

  // A drops bert, then B retires
  bertInbound = 'ro-25';
  bertKernel = 'o+33'; // expected
  bertOutbound = flipRemoteSlot(bertInbound);
  const barMethargs2 = encodeMsg('bar', 'args', kslot(bertKernel));
  rx(`10:9:deliver:${aliceInbound}::${bertInbound};${barMethargs2.body}`); // first import
  barmsg = [aliceKernel, barMethargs2];
  t.deepEqual(sends.shift(), barmsg);
  t.deepEqual(sends, []);
  t.deepEqual(gcs, []);
  dispatch(makeDropExports(bertKernel));
  didTx(`10:10:gc:dropExport:${bertOutbound}`);
  t.deepEqual(sends, []);
  // B retires
  rx(`11:10:gc:retireImport:${bertInbound}`);
  t.deepEqual(gcs.shift(), ['retireExports', [bertKernel]]);
  t.deepEqual(gcs, []);
  t.deepEqual(sends, []);
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

  // Now the kernel c-list entries should be gone but the inbound/outbound
  // remote c-list entries should still be there. The result promise should
  // also still be there, but be in a resolved state.
  t.falsy(state.mapFromKernel(refOf(pResult)));
  t.falsy(state.mapToKernel(plResult));
  t.truthy(remoteA.mapToRemote(plResult));
  t.truthy(remoteA.mapFromRemote(refOf(paResult)));
  t.is(state.getPromiseStatus(plResult), 'fulfilled');

  // Then the remote sends some traffic, which will contain an ack
  _('a>m', oaLarry, 'more', undefined);
  _('k<m', oLarry, 'more', undefined);

  // And now the remote c-list entries and the promise itself should be gone
  t.falsy(remoteA.mapToRemote(plResult));
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

  // Now the kernel c-list entries should be gone, but the inbound/outgoung
  // remote c-list entries should still be there
  t.falsy(state.mapFromKernel(refOf(pPromise1)));
  t.falsy(state.mapToKernel(plPromise1));
  t.truthy(remoteA.mapToRemote(plPromise1));
  t.truthy(remoteA.mapFromRemote(refOf(paPromise1)));

  t.falsy(state.mapFromKernel(refOf(pPromise2)));
  t.falsy(state.mapToKernel(plPromise2));
  t.truthy(remoteA.mapToRemote(plPromise2));
  t.truthy(remoteA.mapFromRemote(refOf(paPromise2)));

  // Then the remote sends some traffic, which will contain an ack
  _('a>m', oaLarry, 'more', undefined);
  _('k<m', oLarry, 'more', undefined);

  // And now the inbound remote c-list entries should be gone too.
  t.falsy(remoteA.mapToRemote(plPromise1));
  t.falsy(remoteA.mapFromRemote(refOf(paPromise1)));
  t.falsy(remoteA.mapToRemote(plPromise2));
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

  // THIS CHECK TEMPORARILY DISABLED DUE TO THE SUPPRESION OF REMOTE COMMS ERRORS
  // See issue #3021
  // _('a:l', 0); // lag ends, talking to the now retired promise should error
  // t.throws(
  //   () => _('a>m', paPromise, 'talkback', undefined),
  //   { message: `"${refOf(paPromise)}" must already be in remote "r1 (a)"` },
  // );

  // // Alice should be able to address Lisa directly & the promise should be gone
  // _('a>m', oaLisa, 'moretalk', undefined);
  // _('k<m', oLisa, 'moretalk', undefined);
  // t.is(state.getPromiseStatus(plPromise), undefined);

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
  _('k>r', [pPromiseOuter, false, [pPromiseInner]]);
  if (larryInner) {
    _('k<s', pPromiseInner);
    paPromiseInner = newExportPromise('a');
  }
  _('a<r', [paPromiseOuter, false, [paPromiseInner]]);
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

test(
  'Nested promises, Larry outer, Larry inner',
  nestedPromisesTestLarryOuter,
  true,
);

test(
  'Nested promises, Larry outer, Alice inner',
  nestedPromisesTestLarryOuter,
  false,
);

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
  _('a>r', [paPromiseOuter, false, [paPromiseInner]]);
  if (!larryInner) {
    pPromiseInner = newExportPromise('k');
  }
  _('k<r', [pPromiseOuter, false, [pPromiseInner]]);
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

test(
  'Nested promises, Alice outer, Larry inner',
  nestedPromisesTestAliceOuter,
  true,
);

test(
  'Nested promises, Alice outer, Alice inner',
  nestedPromisesTestAliceOuter,
  false,
);

test('Nested promises, reject with promise', async t => {
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

  const paPromise = newImportPromise('a');
  const pPromise = newExportPromise('k');

  // Alice sends a message to Larry containing the promise
  _('a>m', oaLarry, 'hello', undefined, paPromise);
  _('k<m', oLarry, 'hello', undefined, pPromise);

  // There should be appropriate c-list entries for the promise
  const plPromise = state.mapFromKernel(refOf(pPromise));
  t.truthy(plPromise);
  t.is(state.mapToKernel(plPromise), refOf(pPromise));
  t.is(remoteA.mapToRemote(plPromise), flipRefOf(paPromise));
  t.is(remoteA.mapFromRemote(refOf(paPromise)), plPromise);
  t.is(state.getPromiseStatus(plPromise), 'unresolved');

  // Alice rejects the promise to the promise itself
  _('a>r', [paPromise, true, paPromise]);
  _('k<r', [pPromise, true, pPromise]);

  // promise is rejected
  t.is(state.getPromiseStatus(plPromise), 'rejected');

  done();
});

test('Disallow resolving a promise with another promise', async t => {
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

  // Alice sends a message to Larry
  const paResult = newImportPromise('a');
  _('a>m', oaLarry, 'hello', paResult);
  const pResult = newExportPromise('k');
  _('k<m', oLarry, 'hello', pResult);
  _('k<s', pResult);

  // There should be appropriate c-list entries for the promise
  const plResult = state.mapFromKernel(refOf(pResult));
  t.truthy(plResult);
  t.is(state.mapToKernel(plResult), refOf(pResult));
  t.is(remoteA.mapToRemote(plResult), flipRefOf(paResult));
  t.is(remoteA.mapFromRemote(refOf(paResult)), plResult);
  t.is(state.getPromiseStatus(plResult), 'unresolved');

  // Try to resolve/redirect the result promise to another promise
  const pPromise = newImportPromise('k');
  t.throws(() => _('k>r', [pResult, false, pPromise]));
  _('k<s', pPromise);

  done();
});
