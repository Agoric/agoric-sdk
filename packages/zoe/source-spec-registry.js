import { fileURLToPath } from 'url';

/** @param {string} packagePath */
const resolveSourceSpec = packagePath =>
  fileURLToPath(import.meta.resolve(packagePath));

export const zoeSourceSpecRegistry = {
  zcf: {
    bundleName: 'contractFacet',
    packagePath: '@agoric/zoe/contractFacet.js',
    sourceSpec: resolveSourceSpec('@agoric/zoe/contractFacet.js'),
  },
  automaticRefund: {
    bundleName: 'automaticRefund',
    packagePath: '@agoric/zoe/src/contracts/automaticRefund.js',
    sourceSpec: resolveSourceSpec(
      '@agoric/zoe/src/contracts/automaticRefund.js',
    ),
  },
};

/** @param {keyof typeof zoeSourceSpecRegistry} name */
export const getZoeSourceSpec = name => zoeSourceSpecRegistry[name];
