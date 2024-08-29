// @ts-nocheck
/* global process */
import test from 'ava';

import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';
import { kslot, kser } from '@agoric/kmarshal';
import engineGC from './engine-gc.js';
import { watchCollected, makeGcAndFinalize } from './gc-and-finalize.js';
import { buildSyscall, makeDispatch } from './liveslots-helpers.js';
import {
  makeMessage,
  makeBringOutYourDead,
  makeDropExports,
  makeRetireExports,
  makeRetireImports,
} from './util.js';

function matchIDCounterSet(t, log) {
  t.like(log.shift(), { type: 'vatstoreSet', key: 'idCounters' });
}

const gcAndFinalize = makeGcAndFinalize(engineGC);

// these tests depend on actual GC happening, and we've seen
// inconsistent GC behavior under Node.js and AVA with tests running
// in parallel, so we mark them all with test.serial()

test.serial('liveslots retains pending exported promise', async t => {
  const { log, syscall } = buildSyscall();
  let collected;
  const success = [];
  function build(_vatPowers) {
    const root = Far('root', {
      make() {
        const pk = makePromiseKit();
        collected = watchCollected(pk.promise);
        // we export the Promise, but do not retain resolve/reject
        return [pk.promise];
      },
      // if liveslots fails to keep a strongref to the Promise, it will have
      // been collected by now, and calling check() will fail, because
      // liveslots can't create a new Promise import when the allocatedByVat
      // says it was an export
      check(_p) {
        success.push('yes');
      },
    });
    return root;
  }

  const { dispatch } = await makeDispatch(syscall, build);
  log.length = 0; // assume pre-build vatstore operations are correct
  const rootA = 'o+0';
  const resultP = 'p-1';
  await dispatch(makeMessage(rootA, 'make', [], resultP));
  await gcAndFinalize();
  t.false(collected.result, 'Promise retained');
  t.is(log[0].type, 'resolve');
  const res0 = log[0].resolutions[0];
  t.is(res0[0], resultP);
  const exportedVPID = res0[2].slots[0]; // currently p+5
  await dispatch(makeMessage(rootA, 'check', [kslot(exportedVPID)]));
  t.deepEqual(success, ['yes']);
});

test.serial('liveslots retains device nodes', async t => {
  const { syscall } = buildSyscall();
  let collected;
  const recognize = new WeakSet(); // real WeakSet
  const success = [];
  function build(_vatPowers) {
    const root = Far('root', {
      first(dn) {
        collected = watchCollected(dn);
        recognize.add(dn);
      },
      second(dn) {
        success.push(recognize.has(dn));
      },
    });
    return root;
  }

  const { dispatch } = await makeDispatch(syscall, build);
  const rootA = 'o+0';
  const device = 'd-1';
  await dispatch(makeMessage(rootA, 'first', [kslot(device)]));
  await gcAndFinalize();
  t.false(collected.result, 'Device node retained');
  await dispatch(makeMessage(rootA, 'second', [kslot(device)]));
  t.deepEqual(success, [true]);
});

test.serial('GC syscall.dropImports', async t => {
  const { log, syscall } = buildSyscall();
  let collected;
  function build(_vatPowers) {
    const holder = new Set();
    const root = Far('root', {
      one(arg) {
        holder.add(arg);
        collected = watchCollected(arg);
      },
      two() {},
      three() {
        holder.clear(); // drops the import
      },
    });
    return root;
  }
  const { dispatch } = await makeDispatch(syscall, build, 'vatA', {
    enableDisavow: true,
  });
  log.length = 0; // assume pre-build vatstore operations are correct
  const rootA = 'o+0';
  const arg = 'o-1';

  // tell the vat make a Presence and hold it for a moment
  // rp1 = root~.one(arg)
  await dispatch(makeMessage(rootA, 'one', [kslot(arg)]));
  await dispatch(makeBringOutYourDead());
  t.false(collected.result);

  // an intermediate message will trigger GC, but the presence is still held
  await dispatch(makeMessage(rootA, 'two', []));
  await dispatch(makeBringOutYourDead());
  t.false(collected.result);

  // now tell the vat to drop the 'arg' presence we gave them earlier
  await dispatch(makeMessage(rootA, 'three', []));
  await dispatch(makeBringOutYourDead());

  const isV8 =
    typeof process !== 'undefined' && 'v8' in (process.versions || {});

  // the presence itself should be gone
  if (!collected.result) {
    if (isV8) {
      // Flake in v8/node: https://github.com/Agoric/agoric-sdk/issues/8883
      t.log('skipping flake in v8');
      return;
    }
    t.fail('import not collected');
  }

  // first it will check that there are no VO's holding onto it
  const l2 = log.shift();
  t.deepEqual(l2, {
    type: 'vatstoreGet',
    key: 'vom.rc.o-1',
    result: undefined,
  });

  const l3 = log.shift();
  t.deepEqual(l3, {
    type: 'vatstoreGetNextKey',
    priorKey: 'vom.ir.o-1|',
    result: 'vom.rc.o+d6/1',
  });

  // since nothing else is holding onto it, the vat should emit a dropImports
  const l4 = log.shift();
  t.deepEqual(l4, {
    type: 'dropImports',
    slots: [arg],
  });

  // and since the vat never used the Presence in a WeakMap/WeakSet, they
  // cannot recognize it either, and will emit retireImports
  const l5 = log.shift();
  t.deepEqual(l5, {
    type: 'retireImports',
    slots: [arg],
  });

  t.deepEqual(log, []);
});

test.serial('GC dispatch.retireImports', async t => {
  const { log, syscall } = buildSyscall();
  function build(_vatPowers) {
    // eslint-disable-next-line no-unused-vars
    let presence1;
    const root = Far('root', {
      one(arg) {
        presence1 = arg;
      },
    });
    return root;
  }
  const { dispatch } = await makeDispatch(syscall, build, 'vatA', {
    enableDisavow: true,
  });
  log.length = 0; // assume pre-build vatstore operations are correct
  const rootA = 'o+0';
  const arg = 'o-1';

  // tell the vat make a Presence and hold it
  // rp1 = root~.one(arg)
  await dispatch(makeMessage(rootA, 'one', [kslot(arg)]));

  // when the upstream export goes away, the kernel will send a
  // dispatch.retireImport into the vat
  await dispatch(makeRetireImports(arg));
  // for now, we only care that it doesn't crash
  t.like(log.shift(), { type: 'vatstoreGetNextKey' });
  t.deepEqual(log, []);

  // when we implement VOM.vrefIsRecognizable, this test might do more
});

test.serial('GC dispatch.retireExports', async t => {
  const { log, syscall } = buildSyscall();
  function build(_vatPowers) {
    const ex1 = Far('export', {});
    const root = Far('root', {
      one() {
        return ex1;
      },
    });
    return root;
  }
  const { dispatch } = await makeDispatch(syscall, build, 'vatA', {
    enableDisavow: true,
  });
  log.length = 0; // assume pre-build vatstore operations are correct
  const rootA = 'o+0';

  // rp1 = root~.one()
  // ex1 = await rp1
  const rp1 = 'p-1';
  await dispatch(makeMessage(rootA, 'one', [], rp1));
  const l1 = log.shift();
  const ex1 = l1.resolutions[0][2].slots[0];
  t.deepEqual(l1, {
    type: 'resolve',
    resolutions: [[rp1, false, kser(kslot(ex1, 'export'))]],
  });
  matchIDCounterSet(t, log);
  t.deepEqual(log, []);

  // All other vats drop the export, but since the vat holds it strongly, the
  // vat says nothing
  await dispatch(makeDropExports(ex1));
  t.deepEqual(log, []);

  // Also, all other vats cease to be able to recognize it, which will delete
  // the clist entry and allows the vat to delete some slotToVal tables. The
  // vat does not need to react, but we want to make sure the dispatch
  // doesn't crash anything.
  await dispatch(makeRetireExports(ex1));
  t.deepEqual(log, []);
});

test.serial('GC dispatch.dropExports', async t => {
  const { log, syscall } = buildSyscall();
  let collected;
  function build(_vatPowers) {
    const root = Far('root', {
      one() {
        const ex1 = Far('export', {});
        collected = watchCollected(ex1);
        return ex1;
        // ex1 goes out of scope, dropping last userspace strongref
      },
      two() {},
    });
    return root;
  }
  const { dispatch } = await makeDispatch(syscall, build, 'vatA', {
    enableDisavow: true,
  });
  log.length = 0; // assume pre-build vatstore operations are correct
  const rootA = 'o+0';

  // rp1 = root~.one()
  // ex1 = await rp1
  const rp1 = 'p-1';
  await dispatch(makeMessage(rootA, 'one', [], rp1));
  await dispatch(makeBringOutYourDead());
  const l1 = log.shift();
  const ex1 = l1.resolutions[0][2].slots[0];
  t.deepEqual(l1, {
    type: 'resolve',
    resolutions: [[rp1, false, kser(kslot(ex1, 'export'))]],
  });
  t.deepEqual(log.shift(), {
    type: 'vatstoreSet',
    key: 'idCounters',
    value: '{"exportID":11,"collectionID":5,"promiseID":5}',
  });
  t.deepEqual(log, []);

  // the exported Remotable should be held in place by exportedRemotables
  // until we tell the vat we don't need it any more
  t.false(collected.result);

  // an intermediate message will trigger GC, but the presence is still held
  await dispatch(makeMessage(rootA, 'two', []));
  await dispatch(makeBringOutYourDead());
  t.false(collected.result);

  // now tell the vat we don't need a strong reference to that export.
  await dispatch(makeDropExports(ex1));
  await dispatch(makeBringOutYourDead());

  // that should allow ex1 to be collected
  t.true(collected.result);

  // upon collection, the vat should scan for local recognizers (weak
  // collection keys) in case any need to be dropped, and find none
  t.deepEqual(log.shift(), {
    type: 'vatstoreGetNextKey',
    priorKey: `vom.ir.${ex1}|`,
    result: 'vom.rc.o+d6/1',
  });

  // and once it's collected, the vat should emit `syscall.retireExport`
  // because nobody else will be able to recognize it again
  const l2 = log.shift();
  t.deepEqual(l2, {
    type: 'retireExports',
    slots: [ex1],
  });
  t.deepEqual(log, []);
});

test.serial(
  'GC dispatch.retireExports inhibits syscall.retireExports',
  async t => {
    const { log, syscall } = buildSyscall();
    let collected;
    function build(_vatPowers) {
      const holder = new Set();
      const root = Far('root', {
        hold() {
          const ex1 = Far('export', {});
          holder.add(ex1);
          collected = watchCollected(ex1);
          return ex1;
        },
        two() {},
        drop() {
          holder.clear(); // drop the last userspace strongref
        },
      });
      return root;
    }
    const { dispatch } = await makeDispatch(syscall, build, 'vatA', {
      enableDisavow: true,
    });
    log.length = 0; // assume pre-build vatstore operations are correct
    const rootA = 'o+0';

    // rp1 = root~.hold()
    // ex1 = await rp1
    const rp1 = 'p-1';
    await dispatch(makeMessage(rootA, 'hold', [], rp1));
    await dispatch(makeBringOutYourDead());
    const l1 = log.shift();
    const ex1 = l1.resolutions[0][2].slots[0];
    t.deepEqual(l1, {
      type: 'resolve',
      resolutions: [[rp1, false, kser(kslot(ex1, 'export'))]],
    });
    t.deepEqual(log.shift(), {
      type: 'vatstoreSet',
      key: 'idCounters',
      value: '{"exportID":11,"collectionID":5,"promiseID":5}',
    });
    t.deepEqual(log, []);

    // the exported Remotable should be held in place by exportedRemotables
    // until we tell the vat we don't need it any more
    t.false(collected.result);

    // an intermediate message will trigger GC, but the presence is still held
    await dispatch(makeMessage(rootA, 'two', []));
    await dispatch(makeBringOutYourDead());
    t.false(collected.result);

    // now tell the vat we don't need a strong reference to that export.
    await dispatch(makeDropExports(ex1));
    await dispatch(makeBringOutYourDead());

    // that removes the liveslots strongref, but the vat's remains in place
    t.false(collected.result);

    // now the kernel tells the vat we can't even recognize the export
    await dispatch(makeRetireExports(ex1));
    await dispatch(makeBringOutYourDead());

    // that ought to delete the table entry, but doesn't affect the vat
    // strongref
    t.false(collected.result);

    // now tell the vat to drop its strongref
    await dispatch(makeMessage(rootA, 'drop', []));
    await dispatch(makeBringOutYourDead());

    // which should let the export be collected
    t.true(collected.result);

    // the vat should scan for local recognizers (weak collection
    // keys) in case any need to be dropped, and find none
    t.deepEqual(log.shift(), {
      type: 'vatstoreGetNextKey',
      priorKey: 'vom.ir.o+10|',
      result: 'vom.rc.o+d6/1',
    });

    // the vat should *not* emit `syscall.retireExport`, because it
    // already received a dispatch.retireExport
    t.deepEqual(log, []);
  },
);
