// @ts-check

/**
 * @typedef {{
 *   bundles: string[],
 *   evals: { permit: string; script: string }[],
 * }} ProposalInfo
 */

import anyTest from 'ava';
import {
  makeTestContext,
} from './core-eval-support.js';
import {
  mintIST,
  readBundles,
  passCoreEvalProposal,
} from '@agoric/synthetic-chain';

/** @typedef {Awaited<ReturnType<typeof makeTestContext>>} TestContext */
/** @type {import('ava').TestFn<TestContext>}} */
const test = anyTest;

const assetInfo = {
  /** @type {Record<string, ProposalInfo>} */
  buildAssets: {
    coreEvalInfo: {
      evals: [
        { permit: 'upgrade-vaults-liq-visibility-permit.json', script: 'upgrade-vaults-liq-visibility.js' },
      ],
      bundles: [
        'b1-0daeb28abf2bb95cd27bebe80cdcd53ecd670244cb4ca6fe07784697fa8b40bcbc8f3ab1fd92a6d7ce8197efa0d2a28716737f77c68ab2eba88b3c72179f15e0.json',
        'b1-88b8532be656b66ebc0298f916802fae523a263bd1935160ee0042cf0cb4136bdba57165a7ca70b78b37402404aaafc02400019383c6d6b076a7236a352a6ba3.json'
      ],
    },
  },
};

const dappAPI = {
  instance: 'vaultFactory', // agoricNames.instance key
  vstorageNode: 'vaultFactory',
};

const staticConfig = {
  deposit: '10000000ubld',
  installer: 'user1',
  proposer: 'validator',
  collateralPrice: 6,
  swingstorePath: '~/.agoric/data/agoric/swingstore.sqlite',
  buildInfo: Object.values(assetInfo.buildAssets),
  initialCoins: `20000000ubld`,
  ...dappAPI,
};

test.before(async t => (t.context = await makeTestContext({ testConfig: staticConfig, srcDir: 'assets' })));

test.serial('fund user1 before the upgrade', async t => {
  const { agd } = t.context;
  const addr = agd.lookup(staticConfig.installer);
  const unit = 1_000_000;
  const giveValue = 10_000_000;
  const sendValue = giveValue * unit;
  const wantMinted = 1_000_000;
  await mintIST(addr, sendValue, wantMinted, giveValue);
  t.pass();
});

test.serial('test', async t => {

  const dir = '/usr/src/proposals/b:liquidation-visibility/assets';
  const bundleInfos = await readBundles(dir);

  await passCoreEvalProposal(bundleInfos, { title: `Core eval of ${dir}`, ...staticConfig });
  t.pass();
});
