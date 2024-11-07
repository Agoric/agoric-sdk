// @ts-check

/* eslint-disable import/order -- https://github.com/endojs/endo/issues/1235 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { createRequire } from 'module';
import { env as ambientEnv } from 'node:process';
import * as ambientChildProcess from 'node:child_process';
import * as ambientFsp from 'node:fs/promises';
import { E, passStyleOf } from '@endo/far';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { makeZoeKitForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { AmountMath } from '@agoric/ertp';

import { makeStableFaucet } from './mintStable.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';

import {
  permit,
  startAirdrop,
  makeTerms,
} from '../../../src/examples/airdrop/airdrop.proposal.js';
import {
  produceBoardAuxManager,
  permit as boardAuxPermit,
} from '../../../src/examples/airdrop/platform-goals/board-aux.core.js';
import { extract } from '@agoric/vats/src/core/utils.js';
import { head } from '../../../src/examples/airdrop/helpers/objectTools.js';
import {
  generateMerkleRoot,
  merkleTreeAPI,
} from '../../../src/examples/airdrop/merkle-tree/index.js';
import { simulateClaim } from './actors.js';
import {
  messagesObject,
  OPEN,
} from '../../../src/examples/airdrop/airdrop.contract.js';
import { agoricGenesisAccounts as accounts } from './data/genesis.keys.js';
import { makeE2ETools } from './tools/e2e-tools.js';
import { makeBundleCacheContext } from './tools/bundle-tools.js';
import {
  bootAndInstallBundles,
  makeMockTools,
  mockBootstrapPowers,
} from './boot-tools.js';
import {
  makeAgoricNames,
  makeNameProxy,
} from './tools/ui-kit-goals/name-service-client.js';
import { makeTracer } from '@agoric/internal';
import { mockWalletFactory } from '../../../tools/wallet-tools.js';
import {
  oneDay,
  TimeIntervals,
} from '../../../src/examples/airdrop/helpers/time.js';

const agoricPubkeys = accounts.map(x => x.pubkey.key);

export const getBundleId = bundle => `b1-${bundle.endoZipBase64Sha512}`;

/** @typedef {typeof import('../../../src/examples/airdrop/airdrop.contract.js').start} AssetContractFn */

const myRequire = createRequire(import.meta.url);

const AIRDROP_TIERS_STATIC = [9000n, 6500n, 3500n, 1500n, 750n];

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;
const publicKeys = accounts.map(x => x.pubkey.key);

const defaultCustomTerms = {
  initialPayoutValues: AIRDROP_TIERS_STATIC,
  targetNumberOfEpochs: 5,
  targetEpochLength: TimeIntervals.SECONDS.ONE_DAY,
  targetTokenSupply: 10_000_000n,
  tokenName: 'Tribbles',
  startTime: oneDay,
  merkleRoot: generateMerkleRoot(publicKeys),
};

const UNIT6 = 1_000_000n;

const timerTracer = label => value => {
  console.log(label, '::: latest #### ', value);
  return value;
};

const nodeRequire = createRequire(import.meta.url);

const bundleRoots = {
  tribblesAirdrop: nodeRequire.resolve(
    '../../../src/examples/airdrop/airdrop.contract.js',
  ),
};

const scriptRoots = {
  tribblesAirdrop: nodeRequire.resolve(
    '../../../src/examples/airdrop/airdrop.proposal.js',
  ),
};

const makeTestContext = async t => {
  const bc = await makeBundleCacheContext(t);

  const { E2E } = ambientEnv;
  const { execFileSync, execFile } = ambientChildProcess;
  const { writeFile } = ambientFsp;

  /** @type {ExecSync} */
  const dockerExec = (file, args, opts = { encoding: 'utf-8' }) => {
    const workdir = '/workspace/contract';
    const execArgs = ['compose', 'exec', '--workdir', workdir, 'agd'];
    opts.verbose &&
      console.log('docker compose exec', JSON.stringify([file, ...args]));
    return execFileSync('docker', [...execArgs, file, ...args], opts);
  };

  console.time('makeTestTools');
  console.timeLog('makeTestTools', 'start');
  // installBundles,
  // runCoreEval,
  // provisionSmartWallet,
  // runPackageScript???
  const tools = await (E2E
    ? makeE2ETools(t, bc.bundleCache, {
        execFileSync: dockerExec,
        execFile,
        fetch,
        setTimeout,
        writeFile,
      })
    : makeMockTools(t, bc.bundleCache));
  console.timeEnd('makeTestTools');

  return { ...tools, ...bc };
};

test.before(async t => (t.context = await makeTestContext(t)));

test.serial('well-known brand (ATOM) is available', async t => {
  const { makeQueryTool } = t.context;
  const hub0 = makeAgoricNames(makeQueryTool());
  /** @type {WellKnown} */
  // @ts-expect-error cast
  const agoricNames = makeNameProxy(hub0);
  await null;
  const brand = {
    ATOM: await agoricNames.brand.ATOM,
  };
  t.log(brand);
  t.is(passStyleOf(brand.ATOM), 'remotable');
});

test.serial('install bundle: tribblesAirdrop / send', async t => {
  const { installBundles } = t.context;
  console.time('installBundles');
  console.timeLog('installBundles', Object.keys(bundleRoots).length, 'todo');
  const bundles = await installBundles(bundleRoots, (...args) =>
    console.timeLog('installBundles', ...args),
  );
  console.timeEnd('installBundles');

  console.log('------------------------');
  const id = getBundleId(bundles.tribblesAirdrop);

  const shortId = id.slice(0, 8);
  t.log('tribblesAirdrop', shortId);
  t.is(id.length, 3 + 128, 'bundleID length');
  t.regex(id, /^b1-.../);

  Object.assign(t.context.shared, { tribblesBundleId: id, bundles });
});

test.serial(
  'deploy contract with core eval: tribblesAirdrop / send',
  async t => {
    const { powers, bundles } = await bootAndInstallBundles(t, bundleRoots);

    const bundleID = getBundleId(bundles.tribblesAirdrop);
    const airdropPowers = extract(permit, powers);
    const instance = await startAirdrop(airdropPowers, {
      options: {
        tribblesAirdrop: { bundleID },
        customTerms: defaultCustomTerms,
      },
    });

    const { zoe, namesByAddressAdmin } = powers.consume;

    await startAirdrop(airdropPowers, {
      options: {
        tribblesAirdrop: { bundleID },
        customTerms: { ...defaultCustomTerms },
      },
    });

    const smartWalletIssuers = {
      Invitation: await E(zoe).getInvitationIssuer(),
      IST: await E(zoe).getFeeIssuer(),
    };

    const [invitationBrand, feeBrand] = await Promise.all(
      [smartWalletIssuers.Invitation, smartWalletIssuers.IST].map(i =>
        E(i).getBrand(),
      ),
    );

    // TODO: use CapData across vats
    // const boardMarshaller = await E(board).getPublishingMarshaller();
    const walletFactory = mockWalletFactory(
      { zoe, namesByAddressAdmin },
      smartWalletIssuers,
    );
    const adminWallet = await walletFactory.makeSmartWallet(
      'agoric1jng25adrtpl53eh50q7fch34e0vn4g72j6zcml',
    );
    console.log({ instance });

    const adminInvitationPayment = await (
      await E(adminWallet.peek).purseUpdates(invitationBrand)
    ).next();

    t.deepEqual(adminInvitationPayment, {});
  },
);

test.serial(
  'deploy contract with core eval: tribblesAirdrop / send',
  async t => {
    const { runCoreEval } = t.context;
    const { bundles } = t.context.shared;
    const bundleID = getBundleId(bundles.tribblesAirdrop);

    const name = 'send';
    const result = await runCoreEval({
      name,
      behavior: startAirdrop,
      entryFile: scriptRoots.tribblesAirdrop,
      config: {
        options: {
          terms: defaultCustomTerms,
          tribblesAirdrop: { bundleID },
          merkleRoot: defaultCustomTerms.merkleRoot,
        },
      },
    });

    t.log(result.voting_end_time, '#', result.proposal_id, name);
    t.like(result, {
      content: {
        '@type': '/agoric.swingset.CoreEvalProposal',
      },
      status: 'PROPOSAL_STATUS_PASSED',
    });
  },
);
