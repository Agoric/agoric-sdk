import { createRequire } from 'module';
import { readFile as ambientReadFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import type { SetupContext } from './support.js';

const nodeRequire = createRequire(import.meta.url);

// XXX use -2 if Osmosis comes up first
const fixturesFolder = 'fixtures-2';

export const installStakeContracts = async ({
  copyFiles,
  installBundles,
  runCoreEval,
}: Pick<SetupContext, 'copyFiles' | 'installBundles' | 'runCoreEval'>) => {
  const plans = ['stakeAtom', 'stakeOsmo'];

  const fullPath = (relPath: string) =>
    nodeRequire.resolve(`./${fixturesFolder}/${relPath}`);

  const files: string[] = [];
  for (const plan of plans) {
    const planContent = await ambientReadFile(
      nodeRequire.resolve(`./${fixturesFolder}/start-${plan}-plan.json`),
      'utf-8',
    );
    const content = JSON.parse(planContent);
    files.push(
      content.script,
      content.permit,
      ...content.bundles.map(
        (bundle: { bundleID: string; fileName: string }) =>
          `${bundle.bundleID}.json`,
      ),
    );
  }
  const uniqueFiles = new Set(files.sort());
  console.log('@uniqueFiles', uniqueFiles);

  const output = copyFiles(files.map(fullPath));
  const outputFileNames = output.trim().split('\n');
  assert(
    [...uniqueFiles].every(file => outputFileNames.includes(file)),
    'all files copied to container',
  );

  await installBundles(
    [...uniqueFiles]
      .filter(x => /^b\d+-/.test(x)) // XXX keep separate array above?
      .map(x => `/tmp/contracts/${x}`),
    console.log,
  );

  for (const plan of plans) {
    await runCoreEval({
      name: plan,
      description: `${plan} proposal`,
    });
  }
};
