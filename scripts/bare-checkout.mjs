#!/usr/bin/env node
/// <reference types="node" />
// @ts-check

import { execFile as execFileCb, spawn } from 'node:child_process';
import {
  access,
  copyFile,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parseArgs, promisify } from 'node:util';

const execFile = promisify(execFileCb);

/**
 * @typedef {(...args: unknown[]) => void} Announce
 */

/**
 * @typedef {Object} Context
 * @property {Announce} [dryRun]
 * @property {Announce} announce
 */

/**
 * @typedef {Object} NormalizedArgs
 * @property {boolean} all
 * @property {string} bare
 * @property {string} checkout
 * @property {boolean} continue
 * @property {boolean} dryRun
 * @property {boolean} force
 * @property {boolean} help
 * @property {string} orig
 * @property {string[]} requestedWorktrees
 */

/**
 * @param {string} targetPath
 */
const resolvePath = targetPath => path.resolve(process.cwd(), targetPath);

/**
 * @param {string} targetPath
 */
const canonicalPath = async targetPath => {
  try {
    return await realpath(targetPath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return resolvePath(targetPath);
    }
    throw error;
  }
};

/**
 * @param {string} targetPath
 */
const pathExists = async targetPath => {
  try {
    await access(targetPath);
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
};

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string }} [options]
 */
const run = async (command, args, options = {}) => {
  const { stdout, stderr } = await execFile(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
  });
  return { stdout, stderr };
};

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string }} [options]
 */
const runInherited = async (command, args, options = {}) => {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', /** @param {number | null} code */ code => {
      if (code === 0) {
        resolve(undefined);
        return;
      }
      reject(new Error(`${command} exited with status ${code ?? 'unknown'}`));
    });
  });
};

/**
 * @param {string} checkoutPath
 */
const verifyCheckout = async checkoutPath => {
  const checkoutStat = await stat(checkoutPath).catch(() => null);
  if (!checkoutStat?.isDirectory()) {
    throw new Error(`checkout does not exist or is not a directory: ${checkoutPath}`);
  }

  const { stdout: bareStdout } = await run(
    'git',
    ['-C', checkoutPath, 'rev-parse', '--is-bare-repository'],
  );
  if (bareStdout.trim() !== 'false') {
    throw new Error(`checkout is bare, expected a non-bare checkout: ${checkoutPath}`);
  }

  const { stdout: workTreeStdout } = await run(
    'git',
    ['-C', checkoutPath, 'rev-parse', '--is-inside-work-tree'],
  );
  if (workTreeStdout.trim() !== 'true') {
    throw new Error(`checkout is not a Git work tree: ${checkoutPath}`);
  }

  const { stdout: gitDirStdout } = await run(
    'git',
    ['-C', checkoutPath, 'rev-parse', '--absolute-git-dir'],
  );
  const gitDirPath = gitDirStdout.trim();
  const gitDirStat = await stat(gitDirPath).catch(() => null);
  if (!gitDirStat?.isDirectory()) {
    throw new Error(`checkout has a non-directory git dir, unsupported by this script: ${gitDirPath}`);
  }
};

/**
 * @param {string} checkoutPath
 */
const getCurrentBranch = async checkoutPath => {
  const { stdout } = await run('git', [
    '-C',
    checkoutPath,
    'symbolic-ref',
    '--quiet',
    '--short',
    'HEAD',
  ]);
  const branchName = stdout.trim();
  if (!branchName) {
    throw new Error(`checkout is not on a branch: ${checkoutPath}`);
  }
  return branchName;
};

/**
 * @param {string} checkoutPath
 */
const getAbsoluteGitDir = async checkoutPath => {
  const { stdout } = await run('git', [
    '-C',
    checkoutPath,
    'rev-parse',
    '--absolute-git-dir',
  ]);
  return stdout.trim();
};

/**
 * @param {string} repoPath
 */
const verifyBareRepository = async repoPath => {
  const repoStat = await stat(repoPath).catch(() => null);
  if (!repoStat?.isDirectory()) {
    throw new Error(`bare repo does not exist or is not a directory: ${repoPath}`);
  }

  const { stdout: bareStdout } = await run(
    'git',
    [`--git-dir=${repoPath}`, 'rev-parse', '--is-bare-repository'],
  );
  if (bareStdout.trim() !== 'true') {
    throw new Error(`repo is not bare: ${repoPath}`);
  }
};

/**
 * @param {string} bare
 * @param {string} checkout
 */
const verifyBareCloneFromCheckout = async (bare, checkout) => {
  await verifyBareRepository(bare);

  const { stdout } = await run('git', [
    `--git-dir=${bare}`,
    'config',
    '--get',
    'remote.origin.url',
  ]);
  const remoteUrl = stdout.trim();
  if (!remoteUrl) {
    throw new Error(`bare repo does not record remote.origin.url: ${bare}`);
  }

  const resolvedRemote = path.isAbsolute(remoteUrl)
    ? remoteUrl
    : resolvePath(path.join(bare, remoteUrl));
  const [canonicalRemote, canonicalCheckout] = await Promise.all([
    canonicalPath(resolvedRemote),
    canonicalPath(checkout),
  ]);
  if (canonicalRemote !== canonicalCheckout) {
    throw new Error(
      `bare repo ${bare} was cloned from ${resolvedRemote}, not ${checkout}`,
    );
  }
};

/**
 * @param {string} worktreePath
 */
const getAbsoluteGitCommonDir = async worktreePath => {
  const { stdout } = await run('git', [
    '-C',
    worktreePath,
    'rev-parse',
    '--git-common-dir',
  ]);
  const gitCommonDir = stdout.trim();
  return path.isAbsolute(gitCommonDir)
    ? gitCommonDir
    : resolvePath(path.join(worktreePath, gitCommonDir));
};

/**
 * @param {string} checkoutPath
 */
const listWorktrees = async checkoutPath => {
  const { stdout } = await run('git', [
    '-C',
    checkoutPath,
    'worktree',
    'list',
    '--porcelain',
  ]);

  /** @type {{ path: string; branchName: string | null }[]} */
  const worktrees = [];
  for (const block of stdout.trim().split('\n\n')) {
    if (!block) {
      continue;
    }
    let worktreePath = '';
    let branchName = null;
    for (const line of block.split('\n')) {
      if (line.startsWith('worktree ')) {
        worktreePath = resolvePath(line.slice('worktree '.length));
      } else if (line.startsWith('branch refs/heads/')) {
        branchName = line.slice('branch refs/heads/'.length);
      }
    }
    if (worktreePath) {
      worktrees.push({ path: worktreePath, branchName });
    }
  }
  return worktrees;
};

/**
 * @param {string} checkoutGitDir
 * @param {string} worktreePath
 * @param {string | null} branchName
 */
const describeWorktree = async (checkoutGitDir, worktreePath, branchName) => {
  const commonDir = await getAbsoluteGitCommonDir(worktreePath);
  if (commonDir !== checkoutGitDir) {
    throw new Error(`${worktreePath} is not a worktree of ${checkoutGitDir}`);
  }

  const { stdout: adminDirStdout } = await run('git', [
    '-C',
    worktreePath,
    'rev-parse',
    '--absolute-git-dir',
  ]);
  const originalAdminDir = adminDirStdout.trim();
  const originalAdminDirStat = await stat(originalAdminDir).catch(() => null);
  if (!originalAdminDirStat?.isDirectory()) {
    throw new Error(`worktree has a non-directory git dir, unsupported: ${originalAdminDir}`);
  }

  return {
    path: worktreePath,
    branchName: branchName ?? (await getCurrentBranch(worktreePath)),
    originalAdminDir,
  };
};

/**
 * @param {string} rawArg
 * @param {{ path: string; branchName: string | null }[]} availableWorktrees
 * @param {string} checkoutPath
 */
const resolveRequestedWorktree = (rawArg, availableWorktrees, checkoutPath) => {
  const resolvedArg = resolvePath(rawArg);
  if (resolvedArg === checkoutPath) {
    throw new Error(`${rawArg} names the checkout itself, not an additional worktree`);
  }

  const byPath = availableWorktrees.find(worktree => worktree.path === resolvedArg);
  if (byPath) {
    return byPath;
  }

  const byBaseName = availableWorktrees.filter(
    worktree => path.basename(worktree.path) === rawArg && worktree.path !== checkoutPath,
  );
  if (byBaseName.length === 1) {
    return byBaseName[0];
  }
  if (byBaseName.length > 1) {
    throw new Error(`worktree name is ambiguous: ${rawArg}`);
  }

  throw new Error(`${rawArg} is not a worktree of ${checkoutPath}`);
};

/**
 * @param {string[]} args
 * @param {{
 *   all?: boolean;
 *   bare?: string;
 *   continue?: boolean;
 *   'dry-run'?: boolean;
 *   force?: boolean;
 *   help?: boolean;
 *   orig?: string;
 * }} options
 * @returns {NormalizedArgs}
 */
const normalizeArgs = (args, options) => {
  if (options.help) {
    return {
      all: false,
      bare: '',
      checkout: '',
      continue: false,
      dryRun: false,
      force: false,
      help: true,
      orig: '',
      requestedWorktrees: [],
    };
  }
  if (args.length === 0) {
    throw new Error('missing required <CHECKOUT> argument');
  }

  const checkout = resolvePath(args[0]);
  const requestedWorktrees = args.slice(1);
  if (options.all && requestedWorktrees.length > 0) {
    throw new Error('--all is incompatible with explicit <WORKTREE> arguments');
  }

  return {
    all: options.all ?? false,
    bare: resolvePath(options.bare ?? `${checkout}.bare`),
    checkout,
    continue: options.continue ?? false,
    dryRun: options['dry-run'] ?? false,
    force: options.force ?? false,
    help: false,
    orig: resolvePath(options.orig ?? `${checkout}.orig`),
    requestedWorktrees,
  };
};

const usage = `Usage: bare-checkout.mjs [options] <CHECKOUT> [<WORKTREE>...]

Converts a non-bare Git checkout into a linked worktree backed by a new bare repo.
Additional worktrees are migrated first, and the checkout itself is migrated last.

Options:
  --bare=<BARE-REPO>   default: <CHECKOUT>.bare
  -c, --continue       reuse an existing bare repo cloned from <CHECKOUT>
  --orig=<BACKUP>      default: <CHECKOUT>.orig
  -a, --all            migrate every linked worktree from git worktree list
  -f, --force          keep going when an additional worktree migration fails
  -n, --dry-run        print planned steps without changing the filesystem
  -h, --help           show this help`;

/**
 * @param {string} targetPath
 */
const copyIfExists = async targetPath => {
  try {
    await access(targetPath);
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
};

/**
 * @param {string} sourcePath
 * @param {string} destinationPath
 */
const copyFileIfExists = async (sourcePath, destinationPath) => {
  if (await copyIfExists(sourcePath)) {
    await copyFile(sourcePath, destinationPath);
  }
};

/**
 * @param {string} name
 */
const sanitizeName = name => name.replaceAll(/[^A-Za-z0-9._-]/g, '-');

/**
 * @param {Context} ctx
 * @param {string} bare
 * @param {string} worktreePath
 * @param {string} branchName
 * @param {string} placeholderPath
 */
const preparePlaceholderWorktree = async (
  ctx,
  bare,
  worktreePath,
  branchName,
  placeholderPath,
) => {
  ctx.announce(
    'Creating placeholder metadata for worktree',
    worktreePath,
    'on branch',
    branchName,
  );
  if (ctx.dryRun) return null;

  await runInherited('git', [
    `--git-dir=${bare}`,
    'worktree',
    'add',
    '--force',
    '--no-checkout',
    placeholderPath,
    branchName,
  ]);

  const tempGitFile = await readFile(path.join(placeholderPath, '.git'), 'utf8');
  const adminDir = tempGitFile.replace(/^gitdir:\s*/, '').trim();
  if (!adminDir) {
    throw new Error(`temporary worktree did not produce a .git file: ${placeholderPath}`);
  }
  return { adminDir, tempGitFile };
};

/**
 * @param {Context} ctx
 * @param {string} bare
 * @param {string} tempRoot
 * @param {{
 *   branchName: string;
 *   originalAdminDir: string;
 *   path: string;
 * }} worktree
 * @param {number} index
 */
const migrateLinkedWorktree = async (ctx, bare, tempRoot, worktree, index) => {
  ctx.announce('Migrating linked worktree', worktree.path);
  ctx.dryRun?.(
    'Would reattach',
    worktree.path,
    'to',
    bare,
    'on branch',
    worktree.branchName,
  );
  if (ctx.dryRun) return;

  const placeholderPath = path.join(
    tempRoot,
    `linked-${String(index).padStart(2, '0')}-${sanitizeName(path.basename(worktree.path))}`,
  );
  const gitFilePath = path.join(worktree.path, '.git');
  const originalGitFile = await readFile(gitFilePath, 'utf8');

  /** @type {{ adminDir: string; tempGitFile: string } | null} */
  let placeholder = null;
  try {
    placeholder = await preparePlaceholderWorktree(
      ctx,
      bare,
      worktree.path,
      worktree.branchName,
      placeholderPath,
    );
    if (!placeholder) {
      return;
    }

    await writeFile(gitFilePath, placeholder.tempGitFile);
    await writeFile(placeholder.adminDir + '/gitdir', `${gitFilePath}\n`);
    await copyFileIfExists(
      path.join(worktree.originalAdminDir, 'index'),
      path.join(placeholder.adminDir, 'index'),
    );
    await rm(placeholderPath, { recursive: true, force: true });
  } catch (error) {
    await writeFile(gitFilePath, originalGitFile).catch(() => undefined);
    if (placeholder) {
      await runInherited('git', [
        `--git-dir=${bare}`,
        'worktree',
        'remove',
        '--force',
        placeholderPath,
      ]).catch(() => undefined);
    }
    throw error;
  }
};

/**
 * @param {Context} ctx
 * @param {string} bare
 * @param {string} checkout
 * @param {string} tempRoot
 * @param {string} branchName
 */
const migrateCheckoutLast = async (ctx, bare, checkout, tempRoot, branchName) => {
  ctx.announce('Migrating checkout', checkout, 'last');
  ctx.dryRun?.(
    'Would reattach',
    checkout,
    'to',
    bare,
    'on branch',
    branchName,
  );
  if (ctx.dryRun) return;

  const originalGitDir = path.join(checkout, '.git');
  const stagedGitDir = path.join(checkout, '.git.bare-checkout-staged');
  const placeholderPath = path.join(tempRoot, 'checkout-main');

  let stagedGitDirExists = false;
  /** @type {{ adminDir: string; tempGitFile: string } | null} */
  let placeholder = null;
  try {
    ctx.announce(
      'Staging original git dir from',
      originalGitDir,
      'to',
      stagedGitDir,
    );
    await rename(originalGitDir, stagedGitDir);
    stagedGitDirExists = true;

    placeholder = await preparePlaceholderWorktree(
      ctx,
      bare,
      checkout,
      branchName,
      placeholderPath,
    );
    if (!placeholder) {
      return;
    }

    const gitFilePath = path.join(checkout, '.git');
    await writeFile(gitFilePath, placeholder.tempGitFile);
    await writeFile(placeholder.adminDir + '/gitdir', `${gitFilePath}\n`);
    await copyFileIfExists(
      path.join(stagedGitDir, 'index'),
      path.join(placeholder.adminDir, 'index'),
    );
    await rm(stagedGitDir, { recursive: true, force: true });
    stagedGitDirExists = false;
    await rm(placeholderPath, { recursive: true, force: true });
  } catch (error) {
    await rm(path.join(checkout, '.git'), { recursive: true, force: true }).catch(() => undefined);
    if (placeholder) {
      await runInherited('git', [
        `--git-dir=${bare}`,
        'worktree',
        'remove',
        '--force',
        placeholderPath,
      ]).catch(() => undefined);
    }
    if (stagedGitDirExists) {
      await rename(stagedGitDir, originalGitDir).catch(() => undefined);
    }
    throw error;
  }
};

const main = async () => {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      all: {
        short: 'a',
        type: 'boolean',
      },
      bare: {
        type: 'string',
      },
      continue: {
        short: 'c',
        type: 'boolean',
      },
      'dry-run': {
        short: 'n',
        type: 'boolean',
      },
      force: {
        short: 'f',
        type: 'boolean',
      },
      help: {
        short: 'h',
        type: 'boolean',
      },
      orig: {
        type: 'string',
      },
    },
    allowPositionals: true,
  });
  const parsed = normalizeArgs(positionals, values);
  if (parsed.help) {
    console.log(usage);
    return;
  }

  /** @type {Announce} */
  const log = (...args) => console.log(...args);
  /** @type {Announce | undefined} */
  const dryRunAnnounce = parsed.dryRun
    ? (...args) => log('[dry-run]', ...args)
    : undefined;
  /** @type {Context} */
  const ctx = {
    dryRun: dryRunAnnounce,
    announce: dryRunAnnounce || log,
  };
  const {
    all,
    bare,
    checkout,
    continue: shouldContinue,
    force,
    orig,
    requestedWorktrees = [],
  } = parsed;

  ctx.announce('Verifying checkout', checkout);
  await verifyCheckout(checkout);

  ctx.announce('Verifying backup path does not exist', orig);
  if (await pathExists(orig)) {
    throw new Error(`backup path already exists: ${orig}`);
  }

  ctx.announce('Checking bare repo path', bare);
  const bareExists = await pathExists(bare);
  if (shouldContinue) {
    if (!bareExists) {
      throw new Error(`'--continue' requires an existing bare repo path: ${bare}`);
    }
    ctx.announce('Verifying existing bare repo was cloned from', checkout);
    await verifyBareCloneFromCheckout(bare, checkout);
  } else if (bareExists) {
    throw new Error(`bare repo path already exists: ${bare}; maybe you meant to '--continue'?`);
  }

  const checkoutBranchName = await getCurrentBranch(checkout);
  const checkoutGitDir = await getAbsoluteGitDir(checkout);
  const availableWorktrees = await listWorktrees(checkout);
  const additionalWorktreeEntries = availableWorktrees.filter(
    worktree => worktree.path !== checkout,
  );

  /** @type {{ branchName: string; originalAdminDir: string; path: string }[]} */
  const worktreesToMigrate = [];
  if (all) {
    for (const worktree of additionalWorktreeEntries) {
      worktreesToMigrate.push(
        await describeWorktree(checkoutGitDir, worktree.path, worktree.branchName),
      );
    }
  } else {
    /** @type {Set<string>} */
    const seenPaths = new Set();
    for (const worktreeArg of requestedWorktrees) {
      try {
        const worktree = resolveRequestedWorktree(
          worktreeArg,
          availableWorktrees,
          checkout,
        );
        if (seenPaths.has(worktree.path)) {
          continue;
        }
        worktreesToMigrate.push(
          await describeWorktree(checkoutGitDir, worktree.path, worktree.branchName),
        );
        seenPaths.add(worktree.path);
      } catch (error) {
        if (!force) {
          throw error;
        }
        console.error('Skipping worktree after error:', error);
      }
    }
  }

  ctx.announce('Backing up', checkout, 'to', orig);
  if (!ctx.dryRun) {
    await runInherited('cp', ['-a', checkout, orig]);
  }

  if (shouldContinue) {
    ctx.announce('Reusing existing bare repo at', bare);
  } else {
    ctx.announce('Cloning bare repo from', checkout, 'to', bare);
    if (!ctx.dryRun) {
      await runInherited('git', ['clone', '--bare', checkout, bare]);
    }
  }

  const tempRoot = path.join(
    path.dirname(checkout),
    `.bare-checkout-tmp-${process.pid}-${Date.now()}`,
  );
  ctx.announce('Creating temporary workspace', tempRoot);
  ctx.dryRun || (await mkdir(tempRoot, { recursive: true }));

  try {
    for (const [index, worktree] of worktreesToMigrate.entries()) {
      try {
        await migrateLinkedWorktree(ctx, bare, tempRoot, worktree, index);
      } catch (error) {
        if (!force) {
          throw error;
        }
        console.error('Continuing after worktree migration error:', error);
      }
    }

    await migrateCheckoutLast(
      ctx,
      bare,
      checkout,
      tempRoot,
      checkoutBranchName,
    );
  } finally {
    ctx.announce('Removing temporary workspace', tempRoot);
    ctx.dryRun || (await rm(tempRoot, { recursive: true, force: true }));
  }

  console.log('Success!');
};

main().catch(error => {
  console.error('Failed with error:', error);
  process.exitCode ||= 1;
  process.exit();
});
