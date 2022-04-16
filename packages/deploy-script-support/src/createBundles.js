import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

const BUNDLE_SOURCE_PROGRAM = 'bundle-source';
const require = createRequire(import.meta.url);

export const createBundlesFromAbsolute = async sourceBundles => {
  const prog = require.resolve(`.bin/${BUNDLE_SOURCE_PROGRAM}`);

  const cacheToArgs = new Map();
  for (const [srcPath, bundlePath] of sourceBundles) {
    const cache = path.dirname(bundlePath);
    const base = path.basename(bundlePath);

    const match = base.match(/^bundle-(.*)\.js$/);
    assert(match, `${bundlePath} is not 'DIR/bundle-NAME.js'`);
    const bundle = match[1];

    const args = cacheToArgs.get(cache) || ['--to', cache];
    args.push(srcPath, bundle);
    cacheToArgs.set(cache, args);
  }

  for (const args of cacheToArgs.values()) {
    console.log(BUNDLE_SOURCE_PROGRAM, ...args);
    const { status } = spawnSync(prog, args, { stdio: 'inherit' });
    assert.equal(
      status,
      0,
      `${BUNDLE_SOURCE_PROGRAM} failed with status ${status}`,
    );
  }
};

export const createBundles = async (sourceBundles, dirname = '.') => {
  const absBundleSources = sourceBundles.map(([srcPath, bundlePath]) => [
    require.resolve(srcPath, { paths: [dirname] }),
    path.resolve(dirname, bundlePath),
  ]);
  return createBundlesFromAbsolute(absBundleSources);
};

export const extractProposalBundles = async (
  dirProposalBuilder,
  dirname = '.',
) => {
  const toBundle = new Map();

  await Promise.all(
    dirProposalBuilder.map(async ([dir, proposalBuilder]) => {
      const home = path.resolve(dirname, dir);
      const publishRef = x => x;
      const install = async (src, bundleName) => {
        if (bundleName) {
          const bundlePath = path.resolve(home, bundleName);
          const srcPath = require.resolve(src, { paths: [home] });
          if (toBundle.has(bundlePath)) {
            const oldSrc = toBundle.get(bundlePath);
            assert.equal(
              oldSrc,
              srcPath,
              `${bundlePath} already installed as ${oldSrc}, also given ${srcPath}`,
            );
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
