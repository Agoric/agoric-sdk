import test from 'ava';

import fs from 'node:fs';
import path from 'node:path';

import { q, Fail } from '@endo/errors';
import tmp from 'tmp';

import { VBankAccount } from '@agoric/internal';
import {
  SwingsetMessageType,
  QueuedActionType,
} from '@agoric/internal/src/action-types.js';
import * as STORAGE_PATH from '@agoric/internal/src/chain-storage-paths.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';

import { makeLaunchChain, makeQueueStorage } from '../src/chain-main.js';
import { makeQueue } from '../src/helpers/make-queue.js';
import { defaultBootstrapMessage } from '../tools/test-kit.js';

test('Prometheus metric definitions', async t => {
  const OTEL_EXPORTER_PROMETHEUS_PORT = '12345';
  // @ts-expect-error
  const { storagePort, swingsetPort, vbankPort, vibcPort } =
    defaultBootstrapMessage;
  const knownPorts = new Map(
    Object.entries({ storagePort, swingsetPort, vbankPort, vibcPort }).map(
      ([name, value]) => [value, name],
    ),
  );
  const { name: dbDir, removeCallback: cleanupDB } = tmp.dirSync({
    prefix: 'testdb',
    unsafeCleanup: true,
  });
  t.teardown(cleanupDB);

  const fakeStorageKit = makeFakeStorageKit('');
  const { toStorage: handleVstorage } = fakeStorageKit;
  const fakeAgcc = {
    send: (destPort, msgJson) => {
      const msg = JSON.parse(msgJson);
      const simpleSuccess = JSON.stringify(true);
      switch (destPort) {
        case storagePort: {
          const result = handleVstorage(msg);
          return JSON.stringify(result);
        }
        case swingsetPort: {
          if (msg.method === 'swingStoreUpdateExportData') return simpleSuccess;
          break;
        }
        case vbankPort: {
          if (msg.type === 'VBANK_GET_MODULE_ACCOUNT_ADDRESS') {
            const found = Object.values(VBankAccount).find(
              desc => desc.module === msg.moduleName,
            );
            if (found) return JSON.stringify(found.address);
            return JSON.stringify({
              error: `module account ${msg.moduleName} not found`,
            });
          }
          break;
        }
        default:
          break;
      }
      const portLabel = knownPorts.has(destPort)
        ? knownPorts.get(destPort)
        : destPort;
      throw Fail`port ${q(portLabel)} not implemented for message ${msg}`;
    },
  };
  const highPriorityQueueStorage = makeQueueStorage(
    msg => fakeAgcc.send(storagePort, msg),
    STORAGE_PATH.HIGH_PRIORITY_QUEUE,
  );
  const highPriorityQueue = makeQueue(highPriorityQueueStorage);
  const launchChain = makeLaunchChain(fakeAgcc, dbDir, {
    env: {
      OTEL_EXPORTER_PROMETHEUS_PORT,
      CHAIN_BOOTSTRAP_VAT_CONFIG:
        '@agoric/vm-config/decentral-core-config.json',
    },
    fs,
    path,
  });

  // Launch the chain.
  const { shutdown, blockingSend } = await launchChain(defaultBootstrapMessage);
  t.teardown(shutdown);
  await blockingSend(defaultBootstrapMessage);

  // To tickle some metrics events, run a block containing a trivial core eval.
  const { blockHeight, blockTime, params } = defaultBootstrapMessage;
  const blockInfo = { blockHeight, blockTime, params };
  /** @type {import('@agoric/cosmic-proto/swingset/swingset.js').CoreEvalSDKType} */
  const coreEvalDesc = {
    json_permits: 'true',
    js_code: `${() => {}}`,
  };
  const coreEvalAction = {
    type: QueuedActionType.CORE_EVAL,
    evals: [coreEvalDesc],
  };
  highPriorityQueue.push({
    action: coreEvalAction,
    context: { blockHeight, txHash: 0, msgIdx: '' },
  });
  await blockingSend({ type: SwingsetMessageType.BEGIN_BLOCK, ...blockInfo });
  await blockingSend({ type: SwingsetMessageType.END_BLOCK, ...blockInfo });

  const response = await fetch(
    `http://localhost:${OTEL_EXPORTER_PROMETHEUS_PORT}/metrics`,
  );
  const text = await response.text();
  // Normalize text:
  // https://prometheus.io/docs/instrumenting/exposition_formats/#text-format-details
  // * Set telemetry_sdk_version and service_instance_id to "%s".
  // * Replace integer values with "%d" and floating-point values with "%f".
  // * Replace trailing milliseconds-since-epoch timestamps with "%@".
  const normalizedText = text
    .replace(/^.*(telemetry_sdk_version|service_instance_id).*$/m, line =>
      line.replaceAll(
        /(telemetry_sdk_version|service_instance_id)="([^""\\]|\\.)*"/g,
        '$1="%s"',
      ),
    )
    .replaceAll(
      /^([^#].*?) (?:([0-9]+)|([0-9]*[.][0-9]+))( [0-9]{13,})?$/gm,
      (_substring, prefix, intValue, floatValue, timestamp) =>
        `${prefix} ${intValue ? '%d' : '%f'}${timestamp ? ' %@' : ''}`,
    );
  t.snapshot(normalizedText);
});
