import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);
const contractName = 'sendAnywhere';
const contractFile = nodeRequire.resolve(
  `../../src/examples/send-anywhere.contract.js`,
);

type StartFn = typeof import('../../src/examples/quickSend.contract.js').start;

const todo = () => assert.fail('TODO');

const NobleCalc = harden({
  fwdAddressFor: (dest: string) => `noble${dest.length}${dest.slice(-4)}`,
});

const AgoricCalc = harden({
  virtualAddressFor: (dest: string) => `agoric${dest.length}${dest.slice(-4)}`,
});

const logged = (it, label) => {
  console.debug(label, it);
  return it;
};

const makeEventCounter = ({ setTimeout }) => {
  let current = 0;
  async function* eachEvent() {
    await null;
    for (; ; current += 1) {
      yield current;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  const iter = eachEvent();

  return harden({
    getCurrent: () => current,
    [Symbol.asyncIterator]: () => iter,
  });
};

const makeCosmosChain = (prefix, blockEvents, t) => {
  let nonce = 10;
  const balances = new Map();
  return harden({
    makeAccount: async () => {
      const address = `${prefix}${(nonce += 1)}`;
      balances.set(address, 0);
      t.log('makeAccount', prefix, address);
      return address;
    },
    getBalance: async dest => balances.get(dest),
    send: async ({ amount, dest }) => {
      t.true(dest.startsWith(prefix), dest);
      balances.set(dest, (balances.get(dest) || 0) + amount);
      t.log(dest, 'balance +=', amount, '=', balances.get(dest));
      // console.debug(dest, 'received', amount, '=', balances.get(dest));
    },
    blockEvents: () => blockEvents,
  });
};

const pickChain = (chains, dest) => {
  const pfxLen = dest.indexOf('1');
  const pfx = dest.slice(0, pfxLen);
  const chain = chains[pfx];
  assert(chain, dest);
  return chain;
};

const makeEthChain = (blockEvents, t) => {
  let nonce = 10;
  const contracts = new Map();
  const blocks: any[][] = [];
  return harden({
    deployContract: async c => {
      const address = `0x${(nonce += 1)}`;
      contracts.set(address, c);
      return address;
    },
    call: async (sender, addr, method, args) => {
      const height = blockEvents.getCurrent();
      const block = blocks[height] || (blocks[height] = []);
      block.push({ sender, addr, method, args });
      t.log('blk', height, 'eth call', addr, '.', method, '(', ...args, ')');
      const contract = contracts.get(addr);
      await contract[method](sender, ...args);
    },
    getBlock: h => harden([...(blocks[h] || [])]),
    blockEvents: () => blockEvents,
  });
};

const makeUser = ({ nobleApp, ethereum, myAddr, cctpAddr }) =>
  harden({
    doTransfer: async (amount, dest) => {
      const nobleFwd = NobleCalc.fwdAddressFor(dest);
      const done = nobleApp.initiateTransaction({ dest, amount, nobleFwd });
      await ethereum.call(myAddr, cctpAddr, 'bridge', [
        { dest: nobleFwd, amount },
      ]);
      return done;
    },
  });

const makeNobleApp = ({ t, nobleService, chains }) =>
  harden({
    initiateTransaction: async ({ dest, amount, nobleFwd }) => {
      t.log('app initiate', { amount, dest });
      const chain = pickChain(chains, dest);
      const balancePre = await chain.getBalance(dest);
      await nobleService.initiateTransfer({ amount, dest, nobleFwd });
      for await (const height of chain.blockEvents()) {
        const balancePost = await chain.getBalance(dest);
        // console.debug('app', { balancePre, balancePost, dest });
        if (balancePost > balancePre) {
          return harden({ dest, amount, balance: balancePost });
        }
      }
    },
  });

const makeNobleExpress = ({ agoricWatcher, t }) => {
  return harden({
    initiateTransfer: async ({ dest, amount, nobleFwd }) => {
      t.log('noble express initiate', { amount, dest });
      await agoricWatcher.noteTxDetails({ dest, amount, nobleFwd });
    },
  });
};

const makeCCTP = t => {
  return harden({
    bridge: async (sender, { amount, dest }) => {
      t.regex(dest, /^noble/);
      t.log('cctp.bridge:', { amount, dest });
      t.log('TODO: withdraw from', sender);
      t.log('TODO: mint');
    },
  });
};

const makeAgoricWatcher = ({ t, ethereum, cctpAddr, contract }) => {
  const pending: { dest: string; amount: number; nobleFwd: string }[] = [];
  let done = false;

  const check = async height => {
    await null;
    const txs = await ethereum.getBlock(height);
    t.log('watcher found', txs.length, 'txs at height', height);
    for (const tx of txs) {
      if (done) break;
      if (tx.addr !== cctpAddr) break;
      const [{ dest, amount }] = tx.args;
      const ix = pending.findIndex(
        notice => notice.nobleFwd === dest && notice.amount === amount,
      );
      if (ix < 0) continue;
      const item = pending[ix];
      pending.splice(ix, 1);
      //   t.log('watcher confirmed', item);
      await contract.notify(item);
    }
  };

  return harden({
    noteTxDetails: async ({ dest, amount, nobleFwd }) => {
      t.log('watcher.note', { dest, amount, nobleFwd });
      pending.push(harden({ dest, amount, nobleFwd }));
      const blocks = ethereum.blockEvents();
      const current = blocks.getCurrent();
      await check(current);
    },
    watch: async () => {
      await null;
      for await (const blk of ethereum.blockEvents()) {
        if (done) break;
        // if (blk > 0) {
        //   await check(blk - 1);
        // }
        await check(blk);
        // console.log('waiting for eth block after', blk);
      }
    },
    stop: () => (done = true),
  });
};

// funding pool is a local account
const makeOrchestration = (t, chains) => {
  return harden({
    makeLocalAccount: async () => {
      const addr = await chains.agoric.makeAccount();
      return harden({
        getAddress: () => addr,
        transfer: async ({ amount, dest }) => {
          t.log('orch acct', addr, 'txfr', amount, 'to', dest);
          const chain = pickChain(chains, dest);
          t.log('TODO: withdraw from', addr);
          await chain.send({ amount, dest });
        },
      });
    },
  });
};

const makeQuickSend = async ({ t, orch }) => {
  const fundingPool = await orch.makeLocalAccount();
  return harden({
    notify: async ({ amount, dest, nobleFwd }) => {
      t.log('contract.notify', { amount, dest });
      t.is(NobleCalc.fwdAddressFor(dest), nobleFwd);
      t.log('contract TODO: subtract fees');
      await fundingPool.transfer({ dest, amount });
    },
  });
};

test('tx lifecycle', async t => {
  const io = { setTimeout };
  const chains = {
    agoric: makeCosmosChain('agoric1', makeEventCounter(io), t),
    noble: makeCosmosChain('noble1', makeEventCounter(io), t),
    dydx: makeCosmosChain('dydx1', makeEventCounter(io), t),
    ethereum: makeEthChain(makeEventCounter(io), t),
  };
  const { ethereum } = chains;

  const orch = makeOrchestration(t, chains);
  const contract = await makeQuickSend({ t, orch });

  const cctp = makeCCTP(t);
  const cctpAddr = await ethereum.deployContract(cctp);

  const agoricWatcher = makeAgoricWatcher({
    t,
    ethereum,
    cctpAddr,
    contract,
  });
  const nobleService = makeNobleExpress({ agoricWatcher, t });

  const nobleApp = makeNobleApp({ t, nobleService, chains });

  void agoricWatcher.watch().catch(err => {
    console.error('failure while watching', err);
    t.fail(err.message);
  });

  const destAddr = await chains.dydx.makeAccount(); // is this a prereq?

  const ursula = makeUser({
    nobleApp,
    ethereum,
    myAddr: '0xDEADBEEF',
    cctpAddr,
  });
  await ursula.doTransfer(100, destAddr);
  const destBal = await chains.dydx.getBalance(destAddr);
  t.is(destBal, 100);
  agoricWatcher.stop();
});
