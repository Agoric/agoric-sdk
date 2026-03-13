#!/usr/bin/env node
/* eslint-env node */

import { createHash } from 'node:crypto';
import fsTop from 'node:fs';
import osTop from 'node:os';
import pathTop from 'node:path';
import { fileURLToPath } from 'node:url';
import * as childProcess from 'node:child_process';
import { manifestHashes } from './prebuilt-manifest-sha256.js';

/**
 * @import {promises as fsPromises} from 'fs';
 * @import {spawn} from 'child_process';
 * @import {ReadStream} from 'fs';
 */

/** @param {string} path */
const asset = path => fileURLToPath(new URL(path, import.meta.url));

/**
 * @param {string} osType
 * @param {string} arch
 */
export const mapOsArchToTarget = (osType, arch) => {
  const osName = {
    Linux: 'linux',
    Darwin: 'darwin',
  }[osType];
  if (!osName) {
    throw Error(`Unsupported OS for prebuilt xsnap: ${osType}`);
  }

  const archName = {
    x64: 'x64',
    arm64: 'arm64',
    amd64: 'x64',
    aarch64: 'arm64',
  }[arch];
  if (!archName) {
    throw Error(`Unsupported architecture for prebuilt xsnap: ${arch}`);
  }

  return `${osName}-${archName}`;
};

/** @param {string} target */
export const targetToBuildPlatform = target => {
  if (target.startsWith('linux-')) {
    return 'lin';
  }
  if (target.startsWith('darwin-')) {
    return 'mac';
  }
  throw Error(`Unsupported target for build platform mapping: ${target}`);
};

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string }} [opts]
 */
const run = (command, args, opts = {}) =>
  new Promise((resolve, reject) => {
    const child = childProcess.spawn(command, args, {
      cwd: opts.cwd || '.',
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    child.once('error', reject);
    child.once('exit', code => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(Error(`${command} exited with code ${code}`));
      }
    });
  });

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string }} [opts]
 * @returns {Promise<string>}
 */
const capture = (command, args, opts = {}) =>
  new Promise((resolve, reject) => {
    const child = childProcess.spawn(command, args, {
      cwd: opts.cwd || '.',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let stdout = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
    });
    child.once('error', reject);
    child.once('exit', code => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(Error(`${command} exited with code ${code}`));
      }
    });
  });

/**
 * @param {string} url
 * @param {string} destPath
 */
const downloadFile = async (url, destPath) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw Error(`Download failed for ${url}: HTTP ${res.status}`);
  }
  if (!res.body) {
    throw Error(`Download failed for ${url}: missing response body`);
  }

  await fsTop.promises.mkdir(pathTop.dirname(destPath), { recursive: true });
  await fsTop.promises.writeFile(
    destPath,
    Buffer.from(await res.arrayBuffer()),
  );
};

/**
 * @param {string} path
 * @returns {Promise<string>}
 */
const sha256File = async path => {
  const hash = createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = fsTop.createReadStream(path);
    stream.once('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.once('end', resolve);
  });
  return hash.digest('hex');
};

/**
 * @param {string} manifestPath
 * @param {string} target
 * @returns {Promise<{ release: string, debug: string }>}
 */
const readExpectedHashes = async (manifestPath, target) => {
  const text = await fsTop.promises.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(text);
  const entry = manifest?.targets?.[target];
  if (!entry?.release?.sha256 || !entry?.debug?.sha256) {
    throw Error(`Manifest missing hashes for target ${target}`);
  }
  return {
    release: entry.release.sha256,
    debug: entry.debug.sha256,
  };
};

const getDefaultCacheRoot = () => {
  if (process.platform === 'darwin') {
    return pathTop.join(osTop.homedir(), 'Library', 'Caches', 'agoric-sdk');
  }
  return pathTop.join(
    process.env.XDG_CACHE_HOME || pathTop.join(osTop.homedir(), '.cache'),
    'agoric-sdk',
  );
};

/** @param {string} entry */
const isSafeTarEntry = entry =>
  entry !== '' &&
  !pathTop.isAbsolute(entry) &&
  !entry.split('/').includes('..') &&
  !entry.includes('\\');

/**
 * @param {string} tarballPath
 * @param {string[]} expectedFiles
 */
const validateTarball = async (tarballPath, expectedFiles) => {
  const remaining = new Set(expectedFiles);
  const listing = await capture('tar', ['-tvzf', tarballPath]);
  for (const line of listing.split('\n')) {
    if (!line) {
      continue;
    }
    const type = line[0];
    const rawEntry = line.split(/\s+/).at(-1) || '';
    const entry = rawEntry.replace(/\/$/, '');
    if (!isSafeTarEntry(entry)) {
      throw Error(`Refusing to extract unsafe archive path: ${rawEntry}`);
    }
    if (type !== 'd' && type !== '-') {
      throw Error(`Refusing to extract non-regular archive entry: ${rawEntry}`);
    }
    remaining.delete(entry);
  }
  if (remaining.size > 0) {
    throw Error(
      `Archive missing expected xsnap binaries: ${Array.from(remaining).join(', ')}`,
    );
  }
};

/**
 * @param {string} version
 * @param {NodeJS.ProcessEnv} env
 */
const getExpectedManifestHash = (version, env) => {
  const expected = env.XSNAP_BINARY_MANIFEST_SHA256 || manifestHashes[version];
  if (!expected) {
    throw Error(
      `Missing trusted manifest hash for xsnap binary version ${version}; set XSNAP_BINARY_MANIFEST_SHA256 for explicit overrides`,
    );
  }
  return expected;
};

const main = async () => {
  const env = process.env;
  if (env.XSNAP_WORKER) {
    console.log('XSNAP_WORKER is set; skipping prebuilt binary install');
    return;
  }

  const version = env.XSNAP_BINARY_VERSION || env.npm_package_version;
  if (!version) {
    throw Error(
      'Missing XSNAP_BINARY_VERSION and npm_package_version; cannot resolve prebuilt release',
    );
  }

  const repo = env.XSNAP_BINARY_REPO || 'Agoric/xsnap-worker-binaries';
  const base =
    env.XSNAP_BINARY_BASE_URL ||
    `https://github.com/${repo}/releases/download/v${version}`;

  const target = mapOsArchToTarget(osTop.type(), osTop.arch());
  const platform = targetToBuildPlatform(target);

  const tarballName = `xsnap-worker-binaries-${version}.tar.gz`;
  const manifestName = `xsnap-worker-manifest-${version}.json`;

  const cacheRoot = pathTop.join(
    env.XSNAP_CACHE_DIR || getDefaultCacheRoot(),
    'xsnap',
    'prebuilt',
    version,
  );
  const tarballPath = pathTop.join(cacheRoot, tarballName);
  const manifestPath = pathTop.join(cacheRoot, manifestName);
  const extractRoot = pathTop.join(cacheRoot, 'bundle');
  const expectedManifestHash = getExpectedManifestHash(version, env);

  const releaseSrc = pathTop.join(
    extractRoot,
    `dist/${target}/release/xsnap-worker`,
  );
  const debugSrc = pathTop.join(
    extractRoot,
    `dist/${target}/debug/xsnap-worker`,
  );
  const expectedArchiveFiles = [
    `dist/${target}/release/xsnap-worker`,
    `dist/${target}/debug/xsnap-worker`,
  ];

  await fsTop.promises.mkdir(cacheRoot, { recursive: true });

  const releaseDest = asset(
    `../xsnap-native/xsnap/build/bin/${platform}/release/xsnap-worker`,
  );
  const debugDest = asset(
    `../xsnap-native/xsnap/build/bin/${platform}/debug/xsnap-worker`,
  );

  const [manifestAvailable, releaseAvailable, debugAvailable] =
    await Promise.allSettled([
      sha256File(manifestPath),
      sha256File(releaseDest),
      sha256File(debugDest),
    ]);
  if (
    manifestAvailable.status === 'fulfilled' &&
    manifestAvailable.value === expectedManifestHash &&
    releaseAvailable.status === 'fulfilled' &&
    debugAvailable.status === 'fulfilled'
  ) {
    const { release: releaseExpected, debug: debugExpected } =
      await readExpectedHashes(manifestPath, target);
    if (
      releaseAvailable.value === releaseExpected &&
      debugAvailable.value === debugExpected
    ) {
      console.log(
        `Using cached prebuilt xsnap binaries for ${target} (${version})`,
      );
      return;
    }
  }

  await downloadFile(`${base}/${manifestName}`, manifestPath);
  const manifestHash = await sha256File(manifestPath);
  if (manifestHash !== expectedManifestHash) {
    throw Error(`Manifest hash mismatch for xsnap binary version ${version}`);
  }

  await downloadFile(`${base}/${tarballName}`, tarballPath);
  await validateTarball(tarballPath, expectedArchiveFiles);

  await fsTop.promises.rm(extractRoot, { recursive: true, force: true });
  await fsTop.promises.mkdir(extractRoot, { recursive: true });
  await run('tar', [
    '-xzf',
    tarballPath,
    '-C',
    extractRoot,
    ...expectedArchiveFiles,
  ]);

  const [
    { release: releaseExpected, debug: debugExpected },
    releaseActual,
    debugActual,
  ] = await Promise.all([
    readExpectedHashes(manifestPath, target),
    sha256File(releaseSrc),
    sha256File(debugSrc),
  ]);

  if (releaseExpected !== releaseActual) {
    throw Error(`Release binary hash mismatch for ${target}`);
  }
  if (debugExpected !== debugActual) {
    throw Error(`Debug binary hash mismatch for ${target}`);
  }

  await fsTop.promises.mkdir(pathTop.dirname(releaseDest), { recursive: true });
  await fsTop.promises.mkdir(pathTop.dirname(debugDest), { recursive: true });
  await fsTop.promises.copyFile(releaseSrc, releaseDest);
  await fsTop.promises.copyFile(debugSrc, debugDest);
  await fsTop.promises.chmod(releaseDest, 0o755);
  await fsTop.promises.chmod(debugDest, 0o755);

  console.log(`Installed prebuilt xsnap binaries for ${target} (${version})`);
};

const isMain =
  process.argv[1] &&
  pathTop.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch(err => {
    console.error('Failed to install prebuilt xsnap binaries');
    console.error(err);
    process.exit(1);
  });
}
