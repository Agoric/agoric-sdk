// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/no-extraneous-dependencies
import { defaultProposalBuilder } from '@agoric/inter-protocol/scripts/init-core.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import { defaultProposalBuilder as collateralBuilder } from '@agoric/inter-protocol/scripts/add-collateral-core.js';

// XXX dynamic import??
// lifted from packages/vats/decentral-test-vaults-config.json
const prop2 = {
  module: '@agoric/inter-protocol/scripts/init-core.js',
  entrypoint: 'defaultProposalBuilder',
  args: [
    {
      econCommitteeOptions: {
        committeeSize: 3,
      },
      endorsedUi: 'deadbeef',
      initialPricePct: 12_34,
      minInitialPoolLiquidity: '0',
    },
  ],
};

const collateralProp = {
  module: '@agoric/inter-protocol/scripts/add-collateral-core.js',
  entrypoint: 'defaultProposalBuilder',
  args: [
    {
      interchainAssetOptions: {
        denom: 'ibc/toyatom',
        decimalPlaces: 4,
        initialPricePct: 1234,
        keyword: 'IbcATOM',
        oracleBrand: 'ATOM',
        proposedName: 'ATOM',
      },
    },
  ],
};

test('inter-protocol proposal handles endorsedUi option', async t => {
  const publishRef = () => {};
  const install = () => {};
  const actual = await defaultProposalBuilder(
    { publishRef, install },
    ...prop2.args,
  );
  t.like(actual, {
    getManifestCall: {
      0: 'getManifestForInterProtocol',
      1: { endorsedUi: 'deadbeef', minInitialPoolLiquidity: 0n },
    },
  });
});

test('inter-protocol proposal handles initialPricePct option', async t => {
  const publishRef = () => {};
  const install = () => {};
  const actual = await collateralBuilder(
    { publishRef, install, wrapInstall: undefined },
    ...collateralProp.args,
  );
  //   t.deepEqual(actual, {});
  t.like(actual, {
    getManifestCall: {
      0: 'getManifestForAddAssetToVault',
      1: {
        interchainAssetOptions: {
          decimalPlaces: 4,
          denom: 'ibc/toyatom',
          initialPricePct: 1234,
          keyword: 'IbcATOM',
          oracleBrand: 'ATOM',
          proposedName: 'ATOM',
        },
      },
    },
  });
});
