#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';

const spawnNodeSync = args => spawnSync('node', args, { stdio: 'inherit' });
const SUITES = ['exchangeBenchmark', 'pingPongBenchmark', 'swapBenchmark'];
for (const suite of SUITES) {
  console.log(`Autobenching suite=${suite} ...`);
  const prep = `demo/${suite}/prepareContracts.js`;
  if (existsSync(prep)) {
    spawnNodeSync([prep]);
  }
  const benchstats = `benchstats-${suite}.json`;
  try {
    unlinkSync(benchstats);
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
  const ssjson = `demo/${suite}/swingset.json`;
  const configFlags = existsSync(ssjson) ? ['--config', ssjson] : [];

  // Calculate how many rounds to run.
  let brounds;
  switch (suite) {
    case 'swapBenchmark': {
      // This benchmark is significantly slower.
      brounds = 10;
      break;
    }
    default: {
      brounds = 100;
      break;
    }
  }
  spawnNodeSync([
    'bin/runner',
    '--init',
    '--benchmark',
    brounds,
    '--statsfile',
    benchstats,
    ...configFlags,
    'run',
    `demo/${suite}`,
    '--quiet',
    '--prime',
  ]);
  spawnNodeSync(['src/push-metrics.js', suite, benchstats]);
}

console.log(`Done!`);
