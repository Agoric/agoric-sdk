/**
 * Phased allowlists for tools/test scope enforcement.
 *
 * Keep this list shrinking over time. CI blocks additions and encourages removals.
 */

export const legacySrcToToolsImports = [
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
    file: 'packages/smart-wallet/src/types.ts',
    specifier: '@agoric/vats/tools/board-utils.js',
  },
  {
    file: 'packages/vats/src/core/startWalletFactory.js',
    specifier: '../../tools/board-utils.js',
  },
];

export const legacySrcToToolsFiles = [
  ...new Set(legacySrcToToolsImports.map(entry => entry.file)),
];
