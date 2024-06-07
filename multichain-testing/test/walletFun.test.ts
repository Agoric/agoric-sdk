import test from '@endo/ses-ava/prepare-endo.js';
import type { ExecutionContext } from 'ava';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import * as ambientChildProcess from 'node:child_process';
import * as ambientFsp from 'node:fs/promises';
import { makeE2ETools } from '../tools/e2e-tools.js';

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

type Ctx = ExecutionContext<Awaited<ReturnType<typeof makeTestContext>>>;

test.before(async (t: Ctx) => (t.context = await makeTestContext(t)));

test('sdfsdf', async (t: Ctx) => {
  const { provisionSmartWallet } = t.context;

  // TODO: ensure key is added to keyring???
  const addr = 'agoric1spy36ltduehs5dmszfrp792f0k2emcntrql3nx'; // @@@@@
  const w = await provisionSmartWallet(addr, { ATOM: 10n });
  // w.offers.executeOffer({});
  t.truthy(w);
});
