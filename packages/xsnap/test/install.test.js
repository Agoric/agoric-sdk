import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
  copyFile,
  mkdir,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { $ } from 'execa';
import test from 'ava';
import {
  mapOsArchToTarget,
  targetToBuildPlatform,
} from '../src/install-prebuilt.js';

const sha256File = async path =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex');

test('pack and install xsnap', async t => {
  const tmp = await mkdtemp(join(tmpdir(), 'xsnap-'));
  t.teardown(() => rm(tmp, { recursive: true }));
  const target = mapOsArchToTarget(
    process.platform === 'darwin' ? 'Darwin' : 'Linux',
    process.arch,
  );
  const buildPlatform = targetToBuildPlatform(target);
  const version = '0.14.2-test';
  const baseDir = join(tmp, 'release');
  const releaseBin = join(baseDir, `dist/${target}/release/xsnap-worker`);
  const debugBin = join(baseDir, `dist/${target}/debug/xsnap-worker`);
  await mkdir(join(baseDir, `dist/${target}/release`), { recursive: true });
  await mkdir(join(baseDir, `dist/${target}/debug`), { recursive: true });
  await copyFile(process.execPath, releaseBin);
  await copyFile(process.execPath, debugBin);
  const manifest = {
    targets: {
      [target]: {
        release: { sha256: await sha256File(releaseBin) },
        debug: { sha256: await sha256File(debugBin) },
      },
    },
  };
  const manifestPath = join(tmp, `xsnap-worker-manifest-${version}.json`);
  await writeFile(manifestPath, JSON.stringify(manifest));
  const manifestHash = await sha256File(manifestPath);
  const tarballPath = join(tmp, `xsnap-worker-binaries-${version}.tar.gz`);
  await $({ cwd: baseDir })`tar -czf ${tarballPath} dist`;
  const server = createServer(async (req, res) => {
    const name = req.url?.slice(1);
    if (name === `xsnap-worker-binaries-${version}.tar.gz`) {
      res.writeHead(200, { 'content-type': 'application/gzip' });
      res.end(await readFile(tarballPath));
      return;
    }
    if (name === `xsnap-worker-manifest-${version}.json`) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(await readFile(manifestPath));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  /** @type {Promise<void>} */
  const serverListening = new Promise((resolveServer, rejectServer) => {
    server.once('error', rejectServer);
    server.listen({ port: 0, host: '127.0.0.1' }, () => {
      server.off('error', rejectServer);
      resolveServer(undefined);
    });
  });
  await serverListening;
  t.teardown(
    () =>
      /** @type {Promise<void>} */ (
        new Promise((resolveServer, rejectServer) => {
          server.close(err => {
            if (err) {
              rejectServer(err);
            } else {
              resolveServer(undefined);
            }
          });
        })
      ),
  );
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw Error('Failed to get test server address');
  }
  // Pack via ts-node-pack — the same path xsnap is published through — so
  // that `workspace:` deps are resolved. Raw `npm pack` would leave
  // `workspace:*` in the manifest, which the `npm install` below rejects with
  // EUNSUPPORTEDPROTOCOL. ts-node-pack still runs `npm pack` internally, so
  // this exercises the same files-list resolution the test exists to cover.
  // It writes `<name>-<version>.tgz` into its CWD.
  const tsNodePack = fileURLToPath(
    new URL('../../../node_modules/.bin/ts-node-pack', import.meta.url),
  );
  await $({ cwd: tmp })`${tsNodePack} ${process.cwd()}`;
  const packed = (await readdir(tmp)).find(name => name.endsWith('.tgz'));
  if (!packed) throw Error('ts-node-pack produced no tarball');
  const filename = join(tmp, packed);
  await $({ cwd: tmp })`tar xvf ${resolve(filename)}`;
  const { XSNAP_WORKER: _, XSNAP_WORKER_DEBUG: _2, ...envRest } = process.env;
  const env = {
    ...envRest,
    XSNAP_BINARY_VERSION: version,
    XSNAP_BINARY_BASE_URL: `http://127.0.0.1:${address.port}`,
    XSNAP_BINARY_MANIFEST_SHA256: manifestHash,
    XSNAP_CACHE_DIR: join(tmp, 'cache'),
  };
  await $({
    cwd: join(tmp, 'package'),
    env,
  })`npm install --ignore-scripts`;
  await $({
    cwd: join(tmp, 'package'),
    env,
  })`npm run postinstall`;
  const installedBin = join(
    tmp,
    `package/xsnap-native/xsnap/build/bin/${buildPlatform}/release/xsnap-worker`,
  );
  t.truthy(await readFile(installedBin));
  t.pass();
});
