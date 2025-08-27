import test from 'ava';
import { JsonRpcProvider, id, toBeHex, zeroPadValue } from 'ethers';
import { watchCCTPTransfer } from '../src/watch-cctp.ts';

const watchAddress = '0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64';

const encodeAmount = (amount: bigint): string => {
  return zeroPadValue(toBeHex(amount), 32);
};

const createMockProvider = () => {
  const eventListeners = new Map<string, Function[]>();

  return {
    on: (eventOrFilter: any, listener: Function) => {
      const key = JSON.stringify(eventOrFilter);
      if (!eventListeners.has(key)) {
        eventListeners.set(key, []);
      }
      eventListeners.get(key)!.push(listener);
    },
    off: (eventOrFilter: any, listener: Function) => {
      const key = JSON.stringify(eventOrFilter);
      const listeners = eventListeners.get(key);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    },
    emit: (eventOrFilter: any, log: any) => {
      const key = JSON.stringify(eventOrFilter);
      const listeners = eventListeners.get(key);
      if (listeners) {
        listeners.forEach(listener => listener(log));
      }
    },
  } as unknown as JsonRpcProvider;
};

test('watchCCTPTransfer detects exact amount match', async t => {
  const provider = createMockProvider();
  const expectedAmount = 1_000_000n; // 1 USDC
  const amountData = zeroPadValue(toBeHex(expectedAmount), 32);

  const watchPromise = watchCCTPTransfer({
    provider,
    watchAddress,
    expectedAmount,
    timeoutMinutes: 0.05, // 3 seconds for test
    log: console.log,
  });

  // Simulate a matching transfer event after short delay
  setTimeout(() => {
    const mockLog = {
      address: '0xA0b86a33E6441b5c5B3F9B84d2a8F9e9bB1b7f1A', // USDC contract
      topics: [
        id('Transfer(address,address,uint256)'), // Transfer event signature
        '0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266', // from
        zeroPadValue(watchAddress.toLowerCase(), 32), // to (our watch address)
      ],
      data: encodeAmount(expectedAmount),
      transactionHash: '0x123abc',
      blockNumber: 18500000,
    };

    const filter = {
      topics: [
        id('Transfer(address,address,uint256)'),
        null,
        zeroPadValue(watchAddress.toLowerCase(), 32),
      ],
    };

    (provider as any).emit(filter, mockLog);
  }, 50);

  const result = await watchPromise;
  t.true(result, 'Should detect matching transfer');
});

test('watchCCTPTransfer ignores amount mismatch', async t => {
  const provider = createMockProvider();
  const expectedAmount = 1_000_000n;

  const watchPromise = watchCCTPTransfer({
    provider,
    watchAddress,
    expectedAmount,
    timeoutMinutes: 0.05,
    log: console.log,
  });

  setTimeout(() => {
    const mockLog = {
      address: '0xA0b86a33E6441b5c5B3F9B84d2a8F9e9bB1b7f1A',
      topics: [
        id('Transfer(address,address,uint256)'),
        '0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        zeroPadValue(watchAddress.toLowerCase(), 32),
      ],
      data: encodeAmount(1_000_00n), // 0.1 USDC in hex (wrong amount)
      transactionHash: '0x123abc',
      blockNumber: 18500000,
    };

    const filter = {
      topics: [
        id('Transfer(address,address,uint256)'),
        null,
        zeroPadValue(watchAddress.toLowerCase(), 32),
      ],
    };

    (provider as any).emit(filter, mockLog);
  }, 50);

  const result = await watchPromise;
  t.false(result, 'Should timeout on amount mismatch');
});

test('watchCCTPTransfer detects multiple transfers but only matches exact amount', async t => {
  const provider = createMockProvider();
  const expectedAmount = 5_000_000n; // 5 USDC

  const watchPromise = watchCCTPTransfer({
    provider,
    watchAddress,
    expectedAmount,
    timeoutMinutes: 0.1, // 6 seconds
    log: console.log,
  });

  const transfers = [
    { amount: encodeAmount(1_000_000n), delay: 20 }, // 1 USDC
    { amount: encodeAmount(2_000_000n), delay: 40 }, // 2 USDC
    { amount: encodeAmount(5_000_000n), delay: 60 }, // 5 USDC (match!)
    { amount: encodeAmount(8_000_000n), delay: 80 }, // 8 USDC
  ];

  transfers.forEach(({ amount, delay }) => {
    setTimeout(() => {
      const mockLog = {
        address: '0xA0b86a33E6441b5c5B3F9B84d2a8F9e9bB1b7f1A',
        topics: [
          id('Transfer(address,address,uint256)'),
          '0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266',
          zeroPadValue(watchAddress.toLowerCase(), 32),
        ],
        data: amount,
        transactionHash: `0x${Math.random().toString(16).slice(2)}`,
        blockNumber: 18500000 + Math.floor(delay / 20),
      };

      const filter = {
        topics: [
          id('Transfer(address,address,uint256)'),
          null,
          zeroPadValue(watchAddress.toLowerCase(), 32),
        ],
      };

      (provider as any).emit(filter, mockLog);
    }, delay);
  });

  const result = await watchPromise;
  t.true(
    result,
    'Should detect the exact matching amount among multiple transfers',
  );
});
