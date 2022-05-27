/* globals process */
// @ts-check
import {
  BasicTracerProvider,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-base';

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';

import { getResourceAttributes } from './index.js';
import { makeSlogToOtelKit } from './slog-to-otel.js';
import { makeShutdown } from './shutdown.js';

// These numbers are chosen to attempt to export all spans.
export const SPAN_MAX_QUEUE_SIZE = 100_000;
export const SPAN_EXPORT_DELAY_MS = 1_000;

/**
 * @param {object} opts
 * @param {Record<string, string>} opts.env
 */
export const makeOtelTracingProvider = opts => {
  const { env = process.env } = opts || {};

  const { OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_EXPORTER_OTLP_TRACES_ENDPOINT } =
    env;
  if (!OTEL_EXPORTER_OTLP_ENDPOINT && !OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
    return undefined;
  }

  const resource = new Resource(getResourceAttributes(opts));

  const exporter = new OTLPTraceExporter();
  console.info('Enabling OTLP Traces Exporter to', exporter.getDefaultUrl({}));

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
  registerShutdown(async () => {
    finish();
    await tracingProvider.forceFlush();
    await tracingProvider.shutdown();
  });

  return Object.assign(slogSender, {
    forceFlush: () => tracingProvider.forceFlush(),
  });
};
