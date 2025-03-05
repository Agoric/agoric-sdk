import test from 'ava';

import { q, Fail } from '@endo/errors';

import { BridgeId, VBankAccount } from '@agoric/internal';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';

import { makeCosmicSwingsetTestKit } from '../tools/test-kit.js';

test('Prometheus metric definitions', async t => {
  const OTEL_EXPORTER_PROMETHEUS_PORT = '12345';

  const fakeStorageKit = makeFakeStorageKit('');
  const { toStorage: handleVstorage } = fakeStorageKit;
  const receiveBridgeSend = (destPortName, msg) => {
    switch (destPortName) {
      case BridgeId.STORAGE: {
        return handleVstorage(msg);
      }
      case BridgeId.BANK: {
        if (msg.type === 'VBANK_GET_MODULE_ACCOUNT_ADDRESS') {
          const matchesRequest = desc => desc.module === msg.moduleName;
          const found = Object.values(VBankAccount).find(matchesRequest);
          if (found) return found.address;
          return { error: `module account ${msg.moduleName} not found` };
        }
        break;
      }
      default:
        break;
    }
    Fail`port ${q(destPortName)} not implemented for message ${msg}`;
  };
  const env = {
    ...process.env,
    OTEL_EXPORTER_PROMETHEUS_PORT,
    CHAIN_BOOTSTRAP_VAT_CONFIG: '@agoric/vm-config/decentral-core-config.json',
  };
  const testKit = await makeCosmicSwingsetTestKit(receiveBridgeSend, { env });
  const { pushCoreEval, runNextBlock, shutdown } = testKit;
  t.teardown(shutdown);

  // To tickle some metrics events, run a couple of trivial blocks.
  pushCoreEval(`${() => {}}`);
  await runNextBlock();
  pushCoreEval(`${() => {}}`);
  await runNextBlock();

  const response = await fetch(
    `http://localhost:${OTEL_EXPORTER_PROMETHEUS_PORT}/metrics`,
  );
  const text = await response.text();
  // Normalize text:
  // https://prometheus.io/docs/instrumenting/exposition_formats/#text-format-details
  // * Set telemetry_sdk_version and service_instance_id to "%s".
  // * Replace numeric values with "%f".
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
        `${prefix} %f${timestamp ? ' %@' : ''}`,
    );
  t.snapshot(normalizedText);
});
