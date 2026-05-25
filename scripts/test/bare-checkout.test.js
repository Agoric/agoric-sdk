import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);

const scriptPath = path.resolve('scripts/bare-checkout.mjs');

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string }} [options]
 */
const run = async (command, args, options = {}) =>
  execFile(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
  });

/**
 * @param {string[]} args
 * @param {{ cwd?: string }} [options]
 */
const runScript = async (args, options = {}) =>
  run(process.execPath, [scriptPath, ...args], options);

/**
 * @param {string} dir
 * @param {string} filename
 * @param {string} contents
 * @param {string} message
 */
const commitFile = async (dir, filename, contents, message) => {
  await writeFile(path.join(dir, filename), contents);
  await run('git', ['add', filename], { cwd: dir });
  await run(
    'git',
    [
      '-c',
      'user.name=Test User',
      '-c',
      'user.email=test@example.com',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '-m',
      message,
    ],
    { cwd: dir },
  );
};

/**
 * @param {string} dir
 */
const initRepo = async dir => {
  await mkdir(dir, { recursive: true });
  await run('git', ['init', '-b', 'main'], { cwd: dir });
  await commitFile(dir, 'hello.txt', 'hello\n', 'init');
};

/**
 * @param {string} dir
 * @param {string} branch
 * @param {string} message
 */
const commitOnNewBranch = async (dir, branch, message) => {
  await run('git', ['checkout', '-b', branch], { cwd: dir });
  await commitFile(dir, `${branch}.txt`, `${branch}\n`, message);
  await run('git', ['checkout', 'main'], { cwd: dir });
};

/**
 * @param {string} repo
 * @param {string} worktreePath
 * @param {string} branch
 */
const addWorktree = async (repo, worktreePath, branch) => {
  await run('git', ['worktree', 'add', worktreePath, branch], { cwd: repo });
};

/**
 * @param {string} prefix
 */
const makeWorkspace = async prefix => mkdtemp(path.join(os.tmpdir(), prefix));

/**
 * @param {string} targetPath
 */
const pathExists = async targetPath => {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
};

test('migrates a checkout to a bare repo and linked worktree', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');

  try {
    await initRepo(repo);

    const { stdout } = await runScript([repo]);

    assert.match(stdout, /Success!/);
    assert.equal((await stat(path.join(repo, '.git'))).isFile(), true);

    const bare = `${repo}.bare`;
    const { stdout: statusStdout } = await run('git', ['status', '--short', '--branch'], {
      cwd: repo,
    });
    assert.equal(statusStdout.trim(), '## main');

    const { stdout: worktreeStdout } = await run(
      'git',
      [`--git-dir=${bare}`, 'worktree', 'list'],
    );
    assert.match(worktreeStdout, new RegExp(`${bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(bare\\)`));
    assert.match(worktreeStdout, /\[main\]/);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('dry-run reports actions without changing the checkout', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');

  try {
    await initRepo(repo);

    const { stdout } = await runScript(['--dry-run', repo]);

    assert.match(stdout, /^\[dry-run\] Verifying checkout/m);
    assert.match(stdout, /Would reattach .* on branch main/);
    assert.equal(await pathExists(`${repo}.bare`), false);
    assert.equal((await stat(path.join(repo, '.git'))).isDirectory(), true);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('migrates an explicit linked worktree before the checkout', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');
  const worktreePath = path.join(workspaceDir, 'feature-tree');

  try {
    await initRepo(repo);
    await commitOnNewBranch(repo, 'feature', 'feature');
    await addWorktree(repo, worktreePath, 'feature');

    const { stdout } = await runScript([repo, path.basename(worktreePath)]);

    const linkedIndex = stdout.indexOf('Migrating linked worktree');
    const checkoutIndex = stdout.indexOf('Migrating checkout');
    assert.notEqual(linkedIndex, -1);
    assert.notEqual(checkoutIndex, -1);
    assert.ok(linkedIndex < checkoutIndex);

    const { stdout: featureStatus } = await run('git', ['status', '--short', '--branch'], {
      cwd: worktreePath,
    });
    assert.equal(featureStatus.trim(), '## feature');
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('continue mode reuses an existing bare clone', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');
  const bare = path.join(workspaceDir, 'repo.bare');
  const worktreePath = path.join(workspaceDir, 'feature-tree');

  try {
    await initRepo(repo);
    await commitOnNewBranch(repo, 'feature', 'feature');
    await run('git', ['clone', '--bare', repo, bare]);
    await addWorktree(repo, worktreePath, 'feature');

    const { stdout } = await runScript([
      '--continue',
      `--bare=${bare}`,
      repo,
      path.basename(worktreePath),
    ]);

    assert.match(stdout, /Reusing existing bare repo at/);
    assert.match(stdout, /Success!/);
    const { stdout: worktreeStdout } = await run(
      'git',
      [`--git-dir=${bare}`, 'worktree', 'list'],
    );
    assert.match(worktreeStdout, /\[feature\]/);
    assert.match(worktreeStdout, /\[main\]/);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('continue mode rejects a bare repo cloned from a different checkout', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo1 = path.join(workspaceDir, 'repo1');
  const repo2 = path.join(workspaceDir, 'repo2');
  const bare = path.join(workspaceDir, 'shared.bare');

  try {
    await initRepo(repo1);
    await initRepo(repo2);
    await run('git', ['clone', '--bare', repo1, bare]);

    await assert.rejects(
      runScript(['--continue', `--bare=${bare}`, repo2]),
      error => {
        assert.match(String(error.stderr), /was cloned from .*repo1, not .*repo2/);
        return true;
      },
    );
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});
