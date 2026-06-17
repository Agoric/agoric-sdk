/* eslint-env node */
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

import { Fail, q } from '@endo/errors';

const BUNDLE_SOURCE_PROGRAM = 'bundle-source';
const req = createRequire(import.meta.url);

/** @param {Iterable<readonly [srcPath: string, bundlePath: string]>} sourceBundles */
export const createBundlesFromAbsolute = async sourceBundles => {
  const prog = req.resolve(`.bin/${BUNDLE_SOURCE_PROGRAM}`);

  const cacheToArgs = new Map();
  for (const [srcPath, bundlePath] of sourceBundles) {
    const cache = path.dirname(bundlePath);
    const base = path.basename(bundlePath);

    const match = base.match(/^bundle-(.*)\.js$/);
    if (!match) {
      throw Fail`${q(bundlePath)} is not 'DIR/bundle-NAME.js'`;
    }
    const bundle = match[1];

    const args = cacheToArgs.get(cache) || ['--cache-js', cache];
    args.push('--elide-comments');
    args.push(srcPath, bundle);
    cacheToArgs.set(cache, args);
  }

  for (const args of cacheToArgs.values()) {
    console.log(BUNDLE_SOURCE_PROGRAM, ...args);
    const env = /** @type {NodeJS.ProcessEnv} */ (
      /** @type {unknown} */ ({
        __proto__: process.env,
        LOCKDOWN_OVERRIDE_TAMING: 'severe',
      })
    );
    const { status } = spawnSync(prog, args, { stdio: 'inherit', env });
    status === 0 ||
      Fail`${q(BUNDLE_SOURCE_PROGRAM)} failed with status ${q(status)}`;
  }
};

/**
 * @param {Array<readonly [srcPath: string, bundlePath: string]>} sourceBundles
 * @param {string} [dirname]
 */
export const createBundles = async (sourceBundles, dirname = '.') => {
  const absBundleSources = sourceBundles.map(
    ([srcPath, bundlePath]) =>
      /** @type {readonly [string, string]} */ ([
        req.resolve(srcPath, { paths: [dirname] }),
        path.resolve(dirname, bundlePath),
      ]),
  );
  return createBundlesFromAbsolute(absBundleSources);
};

/**
 * @typedef {(powers: {
 *   publishRef: (x: unknown) => unknown,
 *   install: (src: string, bundleName?: string) => Promise<void>,
 * }) => Promise<unknown>} ProposalBuilder
 */
/**
 * @param {Array<readonly [dir: string, proposalBuilder: ProposalBuilder]>} dirProposalBuilder
 * @param {string} [dirname]
 */
export const extractProposalBundles = async (
  dirProposalBuilder,
  dirname = '.',
) => {
  /** @type {Map<string, string>} */
  const toBundle = new Map();

  await Promise.all(
    dirProposalBuilder.map(async ([dir, proposalBuilder]) => {
      const home = path.resolve(dirname, dir);
      /** @param {unknown} x */
      const publishRef = x => x;
      /**
       * @param {string} src
       * @param {string} [bundleName]
       */
      const install = async (src, bundleName) => {
        if (bundleName) {
          const bundlePath = path.resolve(home, bundleName);
          const srcPath = req.resolve(src, { paths: [home] });
          if (toBundle.has(bundlePath)) {
            const oldSrc = toBundle.get(bundlePath);
            oldSrc === srcPath ||
              Fail`${q(bundlePath)} already installed as ${q(
                oldSrc,
              )}, also given ${q(srcPath)}`;
          }
          toBundle.set(bundlePath, srcPath);
        }
      };
      return proposalBuilder({ publishRef, install });
    }),
  );

  return createBundlesFromAbsolute(
    [...toBundle.entries()].map(([bundlePath, srcPath]) => [
      srcPath,
      bundlePath,
    ]),
  );
};
