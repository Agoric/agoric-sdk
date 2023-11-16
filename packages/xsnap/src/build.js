#!/usr/bin/env node
/* global process */
/* eslint-disable @jessie.js/no-nested-await -- test/build code */
import * as childProcessTop from 'child_process';
import fsTop from 'fs';
import osTop from 'os';
import { join } from 'path';

const { freeze } = Object;

// This package builds 'xsnap' program at install time. At runtime,
// this package's API helps you launch an instance of that program and
// then talk to it (over pipes).
//
// 'xsnap' is built from sources in `./xsnap-native/`, which link
// against a library built from the sources in `./moddable/`.
//
// When built from a git clone of the agoric-sdk, these subdirectories
// are populated as git submodules, so they will be clones of specific
// commit IDs of repos from the "agoric-labs" organization. These
// repos contain Agoric-specific forks of the upstream Moddable
// code. We have two cases:
//
//   A: the subdirectories do not exist, which means we've cloned
//      agoric-sdk but we have not yet run 'git submodule update
//      --init'
//   B: they do exist, and they have .git subdirectories
//
// When built from an NPM-registry -hosted tarball, these
// subdirectories are filled with source code from the distribution
// tarball (copied into the tarball by virtue of 'files' entries in
// our package.json). This yields a third case:
//
//   C: they exist, but they lack a .git subdirectory
//
// In cases A and B, we want to run `git submodule update --init` on
// each directory, to act upon any change in the desired commit ID
// (e.g. if the developer switched git branches since the last
// build). In case C, we shouldn't do anything (and in fact do not
// need the 'git' executable at all).

/** @param {string} path */
const asset = path => new URL(path, import.meta.url).pathname;

const ModdableSDK = {
  MODDABLE: asset('../moddable'),
  /** @type { Record<string, { path: string, make?: string }>} */
  platforms: {
    Linux: { path: 'lin' },
    Darwin: { path: 'mac' },
    Windows_NT: { path: 'win', make: 'nmake' },
  },
  buildGoals: ['release', 'debug'],
};

/**
 * Adapt spawn to Promises style.
 *
 * @param {string} command
 * @param {{
 *   spawn: typeof import('child_process').spawn,
 * }} io
 */
function makeCLI(command, { spawn }) {
  /** @param {import('child_process').ChildProcess} child */
  const wait = child =>
    new Promise((resolve, reject) => {
      child.on('close', () => {
        resolve(undefined);
      });
      child.on('error', err => {
        reject(Error(`${command} error ${err}`));
      });
      child.on('exit', code => {
        if (code !== 0) {
          reject(Error(`${command} exited with code ${code}`));
        }
      });
    });

  return freeze({
    /**
     * @param {string[]} args
     * @param {{ cwd?: string }} [opts]
     */
    run: (args, opts) => {
      const { cwd = '.' } = opts || {};
      const child = spawn(command, args, {
        cwd,
        stdio: ['inherit', 'inherit', 'inherit'],
      });
      return wait(child);
    },
    /**
     * @param {string[]} args
     * @param {{ cwd?: string }} [opts]
     */
    pipe: (args, opts) => {
      const { cwd = '.' } = opts || {};
      const child = spawn(command, args, {
        cwd,
        stdio: ['inherit', 'pipe', 'inherit'],
      });
      let output = '';
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', data => {
        output += data.toString();
      });
      return wait(child).then(() => output);
    },
  });
}

/**
 * @param {string} path
 * @param {string} repoUrl
 * @param {{ git: ReturnType<typeof makeCLI> }} io
 */
const makeSubmodule = (path, repoUrl, { fs, git }) => {
  /** @param {string} text */
  const parseStatus = text =>
    text
      .split('\n')
      // From `git submodule --help`:
      // Show the status of the submodules. This will print the SHA-1 of the
      // currently checked out commit for each submodule, along with the
      // submodule path and the output of git describe for the SHA-1. Each
      // SHA-1 will possibly be prefixed with - if the submodule is not
      // initialized, + if the currently checked out submodule commit does
      // not match the SHA-1 found in the index of the containing repository
      // and U if the submodule has merge conflicts.
      //
      // We discovered that in other cases, the prefix is a single space.
      .map(line => [line[0], ...line.slice(1).split(' ', 3)])
      .map(([prefix, hash, statusPath, describe]) => ({
        prefix,
        hash,
        path: statusPath,
        describe,
      }));

  return freeze({
    path,
    exists: () => fs.existsSync(path),
    hasDotGit: () => fs.existsSync(join(path, '.git')),
    init: async () => git.run(['submodule', 'update', '--init', '--checkout', path]),
    update: async () => git.run(['submodule', 'update', '--init', '--checkout', path]),
    status: async () =>
      git.pipe(['submodule', 'status', path]).then(parseStatus),
    /** @param {string} leaf */
    config: async leaf => {
      // git rev-parse --show-toplevel
      const top = await git
        .pipe(['rev-parse', '--show-toplevel'])
        .then(l => l.trimEnd());
      // assume full paths
      const name = path.slice(top.length + 1);
      // git config -f ../../.gitmodules --get submodule."$name".url
      const value = await git
        .pipe([
          'config',
          '-f',
          `${top}/.gitmodules`,
          '--get',
          `submodule.${name}.${leaf}`,
        ])
        .then(l => l.trimEnd());
      return value;
    },
  });
};

/**
 * @param {string[]} args
 * @param {{
 *   env: Record<string, string | undefined>,
 *   stdout: typeof process.stdout,
 *   spawn: typeof import('child_process').spawn,
 *   fs: {
 *     existsSync: typeof import('fs').existsSync,
 *     rmdirSync: typeof import('fs').rmdirSync,
 *     readFile: typeof import('fs').promises.readFile,
 *   },
 *   os: {
 *     type: typeof import('os').type,
 *   }
 * }} io
 */
async function main(args, { env, stdout, spawn, fs, os }) {
  const git = makeCLI('git', { spawn });

  // When changing/adding entries here, make sure to search the whole project
  // for `@@AGORIC_DOCKER_SUBMODULES@@`
  const submodules = [
    {
      url: env.MODDABLE_URL || 'https://github.com/agoric-labs/moddable.git',
      path: ModdableSDK.MODDABLE,
      commitHash: env.MODDABLE_COMMIT_HASH,
      envPrefix: 'MODDABLE_',
    },
    {
      url:
        env.XSNAP_NATIVE_URL || 'https://github.com/agoric-labs/xsnap-pub.git',
      path: asset('../xsnap-native'),
      commitHash: env.XSNAP_NATIVE_COMMIT_HASH,
      envPrefix: 'XSNAP_NATIVE_',
    },
  ];

  let usingGit = false; // we assume all subdirs are using git, or none are
  const envRecordFile = 'build.env';
  const envLines = [];

  for (const { url, path, commitHash, envPrefix } of submodules) {
    const submodule = makeSubmodule(path, url, { fs, git });

    if (submodule.exists()) {
      if (submodule.hasDotGit()) {
        console.log(`case B: have submodule/.git`);
        usingGit = true;
        await submodule.update();
      } else {
        console.log(`case C: have submodule/ but not .git`);
        // do nothing
      }
    } else {
      console.log(`case A: no submodule/ directory`);
      usingGit = true;
      await submodule.update();
    }

    if (usingGit) {
      // record the submodule's source URL and git commit hash into
      // build.env for later auditing

      // We need to glean the commitHash and url from Git.
      const sm = makeSubmodule(path, '?', { fs, git });
      const [[{ hash }], url] = await Promise.all([
        sm.status(),
        sm.config('url'),
      ]);
      envLines.push(`${envPrefix}URL=${url}\n`);
      envLines.push(`${envPrefix}COMMIT_HASH=${hash}\n`);
    }
  }
  if (usingGit) {
    fs.writeFileSync(envRecordFile, envLines.join(''));
  }

  //console.log(`-- returning instead of compiling`);
  //return;
  // now compile xsnap

  const pjson = await fs.readFile(asset('../package.json'), 'utf-8');
  const pkg = JSON.parse(pjson);

  const platform = ModdableSDK.platforms[os.type()];
  if (!platform) {
    throw Error(`Unsupported OS found: ${os.type()}`);
  }

  const make = makeCLI(platform.make || 'make', { spawn });
  for (const goal of ModdableSDK.buildGoals) {
    // eslint-disable-next-line no-await-in-loop
    await make.run(
      [
        `MODDABLE=${ModdableSDK.MODDABLE}`,
        `GOAL=${goal}`,
        `XSNAP_VERSION=${pkg.version}`,
        `CC=cc "-D__has_builtin(x)=1"`,
        '-f',
        'xsnap-worker.mk',
      ],
      {
        cwd: `xsnap-native/xsnap/makefiles/${platform.path}`,
      },
    );
  }
}

main(process.argv.slice(2), {
  env: { ...process.env },
  stdout: process.stdout,
  spawn: childProcessTop.spawn,
  fs: {
    readFile: fsTop.promises.readFile,
    existsSync: fsTop.existsSync,
    rmdirSync: fsTop.rmdirSync,
    writeFileSync: fsTop.writeFileSync,
  },
  os: {
    type: osTop.type,
  },
}).catch(e => {
  console.error(e);
  process.exit(1);
});
