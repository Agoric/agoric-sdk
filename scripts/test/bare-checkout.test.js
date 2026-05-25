import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
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

/**
 * @param {string} text
 * @param {string} needle
 */
const countOccurrences = (text, needle) => text.split(needle).length - 1;

test('migrates a checkout to a bare repo and linked worktree', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');
  const bare = path.join(workspaceDir, 'repo.bare');

  try {
    await initRepo(repo);

    const { stdout } = await runScript([bare, '.'], { cwd: repo });

    assert.match(stdout, /Success!/);
    assert.equal((await stat(path.join(repo, '.git'))).isFile(), true);

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
  const bare = path.join(workspaceDir, 'repo.bare');

  try {
    await initRepo(repo);

    const { stdout } = await runScript(['--dry-run', bare, '.'], { cwd: repo });

    assert.match(stdout, /^\[dry-run\] Verifying current worktree/m);
    assert.match(stdout, /Would reattach .* at target main/);
    assert.equal(await pathExists(bare), false);
    assert.equal((await stat(path.join(repo, '.git'))).isDirectory(), true);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('migrates an explicit linked worktree before the checkout', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');
  const bare = path.join(workspaceDir, 'repo.bare');
  const worktreePath = path.join(workspaceDir, 'feature-tree');

  try {
    await initRepo(repo);
    await commitOnNewBranch(repo, 'feature', 'feature');
    await addWorktree(repo, worktreePath, 'feature');

    const { stdout } = await runScript([bare, path.basename(worktreePath), '.'], {
      cwd: repo,
    });

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
      bare,
      path.basename(worktreePath),
      '.',
    ], { cwd: repo });

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

test('continue all works from an already-converted linked worktree', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');
  const bare = path.join(workspaceDir, 'repo.bare');
  const featureWorktree = path.join(workspaceDir, 'feature-tree');

  try {
    await initRepo(repo);
    await commitOnNewBranch(repo, 'feature', 'feature');
    await addWorktree(repo, featureWorktree, 'feature');
    await runScript(['--all', bare], { cwd: repo });

    const { stdout } = await runScript(['--all', '--continue', bare], {
      cwd: featureWorktree,
    });

    assert.match(stdout, /Success!/);
    assert.match(stdout, new RegExp(`Verifying current worktree .*${path.basename(featureWorktree)}`));
    assert.doesNotMatch(stdout, new RegExp(`Using primary checkout .*${path.basename(bare)}`));
    assert.match(stdout, /Verifying existing bare repo matches current shared git dir/);
    assert.match(stdout, new RegExp(`Checking backup path .*${path.basename(featureWorktree)}\\.orig`));
    assert.match(stdout, new RegExp(`Migrating current worktree .*${path.basename(featureWorktree)} last`));

    const { stdout: worktreeStdout } = await run(
      'git',
      [`--git-dir=${bare}`, 'worktree', 'list'],
    );
    assert.match(worktreeStdout, /\[main\]/);
    assert.match(worktreeStdout, /\[feature\]/);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('continue all deduplicates existing registrations and does not create new ones', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');
  const bare = path.join(workspaceDir, 'repo.bare');
  const featureWorktree = path.join(workspaceDir, 'feature-tree');

  try {
    await initRepo(repo);
    await commitOnNewBranch(repo, 'feature', 'feature');
    await addWorktree(repo, featureWorktree, 'feature');
    await runScript(['--all', bare], { cwd: repo });

    const worktreesDir = path.join(bare, 'worktrees');
    const featureGitFile = await readFile(path.join(featureWorktree, '.git'), 'utf8');
    const featureAdminDir = featureGitFile.replace(/^gitdir:\s*/, '').trim();
    const adminDirName = path.basename(featureAdminDir);
    const duplicateAdminDir = path.join(worktreesDir, `${adminDirName}-dup`);
    await run('cp', ['-a', featureAdminDir, duplicateAdminDir]);
    await writeFile(path.join(featureWorktree, '.git'), `gitdir: ${duplicateAdminDir}\n`);

    const beforeEntries = (await readdir(worktreesDir, { withFileTypes: true })).filter(entry =>
      entry.isDirectory(),
    );
    assert.equal(beforeEntries.length, 3);

    const { stdout } = await runScript(['--all', '--continue', bare], {
      cwd: featureWorktree,
    });

    assert.match(stdout, /Success!/);
    assert.match(stdout, /Removing duplicate worktree registration/);
    assert.match(stdout, /Linked worktree is already attached to/);
    const gitFile = await readFile(path.join(featureWorktree, '.git'), 'utf8');
    assert.doesNotMatch(gitFile, /-dup\s*$/m);
    const resolvedAdminDir = gitFile.replace(/^gitdir:\s*/, '').trim();
    assert.equal((await stat(resolvedAdminDir)).isDirectory(), true);
    const afterEntries = (await readdir(worktreesDir, { withFileTypes: true })).filter(entry =>
      entry.isDirectory(),
    );
    assert.equal(afterEntries.length, 2);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('continue all repairs a corrupt current worktree before verification', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');
  const bare = path.join(workspaceDir, 'repo.bare');
  const featureWorktree = path.join(workspaceDir, 'feature-tree');

  try {
    await initRepo(repo);
    await commitOnNewBranch(repo, 'feature', 'feature');
    await addWorktree(repo, featureWorktree, 'feature');
    await runScript(['--all', bare], { cwd: repo });

    const worktreesDir = path.join(bare, 'worktrees');
    const featureGitFile = await readFile(path.join(featureWorktree, '.git'), 'utf8');
    const featureAdminDir = featureGitFile.replace(/^gitdir:\s*/, '').trim();
    const duplicateAdminDir = `${featureAdminDir}-dup`;
    await run('cp', ['-a', featureAdminDir, duplicateAdminDir]);
    await rm(duplicateAdminDir, { recursive: true, force: true });
    await writeFile(path.join(featureWorktree, '.git'), `gitdir: ${duplicateAdminDir}\n`);

    const { stdout } = await runScript(['--all', '--continue', bare], {
      cwd: featureWorktree,
    });

    assert.match(stdout, /Repairing corrupt worktree gitdir pointer/);
    assert.match(stdout, /Success!/);
    const repairedGitFile = await readFile(path.join(featureWorktree, '.git'), 'utf8');
    const repairedAdminDir = repairedGitFile.replace(/^gitdir:\s*/, '').trim();
    assert.equal((await stat(repairedAdminDir)).isDirectory(), true);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('continue all repairs corrupt sibling worktrees before metadata lookup', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');
  const bare = path.join(workspaceDir, 'repo.bare');
  const featureWorktree = path.join(workspaceDir, 'feature-tree');
  const topicWorktree = path.join(workspaceDir, 'topic-tree');

  try {
    await initRepo(repo);
    await commitOnNewBranch(repo, 'feature', 'feature');
    await commitOnNewBranch(repo, 'topic', 'topic');
    await addWorktree(repo, featureWorktree, 'feature');
    await addWorktree(repo, topicWorktree, 'topic');
    await runScript(['--all', bare], { cwd: repo });

    const topicGitFile = await readFile(path.join(topicWorktree, '.git'), 'utf8');
    const topicAdminDir = topicGitFile.replace(/^gitdir:\s*/, '').trim();
    const missingAdminDir = `${topicAdminDir}-missing`;
    await writeFile(path.join(topicWorktree, '.git'), `gitdir: ${missingAdminDir}\n`);

    const { stdout } = await runScript(['--all', '--continue', bare], {
      cwd: featureWorktree,
    });

    assert.match(stdout, new RegExp(`Repairing corrupt worktree gitdir pointer for .*${path.basename(topicWorktree)}`));
    assert.match(stdout, /Success!/);
    const repairedGitFile = await readFile(path.join(topicWorktree, '.git'), 'utf8');
    const repairedAdminDir = repairedGitFile.replace(/^gitdir:\s*/, '').trim();
    assert.equal((await stat(repairedAdminDir)).isDirectory(), true);
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
      runScript(['--continue', bare], { cwd: repo2 }),
      /** @param {NodeJS.ErrnoException & { stderr?: string }} error */ error => {
        assert.match(String(error.stderr), /was cloned from .*repo1, not .*repo2/);
        return true;
      },
    );
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('does not migrate the checkout unless explicitly requested', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');
  const bare = path.join(workspaceDir, 'repo.bare');

  try {
    await initRepo(repo);

    const { stdout } = await runScript([bare], { cwd: repo });

    assert.match(stdout, /Success!/);
    assert.equal((await stat(path.join(repo, '.git'))).isDirectory(), true);
    const { stdout: worktreeStdout } = await run(
      'git',
      [`--git-dir=${bare}`, 'worktree', 'list'],
    );
    assert.doesNotMatch(worktreeStdout, /\[main\]/);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('all migrates linked worktrees and the checkout last', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');
  const bare = path.join(workspaceDir, 'repo.bare');
  const worktreePath = path.join(workspaceDir, 'feature-tree');

  try {
    await initRepo(repo);
    await commitOnNewBranch(repo, 'feature', 'feature');
    await addWorktree(repo, worktreePath, 'feature');

    const { stdout } = await runScript(['--all', bare], { cwd: repo });

    const linkedIndex = stdout.indexOf('Migrating linked worktree');
    const checkoutIndex = stdout.indexOf('Migrating checkout');
    assert.notEqual(linkedIndex, -1);
    assert.notEqual(checkoutIndex, -1);
    assert.ok(linkedIndex < checkoutIndex);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('dry-run all works when run from a linked worktree checkout', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');
  const bare = path.join(workspaceDir, 'repo.bare');
  const featureWorktree = path.join(workspaceDir, 'feature-tree');
  const topicWorktree = path.join(workspaceDir, 'topic-tree');

  try {
    await initRepo(repo);
    await commitOnNewBranch(repo, 'feature', 'feature');
    await commitOnNewBranch(repo, 'topic', 'topic');
    await addWorktree(repo, featureWorktree, 'feature');
    await addWorktree(repo, topicWorktree, 'topic');

    const { stdout } = await runScript(['--dry-run', '--all', bare], {
      cwd: featureWorktree,
    });

    assert.match(stdout, /Success!/);
    assert.match(stdout, new RegExp(`Verifying current worktree .*${path.basename(featureWorktree)}`));
    assert.match(stdout, new RegExp(`Using primary checkout .*${path.basename(repo)}`));
    assert.match(stdout, new RegExp(`Checking backup path .*${path.basename(repo)}\\.orig`));
    assert.match(stdout, new RegExp(`Backing up .*${path.basename(repo)} to .*${path.basename(repo)}\\.orig`));
    assert.match(stdout, new RegExp(`Migrating linked worktree .*${path.basename(featureWorktree)}`));
    assert.match(stdout, new RegExp(`Migrating linked worktree .*${path.basename(topicWorktree)}`));
    assert.match(stdout, new RegExp(`Migrating checkout .*${path.basename(repo)} last`));
    assert.equal(await pathExists(bare), false);
    assert.equal((await stat(path.join(featureWorktree, '.git'))).isFile(), true);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('all migrates successfully when run from a linked worktree checkout', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');
  const bare = path.join(workspaceDir, 'repo.bare');
  const featureWorktree = path.join(workspaceDir, 'feature-tree');
  const topicWorktree = path.join(workspaceDir, 'topic-tree');

  try {
    await initRepo(repo);
    await commitOnNewBranch(repo, 'feature', 'feature');
    await commitOnNewBranch(repo, 'topic', 'topic');
    await addWorktree(repo, featureWorktree, 'feature');
    await addWorktree(repo, topicWorktree, 'topic');

    const { stdout } = await runScript(['--all', bare], {
      cwd: featureWorktree,
    });

    assert.match(stdout, /Success!/);
    assert.match(stdout, new RegExp(`Verifying current worktree .*${path.basename(featureWorktree)}`));
    assert.match(stdout, new RegExp(`Using primary checkout .*${path.basename(repo)}`));
    assert.match(stdout, new RegExp(`Backing up .*${path.basename(repo)} to .*${path.basename(repo)}\\.orig`));
    assert.match(stdout, new RegExp(`Migrating linked worktree .*${path.basename(featureWorktree)}`));
    assert.match(stdout, new RegExp(`Migrating linked worktree .*${path.basename(topicWorktree)}`));
    assert.match(stdout, new RegExp(`Migrating checkout .*${path.basename(repo)} last`));
    assert.equal((await stat(path.join(repo, '.git'))).isFile(), true);
    assert.equal((await stat(path.join(featureWorktree, '.git'))).isFile(), true);
    assert.equal((await stat(path.join(topicWorktree, '.git'))).isFile(), true);

    const { stdout: worktreeStdout } = await run(
      'git',
      [`--git-dir=${bare}`, 'worktree', 'list'],
    );
    assert.match(worktreeStdout, /\[main\]/);
    assert.match(worktreeStdout, /\[feature\]/);
    assert.match(worktreeStdout, /\[topic\]/);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('continue mode creates a backup copy when it is missing', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');
  const bare = path.join(workspaceDir, 'repo.bare');

  try {
    await initRepo(repo);
    await run('git', ['clone', '--bare', repo, bare]);

    await runScript(['--continue', bare, '.'], { cwd: repo });

    assert.equal(await pathExists(path.join(workspaceDir, 'repo.orig')), true);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('continue mode accepts --orig and creates that backup when it is missing', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');
  const bare = path.join(workspaceDir, 'repo.bare');
  const backup = path.join(workspaceDir, 'backup');

  try {
    await initRepo(repo);
    await run('git', ['clone', '--bare', repo, bare]);

    const { stdout } = await runScript(['--continue', `--orig=${backup}`, bare], { cwd: repo });

    assert.match(stdout, /Success!/);
    assert.equal(await pathExists(backup), true);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('reuses an existing backup copy instead of failing', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');
  const bare = path.join(workspaceDir, 'repo.bare');
  const backup = path.join(workspaceDir, 'repo.orig');

  try {
    await initRepo(repo);
    await run('cp', ['-a', repo, backup]);

    const { stdout } = await runScript([bare, '.'], { cwd: repo });

    assert.match(stdout, /Success!/);
    assert.match(stdout, new RegExp(`Reusing existing backup at .*${path.basename(backup)}`));
    assert.equal((await stat(path.join(repo, '.git'))).isFile(), true);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('dry-run all with force migrates detached-head worktrees at their commit', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');
  const bare = path.join(workspaceDir, 'repo.bare');
  const featureWorktree = path.join(workspaceDir, 'feature-tree');
  const detachedWorktree = path.join(workspaceDir, 'detached-tree');

  try {
    await initRepo(repo);
    await commitOnNewBranch(repo, 'feature', 'feature');
    await commitOnNewBranch(repo, 'topic', 'topic');
    await addWorktree(repo, featureWorktree, 'feature');
    await addWorktree(repo, detachedWorktree, 'topic');
    await run('git', ['checkout', 'HEAD~0'], { cwd: detachedWorktree });

    const { stdout, stderr } = await runScript(['--dry-run', '--all', '--force', bare], {
      cwd: featureWorktree,
    });

    assert.match(stdout, /Success!/);
    assert.match(stdout, /Migrating linked worktree/);
    assert.match(stdout, new RegExp(path.basename(featureWorktree)));
    assert.match(stdout, new RegExp(path.basename(repo)));
    assert.match(stdout, new RegExp(path.basename(detachedWorktree)));
    assert.match(stdout, /Would reattach .*detached-tree.* at target [0-9a-f]{40}/);
    assert.equal(stderr, '');
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test('dry-run all migrates detached-head worktrees without force', async () => {
  const workspaceDir = await makeWorkspace('bare-checkout-test-');
  const repo = path.join(workspaceDir, 'repo');
  const bare = path.join(workspaceDir, 'repo.bare');
  const featureWorktree = path.join(workspaceDir, 'feature-tree');
  const detachedWorktree = path.join(workspaceDir, 'detached-tree');

  try {
    await initRepo(repo);
    await commitOnNewBranch(repo, 'feature', 'feature');
    await commitOnNewBranch(repo, 'topic', 'topic');
    await addWorktree(repo, featureWorktree, 'feature');
    await addWorktree(repo, detachedWorktree, 'topic');
    await run('git', ['checkout', 'HEAD~0'], { cwd: detachedWorktree });

    const { stdout, stderr } = await runScript(['--dry-run', '--all', bare], {
      cwd: featureWorktree,
    });

    assert.match(stdout, /Success!/);
    assert.match(stdout, /Migrating linked worktree/);
    assert.match(stdout, new RegExp(path.basename(featureWorktree)));
    assert.match(stdout, new RegExp(path.basename(repo)));
    assert.match(stdout, new RegExp(path.basename(detachedWorktree)));
    assert.match(stdout, /Would reattach .*detached-tree.* at target [0-9a-f]{40}/);
    assert.equal(stderr, '');
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});
