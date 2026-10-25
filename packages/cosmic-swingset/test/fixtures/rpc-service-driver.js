import '@endo/init/debug.js';
import fs from 'node:fs';
import process from 'node:process';
import { Worker } from 'node:worker_threads';
import '../../src/anylogger-agoric.js';
import anylogger from '@agoric/internal/vendor/anylogger.js';
import { makeJsonRpcService } from '../../src/helpers/rpc-service.js';

const mode = process.argv[2];
const faultWorker = [
  'reader-exit',
  'reader-early-exit',
  'reader-error',
  'reader-partial-exit',
  'monitor-exit',
  'monitor-early-exit',
  'unknown-parent-message',
].includes(mode);
const reader = new Worker(
  faultWorker && !mode.startsWith('monitor-')
    ? new URL('rpc-fault-worker.js', import.meta.url)
    : new URL('../../src/agd-input-worker.js', import.meta.url),
  { workerData: mode },
);
const inboundRequests = [];
const configuredLogger = anylogger('ag-chain-cosmos:rpc');
if (mode === 'log-config') {
  fs.writeSync(
    1,
    `${JSON.stringify({
      levels: {
        error: configuredLogger.enabledFor('error'),
        info: configuredLogger.enabledFor('info'),
        log: configuredLogger.enabledFor('log'),
        debug: configuredLogger.enabledFor('debug'),
      },
    })}\n`,
  );
}
const logger = mode.startsWith('diagnostics')
  ? {
      debug: (event, details) => {
        fs.writeSync(1, `${JSON.stringify({ debug: { event, details } })}\n`);
      },
    }
  : mode === 'log-config'
    ? { debug: configuredLogger.debug }
    : mode === 'logger-error'
      ? {
          debug: () => {
            throw Error('logger failed');
          },
        }
      : undefined;
const service = makeJsonRpcService(
  reader,
  mode === 'read-error' ? 999999 : 4,
  request => {
    if (mode === 'inbound-order' || mode === 'diagnostics-inbound') {
      inboundRequests.push(request);
      if (inboundRequests.length === 2) {
        for (const pending of inboundRequests.reverse())
          service.reply(
            pending.id,
            mode === 'diagnostics-inbound'
              ? 'private-response-data'
              : 'handled',
          );
        void service.close();
      }
      return;
    }
    if (mode === 'dispatch-error') throw Error('dispatch failed');
    if (
      !['pending-inbound', 'duplicate-inbound', 'pending-shutdown'].includes(
        mode,
      )
    )
      service.reply(request.id, 'handled');
    if (mode === 'pending-inbound') void service.close();
  },
  {
    logger,
    write: line => {
      if (mode === 'overlap') {
        try {
          service.call('overlapping', []);
        } catch (error) {
          fs.writeSync(1, `${JSON.stringify({ overlap: String(error) })}\n`);
        }
      }
      if (mode === 'write-error') throw Error('write failed');
      if (mode === 'stop-pending') void service.stop(Error('explicit stop'));
      if (mode === 'close-pending') void service.close();
      fs.writeFileSync(5, line);
    },
    makeMonitor: () =>
      new Worker(
        mode.startsWith('monitor-')
          ? new URL('rpc-fault-worker.js', import.meta.url)
          : new URL('../../src/rpc-monitor-worker.js', import.meta.url),
        { workerData: mode },
      ),
  },
);
const finished = service.start();
if (mode === 'unknown-worker-message')
  reader.postMessage({ type: 'NOT_A_MESSAGE' });
if (mode === 'close') {
  const first = service.close();
  if (service.close() !== first) throw Error('close must be idempotent');
}
const passive = [
  'close',
  'unknown-worker-message',
  'unknown-parent-message',
  'pending-inbound',
  'dispatch-error',
  'duplicate-inbound',
  'pending-shutdown',
  'inbound-order',
  'diagnostics-inbound',
  'read-error',
];
if (!passive.includes(mode)) {
  try {
    const reply = service.call('agd.ReceiveMessage', [
      {
        port: 1,
        data: mode.startsWith('diagnostics') ? 'private-request-data' : '{}',
        needsReply: true,
      },
    ]);
    await new Promise((resolve, reject) => {
      process.stdout.write(`${JSON.stringify({ reply })}\n`, error => {
        if (error) reject(error);
        else resolve(undefined);
      });
    });
    void service.close();
  } catch (error) {
    fs.writeSync(1, `${JSON.stringify({ callError: String(error) })}\n`);
  }
}
try {
  await finished;
  fs.writeSync(1, `${JSON.stringify({ finished: true })}\n`);
} catch (error) {
  fs.writeSync(1, `${JSON.stringify({ failure: String(error) })}\n`);
}
