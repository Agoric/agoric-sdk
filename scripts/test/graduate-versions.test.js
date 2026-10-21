import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile as execFileCb } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'graduate-versions.mjs');

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd: string, reject?: boolean }} options
 */
const run = async (command, args, { cwd, reject = true }) => {
  try {
    const result = await execFile(command, args, {
      cwd,
      encoding: 'utf8',
    });
    return { ...result, status: 0 };
  } catch (error) {
    if (reject) {
      throw error;
    }
    const failed =
      /** @type {{ stdout?: string, stderr?: string, code?: number }} */ (
        error
      );
    return {
      stdout: failed.stdout ?? '',
      stderr: failed.stderr ?? '',
      status: failed.code ?? 1,
    };
  }
};

/**
 * @param {string} repo
 * @param {string[]} args
 * @param {{ reject?: boolean }} [options]
 */
const runGraduate = (repo, args, options = {}) =>
  run(process.execPath, [scriptPath, ...args], {
    cwd: repo,
    reject: options.reject,
  });

/**
 * @param {string} repo
 * @param {string} location
 * @param {{ name: string, version: string, private?: boolean }} pkg
 */
const writePackage = async (repo, location, pkg) => {
  const dir = path.join(repo, location);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, 'package.json'),
    `${JSON.stringify(pkg, null, 2)}\n`,
  );
};

/**
 * @param {string} repo
 * @param {string} location
 * @param {string} version
 */
const setPackageVersion = async (repo, location, version) => {
  const packageJsonPath = path.join(repo, location, 'package.json');
  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  pkg.version = version;
  await writeFile(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
};

/**
 * @param {string} repo
 * @param {string} location
 */
const getPackageVersion = async (repo, location) => {
  const pkg = JSON.parse(
    await readFile(path.join(repo, location, 'package.json'), 'utf8'),
  );
  return pkg.version;
};

/**
 * @param {{ [location: string]: { name: string, version: string, private?: boolean } }} packages
 */
const makeRepo = async packages => {
  const repo = await mkdtemp(path.join(os.tmpdir(), 'graduate-versions-test-'));
  await run('git', ['init'], { cwd: repo });
  await run('git', ['branch', '-M', 'main'], { cwd: repo });
  await run('git', ['config', 'user.email', 'test@example.com'], {
    cwd: repo,
  });
  await run('git', ['config', 'user.name', 'Test User'], { cwd: repo });

  await writeFile(
    path.join(repo, 'package.json'),
    `${JSON.stringify(
      {
        name: 'test-root',
        private: true,
        workspaces: ['packages/*'],
      },
      null,
      2,
    )}\n`,
  );
  for (const [location, pkg] of Object.entries(packages)) {
    await writePackage(repo, location, pkg);
  }
  await run('npm', ['install', '--ignore-scripts'], { cwd: repo });
  await run('git', ['add', 'package.json', 'package-lock.json', 'packages'], {
    cwd: repo,
  });
  await run('git', ['commit', '-m', 'initial'], { cwd: repo });
  return repo;
};

/**
 * @param {string} repo
 * @param {{ [location: string]: string }} versions
 * @param {string} [branch]
 */
const createReleaseBranch = async (repo, versions, branch = 'release') => {
  const { stdout } = await run('git', ['branch', '--show-current'], {
    cwd: repo,
  });
  const originalBranch = stdout.trim();
  await run('git', ['switch', '-c', branch], { cwd: repo });
  for (const [location, version] of Object.entries(versions)) {
    await setPackageVersion(repo, location, version);
  }
  await run('git', ['add', 'packages'], { cwd: repo });
  await run('git', ['commit', '-m', `${branch} versions`], { cwd: repo });
  await run('git', ['switch', originalBranch], { cwd: repo });
  return branch;
};

/**
 * @param {string} repo
 */
const listTags = async repo => {
  const { stdout } = await run('git', ['tag', '--list'], { cwd: repo });
  return stdout.trim().split('\n').filter(Boolean);
};

/**
 * @param {string} repo
 * @param {string} tag
 */
const tagTarget = async (repo, tag) => {
  const { stdout } = await run('git', ['rev-parse', tag], { cwd: repo });
  return stdout.trim();
};

/**
 * @param {string} repo
 * @param {string} remotePath
 * @param {string} tag
 */
const remoteTagTarget = async (repo, remotePath, tag) => {
  const { stdout } = await run(
    'git',
    [`--git-dir=${remotePath}`, 'rev-parse', `refs/tags/${tag}`],
    { cwd: repo },
  );
  return stdout.trim();
};

void test('graduates release-branch prerelease versions and stops before tagging', async () => {
  const repo = await makeRepo({
    'packages/a': { name: '@scope/a', version: '1.2.0-u0.0' },
  });
  try {
    await createReleaseBranch(repo, {
      'packages/a': '1.2.3-u23.0',
    });

    await runGraduate(repo, ['patch', 'release']);

    assert.equal(await getPackageVersion(repo, 'packages/a'), '1.2.3');
    assert.deepEqual(await listTags(repo), []);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

void test('patch increments non-prerelease versions', async () => {
  const repo = await makeRepo({
    'packages/a': { name: 'pkg-a', version: '1.2.3' },
  });
  try {
    await runGraduate(repo, ['patch']);

    assert.equal(await getPackageVersion(repo, 'packages/a'), '1.2.4');
    assert.deepEqual(await listTags(repo), []);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

void test('prerelease increments like yarn version prerelease', async () => {
  const repo = await makeRepo({
    'packages/a': { name: 'pkg-a', version: '1.2.3-u1.0' },
    'packages/b': { name: 'pkg-b', version: '1.2.3' },
  });
  try {
    await runGraduate(repo, ['prerelease']);

    assert.equal(await getPackageVersion(repo, 'packages/a'), '1.2.3-u1.1');
    assert.equal(await getPackageVersion(repo, 'packages/b'), '1.2.4-0');
    assert.deepEqual(await listTags(repo), []);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

void test('--preid sets or increments the prepatch prerelease identifier', async () => {
  const repo = await makeRepo({
    'packages/a': { name: 'pkg-a', version: '1.0.5-u23.2' },
    'packages/b': { name: 'pkg-b', version: '1.0.5-pre.0' },
  });
  try {
    await runGraduate(repo, ['--preid=pre', 'prepatch']);

    assert.equal(await getPackageVersion(repo, 'packages/a'), '1.0.5-pre.0');
    assert.equal(await getPackageVersion(repo, 'packages/b'), '1.0.5-pre.1');
    assert.deepEqual(await listTags(repo), []);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

void test('--preid sets or increments the prerelease identifier', async () => {
  const repo = await makeRepo({
    'packages/a': { name: 'pkg-a', version: '1.0.5-u23.2' },
    'packages/b': { name: 'pkg-b', version: '1.0.5-pre.0' },
    'packages/c': { name: 'pkg-c', version: '1.0.5' },
  });
  try {
    await runGraduate(repo, ['--preid=pre', 'prerelease']);

    assert.equal(await getPackageVersion(repo, 'packages/a'), '1.0.5-pre.0');
    assert.equal(await getPackageVersion(repo, 'packages/b'), '1.0.5-pre.1');
    assert.equal(await getPackageVersion(repo, 'packages/c'), '1.0.6-pre.0');
    assert.deepEqual(await listTags(repo), []);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

void test('requires a bump strategy', async () => {
  const repo = await makeRepo({
    'packages/a': { name: 'pkg-a', version: '1.2.3' },
  });
  try {
    const failed = await runGraduate(repo, [], { reject: false });

    assert.notEqual(failed.status, 0);
    assert.match(failed.stderr, /missing required <BUMP>/);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

void test('keeps the greater current semver-core version', async () => {
  const repo = await makeRepo({
    'packages/a': { name: 'pkg-a', version: '2.0.0-u0.0' },
  });
  try {
    await createReleaseBranch(repo, {
      'packages/a': '1.9.9-u23.0',
    });

    await runGraduate(repo, ['patch', 'release']);

    assert.equal(await getPackageVersion(repo, 'packages/a'), '2.0.0');
    assert.deepEqual(await listTags(repo), []);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

void test('creates tags when no package rewrite is needed', async () => {
  const repo = await makeRepo({
    'packages/a': { name: '@scope/a', version: '1.2.3' },
    'packages/b': { name: 'pkg-b', version: '0.1.0' },
  });
  try {
    await runGraduate(repo, ['decline']);

    assert.deepEqual(await listTags(repo), ['@scope/a@1.2.3', 'pkg-b@0.1.0']);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

void test('--dry-run changes neither files nor tags', async () => {
  const repo = await makeRepo({
    'packages/a': { name: 'pkg-a', version: '1.2.3-u1.0' },
  });
  try {
    const { stdout } = await runGraduate(repo, ['--dry-run', 'patch']);

    assert.match(stdout, /\[dry-run\] Updating packages\/a\/package\.json/);
    assert.equal(await getPackageVersion(repo, 'packages/a'), '1.2.3-u1.0');
    assert.deepEqual(await listTags(repo), []);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

void test('existing tags fail normally and are replaced with --force', async () => {
  const repo = await makeRepo({
    'packages/a': { name: 'pkg-a', version: '1.0.0' },
  });
  try {
    await run('git', ['tag', 'pkg-a@1.0.0'], { cwd: repo });
    const oldTarget = await tagTarget(repo, 'pkg-a@1.0.0');
    await writeFile(path.join(repo, 'README.md'), 'new commit\n');
    await run('git', ['add', 'README.md'], { cwd: repo });
    await run('git', ['commit', '-m', 'advance'], { cwd: repo });
    const newTarget = (
      await run('git', ['rev-parse', 'HEAD'], { cwd: repo })
    ).stdout.trim();

    const failed = await runGraduate(repo, ['decline'], { reject: false });
    assert.notEqual(failed.status, 0);
    assert.equal(await tagTarget(repo, 'pkg-a@1.0.0'), oldTarget);

    await runGraduate(repo, ['--force', 'decline']);
    assert.equal(await tagTarget(repo, 'pkg-a@1.0.0'), newTarget);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

void test('--push defaults to origin', async () => {
  const repo = await makeRepo({
    'packages/a': { name: 'pkg-a', version: '1.0.0' },
  });
  try {
    const remote = path.join(repo, 'origin.git');
    await run('git', ['init', '--bare', remote], { cwd: repo });
    await run('git', ['remote', 'add', 'origin', remote], { cwd: repo });
    const head = (
      await run('git', ['rev-parse', 'HEAD'], { cwd: repo })
    ).stdout.trim();

    await runGraduate(repo, ['--push', 'decline']);

    assert.equal(await remoteTagTarget(repo, remote, 'pkg-a@1.0.0'), head);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

void test('--force --push=<REMOTE> force-pushes tag refs', async () => {
  const repo = await makeRepo({
    'packages/a': { name: 'pkg-a', version: '1.0.0' },
  });
  try {
    const remote = path.join(repo, 'upstream.git');
    await run('git', ['init', '--bare', remote], { cwd: repo });
    await run('git', ['remote', 'add', 'upstream', remote], { cwd: repo });
    await run('git', ['tag', 'pkg-a@1.0.0'], { cwd: repo });
    await run('git', ['push', 'upstream', 'pkg-a@1.0.0'], { cwd: repo });
    await writeFile(path.join(repo, 'README.md'), 'new commit\n');
    await run('git', ['add', 'README.md'], { cwd: repo });
    await run('git', ['commit', '-m', 'advance'], { cwd: repo });
    const head = (
      await run('git', ['rev-parse', 'HEAD'], { cwd: repo })
    ).stdout.trim();

    await runGraduate(repo, ['--force', '--push=upstream', 'decline']);

    assert.equal(await remoteTagTarget(repo, remote, 'pkg-a@1.0.0'), head);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});
