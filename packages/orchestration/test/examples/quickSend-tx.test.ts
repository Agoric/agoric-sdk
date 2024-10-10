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
    send: async ({ amount, from, dest }) => {
      t.true(dest.startsWith(prefix), dest);
      const fromPre = balances.get(from) || 0;
      const fromPost = fromPre - amount;
      fromPost >= 0 || assert.fail(`${from} overdrawn: ${fromPre} - ${amount}`);
      const destPre = balances.get(dest) || 0;
      const destPost = destPre + amount;
      balances.set(from, fromPost);
      balances.set(dest, destPost);
      t.log(dest, 'balance +=', amount, '=', balances.get(dest));
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

const ibcTransfer = async (chains, { amount, from, dest }) => {
  const chainSrc = pickChain(chains, from);
  const chainDest = pickChain(chains, dest);
  await chainSrc.send({
    amount,
    from,
    dest: `${chainSrc.prefix}IBCburn`,
  });
  await chainDest.send({ amount, from: chainDest.whaleAddress, dest });
};

const withForwarding = (chain, chains, t) => {
  const destOf = new Map();
  return harden({
    ...chain,
    provideForwardingAccount: async dest => {
      const address = NobleCalc.fwdAddressFor(dest);
      destOf.set(address, dest);
      t.log('x/forwarding fwd', address, '->', dest);
      return address;
    },
    send: async ({ amount, from, dest }) => {
      await chain.send({ amount, from, dest });
      if (!destOf.has(dest)) return;
      const fwd = destOf.get(dest);
      t.log('fwd', { amount, dest, fwd });
      await ibcTransfer(chains, { amount, from: dest, dest: fwd });
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
      const result = await chain.send({ amount, from, dest: agAddr });

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
      t.log('blk', height, 'eth call', addr, '.', method, '(', ...args, ')');
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

const makeUser = ({ nobleApp, ethereum, myAddr, cctpAddr }) =>
  harden({
    doTransfer: async (amount, dest) => {
      const settlementBase = await nobleApp.getSettlementBaseAddress();
      const nobleFwd = NobleCalc.fwdAddressFor(
        AgoricCalc.virtualAddressFor(settlementBase, dest),
      );
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

const makeNobleApp = ({ t, nobleService, chains, agoricRpc, setTimeout }) => {
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

  return harden({
    initiateTransaction: async ({ dest, amount, nobleFwd }) => {
      t.log('app initiate', { amount, dest });
      const setup = nobleService.initiateTransfer({ amount, dest, nobleFwd });
      const done = watchAddr({ dest, amount });
      return { setup, done };
    },
    getSettlementBaseAddress: async () =>
      agoricRpc.getData('published.quickSend.settlementBase'),
  });
};

const makeNobleExpress = ({ agoricWatcher, chain, t, agoricRpc }) => {
  const baseP = agoricRpc.getData('published.quickSend.settlementBase');
  return harden({
    initiateTransfer: async ({ dest, amount, nobleFwd }) => {
      const base = await baseP;
      const agAddr = AgoricCalc.virtualAddressFor(base, dest);
      const fwd = await chain.provideForwardingAccount(agAddr);
      t.log('express initiate', { dest, base, agAddr, fwd, nobleFwd });
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
  return harden({
    bridge: (msg, { dest, amount }) => {
      t.regex(dest, /^noble/);
      t.log('cctp.bridge:', { msg, dest });
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
      t.log('watcher confirmed', tx.txId, item);
      await contract.releaseAdvance(item);
    }
  };

  const events = makeEventCounter({ setTimeout });

  return harden({
    startWatchingFor: async ({ dest, amount, nobleFwd }) => {
      t.log('watcher.startWatchingFor', { dest, amount, nobleFwd });
      pending.push(harden({ dest, amount, nobleFwd }));
      await check(ethereum.currentHeight());
    },
    watch: async () => {
      await null;
      for await (const tick of events) {
        const ethHeight = ethereum.currentHeight();
        if (done) break;
        // if (blk > 0) {
        //   await check(blk - 1);
        // }
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
  return harden({
    makeLocalAccount: async () => {
      const addr = await chains.agoric.makeAccount();
      return harden({
        getAddress: () => addr,
        transfer: async ({ amount, dest }) => {
          t.log('orch acct', addr, 'txfr', amount, 'to', dest);
          await ibcTransfer(chains, { amount, dest, from: addr });
        },
        send: async ({ amount, dest }) => {
          t.log('orch acct', addr, 'send', amount, 'to', dest);
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

  storageNode.setValue(settlement.getAddress());

  await settlement.tap(
    harden({
      onReceive: async ({ amount, extra }) => {
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
      t.log('contract.releaseAdvance', { amount, dest });
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

test('tx lifecycle', async t => {
  const terms = { makerFee: 3, contractFee: 2 };
  const startFunds = {
    usdcMint: 10_000,
    nobleMint: 100_000,
    pool: 2000,
    user: 150,
  };

  const io = { setTimeout };
  //   const t = {
  //     ...t0,
  //     log: (...args) => {
  //       console.debug(...args);
  //       t0.log(...args);
  //     },
  //   };
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

  const nobleApp = makeNobleApp({
    t,
    nobleService,
    chains,
    agoricRpc,
    setTimeout: globalThis.setTimeout,
  });

  void agoricWatcher.watch().catch(err => {
    console.error('failure while watching', err);
    t.fail(err.message);
  });

  const destAddr = await chains.dydx.makeAccount(); // is this a prereq?

  usdc.transfer({ sender: '0xcircle' }, '0xUrsula', startFunds.user);
  const ursula = makeUser({
    nobleApp,
    ethereum,
    myAddr: '0xUrsula',
    cctpAddr,
  });
  await ursula.doTransfer(100, destAddr);

  const quiesce = makeEventCounter({ setTimeout });
  for await (const tick of quiesce) {
    if (tick > 2) break;
  }
  t.log('quiesced for 3 ticks');
  agoricWatcher.stop();
  ethereum.stop();

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
