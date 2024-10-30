export type Hex = `0x${string}`; // as in viem
export type EthAddr = `0x${string}`;
type EthData = Record<string, string | number>;
type EthMsgInfo = { sender: EthAddr; value?: number };
type EthCallTx = {
  msg: EthMsgInfo;
  contractAddress: EthAddr;
  method: string;
  args: EthData[];
};
export type EthEvent = {
  eventName: string;
  args: Record<string, string | bigint>;
  address: string;
  transactionHash;
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
  const modern = new Date('2024-10-29T20:00:00');
  let nonce = 10;
  let height = heightInitial;
  const contracts = new Map();
  const mempool: EthCallTx[] = [];
  const eventLog: EthEvent[] = [];
  const emptyBlock = harden({ txs: [], events: [] });
  const blocks: { txs: EthCallTx[]; events: EthEvent[] }[] = [emptyBlock];

  let going = true;
  const advanceBlock = () => {
    blocks.push(harden({ txs: [...mempool], events: [...eventLog] }));
    mempool.splice(0, mempool.length);
    eventLog.splice(0, eventLog.length);
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
      address: EthAddr,
      method: string,
      args: EthData[],
    ) => {
      mempool.push({ msg, contractAddress: address, method, args });
      t.log(next(), 'eth call', address, '.', method, '(', ...args, ')');
      const contract = contracts.get(address);
      const result = contract[method](msg, ...args);
      const transactionHash = `0x${(nonce += 1)}`;
      eventLog.push(...result.map(e => ({ ...e, address, transactionHash })));
    },
    currentHeight: () => height - 1,
    getBlock: (h: number) => {
      const secs = modern.getTime() / 1000 + 15 * (h - heightInitial);
      const blockHash: Hex = '0xBLOCK_HASH_TODO';
      return harden({
        timeStamp: BigInt(secs),
        blockNumber: BigInt(height),
        blockHash,
        ...(blocks[h - heightInitial] || emptyBlock),
      });
    },
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
