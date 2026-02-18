// building xsnap locally and installing from npm follow different paths
// through build.js, since installation targets are not obliged to have a git
// toolchain.
// This test verifies the post-publish experience.

import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { $ } from 'execa';
import test from 'ava';

test('pack and install xsnap', async t => {
  const tmp = await mkdtemp(join(tmpdir(), 'xsnap-'));
  t.teardown(() => rm(tmp, { recursive: true }));
  const filename = join(tmp, 'package.tgz');
  await $`yarn pack --out ${filename}`;
  await $({ cwd: tmp })`tar xvf ${resolve(filename)}`;
  const env = { ...process.env };
  delete env.XSNAP_WORKER;
  delete env.XSNAP_WORKER_DEBUG;
  await $({
    cwd: join(tmp, 'package'),
    env: {
      ...env,
      XSNAP_BINARY_VERSION: version,
      XSNAP_BINARY_BASE_URL: `http://127.0.0.1:${address.port}`,
      XSNAP_BINARY_MANIFEST_SHA256: manifestHash,
      XSNAP_CACHE_DIR: join(tmp, 'cache'),
    },
  })`npm install`;
  const installedBin = join(
    tmp,
    `package/xsnap-native/xsnap/build/bin/${buildPlatform}/release/xsnap-worker`,
  );
  t.truthy(await readFile(installedBin));
  t.pass();
});
