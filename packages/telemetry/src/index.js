// @ts-check
/* globals globalThis, process */
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { Resource } from '@opentelemetry/resources';

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
 * @property {import('@opentelemetry/resources').Resource} resource
 */

/**
 * @param {Partial<Powers>} param0
 */
export const getDebuggingTracingProvider = ({
  resource,
  env = process.env,
} = {}) => {
  const { OTEL_EXPORTER_DEBUG } = env;
  if (!OTEL_EXPORTER_DEBUG) {
    return undefined;
  }

  const exporter = new ConsoleSpanExporter();
  const provider = new BasicTracerProvider({ resource });
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  return provider;
};

/**
 * @param {Partial<Powers>} param0
 */
export const getOTLPHTTPTracingProvider = ({
  resource,
  env = process.env,
} = {}) => {
  const {
    OTEL_EXPORTER_OTLP_ENDPOINT,
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  } = env;
  if (!OTEL_EXPORTER_OTLP_ENDPOINT && !OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
    return undefined;
  }

  const exporter = new OTLPTraceExporter();
  console.info('Enabling OTLP Traces Exporter to', exporter.getDefaultUrl({}));

  const provider = new BasicTracerProvider({ resource });
  provider.addSpanProcessor(
    new BatchSpanProcessor(exporter, {
      maxQueueSize: SPAN_MAX_QUEUE_SIZE,
      maxExportBatchSize: SPAN_MAX_QUEUE_SIZE,
      scheduledDelayMillis: SPAN_EXPORT_DELAY_MS,
    }),
  );
  return provider;
};

/**
 * @param {Partial<Powers>} param0
 */
export const getDebuggingMeterProvider = ({
  resource,
  env = process.env,
} = {}) => {
  const { OTEL_EXPORTER_DEBUG } = env;
  if (!OTEL_EXPORTER_DEBUG) {
    return undefined;
  }

  const exporter = new ConsoleMetricExporter();
  const provider = new MeterProvider({
    resource,
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
  resource,
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
    resource,
    interval: DEFAULT_METER_PROVIDER_INTERVAL,
  });
};

/**
 * @param {Partial<Powers>} param0
 */
export const getOTLPHTTPMeterProvider = ({
  resource,
  env = process.env,
} = {}) => {
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
    resource,
    interval: 1000,
  });
};

/**
 * @typedef {Object} Options
 * @property {string} serviceName
 * @property {string} serviceNamespace
 * @property {string | number} serviceInstanceId
 */

/**
 * Obtain the telemetry providers used by the `@opentelemetry` packages.
 *
 * @param {Partial<Options>} [options]
 * @param {Partial<Powers>} [powers]
 * @returns {{
 *  metricsProvider?: MeterProvider,
 *  tracingProvider?: import('@opentelemetry/api').TracerProvider
 * }}
 */
export const getTelemetryProviders = (options, powers) => {
  const { serviceName, serviceNamespace, serviceInstanceId = Math.random() } =
    options || {};
  /** @type {import('@opentelemetry/resources').ResourceAttributes} */
  const resourceAttributes = {};
  if (serviceNamespace) {
    resourceAttributes[
      SemanticResourceAttributes.SERVICE_NAMESPACE
    ] = serviceNamespace;
  }
  if (serviceName) {
    resourceAttributes[SemanticResourceAttributes.SERVICE_NAME] = serviceName;
  }
  if (serviceInstanceId) {
    resourceAttributes[
      SemanticResourceAttributes.SERVICE_INSTANCE_ID
    ] = serviceInstanceId;
  }

  const { resource = new Resource(resourceAttributes) } = powers || {};

  const allPowers = { resource, ...powers };
  const ret = {};
  const metricsProvider =
    getDebuggingMeterProvider(allPowers) ||
    getOTLPHTTPMeterProvider(allPowers) ||
    getPrometheusMeterProvider(allPowers);
  if (!metricsProvider) {
    ret.metricsProvider = metricsProvider;
  }
  const tracingProvider =
    getDebuggingTracingProvider(allPowers) ||
    getOTLPHTTPTracingProvider(allPowers);
  if (tracingProvider) {
    ret.tracingProvider = tracingProvider;
  }
  return ret;
};
