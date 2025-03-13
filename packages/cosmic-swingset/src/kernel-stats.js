// @ts-check
import { MeterProvider } from '@opentelemetry/sdk-metrics';

import { Fail } from '@endo/errors';
import { isNat } from '@endo/nat';

import { makeLegacyMap } from '@agoric/store';
import { defineName } from '@agoric/internal/src/js-utils.js';

import { KERNEL_STATS_METRICS } from '@agoric/swingset-vat/src/kernel/metrics.js';

import v8 from 'node:v8';
import process from 'node:process';

/** @import {Histogram, Meter as OTelMeter, MetricAttributes, ObservableCounter, ObservableUpDownCounter} from '@opentelemetry/api' */

/** @import {TotalMap} from '@agoric/internal' */

// import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.VERBOSE);

/**
 * TODO Would be nice somehow to label the vats individually, but it's too
 * high cardinality for us unless we can somehow limit the number of active
 * metrics (many more than 20 vats).
 */
const VAT_ID_IS_TOO_HIGH_CARDINALITY = true;

export const HISTOGRAM_MS_LATENCY_BOUNDARIES = [
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
export const HISTOGRAM_SECONDS_LATENCY_BOUNDARIES =
  HISTOGRAM_MS_LATENCY_BOUNDARIES.map(ms => ms / 1000);

// TODO: Validate these boundaries. We're not going to have 5ms blocks, but
// we probably care about the difference between 10 vs. 30 seconds.
const HISTOGRAM_METRICS = /** @type {const} */ ({
  swingset_crank_processing_time: {
    description: 'Processing time per crank (ms)',
    boundaries: [1, 11, 21, 31, 41, 51, 61, 71, 81, 91, Infinity],
  },
  swingset_block_processing_seconds: {
    description: 'Processing time per block',
    boundaries: HISTOGRAM_SECONDS_LATENCY_BOUNDARIES,
  },
  swingset_vat_startup: {
    description: 'Vat startup time (ms)',
    boundaries: HISTOGRAM_MS_LATENCY_BOUNDARIES,
  },
  swingset_vat_delivery: {
    description: 'Vat delivery time (ms)',
    boundaries: HISTOGRAM_MS_LATENCY_BOUNDARIES,
  },
  swingset_meter_usage: {
    description: 'Vat meter usage',
    boundaries: HISTOGRAM_MS_LATENCY_BOUNDARIES,
  },
});

/** @enum {(typeof QueueMetricAspect)[keyof typeof QueueMetricAspect]} */
const QueueMetricAspect = /** @type {const} */ ({
  Length: 'length',
  IncrementCount: 'increments',
  DecrementCount: 'decrements',
});

/**
 * Queue metrics come in {length,add,remove} triples sharing a common prefix.
 *
 * @param {string} namePrefix
 * @param {string} descPrefix
 * @returns {Record<string, {aspect: QueueMetricAspect, description: string}>}
 */
const makeQueueMetrics = (namePrefix, descPrefix) => {
  /** @type {Array<[QueueMetricAspect, string, string]>} */
  const metricsMeta = [
    [QueueMetricAspect.Length, 'length', 'length'],
    [QueueMetricAspect.IncrementCount, 'add', 'increments'],
    [QueueMetricAspect.DecrementCount, 'remove', 'decrements'],
  ];
  const entries = metricsMeta.map(([aspect, nameSuffix, descSuffix]) => {
    const name = `${namePrefix}_${nameSuffix}`;
    const description = `${descPrefix} ${descSuffix}`;
    return [name, { aspect, description }];
  });
  return Object.fromEntries(entries);
};

const QUEUE_METRICS = harden({
  // "cosmic_swingset_inbound_queue_{length,add,remove}" measurements carry a
  // "queue" attribute.
  // Future OpenTelemetry SDKs should support expressing that in Instrument
  // creation:
  // https://opentelemetry.io/docs/specs/otel/metrics/api/#instrument-advisory-parameter-attributes
  ...makeQueueMetrics('cosmic_swingset_inbound_queue', 'inbound queue'),
});

const maxAgeCache = (fn, maxAge, clock = Date.now) => {
  // An initial invocation verifies that the function doesn't [always] throw.
  let cached = fn();
  let lastTime = -Infinity;
  const get = defineName(`caching ${fn.name}`, () => {
    const time = clock();
    if (time - lastTime < maxAge) return cached;

    lastTime = time;
    cached = fn();
    return cached;
  });
  return { get, firstResult: cached };
};

const wrapDeltaMS = (finisher, useDeltaMS) => {
  const startMS = Date.now();
  return (...finishArgs) => {
    try {
      return finisher(...finishArgs);
    } finally {
      const deltaMS = Date.now() - startMS;
      useDeltaMS(deltaMS, finishArgs);
    }
  };
};

const recordToKey = record =>
  JSON.stringify(
    Object.entries(record).sort(([ka], [kb]) => (ka < kb ? -1 : 1)),
  );

export function makeDefaultMeterProvider() {
  return new MeterProvider();
}

/**
 * @param {OTelMeter} metricMeter
 * @param {string} name
 */
function createHistogram(metricMeter, name) {
  const { description, boundaries } = HISTOGRAM_METRICS[name] || {};
  const advice = boundaries && { explicitBucketBoundaries: boundaries };
  return metricMeter.createHistogram(name, { description, advice });
}

/**
 * @param {{ metricMeter: OTelMeter, attributes?: MetricAttributes }} options
 */
export function makeSlogCallbacks({ metricMeter, attributes = {} }) {
  // Legacy because legacyMaps are not passable
  const groupToRecorder = makeLegacyMap('metricGroup');

  /**
   * This function reuses or creates per-group named metrics.
   *
   * @param {string} name name of the base metric
   * @param {MetricAttributes} [group] the
   *   attributes to associate with a group
   * @param {MetricAttributes} [instance] the specific metric attributes
   * @returns {Pick<Histogram, 'record'>} the attribute-aware recorder
   */
  const getGroupedRecorder = (name, group = undefined, instance = {}) => {
    let nameToRecorder;
    const groupKey = group && recordToKey(group);
    const instanceKey = recordToKey(instance);
    if (groupToRecorder.has(groupKey)) {
      let oldInstanceKey;
      [nameToRecorder, oldInstanceKey] = groupToRecorder.get(groupKey);
      if (group) {
        if (instanceKey !== oldInstanceKey) {
          for (const metric of nameToRecorder.values()) {
            // FIXME: Delete all the metrics of the old instance.
            metric;
          }
          // Refresh the metric group.
          // Legacy because Metric thing does not seem to be a passable
          nameToRecorder = makeLegacyMap('metricName');
          groupToRecorder.set(groupKey, [nameToRecorder, instanceKey]);
        }
      }
    } else {
      // Legacy because Metric thing does not seem to be a passable
      nameToRecorder = makeLegacyMap('metricName');
      groupToRecorder.init(groupKey, [nameToRecorder, instanceKey]);
    }

    /** @type {Histogram} */
    let recorder;
    if (nameToRecorder.has(name)) {
      recorder = nameToRecorder.get(name);
    } else {
      // Bind the base metric to the group and instance attributes.
      const metric = createHistogram(metricMeter, name);
      // Create a value recorder with the specfic attributes.
      recorder = harden({
        record: (value, attrs) =>
          metric.record(value, {
            ...attributes,
            ...group,
            ...instance,
            ...attrs,
          }),
      });
      nameToRecorder.init(name, recorder);
    }
    return recorder;
  };

  /**
   * Return the vat metric group that should be reset when the stats change.
   *
   * @param {string} vatID
   * @returns {Record<string,string> | undefined}
   */
  const getVatGroup = vatID => {
    if (VAT_ID_IS_TOO_HIGH_CARDINALITY) {
      return undefined;
    }
    return { vatID };
  };

  /**
   * Measure some interesting stats.  We currently do a per-vat recording of
   * time spent in the vat for startup and delivery.
   */
  const slogCallbacks = {
    startup(_method, [vatID], finisher) {
      return wrapDeltaMS(finisher, deltaMS => {
        const group = getVatGroup(vatID);
        // DEPRECATED: This should be equivalent to the "seconds" data of
        // "vat-startup-finish" slog entries.
        getGroupedRecorder('swingset_vat_startup', group).record(deltaMS);
      });
    },
    delivery(_method, [vatID], finisher) {
      return wrapDeltaMS(
        finisher,
        (deltaMS, [[_status, _problem, meterUsage]]) => {
          const group = getVatGroup(vatID);
          // DEPRECATED: This should be equivalent to the "seconds" data of
          // "deliver-result" slog entries.
          getGroupedRecorder('swingset_vat_delivery', group).record(deltaMS);
          const { meterType, ...measurements } = meterUsage || {};
          for (const [key, value] of Object.entries(measurements)) {
            if (typeof value === 'object') continue;
            // DEPRECATED: This should be equivalent to the data of
            // "deliver-result" slog entries as the third element of the "dr"
            // array.
            // TODO: Each measurement key should have its own histogram; there's
            // no reason to mix e.g. allocate/compute/currentHeapCount.
            // cf. https://prometheus.io/docs/practices/naming/#metric-names
            const detail = { ...(meterType ? { meterType } : {}), stat: key };
            getGroupedRecorder('swingset_meter_usage', group, detail).record(
              value || 0,
            );
          }
        },
      );
    },
  };

  return harden(slogCallbacks);
}

/**
 * @template {string} QueueName
 * @typedef InboundQueueMetricsManager
 * @property {(newLengths: Record<QueueName, number>) => void} updateLengths
 * @property {(queueName: QueueName, delta?: number) => void} decStat
 * @property {() => Record<string, number>} getStats
 */

/**
 * Create a metrics manager for inbound queues. It must be initialized with the
 * length of each queue and informed of each subsequent change so that metrics
 * can be provided from RAM.
 *
 * Note that the add/remove counts will get reset at restart, but
 * Prometheus/etc tools can tolerate that just fine.
 *
 * @template {string} QueueName
 * @param {OTelMeter} metricMeter
 * @param {Record<QueueName, number>} initialLengths per-queue
 * @param {Console} logger
 * @returns {InboundQueueMetricsManager<QueueName>}
 */
function makeInboundQueueMetrics(metricMeter, initialLengths, logger) {
  const initialEntries = Object.entries(initialLengths);
  const zeroEntries = initialEntries.map(([queueName]) => [queueName, 0]);
  const makeQueueCounts = entries => {
    for (const [queueName, length] of entries) {
      isNat(length) ||
        Fail`invalid initial length for queue ${queueName}: ${length}`;
    }
    return /** @type {TotalMap<string, number>} */ (new Map(entries));
  };
  /**
   * For each {length,increment count,decrement count} aspect (each such aspect
   * corresponding to a single OpenTelemetry Instrument), keep a map of values
   * keyed by queue name (each corresponding to a value of Attribute "queue").
   *
   * @type {Record<QueueMetricAspect, TotalMap<string, number>>}
   */
  const counterData = {
    [QueueMetricAspect.Length]: makeQueueCounts(initialEntries),
    [QueueMetricAspect.IncrementCount]: makeQueueCounts(zeroEntries),
    [QueueMetricAspect.DecrementCount]: makeQueueCounts(zeroEntries),
  };

  // In the event of misconfigured reporting for an unknown queue, accept the
  // data with a warning rather than either ignore it or halt the chain.
  const provideQueue = queueName => {
    if (counterData[QueueMetricAspect.Length].has(queueName)) return;
    logger.warn(`unknown inbound queue ${JSON.stringify(queueName)}`);
    for (const [aspect, map] of Object.entries(counterData)) {
      const old = map.get(queueName);
      old === undefined ||
        Fail`internal: unexpected preexisting ${aspect}=${old} data for late queue ${queueName}`;
      map.set(queueName, 0);
    }
  };

  const nudge = (map, queueName, delta) => {
    const old = map.get(queueName);
    old !== undefined ||
      Fail`internal: unexpected missing data for queue ${queueName}`;
    map.set(queueName, old + delta);
  };

  // Wire up callbacks for reporting the OpenTelemetry measurements:
  // queue length is an UpDownCounter, while increment and decrement counts are
  // [monotonic] Counters.
  // But note that the Prometheus representation of the former will be a Gauge:
  // https://prometheus.io/docs/concepts/metric_types/
  for (const [name, { aspect, description }] of Object.entries(QUEUE_METRICS)) {
    const isMonotonic = aspect !== QueueMetricAspect.Length;
    const instrumentOptions = { description };
    const asyncInstrument = isMonotonic
      ? metricMeter.createObservableCounter(name, instrumentOptions)
      : metricMeter.createObservableUpDownCounter(name, instrumentOptions);
    asyncInstrument.addCallback(observer => {
      for (const [queueName, value] of counterData[aspect].entries()) {
        observer.observe(value, { queue: queueName });
      }
    });
  }

  return harden({
    updateLengths: newLengths => {
      for (const [queueName, newLength] of Object.entries(newLengths)) {
        provideQueue(queueName);
        isNat(newLength) ||
          Fail`invalid length for queue ${queueName}: ${newLength}`;
        const oldLength = counterData[QueueMetricAspect.Length].get(queueName);
        counterData[QueueMetricAspect.Length].set(queueName, newLength);
        if (newLength > oldLength) {
          const map = counterData[QueueMetricAspect.IncrementCount];
          nudge(map, queueName, newLength - oldLength);
        } else if (newLength < oldLength) {
          const map = counterData[QueueMetricAspect.DecrementCount];
          nudge(map, queueName, oldLength - newLength);
        }
      }
    },

    decStat: (queueName, delta = 1) => {
      provideQueue(queueName);
      isNat(delta) || Fail`invalid decStat for queue ${queueName}: ${delta}`;
      nudge(counterData[QueueMetricAspect.Length], queueName, -delta);
      nudge(counterData[QueueMetricAspect.DecrementCount], queueName, delta);
    },

    getStats: () => {
      // For each [length,add,remove] metric name, emit both a
      // per-queue-name count and a pre-aggregated sum over all queue names
      // (the latter is necessary for backwards compatibility until all old
      // consumers of e.g. slog entries have been updated).
      const entries = [];
      for (const [name, { aspect }] of Object.entries(QUEUE_METRICS)) {
        let sum = 0;
        for (const [queueName, value] of counterData[aspect].entries()) {
          sum += value;
          entries.push([`${name}_${queueName}`, value]);
        }
        entries.push([name, sum]);
      }
      return Object.fromEntries(entries);
    },
  });
}

/**
 * @template {string} QueueName
 * @param {object} config
 * @param {any} config.controller
 * @param {OTelMeter} config.metricMeter
 * @param {Console} config.log
 * @param {MetricAttributes} [config.attributes]
 * @param {Record<QueueName, number>} [config.initialQueueLengths] per-queue
 */
export function exportKernelStats({
  controller,
  metricMeter,
  log = console,
  attributes = {},
  initialQueueLengths = /** @type {any} */ ({}),
}) {
  /** @type {Set<string>} */
  const expectedKernelStats = new Set();
  /** @type {Map<string, ObservableCounter | ObservableUpDownCounter>} */
  const kernelStatsCounters = new Map();

  for (const meta of KERNEL_STATS_METRICS) {
    const { key, name, sub, metricType, ...options } = meta;
    expectedKernelStats.add(key);
    if (metricType === 'gauge') {
      expectedKernelStats.add(`${key}Up`);
      expectedKernelStats.add(`${key}Down`);
      expectedKernelStats.add(`${key}Max`);
    } else if (metricType !== 'counter') {
      Fail`Unknown metric type ${metricType}`;
    }
    let counter = kernelStatsCounters.get(name);
    if (!counter) {
      counter =
        metricType === 'counter'
          ? metricMeter.createObservableCounter(name, options)
          : metricMeter.createObservableUpDownCounter(name, options);
      kernelStatsCounters.set(name, counter);
    }
    const reportedAttributes = { ...attributes };
    if (sub) {
      reportedAttributes[sub.dimension] = sub.value;
    }
    counter.addCallback(observableResult => {
      observableResult.observe(getKernelStats()[key], reportedAttributes);
    });
  }

  const getKernelStats = maxAgeCache(() => {
    const stats = controller.getStats();

    const notYetFoundKernelStats = new Set(expectedKernelStats.keys());
    for (const key of Object.keys(stats)) {
      notYetFoundKernelStats.delete(key);
      if (!expectedKernelStats.has(key)) {
        log.warn('Unexpected SwingSet kernel statistic', key);
        expectedKernelStats.add(key);
      }
    }
    for (const key of notYetFoundKernelStats) {
      log.warn('Expected SwingSet kernel statistic not found', key);
    }

    return stats;
  }, 800).get;

  // These are not kernel stats, they're outside the kernel.
  const inboundQueueMetrics = makeInboundQueueMetrics(
    metricMeter,
    initialQueueLengths,
    log,
  );

  // TODO: We probably shouldn't roll our own Node.js process metrics, but a
  // cursory search for "opentelemetry node.js VM instrumentation" didn't reveal
  // anything useful.
  const cachingHeapStats = maxAgeCache(() => v8.getHeapStatistics(), 800);
  const getHeapStats = cachingHeapStats.get;
  for (const key of Object.keys(cachingHeapStats.firstResult)) {
    const name = `heapStats_${key}`;
    const options = { description: 'v8 kernel heap statistic' };
    const counter = metricMeter.createObservableUpDownCounter(name, options);
    counter.addCallback(observableResult => {
      observableResult.observe(getHeapStats()[key], attributes);
    });
  }

  const cachingMemUsage = maxAgeCache(() => process.memoryUsage(), 800);
  const getMemoryUsage = cachingMemUsage.get;
  for (const key of Object.keys(cachingMemUsage.firstResult)) {
    const name = `memoryUsage_${key}`;
    const options = { description: 'kernel process memory statistic' };
    const counter = metricMeter.createObservableUpDownCounter(name, options);
    counter.addCallback(observableResult => {
      observableResult.observe(getMemoryUsage()[key], attributes);
    });
  }

  const [schedulerCrankTimeHistogram, schedulerBlockTimeHistogram] = [
    'swingset_crank_processing_time',
    'swingset_block_processing_seconds',
  ].map(name => createHistogram(metricMeter, name));

  /**
   * @deprecated Histogram measurements produced by this function should be
   *   equivalent to the "seconds" data of slog entries
   *   (schedulerCrankTimeHistogram via "crank-finish" entries;
   *   schedulerBlockTimeHistogram via "cosmic-swingset-run-finish" entries--and
   *   note that the latter name is inaccurate anyway because its measurements
   *   are produced once per `controller.run()` rather than once per block).
   * @param {any} policy
   * @param {() => number} msClock
   */
  async function crankScheduler(policy, msClock = () => Date.now()) {
    let now = msClock();
    let crankStart = now;
    const blockStart = now;

    const instrumentedPolicy = harden({
      ...policy,
      crankComplete(details) {
        const go = policy.crankComplete(details);
        schedulerCrankTimeHistogram.record(now - crankStart, attributes);
        crankStart = now;
        now = msClock();
        return go;
      },
    });
    await controller.run(instrumentedPolicy);

    now = msClock();
    schedulerBlockTimeHistogram.record((now - blockStart) / 1000, attributes);
  }

  return {
    crankScheduler,
    schedulerCrankTimeHistogram,
    schedulerBlockTimeHistogram,
    inboundQueueMetrics,
  };
}
