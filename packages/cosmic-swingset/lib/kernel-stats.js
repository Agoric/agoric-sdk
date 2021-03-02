import { MeterProvider } from '@opentelemetry/metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

import {
  KERNEL_STATS_SUM_METRICS,
  KERNEL_STATS_UPDOWN_METRICS,
} from '@agoric/swingset-vat/src/kernel/metrics';

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
