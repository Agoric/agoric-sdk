import { MeterProvider } from '@opentelemetry/metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

import makeStore from '@agoric/store';

import {
  KERNEL_STATS_SUM_METRICS,
  KERNEL_STATS_UPDOWN_METRICS,
} from '@agoric/swingset-vat/src/kernel/metrics';

export const DEFAULT_METER_PROVIDER = new MeterProvider();

export const HISTOGRAM_SECONDS_LATENCY_BOUNDARIES = [
  0.005,
  0.01,
  0.025,
  0.05,
  0.1,
  0.25,
  0.5,
  1,
  2.5,
  5,
  10,
  Infinity,
];

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

export function makeSlogCallbacks({ metricMeter, labels }) {
  const nameToBaseMetric = makeStore('baseMetricName');
  nameToBaseMetric.init(
    'swingset_vat_startup',
    metricMeter.createValueRecorder('swingset_vat_startup', {
      description: 'Vat startup time (ms)',
    }),
  );
  nameToBaseMetric.init(
    'swingset_vat_delivery',
    metricMeter.createValueRecorder('swingset_vat_delivery', {
      description: 'Vat delivery time (ms)',
    }),
  );
  nameToBaseMetric.init(
    'swingset_meter_usage',
    metricMeter.createValueRecorder('swingset_meter_usage', {
      description: 'Vat meter usage',
    }),
  );
  const groupToMetrics = makeStore('metricGroup');

  /**
   * This function reuses or creates per-group named metrics.
   *
   * @param {string} name name of the base metric
   * @param {Record<string, string>} [group] the labels to associate with a group
   * @param {Record<string, string>} [instance] the specific metric labels
   * @returns {any} the labelled metric
   */
  const getGroupedMetric = (name, group = {}, instance = {}) => {
    let nameToMetric;
    const groupKey = recordToKey(group);
    const instanceKey = recordToKey(instance);
    if (groupToMetrics.has(groupKey)) {
      let oldInstanceKey;
      [nameToMetric, oldInstanceKey] = groupToMetrics.get(groupKey);
      if (instanceKey !== oldInstanceKey) {
        for (const metric of nameToMetric.values()) {
          // FIXME: Delete all the metrics of the old instance.
          metric;
        }
        // Refresh the metric group.
        nameToMetric = makeStore('metricName');
        groupToMetrics.set(groupKey, [nameToMetric, instanceKey]);
      }
    } else {
      nameToMetric = makeStore('metricName');
      groupToMetrics.init(groupKey, [nameToMetric, instanceKey]);
    }

    let metric;
    if (nameToMetric.has(name)) {
      metric = nameToMetric.get(name);
    } else {
      // Bind the base metric to the group and instance labels.
      metric = nameToBaseMetric
        .get(name)
        .bind({ ...labels, ...group, ...instance });
      nameToMetric.init(name, metric);
    }
    return metric;
  };

  /**
   * Measure some interesting stats.  We currently do a per-vat recording of
   * time spent in the vat for startup and delivery.
   */
  const slogCallbacks = {
    startup(_method, [vatID], finisher) {
      return wrapDeltaMS(finisher, deltaMS => {
        getGroupedMetric('swingset_vat_startup', { vatID }).record(deltaMS);
      });
    },
    delivery(_method, [vatID], finisher) {
      return wrapDeltaMS(finisher, (deltaMS, [[_status, _problem, usage]]) => {
        getGroupedMetric('swingset_vat_delivery', { vatID }).record(deltaMS);
        if (usage) {
          // Add to aggregated metering stats.
          const group = { vatID };
          for (const [key, value] of Object.entries(usage)) {
            if (key === 'meterType') {
              // eslint-disable-next-line no-continue
              continue;
            }
            getGroupedMetric(`swingset_meter_usage`, group, {
              // The meterType is an instance-specific label--a change in it
              // will result in the old value being discarded.
              ...(usage.meterType && { meterType: usage.meterType }),
              stat: key,
            }).record(value || 0);
          }
        }
      });
    },
  };

  return harden(slogCallbacks);
}

/**
 * @param {Object} param0
 * @param {any} param0.controller
 * @param {import('@opentelemetry/metrics').Meter} param0.metricMeter
 * @param {Console} param0.log
 * @param {Record<string, any>} param0.labels
 */
export function exportKernelStats({
  controller,
  metricMeter,
  log = console,
  labels,
}) {
  const kernelStatsMetrics = new Map();
  const expectedKernelStats = new Set();

  KERNEL_STATS_SUM_METRICS.forEach(({ key, name, ...options }) => {
    expectedKernelStats.add(key);
    kernelStatsMetrics.set(key, metricMeter.createSumObserver(name, options));
  });

  KERNEL_STATS_UPDOWN_METRICS.forEach(({ key, name, ...options }) => {
    expectedKernelStats.add(key);
    expectedKernelStats.add(`${key}Up`);
    expectedKernelStats.add(`${key}Down`);
    expectedKernelStats.add(`${key}Max`);
    kernelStatsMetrics.set(
      key,
      metricMeter.createUpDownSumObserver(name, options),
    );
  });

  function warnUnexpectedKernelStat(key) {
    if (!expectedKernelStats.has(key)) {
      log.warn(`Unexpected SwingSet kernel statistic`, key);
      expectedKernelStats.add(key);
    }
  }

  function checkKernelStats(stats) {
    const notYetFoundKernelStats = new Set(kernelStatsMetrics.keys());
    Object.keys(stats).forEach(key => {
      notYetFoundKernelStats.delete(key);
      warnUnexpectedKernelStat(key);
    });
    notYetFoundKernelStats.forEach(key => {
      log.warn(`Expected SwingSet kernel statistic`, key, `not found`);
    });
  }

  // We check everything on initialization.  Other checks happen when scraping.
  checkKernelStats(controller.getStats());
  metricMeter.createBatchObserver(batchObserverResult => {
    const observations = [];
    Object.entries(controller.getStats()).forEach(([key, value]) => {
      warnUnexpectedKernelStat(key);
      if (kernelStatsMetrics.has(key)) {
        const metric = kernelStatsMetrics.get(key);
        observations.push(metric.observation(value));
      }
    });
    batchObserverResult.observe(labels, observations);
  });

  const schedulerCrankTimeHistogram = metricMeter
    .createValueRecorder('swingset_crank_processing_time', {
      description: 'Processing time per crank (ms)',
      boundaries: [1, 11, 21, 31, 41, 51, 61, 71, 81, 91, Infinity],
    })
    .bind(labels);

  const schedulerBlockTimeHistogram = metricMeter
    .createValueRecorder('swingset_block_processing_seconds', {
      description: 'Processing time per block',
      boundaries: HISTOGRAM_SECONDS_LATENCY_BOUNDARIES,
    })
    .bind(labels);

  return { schedulerCrankTimeHistogram, schedulerBlockTimeHistogram };
}

/**
 * Interpret the meter provider environment variables.
 *
 * @param {{ log: Console['log'] }} console
 * @param {Record<string, string>} env
 */
export function getMeterProvider(console, env) {
  if (
    !env.OTEL_EXPORTER_PROMETHEUS_HOST &&
    !env.OTEL_EXPORTER_PROMETHEUS_PORT
  ) {
    return undefined;
  }
  const host =
    env.OTEL_EXPORTER_PROMETHEUS_HOST ||
    PrometheusExporter.DEFAULT_OPTIONS.host ||
    '0.0.0.0';
  const port =
    Number(env.OTEL_EXPORTER_PROMETHEUS_PORT) ||
    PrometheusExporter.DEFAULT_OPTIONS.port;
  const exporter = new PrometheusExporter(
    {
      startServer: true,
      host,
      port,
    },
    () => {
      console.log(
        `Prometheus scrape endpoint: http://${host}:${port}${PrometheusExporter.DEFAULT_OPTIONS.endpoint}`,
      );
    },
  );
  return new MeterProvider({ exporter, interval: 1000 });
}
