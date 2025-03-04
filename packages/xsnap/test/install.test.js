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
  const { stdout: npmout } = await $`npm pack --json`;
  const [{ filename }] = JSON.parse(npmout);
  await $({ cwd: tmp })`tar xvf ${resolve(filename)}`;
  await $({ cwd: join(tmp, 'package') })`npm install`;
  t.pass();
});
