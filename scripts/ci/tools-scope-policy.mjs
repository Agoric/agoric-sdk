/**
 * Central policy + phased allowlists for tools/test scope enforcement.
 *
 * Keep this list shrinking over time. CI blocks additions and encourages removals.
 */

export const legacySrcToToolsImports = [
  {
    file: 'packages/SwingSet/src/controller/initializeSwingset.js',
    specifier: '../../tools/bundleTool.js',
  },
  {
    file: 'packages/agoric-cli/src/commands/perf.js',
    specifier: '@agoric/vats/tools/board-utils.js',
  },
  {
    file: 'packages/agoric-cli/src/lib/format.js',
    specifier: '@agoric/vats/tools/board-utils.js',
  },
  {
    file: 'packages/benchmark/src/benchmarkerator.js',
    specifier: '@agoric/vats/tools/board-utils.js',
  },
  {
    file: 'packages/benchmark/src/benchmarkerator.js',
    specifier: '@aglocal/boot/tools/supports.js',
  },
  {
    file: 'packages/benchmark/src/benchmarkerator.js',
    specifier: '@aglocal/boot/tools/liquidation.js',
  },
  {
    file: 'packages/orchestration/src/exos/cosmos-orchestration-account.js',
    specifier: '@agoric/vats/tools/ibc-utils.js',
  },
  {
    file: 'packages/orchestration/src/utils/address.js',
    specifier: '@agoric/vats/tools/ibc-utils.js',
  },
  {
    file: 'packages/portfolio-contract/src/pos-gmp.flows.ts',
    specifier: '@agoric/orchestration/tools/make-test-address.js',
  },
  {
    file: 'packages/smart-wallet/src/types.ts',
    specifier: '@agoric/vats/tools/board-utils.js',
  },
];

export const legacyNonTestToTestImports = [
  {
    file: 'packages/orchestration/tools/contract-tests.ts',
    specifier: '@agoric/orchestration/test/network-fakes.js',
  },
  {
    file: 'packages/swingset-liveslots/tools/vo-test-harness.js',
    specifier: '../test/liveslots-helpers.js',
  },
];

export const legacySrcToToolsFiles = [
  ...new Set(legacySrcToToolsImports.map(entry => entry.file)),
];

export const legacyNonTestToTestFiles = [
  ...new Set(legacyNonTestToTestImports.map(entry => entry.file)),
];

export const publicToolsPackages = [
  'packages/base-zone',
  'packages/notifier',
];

export const legacyPublishedToolsPackages = [
  'packages/benchmark',
  'packages/boot',
  'packages/builders',
  'packages/governance',
  'packages/network',
  'packages/notifier',
  'packages/vats',
  'packages/vm-config',
  'packages/zoe',
];
