import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  splitPatchIntoFileDiffs,
  streamPatchFileDiffs,
  writePairedDiffOfDiffs,
} from '../forks/refork.js';

test('splitPatchIntoFileDiffs indexes per-file diffs by filename', () => {
  const patch = [
    'diff --git a/alpha.txt b/alpha.txt',
    'index 1111111..2222222 100644',
    '--- a/alpha.txt',
    '+++ b/alpha.txt',
    '@@ -1 +1 @@',
    '-old',
    '+new',
    'diff --git a/bravo.txt b/bravo.txt',
    'index 3333333..4444444 100644',
    '--- a/bravo.txt',
    '+++ b/bravo.txt',
    '@@ -1 +1 @@',
    '-before',
    '+after',
    '',
  ].join('\n');

  const fileDiffs = splitPatchIntoFileDiffs(patch);

  assert.deepEqual([...fileDiffs.keys()], ['alpha.txt', 'bravo.txt']);
  assert.match(
    fileDiffs.get('alpha.txt'),
    /^diff --git a\/alpha\.txt b\/alpha\.txt/m,
  );
  assert.match(
    fileDiffs.get('bravo.txt'),
    /^diff --git a\/bravo\.txt b\/bravo\.txt/m,
  );
});

test('splitPatchIntoFileDiffs prefers added filename and falls back from /dev/null', () => {
  const patch = [
    'diff --git a/new.txt b/newer.txt',
    'similarity index 90%',
    'rename from new.txt',
    'rename to newer.txt',
    '--- a/new.txt',
    '+++ b/newer.txt',
    '@@ -1 +1 @@',
    '-old',
    '+new',
    'diff --git a/created.txt b/created.txt',
    'new file mode 100644',
    '--- /dev/null',
    '+++ b/created.txt',
    '@@ -0,0 +1 @@',
    '+created',
    'diff --git a/deleted.txt b/deleted.txt',
    'deleted file mode 100644',
    '--- a/deleted.txt',
    '+++ /dev/null',
    '@@ -1 +0,0 @@',
    '-deleted',
    '',
  ].join('\n');

  const fileDiffs = splitPatchIntoFileDiffs(patch);

  assert.deepEqual(
    [...fileDiffs.keys()],
    ['newer.txt', 'created.txt', 'deleted.txt'],
  );
});

test('streamPatchFileDiffs yields file diffs in input order', async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), 'refork-test-'));
  const patchPath = path.join(workspaceDir, 'fork-base.patch');

  try {
    await writeFile(
      patchPath,
      [
        'diff --git a/alpha.txt b/alpha.txt',
        'index 1111111..2222222 100644',
        '--- a/alpha.txt',
        '+++ b/alpha.txt',
        '@@ -1 +1 @@',
        '-old',
        '+new',
        'diff --git a/bravo.txt b/bravo.txt',
        'index 3333333..4444444 100644',
        '--- a/bravo.txt',
        '+++ b/bravo.txt',
        '@@ -1 +1 @@',
        '-before',
        '+after',
        '',
      ].join('\n'),
    );

    const yielded = [];
    for await (const fileDiff of streamPatchFileDiffs(patchPath)) {
      yielded.push(fileDiff.filename);
    }

    assert.deepEqual(yielded, ['alpha.txt', 'bravo.txt']);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('writePairedDiffOfDiffs summarizes /dev/null pairs by default', async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), 'refork-test-'));
  const forkBasePatchPath = path.join(workspaceDir, 'fork-base.patch');
  const diffMergePatchPath = path.join(workspaceDir, 'merge-fork.patch');
  const diffOfDiffsRawPath = path.join(workspaceDir, 'diff-of-diffs.raw.patch');
  const diffOfDiffsPath = path.join(workspaceDir, 'diff-of-diffs.patch');

  try {
    await writeFile(
      forkBasePatchPath,
      [
        'diff --git a/alpha.txt b/alpha.txt',
        'index 1111111..2222222 100644',
        '--- a/alpha.txt',
        '+++ b/alpha.txt',
        '@@ -1 +1 @@',
        '-old alpha',
        '+new alpha',
        'diff --git a/only-a.txt b/only-a.txt',
        'new file mode 100644',
        '--- /dev/null',
        '+++ b/only-a.txt',
        '@@ -0,0 +1 @@',
        '+only in a',
        '',
      ].join('\n'),
    );
    await writeFile(
      diffMergePatchPath,
      [
        'diff --git a/alpha.txt b/alpha.txt',
        'index 1111111..3333333 100644',
        '--- a/alpha.txt',
        '+++ b/alpha.txt',
        '@@ -1 +1 @@',
        '-old alpha',
        '+newer alpha',
        'diff --git a/only-b.txt b/only-b.txt',
        'new file mode 100644',
        '--- /dev/null',
        '+++ b/only-b.txt',
        '@@ -0,0 +1 @@',
        '+only in b',
        '',
      ].join('\n'),
    );

    await writePairedDiffOfDiffs({
      workspaceDir,
      forkBasePatchPath,
      diffMergePatchPath,
      diffOfDiffsRawPath,
      diffOfDiffsPath,
    });

    const raw = await readFile(diffOfDiffsRawPath, 'utf8');
    const filtered = await readFile(diffOfDiffsPath, 'utf8');

    assert.notEqual(raw, filtered);
    assert.match(raw, /--- fork-base\.patch\n\+\+\+ merge-fork\.patch/);
    assert.match(
      filtered,
      /diff -u fork-base\/alpha\.txt merge-fork\/alpha\.txt\n--- fork-base\/alpha\.txt\n\+\+\+ merge-fork\/alpha\.txt/,
    );
    assert.match(filtered, /Deleted file fork-base\/only-a\.txt/);
    assert.match(filtered, /Created file merge-fork\/only-b\.txt/);
    assert.doesNotMatch(filtered, /diff -u fork-base\/only-a\.txt \/dev\/null/);
    assert.doesNotMatch(
      filtered,
      /diff -u \/dev\/null merge-fork\/only-b\.txt/,
    );
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('writePairedDiffOfDiffs emits full /dev/null diffs when diffDevNull is enabled', async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), 'refork-test-'));
  const forkBasePatchPath = path.join(workspaceDir, 'fork-base.patch');
  const diffMergePatchPath = path.join(workspaceDir, 'merge-fork.patch');
  const diffOfDiffsRawPath = path.join(workspaceDir, 'diff-of-diffs.raw.patch');
  const diffOfDiffsPath = path.join(workspaceDir, 'diff-of-diffs.patch');

  try {
    await writeFile(
      forkBasePatchPath,
      [
        'diff --git a/only-a.txt b/only-a.txt',
        'new file mode 100644',
        '--- /dev/null',
        '+++ b/only-a.txt',
        '@@ -0,0 +1 @@',
        '+only in a',
        '',
      ].join('\n'),
    );
    await writeFile(diffMergePatchPath, 'No diff.\n');

    await writePairedDiffOfDiffs({
      workspaceDir,
      forkBasePatchPath,
      diffMergePatchPath,
      diffOfDiffsRawPath,
      diffOfDiffsPath,
      diffDevNull: true,
    });

    const filtered = await readFile(diffOfDiffsPath, 'utf8');
    assert.match(
      filtered,
      /diff -u fork-base\/only-a\.txt \/dev\/null\n--- fork-base\/only-a\.txt\n\+\+\+ \/dev\/null/,
    );
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('writePairedDiffOfDiffs writes No diff when both patch inputs are empty', async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), 'refork-test-'));
  const forkBasePatchPath = path.join(workspaceDir, 'fork-base.patch');
  const diffMergePatchPath = path.join(workspaceDir, 'merge-fork.patch');
  const diffOfDiffsRawPath = path.join(workspaceDir, 'diff-of-diffs.raw.patch');
  const diffOfDiffsPath = path.join(workspaceDir, 'diff-of-diffs.patch');

  try {
    await writeFile(forkBasePatchPath, 'No diff.\n');
    await writeFile(diffMergePatchPath, 'No diff.\n');

    await writePairedDiffOfDiffs({
      workspaceDir,
      forkBasePatchPath,
      diffMergePatchPath,
      diffOfDiffsRawPath,
      diffOfDiffsPath,
    });

    assert.equal(await readFile(diffOfDiffsRawPath, 'utf8'), 'No diff.\n');
    assert.equal(await readFile(diffOfDiffsPath, 'utf8'), 'No diff.\n');
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});
