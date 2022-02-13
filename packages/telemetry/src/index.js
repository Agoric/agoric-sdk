// @ts-check
/* globals globalThis, process */
import { MeterProvider } from '@opentelemetry/sdk-metrics-base';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

export * from './make-slog-sender.js';

/**
 * @typedef {Object} Powers
 * @property {{ warn: Console['warn'] }} console
 * @property {NodeJS.ProcessEnv} env
 */

/**
 * @param {Partial<Powers>} param0
 */
const getPrometheusMeterProvider = ({
  console = globalThis.console,
  env = process.env,
} = {}) => {
  const { OTEL_EXPORTER_PROMETHEUS_PORT } = env;
  if (!OTEL_EXPORTER_PROMETHEUS_PORT) {
    // No Prometheus config, so don't install.
    return undefined;
  }

  const port =
    parseInt(OTEL_EXPORTER_PROMETHEUS_PORT || '', 10) ||
    PrometheusExporter.DEFAULT_OPTIONS.port;

  const exporter = new PrometheusExporter(
    {
      port,
    },
    () => {
      console.warn(
        `Prometheus scrape endpoint: http://0.0.0.0:${port}${PrometheusExporter.DEFAULT_OPTIONS.endpoint}`,
      );
    },
  );

  return new MeterProvider({
    exporter,
    interval: 1000,
  });
};

/**
 * Obtain the telemetry providers used by the `@opentelemetry` packages.
 *
 * @param {Partial<Powers>=} powers
 * @returns {{ metricsProvider?: MeterProvider }}
 */
export const getTelemetryProviders = powers => {
  const ret = {};
  const metricsProvider = getPrometheusMeterProvider(powers);
  if (metricsProvider) {
    ret.metricsProvider = metricsProvider;
  }
  return ret;
};
