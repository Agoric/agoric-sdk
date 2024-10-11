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

export const makeEventCounter = ({ setTimeout }) => {
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

export const makeEthChain = (heightInitial: number, { t, setTimeout }) => {
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
      const address: EthAddr = `0x${(nonce += 1)}`;
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
export type EthChain = ReturnType<typeof makeEthChain>;

export const makeERC20 = (t, msg0, supply) => {
  const balances = new Map();
  balances.set(msg0.sender, supply);
  const balanceOf = account => balances.get(account) || 0n;
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
