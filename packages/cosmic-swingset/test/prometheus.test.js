import test from 'ava';

import { q, Fail } from '@endo/errors';

import { BridgeId, VBankAccount } from '@agoric/internal';
import {
  HISTOGRAM_METRICS,
  BLOCK_HISTOGRAM_METRICS,
} from '@agoric/internal/src/metrics.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';

import {
  leadingPrometheusNameRegExp,
  prometheusSampleRegExp,
  prometheusNumberValue,
} from '../tools/prometheus.js';
import { makeCosmicSwingsetTestKit } from '../tools/test-kit.js';


test('Prometheus metric definitions', async t => {
  // Enable both direct and slog-based Prometheus export.
  const OTEL_EXPORTER_PROMETHEUS_PORT = '12345';
  const SLOGSENDER_AGENT_OTEL_EXPORTER_PROMETHEUS_PORT = '12346';

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
    SLOGSENDER_AGENT_OTEL_EXPORTER_PROMETHEUS_PORT,
    SLOGSENDER_AGENT: 'process',
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

  // Ensure expiration of any cached metrics.
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Scrape both Prometheus endpoints.
  const [directMetrics, slogMetrics] = await Promise.all(
    [
      OTEL_EXPORTER_PROMETHEUS_PORT,
      SLOGSENDER_AGENT_OTEL_EXPORTER_PROMETHEUS_PORT,
    ].map(async port => {
      const url = `http://localhost:${port}/metrics`;
      const text = await fetch(url).then(resp => resp.text());
      const metaLines = text.match(/^#.*/gm) || [];
      const keys = [];
      const comparableData = new Map();
      // Normalized text has static placeholders for timestamps, values, and
      // source-identifying metric label values.
      const normalizedText = text.replaceAll(
        prometheusSampleRegExp,
        (_substring, nameAndLabels, name, value, timestamp) => {
          nameAndLabels = nameAndLabels.replaceAll(
            /(telemetry_sdk_version|service_instance_id)="([^""\\]|\\.)*"/g,
            '$1="%s"',
          );

          // Record every key, but record data only for keys that do not
          // identify histogram buckets (which are too variable for comparison).
          keys.push(nameAndLabels);
          const [_, histogramBucketBaseName] =
            name.match(/^(.*?)_bucket$/) || [];
          const histogramTypeLine = `# TYPE ${histogramBucketBaseName} histogram`;
          const isHistogramBucket =
            histogramBucketBaseName &&
            !!metaLines.find(line => line === histogramTypeLine);
          if (!isHistogramBucket) {
            comparableData.set(nameAndLabels, prometheusNumberValue(value));
          }

          return `${nameAndLabels} %f${timestamp && ' %@'}`;
        },
      );
      return { text, normalizedText, metaLines, keys, comparableData };
    }),
  );

  t.snapshot(directMetrics.normalizedText);

  // Require equivalence for a) `#`-prefixed lines, b) metric keys inclusive of
  // dimensional labels, and c) metric values subject to timing fuzziness.
  t.deepEqual(
    [...slogMetrics.metaLines].sort(),
    [...directMetrics.metaLines].sort(),
  );
  t.truthy(slogMetrics.metaLines.length);
  t.log(`compared ${slogMetrics.metaLines.length} "#"-prefixed meta lines`);

  t.deepEqual([...slogMetrics.keys].sort(), [...directMetrics.keys].sort());
  t.truthy(slogMetrics.keys.length);
  t.log(`compared ${slogMetrics.keys.length} keys`);

  let comparisonCount = 0;
  for (const directEntry of directMetrics.comparableData.entries()) {
    const [nameAndLabels, directValue] = directEntry;
    const [name] = nameAndLabels.match(leadingPrometheusNameRegExp) || [];
    t.truthy(name, `must extract metric name from ${q(nameAndLabels)}`);
    const slogValue = slogMetrics.comparableData.get(nameAndLabels);
    t.not(
      slogValue,
      undefined,
      `slog metrics must include ${q(nameAndLabels)}`,
    );
    // Allow 100 milliseconds of wiggle room for timing data.
    let fuzziness = 0;
    const meta = HISTOGRAM_METRICS[name] || BLOCK_HISTOGRAM_METRICS[name];
    const unit = meta?.unit;
    if (unit === 'ms') {
      fuzziness = 100;
    } else if (unit === 's') {
      fuzziness = 0.1;
    }
    comparisonCount += 1;
    if (!fuzziness) {
      const msg = `${q(nameAndLabels)} values must match - direct ${directValue} vs. slog ${slogValue}`;
      t.is(slogValue, directValue, msg);
    } else {
      const msg = `${q(nameAndLabels)} values must be within ${fuzziness} ${unit} - direct ${directValue} vs. slog ${slogValue}`;
      t.true(Math.abs(slogValue - directValue) <= fuzziness, msg);
    }
  }
  t.truthy(comparisonCount);
  t.log(`compared ${comparisonCount} values`);
});
