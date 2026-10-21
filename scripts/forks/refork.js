#!/usr/bin/env node

import { createReadStream, createWriteStream, realpathSync } from 'node:fs';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { finished } from 'node:stream/promises';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { $ } from 'execa';

const { freeze } = Object;
const EXPECTED_DIFF_EXIT_CODES = freeze([0, 1]); // 0 means no diff, 1 means diff found

const require = createRequire(import.meta.url);
const entrypointPath = realpathSync(fileURLToPath(import.meta.url));
const isMainEntrypoint = () => {
  if (!process.argv[1]) {
    return false;
  }
  try {
    return realpathSync(require.resolve(process.argv[1])) === entrypointPath;
  } catch {
    return false;
  }
};

const writeChunk = async (outputStream, chunk) => {
  if (chunk.length === 0) {
    return;
  }
  if (outputStream.write(chunk)) {
    return;
  }
  await new Promise(resolve => outputStream.once('drain', resolve));
};

const stripGitPrefix = filePath =>
  filePath.startsWith('a/') || filePath.startsWith('b/')
    ? filePath.slice(2)
    : filePath;

const getFileDiffFilename = blockLines => {
  const minusLine = blockLines.find(line => line.startsWith('--- '));
  const plusLine = blockLines.find(line => line.startsWith('+++ '));
  const minusPath = minusLine ? minusLine.slice(4).trim() : null;
  const plusPath = plusLine ? plusLine.slice(4).trim() : null;
  return plusPath && plusPath !== '/dev/null'
    ? stripGitPrefix(plusPath)
    : minusPath && minusPath !== '/dev/null'
      ? stripGitPrefix(minusPath)
      : null;
};

export const splitPatchIntoFileDiffs = patchText => {
  if (
    !patchText ||
    patchText === 'No diff.\n' ||
    patchText.trim() === 'No diff.'
  ) {
    return new Map();
  }

  const lines = patchText.split('\n');
  const fileDiffs = new Map();
  let currentBlock = [];

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      if (currentBlock.length > 0) {
        const filename = getFileDiffFilename(currentBlock);
        if (filename) {
          fileDiffs.set(filename, `${currentBlock.join('\n')}\n`);
        }
      }
      currentBlock = [line];
      continue;
    }
    if (currentBlock.length > 0) {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) {
    const filename = getFileDiffFilename(currentBlock);
    if (filename) {
      fileDiffs.set(filename, `${currentBlock.join('\n')}\n`);
    }
  }

  return fileDiffs;
};

export const streamPatchFileDiffs = async function* streamPatchFileDiffs(
  patchPath,
) {
  const rl = readline.createInterface({
    input: createReadStream(patchPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  let currentBlock = [];

  for await (const line of rl) {
    if (line.startsWith('diff --git ')) {
      if (currentBlock.length > 0) {
        const filename = getFileDiffFilename(currentBlock);
        if (filename) {
          yield { filename, text: `${currentBlock.join('\n')}\n` };
        }
      }
      currentBlock = [line];
      continue;
    }
    if (currentBlock.length > 0) {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    const filename = getFileDiffFilename(currentBlock);
    if (filename) {
      yield { filename, text: `${currentBlock.join('\n')}\n` };
    }
  }
};

const writeRawWholePatchDiff = async ({
  workspaceDir,
  forkBasePatchPath,
  diffMergePatchPath,
  diffOfDiffsRawPath,
}) => {
  const { exitCode, stdout: diffStdout } = await $({
    cwd: workspaceDir,
    reject: false,
    stdout: 'pipe',
    stderr: 'inherit',
  })`diff -u --label ${path.basename(forkBasePatchPath)} --label ${path.basename(diffMergePatchPath)} ${path.basename(forkBasePatchPath)} ${path.basename(diffMergePatchPath)}`;

  if (exitCode == null || !EXPECTED_DIFF_EXIT_CODES.includes(exitCode)) {
    throw new Error(`diff exited with code ${exitCode}`);
  }

  await writeFile(
    diffOfDiffsRawPath,
    diffStdout
      ? `${diffStdout}${diffStdout.endsWith('\n') ? '' : '\n'}`
      : 'No diff.\n',
  );
};

export const writePairedDiffOfDiffs = async ({
  workspaceDir,
  forkBasePatchPath,
  diffMergePatchPath,
  diffOfDiffsRawPath,
  diffOfDiffsPath,
  diffDevNull = false,
}) => {
  const outputStream = createWriteStream(diffOfDiffsPath, { encoding: 'utf8' });
  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), 'refork-diff-of-diffs-'),
  );
  const tempAPatchPath = path.join(tempDir, 'a.patch');
  const tempBPatchPath = path.join(tempDir, 'b.patch');
  const aIterator =
    streamPatchFileDiffs(forkBasePatchPath)[Symbol.asyncIterator]();
  const bIterator =
    streamPatchFileDiffs(diffMergePatchPath)[Symbol.asyncIterator]();
  let diffCount = 0;
  try {
    await writeRawWholePatchDiff({
      workspaceDir,
      forkBasePatchPath,
      diffMergePatchPath,
      diffOfDiffsRawPath,
    });
    let aNext = await aIterator.next();
    let bNext = await bIterator.next();

    while (!aNext.done || !bNext.done) {
      const aFileDiff = aNext.done ? null : aNext.value;
      const bFileDiff = bNext.done ? null : bNext.value;
      const filename =
        aFileDiff && bFileDiff
          ? aFileDiff.filename.localeCompare(bFileDiff.filename) <= 0
            ? aFileDiff.filename
            : bFileDiff.filename
          : aFileDiff
            ? aFileDiff.filename
            : bFileDiff?.filename;
      const useA = aFileDiff?.filename === filename;
      const useB = bFileDiff?.filename === filename;
      const aPatch = useA ? aFileDiff?.text : null;
      const bPatch = useB ? bFileDiff?.text : null;
      if (!diffDevNull && (!aPatch || !bPatch)) {
        diffCount += 1;
        const summary = aPatch
          ? `Deleted file fork-base/${filename}\n`
          : `Created file merge-fork/${filename}\n`;
        await writeChunk(outputStream, summary);
        if (useA) {
          aNext = await aIterator.next();
        }
        if (useB) {
          bNext = await bIterator.next();
        }
        continue;
      }

      const leftPath = aPatch ? tempAPatchPath : '/dev/null';
      const rightPath = bPatch ? tempBPatchPath : '/dev/null';

      if (aPatch) {
        await writeFile(leftPath, aPatch);
      }
      if (bPatch) {
        await writeFile(rightPath, bPatch);
      }

      const leftLabel = aPatch ? `fork-base/${filename}` : '/dev/null';
      const rightLabel = bPatch ? `merge-fork/${filename}` : '/dev/null';
      const { exitCode, stdout: diffStdout } = await $({
        cwd: workspaceDir,
        reject: false,
        stdout: 'pipe',
        stderr: 'inherit',
      })`diff -u --label ${leftLabel} --label ${rightLabel} ${leftPath} ${rightPath}`;

      if (exitCode == null || !EXPECTED_DIFF_EXIT_CODES.includes(exitCode)) {
        throw new Error(`diff exited with code ${exitCode} for ${filename}`);
      }
      if (diffStdout) {
        diffCount += 1;
        const renderedDiff = `diff -u ${leftLabel} ${rightLabel}\n${diffStdout}${
          diffStdout.endsWith('\n') ? '' : '\n'
        }`;
        await writeChunk(outputStream, renderedDiff);
      }

      if (useA) {
        aNext = await aIterator.next();
      }
      if (useB) {
        bNext = await bIterator.next();
      }
    }

    if (diffCount === 0) {
      await writeChunk(outputStream, 'No diff.\n');
    }
  } finally {
    outputStream.end();
    await finished(outputStream);
    await rm(tempDir, { recursive: true, force: true });
  }
};

const main = async ({ args }) => {
  const { values, positionals } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      status: { type: 'boolean' },
      resume: { type: 'boolean' },
      'dry-run': { type: 'boolean', short: 'n' },
      exclude: { type: 'string', multiple: true },
      'diff-null': { type: 'boolean' },
    },
    allowPositionals: true,
  });
  const wantsHelp = values.help ?? false;
  const wantsStatus = values.status ?? false;
  const wantsResume = values.resume ?? false;
  const dryRun = values['dry-run'] ?? false;
  const diffDevNull = values['diff-null'] ?? false;
  const excludeGlobs =
    values.exclude && values.exclude.length > 0
      ? values.exclude.filter(Boolean)
      : [
          '**/*.pb.go',
          '**/*.pb.gw.go',
          '**/*.pulsar.go',
          '**/*.sum',
          '**/mocks/**',
          '**/swagger-ui/**',
        ];

  const DESCRIPTION =
    'Update a long-lived fork to include changes from its base to a new target';
  const USAGE =
    'refork [--status|--resume] [--dry-run] <fork_branch> <base_ref> <target_ref>';
  const EXAMPLE = 'refork Agoric v0.38.17 release/v0.38.x';

  if (wantsHelp) {
    console.log(`\
Usage: ${USAGE}
${DESCRIPTION}
Example: ${EXAMPLE}
Options:
  -h, --help     Show this help and exit
  --status       Show current refork status and exit
  --resume       Attempt to resume an in-progress merge before continuing
  --exclude      Glob of files to omit from diff-of-diffs inputs (repeatable;
                 defaults include code likely to have been generated
                 mechanically; use just \`--exclude=\` for no exclusions)
  --diff-null    Emit full per-file diffs for /dev/null pairings
  -n, --dry-run  Print git commands without executing mutations`);
    return;
  }

  const [forkBranch, baseRef, targetRef] = positionals;
  if (!forkBranch || !baseRef || !targetRef) {
    console.warn(`\
Usage: ${USAGE}
Example: ${EXAMPLE}`);
    throw new Error('Invalid arguments');
  }

  const mergeFork = `merge-${forkBranch}/${targetRef}`;
  const diffUpstream = `diff-${baseRef}/${targetRef}`;
  const workspace = 'refork-workspace';
  const cwd = process.cwd();
  const workspaceDir = path.join(cwd, workspace);
  const diffUpstreamStatPath = path.join(
    workspaceDir,
    'diff-upstream-stat.txt',
  );
  const diffUpstreamPatchPath = path.join(workspaceDir, 'diff-upstream.patch');
  const forkBasePatchPath = path.join(workspaceDir, 'fork-base.patch');
  const diffMergeStatPath = path.join(workspaceDir, 'merge-fork-stat.txt');
  const diffMergePatchPath = path.join(workspaceDir, 'merge-fork.patch');
  const diffOfDiffsRawPath = path.join(workspaceDir, 'diff-of-diffs.raw.patch');
  const diffOfDiffsPath = path.join(workspaceDir, 'diff-of-diffs.patch');
  const reportPath = path.join(workspaceDir, 'report.md');
  const gitMutatingCommands = new Set([
    'checkout',
    'merge',
    'rm',
    'clean',
    'reset',
    'rebase',
    'cherry-pick',
    'apply',
    'stash',
    'switch',
    'branch',
  ]);

  const git = async (argsList, options = {}) => {
    const { stdio, env } = options;
    const isMutating = gitMutatingCommands.has(argsList[0]);
    const prefix = dryRun && isMutating ? '[dry-run] ' : '';
    console.warn(`${prefix}$ git ${argsList.join(' ')} (cwd: ${cwd})`);
    if (dryRun && isMutating) {
      return { stderr: '', stdout: '' };
    }
    const result = await $({
      cwd,
      stdio: stdio ?? ['inherit', 'pipe', 'inherit'],
      env,
    })`git ${argsList}`;
    return { stderr: result.stderr, stdout: result.stdout };
  };
  const gitStdout = async (argsList, options = {}) => {
    const result = await git(argsList, options);
    return `${result.stdout ?? ''}`.trim();
  };
  const gitDiffWithExcludes = async (leftRef, rightRef) => {
    // https://git-scm.com/docs/gitglossary#Documentation/gitglossary.txt-pathspec
    const pathspecArgs = excludeGlobs.map(glob => `:(exclude,glob)${glob}`);
    return gitStdout(['diff', leftRef, rightRef, '--', ...pathspecArgs]);
  };

  await null;
  const originalBranch = await gitStdout(['rev-parse', '--abbrev-ref', 'HEAD']);

  if (dryRun) {
    console.warn(`[dry-run] Skipping create workspace dir ${workspaceDir}.`);
  } else {
    await mkdir(workspaceDir, { recursive: true });
  }

  const refExists = (ref, quiet = false) =>
    git(['rev-parse', '--verify', ...(quiet ? ['-q'] : []), ref]).then(
      () => true,
      () => false,
    );

  const ensureRef = async ref => {
    const exists = await refExists(ref);
    if (!exists) {
      throw new Error(`git ref not found: ${ref}`);
    }
  };

  const hasMergeInProgress = () => refExists('MERGE_HEAD', true);

  const checkoutBranch = async (branch, base) => {
    const exists = await refExists(branch);
    const gitArgs = exists
      ? ['checkout', branch]
      : ['checkout', '-B', branch, base];
    await git(gitArgs, { stdio: 'inherit' });
  };

  await ensureRef(forkBranch);
  await ensureRef(baseRef);
  await ensureRef(targetRef);

  const promptForConflictResolution = async () => {
    await null;
    const rl = readline.createInterface({ input: stdin, output: stdout });
    try {
      while (true) {
        const conflicts = await gitStdout([
          'diff',
          '---exit-code',
          '--name-only',
          '--diff-filter=U',
        ]);
        if (!conflicts) {
          return;
        }
        const answer = await rl.question(
          `Merge conflicts detected:\n${conflicts}\n` +
            'Resolve them, then press Enter to continue. Type "abort" to abort the merge: ',
        );
        if (answer.trim().toLowerCase() === 'abort') {
          await git(['merge', '--abort'], { stdio: 'inherit' });
          throw new Error('Merge aborted by user.');
        }
      }
    } finally {
      rl.close();
    }
  };

  const continueMergeIfNeeded = async () => {
    const mergeInProgress = await hasMergeInProgress();
    if (!mergeInProgress) {
      return;
    }
    try {
      await git(['merge', '--continue'], { stdio: 'inherit' });
    } catch (err) {
      await promptForConflictResolution();
      if (await hasMergeInProgress()) {
        await git(['merge', '--continue'], { stdio: 'inherit' });
      }
    }
  };

  const mergeWithResume = async (ref, moreArgs = []) => {
    const mergeInProgress = await hasMergeInProgress();
    if (mergeInProgress) {
      await promptForConflictResolution();
      await continueMergeIfNeeded();
      return;
    }
    try {
      await git(['merge', '--no-edit', ref, ...moreArgs], { stdio: 'inherit' });
    } catch (err) {
      await promptForConflictResolution();
      await continueMergeIfNeeded();
    }
  };

  const formatFileSize = size => {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let value = size;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    const digits = value >= 10 || unitIndex === 0 ? 0 : 1;
    return `${value.toFixed(digits)} ${units[unitIndex]}`;
  };

  const describeArtifact = async artifactPath => {
    const artifactRelative = path.relative(path.dirname(cwd), artifactPath);
    if (dryRun) {
      return `${artifactRelative} (size unavailable in dry-run)`;
    }
    const { size } = await stat(artifactPath);
    return `${artifactRelative} (${formatFileSize(size)})`;
  };

  const collectWorkspaceState = async ({ currentBranch, mergeInProgress }) => {
    const diffUpstreamExists = await refExists(diffUpstream);
    const mergeForkExists = await refExists(mergeFork);

    const diffUpstreamStat = diffUpstreamExists
      ? await gitStdout([
          'diff',
          '--no-pager',
          '--stat',
          targetRef,
          diffUpstream,
        ])
      : '';
    const diffUpstreamPatch = diffUpstreamExists
      ? await gitStdout(['diff', '--no-pager', targetRef, diffUpstream])
      : '';
    const diffUpstreamFiles = diffUpstreamExists
      ? await gitStdout([
          'diff',
          '--no-pager',
          '--name-only',
          targetRef,
          diffUpstream,
        ])
      : '';
    const remainingDiffUpstream =
      diffUpstreamExists && !mergeInProgress
        ? await gitStdout([
            'diff',
            '--no-pager',
            '--name-status',
            targetRef,
            diffUpstream,
          ])
        : '';
    const forkBasePatch = await gitDiffWithExcludes(baseRef, forkBranch);

    const diffMergeStat = mergeForkExists
      ? await gitStdout(['diff', '--no-pager', '--stat', forkBranch, mergeFork])
      : '';
    const diffMergePatch = mergeForkExists
      ? await gitDiffWithExcludes(targetRef, mergeFork)
      : '';
    const mergeFiles = mergeForkExists
      ? await gitStdout([
          'diff',
          '--no-pager',
          '--name-only',
          forkBranch,
          mergeFork,
        ])
      : '';

    return {
      currentBranch,
      mergeInProgress,
      diffUpstreamExists,
      mergeForkExists,
      diffUpstreamStat,
      diffUpstreamPatch,
      diffUpstreamFiles,
      remainingDiffUpstream,
      forkBasePatch,
      diffMergeStat,
      diffMergePatch,
      mergeFiles,
    };
  };

  const writeWorkspaceReport = async state => {
    const {
      currentBranch,
      mergeInProgress,
      diffUpstreamExists,
      mergeForkExists,
      diffUpstreamStat,
      diffUpstreamPatch,
      diffUpstreamFiles,
      remainingDiffUpstream,
      forkBasePatch,
      diffMergeStat,
      diffMergePatch,
      mergeFiles,
    } = state;

    const remainingEntries = remainingDiffUpstream
      ? remainingDiffUpstream.split('\n').filter(Boolean)
      : [];

    await null;
    if (dryRun) {
      console.warn('[dry-run] Skipping write of diff/merge artifacts.');
    } else {
      await writeFile(
        diffUpstreamStatPath,
        diffUpstreamExists
          ? diffUpstreamStat || 'No diff.\n'
          : `Branch not found: ${diffUpstream}\n`,
      );
      await writeFile(
        diffUpstreamPatchPath,
        diffUpstreamExists
          ? diffUpstreamPatch || 'No diff.\n'
          : `Branch not found: ${diffUpstream}\n`,
      );
      await writeFile(forkBasePatchPath, forkBasePatch || 'No diff.\n');
      await writeFile(
        diffMergeStatPath,
        mergeForkExists
          ? diffMergeStat || 'No diff.\n'
          : `Branch not found: ${mergeFork}\n`,
      );
      await writeFile(
        diffMergePatchPath,
        mergeForkExists
          ? diffMergePatch || 'No diff.\n'
          : `Branch not found: ${mergeFork}\n`,
      );
      if (diffUpstreamExists && mergeForkExists) {
        await writePairedDiffOfDiffs({
          workspaceDir,
          forkBasePatchPath,
          diffMergePatchPath,
          diffOfDiffsRawPath,
          diffOfDiffsPath,
          diffDevNull,
        });
      } else {
        await writeFile(
          diffOfDiffsRawPath,
          `Missing branch inputs for diff-of-diffs: ${[
            !diffUpstreamExists ? diffUpstream : null,
            !mergeForkExists ? mergeFork : null,
          ]
            .filter(Boolean)
            .join(', ')}\n`,
        );
        await writeFile(
          diffOfDiffsPath,
          `Missing branch inputs for diff-of-diffs: ${[
            !diffUpstreamExists ? diffUpstream : null,
            !mergeForkExists ? mergeFork : null,
          ]
            .filter(Boolean)
            .join(', ')}\n`,
        );
      }
    }

    const artifactEntries = await Promise.all([
      describeArtifact(diffUpstreamStatPath),
      describeArtifact(diffUpstreamPatchPath),
      describeArtifact(forkBasePatchPath),
      describeArtifact(diffMergeStatPath),
      describeArtifact(diffMergePatchPath),
      describeArtifact(diffOfDiffsRawPath),
      describeArtifact(diffOfDiffsPath),
    ]);

    const reportLines = [
      '# Refork report',
      '',
      `- Fork branch: ${forkBranch}`,
      `- Base ref: ${baseRef}`,
      `- Target ref: ${targetRef}`,
      `- Diff-of-diffs excludes: ${
        excludeGlobs.length ? excludeGlobs.join(', ') : 'none'
      }`,
      `- Current branch: ${currentBranch}`,
      `- Merge in progress: ${mergeInProgress ? 'yes' : 'no'}`,
      `- diffUpstream branch: ${diffUpstream}`,
      `- diffUpstream branch exists: ${diffUpstreamExists ? 'yes' : 'no'}`,
      `- mergeFork branch: ${mergeFork}`,
      `- mergeFork branch exists: ${mergeForkExists ? 'yes' : 'no'}`,
      '',
      '## DiffUpstream normalization',
      `- Remaining diffs vs target: ${
        diffUpstreamFiles
          ? diffUpstreamFiles.split('\n').filter(Boolean).length
          : 0
      }`,
      ...(diffUpstreamExists
        ? remainingEntries.length
          ? [
              '- Remaining entries:',
              ...remainingEntries.map(line => `  - ${line}`),
            ]
          : ['- Remaining entries: none']
        : ['- Remaining entries: unavailable']),
      '',
      '## Merge results',
      `- Files changed vs fork branch: ${
        mergeFiles ? mergeFiles.split('\n').filter(Boolean).length : 0
      }`,
      '',
      '## Workspace artifacts',
      ...artifactEntries.map(entry => `- ${entry}`),
      '',
    ];

    const report = reportLines.join('\n');
    if (dryRun) {
      console.warn(`[dry-run] Skipping write of ${reportPath}.`);
    } else {
      await writeFile(reportPath, report);
    }
    return report;
  };

  try {
    if (wantsStatus) {
      const currentBranch = await gitStdout([
        'rev-parse',
        '--abbrev-ref',
        'HEAD',
      ]);
      const mergeInProgress = await hasMergeInProgress();
      const report = await writeWorkspaceReport(
        await collectWorkspaceState({ currentBranch, mergeInProgress }),
      );
      console.log(report);
      return;
    }

    if (wantsResume && (await hasMergeInProgress())) {
      await continueMergeIfNeeded();
    }

    await checkoutBranch(diffUpstream, targetRef);
    await mergeWithResume(baseRef, ['-s', 'ours']);

    await checkoutBranch(mergeFork, forkBranch);
    await mergeWithResume(diffUpstream);

    const currentBranch = await gitStdout([
      'rev-parse',
      '--abbrev-ref',
      'HEAD',
    ]);
    const mergeInProgress = await hasMergeInProgress();
    const report = await writeWorkspaceReport(
      await collectWorkspaceState({ currentBranch, mergeInProgress }),
    );
    console.log(report);
  } catch (err) {
    if (await hasMergeInProgress()) {
      console.error(
        'Merge still in progress. Resolve conflicts and rerun to resume.',
      );
    } else {
      await git(['merge', '--abort'], { stdio: 'inherit' }).catch(() => {});
    }
    throw err;
  } finally {
    if (!(await hasMergeInProgress())) {
      await git(['checkout', originalBranch], { stdio: 'inherit' }).catch(
        () => {},
      );
    }
  }
};

if (isMainEntrypoint()) {
  main({ args: process.argv.slice(2) }).catch(err => {
    console.error(err);
    process.exit(process.exitCode || 1);
  });
}
