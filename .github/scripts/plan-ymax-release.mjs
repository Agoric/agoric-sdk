#!/usr/bin/env node
/** @file plan ymax release work before any expensive build steps */
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
// eslint-disable-next-line import/no-relative-packages
import { makeReleasePlan } from '../../packages/portfolio-deploy/src/ymax-release-policy.mjs';

/**
 * @import { ReleasePlanReader, Target } from '../../packages/portfolio-deploy/src/ymax-release-policy.mjs'
 */

/** @param {{ gh: ReturnType<typeof makeGh>, releaseTag: string }} ReleasePlanReader */
const makeReleaseReader = ({ gh, releaseTag }) => {
  /** @type {{ url: string, assets: { url: string, name: string }[] }} */
  const release = (() => {
    // https://cli.github.com/manual/gh_release_view
    // https://docs.github.com/en/rest/releases/releases?apiVersion=2026-03-10#get-a-release
    const proc = gh(['release', 'view', releaseTag, '--json', 'assets,url'], {
      allowFailure: true,
    });
    if (proc.status !== 0) {
      return { assets: [], url: '' };
    }
    return JSON.parse(proc.stdout || '{}');
  })();

  /** @type {Set<string>} */
  const assetNames = new Set(release.assets.map(({ name }) => name));
  /** @type {Map<string, string>} */
  const assetTextCache = new Map();

  /** @type {(name: string) => string} */
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
    return /** @type {string} */ (assetTextCache.get(name));
  };

  /** @type {(name: string) => unknown} */
  const getAssetJson = name => JSON.parse(getAssetText(name));

  return { assetNames, getAssetJson, getAssetText, release };
};

/**
 * @param {{ env: typeof process.env, spawn: typeof spawnSync }} powers
 * @returns {(args: string[], opts?: { allowFailure?: boolean, encoding?: string }) => ReturnType<typeof spawnSync>}
 */
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
  const target = env.TARGET || fail('$TARGET=ymax{0,1}-{devnet,main} missing');
  const gh = makeGh({ env, spawn });
  const plan = makeReleasePlan({
    bundleIdArg: env.BUNDLE_ID || '',
    mode,
    privateArgs: env.PRIVATE_ARGS_OVERRIDES || '',
    reader: makeReleaseReader({ gh, releaseTag }),
    releaseTag,
    target: /** @type {Target} */ (target),
  });

  // https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#setting-an-output-parameter
  if (env.GITHUB_OUTPUT) {
    // Convert camelCase properties into snake_case GitHub Actions step outputs.
    for (const [key, value] of Object.entries(plan)) {
      const name = key.replace(/(?<=[^_])[A-Z]/g, L => `_${L.toLowerCase()}`);
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
