// @ts-check
import test from 'ava';

import sqlite3 from 'better-sqlite3';
import { makePromiseKit } from '@endo/promise-kit';
import { makeQueue } from '@endo/stream';

import { makeTranscriptStore } from '../src/transcriptStore.js';

/**
 * @import {AsyncQueue} from '@endo/stream';
 * @import {PromiseKit} from '@endo/promise-kit';
 */

function makeExportLog() {
  const exportLog = [];
  return {
    noteExport(key, value) {
      exportLog.push([key, value]);
    },
    getLog() {
      return exportLog.splice(0);
    },
  };
}

/**
 * @typedef {{name: string; entries: Uint8Array[]}} TranscriptArtifact
 */

/**
 * A test kit that consumes the transcript archive entries on demand
 */
function makeArchiveTranscript() {
  /** @type {AsyncQueue<(transcriptArtifact: TranscriptArtifact) => void>} */
  const queue = makeQueue();

  return {
    archiveTranscript: async (name, rawEntries) => {
      const resolve = await queue.get();
      // TODO: use Array.fromAsync once we're on Node 22
      const entries = [];
      for await (const entry of rawEntries) {
        entries.push(entry);
      }
      resolve({ name, entries });
    },
    getTranscriptArtifact: () => {
      /** @type {PromiseKit<TranscriptArtifact>} */
      const { resolve, promise } = makePromiseKit();
      queue.put(resolve);
      return promise;
    },
  };
}

function ensureTxn() {}

const closeSpanMacro = test.macro(async (t, useArchiver) => {
  const db = sqlite3(':memory:');
  const exportLog = makeExportLog();
  const { archiveTranscript, getTranscriptArtifact } = useArchiver
    ? makeArchiveTranscript()
    : {};
  const store = makeTranscriptStore(db, ensureTxn, exportLog.noteExport, {
    keepTranscripts: false,
    archiveTranscript,
  });

  const vatID = 'v1';

  await null;

  store.initTranscript(vatID);
  store.addItem(vatID, 'foo');
  store.addItem(vatID, 'bar');

  t.deepEqual(exportLog.getLog(), [
    [
      'transcript.v1.current',
      '{"vatID":"v1","startPos":0,"endPos":0,"hash":"43e6be43a3a34d60c0ebeb8498b5849b094fc20fc68483a7aeb3624fa10f79f6","isCurrent":1,"incarnation":0}',
    ],
    [
      'transcript.v1.current',
      '{"vatID":"v1","startPos":0,"endPos":1,"hash":"3a676f1da91fe6da8268853f21e64e3366da45811b830f9d92f39d4c01d69291","isCurrent":1,"incarnation":0}',
    ],
    [
      'transcript.v1.current',
      '{"vatID":"v1","startPos":0,"endPos":2,"hash":"92bf47a2498333897b80e299e6248c3a9f180a68d9f8ced4d1408956afc48e55","isCurrent":1,"incarnation":0}',
    ],
  ]);

  const spanRolloverResult = store.rolloverSpan(vatID);

  t.deepEqual(exportLog.getLog(), [
    [
      'transcript.v1.0',
      '{"vatID":"v1","startPos":0,"endPos":2,"hash":"92bf47a2498333897b80e299e6248c3a9f180a68d9f8ced4d1408956afc48e55","isCurrent":0,"incarnation":0}',
    ],
    [
      'transcript.v1.current',
      '{"vatID":"v1","startPos":2,"endPos":2,"hash":"43e6be43a3a34d60c0ebeb8498b5849b094fc20fc68483a7aeb3624fa10f79f6","isCurrent":1,"incarnation":0}',
    ],
  ]);

  if (useArchiver) {
    t.deepEqual(await getTranscriptArtifact?.(), {
      name: 'transcript.v1.0.2',
      entries: [Buffer.from('foo\n'), Buffer.from('bar\n')],
    });
  }

  await spanRolloverResult;

  t.deepEqual(exportLog.getLog(), []);

  store.addItem(vatID, 'foo');
  const incarnationRolloverResult = store.rolloverIncarnation(vatID);

  t.deepEqual(exportLog.getLog(), [
    [
      'transcript.v1.current',
      '{"vatID":"v1","startPos":2,"endPos":3,"hash":"3a676f1da91fe6da8268853f21e64e3366da45811b830f9d92f39d4c01d69291","isCurrent":1,"incarnation":0}',
    ],
    [
      'transcript.v1.2',
      '{"vatID":"v1","startPos":2,"endPos":3,"hash":"3a676f1da91fe6da8268853f21e64e3366da45811b830f9d92f39d4c01d69291","isCurrent":0,"incarnation":0}',
    ],
    [
      'transcript.v1.current',
      '{"vatID":"v1","startPos":3,"endPos":3,"hash":"43e6be43a3a34d60c0ebeb8498b5849b094fc20fc68483a7aeb3624fa10f79f6","isCurrent":1,"incarnation":1}',
    ],
  ]);

  if (useArchiver) {
    t.deepEqual(await getTranscriptArtifact?.(), {
      name: 'transcript.v1.2.3',
      entries: [Buffer.from('foo\n')],
    });
  }

  await incarnationRolloverResult;

  t.deepEqual(exportLog.getLog(), []);

  store.addItem(vatID, 'foo');
  const stopResult = store.stopUsingTranscript(vatID);

  t.deepEqual(exportLog.getLog(), [
    [
      'transcript.v1.current',
      '{"vatID":"v1","startPos":3,"endPos":4,"hash":"3a676f1da91fe6da8268853f21e64e3366da45811b830f9d92f39d4c01d69291","isCurrent":1,"incarnation":1}',
    ],
    [
      'transcript.v1.3',
      '{"vatID":"v1","startPos":3,"endPos":4,"hash":"3a676f1da91fe6da8268853f21e64e3366da45811b830f9d92f39d4c01d69291","isCurrent":0,"incarnation":1}',
    ],
    ['transcript.v1.current', undefined],
  ]);

  if (useArchiver) {
    t.deepEqual(await getTranscriptArtifact?.(), {
      name: 'transcript.v1.3.4',
      entries: [Buffer.from('foo\n')],
    });
  }

  await stopResult;

  t.deepEqual(exportLog.getLog(), []);
});

test('span close operations are sync (with archiver)', closeSpanMacro, true);
test(
  'span close operations are sync (without archiver)',
  closeSpanMacro,
  false,
);
