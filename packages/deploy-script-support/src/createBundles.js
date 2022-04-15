import path from 'path';

export const createBundles = async bundleSources => {
  const args = bundleSources.flatMap(([bundlePath, srcPath]) => [
    srcPath,
    bundlePath,
  ]);
  console.log('bundle-source', ...args);
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
          const srcPath = path.resolve(home, src);
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

  return createBundles([...toBundle.entries()]);
};
