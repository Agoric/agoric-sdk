// @ts-check

import { E, Far } from '@endo/far';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Nat } from '@endo/nat';
import { flags, makeAgd } from './agd-lib.js';
import { makeHttpClient, makeAPI } from './makeHttpClient.js';
import { dedup, makeQueryKit, poll } from './queryKit.js';
import { getBundleId } from './bundle-tools.js';
import { makeVStorage } from './batchQuery.js';

const BLD = '000000ubld';

const makeRunner = execFile => {
  const $ = (file, ...args) => {
    // console.error(cmd);

    return new Promise((resolve, reject) => {
      execFile(file, args, { encoding: 'utf8' }, (err, out) => {
        if (err) return reject(err);
        resolve(out);
      });
    });
  };
  return $;
};

export const txAbbr = tx => {
  // eslint-disable-next-line camelcase
  const { txhash, code, height, gas_used } = tx;
  // eslint-disable-next-line camelcase
  return { txhash, code, height, gas_used };
};

/**
 * @param {object} io
 * @param {import('@cosmjs/tendermint-rpc').RpcClient} io.rpc
 * @param {(ms: number, info?: unknown) => Promise<void>} io.delay
 */
const makeBlockTool = ({ rpc, delay }) => {
  let id = 1;
  const waitForBootstrap = async (period = 2000, info = {}) => {
    await null;
    for (;;) {
      id += 1;
      const data = await rpc
        .execute({ jsonrpc: '2.0', id, method: 'status', params: [] })
        .catch(_err => {});

      if (!data) throw Error('no data from status');

      if (data.jsonrpc !== '2.0') {
        await delay(period, { ...info, method: 'status' });
        continue;
      }

      const lastHeight = data.result.sync_info.latest_block_height;

      if (lastHeight !== '1') {
        return Number(lastHeight);
      }

      await delay(period, { ...info, lastHeight });
    }
  };

  let last;
  const waitForBlock = async (times = 1, info = {}) => {
    await null;
    for (let time = 0; time < times; time += 1) {
      for (;;) {
        const cur = await waitForBootstrap(2000, { ...info, last });

        if (cur !== last) {
          last = cur;
          break;
        }

        await delay(1000, info);
      }
      time += 1;
    }
  };

  return { waitForBootstrap, waitForBlock };
};
/** @typedef {ReturnType<makeBlockTool>} BlockTool */

/**
 * @param {string} fullPath
 * @param {object} opts
 * @param {string} opts.id
 * @param {import('./agd-lib.js').Agd} opts.agd
 * @param {import('./ui-kit-goals/queryKit.js').QueryTool['follow']} opts.follow
 * @param {(ms: number) => Promise<void>} opts.delay
 * @param {typeof console.log} [opts.progress]
 * @param {string} [opts.chainId]
 * @param {string} [opts.installer]
 * @param {string} [opts.bundleId]
 */
const installBundle = async (fullPath, opts) => {
  const { id, agd, delay, follow, progress = console.log } = opts;
  const { chainId = 'agoriclocal', installer = 'user1' } = opts;
  const from = await agd.lookup(installer);

  const explainDelay = (ms, info) => {
    progress('follow', { ...info, delay: ms / 1000 }, '...');
    return delay(ms);
  };
  const updates = follow('bundles', { delay: explainDelay });
  await updates.next();
  const tx = await agd.tx(
    ['swingset', 'install-bundle', `@${fullPath}`, '--gas', 'auto'],
    { from, chainId, yes: true },
  );
  progress({ id, installTx: tx.txhash, height: tx.height });

  const { value: confirm } = await updates.next();
  assert(!confirm.error, confirm.error);
  assert.equal(confirm.installed, true);
  if (opts.bundleId) {
    assert.equal(`b1-${confirm.endoZipBase64Sha512}`, opts.bundleId);
  }
  // TODO: return block height at which confirm went into vstorage
  return { tx, confirm };
};

/**
 * @param {string} address
 * @param {Record<string, number | bigint>} balances
 * @param {{
 *   agd: import('./agd-lib.js').Agd;
 *   blockTool: BlockTool;
 *   lcd: import('./ui-kit-goals/makeHttpClient.js').LCD;
 *   delay: (ms: number) => Promise<void>;
 *   chainId?: string;
 *   whale?: string;
 *   progress?: typeof console.log;
 * }} opts
 * @returns {Promise<import('../test/wallet-tools.js').MockWallet>}
 */
export const provisionSmartWallet = async (
  address,
  balances,
  {
    agd,
    blockTool,
    lcd,
    delay,
    chainId = 'agoriclocal',
    whale = 'validator',
    progress = console.log,
  },
) => {
  const { query: q } = makeQueryKit(makeVStorage(lcd));

  const vbankEntries = await q.queryData('published.agoricNames.vbankAsset');
  const byName = Object.fromEntries(
    vbankEntries.map(([_denom, info]) => [info.issuerName, info]),
  );
  progress({ send: balances, to: address });

  /**
   * @param {string} denom
   * @param {bigint} value
   */
  const sendFromWhale = async (denom, value) => {
    const amount = `${value}${denom}`;
    progress({ amount, to: address });
    // TODO: refactor agd.tx to support a per-sender object
    // that enforces one-tx-per-block so this
    // ad-hoc waitForBlock stuff is not necessary.
    await agd.tx(['bank', 'send', whale, address, amount], {
      chainId,
      from: whale,
      yes: true,
    });
    await blockTool.waitForBlock(1, { step: 'bank send' });
  };

  for await (const [name, qty] of Object.entries(balances)) {
    const info = byName[name];
    if (!info) {
      throw Error(name);
    }
    const { denom, displayInfo } = info;
    const { decimalPlaces } = displayInfo;
    const value = Nat(Number(qty) * 10 ** decimalPlaces);
    await sendFromWhale(denom, value);
  }

  progress({ provisioning: address });
  await agd.tx(
    ['swingset', 'provision-one', 'my-wallet', address, 'SMART_WALLET'],
    { chainId, from: address, yes: true },
  );

  const info = await q.queryData(`published.wallet.${address}.current`);
  progress({
    provisioned: address,
    purses: info.purses.length,
    used: info.offerToUsedInvitation.length,
  });

  /** @param {import('@agoric/smart-wallet/src/smartWallet.js').BridgeAction} bridgeAction */
  const sendAction = async bridgeAction => {
    const capData = q.toCapData(harden(bridgeAction));
    const offerBody = JSON.stringify(capData);
    const txInfo = await agd.tx(
      ['swingset', 'wallet-action', offerBody, '--allow-spend'],
      { from: address, chainId, yes: true },
    );
    return txInfo;
  };

  /** @param {import('@agoric/smart-wallet/src/offers.js').OfferSpec} offer */
  async function* executeOffer(offer) {
    const updates = q.follow(`published.wallet.${address}`, { delay });
    const txInfo = await sendAction({ method: 'executeOffer', offer });
    console.debug('spendAction', txInfo);
    for await (const update of updates) {
      //   console.log('update', address, update);
      if (update.updated !== 'offerStatus' || update.status.id !== offer.id) {
        continue;
      }
      yield update;
    }
  }

  /** @type {import('../test/wallet-tools.js').MockWallet['offers']} */
  const offers = Far('Offers', {
    executeOffer,
    /** @param {string | number} offerId */
    tryExit: offerId => sendAction({ method: 'tryExitOffer', offerId }),
  });

  /** @type {import('../test/wallet-tools.js').MockWallet['deposit']} */
  const deposit = Far('DepositFacet', {
    receive: async payment => {
      const brand = await E(payment).getAllegedBrand();
      const asset = vbankEntries.find(([_denom, a]) => a.brand === brand);
      if (!asset) throw Error(`unknown brand`);
      /** @type {Issuer} */
      const issuer = asset.issuer;
      const amt = await E(issuer).getAmountOf(payment);
      await sendFromWhale(asset.denom, amt.value);
      return amt;
    },
  });

  const { stringify: lit } = JSON;
  /**
   * @returns {Promise<{
   *   balances: Coins;
   *   pagination: unknown;
   * }>}
   *
   * @typedef {{ denom: string; amount: string }[]} Coins
   */
  const getCosmosBalances = () =>
    lcd.getJSON(`/cosmos/bank/v1beta1/balances/${address}`);
  const cosmosBalanceUpdates = () =>
    dedup(poll(getCosmosBalances, { delay }), (a, b) => lit(a) === lit(b));

  async function* vbankAssetBalanceUpdates(denom, brand) {
    for await (const { balances: haystack } of cosmosBalanceUpdates()) {
      for (const candidate of haystack) {
        if (candidate.denom === denom) {
          const amt = harden({ brand, value: BigInt(candidate.amount) });
          yield amt;
        }
      }
    }
  }

  async function* purseUpdates(brand) {
    const brandAssetInfo = Object.values(byName).find(a => a.brand === brand);
    await null;
    if (brandAssetInfo) {
      yield* vbankAssetBalanceUpdates(brandAssetInfo.denom, brand);
      return;
    }
    const updates = q.follow(`published.wallet.${address}`, { delay });
    for await (const update of updates) {
      if (update.updated !== 'balance') {
        // console.log('skip: not balance', update.updated, address);
        continue;
      }
      /** @type {Amount} */
      const amt = update.currentAmount;
      if (amt.brand !== brand) {
        // console.log('brand expected', brand, 'got', amt.brand, address);
        continue;
      }
      yield amt;
    }
  }

  /** @type {import('../test/wallet-tools.js').MockWallet['peek']} */
  const peek = Far('Peek', { purseUpdates });

  return { offers, deposit, peek, query: q };
};

/**
 * @param {{
 *   agd: import('./agd-lib.js').Agd;
 *   blockTool: BlockTool;
 *   validator?: string;
 *   chainId?: string;
 * }} opts
 * @returns {Promise<{
 *   proposal_id: string;
 *   voting_end_time: unknown;
 *   status: string;
 * }>}
 */
const voteLatestProposalAndWait = async ({
  agd,
  blockTool,
  chainId = 'agoriclocal',
  validator = 'validator',
}) => {
  await blockTool.waitForBlock(1, { before: 'get latest proposal' });
  const proposalsData = await agd.query(['gov', 'proposals']);
  const lastProposal = proposalsData.proposals.at(-1);
  const lastProposalId = lastProposal.id || lastProposal.proposal_id;

  await blockTool.waitForBlock(1, {
    before: 'deposit',
    on: lastProposalId,
  });

  const deposit = '50000000ubld';
  const sigOpts = { from: validator, chainId, yes: true };
  await agd.tx(['gov', 'deposit', lastProposalId, deposit], sigOpts);

  await blockTool.waitForBlock(1, { before: 'vote', on: lastProposalId });

  await agd.tx(['gov', 'vote', lastProposalId, 'yes'], sigOpts);

  let info = {};
  for (
    ;
    info.status !== 'PROPOSAL_STATUS_REJECTED' &&
    info.status !== 'PROPOSAL_STATUS_PASSED';
    await blockTool.waitForBlock(1, { step: `voting`, on: lastProposalId })
  ) {
    info = await agd.query(['gov', 'proposal', lastProposalId]);
    console.log(
      `Waiting for proposal ${lastProposalId} to pass (status=${info.status})`,
    );
  }

  // @ts-expect-error cast
  return info;
};

/**
 * @param {Pick<import('ava').ExecutionContext, 'log' | 'is'>} t
 * @param {{
 *   evals: { permit: string; code: string }[];
 *   title: string;
 *   description: string;
 * }} info
 * @param {{
 *   agd: import('./agd-lib.js').Agd;
 *   blockTool: BlockTool;
 *   proposer?: string;
 *   deposit?: string;
 *   chainId?: string;
 * }} opts
 */
const runCoreEval = async (
  t,
  { evals, title, description },
  {
    agd,
    blockTool,
    chainId = 'agoriclocal',
    proposer = 'validator',
    deposit = `10${BLD}`,
  },
) => {
  const from = await agd.lookup(proposer);
  const info = { title, description };
  t.log('submit proposal', title);

  // TODO? double-check that bundles are loaded

  const evalPaths = evals.map(e => [e.permit, e.code]).flat();
  t.log(evalPaths);
  console.log('await tx', evalPaths);
  const result = await agd.tx(
    [
      'gov',
      'submit-proposal',
      'swingset-core-eval',
      ...evalPaths,
      ...flags({ ...info, deposit }),
    ],
    { from, chainId, yes: true },
  );
  t.log(txAbbr(result));
  t.is(result.code, 0);

  console.log('await voteLatestProposalAndWait', evalPaths);
  const detail = await voteLatestProposalAndWait({ agd, blockTool });
  t.log(detail.proposal_id, detail.voting_end_time, detail.status);

  // TODO: how long is long enough? poll?
  await blockTool.waitForBlock(5, { step: 'run', propsal: detail.proposal_id });

  t.is(detail.status, 'PROPOSAL_STATUS_PASSED');
  return detail;
};

/**
 * @param {Pick<import('ava').ExecutionContext, 'log' | 'is'>} t
 * @param {import('../test/mintStable.js').BundleCache} bundleCache
 * @param {object} io
 * @param {import('./agd-lib.js').ExecSync} io.execFileSync
 * @param {typeof import('child_process').execFile} io.execFile
 * @param {typeof window.fetch} io.fetch
 * @param {typeof window.setTimeout} io.setTimeout
 * @param {string} [io.bundleDir]
 * @param {string} [io.rpcAddress]
 * @param {string} [io.apiAddress]
 * @param {typeof import('fs/promises').writeFile} io.writeFile
 * @param {(...parts: string[]) => string} [io.join]
 */
export const makeE2ETools = (
  t,
  bundleCache,
  {
    execFile,
    execFileSync,
    fetch,
    setTimeout,
    writeFile,
    bundleDir = 'bundles',
    rpcAddress = 'http://localhost:26657',
    apiAddress = 'http://localhost:1317',
    join = (...parts) => parts.join('/'),
  },
) => {
  const agd = makeAgd({ execFileSync }).withOpts({ keyringBackend: 'test' });
  const rpc = makeHttpClient(rpcAddress, fetch);
  const lcd = makeAPI(apiAddress, { fetch });
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  const explainDelay = (ms, info) => {
    if (typeof info === 'object' && Object.keys(info).length > 0) {
      // XXX normally we have the caller pass in the log function
      // later, but the way blockTool is factored, we have to supply it early.
      console.log({ ...info, delay: ms / 1000 }, '...');
    }
    return delay(ms);
  };
  const blockTool = makeBlockTool({ rpc, delay: explainDelay });
  const $ = makeRunner(execFile);

  // TODO: use this to start docker if necessary
  const runPackageScript = async (scriptName, ...args) =>
    $('yarn', 'run', '--silent', scriptName, ...args);

  const runMake = async (...args) => $('make', '--silent', ...args);

  const vstorage = makeVStorage(lcd);
  const qt = makeQueryKit(vstorage);

  /**
   * @param {Record<string, string>} bundleRoots
   * @param {typeof console.log} progress
   */
  const installBundles = async (bundleRoots, progress) => {
    await null;
    /** @type {Record<string, import('../test/boot-tools.js').CachedBundle>} */
    const bundles = {};
    for (const [name, rootModPath] of Object.entries(bundleRoots)) {
      const bundle = await bundleCache.load(rootModPath, name);
      bundles[name] = bundle;
      const fullPath = join(bundleDir, `bundle-${name}.json`);
      try {
        const todo = await runMake(`${fullPath}.installed`);
        if (todo.trim() === '') {
          progress({ name, upToDate: `${fullPath}.installed` });
          continue;
        }
      } catch (_err) {
        // not yet bundled
      }
      const bundleJSON = JSON.stringify(bundle);
      await writeFile(fullPath, bundleJSON);
      const shortId = getBundleId(bundle).slice(0, 8);

      if (Object.keys(bundles).length === 1) {
        progress('mint 100 IST');
        await runPackageScript('docker:make', 'mint100');
      }

      const bundleSizeMb = (bundleJSON.length / 1_000_000).toFixed(3);
      progress('installing', name, shortId, bundleSizeMb, 'Mb');
      const { tx, confirm } = await installBundle(fullPath, {
        id: shortId,
        agd,
        follow: qt.query.follow,
        progress,
        delay,
        bundleId: getBundleId(bundle),
      });
      progress({
        name,
        id: shortId,
        installHeight: tx.height,
        installed: confirm.installed,
      });

      await writeFile(
        `${fullPath}.installed`,
        JSON.stringify(
          {
            name,
            entry: rootModPath,
            bundleFile: `${fullPath}`,
            bundleSize: bundleJSON.length,
            tx,
            vstorage: confirm,
          },
          null,
          2,
        ),
      );
    }
    return harden(bundles);
  };

  /**
   * @param {{
   *   name: string;
   *   title?: string;
   *   description?: string;
   *   config?: unknown;
   * } & {
   *   behavior?: Function;
   * } & ({ builderPath: string } | { entryFile: string })} info
   */
  const buildAndRunCoreEval = async info => {
    if ('builderPath' in info) {
      throw Error('@@TODO: agoric run style');
    }
    const { name, title = name, description = title, entryFile } = info;
    const eval0 = {
      code: `bundles/deploy-${name}.js`,
      permit: `bundles/deploy-${name}-permit.json`,
    };
    await null;
    try {
      const todo = await runMake(`${eval0.code}.done`);
      if (todo.trim() === '') {
        const txt = await $('cat', `${eval0.code}.done`);
        const proposal = JSON.parse(txt);
        console.log({
          coreEval: name,
          upToDate: `${eval0.code}.done`,
          id: proposal.proposal_id,
          done: proposal.voting_end_time.slice(0, '2024-02-23T03:54'.length),
        });
        return proposal;
      }
    } catch (_err) {
      // not yet bundled
    }
    const detail = { evals: [eval0], title, description };
    await runPackageScript('build:deployer', entryFile);
    const proposal = await runCoreEval(t, detail, { agd, blockTool });
    await writeFile(
      `${eval0.code}.done`,
      JSON.stringify(
        { ...proposal, name, title, description, entry: entryFile },
        null,
        2,
      ),
    );
    return proposal;
  };

  return {
    makeQueryTool: () => makeQueryKit(vstorage).query,
    installBundles,
    runCoreEval: buildAndRunCoreEval,
    provisionSmartWallet: (address, amount) =>
      provisionSmartWallet(address, amount, { agd, blockTool, lcd, delay }),
  };
};
