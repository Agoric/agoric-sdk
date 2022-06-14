// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';

import { makeDummySlogger } from '../src/kernel/slogger.js';
import { makeManagerKit } from '../src/kernel/vat-loader/manager-helper.js';

const m1 = ['message', { method: 'foo', args: { body: '', slots: [] } }];

function setup(storedTranscript = []) {
  const vatID = 'vatID';
  const slog = makeDummySlogger({}, () => console);
  const transcript = [];
  const vatKeeper = {
    addToTranscript(entry) {
      transcript.push(entry);
    },
    vatStats() {
      return { transcriptCount: storedTranscript.length };
    },
    getTranscript() {
      return storedTranscript;
    },
    closeTranscript() {},
    getLastSnapshot: () => undefined,
  };
  const kernelKeeper = {
    provideVatKeeper() {
      return vatKeeper;
    },
  };
  function vatSyscallHandler(_vso) {
    return ['ok', null];
  }
  const workerCanBlock = false;
  const mk = makeManagerKit(
    vatID,
    slog,
    kernelKeeper,
    vatSyscallHandler,
    workerCanBlock,
    undefined,
    true,
  );
  const { syscallFromWorker } = mk;
  function deliver(_delivery) {
    // a syscall.subscribe is included in the transcript
    syscallFromWorker(['subscribe', 'p-1']);
    // but GC syscalls are not
    syscallFromWorker(['dropImports', ['o-1']]);
    syscallFromWorker(['retireImports', ['o-1']]);
    syscallFromWorker(['retireExports', ['o+2']]);
    syscallFromWorker(['subscribe', 'p-2']);
    return Promise.resolve(['ok', null, { usage: 0 }]);
  }
  mk.setDeliverToWorker(deliver);
  function shutdown() {}
  const manager = mk.getManager(shutdown);
  return { manager, transcript };
}

test('gc syscalls are not included in transcript', async t => {
  const { manager, transcript } = setup();
  await manager.deliver(m1);

  t.is(transcript.length, 1);
  t.deepEqual(transcript[0], {
    d: m1,
    syscalls: [
      { d: ['subscribe', 'p-1'], response: ['ok', null] },
      { d: ['subscribe', 'p-2'], response: ['ok', null] },
    ],
  });
});

test('gc syscalls are ignored during replay', async t => {
  const storedTranscript = [
    {
      d: m1,
      syscalls: [
        { d: ['subscribe', 'p-1'], response: ['ok', null] },
        { d: ['subscribe', 'p-2'], response: ['ok', null] },
      ],
    },
  ];
  const { manager } = setup(storedTranscript);
  await manager.replayTranscript();
  // success is that replayTranscript didn't throw anachrophobia error
  t.pass();
});
