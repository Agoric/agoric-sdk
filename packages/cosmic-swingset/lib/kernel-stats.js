import { MeterProvider } from '@opentelemetry/metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

// All the kernel metrics we are prepared for.
const KERNEL_STATS_SUM_METRICS = [
  {
    key: 'syscalls',
    name: 'swingset_syscall_total',
    description: 'Total number of SwingSet kernel calls',
  },
  {
    key: 'syscallSend',
    name: 'swingset_syscall_send_total',
    description: 'Total number of SwingSet message send kernel calls',
  },
  {
    key: 'syscallCallNow',
    name: 'swingset_syscall_call_now_total',
    description: 'Total number of SwingSet synchronous device kernel calls',
  },
  {
    key: 'syscallSubscribe',
    name: 'swingset_syscall_subscribe_total',
    description: 'Total number of SwingSet promise subscription kernel calls',
  },
  {
    key: 'syscallResolve',
    name: 'swingset_syscall_resolve_total',
    description: 'Total number of SwingSet promise resolution kernel calls',
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

const KERNEL_STATS_UPDOWN_METRICS = [
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
    key: 'kpFulfilledToPresence',
    name: 'swingset_presence_kernel_promises',
    description: 'Kernel promises fulfilled to presences',
  },
  {
    key: 'kpFulfilledToData',
    name: 'swingset_data_kernel_promises',
    description: 'Kernel promises fulfilled to data',
  },
  {
    key: 'kpRejected',
    name: 'swingset_rejected_kernel_promises',
    description: 'Rejected kernel promises',
  },
  {
    key: 'runQueueLength',
    name: 'swingset_run_queue_length',
    description: 'Length of the kernel run queue',
  },
  {
    key: 'clistEntries',
    name: 'swingset_clist_entries',
    description: 'Number of entries in the kernel c-list',
  },
];

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
