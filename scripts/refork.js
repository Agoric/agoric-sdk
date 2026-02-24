#!/usr/bin/env node

import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { parseArgs } from 'node:util';
import { $ } from 'execa';

const main = async ({ args }) => {
  const { values, positionals } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      status: { type: 'boolean' },
      resume: { type: 'boolean' },
      'dry-run': { type: 'boolean', short: 'n' },
      exclude: { type: 'string', multiple: true },
    },
    allowPositionals: true,
  });
  const wantsHelp = values.help ?? false;
  const wantsStatus = values.status ?? false;
  const wantsResume = values.resume ?? false;
  const dryRun = values['dry-run'] ?? false;
  const excludeGlobs =
    values.exclude && values.exclude.length > 0
      ? values.exclude
      : ['**/*.pb.go', '**/*.pb.gw.go', '**/*.pulsar.go', '**/*.sum', '**/mocks/**', '**/swagger-ui/**'];

  if (wantsHelp) {
    console.log(`\
Usage: refork [option]... <fork_branch> <base_ref> <target_ref>
Example: refork Agoric v0.38.17 release/v0.38.x
Options:
  -h, --help     Show this help and exit
  --status       Show current refork status and exit
  --resume       Attempt to resume an in-progress merge before continuing
  --exclude      Glob of files to omit from diff-of-diffs inputs (repeatable;
                 defaults: '*.pb.go', '*.sum')
  -n, --dry-run  Print git commands without executing mutations`);
    return;
  }

  const [forkBranch, baseRef, targetRef] = positionals;
  if (!forkBranch || !baseRef || !targetRef) {
    console.log(`\
Usage: refork [--status] [--resume] [--dry-run] <fork_branch> <base_ref> <target_ref>
Example: refork Agoric v0.37.8 release/v0.37.x`);
    throw new Error('Invalid arguments');
  }

  const mergeFork = `merge-${forkBranch}/${targetRef}`;
  const diffUpstream = `diff-${baseRef}/${targetRef}`;
  const workspace = 'refork-workspace';
  const cwd = process.cwd();
  const workspaceDir = path.join(cwd, workspace);
  const diffUpstreamStatPath = path.join(workspaceDir, 'diff-upstream-stat.txt');
  const diffUpstreamPatchPath = path.join(workspaceDir, 'diff-upstream.patch');
  const forkBasePatchPath = path.join(workspaceDir, 'fork-base.patch');
  const diffMergeStatPath = path.join(workspaceDir, 'merge-fork-stat.txt');
  const diffMergePatchPath = path.join(workspaceDir, 'merge-fork.patch');
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
    const { stdout } = await git(argsList, options);
    return `${stdout ?? ''}`.trim();
  };
  const gitDiffWithExcludes = async (leftRef, rightRef) => {
    const pathspecArgs = excludeGlobs.map(glob => `:(exclude,glob)${glob}`);
    return gitStdout(['diff', leftRef, rightRef, '--', ...pathspecArgs]);
  };

  await null;
  if (dryRun) {
    console.warn(`[dry-run] Skipping create workspace dir ${workspaceDir}.`);
  } else {
    await mkdir(workspaceDir, { recursive: true });
  }

  const originalBranch = await gitStdout(['rev-parse', '--abbrev-ref', 'HEAD']);

  const ensureRef = async ref => {
    await null;
    try {
      await git(['rev-parse', '--verify', ref]);
    } catch (err) {
      throw new Error(`Git ref not found: ${ref}`);
    }
  };

  const branchExists = async ref => {
    await null;
    try {
      await git(['rev-parse', '--verify', ref]);
      return true;
    } catch (err) {
      return false;
    }
  };

  const hasMergeInProgress = async () => {
    await null;
    try {
      await git(['rev-parse', '-q', '--verify', 'MERGE_HEAD']);
      return true;
    } catch (err) {
      return false;
    }
  };

  await ensureRef(forkBranch);
  await ensureRef(baseRef);
  await ensureRef(targetRef);

  const normalizeDiffUpstream = async () => {
    const porcelain = await gitStdout([
      'diff',
      '--name-status',
      targetRef,
      diffUpstream,
    ]);
    if (!porcelain) {
      return [];
    }

    const updates = porcelain
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.split('\t'));

    for (const [status, fromPath, toPath] of updates) {
      const effectiveStatus = status.replace(/\d+/g, '');
      if (effectiveStatus === 'A') {
        await git(['rm', '-f', '--', fromPath]);
        continue;
      }
      if (effectiveStatus === 'D') {
        await git(['checkout', targetRef, '--', fromPath]);
        continue;
      }
      if (effectiveStatus === 'R') {
        if (toPath) {
          await git(['rm', '-f', '--', toPath]);
        }
        await git(['checkout', targetRef, '--', fromPath]);
        continue;
      }
      await git(['checkout', targetRef, '--', fromPath]);
    }

    const remaining = await gitStdout([
      'diff',
      '--name-status',
      targetRef,
      diffUpstream,
    ]);
    return remaining
      ? remaining
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)
      : [];
  };

  const promptForConflictResolution = async () => {
    await null;
    const rl = readline.createInterface({ input, output });
    try {
      while (true) {
        const conflicts = await gitStdout([
          'diff',
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

  const checkoutBranch = async (branch, base) => {
    const exists = await branchExists(branch);
    if (exists) {
      await git(['checkout', branch], { stdio: 'inherit' });
      return;
    }
    await git(['checkout', '-B', branch, base], { stdio: 'inherit' });
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

  const buildDiffOfDiffs = async () => {
    const { exitCode, stdout } = await $({
      cwd: workspaceDir,
      reject: false,
      stdio: ['inherit', 'pipe', 'inherit'],
    })`diff -u --label ${path.basename(forkBasePatchPath)} --label ${path.basename(diffMergePatchPath)} ${path.basename(forkBasePatchPath)} ${path.basename(diffMergePatchPath)}`;
    if (exitCode === 0) {
      return 'No diff.\n';
    }
    return `${stdout || 'No diff.\n'}${stdout?.endsWith('\n') ? '' : '\n'}`;
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
    if (dryRun) {
      return `${artifactPath} (size unavailable in dry-run)`;
    }
    const { size } = await stat(artifactPath);
    return `${artifactPath} (${formatFileSize(size)})`;
  };

  const collectWorkspaceState = async ({ currentBranch, mergeInProgress }) => {
    const diffUpstreamExists = await branchExists(diffUpstream);
    const mergeForkExists = await branchExists(mergeFork);

    const diffUpstreamStat = diffUpstreamExists
      ? await gitStdout(['diff', '--stat', targetRef, diffUpstream])
      : '';
    const diffUpstreamPatch = diffUpstreamExists
      ? await gitStdout(['diff', targetRef, diffUpstream])
      : '';
    const diffUpstreamFiles = diffUpstreamExists
      ? await gitStdout(['diff', '--name-only', targetRef, diffUpstream])
      : '';
    const remainingDiffUpstream =
      diffUpstreamExists && !mergeInProgress
        ? await gitStdout(['diff', '--name-status', targetRef, diffUpstream])
        : '';
    const forkBasePatch = await gitDiffWithExcludes(baseRef, forkBranch);

    const diffMergeStat = mergeForkExists
      ? await gitStdout(['diff', '--stat', forkBranch, mergeFork])
      : '';
    const diffMergePatch = mergeForkExists
      ? await gitDiffWithExcludes(targetRef, mergeFork)
      : '';
    const mergeFiles = mergeForkExists
      ? await gitStdout(['diff', '--name-only', forkBranch, mergeFork])
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
      const diffOfDiffs =
        diffUpstreamExists && mergeForkExists
          ? await buildDiffOfDiffs()
          : `Missing branch inputs for diff-of-diffs: ${[
              !diffUpstreamExists ? diffUpstream : null,
              !mergeForkExists ? mergeFork : null,
            ]
              .filter(Boolean)
              .join(', ')}\n`;
      await writeFile(diffOfDiffsPath, diffOfDiffs);
    }

    const artifactEntries = await Promise.all([
      describeArtifact(diffUpstreamStatPath),
      describeArtifact(diffUpstreamPatchPath),
      describeArtifact(forkBasePatchPath),
      describeArtifact(diffMergeStatPath),
      describeArtifact(diffMergePatchPath),
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
        diffUpstreamFiles ? diffUpstreamFiles.split('\n').filter(Boolean).length : 0
      }`,
      ...(diffUpstreamExists
        ? remainingEntries.length
          ? ['- Remaining entries:', ...remainingEntries.map(line => `  - ${line}`)]
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

    await normalizeDiffUpstream();

    await checkoutBranch(mergeFork, forkBranch);
    await mergeWithResume(diffUpstream);
    const currentBranch = await gitStdout(['rev-parse', '--abbrev-ref', 'HEAD']);
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

main({ args: process.argv.slice(2) }).catch(err => {
  console.error(err);
  process.exit(process.exitCode || 1);
});
