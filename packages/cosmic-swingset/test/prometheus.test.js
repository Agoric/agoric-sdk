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

import { makeLaunchChain } from '../src/chain-main.js';
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
      if (destPort === storagePort) return JSON.stringify(handleVstorage(msg));
      throw Fail`port ${q(destPort)} not implemented for message ${msg}`;
    },
  };
  const launchChain = makeLaunchChain(fakeAgcc, dbDir, {
    env: {
      OTEL_EXPORTER_PROMETHEUS_PORT,
      CHAIN_BOOTSTRAP_VAT_CONFIG:
        '@agoric/vm-config/decentral-core-config.json',
    },
    fs,
    path,
  });

  const { shutdown } = await launchChain(defaultBootstrapMessage);
  t.teardown(shutdown);

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
