import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { createRequire } from 'node:module';
import {
  AgoricCalc,
  makeOrchestration,
  makeVStorage,
  withVTransfer,
} from '../../tools/agoric-mock.js';
import { makeCCTP, NobleCalc, withForwarding } from '../../tools/noble-mock.js';
import { makeCosmosChain, pickChain } from '../../tools/cosmoverse-mock.js';
import {
  makeERC20,
  makeEthChain,
  makeEventCounter,
} from '../../tools/eth-mock.js';
import type { EthChain } from '../../tools/eth-mock.js';
import { start as startContract } from '../../src/examples/quickSend.contract.js';

const nodeRequire = createRequire(import.meta.url);
const contractName = 'quickSend';
const contractFile = nodeRequire.resolve(
  `../../src/examples/quickSend.contract.js`,
);

type StartFn = typeof import('../../src/examples/quickSend.contract.js').start;

const todo = () => assert.fail('TODO');

const logged = (it, label) => {
  console.debug(label, it);
  return it;
};

test.before(async t => {
  let label;
  const startLabels = () => (label = 0);
  const nextLabel = () =>
    typeof label === 'number' ? `--> #${(label += 1)}:` : '';
  harden(nextLabel);
  t.context = { startLabels, nextLabel };
});

const makeUser = ({ nobleApp, ethereum, myAddr, cctpAddr }) =>
  harden({
    doTransfer: async (amount, dest) => {
      const nobleFwd = await nobleApp.getNobleFwd(dest);
      const { setup, done } = await nobleApp.initiateTransaction({
        dest,
        amount,
        nobleFwd,
      });
      await setup;
      await ethereum.call({ sender: myAddr }, cctpAddr, 'bridge', [
        { dest: nobleFwd, amount },
      ]);
      return done;
    },
  });

const makeNobleApp = async ({
  t,
  nobleService,
  chains,
  agoricRpc,
  setTimeout,
}) => {
  const watchAddr = async ({ dest, amount }) => {
    const chain = pickChain(chains, dest);
    const balancePre = await chain.getBalance(dest);
    const events = makeEventCounter({ setTimeout });
    for await (const tick of events) {
      const balancePost = await chain.getBalance(dest);
      t.log('app watch dest', { balancePre, balancePost, dest, tick });
      if (balancePost > balancePre) {
        return harden({ dest, amount, balance: balancePost });
      }
    }
    assert.fail('unreachable');
  };

  const { nextLabel } = t.context;
  const settlementBase = await agoricRpc.getData(
    'published.quickSend.settlementBase',
  );
  t.log(nextLabel(), 'app got settlementBase', settlementBase);
  return harden({
    getNobleFwd: async (dest: string) => {
      const nobleFwd = NobleCalc.fwdAddressFor(
        AgoricCalc.virtualAddressFor(settlementBase, dest),
      );
      return nobleFwd;
    },
    initiateTransaction: async ({ dest, amount, nobleFwd }) => {
      t.log(nextLabel(), 'app initiate', { amount, dest });
      const setup = nobleService.initiateTransfer({ amount, dest, nobleFwd });
      const done = watchAddr({ dest, amount });
      return { setup, done };
    },
  });
};

const makeNobleExpress = ({ agoricWatcher, chain, t, agoricRpc }) => {
  const baseP = agoricRpc.getData('published.quickSend.settlementBase');
  const { nextLabel: next } = t.context;
  return harden({
    initiateTransfer: async ({ dest, amount, nobleFwd }) => {
      const base = await baseP;
      const agAddr = AgoricCalc.virtualAddressFor(base, dest);
      const fwd = await chain.provideForwardingAccount(agAddr);
      t.log(next(), 'express initiate', { dest, base, agAddr, fwd, nobleFwd });
      fwd === nobleFwd || assert.fail('mismatch');
      await agoricWatcher.startWatchingFor({ dest, amount, nobleFwd });
    },
  });
};

const makeAgoricWatcher = ({
  t,
  ethereum: eth,
  cctpAddr,
  watcherFacet,
  setTimeout,
}) => {
  const ethereum: EthChain = eth; // TODO: concise typing
  const pending: { dest: string; amount: number; nobleFwd: string }[] = [];
  let done = false;

  const { nextLabel: next } = t.context;
  const check = async height => {
    await null;
    const txs = await ethereum.getBlock(height);
    t.log('watcher found', txs.length, 'txs at height', height);
    for (const tx of txs) {
      if (done) break;
      if (tx.contractAddress !== cctpAddr) break;
      const [{ dest, amount }] = tx.args;
      const ix = pending.findIndex(
        item => item.nobleFwd === dest && item.amount === amount,
      );
      if (ix < 0) continue;
      const item = pending[ix];
      pending.splice(ix, 1);
      t.log(next(), 'watcher checked', tx.txId);
      t.log(next(), 'watcher confirmed', item);
      await watcherFacet.releaseAdvance(item); // TODO: continuing offerSpec
    }
  };

  const events = makeEventCounter({ setTimeout });

  return harden({
    startWatchingFor: async ({ dest, amount, nobleFwd }) => {
      t.log(next(), 'watcher.startWatchingFor', { dest, amount, nobleFwd });
      pending.push(harden({ dest, amount, nobleFwd }));
      await check(ethereum.currentHeight());
    },
    watch: async () => {
      await null;
      for await (const tick of events) {
        const ethHeight = ethereum.currentHeight();
        if (done) break;
        await check(ethHeight);
      }
    },
    stop: () => {
      done = true;
      t.log('watcher: stop at', ethereum.currentHeight());
    },
  });
};

const terms = { makerFee: 3, contractFee: 2 };
const startFunds = {
  usdcMint: 10_000,
  nobleMint: 100_000,
  pool: 2000,
  user: 150,
};

const setup = async (t, io) => {
  //   const t = {
  //     ...t0,
  //     log: (...args) => {
  //       console.debug(...args);
  //       t0.log(...args);
  //     },
  //   };
  t.log('-- SETUP...');
  // aka cosmoverse
  let chains = harden({
    agoric: withVTransfer(makeCosmosChain('agoric1', t), t),
    noble: makeCosmosChain('noble1', t),
    dydx: makeCosmosChain('dydx1', t),
  });
  chains = harden({
    ...chains,
    noble: withForwarding(chains.noble, chains, t),
  });

  const orch = makeOrchestration(t, chains);
  const { storageNode: chainStorage, rpc: agoricRpc } = makeVStorage();
  const storageNode = chainStorage.makeChildNode(
    'published.quickSend.settlementBase',
  );
  const zcf: ZCF = harden({ getTerms: () => terms }) as any;
  const contract = await startContract(zcf, { t, orch, storageNode }, {});
  const poolAddr = await contract.publicFacet.getPoolAddress();
  await chains.agoric.send({
    amount: startFunds.pool,
    from: chains.agoric.whaleAddress, // TODO: market maker contributes
    dest: poolAddr,
  });

  const ethereum = makeEthChain(9876, { t, setTimeout });
  const usdc = makeERC20(t, { sender: '0xcircle' }, startFunds.usdcMint);
  const usdcAddr = await ethereum.deployContract(usdc);
  await chains.noble.send({
    dest: 'noble1mint',
    amount: startFunds.nobleMint,
    from: chains.noble.whaleAddress,
  });

  const cctp = makeCCTP({
    t,
    usdc,
    noble: chains.noble,
    events: makeEventCounter(io),
  });
  const cctpAddr = await ethereum.deployContract(cctp);

  const watcherFacet = await contract.creatorFacet.getWatcherFacet(); // TODO: cont.
  const agoricWatcher = makeAgoricWatcher({
    t,
    ethereum,
    cctpAddr,
    watcherFacet,
    setTimeout: globalThis.setTimeout,
  });
  const nobleService = makeNobleExpress({
    agoricWatcher,
    chain: chains.noble,
    agoricRpc,
    t,
  });

  void agoricWatcher.watch().catch(err => {
    console.error('failure while watching', err);
    t.fail(err.message);
  });
  usdc.transfer({ sender: '0xcircle' }, '0xUrsula', startFunds.user);

  const quiesce = async () => {
    const ticks = makeEventCounter({ setTimeout });
    for await (const tick of ticks) {
      if (tick >= 5) break;
    }
    t.log('quiesced for 5 ticks');
    agoricWatcher.stop();
    ethereum.stop();
  };

  t.log('-- SETUP done.');
  t.context.startLabels();

  const nobleApp = await makeNobleApp({
    t,
    nobleService,
    chains, // to watch balance at EUD
    agoricRpc,
    setTimeout: globalThis.setTimeout,
  });

  const ursula = makeUser({ nobleApp, ethereum, myAddr: '0xUrsula', cctpAddr });

  return { chains, ursula, quiesce, contract, usdc };
};

test('tx lifecycle', async t => {
  const io = { setTimeout };
  const { chains, ursula, quiesce, contract, usdc } = await setup(t, io);

  const destAddr = await chains.dydx.makeAccount(); // is this a prereq?
  await ursula.doTransfer(100, destAddr);

  await quiesce();

  const poolAddr = await contract.publicFacet.getPoolAddress();
  const feeAddr = await contract.publicFacet.getFeeAddress();
  const settlementAddr = await contract.publicFacet.getSettlementAddress();
  const actual = {
    user: {
      addr: '0xUrsula',
      start: startFunds.user,
      balance: usdc.balanceOf('0xUrsula'),
    },
    dest: {
      addr: destAddr,
      balance: await chains.dydx.getBalance(destAddr),
    },
    pool: {
      addr: poolAddr,
      start: startFunds.pool,
      balance: await chains.agoric.getBalance(poolAddr),
    },
    fee: {
      addr: feeAddr,
      balance: await chains.agoric.getBalance(feeAddr),
    },
    settlement: {
      addr: settlementAddr,
      balance: await chains.agoric.getBalance(settlementAddr),
    },
  };
  const expected = {
    user: {
      addr: '0xUrsula',
      start: startFunds.user,
      balance: 50,
    },
    dest: {
      addr: 'dydx112',
      balance: 100 - terms.makerFee - terms.contractFee,
    },
    pool: {
      addr: 'agoric112',
      start: startFunds.pool,
      balance: startFunds.pool + terms.makerFee,
    },
    fee: { addr: 'agoric114', balance: terms.contractFee },
    settlement: {
      addr: 'agoric113',
      balance: 0,
    },
  };
  t.log('actual result', actual);
  t.deepEqual(actual, expected);
});
