#!/usr/bin/env -S node --experimental-strip-types --no-warnings

/**
 * Migration helper to capture and compare ESLint vs oxlint configs.
 *
 * Capture each linter's config from its own worktree, then compare across
 * worktrees by reading from the canonical /tmp location.
 *
 * Usage:
 *   scripts/migration/oxlint.ts capture <eslint|oxlint>
 *   scripts/migration/oxlint.ts compare [rules|severity]
 */

import { execSync } from 'node:child_process';
import {
  existsSync,
  globSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const TMP_DIR = '/tmp/lint-migration';

// ---------------------------------------------------------------------------
// Read eslint.config.mjs dynamically to discover config zones
// ---------------------------------------------------------------------------

interface ConfigZone {
  label: string;
  globs: string[];
}

/** Patterns to exclude when searching for representative files. */
const EXCLUDE_PATTERNS = [
  'node_modules',
  '/dist/',
  '/coverage/',
  '/build/',
  '/output/',
  '/bundles/',
  '/bundle-',
  '/demo/',
  '.test-d.ts',
  '.d.ts',
  '/vendor/',
  '__generated',
  '/codegen',
];

const CODE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts']);

async function discoverZones(): Promise<ConfigZone[]> {
  const configPath = join(ROOT, 'eslint.config.mjs');
  const config = (await import(configPath)).default as any[];

  const zones: ConfigZone[] = [];
  const seen = new Set<string>();

  // A default zone for entries with no `files` (applies to all .js files)
  zones.push({ label: 'default', globs: ['packages/*/src/**/*.js'] });
  seen.add('default');

  let skippedFnFiles = 0;

  for (const entry of config) {
    const files: unknown[] | undefined = entry.files;
    if (!files) continue;

    // Skip entries with no rules (e.g. plugin/parser setup only)
    if (!entry.rules || Object.keys(entry.rules).length === 0) continue;

    // Skip entries where files contains functions (from compat.extends().map())
    const globs = files.filter((f): f is string => typeof f === 'string');
    if (globs.length === 0) {
      skippedFnFiles++;
      continue;
    }

    const key = globs.join(' | ');
    if (seen.has(key)) continue;
    seen.add(key);

    zones.push({ label: globs.join(' | '), globs });
  }

  // Sanity check: count all files-having entries with rules in the raw config
  const totalFilesEntries = config.filter(
    e => e.files && e.rules && Object.keys(e.rules).length > 0,
  ).length;
  const discovered = zones.length - 1; // exclude the hardcoded default zone
  if (discovered !== totalFilesEntries - skippedFnFiles) {
    console.warn(
      `Warning: discovered ${discovered} file-scoped zones but expected ` +
        `${totalFilesEntries - skippedFnFiles} (${totalFilesEntries} total entries with files+rules, ` +
        `${skippedFnFiles} skipped for function-based files).`,
    );
  }

  return zones;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function findRepresentative(
  globs: string[],
  otherGlobs: string[][],
): string | undefined {
  // For each other zone, pre-expand its files into a set for fast lookup
  const otherFileSets = otherGlobs.map(
    gs => new Set(gs.flatMap(pat => globSync(pat, { cwd: ROOT }))),
  );

  const candidates: Array<{ file: string; otherZoneCount: number }> = [];

  for (const pattern of globs) {
    const matches = globSync(pattern, {
      cwd: ROOT,
      exclude: p => {
        const s = p.replace(/\\/g, '/');
        return EXCLUDE_PATTERNS.some(ex => s.includes(ex));
      },
    });
    for (const m of matches) {
      const full = join(ROOT, m);
      const ext = m.slice(m.lastIndexOf('.'));
      try {
        if (!lstatSync(full).isFile() || !CODE_EXTENSIONS.has(ext)) continue;
      } catch {
        continue;
      }
      const otherZoneCount = otherFileSets.filter(s => s.has(m)).length;
      candidates.push({ file: m, otherZoneCount });
    }
  }

  // Prefer files that appear in the fewest other zones
  candidates.sort((a, b) => a.otherZoneCount - b.otherZoneCount);
  return candidates[0]?.file;
}

function run(cmd: string, cwd: string = ROOT): string {
  return execSync(cmd, { cwd, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
}

function slugify(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function tryParseJSON(text: string): any {
  const trimmed = text.trim();
  if (!trimmed || trimmed === 'undefined') return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// capture
// ---------------------------------------------------------------------------

type CaptureEntry = {
  file: string;
  globs: string[];
  config: string;
};

type CaptureManifest = {
  root: string;
  zones: Record<string, CaptureEntry>;
};

async function captureEslint() {
  const outDir = join(TMP_DIR, 'eslint');
  mkdirSync(outDir, { recursive: true });

  const zones = await discoverZones();
  console.log(
    `Discovered ${zones.length} config zones from eslint.config.mjs\n`,
  );

  const zones_out: Record<string, CaptureEntry> = {};

  for (const zone of zones) {
    const otherGlobs = zones.filter(z => z !== zone).map(z => z.globs);
    const rep = findRepresentative(zone.globs, otherGlobs);
    if (!rep) {
      console.log(
        `  SKIP ${zone.label}: no file matches ${zone.globs.join(', ')}`,
      );
      continue;
    }

    const slug = slugify(zone.label);
    const configFile = join(outDir, `${slug}.json`);

    console.log(`  ${zone.label}: ${rep}`);

    const out = run(`node_modules/.bin/eslint --print-config ${rep}`);
    const parsed = tryParseJSON(out);
    writeFileSync(configFile, JSON.stringify(parsed, null, 2) + '\n');

    zones_out[zone.label] = {
      file: rep,
      globs: zone.globs,
      config: configFile,
    };
  }

  const manifest: CaptureManifest = { root: ROOT, zones: zones_out };
  writeFileSync(
    join(outDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  console.log(`\nCaptured eslint configs to ${outDir}`);
}

async function captureOxlint() {
  const outDir = join(TMP_DIR, 'oxlint');
  mkdirSync(outDir, { recursive: true });

  const eslintManifest = loadManifest('eslint');
  console.log(
    `Read ${Object.keys(eslintManifest.zones).length} zones from eslint capture\n`,
  );

  const zones_out: Record<string, CaptureEntry> = {};

  for (const [label, eslintEntry] of Object.entries(eslintManifest.zones)) {
    const slug = slugify(label);
    const configFile = join(outDir, `${slug}.json`);

    console.log(`  ${label}: ${eslintEntry.file}`);

    const out = run(
      `node_modules/.bin/oxlint --print-config ${eslintEntry.file}`,
    );
    const parsed = tryParseJSON(out);
    writeFileSync(configFile, JSON.stringify(parsed, null, 2) + '\n');

    zones_out[label] = {
      file: eslintEntry.file,
      globs: eslintEntry.globs,
      config: configFile,
    };
  }

  const manifest: CaptureManifest = { root: ROOT, zones: zones_out };
  writeFileSync(
    join(outDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  console.log(`\nCaptured oxlint configs to ${outDir}`);
}

// ---------------------------------------------------------------------------
// compare helpers
// ---------------------------------------------------------------------------

function normSeverity(val: unknown): string {
  const raw = Array.isArray(val) ? val[0] : val;
  if (typeof raw === 'number')
    return ['off', 'warn', 'error'][raw] ?? String(raw);
  if (raw === 'allow') return 'off';
  if (raw === 'deny') return 'error';
  if (typeof raw === 'string') return raw;
  return String(raw);
}

const OXLINT_PREFIX_MAP: Record<string, string> = {
  typescript: '@typescript-eslint',
  'eslint-js': '',
  node: 'node',
  import: 'import',
  unicorn: 'unicorn',
  jsdoc: 'jsdoc',
  // jsPlugin prefixes — mapped to their ESLint equivalents
  'import-js': 'import',
  '@agoric': '@agoric',
  '@endo': '@endo',
  '@jessie.js': '@jessie.js',
  ava: 'ava',
};

function normalizeOxlintRuleName(name: string): string {
  for (const [oxPrefix, esPrefix] of Object.entries(OXLINT_PREFIX_MAP)) {
    if (name.startsWith(oxPrefix + '/')) {
      const rest = name.slice(oxPrefix.length + 1);
      return esPrefix ? `${esPrefix}/${rest}` : rest;
    }
  }
  return name;
}

function parseJsonc(text: string): any {
  const stripped = text
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .replace(/\/\/.*$/gm, '') // line comments
    .replace(/,(\s*[}\]])/g, '$1'); // trailing commas
  return tryParseJSON(stripped);
}

/**
 * Read .oxlintrc.json directly to get jsPlugin rules that
 * `oxlint --print-config` doesn't report.
 */
function loadOxlintrcRules(root: string): Record<string, unknown> {
  const rcPath = join(root, '.oxlintrc.json');
  if (!existsSync(rcPath)) return {};
  const rc = parseJsonc(readFileSync(rcPath, 'utf-8'));
  return rc.rules ?? {};
}

function resolveOxlintRules(
  config: any,
  filePath: string,
  root: string,
): Record<string, unknown> {
  const rules: Record<string, unknown> = { ...config.rules };

  for (const override of config.overrides ?? []) {
    const patterns: string[] = override.files ?? [];
    const matches = patterns.some((pat: string) => {
      const found = globSync(pat, { cwd: root });
      return found.includes(filePath);
    });
    if (matches) {
      Object.assign(rules, override.rules);
    }
  }

  // Merge jsPlugin rules from .oxlintrc.json (not reported by --print-config)
  const rcRules = loadOxlintrcRules(root);
  for (const [name, val] of Object.entries(rcRules)) {
    if (!(name in rules)) {
      rules[name] = val;
    }
  }

  return rules;
}

const STATUS_EMOJI: Record<string, string> = {
  removed: '🗑️',
  added: '✅',
  erroring: '🔺',
  warning: '🔻',
};

function classifyStatus(esSev: string, oxSev: string): string {
  if (oxSev === '-' || oxSev === 'off') return '🗑️  removed';
  if (esSev === '-' || esSev === 'off') return '✅ added';
  if (esSev === 'warn' && oxSev === 'error') return '🔺 erroring';
  if (esSev === 'error' && oxSev === 'warn') return '🔻 warning';
  return `${esSev}→${oxSev}`;
}

interface TableRow {
  rule: string;
  eslint: string;
  oxlint: string;
  status: string;
}

function printTable(rows: TableRow[]) {
  const cols = ['rule', 'eslint', 'oxlint', 'status'] as const;
  const widths = Object.fromEntries(
    cols.map(c => [c, Math.max(c.length, ...rows.map(r => r[c].length))]),
  ) as Record<(typeof cols)[number], number>;

  const header = cols.map(c => c.padEnd(widths[c])).join('  ');
  const sep = cols.map(c => '─'.repeat(widths[c])).join('──');
  console.log(`  ${header}`);
  console.log(`  ${sep}`);
  for (const row of rows) {
    const line = cols.map(c => row[c].padEnd(widths[c])).join('  ');
    console.log(`  ${line}`);
  }
}

function loadManifest(tool: 'eslint' | 'oxlint'): CaptureManifest {
  const manifestPath = join(TMP_DIR, tool, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error(
      `No ${tool} capture found at ${manifestPath}. Run \`capture ${tool}\` first.`,
    );
    process.exit(1);
  }
  return JSON.parse(readFileSync(manifestPath, 'utf-8'));
}

function diffZone(
  eslintEntry: CaptureEntry,
  oxlintEntry: CaptureEntry,
  oxlintRoot: string,
): {
  activeRows: TableRow[];
  offCount: number;
  agreeCount: number;
} {
  const eslintConfig = tryParseJSON(readFileSync(eslintEntry.config, 'utf-8'));
  const oxlintConfig = tryParseJSON(readFileSync(oxlintEntry.config, 'utf-8'));

  const eslintRules: Record<string, unknown> = eslintConfig.rules ?? {};
  const oxlintRules = resolveOxlintRules(
    oxlintConfig,
    oxlintEntry.file,
    oxlintRoot,
  );

  const oxNorm = new Map<string, string>();
  for (const [name, val] of Object.entries(oxlintRules)) {
    oxNorm.set(normalizeOxlintRuleName(name), normSeverity(val));
  }

  const esNorm = new Map<string, string>();
  for (const [name, val] of Object.entries(eslintRules)) {
    esNorm.set(name, normSeverity(val));
  }

  const allRules = [...new Set([...esNorm.keys(), ...oxNorm.keys()])].sort();

  const activeRows: TableRow[] = [];
  let offCount = 0;
  let agreeCount = 0;

  for (const rule of allRules) {
    const esSev = esNorm.get(rule) ?? '-';
    const oxSev = oxNorm.get(rule) ?? '-';

    if (esSev === oxSev) {
      agreeCount++;
      continue;
    }

    const isOff =
      (esSev === 'off' && oxSev === '-') || (oxSev === 'off' && esSev === '-');
    if (isOff) {
      offCount++;
      continue;
    }

    const status = classifyStatus(esSev, oxSev);
    activeRows.push({ rule, eslint: esSev, oxlint: oxSev, status });
  }

  return { activeRows, offCount, agreeCount };
}

// ---------------------------------------------------------------------------
// compare rules (default)
// ---------------------------------------------------------------------------

function compareRules() {
  const eslintManifest = loadManifest('eslint');
  const oxlintManifest = loadManifest('oxlint');

  const allLabels = new Set([
    ...Object.keys(eslintManifest.zones),
    ...Object.keys(oxlintManifest.zones),
  ]);

  for (const label of [...allLabels].sort()) {
    const eslintEntry = eslintManifest.zones[label];
    const oxlintEntry = oxlintManifest.zones[label];

    console.log(`\n${'='.repeat(70)}`);
    console.log(`Zone: ${label}`);
    console.log('='.repeat(70));

    if (!eslintEntry || !oxlintEntry) {
      console.log(
        `  (missing in ${!eslintEntry ? 'eslint' : 'oxlint'} capture — skipping)`,
      );
      continue;
    }

    console.log(`  eslint file: ${eslintEntry.file}`);
    console.log(`  oxlint file: ${oxlintEntry.file}`);

    const { activeRows, offCount, agreeCount } = diffZone(
      eslintEntry,
      oxlintEntry,
      oxlintManifest.root,
    );

    if (activeRows.length > 0) {
      printTable(activeRows);
    }

    console.log(
      `\n  ${agreeCount} rules agree, ${activeRows.length} active diffs, ${offCount} off-only diffs`,
    );
  }
}

// ---------------------------------------------------------------------------
// compare severity — grouped by status
// ---------------------------------------------------------------------------

function compareSeverity() {
  const eslintManifest = loadManifest('eslint');
  const oxlintManifest = loadManifest('oxlint');

  const allLabels = new Set([
    ...Object.keys(eslintManifest.zones),
    ...Object.keys(oxlintManifest.zones),
  ]);

  for (const label of [...allLabels].sort()) {
    const eslintEntry = eslintManifest.zones[label];
    const oxlintEntry = oxlintManifest.zones[label];

    console.log(`\n${'='.repeat(70)}`);
    console.log(`Zone: ${label}`);
    console.log('='.repeat(70));

    if (!eslintEntry || !oxlintEntry) {
      console.log(
        `  (missing in ${!eslintEntry ? 'eslint' : 'oxlint'} capture — skipping)`,
      );
      continue;
    }

    const { activeRows, offCount, agreeCount } = diffZone(
      eslintEntry,
      oxlintEntry,
      oxlintManifest.root,
    );

    // Group by status
    const groups = new Map<string, TableRow[]>();
    for (const row of activeRows) {
      const list = groups.get(row.status) ?? [];
      list.push(row);
      groups.set(row.status, list);
    }

    // Print in a stable order: added, removed, erroring, warning, then any other
    const order = ['✅ added', '🗑️  removed', '🔺 erroring', '🔻 warning'];
    const sortedKeys = [
      ...order.filter(k => groups.has(k)),
      ...[...groups.keys()].filter(k => !order.includes(k)),
    ];

    for (const status of sortedKeys) {
      const rows = groups.get(status)!;
      console.log(`\n  ${status} (${rows.length}):`);
      for (const row of rows) {
        console.log(`    ${row.rule}`);
      }
    }

    console.log(
      `\n  ${agreeCount} rules agree, ${activeRows.length} active diffs, ${offCount} off-only diffs`,
    );
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

const command = process.argv[2];
const subcommand = process.argv[3];
switch (command) {
  case 'capture': {
    if (subcommand !== 'eslint' && subcommand !== 'oxlint') {
      console.error(
        `Usage: ${basename(process.argv[1])} capture <eslint|oxlint>`,
      );
      process.exit(1);
    }
    if (subcommand === 'eslint') await captureEslint();
    else await captureOxlint();
    break;
  }
  case 'compare':
    if (!subcommand || subcommand === 'rules') {
      compareRules();
    } else if (subcommand === 'severity') {
      compareSeverity();
    } else {
      console.error(
        `Unknown compare subcommand: ${subcommand}. Use 'rules' or 'severity'.`,
      );
      process.exit(1);
    }
    break;
  default:
    console.error(
      `Usage: ${basename(process.argv[1])} <capture <eslint|oxlint>|compare [rules|severity]>`,
    );
    process.exit(1);
}
