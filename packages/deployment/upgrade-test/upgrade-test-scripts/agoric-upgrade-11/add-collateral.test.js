// @ts-check
import * as fspAmbient from 'fs/promises';
import * as pathAmbient from 'path';
import * as processAmbient from 'process';
import * as cpAmbient from 'child_process'; // TODO: use execa

import anyTest from 'ava';
import dbOpenAmbient from 'better-sqlite3';
import { tmpName as tmpNameAmbient } from 'tmp';

import { makeFileRW, makeWebCache, makeWebRd } from '../lib/webAsset.js';
import { makeAgd } from '../lib/agd-lib.js';
import { dbTool } from '../lib/vat-status.js';
import { voteLatestProposalAndWait } from '../lib/commonUpgradeHelpers.js';
import {
  bundleDetail,
  ensureISTForInstall,
  flags,
  getContractInfo,
  loadedBundleIds,
  testIncludes,
  txAbbr,
} from './core-eval-support.js';
import { agoric, wellKnownIdentities } from '../lib/cliHelper.js';

/** @typedef {Awaited<ReturnType<typeof makeTestContext>>} TestContext */
/** @type {import('ava').TestFn<TestContext>}} */
const test = anyTest;

/**
 * URLs of assets, including bundle hashes (to be) agreed by BLD stakers
 */
const assetInfo = {
  repo: {
    url: 'https://github.com/0xpatrickdev/agoric-vault-collateral-proposal',
    name: 'agoric-vault-collateral-proposal',
    description:
      'CoreEval Proposal and Permits for Inter Vault Collateral Type',
  },
  branch: 'auction-update',
  /** @type {Record<string, import('./core-eval-support.js').ProposalInfo>} */
  buildAssets: {
    'add-stATOM-oracle': {
      evals: [
        {
          permit: 'add-stATOM-oracles-permit.json',
          script: 'add-stATOM-oracles.js',
        },
      ],
      bundles: [
        // @@ not yet sure which bundles go with which evals
        // @@ also: some are already on chain, no?
        'bundles/b1-00093b027ab00556082702da2a5579fe311170e3bc45ec4d33dee2405f820fef3fb8b71c166fd31b5b8f2f9387e3a942649cfb7fb010c7f2aa2cca23fcbf85a4.json',
        'bundles/b1-3253e162d5dd497dbc103651d0c2be3656448d3563e80e1ca9b0a9a020013b69089f365daad492b346d8970df92fe8fcc589a71b067c6ffc10b8fd548bce6f4e.json',
      ],
    },
    'add-stATOM': {
      evals: [{ permit: 'add-stATOM-permit.json', script: 'add-stATOM.js' }],
      bundles: [
        'bundles/b1-69d40a0f9adc747213263332b35e6abc03b6b0299fc5ef27b690d406213150562d5ddd0bb92de85edd9e5cb6a1aed4f79caa067840d070babe588cafa14c4726.json',
        'bundles/b1-8e2dcf513daf9530d347112cf403e8b3fd4f384e041cfa8f0819baa06a79e7f9f2b49fa77801e2d9bbf1717652004c4e65c1ca84d7345c4b44b97512cf8d1fdd.json',
      ],
    },
  },
};

const staticConfig = {
  deposit: '10000000ubld', // 10 BLD
  installer: 'gov1', // as in: agd keys show gov1
  proposer: 'validator',
  collateralPrice: 6, // conservatively low price. TODO: look up
  swingstorePath: '~/.agoric/data/agoric/swingstore.sqlite',
  assetBase: `${assetInfo.repo.url}/raw/${assetInfo.branch}/`,
  title: assetInfo.repo.name,
  description: assetInfo.repo.description,
  buildInfo: Object.values(assetInfo.buildAssets),
};

/**
 * Provide access to the outside world via t.context.
 *
 * TODO: refactor overlap with mn2-start.test.js
 *
 * @param {*} t
 * @param {object} io
 */
const makeTestContext = async (t, io = {}) => {
  const {
    process: { env } = processAmbient,
    child_process: { execFileSync } = cpAmbient,
    dbOpen = dbOpenAmbient,
    fsp = fspAmbient,
    path = pathAmbient,
    tmpName = tmpNameAmbient,
  } = io;

  const src = makeWebRd(staticConfig.assetBase, { fetch });
  const td = await new Promise((resolve, reject) =>
    tmpName({ prefix: 'assets' }, (err, x) => (err ? reject(err) : resolve(x))),
  );
  const dest = makeFileRW(td, { fsp, path });
  // @@ Error: `t.teardown()` is not allowed in hooks
  //   t.teardown(() => assets.remove());
  const assets = makeWebCache(src, dest);
  // assume filenames don't overlap
  const bundleAssets = makeWebCache(src.join('bundles/'), dest);
  console.log(`bundleAssets: ${bundleAssets}`);

  const config = {
    assets,
    bundleAssets,
    chainId: 'agoriclocal',
    ...staticConfig,
  };

  const agd = makeAgd({ execFileSync: execFileSync }).withOpts({
    keyringBackend: 'test',
  });

  const dbPath = staticConfig.swingstorePath.replace(/^~/, env.HOME);
  const swingstore = dbTool(dbOpen(dbPath, { readonly: true }));

  const before = new Map();
  return { agd, agoric, swingstore, config, before };
};

test.before(async t => (t.context = await makeTestContext(t)));

test.serial('bundles not yet installed', async t => {
  const { swingstore } = t.context;
  const loaded = loadedBundleIds(swingstore);
  const info = staticConfig.buildInfo;
  for (const { bundles, evals } of info) {
    t.log(evals[0].script, evals.length, 'eval', bundles.length, 'bundles');
    for (const bundle of bundles) {
      const { id } = bundleDetail(bundle);
      testIncludes(t, id, loaded, 'loaded bundles', false);
    }
  }
});

/** @param {number[]} xs */
const sum = xs => xs.reduce((a, b) => a + b, 0);

/** @param {import('../lib/webAsset.js').WebCache} assets */
const readBundleSizes = async assets => {
  const info = staticConfig.buildInfo;
  const bundleSizes = await Promise.all(
    info
      .map(({ bundles }) =>
        bundles.map(b => assets.size(bundleDetail(b).fileName)),
      )
      .flat(),
  );
  const totalSize = sum(bundleSizes);
  return { bundleSizes, totalSize };
};

test.serial('core eval not permitted to add/replace installations', async t => {
  const {
    config: { assets },
  } = t.context;
  const { buildInfo } = staticConfig;

  for (const { permit } of buildInfo.map(x => x.evals).flat()) {
    const { installation } = JSON.parse(await assets.getText(permit));
    t.log(installation.produce);
    t.falsy(installation.produce);
  }
});

test.serial('save installations before the poposal', async t => {
  const { agoric, before } = t.context;
  const { installation } = await wellKnownIdentities({ agoric });
  t.log(installation.priceAggregator);
  t.truthy(installation.priceAggregator);
  before.set('installation', installation);
});

test.serial('ensure enough IST to install bundles', async t => {
  const { agd, config } = t.context;
  const { totalSize } = await readBundleSizes(config.bundleAssets);

  await ensureISTForInstall(agd, config, totalSize, {
    log: t.log,
  });
  t.pass();
});

test.serial('ensure bundles installed', async t => {
  const { agd, swingstore, agoric, config } = t.context;
  const { chainId, bundleAssets } = config;
  const loaded = loadedBundleIds(swingstore);
  const from = agd.lookup(config.installer);

  let todo = 0;
  let done = 0;
  for (const { bundles } of staticConfig.buildInfo) {
    todo += bundles.length;
    for (const bundle of bundles) {
      const { id, fileName, endoZipBase64Sha512 } = bundleDetail(bundle);
      if (loaded.includes(id)) {
        t.log('bundle already installed', id);
        done += 1;
        continue;
      }

      const bundleRd = await bundleAssets.storedPath(fileName);
      const result = await agd.tx(
        ['swingset', 'install-bundle', `@${bundleRd}`, '--gas', 'auto'],
        { from, chainId, yes: true },
      );
      t.log(txAbbr(result));
      t.is(result.code, 0);

      const info = await getContractInfo('bundles', { agoric, prefix: '' });
      t.log(info);
      done += 1;
      t.deepEqual(info, {
        endoZipBase64Sha512,
        error: null,
        installed: true,
      });
    }
  }
  t.is(todo, done);
});

test.serial('core eval proposal passes', async t => {
  const { agd, swingstore, config } = t.context;
  const from = agd.lookup(config.proposer);
  const { chainId, deposit, assets } = config;
  const info = { title: config.title, description: config.description };
  t.log('submit proposal', config.title);

  // double-check that bundles are loaded
  const loaded = loadedBundleIds(swingstore);
  const { buildInfo } = staticConfig;
  for (const { bundles } of buildInfo) {
    for (const bundle of bundles) {
      const { id } = bundleDetail(bundle);
      if (!loaded.includes(id)) {
        t.fail(`bundle ${id} not loaded`);
        return;
      }
    }
  }

  const evalNames = buildInfo
    .map(({ evals }) => evals)
    .flat()
    .map(e => [e.permit, e.script])
    .flat();
  const evalPaths = await Promise.all(evalNames.map(e => assets.storedPath(e)));
  const result = await agd.tx(
    [
      'gov',
      'submit-proposal',
      'swingset-core-eval',
      ...evalPaths,
      ...flags({ ...info, deposit }),
      ...flags({ gas: 'auto', 'gas-adjustment': '1.2' }),
    ],
    { from, chainId, yes: true },
  );
  t.log(txAbbr(result));
  t.is(result.code, 0);

  const detail = await voteLatestProposalAndWait();
  t.log(detail.proposal_id, detail.voting_end_time, detail.status);
  t.is(detail.status, 'PROPOSAL_STATUS_PASSED');
});

test.serial('priceAuthority installation was not changed', async t => {
  const { agoric, before } = t.context;
  const { installation } = await wellKnownIdentities({ agoric });
  const actual = installation.priceAggregator;
  const expected = before.get('installation').priceAggregator;
  t.log({ expected, actual });
  t.deepEqual(actual, expected);
});

test('stATOM-USD price feed instance in agoricNames', async t => {
  const { agoric } = t.context;
  const { instance } = await wellKnownIdentities({ agoric });
  testIncludes(t, 'stATOM-USD price feed', Object.keys(instance), 'instance');
});

test.todo('manager in vstorage');
test.todo('price feed in vstorage - after setting prices');
test.todo('create a vault as dapp-inter does');
