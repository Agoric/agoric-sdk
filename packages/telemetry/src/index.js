/* globals globalThis, process */
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export * from './make-slog-sender.js';

/**
 * @typedef {((obj: {}, jsonObj?: string | undefined) => void) & {
 *  usesJsonObject?: boolean;
 *  forceFlush?: () => Promise<void>;
 *  shutdown?: () => Promise<void>;
 * }} SlogSender
 */
/**
 * @typedef {(opts: import('./index.js').MakeSlogSenderOptions) => SlogSender | undefined} MakeSlogSender
 */
/**
 * @typedef {MakeSlogSenderCommonOptions & Record<string, unknown>} MakeSlogSenderOptions
 * @typedef {object} MakeSlogSenderCommonOptions
 * @property {Record<string, string | undefined>} [env]
 * @property {string} [stateDir]
 * @property {string} [serviceName]
 */

/**
 * @param {SlogSender} [slogSender]
 * @param {object} [options]
 * @param {Record<string, string | undefined>} [options.env]
 * @param {(...args: any[]) => void} [options.log]
 */
export const tryFlushSlogSender = async (
  slogSender,
  { env = {}, log } = {},
) => {
  await null;
  try {
    await slogSender?.forceFlush?.();
  } catch (err) {
    log?.('Failed to flush slog sender', err);
    if (err.errors) {
      for (const error of err.errors) {
        log?.('nested error:', error);
      }
    }
    if (env.SLOGSENDER_FAIL_ON_ERROR) {
      throw err;
    }
  }
};

export const getResourceAttributes = ({
  env = process.env,
  serviceName = '',
}) => {
  const { OTEL_RESOURCE_ATTRIBUTES, SDK_REVISION } = env;

  /** @type {import('@opentelemetry/resources').ResourceAttributes} */
  const resourceAttributes = {};
  if (SDK_REVISION) {
    // Detect testnet-load-generator target revision.
    resourceAttributes[SemanticResourceAttributes.SERVICE_VERSION] =
      SDK_REVISION;
  }
  if (!resourceAttributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID]) {
    resourceAttributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID] =
      `${Math.random()}`;
  }
  if (serviceName) {
    resourceAttributes[SemanticResourceAttributes.SERVICE_NAME] = serviceName;
  }
  if (OTEL_RESOURCE_ATTRIBUTES) {
    // Allow overriding resource attributes.
    for (const kv of OTEL_RESOURCE_ATTRIBUTES.split(',')) {
      const match = kv.match(/^([^=]*)=(.*)$/);
      if (match) {
        resourceAttributes[match[1]] = match[2];
      }
    }
  }
  return resourceAttributes;
};

/**
 * @typedef {object} Powers
 * @property {Pick<Console, 'warn'>} console
 * @property {NodeJS.ProcessEnv} env
 * @property {import('@opentelemetry/sdk-metrics').View[]} views
 * @property {string} [serviceName]
 */

/**
 * @param {Partial<Powers>} powers
 */
export const getPrometheusMeterProvider = ({
  console = globalThis.console,
  env = process.env,
  views,
  ...rest
} = {}) => {
  const { OTEL_EXPORTER_PROMETHEUS_HOST, OTEL_EXPORTER_PROMETHEUS_PORT } = env;

  // The opt-in signal is a non-empty OTEL_EXPORTER_PROMETHEUS_PORT.
  if (!OTEL_EXPORTER_PROMETHEUS_PORT) return;

  const resource = new Resource(getResourceAttributes({ env, ...rest }));

  const { DEFAULT_OPTIONS } = PrometheusExporter;
  const host = OTEL_EXPORTER_PROMETHEUS_HOST || DEFAULT_OPTIONS.host;
  const port = +OTEL_EXPORTER_PROMETHEUS_PORT || DEFAULT_OPTIONS.port;
  const url = `http://${host || '0.0.0.0'}:${port}${DEFAULT_OPTIONS.endpoint}`;

  const options = { host, port, appendTimestamp: true };
  const exporter = new PrometheusExporter(options, () => {
    console.warn(`Prometheus scrape endpoint: ${url}`);
  });

  const provider = new MeterProvider({ resource, views });
  provider.addMetricReader(exporter);
  return provider;
};

/**
 * Obtain the telemetry providers used by the `@opentelemetry` packages.
 *
 * @param {Partial<Powers>} [powers]
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
