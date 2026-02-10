import { fileURLToPath } from 'url';

/** @param {string} packagePath */
const resolveSourceSpec = packagePath =>
  fileURLToPath(import.meta.resolve(packagePath));

export const governanceSourceSpecRegistry = {
  binaryVoteCounter: {
    bundleName: 'binaryVoteCounter',
    packagePath: '@agoric/governance/src/binaryVoteCounter.js',
    sourceSpec: resolveSourceSpec(
      '@agoric/governance/src/binaryVoteCounter.js',
    ),
  },
  committee: {
    bundleName: 'committee',
    packagePath: '@agoric/governance/src/committee.js',
    sourceSpec: resolveSourceSpec('@agoric/governance/src/committee.js'),
  },
  contractGovernor: {
    bundleName: 'contractGovernor',
    packagePath: '@agoric/governance/src/contractGovernor.js',
    sourceSpec: resolveSourceSpec('@agoric/governance/src/contractGovernor.js'),
  },
  puppetContractGovernor: {
    bundleName: 'puppetContractGovernor',
    packagePath: '@agoric/governance/tools/puppetContractGovernor.js',
    sourceSpec: resolveSourceSpec(
      '@agoric/governance/tools/puppetContractGovernor.js',
    ),
  },
};

/** @param {keyof typeof governanceSourceSpecRegistry} name */
export const getGovernanceSourceSpec = name =>
  governanceSourceSpecRegistry[name];
