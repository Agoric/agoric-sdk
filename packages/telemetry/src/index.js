// @ts-check
/* globals globalThis, process */
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

import {
  MeterProvider,
  ConsoleMetricExporter,
} from '@opentelemetry/sdk-metrics-base';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

export const DEFAULT_METER_PROVIDER_INTERVAL = 1_000;

// These numbers are chosen to attempt to export all spans.
export const SPAN_MAX_QUEUE_SIZE = 100_000;
export const SPAN_EXPORT_DELAY_MS = 1_000;

/**
 * @typedef {Object} Powers
 * @property {{ warn: Console['warn'] }} console
 * @property {NodeJS.ProcessEnv} env
 */

/**
 * @param {Partial<Powers>} param0
 */
export const getDebuggingTracingProvider = ({ env = process.env } = {}) => {
  const { OTEL_EXPORTER_DEBUG } = env;
  if (!OTEL_EXPORTER_DEBUG) {
    return undefined;
  }

  const exporter = new ConsoleSpanExporter();
  const provider = new BasicTracerProvider();
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  return provider;
};

/**
 * @param {Partial<Powers>} param0
 */
export const getOTLPHTTPTracingProvider = ({ env = process.env } = {}) => {
  const {
    OTEL_EXPORTER_OTLP_ENDPOINT,
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  } = env;
  if (!OTEL_EXPORTER_OTLP_ENDPOINT && !OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
    return undefined;
  }

  const exporter = new OTLPTraceExporter();
  console.info('Enabling OTLP Traces Exporter to', exporter.getDefaultUrl({}));

  const provider = new BasicTracerProvider();
  provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
    maxQueueSize: SPAN_MAX_QUEUE_SIZE,
    maxExportBatchSize: SPAN_MAX_QUEUE_SIZE,
    scheduledDelayMillis: SPAN_EXPORT_DELAY_MS,
  }));
  return provider;
};

/**
 * @param {Partial<Powers>} param0
 */
export const getDebuggingMeterProvider = ({ env = process.env } = {}) => {
  const { OTEL_EXPORTER_DEBUG } = env;
  if (!OTEL_EXPORTER_DEBUG) {
    return undefined;
  }

  const exporter = new ConsoleMetricExporter();
  const provider = new MeterProvider({
    exporter,
    interval: 1000,
  });
  return provider;
};

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
    interval: DEFAULT_METER_PROVIDER_INTERVAL,
  });
};

/**
 * @param {Partial<Powers>} param0
 */
export const getOTLPHTTPMeterProvider = ({ env = process.env } = {}) => {
  const {
    OTEL_EXPORTER_OTLP_ENDPOINT,
    OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
  } = env;
  if (!OTEL_EXPORTER_OTLP_ENDPOINT && !OTEL_EXPORTER_OTLP_METRICS_ENDPOINT) {
    return undefined;
  }

  const exporter = new OTLPMetricExporter();
  console.info('Enabling OTLP Metrics Exporter to', exporter.getDefaultUrl({}));

  return new MeterProvider({
    exporter,
    interval: 1000,
  });
};

/**
 * Obtain the telemetry providers used by the `@opentelemetry` packages.
 *
 * @param {Partial<Powers>=} powers
 * @returns {{
 *  metricsProvider?: MeterProvider,
 *  tracingProvider?: import('@opentelemetry/api').TracerProvider
 * }}
 */
export const getTelemetryProviders = powers => {
  const ret = {};
  const metricsProvider =
    getDebuggingMeterProvider(powers) ||
    getOTLPHTTPMeterProvider(powers) ||
    getPrometheusMeterProvider(powers);
  if (!metricsProvider) {
    ret.metricsProvider = metricsProvider;
  }
  const tracingProvider =
    getDebuggingTracingProvider(powers) || getOTLPHTTPTracingProvider(powers);
  if (tracingProvider) {
    ret.tracingProvider = tracingProvider;
  }
  return ret;
};
