const { spawnSync } = require('child_process');
const { join } = require('path');
const process = require('process');
const telescope = require('@cosmology/telescope').default;
const rimraf = require('rimraf').rimrafSync;

const protoDirs = [join(__dirname, '/../proto')];
const outPath = join(__dirname, '../src/codegen');
rimraf(outPath);

telescope({
  protoDirs,
  outPath,
  options: {
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
    interfaces: {
      enabled: true,
      useUnionTypes: false,
    },
    prototypes: {
      includePackageVar: false,
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
        encode: true,
        decode: true,
        fromPartial: true,
        toAmino: false,
        fromAmino: false,
        fromProto: true,
        toProto: true,
      },
      parser: {
        keepCase: false,
      },
      typingsFormat: {
        useDeepPartial: false,
        timestamp: 'timestamp',

        // [Defaults]
        // timestamp: 'date',
        // duration: 'duration',
        // num64: 'bigint',
        // useExact: false,
        // customTypes: {
        //   useCosmosSDKDec: true,
        // },
      },
    },
    aminoEncoding: {
      // Necessary for getSigningAgoricClient
      enabled: false,
    },
    lcdClients: {
      enabled: false,
    },
    rpcClients: {
      enabled: false,
    },
  },
})
  .then(() => {
    spawnSync('yarn', ['prettier', '--write', 'src'], {
      cwd: join(__dirname, '..'),
    });

    console.log('💅 code generated and formatted');
    console.log('ℹ️ `yarn build && yarn test` to test it.');
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
