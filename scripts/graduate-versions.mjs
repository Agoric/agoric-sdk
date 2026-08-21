#!/usr/bin/env node
/// <reference types="node" />
// @ts-check

import { execFile as execFileCb, spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parseArgs, promisify } from 'node:util';

const execFile = promisify(execFileCb);

/**
 * @typedef {(...args: unknown[]) => void} Announce
 */

/**
 * @typedef {object} Context
 * @property {Announce} [dryRun]
 * @property {Announce} announce
 */

/**
 * @typedef {object} NormalizedArgs
 * @property {string} bump
 * @property {boolean} dryRun
 * @property {boolean} force
 * @property {boolean} help
 * @property {string | undefined} preid
 * @property {string | undefined} pushRemote
 * @property {string | undefined} releaseBranch
 */

/**
 * @typedef {object} PackageJson
 * @property {string} name
 * @property {string} version
 */

/**
 * @typedef {object} PackagePlan
 * @property {string} location
 * @property {string} packageJsonPath
 * @property {string} packageJsonRepoPath
 * @property {PackageJson} packageJson
 * @property {string} text
 * @property {string} desiredVersion
 */

const usage = `Usage: graduate-versions.mjs [options] <BUMP> [<RELEASE-BRANCH>]

Graduates workspace package versions from prerelease versions to release versions,
then creates package-version tags once no package.json rewrite is needed.

<BUMP> follows the same strategy names as "yarn version <strategy>":
  major, minor, patch, premajor, preminor, prepatch, prerelease, decline,
  or an explicit semver version.

Options:
  -f, --force         continue across package failures and replace existing tags
  -n, --dry-run       print planned changes without mutating files or Git state
  --preid=<ID>        prerelease identifier for pre* and prerelease bumps
  --push[=<REMOTE>]   push created tags; defaults to origin when REMOTE is omitted
  -h, --help          show this help`;

/**
 * @param {unknown} error
 */
const errorMessage = error => {
  if (error && typeof error === 'object') {
    const maybeError = /** @type {{ message?: unknown, stderr?: unknown }} */ (
      error
    );
    const stderr =
      typeof maybeError.stderr === 'string' ? maybeError.stderr.trim() : '';
    const message =
      typeof maybeError.message === 'string'
        ? maybeError.message
        : String(error);
    return stderr ? `${message}: ${stderr}` : message;
  }
  return String(error);
};

/**
 * @param {string[]} argv
 */
const normalizePushArgv = argv =>
  argv.map(arg => (arg === '--push' ? '--push=origin' : arg));

/**
 * @param {string[]} args
 * @param {{
 *   bump?: boolean;
 *   'dry-run'?: boolean;
 *   force?: boolean;
 *   help?: boolean;
 *   preid?: string;
 *   push?: string;
 * }} options
 * @returns {NormalizedArgs}
 */
const normalizeArgs = (args, options) => {
  if (options.help) {
    return {
      bump: 'decline',
      dryRun: false,
      force: false,
      help: true,
      preid: undefined,
      pushRemote: undefined,
      releaseBranch: undefined,
    };
  }
  if (options.bump) {
    throw new Error('--bump has been replaced by required positional <BUMP>');
  }
  if (args.length < 1) {
    throw new Error('missing required <BUMP> positional argument');
  }
  if (args.length > 2) {
    throw new Error('too many positional arguments');
  }
  if (options.push === '') {
    throw new Error('--push remote must not be empty');
  }
  if (options.preid === '') {
    throw new Error('--preid must not be empty');
  }

  return {
    bump: args[0],
    dryRun: options['dry-run'] ?? false,
    force: options.force ?? false,
    help: false,
    preid: options.preid,
    pushRemote: options.push,
    releaseBranch: args[1],
  };
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
    child.once(
      'exit',
      /** @param {number | null} code */ code => {
        if (code === 0) {
          resolve(undefined);
          return;
        }
        reject(new Error(`${command} exited with status ${code ?? 'unknown'}`));
      },
    );
  });
};

/**
 * @param {string} location
 */
const packageJsonRepoPath = location =>
  path.posix.join(
    location.split(path.sep).join(path.posix.sep),
    'package.json',
  );

/**
 * @param {string} source
 * @param {string} text
 * @returns {PackageJson}
 */
const parsePackageJson = (source, text) => {
  const packageJson = JSON.parse(text);
  if (
    !packageJson ||
    typeof packageJson !== 'object' ||
    typeof packageJson.name !== 'string' ||
    typeof packageJson.version !== 'string'
  ) {
    throw new Error(`${source} must have string name and version properties`);
  }
  return {
    name: packageJson.name,
    version: packageJson.version,
  };
};

/**
 * @typedef {object} Semver
 * @property {number} major
 * @property {number} minor
 * @property {number} patch
 * @property {string[]} prerelease
 */

/**
 * @param {string} version
 * @returns {Semver}
 */
const parseSemver = version => {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?$/.exec(version);
  if (!match) {
    throw new Error(`unsupported semver version: ${version}`);
  }
  const [, major, minor, patch, prerelease = ''] = match;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: prerelease ? prerelease.split('.') : [],
  };
};

/**
 * @param {Semver} version
 */
const formatSemver = version =>
  `${version.major}.${version.minor}.${version.patch}${
    version.prerelease.length > 0 ? `-${version.prerelease.join('.')}` : ''
  }`;

/**
 * @param {string[]} prerelease
 * @param {string | undefined} preid
 */
const incrementPrerelease = (prerelease, preid = undefined) => {
  if (preid) {
    if (prerelease[0] === preid) {
      return [preid, ...incrementPrerelease(prerelease.slice(1))];
    }
    return [preid, '0'];
  }
  if (prerelease.length === 0) {
    return ['0'];
  }
  const next = [...prerelease];
  const last = next.at(-1);
  if (last && /^\d+$/.test(last)) {
    next[next.length - 1] = `${Number(last) + 1}`;
  } else {
    next.push('0');
  }
  return next;
};

/**
 * @param {string} version
 * @param {string} bump
 * @param {string | undefined} [preid]
 */
const nextVersion = (version, bump, preid) => {
  if (/^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?$/.test(bump)) {
    return formatSemver(parseSemver(bump));
  }

  const current = parseSemver(version);
  const hasPrerelease = current.prerelease.length > 0;
  switch (bump) {
    case 'decline':
      return version;
    case 'major':
      return formatSemver({
        major: current.major + 1,
        minor: 0,
        patch: 0,
        prerelease: [],
      });
    case 'minor':
      return formatSemver({
        major: current.major,
        minor: current.minor + 1,
        patch: 0,
        prerelease: [],
      });
    case 'patch':
      return formatSemver({
        ...current,
        patch: hasPrerelease ? current.patch : current.patch + 1,
        prerelease: [],
      });
    case 'premajor':
      return formatSemver({
        major: current.major + 1,
        minor: 0,
        patch: 0,
        prerelease: incrementPrerelease([], preid),
      });
    case 'preminor':
      return formatSemver({
        major: current.major,
        minor: current.minor + 1,
        patch: 0,
        prerelease: incrementPrerelease([], preid),
      });
    case 'prepatch':
      return formatSemver({
        ...current,
        patch: hasPrerelease ? current.patch : current.patch + 1,
        prerelease: incrementPrerelease(current.prerelease, preid),
      });
    case 'prerelease':
      return formatSemver({
        ...current,
        patch: hasPrerelease ? current.patch : current.patch + 1,
        prerelease: incrementPrerelease(current.prerelease, preid),
      });
    default:
      throw new Error(`unsupported yarn version strategy: ${bump}`);
  }
};

/**
 * @param {string} left
 * @param {string} right
 */
const compareSemver = (left, right) => {
  const leftVersion = parseSemver(left);
  const rightVersion = parseSemver(right);
  for (const key of /** @type {const} */ (['major', 'minor', 'patch'])) {
    if (leftVersion[key] > rightVersion[key]) return 1;
    if (leftVersion[key] < rightVersion[key]) return -1;
  }
  if (leftVersion.prerelease.length === 0 && rightVersion.prerelease.length) {
    return 1;
  }
  if (leftVersion.prerelease.length && rightVersion.prerelease.length === 0) {
    return -1;
  }
  for (
    let i = 0;
    i < Math.max(leftVersion.prerelease.length, rightVersion.prerelease.length);
    i += 1
  ) {
    const leftPart = leftVersion.prerelease[i];
    const rightPart = rightVersion.prerelease[i];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    const leftNumeric = /^\d+$/.test(leftPart);
    const rightNumeric = /^\d+$/.test(rightPart);
    if (leftNumeric && rightNumeric) {
      const leftNumber = Number(leftPart);
      const rightNumber = Number(rightPart);
      if (leftNumber > rightNumber) return 1;
      if (leftNumber < rightNumber) return -1;
    } else if (leftNumeric !== rightNumeric) {
      return leftNumeric ? -1 : 1;
    } else if (leftPart > rightPart) {
      return 1;
    } else if (leftPart < rightPart) {
      return -1;
    }
  }
  return 0;
};

/**
 * @param {string} left
 * @param {string} right
 */
const greaterSemver = (left, right) => {
  if (compareSemver(left, right) >= 0) return left;
  return right;
};

/**
 * @param {string} text
 * @param {string} oldVersion
 * @param {string} newVersion
 * @param {string} source
 */
const replaceVersionProperty = (text, oldVersion, newVersion, source) => {
  const packageJson = JSON.parse(text);
  if (
    !packageJson ||
    typeof packageJson !== 'object' ||
    typeof packageJson.version !== 'string'
  ) {
    throw new Error(`${source} must have a string version property`);
  }
  if (packageJson.version !== oldVersion) {
    throw new Error(
      `${source} planned version ${oldVersion}, but parsed ${packageJson.version}`,
    );
  }
  packageJson.version = newVersion;
  return `${JSON.stringify(packageJson, undefined, 2)}\n`;
};

const listWorkspaceLocations = async () => {
  const { stdout } = await run('npm', ['query', '.workspace']);
  const workspaces = JSON.parse(stdout);
  if (!Array.isArray(workspaces)) {
    throw new Error('npm query .workspace did not return an array');
  }
  const locations = workspaces.map(workspace => {
    if (!workspace || typeof workspace.location !== 'string') {
      throw new Error('workspace entry is missing a string location');
    }
    return workspace.location;
  });
  if (locations.length === 0) {
    throw new Error('no npm workspaces found; has npm install been run?');
  }
  return locations;
};

/**
 * @param {string} location
 * @param {NormalizedArgs} args
 * @returns {Promise<PackagePlan>}
 */
const planPackage = async (location, args) => {
  const packageJsonPath = path.join(location, 'package.json');
  const packageJsonRepo = packageJsonRepoPath(location);
  const text = await readFile(packageJsonPath, 'utf8');
  const packageJson = parsePackageJson(packageJsonPath, text);
  let desiredVersion = nextVersion(packageJson.version, args.bump, args.preid);

  if (args.releaseBranch) {
    const { stdout: releasedText } = await run('git', [
      'show',
      `${args.releaseBranch}:${packageJsonRepo}`,
    ]);
    const releasedPackageJson = parsePackageJson(
      `${args.releaseBranch}:${packageJsonRepo}`,
      releasedText,
    );
    if (releasedPackageJson.name !== packageJson.name) {
      throw new Error(
        `${packageJsonRepo} package name changed from ${releasedPackageJson.name} to ${packageJson.name}`,
      );
    }
    desiredVersion = greaterSemver(
      desiredVersion,
      nextVersion(releasedPackageJson.version, args.bump, args.preid),
    );
  }

  return {
    location,
    packageJsonPath,
    packageJsonRepoPath: packageJsonRepo,
    packageJson,
    text,
    desiredVersion,
  };
};

/**
 * @param {{ location: string, error: unknown }[]} failures
 * @param {string} phase
 */
const throwFailures = (failures, phase) => {
  if (failures.length === 0) {
    return;
  }
  throw new Error(
    `${phase} failed for ${failures.length} item(s):\n${failures
      .map(({ location, error }) => `- ${location}: ${errorMessage(error)}`)
      .join('\n')}`,
  );
};

/**
 * @param {Context} ctx
 * @param {PackagePlan[]} packages
 */
const rewritePackages = async (ctx, packages) => {
  for (const pkg of packages) {
    const { packageJson, packageJsonPath, text, desiredVersion } = pkg;
    ctx.announce(
      'Updating',
      packageJsonPath,
      'from',
      packageJson.version,
      'to',
      desiredVersion,
    );
    if (!ctx.dryRun) {
      await writeFile(
        packageJsonPath,
        replaceVersionProperty(
          text,
          packageJson.version,
          desiredVersion,
          packageJsonPath,
        ),
      );
    }
  }
};

/**
 * @param {Context} ctx
 * @param {PackagePlan[]} packages
 * @param {boolean} force
 */
const createTags = async (ctx, packages, force) => {
  /** @type {string[]} */
  const tags = [];
  /** @type {{ location: string, error: unknown }[]} */
  const failures = [];
  for (const pkg of packages) {
    const tag = `${pkg.packageJson.name}@${pkg.packageJson.version}`;
    tags.push(tag);
    ctx.announce('Tagging', tag);
    if (ctx.dryRun) {
      continue;
    }
    try {
      await runInherited('git', ['tag', ...(force ? ['-f'] : []), tag]);
    } catch (error) {
      if (!force) {
        throw error;
      }
      failures.push({ location: pkg.location, error });
    }
  }
  throwFailures(failures, 'tagging');
  return tags;
};

/**
 * @param {Context} ctx
 * @param {string[]} tags
 * @param {string | undefined} remote
 * @param {boolean} force
 */
const pushTags = async (ctx, tags, remote, force) => {
  if (!remote) {
    return;
  }
  const refspecs = force
    ? tags.map(tag => `+refs/tags/${tag}:refs/tags/${tag}`)
    : tags;
  ctx.announce('Pushing', tags.length, 'tag(s) to', remote);
  if (!ctx.dryRun) {
    await runInherited('git', ['push', remote, ...refspecs]);
  }
};

const main = async () => {
  const { values, positionals } = parseArgs({
    args: normalizePushArgv(process.argv.slice(2)),
    options: {
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
      preid: {
        type: 'string',
      },
      push: {
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

  const locations = await listWorkspaceLocations();
  /** @type {PackagePlan[]} */
  const packages = [];
  /** @type {{ location: string, error: unknown }[]} */
  const failures = [];
  for (const location of locations) {
    try {
      packages.push(await planPackage(location, parsed));
    } catch (error) {
      if (!parsed.force) {
        throw error;
      }
      console.error(
        'Continuing after package error:',
        location,
        errorMessage(error),
      );
      failures.push({ location, error });
    }
  }

  const rewrites = packages.filter(
    pkg => pkg.packageJson.version !== pkg.desiredVersion,
  );
  if (rewrites.length > 0) {
    await rewritePackages(ctx, rewrites);
    ctx.announce(
      'Stopped before tagging because',
      rewrites.length,
      'package version(s) need to be committed first.',
    );
    throwFailures(failures, 'planning');
    return;
  }

  throwFailures(failures, 'planning');
  const tags = await createTags(ctx, packages, parsed.force);
  await pushTags(ctx, tags, parsed.pushRemote, parsed.force);
  ctx.announce('Success!');
};

main().catch(error => {
  console.error('Failed with error:', error);
  process.exitCode ||= 1;
  process.exit();
});
