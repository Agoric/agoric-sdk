// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/no-extraneous-dependencies
import { defaultProposalBuilder } from '@agoric/inter-protocol/scripts/init-core.js';

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
      minInitialPoolLiquidity: '0',
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
