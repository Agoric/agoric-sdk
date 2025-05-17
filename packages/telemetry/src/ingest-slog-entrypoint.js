#! /usr/bin/env node
/* eslint-env node */
import '@endo/init';

import fs from 'fs';
import zlib from 'zlib';
import readline from 'readline';
import process from 'process';

import { makeSlogSender } from './make-slog-sender.js';

const LINE_COUNT_TO_FLUSH = 10000;
const ELAPSED_MS_TO_FLUSH = 3000;
const MAX_LINE_COUNT_PER_PERIOD = 10000;
const MAX_BLOCKS_PER_PERIOD = 10;
const PROCESSING_PERIOD = 1000;

async function run() {
  const args = process.argv.slice(2);

  // FIXME: Use the resource environment variable config.
  const { SLOGSENDER, SERVICE_NAME: serviceName = 'agd-cosmos' } = process.env;

  if (!SLOGSENDER) {
    console.log(
      `SLOGSENDER=@agoric/telemetry/src/otel-trace.js ingest-slog [SLOGFILE[.gz]]`,
    );
    console.log(` - sends slogfile via telemetry`);
    process.exitCode = 1;
    return;
  }

  const slogFile = args[0] === '-' ? undefined : args[0];
  const slogSender = await makeSlogSender({
    serviceName,
    stateDir: '.',
    env: process.env,
  });

  if (!slogSender) {
    console.log(`no slogSender; you need to set SLOGSENDER`);
    process.exitCode = 1;
    return;
  }

  let slogF = slogFile ? fs.createReadStream(slogFile) : process.stdin;
  if (slogFile && slogFile.endsWith('.gz')) {
    // @ts-expect-error faulty pipe type
    slogF = slogF.pipe(zlib.createGunzip());
  }

  let byteCount = 0;
  slogF.on('data', chunk => {
    byteCount += chunk.length;
  });

  const lines = readline.createInterface({ input: slogF });
  const slogFileName = slogFile || '*stdin*';

  const progressFileName = slogFile && `${slogFileName}.ingest-progress`;
  const progress = { virtualTimeOffset: 0, lastSlogTime: 0 };
  if (progressFileName) {
    if (!fs.existsSync(progressFileName)) {
      fs.writeFileSync(progressFileName, JSON.stringify(progress));
    } else {
      Object.assign(
        progress,
        JSON.parse(fs.readFileSync(progressFileName).toString()),
      );
    }
  }

  let linesProcessedThisPeriod = 0;
  let blocksInThisPeriod = 0;
  let startOfLastPeriod = 0;

  let lastTime = Date.now();
  let lineCount = 0;

  const stats = async flush => {
    // console.log(`${lineCount} lines, about ${byteCount} bytes`);
    if (!flush) {
      return;
    }
    await slogSender.forceFlush?.();
    if (progressFileName) {
      fs.writeFileSync(progressFileName, JSON.stringify(progress));
    }
  };

  console.warn(`parsing`, slogFileName);

  let update = false;
  const maybeUpdateStats = async now => {
    if (
      now - lastTime <= ELAPSED_MS_TO_FLUSH &&
      lineCount % LINE_COUNT_TO_FLUSH !== 0
    ) {
      return;
    }
    lastTime = now;
    await stats(update);
  };
  for await (const line of lines) {
    lineCount += 1;
    const obj = harden(JSON.parse(line));
    update ||= obj.time > progress.lastSlogTime;
    if (update) {
      progress.lastSlogTime = obj.time;
    }

    let now = Date.now();
    await maybeUpdateStats(now);

    if (!update) {
      continue;
    }

    const isAfterCommit = obj.type === 'cosmic-swingset-after-commit-stats';

    // Maybe wait for the next period to process a bunch of lines.
    let maybeWait;
    if (
      linesProcessedThisPeriod >= MAX_LINE_COUNT_PER_PERIOD ||
      blocksInThisPeriod >= MAX_BLOCKS_PER_PERIOD
    ) {
      const delayMS = PROCESSING_PERIOD - (now - startOfLastPeriod);
      maybeWait = new Promise(resolve => setTimeout(resolve, delayMS));
    }
    await maybeWait;
    now = Date.now();

    if (now - startOfLastPeriod >= PROCESSING_PERIOD) {
      startOfLastPeriod = now;
      linesProcessedThisPeriod = 0;
      blocksInThisPeriod = 0;
    }

    if (progress.virtualTimeOffset) {
      const virtualTime = obj.time + progress.virtualTimeOffset;
      const virtualTimeObj = {
        ...obj,
        time: virtualTime,
        actualTime: obj.time,
      };
      slogSender(virtualTimeObj);
    } else {
      // Use the original.
      slogSender(obj);
    }

    linesProcessedThisPeriod += 1;
    if (isAfterCommit) {
      blocksInThisPeriod += 1;
      lastTime = Date.now();
      await stats(true);
    }
  }

  await stats(true);
  console.warn(
    `done parsing`,
    slogFileName,
    `(${lineCount} lines, ${byteCount} bytes)`,
  );
}

process.exitCode = 1;
run().then(
  () => {
    process.exitCode = 0;
  },
  err => {
    console.error('Failed with', err);
    process.exit(process.exitCode || 1);
  },
);
