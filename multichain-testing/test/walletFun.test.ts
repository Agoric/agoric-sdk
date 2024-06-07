import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn, ExecutionContext } from 'ava';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import * as ambientChildProcess from 'node:child_process';
import * as ambientFsp from 'node:fs/promises';
import { makeE2ETools } from '../tools/e2e-tools.js';
import { generateMnemonic } from '../tools/wallet.js';

const makeTestContext = async (t: ExecutionContext) => {
  const bundleCache = await makeNodeBundleCache(
    'bundles',
    {},
    (s) => import(s),
  );
  const { writeFile } = ambientFsp;
  const { execFileSync, execFile } = ambientChildProcess;
  const tools = await makeE2ETools(t, bundleCache, {
    execFileSync, // TODO: kubernetes (or fetch?)
    execFile,
    fetch,
    setTimeout,
    writeFile,
  });
  return tools;
};

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;

test.before(async (t) => (t.context = await makeTestContext(t)));

test('provision smart wallet', async (t) => {
  const { addKey, deleteKey, provisionSmartWallet, makeQueryTool } = t.context;
  const res = await addKey('user1', generateMnemonic());

  const { address } = JSON.parse(res);
  t.log('address', address);

  const wallet = await provisionSmartWallet(address, { BLD: 10n });
  t.log('wallet', wallet);

  const queryClient = makeQueryTool();

  const walletCurrent = await queryClient.queryData(
    `published.wallet.${address}.current`,
  );

  t.like(walletCurrent, { liveOffers: [], offerToPublicSubscriberPaths: [] });

  // TODO consider key creation to test.before/test.after
  await deleteKey('user1');
});
