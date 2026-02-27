/* eslint-env node */
// @ts-check
/** @import { TelescopeInput } from '@hyperweb/telescope' */

/**
 * Shared Telescope options for Agoric codegen packages.
 * Consumers can override nested fields after calling this factory.
 */
/** @type {TelescopeInput['options']} */
const baseTelescopeOptions = {
  // for ESM compatibility
  restoreImportExtension: '.js',
  tsDisable: {
    // FIXME types aren't resolving correctly
    disableAll: true,
    files: [
      'cosmos/authz/v1beta1/tx.amino.ts',
      'cosmos/staking/v1beta1/tx.amino.ts',
    ],
    patterns: ['**/*amino.ts', '**/*registry.ts'],
  },
  prototypes: {
    /**
     * Relies on tree-shaking to avoid huge bundle sizes.
     */
    enableMessageComposer: false,
    excluded: {
      packages: [
        'ibc.applications.fee.v1', // issue with parsing protos (LCD routes with nested objects in params)

        'cosmos.app.v1alpha1',
        'cosmos.app.v1beta1',
        'cosmos.base.kv.v1beta1',
        'cosmos.base.reflection.v1beta1',
        'cosmos.base.snapshots.v1beta1',
        'cosmos.base.store.v1beta1',
        'cosmos.base.tendermint.v1beta1',
        'cosmos.crisis.v1beta1',
        'cosmos.evidence.v1beta1',
        'cosmos.genutil.v1beta1',

        'cosmos.autocli.v1',

        'cosmos.msg.v1',
        'cosmos.nft.v1beta1',
        'cosmos.capability.v1beta1',
        'cosmos.orm.v1alpha1',
        'cosmos.orm.v1',
        'cosmos.slashing.v1beta1',
        'google.api',
        'ibc.core.port.v1',
        'ibc.core.types.v1',
      ],
    },
    methods: {
      fromJSON: true,
      toJSON: true,
      toAmino: false,
      fromAmino: false,
    },
    typingsFormat: {
      timestamp: 'timestamp',
      customTypes: {
        base64Lib: '@endo/base64',
        useEnhancedDecimal: true,
      },
    },
  },
  aminoEncoding: {
    // Must be enabled for getSigningAgoricClient
    enabled: false,
  },
  // We don't use these helper functions
  helperFunctions: {
    enabled: false,
  },
};

const getBaseTelescopeOptions = () => structuredClone(baseTelescopeOptions);

module.exports = {
  getBaseTelescopeOptions,
};
