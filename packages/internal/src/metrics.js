/**
 * @file Metadata about exported metrics. Note that any embedded unit
 *   information should be provided as case-sensitive UCUM (e.g., `s` for
 *   seconds, `ms` for milliseconds, `KiBy` for binary kilobytes [each being
 *   1024 bytes]).
 *
 *   - https://github.com/open-telemetry/semantic-conventions/blob/main/docs/general/metrics.md#instrument-units
 *   - https://ucum.org/ucum
 *   - https://ucum.nlm.nih.gov/ucum-lhc/demo.html
 *   - https://en.wikipedia.org/wiki/Unified_Code_for_Units_of_Measure
 */

import { q } from '@endo/errors';
import { isNat } from '@endo/nat';

/**
 * @import {Meter as OTelMeter, MetricAttributes} from '@opentelemetry/api';
 * @import {TotalMap} from '@agoric/internal';
 */

const HISTOGRAM_MS_LATENCY_BOUNDARIES = [
  5,
  10,
  25,
  50,
  100,
  250,
  500,
  1000,
  2500,
  5000,
  10000,
  Infinity,
];
const HISTOGRAM_SECONDS_LATENCY_BOUNDARIES =
  HISTOGRAM_MS_LATENCY_BOUNDARIES.map(ms => ms / 1000);

// TODO: Validate these boundaries. We're not going to have 5ms blocks, but
// we probably care about the difference between 10 vs. 30 seconds.
export const HISTOGRAM_METRICS = /** @type {const} */ ({
  heap_snapshot_duration: {
    boundaries: HISTOGRAM_SECONDS_LATENCY_BOUNDARIES,
    description: 'Time taken to create a process snapshot, in seconds',
    unit: 's',
  },
  swingset_crank_processing_time: {
    description: 'Processing time per crank (ms)',
    unit: 'ms',
    boundaries: Array.of(1, 11, 21, 31, 41, 51, 61, 71, 81, 91, Infinity),
  },
  swingset_block_processing_seconds: {
    description: 'Processing time per block',
    unit: 's',
    boundaries: HISTOGRAM_SECONDS_LATENCY_BOUNDARIES,
  },
  swingset_vat_startup: {
    description: 'Vat startup time (ms)',
    unit: 'ms',
    boundaries: HISTOGRAM_MS_LATENCY_BOUNDARIES,
  },
  swingset_vat_delivery: {
    description: 'Vat delivery time (ms)',
    unit: 'ms',
    boundaries: HISTOGRAM_MS_LATENCY_BOUNDARIES,
  },
  swingset_meter_usage: {
    description: 'Vat meter usage',
    unit: 'ms',
    boundaries: HISTOGRAM_MS_LATENCY_BOUNDARIES,
  },
  syscall_processing_time: {
    boundaries: HISTOGRAM_SECONDS_LATENCY_BOUNDARIES,
    description: 'Time taken to ccomplete a syscall, in seconds',
    unit: 's',
  },
});

const blockHistogramMetricDesc = {
  // Disabled because importing from @opentelemetry/api breaks kernel bundling.
  // Thankfully, it's the default anyway:
  // https://github.com/open-telemetry/opentelemetry-js/blob/f4dd2a1062f980cd344cfb172a515d00115df570/api/src/metrics/Metric.ts#L53-L57
  // valueType: ValueType.DOUBLE,
  unit: 's',
  advice: {
    explicitBucketBoundaries: [
      0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 3, 4, 5, 6, 7, 10, 15, 30,
    ],
  },
};
export const BLOCK_HISTOGRAM_METRICS = /** @type {const} */ ({
  swingsetRunSeconds: {
    description: 'Per-block time spent executing SwingSet',
    ...blockHistogramMetricDesc,
  },
  swingsetChainSaveSeconds: {
    description: 'Per-block time spent propagating SwingSet state into cosmos',
    ...blockHistogramMetricDesc,
  },
  swingsetCommitSeconds: {
    description:
      'Per-block time spent committing SwingSet state to host storage',
    ...blockHistogramMetricDesc,
  },
  cosmosCommitSeconds: {
    description: 'Per-block time spent committing cosmos state',
    ...blockHistogramMetricDesc,
  },
  fullCommitSeconds: {
    description:
      'Per-block time spent committing state, inclusive of COMMIT_BLOCK processing plus time spent [outside of cosmic-swingset] before and after it',
    ...blockHistogramMetricDesc,
  },
  interBlockSeconds: {
    description: 'Time spent idle between blocks',
    ...blockHistogramMetricDesc,
  },
  afterCommitHangoverSeconds: {
    description:
      'Per-block time spent waiting for previous-block afterCommit work',
    ...blockHistogramMetricDesc,
  },
  blockLagSeconds: {
    description: 'The delay of each block from its expected begin time',
    ...blockHistogramMetricDesc,
    // Add buckets for excessively long delays.
    advice: {
      ...blockHistogramMetricDesc.advice,
      explicitBucketBoundaries: /** @type {number[]} */ ([
        ...blockHistogramMetricDesc.advice.explicitBucketBoundaries,
        ...[60, 120, 180, 240, 300, 600, 3600],
      ]),
    },
  },
});

/** @enum {(typeof QueueMetricAspect)[keyof typeof QueueMetricAspect]} */
export const QueueMetricAspect = /** @type {const} */ ({
  Length: 'length',
  IncrementCount: 'increments',
  DecrementCount: 'decrements',
});

/**
 * Queue metrics come in {length,add,remove} triples sharing a common prefix.
 *
 * @param {string} namePrefix
 * @param {string} descPrefix
 * @returns {Record<
 *   QueueMetricAspect,
 *   { name: string; options: MetricAttributes }
 * >}
 */
export const makeQueueMetricsMeta = (namePrefix, descPrefix) => {
  /** @type {[QueueMetricAspect, string, string][]} */
  const metricsMeta = [
    [QueueMetricAspect.Length, 'length', 'length'],
    [QueueMetricAspect.IncrementCount, 'add', 'increments'],
    [QueueMetricAspect.DecrementCount, 'remove', 'decrements'],
  ];
  const entries = metricsMeta.map(([aspect, nameSuffix, descSuffix]) => {
    const name = `${namePrefix}_${nameSuffix}`;
    const description = `${descPrefix} ${descSuffix}`;
    // Future OpenTelemetry SDKs should also support creating Instruments with
    // attribute keys (such as the "queue" attribute for
    // "cosmic_swingset_inbound_queue_{length,add,remove}" measurements):
    // https://opentelemetry.io/docs/specs/otel/metrics/api/#instrument-advisory-parameter-attributes
    // At that time, a new field will be added to this record.
    return [aspect, { name, options: { description } }];
  });
  return Object.fromEntries(entries);
};

/**
 * @template {string} QueueName
 * @typedef QueueMetrics
 * @property {(lengths: Record<QueueName, number>) => void} initLengths must be
 *   called before any other function
 * @property {(lengths: Record<QueueName, number>) => void} updateLengths
 * @property {(queue: QueueName, delta?: number) => void} incLength for a
 *   non-negative delta
 * @property {(queue: QueueName, delta?: number) => void} decLength for a
 *   non-negative delta
 */

/**
 * Create {length,add,remove} Instruments for a queue and return functions for
 * consistently initializing and updating them.
 *
 * @template {string} QueueName
 * @param {object} config
 * @param {OTelMeter} config.otelMeter
 * @param {string} config.namePrefix
 * @param {string} config.descPrefix
 * @param {Pick<Console, 'warn'>} [config.console]
 * @returns {QueueMetrics<QueueName>}
 */
export const makeQueueMetrics = ({
  otelMeter,
  namePrefix,
  descPrefix,
  console,
}) => {
  const {
    [QueueMetricAspect.Length]: lengthMeta,
    [QueueMetricAspect.IncrementCount]: upMeta,
    [QueueMetricAspect.DecrementCount]: downMeta,
  } = makeQueueMetricsMeta(namePrefix, descPrefix);
  // TODO: When it's deemed safe to change reported metrics, make upCounter and
  // downCounter synchronous (and drop `increments` and `decrements` maps).
  // We can't do so until then because it will add a "_total" suffix to the
  // Prometheus export metric name, diverging from `makeInboundQueueMetrics` in
  // packages/cosmic-swingset/src/kernel-stats.js.
  // https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md#-other-changes
  const lengthCounter = otelMeter.createUpDownCounter(
    lengthMeta.name,
    lengthMeta.options,
  );
  // const upCounter = otelMeter.createCounter(upMeta.name, upMeta.options);
  // const downCounter = otelMeter.createCounter(downMeta.name, downMeta.options);
  const upCounter = otelMeter.createObservableCounter(
    upMeta.name,
    upMeta.options,
  );
  const downCounter = otelMeter.createObservableCounter(
    downMeta.name,
    downMeta.options,
  );
  const increments = /** @type {TotalMap<string, number>} */ (new Map());
  const decrements = /** @type {TotalMap<string, number>} */ (new Map());
  upCounter.addCallback(observer => {
    for (const [queueName, value] of increments.entries()) {
      observer.observe(value, { queue: queueName });
    }
  });
  downCounter.addCallback(observer => {
    for (const [queueName, value] of decrements.entries()) {
      observer.observe(value, { queue: queueName });
    }
  });

  let ready = false;
  const lengths = /** @type {TotalMap<string, number>} */ (new Map());
  const nudge = (queueName, delta, init = false) => {
    if (!lengths.has(queueName)) {
      if (!init) console?.warn('Unknown queue', queueName);
      lengths.set(queueName, 0);
      increments.set(queueName, 0);
      decrements.set(queueName, 0);
    }
    const oldLength = lengths.get(queueName);
    lengths.set(queueName, oldLength + delta);
    const dimensions = { queue: queueName };
    lengthCounter.add(delta, dimensions);
    if (init) {
      return;
    } else if (delta > 0) {
      // TODO per above: upCounter.add(delta, dimensions);
      increments.set(queueName, (increments.get(queueName) || 0) + delta);
    } else if (delta < 0) {
      // TODO per above: downCounter.add(-delta, dimensions);
      decrements.set(queueName, (decrements.get(queueName) || 0) - delta);
    }
    ready = true;
  };

  return harden({
    initLengths: initialLengths => {
      !ready ||
        console?.warn(
          `Unexpected repeat queue length initialization from ${q(lengths)} to ${q(initialLengths)}`,
        );
      for (const [queueName, newLength] of Object.entries(initialLengths)) {
        if (!isNat(newLength)) {
          console?.warn(`Invalid length for queue ${q(queueName)}:`, newLength);
          continue;
        }
        nudge(queueName, newLength, true);
      }
    },
    updateLengths: newLengths => {
      ready || console?.warn('Missing initial queue lengths');
      for (const [queueName, newLength] of Object.entries(newLengths)) {
        if (!isNat(newLength)) {
          console?.warn(`Invalid length for queue ${q(queueName)}:`, newLength);
          continue;
        }
        nudge(queueName, newLength - (lengths.get(queueName) || 0));
      }
    },
    incLength: (queueName, delta = 1) => {
      if (!isNat(delta)) {
        console?.warn(`Invalid increment for queue ${q(queueName)}:`, delta);
        return;
      }
      nudge(queueName, delta);
    },
    decLength: (queueName, delta = 1) => {
      if (!isNat(delta)) {
        console?.warn(`Invalid decrement for queue ${q(queueName)}:`, delta);
        return;
      }
      nudge(queueName, -delta);
    },
  });
};

// All the kernel metrics we are prepared for.
/** @enum {(typeof MetricType)[keyof typeof MetricType]} MetricType */
const MetricType = /** @type {const} */ ({
  Counter: 'counter',
  Gauge: 'gauge',
});
/**
 * @typedef KernelMetricMeta
 * @property {string} key
 * @property {string} name
 * @property {{ dimension: string; value: string }} [sub]
 * @property {string} description
 * @property {boolean} [consensus]
 * @property {MetricType} metricType
 */
/** @type {Omit<KernelMetricMeta, 'metricType'>[]} */
export const KERNEL_STATS_SUM_METRICS = [
  {
    key: 'syscalls',
    name: 'swingset_all_syscall_total',
    description: 'Total number of SwingSet kernel calls',
  },
  {
    key: 'syscallSend',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'send' },
    description: 'Total number of SwingSet message send kernel calls',
  },
  {
    key: 'syscallCallNow',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'callNow' },
    description: 'Total number of SwingSet synchronous device kernel calls',
  },
  {
    key: 'syscallSubscribe',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'subscribe' },
    description: 'Total number of SwingSet promise subscription kernel calls',
  },
  {
    key: 'syscallResolve',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'resolve' },
    description: 'Total number of SwingSet promise resolution kernel calls',
  },
  {
    key: 'syscallExit',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'exit' },
    description: 'Total number of SwingSet vat exit kernel calls',
  },
  {
    key: 'syscallVatstoreGet',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'vatstoreGet' },
    description: 'Total number of SwingSet vatstore get kernel calls',
  },
  {
    key: 'syscallVatstoreSet',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'vatstoreSet' },
    description: 'Total number of SwingSet vatstore set kernel calls',
  },
  {
    key: 'syscallVatstoreGetNextKey',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'vatstoreGetNext' },
    description: 'Total number of SwingSet vatstore getNextKey kernel calls',
  },
  {
    key: 'syscallVatstoreDelete',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'vatstoreDelete' },
    description: 'Total number of SwingSet vatstore delete kernel calls',
  },
  {
    key: 'syscallDropImports',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'dropImports' },
    description: 'Total number of SwingSet drop imports kernel calls',
  },
  {
    key: 'dispatches',
    name: 'swingset_dispatch_total',
    description: 'Total number of SwingSet vat calls',
  },
  {
    key: 'dispatchDeliver',
    name: 'swingset_dispatch_deliver_total',
    description: 'Total number of SwingSet vat message deliveries',
  },
  {
    key: 'dispatchNotify',
    name: 'swingset_dispatch_notify_total',
    description: 'Total number of SwingSet vat promise notifications',
  },
];

/** @type {Omit<KernelMetricMeta, 'metricType'>[]} */
export const KERNEL_STATS_UPDOWN_METRICS = [
  {
    key: 'kernelObjects',
    name: 'swingset_kernel_objects',
    description: 'Active kernel objects',
  },
  {
    key: 'kernelDevices',
    name: 'swingset_kernel_devices',
    description: 'Active kernel devices',
  },
  {
    key: 'kernelPromises',
    name: 'swingset_kernel_promises',
    description: 'Active kernel promises',
  },
  {
    key: 'kpUnresolved',
    name: 'swingset_unresolved_kernel_promises',
    description: 'Unresolved kernel promises',
  },
  {
    key: 'kpFulfilled',
    name: 'swingset_fulfilled_kernel_promises',
    description: 'Fulfilled kernel promises',
  },
  {
    key: 'kpRejected',
    name: 'swingset_rejected_kernel_promises',
    description: 'Rejected kernel promises',
  },
  {
    key: 'runQueueLength',
    name: 'swingset_run_queue_length',
    consensus: true,
    description: 'Length of the kernel run queue',
  },
  {
    key: 'acceptanceQueueLength',
    name: 'swingset_acceptance_queue_length',
    consensus: true,
    description: 'Length of the kernel acceptance queue',
  },
  {
    key: 'promiseQueuesLength',
    name: 'swingset_promise_queues_length',
    consensus: true,
    description: 'Combined length of all kernel promise queues',
  },
  {
    key: 'clistEntries',
    name: 'swingset_clist_entries',
    description: 'Number of entries in the kernel c-list',
  },
  {
    key: 'vats',
    name: 'swingset_vats',
    description: 'Number of active vats',
  },
];

const { Counter, Gauge } = MetricType;
/** @type {KernelMetricMeta[]} */
export const KERNEL_STATS_METRICS = harden([
  ...KERNEL_STATS_SUM_METRICS.map(m => ({ ...m, metricType: Counter })),
  ...KERNEL_STATS_UPDOWN_METRICS.map(m => ({ ...m, metricType: Gauge })),
]);

// Ensure kernel stats key uniqueness.
const kernelStatsKeys = new Map();
for (const { key } of KERNEL_STATS_METRICS) {
  kernelStatsKeys.set(key, (kernelStatsKeys.get(key) || 0) + 1);
}
const duplicateKernelStatsKeys = [...kernelStatsKeys.entries()].flatMap(
  ([key, value]) => (value > 1 ? [key] : []),
);
if (duplicateKernelStatsKeys.length > 0) {
  const msg = `Duplicate kernel stats keys ${JSON.stringify(duplicateKernelStatsKeys)}`;
  throw Error(msg);
}
