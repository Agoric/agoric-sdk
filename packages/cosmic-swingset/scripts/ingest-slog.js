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

import { makeShutdown } from '../src/shutdown.js';

const LINE_COUNT_TO_FLUSH = 10000;

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log(
      `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 ingest-slog.js SLOGFILE[.gz]`,
    );
    console.log(` - sends slogfile via OpenTelemetry`);
    process.exitCode = 1;
    return;
  }

  process.env.OTEL_EXPORTER_SYNC = 'true';
  const { tracingProvider } = getTelemetryProviders({
    serviceNamespace: 'Agoric',
    serviceName: 'ingest-slog',
  });
  if (!tracingProvider) {
    console.log(`no tracing provider; you need to set OTEL_EXPORTER_*`);
    process.exitCode = 1;
    return;
  }

  const { registerShutdown } = makeShutdown();

  tracingProvider.register();
  const tracer = tracingProvider.getTracer('ingest-slog');
  const { slogSender, finish } = makeSlogSenderKit(tracer);
  registerShutdown(() => {
    finish();
    return tracingProvider.shutdown();
  });

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
}

run().catch(err => console.log('err', err));
