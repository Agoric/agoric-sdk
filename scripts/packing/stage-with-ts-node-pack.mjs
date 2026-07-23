#!/usr/bin/env node
// Stage every publishable workspace into <pkg>/.ts-node-pack/ so that
// `lerna publish from-package --contents .ts-node-pack` produces tarballs
// whose contents come from ts-node-pack instead of lerna's built-in pack
// pipeline (Arborist + npm-packlist on the source tree).
//
// Background: lerna's pack pipeline tars the source tree as-is, which
// would publish .ts files and .ts import specifiers. ts-node-pack stages
// each package into a target directory with .ts -> .js rewrites and
// resolved `workspace:` deps. lerna then packs and uploads from there
// via --contents.
//
// ts-node-pack reads source manifests as it stages, so any version bumps
// (e.g. `yarn lerna version`) must happen before this script runs.
//
// Usage:
//   node scripts/packing/stage-with-ts-node-pack.mjs           # stage all
//   node scripts/packing/stage-with-ts-node-pack.mjs --clean   # remove all

import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const STAGE_DIR_NAME = '.ts-node-pack';

const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();

const allWorkspaces = JSON.parse(
  execFileSync('npm', ['query', '.workspace'], {
    encoding: 'utf8',
    cwd: ROOT,
    maxBuffer: 64 * 1024 * 1024,
  }),
);

if (process.argv.includes('--clean')) {
  // Sweep every workspace, not just publishable ones, so that staging dirs
  // left over from packages that have since become private are also removed.
  let removed = 0;
  for (const ws of allWorkspaces) {
    const stage = join(ROOT, ws.location, STAGE_DIR_NAME);
    if (existsSync(stage)) {
      rmSync(stage, { recursive: true, force: true });
      removed += 1;
    }
  }
  process.stderr.write(`Removed ${removed} ${STAGE_DIR_NAME}/ directories\n`);
  process.exit(0);
}

const TS_NODE_PACK = join(ROOT, 'node_modules', '.bin', 'ts-node-pack');
const publishable = allWorkspaces.filter(ws => ws.private !== true);

let staged = 0;
for (const ws of publishable) {
  const pkgDir = join(ROOT, ws.location);
  const dest = join(pkgDir, STAGE_DIR_NAME);

  process.stderr.write(`stage ${ws.name}\n`);

  // ts-node-pack writes staged contents directly into `dest` with .ts -> .js
  // rewrites in code, manifests, exports, and the files array, plus
  // resolved `workspace:` deps from the monorepo version map. --force
  // clears any prior staging dir from a previous run.
  execFileSync(
    TS_NODE_PACK,
    [pkgDir, '--skip-pack', '--stage-to', dest, '--force'],
    { cwd: ROOT, stdio: 'inherit' },
  );

  staged += 1;
}

process.stderr.write(`Staged ${staged} packages into ${STAGE_DIR_NAME}/\n`);
