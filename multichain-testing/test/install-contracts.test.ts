// import anyTest from '@endo/ses-ava/prepare-endo.js';
import anyTest, { TestFn } from 'ava';
import { createRequire } from 'module';
import { commonSetup, SetupContext } from './support.js';
import { readFile as ambientReadFile } from 'node:fs/promises';

const nodeRequire = createRequire(import.meta.url);

const test = anyTest as TestFn<SetupContext>;

const fixturesFolder = 'fixtures-2';

test.before(async t => {
  t.context = await commonSetup(t);
});

test('install contracts', async t => {
  const { copyFiles, installBundles, runCoreEval } = t.context;

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
  t.true(
    [...uniqueFiles].every(file => outputFileNames.includes(file)),
    'all files copied to container',
  );

  await t.notThrowsAsync(() =>
    installBundles(
      [...uniqueFiles]
        .filter(x => /^b\d+-/.test(x)) // XXX keep separate array above?
        .map(x => `/tmp/contracts/${x}`),
      t.log,
    ),
  );

  for (const plan of plans) {
    await t.notThrowsAsync(() =>
      runCoreEval({
        name: plan,
        description: `${plan} proposal`,
      }),
    );
  }
});
