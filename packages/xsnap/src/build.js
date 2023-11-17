#!/usr/bin/env node
/* global process */
/* eslint-disable @jessie.js/no-nested-await -- test/build code */
/* eslint-disable no-await-in-loop -- test/build code */
/* eslint-disable no-lonely-if -- makes the logic easier to read */
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
// code. We may observe two cases:
//
//   A: the subdirectories do not exist, which means we've cloned
//      agoric-sdk but we have not yet run 'git submodule update
//      --init'

//   B: they do exist, and they have .git subdirectories, which means
//      we've initialized the submodules at least once
//
// When built from an NPM-registry -hosted tarball, these
// subdirectories are filled with source code from the distribution
// tarball (copied into the tarball by virtue of 'files' entries in
// our package.json). This yields a third case:
//
//   C: they exist, but they lack a .git subdirectory
//
// When built in a docker build context, the subdirectories will
// initially be missing (if they existed in the original checkout at
// all, they were subsequently excluded by agoric-sdk/.dockerignore),
// however we'll also be missing the top-level .git metadata which
// would allow a "git submodule update --init" to work. This
// environment is distinguished by $XSNAP_IS_IN_DOCKER=1 being set by
// packages/deployment/Dockerfile.sdk, and indicates that we must read
// the URLs and commit hashes from build.json, and then do a "git
// clone", to get the same sources that we would normally get from the
// submodules.
//
//   D: the subdirectories do not exist, and $XSNAP_IS_IN_DOCKER is true
//
// In a docker build context, on the second or subsequent times that
// build.js is run, we'll see both $XSNAP_IS_IN_DOCKER=1 and the
// subdirectories existing.
//
//   E: the subdirectories exist, and $XSNAP_IS_IN_DOCKER is true
//
// In cases A and B, we want to run `git submodule update --init` on
// each directory, to act upon any change in the desired commit ID
// (e.g. if the developer switched git branches since the last
// build). In case C, we shouldn't do anything (and in fact do not
// need the 'git' executable at all). In case D, we must read the URLs
// from build.json and then do a "git clone". In case E, we should do
// nothing, and leave the sources alone.
//
//  A: git submodule update --init
//  B: git submodule update --init
//  C: do nothing
//  D: read build.json, then git clone/checkout for each subdirectory
//  E: do nothing

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
 * @param {{ fs: { existsSync: typeof import('fs').existsSync },
 *           git: ReturnType<typeof makeCLI> }} io
 */
const makeSubmodule = (path, { fs, git }) => {
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
    clone: async repoUrl => git.run(['clone', repoUrl, path]),
    /** @param {string} hash */
    checkout: async hash => git.run(['checkout', hash], { cwd: path }),
    init: async () =>
      git.run(['submodule', 'update', '--init', '--checkout', path]),
    update: async () =>
      git.run(['submodule', 'update', '--init', '--checkout', path]),
    exists: () => fs.existsSync(path),
    hasDotGit: () => fs.existsSync(join(path, '.git')),
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

const readBuildJSON = async (envRecordFile, { fs }) => {
  const data = await fs.readFile(envRecordFile);
  return JSON.parse(data);
};

const writeBuildJSON = async (envRecordFile, build, { fs }) => {
  const data = JSON.stringify(build, undefined, 2);
  await fs.writeFile(envRecordFile, `${data}\n`);
};

/**
 * @param {string[]} args
 * @param {{
 *   env: Record<string, string | undefined>,
 *   stdout: typeof process.stdout,
 *   spawn: typeof import('child_process').spawn,
 *   fs: {
 *     readFile: typeof import('fs').promises.readFile,
 *     writeFile: typeof import('fs').promises.writeFile,
 *     existsSync: typeof import('fs').existsSync,
 *     rmdirSync: typeof import('fs').rmdirSync,
 *   },
 *   os: {
 *     type: typeof import('os').type,
 *   }
 * }} io
 */
async function main(args, { env, spawn, fs, os }) {
  const git = makeCLI('git', { spawn });

  const inDocker = env.XSNAP_IS_IN_DOCKER; // TODO: we assume it's "1"

  const submodules = [
    {
      path: ModdableSDK.MODDABLE,
      key: 'moddable',
    },
    {
      path: asset('../xsnap-native'),
      key: 'xsnap_native',
    },
  ];

  // didGit is true if we consulted git and need to update build.json
  // with the results. We assume all subdirs are using git, or none are.
  let didGit = false;
  const buildJSONFile = 'build.json';
  let buildJSON = {};

  for (const { path, key } of submodules) {
    const submodule = makeSubmodule(path, { fs, git });

    if (inDocker) {
      if (submodule.exists()) {
        console.log(`${key} case E: in docker, have submodule/ : do nothing`);
      } else {
        console.log(`${key} case D: in docker, missing submodule/ : do clone`);
        buildJSON = await readBuildJSON(buildJSONFile, { fs }); // must exist
        const data = buildJSON[key];
        await submodule.clone(data.url); // requires git
        await submodule.checkout(data.hash);
      }
    } else {
      // not inDocker
      if (submodule.exists()) {
        if (submodule.hasDotGit()) {
          console.log(`${key} case B: have submodule/.git : do update`);
          didGit = true;
          await submodule.update(); // requires git
        } else {
          console.log(`${key} case C: have submodule/, not .git : do nothing`);
        }
      } else {
        console.log(`${key} case A: no submodule/ directory : do init`);
        didGit = true;
        await submodule.update(); // requires git
      }
    }

    if (didGit) {
      // record the submodule's source URL and git commit hash into
      // build.json for later auditing

      // We need to glean the commitHash and url from Git.
      const sm = makeSubmodule(path, { fs, git });
      const [[{ hash }], url] = await Promise.all([
        sm.status(),
        sm.config('url'),
      ]);
      buildJSON[key] = { url, hash };
    }
  }
  if (didGit) {
    await writeBuildJSON(buildJSONFile, buildJSON, { fs });
  }

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
    writeFile: fsTop.promises.writeFile,
    existsSync: fsTop.existsSync,
    rmdirSync: fsTop.rmdirSync,
  },
  os: {
    type: osTop.type,
  },
}).catch(e => {
  console.error(e);
  process.exit(1);
});
