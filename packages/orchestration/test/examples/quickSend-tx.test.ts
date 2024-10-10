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
  fwdAddressFor: (dest: string) => `noble1${dest.length}${dest.slice(-4)}`,
});

const AgoricCalc = harden({
  virtualAddressFor: (base: string, dest: string) => `${base}+${dest}`,
  isVirtualAddress: addr => addr.includes('+'),
  virtualAddressParts: addr => addr.split('+'),
});

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

const makeEventCounter = ({ setTimeout }) => {
  let current = 0;
  let going = true;
  async function* eachEvent() {
    await null;
    for (; ; current += 1) {
      if (!going) break;
      yield current;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  const iter = eachEvent();

  return harden({
    getCurrent: () => current,
    cancel: () => (going = false),
    [Symbol.asyncIterator]: () => iter,
  });
};

const makeCosmosChain = (prefix, t) => {
  let nonce = 10;
  const balances = new Map();
  const whaleAddress = `${prefix}${(nonce += 1)}`;
  balances.set(whaleAddress, 1_000_000);
  const { nextLabel: next } = t.context;

  const burn = async ({ from, amount }) => {
    const fromPre = balances.get(from) || 0;
    const fromPost = fromPre - amount;
    fromPost >= 0 || assert.fail(`${from} overdrawn: ${fromPre} - ${amount}`);
    balances.set(from, fromPost);
  };

  const mint = async ({ dest, amount }) => {
    const destPre = balances.get(dest) || 0;
    const destPost = destPre + amount;
    balances.set(dest, destPost);
  };

  return harden({
    prefix,
    whaleAddress,
    makeAccount: async () => {
      const address = `${prefix}${(nonce += 1)}`;
      balances.set(address, 0);
      t.log('chain', prefix, 'makeAccount', address);
      return address;
    },
    getBalance: async dest => balances.get(dest),
    send: async ({ amount, from, dest, quiet }) => {
      t.true(dest.startsWith(prefix), dest);
      await burn({ from, amount });
      await mint({ dest, amount });
      const label = quiet ? '' : next();
      t.log(label, dest, 'balance +=', amount, '=', balances.get(dest));
    },
  });
};

const pickChain = (chains, dest) => {
  const pfxLen = dest.indexOf('1');
  const pfx = dest.slice(0, pfxLen);
  const chain = chains[pfx];
  assert(chain, dest);
  return chain;
};

const ibcTransfer = async (chains, { amount, from, dest, t }) => {
  const { nextLabel: next } = t.context;
  t.log(next(), 'ibc transfer', amount, 'to', dest);
  const chainSrc = pickChain(chains, from);
  const chainDest = pickChain(chains, dest);
  const burn = `${chainSrc.prefix}IBCburn`;
  const quiet = true;
  await chainSrc.send({ amount, from, dest: burn, quiet });
  await chainDest.send({ amount, from: chainDest.whaleAddress, dest, quiet });
};

const withForwarding = (chain, chains, t) => {
  const destOf = new Map();
  const { nextLabel: next } = t.context;
  return harden({
    ...chain,
    provideForwardingAccount: async dest => {
      const address = NobleCalc.fwdAddressFor(dest);
      destOf.set(address, dest);
      t.log('x/forwarding fwd', address, '->', dest);
      return address;
    },
    send: async ({ amount, from, dest }) => {
      await chain.send({ amount, from, dest, quiet: true });
      if (!destOf.has(dest)) return;
      const fwd = destOf.get(dest);
      t.log(next(), 'fwd', { amount, dest, fwd });
      await ibcTransfer(chains, { amount, from: dest, dest: fwd, t });
    },
  });
};

const withVTransfer = (chain, t) => {
  const addrToTap = new Map();
  return harden({
    ...chain,
    register: async ({ addr, handler }) => {
      t.log('vtransfer register', { addr, handler });
      !addrToTap.has(addr) || assert.fail('already registered');
      addrToTap.set(addr, handler);
    },
    send: async ({ amount, from, dest }) => {
      const [agAddr, extra] = AgoricCalc.isVirtualAddress(dest)
        ? AgoricCalc.virtualAddressParts(dest)
        : [dest, undefined];
      const quiet = true;
      const result = await chain.send({ amount, from, dest: agAddr, quiet });

      if (extra === undefined) return result;
      t.log('vtransfer to virtual address', { agAddr, extra });
      if (!addrToTap.has(agAddr)) return result;

      const handler = addrToTap.get(agAddr);
      void handler.onReceive({ amount, extra }).catch(err => {
        console.error('onRecieve rejected', err);
      });

      return result;
    },
  });
};

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

const makeERC20 = (t, msg0, supply) => {
  const balances = new Map();
  balances.set(msg0.sender, supply);
  const balanceOf = account => balances.get(account) || 0;
  return harden({
    balanceOf,
    transfer: (msg, dest, numTokens) => {
      const srcBal = balanceOf(msg.sender);
      t.log('ERC20 transfer', { sender: msg.sender, srcBal, numTokens, dest });
      t.true(srcBal > numTokens);
      const destBal = balanceOf(dest);
      balances.set(msg.sender, srcBal - numTokens);
      balances.set(dest, destBal + numTokens);
    },
  });
};

const makeCCTP = ({ t, usdc, noble, events }) => {
  const { nextLabel: next } = t.context;
  return harden({
    bridge: (msg, { dest, amount }) => {
      t.regex(dest, /^noble/);
      t.log(next(), 'cctp.bridge:', { msg, dest });
      usdc.transfer(msg, '0x0000', amount); // burn
      const t0 = events.getCurrent();
      void (async () => {
        t.log('waiting 3 blocks (TODO: 20min) before minting on noble');
        for await (const te of events) {
          if (te - t0 > 3) break;
        }
        noble.send({ amount, from: 'noble1mint', dest });
      })();
    },
  });
};

type EthAddr = `0x${string}`;
type EthData = Record<string, string | number>;
type EthMsgInfo = { sender: EthAddr; value?: number };
type EthCallTx = {
  txId: number;
  msg: EthMsgInfo;
  contractAddress: EthAddr;
  method: string;
  args: EthData[];
};

const makeEthChain = (heightInitial: number, { t, setTimeout }) => {
  let nonce = 10;
  let height = heightInitial;
  const contracts = new Map();
  const mempool: EthCallTx[] = [];
  const blocks: EthCallTx[][] = [[]];
  const emptyBlock = harden([]);

  let going = true;
  const advanceBlock = () => {
    blocks.push(harden([...mempool]));
    mempool.splice(0, mempool.length);
    height += 1;
    t.log('eth advance to block', height);
  };
  void (async () => {
    const ticks = makeEventCounter({ setTimeout });
    for await (const tick of ticks) {
      if (!going) break;
      advanceBlock();
    }
  })();

  const { nextLabel: next } = t.context;
  return harden({
    deployContract: async c => {
      const address = `0x${(nonce += 1)}`;
      contracts.set(address, c);
      return address;
    },
    call: async (
      msg: EthMsgInfo,
      addr: EthAddr,
      method: string,
      args: EthData[],
    ) => {
      const txId = nonce;
      nonce += 1;
      mempool.push({ txId, msg, contractAddress: addr, method, args });
      t.log(next(), 'eth call', addr, '.', method, '(', ...args, ')');
      const contract = contracts.get(addr);
      const result = contract[method](msg, ...args);
      t.is(result, undefined);
    },
    currentHeight: () => height - 1,
    getBlock: (h: number) => blocks[h - heightInitial] || emptyBlock,
    stop: () => (going = false),
  });
};
type EthChain = ReturnType<typeof makeEthChain>;

const makeAgoricWatcher = ({
  t,
  ethereum: eth,
  cctpAddr,
  contract,
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
      await contract.releaseAdvance(item);
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

// funding pool is a local account
const makeOrchestration = (t, chains) => {
  const { nextLabel: next } = t.context;
  return harden({
    makeLocalAccount: async () => {
      const addr = await chains.agoric.makeAccount();
      return harden({
        getAddress: () => addr,
        transfer: async ({ amount, dest }) => {
          t.log(next(), 'orch acct', addr, 'txfr', amount, 'to', dest);
          await ibcTransfer(chains, { amount, dest, from: addr, t });
        },
        send: async ({ amount, dest }) => {
          t.log(next(), 'orch acct', addr, 'send', amount, 'to', dest);
          await chains.agoric.send({ amount, dest, from: addr });
        },
        tap: async handler => {
          await chains.agoric.register({ addr, handler });
        },
      });
    },
  });
};

const makeVStorage = () => {
  const data = new Map();
  const storageNode = harden({
    makeChildNode: path =>
      harden({
        setValue: value => data.set(path, value),
      }),
  });
  const rpc = harden({
    getData: async path => data.get(path),
  });

  return { storageNode, rpc };
};

const makeQuickSend = async ({
  t,
  privateArgs: { orch, storageNode },
  terms: { makerFee, contractFee },
}) => {
  const fundingPool = await orch.makeLocalAccount();
  const settlement = await orch.makeLocalAccount();
  const feeAccount = await orch.makeLocalAccount();

  const { nextLabel: next } = t.context;
  storageNode.setValue(settlement.getAddress());

  await settlement.tap(
    harden({
      onReceive: async ({ amount, extra }) => {
        t.log(next(), 'tap onReceive', { amount });
        // XXX partial failure?
        await Promise.all([
          settlement.send({
            dest: fundingPool.getAddress(),
            amount: amount - contractFee,
          }),
          settlement.send({
            dest: feeAccount.getAddress(),
            amount: contractFee,
          }),
        ]);
      },
    }),
  );

  return harden({
    releaseAdvance: async ({ amount, dest, nobleFwd }) => {
      t.log(next(), 'contract.releaseAdvance', { amount, dest });
      t.is(
        NobleCalc.fwdAddressFor(
          AgoricCalc.virtualAddressFor(fundingPool.getAddress(), dest),
        ),
        nobleFwd,
      );
      const advance = amount - makerFee - contractFee;
      await fundingPool.transfer({ dest, amount: advance });
    },
    getPoolAddress: async () => fundingPool.getAddress(),
    getSettlementAddress: async () => settlement.getAddress(),
    getFeeAddress: async () => feeAccount.getAddress(),
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
  const ethereum = makeEthChain(9876, { t, setTimeout });
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
  const contract = await makeQuickSend({
    t,
    privateArgs: { orch, storageNode },
    terms,
  });
  const poolAddr = await contract.getPoolAddress();
  await chains.agoric.send({
    amount: startFunds.pool,
    from: chains.agoric.whaleAddress, // TODO: market maker contributes
    dest: poolAddr,
  });

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

  const agoricWatcher = makeAgoricWatcher({
    t,
    ethereum,
    cctpAddr,
    contract,
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
    chains,
    agoricRpc,
    setTimeout: globalThis.setTimeout,
  });
  const ursula = makeUser({
    nobleApp,
    ethereum,
    myAddr: '0xUrsula',
    cctpAddr,
  });

  return { chains, ursula, quiesce, contract, usdc };
};

test('tx lifecycle', async t => {
  const io = { setTimeout };
  const { chains, ursula, quiesce, contract, usdc } = await setup(t, io);

  const destAddr = await chains.dydx.makeAccount(); // is this a prereq?
  await ursula.doTransfer(100, destAddr);

  await quiesce();

  const poolAddr = await contract.getPoolAddress();
  const feeAddr = await contract.getFeeAddress();
  const settlementAddr = await contract.getSettlementAddress();
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
