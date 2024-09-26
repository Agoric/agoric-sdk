/* eslint-env node */
import { KERNEL_STATS_METRICS } from '@agoric/swingset-vat/src/kernel/metrics.js';
import { spawnSync } from 'child_process';
import fs from 'fs';

const AUTOBENCH_METRICS_URL = process.env.AUTOBENCH_METRICS_URL;

const NAME_PREFIX = 'autobench_';

const AUTOBENCH_METRICS = [
  {
    key: 'cranks',
    metricType: 'counter',
    name: 'cranks_total',
    description: 'Total number of cranks',
  },
  {
    key: 'rounds',
    metricType: 'counter',
    name: 'rounds_total',
    description: 'Total number of rounds',
  },
  {
    key: 'cranksPerRound',
    metricType: 'gauge',
    name: 'cranks_per_round',
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
# HELP ${NAME_PREFIX}${name} ${help}
`;
  }
  hdr += `\
# TYPE ${NAME_PREFIX}${name} ${metricType}
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
${NAME_PREFIX}${name}${labelstr} ${value}
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

function gatherMetrics(kind, data, labels, specs) {
  const metricName = Object.fromEntries(
    specs.map(([prop, name]) => [prop, name]),
  );
  const propMetrics = Object.fromEntries(
    specs.map(([prop, name, ...args]) => [prop, promHeader(name, ...args)]),
  );

  const todo = new Set(Object.keys(data));
  for (const { key, name } of KERNEL_STATS_METRICS) {
    if (!(key in data)) {
      continue;
    }
    todo.delete(key);
    const statLabels = [...(labels || []), ['stat', name]];

    for (const prop of Object.keys(propMetrics)) {
      if (prop in data[key]) {
        propMetrics[prop] += promValue(
          metricName[prop],
          data[key][prop],
          statLabels,
        );
      }
    }
  }

  for (const key of todo.keys()) {
    console.warn(`Unrecognized ${kind} data property ${key}`);
  }
  return Object.values(propMetrics).join('');
}

function generateMetricsFromPrimeData(data, labels = undefined) {
  return gatherMetrics('prime', data, labels, [
    ['up', 'stat_up', 'counter', `Number of increments`],
    ['down', 'stat_down', 'counter', `Number of decrements`],
    ['max', 'stat_max', 'gauge', `Maximum value`],
    ['value', 'stat_value', 'gauge', 'Latest value'],
    ['perCrank', 'stat_per_crank', 'gauge', `Autobench value per crank`],
  ]);
}

function generateMetricsFromBenchmarkData(data, labels = undefined) {
  return gatherMetrics('benchmark', data, labels, [
    ['delta', 'stat_delta', 'gauge', `Autobench benchmark delta`],
    [
      'deltaPerRound',
      'stat_delta_per_round',
      'gauge',
      `Autobench benchmark delta per round`,
    ],
  ]);
}

function generateMetricsFromBenchStats(benchStats, labels = []) {
  const obj = JSON.parse(benchStats);
  const mainLabels = [['phase', 'prime'], ...labels];
  const benchmarkLabels = [['phase', 'bench'], ...labels];
  let metrics = generateCommonMetrics(obj, {
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

// We get the commit id to post.
const gitCp = spawnSync('git', ['rev-parse', 'HEAD'], {
  stdio: ['inherit', 'pipe', 'inherit'],
  encoding: 'utf-8',
});
const revision = gitCp.stdout.trimRight();

const metrics = generateMetricsFromBenchStats(benchStats, [
  ['revision', revision],
]);

const metricsFile = benchStatsFile.replace(/(\.json)?$/, '.txt');
fs.writeFileSync(metricsFile, metrics);

if (!AUTOBENCH_METRICS_URL) {
  console.warn('$AUTOBENCH_METRICS_URL is not set; skipping');
  process.exit(0);
}

//  These are the labels for which corresponding metrics should be overwritten.
const groupLabels = [
  // We overwrite all the metrics for the suite to facilitate graphing.
  ['suite', suite],
  // (We used to keep revisions forever, but that turns out to be overkill.)
  // ['revision', revision],
];

const metricsGroup = `/${groupLabels
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
