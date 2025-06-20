// @ts-check
/** global harden */
import { makeSmartWalletKit, LOCAL_CONFIG } from '@agoric/client-utils';
import { assert } from '@endo/errors';
import { E, Far } from '@endo/far';
import { Nat } from '@endo/nat';
import { makePromiseKit } from '@endo/promise-kit';
import { makeTracer } from '@agoric/internal';
import { flags, makeAgd, makeCopyFiles } from './chaind-lib.js';
import { makeHttpClient, makeAPI } from './makeHttpClient.js';
import { dedup, makeQueryKit, poll } from './queryKit.js';
import { makeVStorage } from './batchQuery.js';
import { makeRetryUntilCondition } from './sleep.js';

/**
 * @import {OfferSpec} from '@agoric/smart-wallet/src/offers.js';
 * @import {UpdateRecord} from '@agoric/smart-wallet/src/smartWallet.js';
 *
 * @import { EnglishMnemonic } from '@cosmjs/crypto';
 * @import { RetryUntilCondition } from './sleep.js';
 */

const trace = makeTracer('E2ET');

const PROVISIONING_POOL_ADDR = 'agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346';

const BLD = '000000ubld';

export const txAbbr = tx => {
  const { txhash, code, height, gas_used } = tx;

  return { txhash, code, height, gas_used };
};

/**
 * @param {object} io
 * @param {import('@cosmjs/tendermint-rpc').RpcClient} io.rpc
 * @param {(ms: number, info?: unknown) => Promise<void>} io.delay
 */
export const makeBlockTool = ({ rpc, delay }) => {
  let id = 1;
  const waitForBootstrap = async (period = 2000, info = {}) => {
    await null;
    for (;;) {
      id += 1;
      const data = await rpc
        .execute({ jsonrpc: '2.0', id, method: 'status', params: [] })
        .catch(_err => {});

      if (data?.jsonrpc !== '2.0') {
        await delay(period, { ...info, method: 'status' });
        continue;
      }

      const lastHeight = data.result.sync_info.latest_block_height;
      const earliestHeight = data.result.sync_info.earliest_block_height;

      if (lastHeight !== earliestHeight) {
        return Number(lastHeight);
      }

      await delay(period, { ...info, lastHeight });
    }
  };

  /**
   * @param {number} [advance] number of blocks to wait for
   * @param {object} [info] add to logging
   * @returns {Promise<void>}
   */
  const waitForBlock = async (advance = 1, info = {}) => {
    await null;
    const startHeight = await waitForBootstrap();
    for (
      let latestHeight = startHeight;
      latestHeight < startHeight + advance;

    ) {
      // Give some time for a new block
      await delay(1000, { ...info, latestHeight });
      latestHeight = await waitForBootstrap(2000, {
        ...info,
        startHeight,
      });
    }
  };

  return { waitForBlock };
};
/** @typedef {ReturnType<makeBlockTool>} BlockTool */

/**
 * @param {string} fullPath
 * @param {object} opts
 * @param {string} opts.id
 * @param {import('./chaind-lib.js').Agd} opts.agd
 * @param {import('./queryKit.js').QueryTool['follow']} opts.follow
 * @param {(ms: number) => Promise<void>} opts.delay
 * @param {typeof console.log} [opts.progress]
 * @param {string} [opts.chainId]
 * @param {string} [opts.installer]
 * @param {string} [opts.bundleId]
 * @param {RetryUntilCondition} opts.retryUntilCondition
 */
const installBundle = async (fullPath, opts) => {
  const { id, agd, progress = console.log } = opts;
  const {
    chainId = 'agoriclocal',
    installer = 'faucet',
    retryUntilCondition,
  } = opts;
  const from = await agd.lookup(installer);
  // const explainDelay = (ms, info) => {
  //   progress('follow', { ...info, delay: ms / 1000 }, '...');
  //   return delay(ms);
  // };
  // const updates = follow('bundles', { delay: explainDelay });
  // await updates.next();
  const tx = await retryUntilCondition(
    () =>
      agd.tx(['swingset', 'install-bundle', `@${fullPath}`, '--gas', 'auto'], {
        from,
        chainId,
        yes: true,
      }),
    result => !!result?.txhash,
    `install bundle ${fullPath}`,
  );
  assert(tx);

  progress({ id, installTx: tx.txhash, height: tx.height });

  // const { value: confirm } = await updates.next();
  // assert(!confirm.error, confirm.error);
  // assert.equal(confirm.installed, true);
  // if (opts.bundleId) {
  //   assert.equal(`b1-${confirm.endoZipBase64Sha512}`, opts.bundleId);
  // }
  // TODO: return block height at which confirm went into vstorage
  return { tx, confirm: { installed: true } };
};

/**
 * @param {string} address
 * @param {Record<string, number | bigint>} balances
 * @param {{
 *   agd: import('./chaind-lib.js').Agd;
 *   blockTool: BlockTool;
 *   lcd: import('./makeHttpClient.js').LCD;
 *   delay: (ms: number) => Promise<void>;
 *   retryUntilCondition: RetryUntilCondition;
 *   chainId?: string;
 *   whale?: string;
 *   progress?: typeof console.log;
 *   q?: import('./queryKit.js').QueryTool;
 * }} opts
 */
const provisionSmartWalletAndMakeDriver = async (
  address,
  balances,
  {
    agd,
    blockTool,
    lcd,
    delay,
    chainId = 'agoriclocal',
    whale = 'faucet',
    progress = console.log,
    q = makeQueryKit(makeVStorage(lcd)).query,
    retryUntilCondition,
  },
) => {
  trace('provisionSmartWallet', address);
  /**
   * @param {string} [addr]
   * @returns {Promise<{
   *   balances: Coins;
   *   pagination: unknown;
   * }>}
   *
   * @typedef {{ denom: string; amount: string }[]} Coins
   */
  const getCosmosBalances = (addr = address) =>
    lcd.getJSON(`/cosmos/bank/v1beta1/balances/${addr}`);
  progress(`${address} before whale`, await getCosmosBalances());

  // TODO: skip this query if balances is {}
  const vbankEntries = await q.queryData('published.agoricNames.vbankAsset');
  const byName = Object.fromEntries(
    // reverse entries, so we get the latest view on the denom since there are
    // multiple entries in the testing environment
    [...vbankEntries].reverse().map(([_, info]) => {
      return [info.issuerName, info];
    }),
  );
  progress({ send: balances, to: address });

  /**
   * Submit the `bank send` and wait for the next block.
   * (Clients have an obligation not to submit >1 tx/block.)
   *
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
    await blockTool.waitForBlock(1, { address, step: 'bank send' });
  };

  const balanceEntries = Object.entries(balances);
  for await (const [name, qty] of balanceEntries) {
    const info = byName[name];
    if (!info) {
      throw Error(`${name} not found in vbank assets`);
    }
    const { denom, displayInfo } = info;
    const { decimalPlaces } = displayInfo;
    const value = Nat(Number(qty) * 10 ** decimalPlaces);
    await sendFromWhale(denom, value);
  }

  const afterWhale = await retryUntilCondition(
    () => getCosmosBalances(),
    ({ balances }) => {
      // XXX ensures there is at least some faucet but doesn't check that the balance went up
      return balances.length >= balanceEntries.length;
    },
    `${address} received tokens from whale`,
  );
  progress(`${address} after whale`, afterWhale);

  progress({ provisioning: address });
  await agd.tx(
    ['swingset', 'provision-one', 'my-wallet', address, 'SMART_WALLET'],
    { chainId, from: address, yes: true },
  );

  trace('waiting for wallet to appear in vstorage', address);
  try {
    const info = await retryUntilCondition(
      () => q.queryData(`published.wallet.${address}.current`),
      result => !!result,
      `wallet in vstorage ${address}`,
    );
    progress({
      provisioned: address,
      purses: info.purses.length,
      used: info.offerToUsedInvitation.length,
    });
  } catch (err) {
    trace('wallet balances', await getCosmosBalances());
    trace(
      'provisioning pool balances',
      await getCosmosBalances(PROVISIONING_POOL_ADDR),
    );
    trace(
      'whale balances',
      await getCosmosBalances(agd.keys.showAddress(whale)),
    );
    throw err;
  }

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

  /** @param {OfferSpec} offer */
  async function* executeOffer(offer) {
    /** @type {AsyncGenerator<UpdateRecord, void, void>} */
    const updates = q.follow(`published.wallet.${address}`, { delay });
    const txInfo = await sendAction({ method: 'executeOffer', offer });
    trace('spendAction', txInfo);
    for await (const update of updates) {
      trace('update', address, update);
      if (update.updated !== 'offerStatus' || update.status.id !== offer.id) {
        continue;
      }
      yield update;
    }
  }

  // XXX  /** @type {import('../test/wallet-tools.js').MockWallet['offers']} */
  const offers = Far('Offers', {
    executeOffer,
    /** @param {OfferSpec} offer */
    executeOfferTx: offer => sendAction({ method: 'executeOffer', offer }),
    /** @param {string | number} offerId */
    tryExit: offerId => sendAction({ method: 'tryExitOffer', offerId }),
  });

  // XXX  /** @type {import('../test/wallet-tools.js').MockWallet['deposit']} */
  const deposit = Far('DepositFacet', {
    getAddress: () => address,
    receive: async payment => {
      const brand = await E(payment).getAllegedBrand();
      const asset = vbankEntries.find(([_denom, a]) => a.brand === brand);
      if (!asset) throw Error(`unknown brand`);
      /** @type {Issuer<'nat'>} */
      const issuer = asset.issuer;
      const amt = await E(issuer).getAmountOf(payment);
      await sendFromWhale(asset.denom, amt.value);
      return amt;
    },
  });

  const { stringify: lit } = JSON;
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

  // @ts-expect-error FIXME no type
  /** @type {import('../test/wallet-tools.js').MockWallet['peek']} */
  const peek = Far('Peek', { purseUpdates });

  return { offers, deposit, peek, query: q };
};

/** @typedef {Awaited<ReturnType<typeof provisionSmartWalletAndMakeDriver>>} WalletDriver */

/**
 * @param {{
 *   agd: import('./chaind-lib.js').Agd;
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
  validator = 'genesis',
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
    trace(
      `Waiting for proposal ${lastProposalId} to pass (status=${info.status})`,
    );
  }

  // @ts-expect-error cast
  return { ...info, proposal_id: lastProposalId };
};

/**
 * @param {bigint} period
 * @param {{
 *   agd: import('./chaind-lib.js').Agd;
 *   blockTool: BlockTool;
 *   copyFiles: ReturnType<typeof makeCopyFiles>;
 *   proposer?: string;
 *   deposit?: string;
 *   chainId?: string;
 *   title?: string;
 *   summary?: string;
 * }} opts
 */
const changeVotingPeriod = async (
  period,
  {
    agd,
    blockTool,
    copyFiles,
    chainId = 'agoriclocal',
    proposer = 'genesis',
    deposit = `1${BLD}`,
    title = `change voting period to ${period}s`,
    summary = title,
  },
) => {
  const { params } = await agd.query(['gov', 'params']);
  const proposal = {
    messages: [
      {
        '@type': '/cosmos.gov.v1.MsgUpdateParams',
        authority: 'agoric10d07y265gmmuvt4z0w9aw880jnsr700jgl36x9', // gov module acct
        params: {
          ...params,
          voting_period: `${period}s`,
          // XXX odd... multichain-testing genesis has 0 values???
          veto_threshold: '0.334',
          threshold: '0.667',
        },
      },
    ],
    deposit,
    title,
    summary,
  };

  const from = await agd.lookup(proposer);

  const destDir = '/tmp/contracts'; // XXX peek at makeCopyFiles
  const fname = 'proposal.json';
  await copyFiles([], { [fname]: JSON.stringify(proposal) });
  await agd.tx(['gov', 'submit-proposal', `${destDir}/${fname}`], {
    from,
    chainId,
    yes: true,
  });
  trace('voteLatestProposalAndWait', title);
  const detail = await voteLatestProposalAndWait({ agd, blockTool });
  trace(detail.proposal_id, detail.voting_end_time, detail.status);
  assert(detail.status, 'PROPOSAL_STATUS_PASSED');
  return detail;
};

/**
 * @param {typeof console.log} log
 * @param {{
 *   evals: { permit: string; code: string }[];
 *   title: string;
 *   description: string;
 * }} info
 * @param {{
 *   agd: import('./chaind-lib.js').Agd;
 *   blockTool: BlockTool;
 *   proposer?: string;
 *   deposit?: string;
 *   chainId?: string;
 * }} opts
 */
const runCoreEval = async (
  log,
  { evals, title, description },
  {
    agd,
    blockTool,
    chainId = 'agoriclocal',
    proposer = 'genesis',
    deposit = `1${BLD}`,
  },
) => {
  const from = await agd.lookup(proposer);
  const info = { title, description };
  log('submit proposal', title);

  // TODO? double-check that bundles are loaded

  const evalPaths = evals.map(e => [e.permit, e.code]).flat();
  log(evalPaths);
  trace('await tx', evalPaths);
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
  log(txAbbr(result));
  // FIXME TypeError#1: unrecognized details 0
  // assert(result.code, 0);

  trace('await voteLatestProposalAndWait', evalPaths);
  const detail = await voteLatestProposalAndWait({ agd, blockTool });
  log(detail.proposal_id, detail.voting_end_time, detail.status);

  // TODO: how long is long enough? poll?
  await blockTool.waitForBlock(5, {
    step: 'run',
    proposal: detail.proposal_id,
  });

  assert(detail.status, 'PROPOSAL_STATUS_PASSED');
  return detail;
};

/**
 * @deprecated use `@agoric/client-utils` instead
 *
 * @param {typeof console.log} log
 * @param {import('@agoric/swingset-vat/tools/bundleTool.js').BundleCache} bundleCache
 * @param {object} io
 * @param {typeof import('child_process').execFileSync} io.execFileSync
 * @param {typeof import('child_process').execFile} io.execFile
 * @param {typeof window.fetch} io.fetch
 * @param {typeof window.setTimeout} io.setTimeout
 * @param {string} [io.bundleDir]
 * @param {string} [io.rpcAddress]
 * @param {string} [io.apiAddress]
 * @param io.retryUntilCondition
 * @param {(...parts: string[]) => string} [io.join]
 * @param {RetryUntilCondition} [io.retryUntilCondition]
 */
export const makeE2ETools = async (
  log,
  bundleCache,
  {
    execFileSync,
    fetch,
    setTimeout,
    rpcAddress = 'http://localhost:26657',
    apiAddress = 'http://localhost:1317',
    retryUntilCondition = makeRetryUntilCondition({ log, setTimeout }),
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
      trace('delay', { ...info, delay: ms / 1000 }, '...');
    }
    return delay(ms);
  };
  const blockTool = makeBlockTool({ rpc, delay: explainDelay });

  const vstorage = makeVStorage(lcd);
  const qt = makeQueryKit(vstorage);

  /**
   * @param {Iterable<string>} fullPaths
   * @param {typeof console.log} progress
   */
  const installBundles = async (fullPaths, progress) => {
    await null;
    // @ts-expect-error FIXME no type
    /** @type {Record<string, import('../test/boot-tools.js').CachedBundle>} */
    const bundles = {};
    // for (const [name, rootModPath] of Object.entries(bundleRoots)) {
    for (const fullPath of fullPaths) {
      const { tx, confirm } = await installBundle(fullPath, {
        id: fullPath,
        agd,
        follow: qt.query.follow,
        progress,
        delay,
        // bundleId: getBundleId(bundle),
        bundleId: undefined,
        retryUntilCondition,
      });
      progress({
        // name,
        id: fullPath,
        installHeight: tx.height,
        installed: confirm.installed,
      });
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
   * }} info
   */
  const buildAndRunCoreEval = async info => {
    if ('builderPath' in info) {
      throw Error('@@TODO: agoric run style');
    }
    const { name, title = name, description = title } = info;
    const eval0 = {
      code: `/tmp/contracts/${name}.js`,
      permit: `/tmp/contracts/${name}-permit.json`,
    };

    const detail = { evals: [eval0], title, description };
    // await runPackageScript('build:deployer', entryFile);
    const proposal = await runCoreEval(log, detail, { agd, blockTool });
    return proposal;
  };

  const copyFiles = makeCopyFiles({ execFileSync, log });

  /**
   * @deprecated use `@agoric/client-utils` instead
   */
  const vstorageClient = makeQueryKit(vstorage).query;

  /** @type {import('@agoric/client-utils').SmartWalletKit} */
  const smartWalletKit = await makeSmartWalletKit(
    {
      fetch,
      delay,
    },
    LOCAL_CONFIG,
  );

  return {
    vstorageClient,
    smartWalletKit,
    installBundles,
    runCoreEval: buildAndRunCoreEval,
    /**
     * @param {string} address
     * @param {Record<string, bigint>} amount - should include BLD to pay for provisioning
     */
    provisionSmartWallet: (address, amount) =>
      provisionSmartWalletAndMakeDriver(address, amount, {
        agd,
        blockTool,
        lcd,
        delay,
        q: vstorageClient,
        retryUntilCondition,
      }),
    /**
     * @param {string} name
     * @param {EnglishMnemonic | string} mnemonic
     */
    addKey: async (name, mnemonic) =>
      agd.keys.add(
        name,
        // @ts-expect-error XXX
        Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic,
      ),
    /** @param {string} name */
    deleteKey: async name => agd.keys.delete(name),
    copyFiles,
    agd,
    /** @param {bigint} secs */
    changeVotingPeriod: secs =>
      changeVotingPeriod(secs, { agd, blockTool, copyFiles }),
  };
};

/**
 * Seat-like API from wallet updates
 *
 * @param {AsyncGenerator<import('@agoric/smart-wallet/src/smartWallet.js').UpdateRecord>} updates
 */
export const seatLike = updates => {
  const sync = {
    result: makePromiseKit(),
    /** @type {PromiseKit<AmountKeywordRecord>} */
    payouts: makePromiseKit(),
  };
  (async () => {
    await null;
    try {
      // XXX an error here is somehow and unhandled rejection
      for await (const update of updates) {
        if (update.updated !== 'offerStatus') continue;
        if ('error' in update.status) {
          sync.result.reject(update.status.error);
          sync.payouts.reject(update.status.error);
          return;
        }
        const { result, payouts } = update.status;
        if ('result' in update.status) sync.result.resolve(result);
        if ('payouts' in update.status && payouts) {
          sync.payouts.resolve(payouts);
          trace('paid out', update.status.id);
          return;
        }
      }
    } catch (reason) {
      sync.result.reject(reason);
      sync.payouts.reject(reason);
      throw reason;
    }
  })();

  return harden({
    getOfferResult: () => sync.result.promise,
    getPayoutAmounts: () => sync.payouts.promise,
  });
};

/** @param {Awaited<ReturnType<typeof provisionSmartWalletAndMakeDriver>>} wallet */
export const makeDoOffer = wallet => {
  /** @type {(offer: OfferSpec) => Promise<void>} */
  const doOffer = async offer => {
    const updates = wallet.offers.executeOffer(offer);
    // const seat = seatLike(updates);
    // const result = await seat.getOfferResult();
    await seatLike(updates).getPayoutAmounts();
    // return result;
  };

  return doOffer;
};

/** @typedef {Awaited<ReturnType<makeE2ETools>>} E2ETools */
