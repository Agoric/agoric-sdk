#!/usr/bin/env node
/// <reference types="node" />
// @ts-check

import { execFile as execFileCb, spawn } from 'node:child_process';
import {
  access,
  copyFile,
  mkdir,
  readdir,
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
 * @property {boolean} continue
 * @property {boolean} dryRun
 * @property {boolean} force
 * @property {boolean} help
 * @property {string | undefined} orig
 * @property {string[]} requestedWorktrees
 */

/**
 * @typedef {Object} WorktreeEntry
 * @property {boolean} bare
 * @property {string} path
 * @property {string | null} target
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
 * @param {string} worktreePath
 */
const getWorktreeTarget = async worktreePath => {
  try {
    const { stdout } = await run('git', [
      '-C',
      worktreePath,
      'symbolic-ref',
      '--quiet',
      '--short',
      'HEAD',
    ]);
    const branchName = stdout.trim();
    if (branchName) {
      return branchName;
    }
  } catch {
    // Fall through to the detached HEAD case.
  }

  const { stdout } = await run('git', ['-C', worktreePath, 'rev-parse', 'HEAD']);
  const commitHash = stdout.trim();
  if (!commitHash) {
    throw new Error(`could not determine HEAD target for worktree: ${worktreePath}`);
  }
  return commitHash;
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
 * @param {string} worktreePath
 */
const listWorktrees = async worktreePath => {
  const { stdout } = await run('git', [
    '-C',
    worktreePath,
    'worktree',
    'list',
    '--porcelain',
  ]);

  /** @type {Map<string, WorktreeEntry>} */
  const worktrees = new Map();
  for (const block of stdout.trim().split('\n\n')) {
    if (!block) {
      continue;
    }
    let worktreePath = '';
    let bare = false;
    let target = null;
    for (const line of block.split('\n')) {
      if (line.startsWith('worktree ')) {
        worktreePath = resolvePath(line.slice('worktree '.length));
      } else if (line === 'bare') {
        bare = true;
      } else if (line.startsWith('branch refs/heads/')) {
        target = line.slice('branch refs/heads/'.length);
      } else if (line.startsWith('HEAD ')) {
        target ||= line.slice('HEAD '.length);
      }
    }
    if (worktreePath) {
      const existing = worktrees.get(worktreePath);
      if (existing) {
        existing.bare ||= bare;
        existing.target ||= target;
      } else {
        worktrees.set(worktreePath, { bare, path: worktreePath, target });
      }
    }
  }
  return [...worktrees.values()];
};

/**
 * @param {string} checkoutCommonDir
 * @param {WorktreeEntry[]} availableWorktrees
 */
const findPrimaryCheckout = async (checkoutCommonDir, availableWorktrees) => {
  for (const worktree of availableWorktrees) {
    if (worktree.bare) {
      continue;
    }
    const gitDir = await getAbsoluteGitDir(worktree.path);
    if (gitDir === checkoutCommonDir) {
      return worktree.path;
    }
  }
  return undefined;
};

/**
 * @param {string} checkoutCommonDir
 * @param {string} worktreePath
 * @param {string | null} target
 */
const describeWorktree = async (checkoutCommonDir, worktreePath, target) => {
  const commonDir = await getAbsoluteGitCommonDir(worktreePath);
  if (commonDir !== checkoutCommonDir) {
    throw new Error(`${worktreePath} is not a worktree of ${checkoutCommonDir}`);
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
    target: target ?? (await getWorktreeTarget(worktreePath)),
    originalAdminDir,
  };
};

/**
 * @param {string} rawArg
 * @param {WorktreeEntry[]} availableWorktrees
 * @param {string} checkoutPath
 */
const resolveRequestedWorktree = (rawArg, availableWorktrees, checkoutPath) => {
  const resolvedArg = resolvePath(rawArg);
  const byPath = availableWorktrees.find(
    worktree => !worktree.bare && worktree.path === resolvedArg,
  );
  if (byPath) {
    return byPath;
  }

  const byBaseName = availableWorktrees.filter(
    worktree =>
      !worktree.bare &&
      path.basename(worktree.path) === rawArg &&
      worktree.path !== checkoutPath,
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
      continue: false,
      dryRun: false,
      force: false,
      help: true,
      orig: undefined,
      requestedWorktrees: [],
    };
  }
  if (args.length === 0) {
    throw new Error('missing required <BARE-REPO> argument');
  }

  const bare = resolvePath(args[0]);
  const requestedWorktrees = args.slice(1);
  if (options.all && requestedWorktrees.length > 0) {
    throw new Error("'--all' is incompatible with explicit <WORKTREE> arguments");
  }

  return {
    all: options.all ?? false,
    bare,
    continue: options.continue ?? false,
    dryRun: options['dry-run'] ?? false,
    force: options.force ?? false,
    help: false,
    orig: options.orig ? resolvePath(options.orig) : undefined,
    requestedWorktrees,
  };
};

const usage = `Usage: bare-checkout.mjs [options] <BARE-REPO> [<WORKTREE>...]

Converts the current working directory Git checkout into worktrees backed by a bare repo.
Only explicitly requested worktrees are migrated; the primary checkout is migrated only if
it is explicitly requested or when '--all' is used, in which case it is migrated last.

Options:
  -c, --continue       reuse an existing bare repo cloned from the primary checkout
  --orig=<BACKUP>      default: <CHECKOUT>.orig
  -a, --all            migrate every linked worktree from git worktree list, then the primary checkout
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
 * @param {string} worktreePath
 */
const readGitFileAdminDir = async worktreePath => {
  const gitFilePath = path.join(worktreePath, '.git');
  const gitFile = (await readFile(gitFilePath, 'utf8').catch(() => '')).trim();
  if (!gitFile.startsWith('gitdir:')) {
    return undefined;
  }
  return gitFile.replace(/^gitdir:\s*/, '').trim();
};

/**
 * @param {string} bare
 * @param {string} worktreePath
 */
const getWorktreeAdminDirs = async (bare, worktreePath) => {
  const worktreesDir = path.join(bare, 'worktrees');
  const entries = await readdir(worktreesDir, { withFileTypes: true }).catch(error => {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  });
  const canonicalWorktree = await canonicalPath(worktreePath);
  /** @type {string[]} */
  const matchingAdminDirs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const adminDir = path.join(worktreesDir, entry.name);
    const gitdirPath = path.join(adminDir, 'gitdir');
    const gitFilePath = (await readFile(gitdirPath, 'utf8').catch(() => '')).trim();
    if (!gitFilePath) {
      continue;
    }
    const registeredWorktree = await canonicalPath(path.dirname(gitFilePath)).catch(() => undefined);
    if (registeredWorktree === canonicalWorktree) {
      matchingAdminDirs.push(adminDir);
    }
  }
  return matchingAdminDirs;
};

/**
 * @param {Context} ctx
 * @param {string} bare
 * @param {string} worktreePath
 */
const dedupeWorktreeRegistrations = async (ctx, bare, worktreePath) => {
  const adminDirs = await getWorktreeAdminDirs(bare, worktreePath);
  const gitFilePath = path.join(worktreePath, '.git');
  const currentGitFile = (await readFile(gitFilePath, 'utf8').catch(() => '')).trim();
  const currentAdminDir = currentGitFile.replace(/^gitdir:\s*/, '').trim();

  let canonicalCurrentAdminDir;
  if (currentAdminDir) {
    canonicalCurrentAdminDir = await canonicalPath(currentAdminDir).catch(() => undefined);
  }

  let keptAdminDir = adminDirs[0];
  if (canonicalCurrentAdminDir) {
    keptAdminDir =
      adminDirs.find(adminDir => adminDir === canonicalCurrentAdminDir) ?? keptAdminDir;
  }

  if (keptAdminDir) {
    ctx.announce('Refreshing worktree gitdir pointer to', keptAdminDir, 'for', worktreePath);
    ctx.dryRun ||
      (await writeFile(gitFilePath, `gitdir: ${keptAdminDir}\n`));
    ctx.dryRun ||
      (await writeFile(path.join(keptAdminDir, 'gitdir'), `${gitFilePath}\n`));
  }

  if (adminDirs.length <= 1) {
    return;
  }

  const duplicates = adminDirs.filter(adminDir => adminDir !== keptAdminDir);
  for (const duplicate of duplicates) {
    ctx.announce('Removing duplicate worktree registration', duplicate, 'for', worktreePath);
    ctx.dryRun || (await rm(duplicate, { recursive: true, force: true }));
  }
};

/**
 * @param {string} bare
 * @param {string} worktreePath
 */
const isAttachedToBare = async (bare, worktreePath) => {
  const [canonicalBare, canonicalCommonDir] = await Promise.all([
    canonicalPath(bare),
    canonicalPath(await getAbsoluteGitCommonDir(worktreePath)),
  ]);
  return canonicalBare === canonicalCommonDir;
};

/**
 * @param {Context} ctx
 * @param {string} bare
 * @param {string} worktreePath
 */
const repairCorruptWorktreeIfNeeded = async (ctx, bare, worktreePath) => {
  const gitFilePath = path.join(worktreePath, '.git');
  const gitFileStat = await stat(gitFilePath).catch(() => null);
  if (!gitFileStat?.isFile()) {
    return;
  }
  const adminDir = await readGitFileAdminDir(worktreePath);
  if (!adminDir) {
    return;
  }
  const adminDirStat = await stat(adminDir).catch(() => null);
  if (adminDirStat?.isDirectory()) {
    return;
  }
  if (!(await pathExists(bare))) {
    return;
  }
  ctx.announce(
    'Repairing corrupt worktree gitdir pointer for',
    worktreePath,
    'using',
    bare,
  );
  await dedupeWorktreeRegistrations(ctx, bare, worktreePath);
};

/**
 * @param {Context} ctx
 * @param {string} bare
 * @param {WorktreeEntry[]} availableWorktrees
 */
const repairCorruptWorktreesIfNeeded = async (ctx, bare, availableWorktrees) => {
  for (const worktree of availableWorktrees) {
    if (worktree.bare) {
      continue;
    }
    await repairCorruptWorktreeIfNeeded(ctx, bare, worktree.path);
  }
};

/**
 * @param {Context} ctx
 * @param {string} bare
 * @param {string} worktreePath
 * @param {string} target
 * @param {string} placeholderPath
 */
const preparePlaceholderWorktree = async (
  ctx,
  bare,
  worktreePath,
  target,
  placeholderPath,
) => {
  ctx.announce(
    'Creating placeholder metadata for worktree',
    worktreePath,
    'at target',
    target,
  );
  if (ctx.dryRun) return null;

  await runInherited('git', [
    `--git-dir=${bare}`,
    'worktree',
    'add',
    '--force',
    '--no-checkout',
    placeholderPath,
    target,
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
 *   originalAdminDir: string;
 *   path: string;
 *   target: string;
 * }} worktree
 * @param {number} index
 */
const migrateLinkedWorktree = async (ctx, bare, tempRoot, worktree, index) => {
  ctx.announce('Migrating linked worktree', worktree.path);
  if (await isAttachedToBare(bare, worktree.path)) {
    ctx.announce('Linked worktree is already attached to', bare);
    await dedupeWorktreeRegistrations(ctx, bare, worktree.path);
    return;
  }
  ctx.dryRun?.(
    'Would reattach',
    worktree.path,
    'to',
    bare,
    'at target',
    worktree.target,
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
      worktree.target,
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
 * @param {string} target
 */
const migrateCheckoutLast = async (ctx, bare, checkout, tempRoot, target) => {
  ctx.announce('Migrating checkout', checkout, 'last');
  if (await isAttachedToBare(bare, checkout)) {
    ctx.announce('Checkout is already attached to', bare);
    await dedupeWorktreeRegistrations(ctx, bare, checkout);
    return;
  }
  ctx.dryRun?.(
    'Would reattach',
    checkout,
    'to',
    bare,
    'at target',
    target,
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
      target,
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

/**
 * @param {Context} ctx
 * @param {string} bare
 * @param {string} tempRoot
 * @param {{
 *   originalAdminDir: string;
 *   path: string;
 *   target: string;
 * }} worktree
 * @param {number} index
 */
const migrateCurrentWorktreeLast = async (ctx, bare, tempRoot, worktree, index) => {
  ctx.announce('Migrating current worktree', worktree.path, 'last');
  await migrateLinkedWorktree(ctx, bare, tempRoot, worktree, index);
};

const main = async () => {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      all: {
        short: 'a',
        type: 'boolean',
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
    continue: shouldContinue,
    force,
    orig: explicitOrig,
    requestedWorktrees = [],
  } = parsed;
  const invocationPath = resolvePath(process.cwd());

  await repairCorruptWorktreeIfNeeded(ctx, bare, invocationPath);
  ctx.announce('Verifying current worktree', invocationPath);
  await verifyCheckout(invocationPath);

  const checkoutCommonDir = await getAbsoluteGitCommonDir(invocationPath);
  const availableWorktrees = await listWorktrees(invocationPath);
  await repairCorruptWorktreesIfNeeded(ctx, bare, availableWorktrees);
  const primaryCheckout = await findPrimaryCheckout(checkoutCommonDir, availableWorktrees);
  if (primaryCheckout && primaryCheckout !== invocationPath) {
    ctx.announce('Using primary checkout', primaryCheckout);
  }
  const checkout = primaryCheckout ?? invocationPath;
  const orig = explicitOrig ?? `${checkout}.orig`;

  ctx.announce('Checking backup path', orig);
  const backupExists = await pathExists(orig);

  ctx.announce('Checking bare repo path', bare);
  const bareExists = await pathExists(bare);
  if (shouldContinue) {
    if (!bareExists) {
      throw new Error(`'--continue' requires an existing bare repo path: ${bare}`);
    }
    const [canonicalBare, canonicalCommonDir] = await Promise.all([
      canonicalPath(bare),
      canonicalPath(checkoutCommonDir),
    ]);
    if (canonicalBare === canonicalCommonDir) {
      ctx.announce('Verifying existing bare repo matches current shared git dir');
    } else {
      ctx.announce('Verifying existing bare repo was cloned from', checkout);
      await verifyBareCloneFromCheckout(bare, checkout);
    }
  } else if (bareExists) {
    throw new Error(`bare repo path already exists: ${bare}; maybe you meant to '--continue'?`);
  }

  const checkoutTarget = await getWorktreeTarget(checkout);
  const additionalWorktreeEntries = availableWorktrees.filter(
    worktree => !worktree.bare && worktree.path !== checkout,
  );

  /** @type {{ originalAdminDir: string; path: string; target: string }[]} */
  const worktreesToMigrate = [];
  let migrateCheckout = false;
  /** @type {{ originalAdminDir: string; path: string; target: string } | null} */
  let currentWorktreeToMigrate = null;
  if (all) {
    for (const worktree of additionalWorktreeEntries) {
      try {
        worktreesToMigrate.push(
          await describeWorktree(
            checkoutCommonDir,
            worktree.path,
            worktree.target,
          ),
        );
      } catch (error) {
        if (!force) {
          throw error;
        }
        console.error('Skipping worktree after error:', error);
      }
    }
    if (primaryCheckout) {
      migrateCheckout = true;
    } else {
      currentWorktreeToMigrate = await describeWorktree(
        checkoutCommonDir,
        checkout,
        checkoutTarget,
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
        if (worktree.path === checkout) {
          if (primaryCheckout) {
            migrateCheckout = true;
          } else {
            currentWorktreeToMigrate = await describeWorktree(
              checkoutCommonDir,
              worktree.path,
              worktree.target,
            );
          }
        } else {
          worktreesToMigrate.push(
            await describeWorktree(
              checkoutCommonDir,
              worktree.path,
              worktree.target,
            ),
          );
        }
        seenPaths.add(worktree.path);
      } catch (error) {
        if (!force) {
          throw error;
        }
        console.error('Skipping worktree after error:', error);
      }
    }
  }

  if (!backupExists) {
    ctx.announce('Backing up', checkout, 'to', orig);
    if (!ctx.dryRun) {
      await runInherited('cp', ['-a', checkout, orig]);
    }
  } else {
    ctx.announce('Reusing existing backup at', orig);
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

    if (migrateCheckout) {
      await migrateCheckoutLast(
        ctx,
        bare,
        checkout,
        tempRoot,
        checkoutTarget,
      );
    } else if (currentWorktreeToMigrate) {
      await migrateCurrentWorktreeLast(
        ctx,
        bare,
        tempRoot,
        currentWorktreeToMigrate,
        worktreesToMigrate.length,
      );
    }
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
