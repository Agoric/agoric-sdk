/* globals process */
import {
  BasicTracerProvider,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-base';

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { makeShutdown } from '@agoric/internal/src/node/shutdown.js';

import { getResourceAttributes } from './index.js';
import { makeSlogToOtelKit } from './slog-to-otel.js';

// These numbers are chosen to attempt to export all spans.
export const SPAN_MAX_QUEUE_SIZE = 100_000;
export const SPAN_EXPORT_DELAY_MS = 1_000;

/**
 * @param {object} opts
 * @param {Record<string, string>} opts.env
 */
export const makeOtelTracingProvider = opts => {
  const { env = process.env } = opts || {};

  // https://opentelemetry.io/docs/concepts/signals/
  // https://opentelemetry.io/docs/specs/otel/protocol/exporter/#endpoint-urls-for-otlphttp
  // https://github.com/open-telemetry/opentelemetry-js/blob/experimental/v0.57.1/experimental/packages/exporter-trace-otlp-http/README.md#configuration-options-as-environment-variables
  const { OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_EXPORTER_OTLP_TRACES_ENDPOINT } =
    env;
  if (!OTEL_EXPORTER_OTLP_ENDPOINT && !OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
    console.debug(
      'Not enabling OTLP Traces Exporter; enable with OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=<target URL> or OTEL_EXPORTER_OTLP_ENDPOINT=<target URL prefix>',
    );
    return undefined;
  }

  const resource = new Resource(getResourceAttributes(opts));

  const exporter = new OTLPTraceExporter();
  console.info(
    'Enabling OTLP Traces Exporter to',
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
      `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
  );

  const provider = new BasicTracerProvider({ resource });
  provider.addSpanProcessor(
    // new SimpleSpanProcessor(exporter),
    new BatchSpanProcessor(exporter, {
      maxQueueSize: SPAN_MAX_QUEUE_SIZE,
      maxExportBatchSize: SPAN_MAX_QUEUE_SIZE,
      scheduledDelayMillis: SPAN_EXPORT_DELAY_MS,
    }),
  );
  return provider;
};

export const makeSlogSender = async opts => {
  const tracingProvider =
    makeOtelTracingProvider(opts) || new BasicTracerProvider();

  tracingProvider.register();
  const tracer = tracingProvider.getTracer('slog-trace', opts.version);

  const { slogSender, finish } = makeSlogToOtelKit(tracer);

  // Cleanly shutdown if possible.
  const { registerShutdown } = makeShutdown();
  const shutdown = async () => {
    finish();
    await tracingProvider.forceFlush();
    await tracingProvider.shutdown();
  };
  registerShutdown(shutdown);

  return Object.assign(slogSender, {
    forceFlush: async () => tracingProvider.forceFlush(),
    shutdown,
    usesJsonObject: false,
  });
};
