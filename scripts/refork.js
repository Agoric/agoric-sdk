#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
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
    },
    allowPositionals: true,
  });
  const wantsHelp = values.help ?? false;
  const wantsStatus = values.status ?? false;
  const wantsResume = values.resume ?? false;
  const dryRun = values['dry-run'] ?? false;

  if (wantsHelp) {
    console.log(`\
Usage: refork [option]... <fork_branch> <base_ref> <target_ref>
Example: refork Agoric v0.38.17 release/v0.38.x
Options:
  -h, --help     Show this help and exit
  --status       Show current refork status and exit
  --resume       Attempt to resume an in-progress merge before continuing
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

  const mergeWithResume = async ref => {
    const mergeInProgress = await hasMergeInProgress();
    if (mergeInProgress) {
      await promptForConflictResolution();
      await continueMergeIfNeeded();
      return;
    }
    try {
      await git(['merge', '--no-edit', ref], { stdio: 'inherit' });
    } catch (err) {
      await promptForConflictResolution();
      await continueMergeIfNeeded();
    }
  };

  let remainingDiffUpstream = [];
  try {
    if (wantsStatus) {
      const currentBranch = await gitStdout([
        'rev-parse',
        '--abbrev-ref',
        'HEAD',
      ]);
      const mergeInProgress = await hasMergeInProgress();
      const diffUpstreamExists = await branchExists(diffUpstream);
      const mergeForkExists = await branchExists(mergeFork);
      const statusLines = [
        '# Refork status',
        '',
        `- Current branch: ${currentBranch}`,
        `- Merge in progress: ${mergeInProgress ? 'yes' : 'no'}`,
        `- diffUpstream branch exists: ${diffUpstreamExists ? 'yes' : 'no'}`,
        `- mergeFork branch exists: ${mergeForkExists ? 'yes' : 'no'}`,
      ];
      console.log(statusLines.join('\n'));
      return;
    }

    if (wantsResume && (await hasMergeInProgress())) {
      await continueMergeIfNeeded();
    }

    await checkoutBranch(diffUpstream, baseRef);
    await mergeWithResume(targetRef);

    remainingDiffUpstream = await normalizeDiffUpstream();

    await checkoutBranch(mergeFork, forkBranch);
    await mergeWithResume(diffUpstream);

    const diffUpstreamStat = await gitStdout([
      'diff',
      '--stat',
      targetRef,
      diffUpstream,
    ]);
    const diffMergeStat = await gitStdout([
      'diff',
      '--stat',
      forkBranch,
      mergeFork,
    ]);
    const diffMergePatch = await gitStdout(['diff', forkBranch, mergeFork]);

    const diffUpstreamPath = path.join(workspaceDir, 'diff-upstream-stat.txt');
    const diffMergeStatPath = path.join(workspaceDir, 'merge-fork-stat.txt');
    const diffMergePatchPath = path.join(workspaceDir, 'merge-fork.patch');

    if (dryRun) {
      console.warn('[dry-run] Skipping write of diff/merge artifacts.');
    } else {
      await writeFile(diffUpstreamPath, diffUpstreamStat || 'No diff.\n');
      await writeFile(diffMergeStatPath, diffMergeStat || 'No diff.\n');
      await writeFile(diffMergePatchPath, diffMergePatch || 'No diff.\n');
    }

    const diffUpstreamFiles = await gitStdout([
      'diff',
      '--name-only',
      targetRef,
      diffUpstream,
    ]);
    const mergeFiles = await gitStdout([
      'diff',
      '--name-only',
      forkBranch,
      mergeFork,
    ]);
    const reportLines = [
      '# Refork report',
      '',
      `- Fork branch: ${forkBranch}`,
      `- Base ref: ${baseRef}`,
      `- Target ref: ${targetRef}`,
      `- diffUpstream branch: ${diffUpstream}`,
      `- mergeFork branch: ${mergeFork}`,
      '',
      '## DiffUpstream normalization',
      `- Remaining diffs vs target: ${
        diffUpstreamFiles
          ? diffUpstreamFiles.split('\n').filter(Boolean).length
          : 0
      }`,
      ...(remainingDiffUpstream.length
        ? [
            '- Remaining entries:',
            ...remainingDiffUpstream.map(line => `  - ${line}`),
          ]
        : ['- Remaining entries: none']),
      '',
      '## Merge results',
      `- Files changed vs fork branch: ${
        mergeFiles ? mergeFiles.split('\n').filter(Boolean).length : 0
      }`,
      '',
      '## Workspace artifacts',
      `- ${diffUpstreamPath}`,
      `- ${diffMergeStatPath}`,
      `- ${diffMergePatchPath}`,
      '',
    ];

    const report = reportLines.join('\n');
    const reportPath = path.join(workspaceDir, 'report.md');
    if (dryRun) {
      console.warn(`[dry-run] Skipping write of ${reportPath}.`);
    } else {
      await writeFile(reportPath, report);
    }
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
