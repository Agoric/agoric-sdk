import { fileURLToPath } from 'node:url';
import { execa } from 'execa';

import anyTest, { type TestFn, type Implementation } from 'ava';

// eslint-disable-next-line import/no-extraneous-dependencies
import {
  leadingPrometheusNameRegExp,
  prometheusSampleRegExp,
  prometheusNumberValue,
} from '@agoric/cosmic-swingset/tools/prometheus.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import { makeCosmicSwingsetTestKit } from '@agoric/cosmic-swingset/tools/test-kit.js';
import { type TotalMap } from '@agoric/internal';
import {
  HISTOGRAM_METRICS,
  BLOCK_HISTOGRAM_METRICS,
} from '@agoric/internal/src/metrics.js';
import { avaRetry } from '@agoric/internal/tools/avaRetry.js';
import { q } from '@endo/errors';

const test = anyTest as TestFn;

let tryCount = 0;
const { IS_SUBPROCESS_RETRY } = process.env;
const testPrometheusMetrics = async t => {
  await null;

  // @opentelemetry/sdk-metrics keeps too much internal state to support simple
  // retries, so instead we spawn a subprocess. Fortunately, this kludge will go
  // away when metrics collection is fully extracted from swingset and the
  // kernel: https://github.com/Agoric/agoric-sdk/issues/11405
  if (tryCount) {
    if (IS_SUBPROCESS_RETRY) throw Error('Unexpected retry within subprocess');
    tryCount += 1;
    console.log('\nRetrying in subprocess...');
    const self = fileURLToPath(import.meta.url);
    let child: undefined | ReturnType<typeof execa>;
    let childOk = false;
    try {
      child = execa({
        shell: true,
        env: { IS_SUBPROCESS_RETRY: 'true' },
        stdout: 'inherit',
        stderr: 'inherit',
        timeout: 2 * 60_000, // 2 minutes
      })`yarn test ${self}`;
      // Inspired by media type multipart/* common syntax:
      // https://www.rfc-editor.org/rfc/rfc2046.html#section-5.1.1
      console.log(`--subprocess ${child.pid}`);
      await child;
      childOk = true;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-empty
    } catch (_err) {}
    if (child) console.log(`\n--subprocess ${child.pid}--\n`);
    t.true(childOk, 'subprocess retry');
    return;
  }
  tryCount += 1;

  // Enable both direct and slog-based Prometheus export.
  const OTEL_EXPORTER_PROMETHEUS_PORT = '12345';
  const SLOGSENDER_AGENT_OTEL_EXPORTER_PROMETHEUS_PORT = '12346';

  const env = {
    ...process.env,
    OTEL_EXPORTER_PROMETHEUS_PORT,
    SLOGSENDER_AGENT_OTEL_EXPORTER_PROMETHEUS_PORT,
    SLOGSENDER_AGENT: 'process',
    CHAIN_BOOTSTRAP_VAT_CONFIG: '@agoric/vm-config/decentral-core-config.json',
  };
  const testKit = await makeCosmicSwingsetTestKit({
    env,
  });
  const { evaluateCoreEval, shutdown } = testKit;
  t.teardown(shutdown);

  // To tickle some metrics events, run a couple of trivial blocks.
  await evaluateCoreEval(`${() => {}}`);
  await evaluateCoreEval(`${() => {}}`);

  // Scrape both Prometheus endpoints.
  const [directMetrics, slogMetrics] = await Promise.all(
    [
      OTEL_EXPORTER_PROMETHEUS_PORT,
      SLOGSENDER_AGENT_OTEL_EXPORTER_PROMETHEUS_PORT,
    ].map(async port => {
      const url = `http://localhost:${port}/metrics`;
      const text = await fetch(url).then(resp => resp.text());
      const metaLines = text.match(/^#.*/gm) || [];
      const keys = [] as string[];
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
  const isRetry = !!IS_SUBPROCESS_RETRY;
  const fuzzinessOverrides = new Map([
    // Directly-produced "swingset_crank_processing_time" includes kvStore
    // lookups in `getNextMessageAndProcessor` for dequeueing messages.
    ['swingset_crank_processing_time_sum', [50, '%']],

    // Memory measurements vary based on when they are captured, and are
    // ultimately ignorable (albeit with logging).
    ['heapStats_external_memory', [50, '%', isRetry]],
    ['heapStats_malloced_memory', [50, '%', isRetry]],
    ['heapStats_peak_malloced_memory', [50, '%', isRetry]],
    ['heapStats_total_available_size', [20, '%', isRetry]],
    ['heapStats_total_global_handles_size', [20, '%', isRetry]],
    ['heapStats_total_heap_size', [20, '%', isRetry]],
    ['heapStats_total_heap_size_executable', [20, '%', isRetry]],
    ['heapStats_total_physical_size', [20, '%', isRetry]],
    ['heapStats_used_global_handles_size', [20, '%', isRetry]],
    ['heapStats_used_heap_size', [20, '%', isRetry]],
    ['memoryUsage_arrayBuffers', [20, '%', isRetry]],
    ['memoryUsage_external', [20, '%', isRetry]],
    ['memoryUsage_heapTotal', [20, '%', isRetry]],
    ['memoryUsage_heapUsed', [20, '%', isRetry]],
    ['memoryUsage_rss', [20, '%', isRetry]],
  ]) as TotalMap<string, [number, unit: string, ignorable?: boolean]>;

  // Some other metrics are less reliable under retry.
  if (isRetry) {
    fuzzinessOverrides.set('blockLagSeconds_sum', [0.5, 's', true]);
    fuzzinessOverrides.set('heapStats_number_of_native_contexts', [1, '']);
  }

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
    comparisonCount += 1;
    const [fuzziness, unit, ignorable] = (() => {
      if (fuzzinessOverrides.has(name)) return fuzzinessOverrides.get(name);

      // Default to 100 milliseconds of wiggle room for timing data, but expand
      // that to 500 under subprocess retry (where the greater load can widen
      // discrepancies).
      const baseName = name.replace(/_sum$/, '');
      const meta =
        HISTOGRAM_METRICS[baseName] || BLOCK_HISTOGRAM_METRICS[baseName];
      // eslint-disable-next-line no-shadow
      const unit = meta?.unit;
      if (unit === 'ms') return [isRetry ? 500 : 100, unit];
      if (unit === 's') return [isRetry ? 0.5 : 0.1, unit];

      return [0];
    })();
    if (!fuzziness) {
      const msg = `${q(nameAndLabels)} values must match - direct ${directValue} vs. slog ${slogValue}`;
      t.is(slogValue, directValue, msg);
    } else {
      const msg = `${q(nameAndLabels)} values must be within ${fuzziness} ${unit} - direct ${directValue} vs. slog ${slogValue}`;
      let flaky: Implementation<[]>;
      if (unit === '%') {
        const smaller = Math.min(slogValue, directValue);
        const bigger = Math.max(slogValue, directValue);
        flaky = tt => {
          tt.true((1 - smaller / bigger) * 100 <= fuzziness, msg);
        };
      } else {
        flaky = tt => {
          tt.true(Math.abs(slogValue - directValue) <= fuzziness, msg);
        };
      }
      const maybe = await t.try(flaky);
      if (maybe.passed || !ignorable) {
        maybe.commit();
      } else {
        t.log(msg);
        maybe.discard();
      }
    }
  }
  t.truthy(comparisonCount);
  t.log(`compared ${comparisonCount} values`);
};

if (!IS_SUBPROCESS_RETRY) {
  avaRetry(test, 'Prometheus metric definitions', testPrometheusMetrics);
} else {
  test('Prometheus metric definitions', testPrometheusMetrics);
}
