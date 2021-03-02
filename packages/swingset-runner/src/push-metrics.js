import { KERNEL_STATS_METRICS } from '@agoric/swingset-vat/src/kernel/metrics';
import { spawnSync } from 'child_process';
import fs from 'fs';

const AUTOBENCH_METRICS_URL = process.env.AUTOBENCH_METRICS_URL;

const AUTOBENCH_METRICS = [
  {
    key: 'cranks',
    metricType: 'count',
    name: 'autobench_cranks_total',
    description: 'Total number of cranks',
  },
  {
    key: 'rounds',
    metricType: 'count',
    name: 'autobench_rounds_total',
    description: 'Total number of rounds',
  },
  {
    key: 'cranksPerRound',
    metricType: 'gauge',
    name: 'autobench_cranks_per_round',
    description: 'Number of cranks per round',
  },
];

const [suite, benchStatsFile] = process.argv.slice(2);
if (!benchStatsFile) {
  console.error(`Usage: push-metrics.js SUITE benchStats.json`);
  process.exit(1);
}

function promHeader(name, metricType, help = undefined) {
  let hdr = '';
  if (help !== undefined) {
    hdr += `\
# HELP ${name} ${help}
`;
  }
  hdr += `\
# TYPE ${name} ${metricType}
`;
  return hdr;
}

function promValue(name, value, labels = []) {
  let sep = '{';
  let labelstr = '';

  for (const [key, lbl] of labels) {
    labelstr += `${sep}${key}=${JSON.stringify(lbl)}`;
    sep = ',';
  }

  if (sep === ',') {
    labelstr += '}';
  }

  return `\
${name}${labelstr} ${value}
`;
}

function generateCommonMetrics(obj, phaseLabels) {
  let metrics = '';
  for (const { key, metricType, name, description } of AUTOBENCH_METRICS) {
    let hdr = promHeader(name, metricType, description);
    for (const phase of Object.keys(phaseLabels)) {
      if (obj[phase] && key in obj[phase]) {
        // Only write the header once.
        metrics += hdr;
        hdr = '';
        metrics += promValue(name, obj[phase][key], phaseLabels[phase]);
      }
    }
  }
  return metrics;
}

function generateMetricsFromPrimeData(data, labels = undefined) {
  let metrics = '';
  const todo = new Set(Object.keys(data));
  for (const { metricType, key, name, description } of KERNEL_STATS_METRICS) {
    if (!(key in data)) {
      // eslint-disable-next-line no-continue
      continue;
    }
    todo.delete(key);
    if ('value' in data[key]) {
      metrics += promHeader(name, metricType, description);
      metrics += promValue(name, data[key].value, labels);
    }
    if ('up' in data[key]) {
      const nm = `${name}_up`;
      metrics += promHeader(
        nm,
        'counter',
        `${description} (number of increments)`,
      );
      metrics += promValue(nm, data[key].up, labels);
    }
    if ('down' in data[key]) {
      const nm = `${name}_down`;
      metrics += promHeader(
        nm,
        'counter',
        `${description} (number of decrements)`,
      );
      metrics += promValue(nm, data[key].down, labels);
    }
    if ('max' in data[key]) {
      const nm = `${name}_max`;
      metrics += promHeader(nm, 'gauge', `${description} (maximum value)`);
      metrics += promValue(nm, data[key].max, labels);
    }
    if ('perCrank' in data[key]) {
      const nm = `${name}_per_crank`;
      metrics += promHeader(nm, 'gauge', `${description} (value per crank)`);
      metrics += promValue(nm, data[key].perCrank, labels);
    }
  }

  for (const key of todo.keys()) {
    console.warn(`Unrecognized prime data property ${key}`);
  }
  return metrics;
}

function generateMetricsFromBenchmarkData(data, labels = undefined) {
  let metrics = '';
  const todo = new Set(Object.keys(data));
  for (const { key, name, description } of KERNEL_STATS_METRICS) {
    if (!(key in data)) {
      // eslint-disable-next-line no-continue
      continue;
    }
    todo.delete(key);
    if ('delta' in data[key]) {
      const nm = `${name}_delta`;
      metrics += promHeader(nm, 'gauge', `${description} benchmark delta`);
      metrics += promValue(nm, data[key].delta, labels);
    }
    if ('deltaPerRound' in data[key]) {
      const nm = `${name}_delta_per_round`;
      metrics += promHeader(
        nm,
        'gauge',
        `${description} benchmark delta per round`,
      );
      metrics += promValue(nm, data[key].deltaPerRound, labels);
    }
  }

  for (const key of todo.keys()) {
    console.warn(`Unrecognized benchmark data property ${key}`);
  }
  return metrics;
}

function generateMetricsFromBenchStats(benchStats) {
  const obj = JSON.parse(benchStats);
  const mainLabels = [['phase', 'prime']];
  const benchmarkLabels = [['phase', 'bench']];
  let metrics = generateCommonMetrics(benchStats, {
    main: mainLabels,
    benchmark: benchmarkLabels,
  });
  if (obj.main) {
    metrics += generateMetricsFromPrimeData(obj.main.data, mainLabels);
  }
  if (obj.benchmark) {
    metrics += generateMetricsFromBenchmarkData(
      obj.benchmark.data,
      benchmarkLabels,
    );
  }
  return metrics;
}
const benchStats = fs.readFileSync(benchStatsFile, 'utf-8');
const metrics = generateMetricsFromBenchStats(benchStats);

const metricsFile = benchStatsFile.replace(/(\.json)?$/, '.txt');
fs.writeFileSync(metricsFile, metrics);

if (!AUTOBENCH_METRICS_URL) {
  console.warn('$AUTOBENCH_METRICS_URL is not set; skipping');
  process.exit(0);
}

// We get the commit id to post.
const gitCp = spawnSync('git', ['rev-parse', 'HEAD'], {
  stdio: ['inherit', 'pipe', 'inherit'],
  encoding: 'utf-8',
});
const revision = gitCp.stdout.trimRight();

const labels = [
  ['revision', revision],
  ['suite', suite],
];

// This setting of metricsGroup ensures the history is kept for other git
// commits, but reset for previous uploads of this same gitCommit or suite.
const metricsGroup = `/${labels
  .flatMap(kv => kv.map(encodeURIComponent))
  .join('/')}`;

const curlCp = spawnSync(
  'curl',
  [
    '--data-binary',
    `@${metricsFile}`,
    '-X',
    'PUT',
    `${AUTOBENCH_METRICS_URL}${metricsGroup}`,
  ],
  {
    stdio: 'inherit',
  },
);

process.exit(curlCp.status);
