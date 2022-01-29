#! /usr/bin/env node
import '@agoric/install-ses';

import fs from 'fs';
import zlib from 'zlib';
import readline from 'readline';
import process from 'process';

import {
  getTelemetryProviders,
  makeSlogSenderKit,
} from '../src/kernel-trace.js';

const LINE_COUNT_TO_FLUSH = 10000;

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(
      `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 ingest-slog.js SLOGFILE[.gz]`,
    );
    console.log(` - sends slogfile via OpenTelemetry`);
  }

  process.env.OTEL_EXPORTER_SYNC = 'true';
  const { tracingProvider } = getTelemetryProviders();
  if (!tracingProvider) {
    console.log(`no tracing provider; you need to set OTEL_EXPORTER_*`);
    process.exitCode = 1;
    return;
  }

  tracingProvider.register();
  const tracer = tracingProvider.getTracer('ingest-slog');
  const { slogSender, finish } = makeSlogSenderKit(tracer);

  const shutdown = () => {
    console.log('shutting down tracing provider');
    finish();
    const providers = [];
    if (tracingProvider) {
      providers.push(tracingProvider.shutdown());
    }
    Promise.all(providers)
      .then(() => console.log('Tracing terminated'))
      .catch(error => console.log('Error terminating tracing', error))
      .finally(() => process.exit());
  };
  // gracefully shut down the providers on process exit
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('beforeExit', shutdown);

  const [slogFile] = args;
  let slogF = fs.createReadStream(slogFile);
  if (slogFile.endsWith('.gz')) {
    slogF = slogF.pipe(zlib.createGunzip());
  }

  let byteCount = 0;
  slogF.on('data', chunk => {
    byteCount += chunk.length;
  });

  const lines = readline.createInterface({ input: slogF });
  console.log(`parsing`, slogFile);

  let lineCount = 0;
  for await (const line of lines) {
    lineCount += 1;
    if (lineCount % LINE_COUNT_TO_FLUSH === 0) {
      console.log(`${lineCount} lines, about ${byteCount} bytes`);
      await tracingProvider.forceFlush();
    }
    const obj = JSON.parse(line);
    slogSender(obj);
  }

  console.log(
    `done parsing`,
    slogFile,
    `(${lineCount} lines, ${byteCount} bytes)`,
  );

  // Flush the provider so we don't miss things.
  // FIXME: This is an internal API.  May not be compatible with other
  // OpenTelemetry implementations.
  console.log(`flushing...`);
  await tracingProvider.forceFlush();
  console.log('done flushing');
}

run().catch(err => console.log('err', err));
