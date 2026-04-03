// building xsnap locally and installing from npm follow different paths
// through build.js, since installation targets are not obliged to have a git
// toolchain.
// This test verifies the post-publish experience.

import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { env } from 'node:process';
import { $ } from 'execa';
import test from 'ava';

const ourName = '@agoric/xsnap';

test('pack and install xsnap', async t => {
  const tmp = await mkdtemp(join(tmpdir(), 'xsnap-'));
  t.teardown(() => rm(tmp, { recursive: true }));

  const filename = join(tmp, 'package.tgz');
  await $`yarn pack --out ${filename}`;
  await $({ cwd: tmp })`tar xvf ${resolve(filename)}`;

  const tmpRoot = join(tmp, 'package');
  {
    const packageJsonPath = join(tmpRoot, 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    t.is(
      packageJson.name,
      ourName,
      `${packageJsonPath} should be named ${ourName}`,
    );
    t.not(
      'workspaces' in packageJson,
      `${packageJsonPath} should not have workspaces`,
    );

    const agoricRoot = fileURLToPath(new URL('../../..', import.meta.url));
    const agoricPackageJsonPath = join(agoricRoot, 'package.json');
    const agoricPackageJson = JSON.parse(
      await readFile(agoricPackageJsonPath, { encoding: 'utf8' }),
    );

    const packageManager = agoricPackageJson.packageManager;
    t.truthy(
      packageManager.startsWith('yarn@'),
      `${agoricPackageJsonPath} packageManager ${packageManager} should start with yarn@`,
    );

    const { stdout: workspacesJsonLines } =
      await $`yarn workspaces list --json`;
    const resolutions = Object.fromEntries(
      workspacesJsonLines.split('\n').flatMap(line => {
        if (!line.trim()) return [];
        const { name, location } = JSON.parse(line);
        if (name === ourName) {
          return [[name, `portal:.`]];
        } else {
          return [[name, `portal:${resolve(agoricRoot, location)}`]];
        }
      }),
    );

    const newPackageJson = { ...packageJson, resolutions, packageManager };
    await writeFile(packageJsonPath, JSON.stringify(newPackageJson, null, 2));
    await cp(join(agoricRoot, 'yarn.lock'), join(tmpRoot, 'yarn.lock'));
  }

  // We don't have to care about the updated `yarn.lock` file, since this
  // test writes it and immediately throws it away.
  const optOutEnv = {
    ...env,
    YARN_ENABLE_HARDENED_MODE: '0',
    YARN_ENABLE_IMMUTABLE_INSTALLS: '0',
  };
  await $({ cwd: tmpRoot, env: optOutEnv })`yarn install`;
  t.pass();
});
