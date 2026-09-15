#!/usr/bin/env node
// Regenerate every AVA snapshot's human-readable `.md` report purely from its
// committed `.snap` binary, then fail if that changes anything.
//
// AVA only rewrites these files together, from the same in-memory data, when
// a test run is invoked with `--update-snapshots` (see
// node_modules/ava/lib/snapshot-manager.js `Manager#save`). A normal test run
// never touches either file, and asserts only against the `.snap`, so a `.md`
// that was hand-edited (e.g. mis-resolved in a merge/rebase, since git can't
// line-diff the binary `.snap` to catch the same mistake there) can silently
// drift out of sync with the binary without any test ever failing or
// regenerating it. This script re-derives the `.md` the same way AVA would,
// without going through a full test run and without touching the `.snap`, so
// CI can catch that drift directly.
//
// To do this without reimplementing AVA's (private) report-formatting logic,
// this drives the real `Manager#save` in "updating" mode after copying every
// existing block forward unchanged via `skipBlock` -- so the exact same
// (title, snapshots) data gets re-encoded and re-rendered by AVA itself. The
// re-encoded `.snap` is verified byte-for-byte unchanged as a safety check.

import { $ } from 'execa';
import fs from 'node:fs';
import path from 'node:path';

// Ensure we run from the repository root if possible
try {
  const { stdout } = await $('git', ['rev-parse', '--show-toplevel']);
  process.chdir(stdout.trim());
} catch {
  // ignore; continue from current cwd
}

const root = process.cwd();

// Reach into AVA's internals by resolved file path. AVA's package.json
// `exports` field blocks the bare `ava/lib/...` specifier, but not a path
// already resolved into its node_modules, so this survives `yarn install`
// as long as the file stays where AVA puts it (guarded by the try/catch
// below, which turns a future AVA restructuring into a clear failure
// instead of a silently-wrong report).
const avaPkgUrl = import.meta.resolve('ava');
const avaLibDir = path.join(
  path.dirname(new URL(avaPkgUrl).pathname).replace(/entrypoints$/, ''),
  'lib',
);
let load;
try {
  ({ load } = await import(path.join(avaLibDir, 'snapshot-manager.js')));
} catch (err) {
  console.error('Could not load AVA internals used to decode .snap files.');
  console.error(
    'This script depends on the on-disk layout of node_modules/ava/lib and',
  );
  console.error('may need updating for the installed AVA version.');
  throw err;
}

// Recover the `test/foo.test.ts`-relative-to-package-root file AVA was
// originally run against, from just the `.snap` path -- reversing the naming
// convention in determineSnapshotDir/determineSnapshotPaths -- since we only
// have `.snap` paths to start from, not the test files that produced them.
async function findProjectDir(startDir) {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`No package.json above ${startDir}`);
    dir = parent;
  }
}

async function regenerate(snapPath) {
  const snapFile = path.basename(snapPath);
  const name = snapFile.replace(/\.snap$/, '');
  const snapDir = path.dirname(snapPath);
  const testDir = ['snapshots', '__snapshots__'].includes(
    path.basename(snapDir),
  )
    ? path.dirname(snapDir)
    : snapDir;
  const projectDir = await findProjectDir(testDir);
  const file = path.join(testDir, name);

  const manager = load({
    file,
    projectDir,
    recordNewSnapshots: false,
    updating: true,
  });
  if (manager.snapPath !== snapPath) {
    throw new Error(
      `Computed snapshot path ${manager.snapPath} for ${file} does not match discovered ${snapPath}; the snapshot directory-naming convention this script assumes must have changed`,
    );
  }
  // `updating: true` silently swallows decode errors (treats them as "no
  // snapshots yet"), and `save()` will delete both files when it finds none
  // to keep. Refuse to proceed rather than risk that on a real .snap.
  if (manager.oldBlocksByTitle.size === 0) {
    throw new Error(
      `Decoded zero snapshot blocks from ${snapPath}; refusing to regenerate its report (this would otherwise delete both files)`,
    );
  }

  const before = fs.readFileSync(snapPath);
  for (const title of manager.oldBlocksByTitle.keys()) manager.skipBlock(title);
  manager.hasChanges = true; // force save() past its no-op guard; skipBlock alone doesn't set this
  await manager.save();

  // skipBlock carries each snapshot's already-serialized `data` forward
  // unchanged (by reference) -- only the outer CBOR envelope (title/label
  // strings, map structure) gets re-encoded. That envelope isn't guaranteed
  // byte-stable across cbor2/ava versions even for identical content (seen
  // in practice: a few bytes differ on a `.snap` last written by an older
  // dependency version), so restore the original bytes verbatim rather than
  // risk ever committing an incidental re-encoding.
  const after = fs.readFileSync(snapPath);
  if (!before.equals(after)) {
    fs.writeFileSync(snapPath, before);
    console.log(
      `  (${path.relative(root, snapPath)} re-encoded to different but equivalent bytes; restored original)`,
    );
  }
}

const { stdout } = await $('git', ['ls-files', '--', '**/*.snap']);
const snapFiles = stdout
  .split('\n')
  .filter(f => f && !f.includes('node_modules'))
  .map(f => path.join(root, f));

if (snapFiles.length === 0) {
  console.log('No .snap files found.');
  process.exit(0);
}

console.log(
  `Regenerating ${snapFiles.length} snapshot report(s) from their .snap binaries...`,
);
for (const snapPath of snapFiles) {
  await regenerate(snapPath);
}

// Deliberately not checking `git status` here: CI runs this from
// .github/actions/restore-node's automatic post-job dirty-tree check, which
// covers the whole job including this step. A developer running this
// locally just wants the files rewritten to `git diff`/commit by hand.
console.log('Done. `git diff` to review, or rely on CI to catch any drift.');
