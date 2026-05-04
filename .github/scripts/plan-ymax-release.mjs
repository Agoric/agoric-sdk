#!/usr/bin/env node
/** @file plan ymax release work before any expensive build steps */
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  bundleIdFromBundleText,
  expectedOverridesAssetName,
  prerequisiteTargets,
  targetInfo,
  validateInstallRecord,
  validateUpgradeRecord,
} from '../../packages/portfolio-deploy/src/ymax-release-policy.mjs';

const toOutputName = name =>
  name.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const makeReleaseReader = ({ gh, releaseTag }) => {
  const release = (() => {
    const proc = gh(['release', 'view', releaseTag, '--json', 'assets,url'], {
      allowFailure: true,
    });
    if (proc.status !== 0) {
      return { assets: [], url: '' };
    }
    return JSON.parse(proc.stdout || '{}');
  })();

  const assetNames = new Set(release.assets.map(({ name }) => name));
  const assetTextCache = new Map();

  const getAssetText = name => {
    if (!assetNames.has(name)) {
      throw Error(`missing required release asset ${name}`);
    }
    if (!assetTextCache.has(name)) {
      const proc = gh(
        ['release', 'download', releaseTag, '--pattern', name, '--output', '-'],
        { encoding: 'utf8' },
      );
      assetTextCache.set(name, proc.stdout);
    }
    return assetTextCache.get(name);
  };

  const getAssetJson = name => JSON.parse(getAssetText(name));

  return { assetNames, getAssetJson, getAssetText, release };
};

const makePlan = ({
  bundleIdArg,
  mode,
  privateArgs,
  releaseTag,
  target,
  ymax1Planner,
  gh,
}) => {
  if (!(target in targetInfo)) throw Error(`unsupported target: ${target}`);
  if (!['bundle-only', 'deploy'].includes(mode)) {
    throw Error(`unsupported --mode: ${mode}`);
  }

  const { assetNames, getAssetJson, getAssetText, release } = makeReleaseReader(
    {
      gh,
      releaseTag,
    },
  );
  const needBundleBuild =
    target === 'ymax0-devnet' && !assetNames.has('bundle-ymax0.json');
  const bundleId =
    bundleIdArg ||
    (assetNames.has('bundle-ymax0.json')
      ? bundleIdFromBundleText(getAssetText('bundle-ymax0.json'))
      : '');

  const plan = {
    mode,
    target,
    releaseTag,
    releaseExists: Boolean(release.url),
    bundleId,
    needBundleBuild,
    needPreUpgrade: true,
    needUpgrade: true,
  };

  if (mode === 'bundle-only') {
    return plan;
  }

  if (!bundleId) {
    if (!needBundleBuild) {
      throw Error(
        `bundle id unavailable for ${target}; build or upload bundle-ymax0.json first`,
      );
    }
    // bundleId is unknown until build-bundle runs; skip record validation.
    // The downstream pre-upgrade job derives bundleId from the built file
    // and writes the install/upgrade records itself.
    return plan;
  }

  for (const priorTarget of prerequisiteTargets[target]) {
    validateInstallRecord(
      priorTarget,
      bundleId,
      getAssetJson(`${priorTarget}-install.json`),
    );
    validateUpgradeRecord(
      priorTarget,
      bundleId,
      getAssetJson(`${priorTarget}-upgrade.json`),
    );
  }

  const installAssetName = `${target}-install.json`;
  if (assetNames.has(installAssetName)) {
    validateInstallRecord(target, bundleId, getAssetJson(installAssetName));
    plan.needPreUpgrade = false;
  }

  const upgradeAssetName = `${target}-upgrade.json`;
  if (assetNames.has(upgradeAssetName)) {
    const record = getAssetJson(upgradeAssetName);
    validateUpgradeRecord(target, bundleId, record);
    const expectedOverrides = expectedOverridesAssetName(target, privateArgs);
    if (record.privateArgsOverridesPath !== expectedOverrides) {
      throw Error(
        `existing ${upgradeAssetName} uses ${record.privateArgsOverridesPath}, not ${expectedOverrides}; remove or rename ${upgradeAssetName} to change private args`,
      );
    }
    plan.needUpgrade = false;
  }

  if (target === 'ymax1-main' && plan.needUpgrade && ymax1Planner !== 'down') {
    throw Error('ymax1Planner must be down for ymax1-main');
  }

  return plan;
};

const makeGh =
  ({ env, spawn }) =>
  (args, { allowFailure = false, encoding = 'utf8' } = {}) => {
    const proc = spawn('gh', args, { encoding, env });
    if (proc.status === 0 || allowFailure) {
      return proc;
    }
    throw Error(
      [`gh ${args.join(' ')}`, proc.stderr, proc.stdout]
        .filter(Boolean)
        .join('\n'),
    );
  };

const writePlanOutputs = ({ plan, writeOutput }) => {
  for (const [key, value] of Object.entries(plan)) {
    writeOutput(toOutputName(key), String(value));
  }
};

const fail = message => {
  throw Error(message);
};

export const main = async ({
  env = process.env,
  appendFile = appendFileSync,
  spawn = spawnSync,
  stdout = process.stdout,
} = {}) => {
  const mode = env.MODE || 'deploy';
  const releaseTag = env.RELEASE_TAG || fail('--release-tag missing');
  const target = env.TARGET || fail('--target missing');
  const gh = makeGh({ env, spawn });
  const plan = makePlan({
    bundleIdArg: env.BUNDLE_ID || '',
    mode,
    privateArgs: env.PRIVATE_ARGS_OVERRIDES || '',
    releaseTag,
    target,
    ymax1Planner: env.YMAX1_PLANNER || '',
    gh,
  });

  const writeOutput = (name, value) => {
    if (!env.GITHUB_OUTPUT) return;
    appendFile(env.GITHUB_OUTPUT, `${name}=${value}\n`);
  };
  writePlanOutputs({ plan, writeOutput });
  stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
