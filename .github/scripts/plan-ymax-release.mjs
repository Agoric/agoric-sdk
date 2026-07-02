#!/usr/bin/env node
/** @file plan ymax release work before any expensive build steps */
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { makeReleasePlan } from '../../packages/portfolio-deploy/src/ymax-release-policy.mjs';

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
  const releaseTag = env.RELEASE_TAG || fail('$RELEASE_TAG missing');
  const target = env.TARGET || fail('--target missing');
  const gh = makeGh({ env, spawn });
  const plan = makeReleasePlan({
    bundleIdArg: env.BUNDLE_ID || '',
    mode,
    privateArgs: env.PRIVATE_ARGS_OVERRIDES || '',
    reader: makeReleaseReader({ gh, releaseTag }),
    releaseTag,
    target,
    ymax1Planner: env.YMAX1_PLANNER || '',
  });

  if (env.GITHUB_OUTPUT) {
    for (const [key, value] of Object.entries(plan)) {
      const name = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      appendFile(env.GITHUB_OUTPUT, `${name}=${value}\n`);
    }
  }
  stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
