#!/usr/bin/env tsx

import { execFileSync } from 'child_process'; // TODO: use execa
import * as fsp from 'fs/promises';
import * as path from 'path';
import * as process from 'process';

import { ZipReader } from '@endo/zip';
import dbOpen from 'better-sqlite3';

import assert from 'assert';
import { makeAgd } from '@agoric/synthetic-chain/src/lib/agd-lib.js';
import { agoric } from '@agoric/synthetic-chain/src/lib/cliHelper.js';
import { voteLatestProposalAndWait } from '@agoric/synthetic-chain/src/lib/commonUpgradeHelpers.js';
import { dbTool } from '@agoric/synthetic-chain/src/lib/vat-status.js';
import { type WebCache } from '@agoric/synthetic-chain/src/lib/webAsset.js';
import {
  type ProposalInfo,
  bundleDetail,
  ensureISTForInstall,
  flags,
  getContractInfo,
  loadedBundleIds,
  txAbbr,
} from './core-eval-support.js';

// TODO move into core-eval-support
const readSubmissions = async () => {
  const files = await fsp.readdir('submission');
  const names = files.filter(f => f.endsWith('.js')).map(f => f.slice(0, -3));
  const buildAssets = {} as Record<string, ProposalInfo>;
  for (const name of names) {
    const evals = [{ permit: `${name}-permit.json`, script: `${name}.js` }];
    const content = await fsp.readFile(`submission/${name}.js`, 'utf8');
    const bundleIds = content.matchAll(/b1-[a-z0-9]+/g);
    const bundles = Array.from(bundleIds).map(id => `${id}.json`);
    buildAssets[name] = { evals, bundles };
  }
  return buildAssets;
};

/**
 * URLs of assets, including bundle hashes (to be) agreed by BLD stakers
 */
const assetInfo = {
  repo: {
    name: 'zoe1',
    description: 'first upgrade of Zoe vat',
  },
  buildAssets: await readSubmissions(),
};

const staticConfig = {
  deposit: '10000000ubld', // 10 BLD
  installer: 'gov1', // as in: agd keys show gov1
  proposer: 'validator',
  collateralPrice: 6, // conservatively low price. TODO: look up
  swingstorePath: '~/.agoric/data/agoric/swingstore.sqlite',
  title: assetInfo.repo.name,
  description: assetInfo.repo.description,
  buildInfo: Object.values(assetInfo.buildAssets),
};

const makeFakeWebCache = (base: string): WebCache => {
  return {
    getText(segment: string) {
      return fsp.readFile(path.join(base, segment), 'utf8');
    },
    async storedPath(segment: string) {
      return path.join(base, segment);
    },
    async size(segment: string) {
      const info = await fsp.stat(path.join(base, segment));
      return info.size;
    },
    toString() {
      return 'fake web cache';
    },
    async remove() {
      console.warn('noop remove');
    },
  };
};

/**
 * Provide access to the outside world via context.
 *
 * TODO: refactor overlap with mn2-start.test.js
 *
 * @param {*} t
 * @param {object} io
 */
const makeTestContext = async () => {
  // assume filenames don't overlap
  const bundleAssets = makeFakeWebCache('submission');
  console.log(`bundleAssets: ${bundleAssets}`);

  const config = {
    bundleAssets,
    chainId: 'agoriclocal',
    ...staticConfig,
  };

  const agd = makeAgd({ execFileSync }).withOpts({
    keyringBackend: 'test',
  });

  const dbPath = staticConfig.swingstorePath.replace(/^~/, process.env.HOME!);
  const swingstore = dbTool(dbOpen(dbPath, { readonly: true }));

  const before = new Map();
  return { agd, agoric, swingstore, config, before, fetch };
};

// XXX vestige of Ava
const context = await makeTestContext();

const step = async (name: string, fn: Function) => {
  console.log(name);
  await fn();
};

await step('bundles not yet installed', async () => {
  const loaded = loadedBundleIds(context.swingstore);
  const info = staticConfig.buildInfo;
  for (const { bundles, evals } of info) {
    console.log(
      evals[0].script,
      evals.length,
      'eval',
      bundles.length,
      'bundles',
    );
    for (const bundle of bundles) {
      const { id } = bundleDetail(bundle);
      assert(!loaded.includes(id));
    }
  }
});

const bundleEntry = async (bundle: { endoZipBase64: string }) => {
  const getZipReader = async () => {
    const { endoZipBase64 } = bundle;
    const toBlob = (base64, type = 'application/octet-stream') =>
      fetch(`data:${type};base64,${base64}`).then(res => res.blob());
    const zipBlob = await toBlob(endoZipBase64);
    // https://github.com/endojs/endo/issues/1811#issuecomment-1751499626
    const buffer = await zipBlob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    return new ZipReader(bytes);
  };

  const getCompartmentMap = zipRd => {
    const { content } = zipRd.files.get('compartment-map.json');
    const td = new TextDecoder();
    const cmap = JSON.parse(td.decode(content));
    return cmap;
  };

  const zipRd = await getZipReader();
  const cmap = getCompartmentMap(zipRd);
  return cmap.entry;
};

await step('bundle names: compartmentMap.entry', async () => {
  const { bundleAssets } = context.config;
  const info = staticConfig.buildInfo;
  for (const { bundles, evals } of info) {
    for (const bundleRef of bundles) {
      const { fileName } = bundleDetail(bundleRef);
      const bundle = JSON.parse(await bundleAssets.getText(fileName));
      const entry = await bundleEntry(bundle);
      console.log(entry, fileName.slice(0, 'b1-12345'.length));
      assert(entry.compartment);
      assert(entry.module);
    }
  }
});

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

const readBundleSizes = async (assets: WebCache) => {
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

await step('ensure enough IST to install bundles', async () => {
  const { agd, config } = context;
  const { totalSize } = await readBundleSizes(config.bundleAssets);

  await ensureISTForInstall(agd, config, totalSize, {
    log: console.log,
  });
});

await step('ensure bundles installed', async () => {
  const { agd, swingstore, agoric, config } = context;
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
        console.log('bundle already installed', id);
        done += 1;
        continue;
      }

      const bundleRd = await bundleAssets.storedPath(fileName);
      const result = await agd.tx(
        ['swingset', 'install-bundle', `@${bundleRd}`, '--gas', 'auto'],
        { from, chainId, yes: true },
      );
      console.log(txAbbr(result));
      assert.equal(result.code, 0);

      const info = await getContractInfo('bundles', { agoric, prefix: '' });
      console.log(info);
      done += 1;
      assert.deepEqual(info, {
        endoZipBase64Sha512,
        error: null,
        installed: true,
      });
    }
  }
  assert.equal(todo, done);
});

await step('core eval proposal passes', async () => {
  const { agd, swingstore, config } = context;
  const from = agd.lookup(config.proposer);
  const { chainId, deposit, bundleAssets } = config;
  const info = { title: config.title, description: config.description };
  console.log('submit proposal', config.title);

  // double-check that bundles are loaded
  const loaded = loadedBundleIds(swingstore);
  const { buildInfo } = staticConfig;
  for (const { bundles } of buildInfo) {
    for (const bundle of bundles) {
      const { id } = bundleDetail(bundle);
      if (!loaded.includes(id)) {
        assert.fail(`bundle ${id} not loaded`);
      }
    }
  }

  const evalNames = buildInfo
    .map(({ evals }) => evals)
    .flat()
    .map(e => [e.permit, e.script])
    .flat();
  const evalPaths = await Promise.all(
    evalNames.map(e => bundleAssets.storedPath(e)),
  );
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
  console.log(txAbbr(result));
  assert.equal(result.code, 0);

  const detail = await voteLatestProposalAndWait();
  console.log(detail.proposal_id, detail.voting_end_time, detail.status);
  assert.equal(detail.status, 'PROPOSAL_STATUS_PASSED');
});
