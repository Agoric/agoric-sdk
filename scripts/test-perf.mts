#!/usr/bin/env -S node --import ts-blank-space/register
// Benchmark test suite performance and compare runs across branches.
//
// Usage:
//   scripts/test-perf.mts collect [--packages PKG1,PKG2,...] [--runs N] [--output FILE]
//   scripts/test-perf.mts compare OLD.json NEW.json
//
// Examples:
//   # Collect timing for all packages that have tests
//   scripts/test-perf.mts collect
//
//   # Collect for specific packages, 5 runs each
//   scripts/test-perf.mts collect --packages boot,fast-usdc-contract --runs 5
//
//   # Compare two saved runs
//   scripts/test-perf.mts compare perf-main-abc1234.json perf-my-branch-def5678.json

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { $ } from 'execa';

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const DEFAULT_RUNS = 3;
const OUTPUT_DIR = path.join(REPO_ROOT, 'tmp', 'perf');

// ── Git helpers ──────────────────────────────────────────────

async function gitBranch(): Promise<string> {
  try {
    const { stdout } = await $`git -C ${REPO_ROOT} rev-parse --abbrev-ref HEAD`;
    return stdout.trim();
  } catch {
    return 'detached';
  }
}

async function gitSha(): Promise<string> {
  try {
    const { stdout } = await $`git -C ${REPO_ROOT} rev-parse --short HEAD`;
    return stdout.trim();
  } catch {
    return 'unknown';
  }
}

async function gitDirty(): Promise<string> {
  try {
    await $`git -C ${REPO_ROOT} diff --quiet HEAD`;
    return 'clean';
  } catch {
    return 'dirty';
  }
}

// ── Package discovery ────────────────────────────────────────

function listTestablePackages(): string[] {
  const pkgsDir = path.join(REPO_ROOT, 'packages');
  const entries = fs.readdirSync(pkgsDir, { withFileTypes: true });
  const packages: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pkgJsonPath = path.join(pkgsDir, entry.name, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) continue;

    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    const testCmd: string | undefined = pkgJson.scripts?.test;
    if (testCmd && testCmd !== 'exit 0') {
      packages.push(entry.name);
    }
  }
  return packages;
}

// ── Types ────────────────────────────────────────────────────

interface PerfMeta {
  branch: string;
  sha: string;
  dirty: string;
  date: string;
}

interface HyperfineResult {
  command: string;
  mean: number;
  stddev: number | null;
  median: number;
  user: number;
  system: number;
  min: number;
  max: number;
  times: number[];
}

interface PerfData {
  meta: PerfMeta;
  results: HyperfineResult[];
}

// ── Collect ──────────────────────────────────────────────────

async function doCollect(args: string[]): Promise<void> {
  let runs = DEFAULT_RUNS;
  let packages = '';
  let output = '';

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--packages':
        packages = args[++i];
        break;
      case '--runs':
        runs = Number(args[++i]);
        break;
      case '--output':
        output = args[++i];
        break;
      default:
        throw Error(`Unknown collect option: ${args[i]}`);
    }
  }

  const [branch, sha, dirty] = await Promise.all([
    gitBranch(),
    gitSha(),
    gitDirty(),
  ]);

  const pkgList = packages ? packages.split(',') : listTestablePackages();

  if (pkgList.length === 0) {
    throw Error('No testable packages found.');
  }

  if (!output) {
    const safeBranch = branch.replace(/\//g, '-');
    output = path.join(OUTPUT_DIR, `perf-${safeBranch}-${sha}.json`);
  }

  fs.mkdirSync(path.dirname(output), { recursive: true });

  console.log('Collecting test perf data');
  console.log(`  branch: ${branch}`);
  console.log(`  sha:    ${sha}`);
  console.log(`  dirty:  ${dirty}`);
  console.log(`  runs:   ${runs}`);
  console.log(`  packages (${pkgList.length}): ${pkgList.join(', ')}`);
  console.log(`  output: ${output}`);
  console.log('');

  // Validate package dirs and build hyperfine args
  const hfArgs: string[] = [
    '--warmup',
    '1',
    '--runs',
    String(runs),
    '--style',
    'full',
    '--export-json',
    `${output}.raw`,
  ];

  for (const pkg of pkgList) {
    const pkgDir = path.join(REPO_ROOT, 'packages', pkg);
    if (!fs.existsSync(pkgDir)) {
      console.warn(`warning: packages/${pkg} not found, skipping`);
      continue;
    }
    hfArgs.push('--command-name', pkg, `cd ${pkgDir} && yarn test`);
  }

  // Run hyperfine, inheriting stdio so the user sees live progress
  await $({ stdio: 'inherit' })`hyperfine ${hfArgs}`;

  // Wrap hyperfine's JSON with git metadata
  const rawData = JSON.parse(fs.readFileSync(`${output}.raw`, 'utf-8'));
  const perfData: PerfData = {
    meta: {
      branch,
      sha,
      dirty,
      date: new Date().toISOString(),
    },
    results: rawData.results,
  };
  fs.writeFileSync(output, JSON.stringify(perfData, null, 2) + '\n');
  fs.unlinkSync(`${output}.raw`);

  console.log('');
  console.log(`Results saved to ${output}`);
}

// ── Compare ──────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function sign(n: number): string {
  return n > 0 ? '+' : '';
}

function doCompare(args: string[]): void {
  if (args.length < 2) {
    throw Error('Usage: test-perf.mts compare OLD.json NEW.json');
  }

  const [oldFile, newFile] = args;

  const oldData: PerfData = JSON.parse(fs.readFileSync(oldFile, 'utf-8'));
  const newData: PerfData = JSON.parse(fs.readFileSync(newFile, 'utf-8'));

  console.log('Comparing test performance');
  console.log(
    `  OLD: ${oldData.meta.branch} @ ${oldData.meta.sha} (${oldData.meta.date})`,
  );
  console.log(
    `  NEW: ${newData.meta.branch} @ ${newData.meta.sha} (${newData.meta.date})`,
  );
  console.log('');

  // Index new results by command name
  const newMap = new Map(newData.results.map(r => [r.command, r]));

  // Build rows
  const rows: string[][] = [
    ['Package', 'Old (s)', 'New (s)', 'Diff (s)', 'Change'],
    ['───────', '───────', '───────', '────────', '──────'],
  ];

  let totalOld = 0;
  let totalNew = 0;

  for (const oldResult of oldData.results) {
    const newResult = newMap.get(oldResult.command);
    if (!newResult) {
      rows.push([
        oldResult.command,
        `${round2(oldResult.mean)}s`,
        '(missing)',
        '—',
        '—',
      ]);
      continue;
    }

    const diff = newResult.mean - oldResult.mean;
    const pct = (diff / oldResult.mean) * 100;
    totalOld += oldResult.mean;
    totalNew += newResult.mean;

    rows.push([
      oldResult.command,
      `${round2(oldResult.mean)}s`,
      `${round2(newResult.mean)}s`,
      `${sign(diff)}${round2(diff)}s`,
      `${sign(pct)}${round1(pct)}%`,
    ]);
  }

  // Calculate column widths and print aligned table
  const colWidths = rows[0].map((_, colIdx) =>
    Math.max(...rows.map(row => row[colIdx].length)),
  );

  for (const row of rows) {
    const line = row
      .map((cell, i) =>
        i === 0 ? cell.padEnd(colWidths[i]) : cell.padStart(colWidths[i]),
      )
      .join('  ');
    console.log(line);
  }

  console.log('');

  // Summary
  if (totalOld > 0) {
    const diff = totalNew - totalOld;
    const pct = (diff / totalOld) * 100;
    console.log(
      `Total: ${round2(totalOld)}s → ${round2(totalNew)}s  (${sign(diff)}${round2(diff)}s, ${sign(pct)}${round1(pct)}%)`,
    );
  }
}

// ── Main ─────────────────────────────────────────────────────

const [subcommand, ...subArgs] = process.argv.slice(2);

switch (subcommand) {
  case 'collect':
    await doCollect(subArgs);
    break;
  case 'compare':
    doCompare(subArgs);
    break;
  default:
    console.log('Usage:');
    console.log(
      '  scripts/test-perf.mts collect [--packages PKG1,PKG2,...] [--runs N] [--output FILE]',
    );
    console.log('  scripts/test-perf.mts compare OLD.json NEW.json');
    process.exit(1);
}
