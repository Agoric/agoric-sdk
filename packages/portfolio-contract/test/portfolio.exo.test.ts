/** @file tests for PortfolioKit exo */
/* eslint-disable no-sparse-arrays */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import type { Callable } from '@agoric/internal';
import type { StorageNode } from '@agoric/internal/src/lib-chainStorage.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { AxelarChain } from '@agoric/portfolio-api';
import type { TargetAllocation as EIP712Allocation } from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.ts';
import type { PermitDetails } from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.ts';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { prepareVowTools } from '@agoric/vow';
import { makeHeapZone } from '@agoric/zone';
import type { Address } from 'abitype';
import {
  PortfolioStateShape,
  preparePortfolioKit,
} from '../src/portfolio.exo.ts';
import { PositionStateShape } from '../src/pos.exo.ts';
import type { StatusFor } from '../src/type-guards.ts';
import { contractsMock } from './mocks.ts';
import { axelarCCTPConfig } from './supports.ts';

const { brand: USDC } = makeIssuerKit('USDC');

type PortfolioKitDeps = Parameters<typeof preparePortfolioKit>[1];

const makeSpies = <T extends Record<string, Callable>>(
  stubs: T,
): {
  spies: T;
  log: { [P in keyof T]: [P, ...Parameters<T[P]>] }[keyof T][];
} => {
  const log: [keyof T, ...unknown[]][] = [];

  const spies = Object.fromEntries(
    Object.entries(stubs).map(([k, stub]) => [
      k,
      (...args) => {
        log.push([k, ...args]);
        return stub(...args);
      },
    ]),
  );

  // @ts-expect-error generics
  return { spies, log };
};

const makeTestSetup = () => {
  const zone = makeHeapZone();
  const board = makeFakeBoard();
  const marshaller = board.getReadonlyMarshaller();
  const vowTools = prepareVowTools(zone);

  const depStubs = {
    rebalance: () => vowTools.asVow(() => {}),
    executePlan: () => vowTools.asVow(() => {}),
  } as Pick<PortfolioKitDeps, 'rebalance' | 'executePlan'>;

  const { spies, log: callLog } = makeSpies(depStubs);

  const makeMockNode = (here: string) => {
    const node = harden({
      makeChildNode: (name: string) => makeMockNode(`${here}.${name}`),
      setValue: _x => {},
    }) as unknown as StorageNode;
    return node;
  };

  const eip155ChainIdToAxelarChain = Object.fromEntries(
    Object.entries(axelarCCTPConfig).map(([name, info]) => [
      `${Number(info.reference)}`,
      name,
    ]),
  ) as Record<`${number}`, AxelarChain>;

  const makePortfolioKit = preparePortfolioKit(zone, {
    portfoliosNode: makeMockNode('published.ymax0.portfolios'),
    marshaller,
    usdcBrand: USDC,
    vowTools,
    eip155ChainIdToAxelarChain,
    ...spies,
    zcf: {
      makeEmptySeatKit: () => ({ zcfSeat: harden({}) }),
    } as any,
    contracts: contractsMock,
    // rest are not used for this test
    ...({} as any),
  });

  return {
    makePortfolioKit,
    vowTools,
    getCallLog: () => callLog.slice(),
  };
};

test('portfolio exo caches storage nodes', async t => {
  const zone = makeHeapZone();
  const board = makeFakeBoard();
  const marshaller = board.getReadonlyMarshaller();
  const vowTools = prepareVowTools(zone);

  // count each time we makeChildNode(...)
  let nodeQty = 0;
  const makeMockNode = (here: string) => {
    nodeQty += 1;
    t.log(nodeQty, here);
    const node = harden({
      makeChildNode: (name: string) => makeMockNode(`${here}.${name}`),
      setValue: _x => {},
    }) as unknown as StorageNode;
    return node;
  };

  const makePortfolioKit = preparePortfolioKit(zone, {
    portfoliosNode: makeMockNode('published.ymax0.portfolios'),
    marshaller,
    usdcBrand: USDC,
    vowTools,
    // rest are not used
    ...({} as any),
  });

  await eventLoopIteration(); // wait for vstorage writes to settle
  t.is(nodeQty, 1, '1 root node for all portfolios');

  const { reporter, manager } = makePortfolioKit({ portfolioId: 123 });
  reporter.publishStatus();
  reporter.publishStatus();
  await eventLoopIteration();
  t.is(nodeQty, 2, 'root + portfolio');

  manager.startFlow({ type: 'rebalance' });
  const flowStatus: StatusFor['flow'] = {
    state: 'run',
    step: 1,
    how: 'USDN',
    type: 'rebalance',
  };
  reporter.publishFlowStatus(1, flowStatus);
  reporter.publishFlowStatus(1, { ...flowStatus, step: 2 });
  await eventLoopIteration();
  t.is(nodeQty, 4, 'root, portfolio, flows, flow1');

  const acctId = 'cosmos:noble-1:noble1xyz';
  const pos = manager.providePosition('USDN', 'USDN', acctId);
  pos.publishStatus();
  pos.publishStatus();
  await eventLoopIteration();
  t.is(nodeQty, 6, 'root, portfolio, flows, flow1, positions, position1');
});

test('releaseAccount clears pending account reservation', async t => {
  const { makePortfolioKit, vowTools } = makeTestSetup();
  const { manager } = makePortfolioKit({ portfolioId: 456 });

  // First call to reserveAccount should return undefined and create pending entry
  const result1 = manager.reserveAccount('Arbitrum');
  t.is(result1, undefined, 'first reserveAccount returns undefined');

  // Second call should return the pending vow
  const result2 = manager.reserveAccount('Arbitrum');
  t.truthy(result2, 'second reserveAccount returns vow');
  t.not(result2, result1, 'returns the pending vow');

  // Release the account with a reason
  const reason = new Error('Account creation failed');
  manager.releaseAccount('Arbitrum', reason);

  // After release, reserveAccount should work again (return undefined)
  const result3 = manager.reserveAccount('Arbitrum');
  t.is(result3, undefined, 'reserveAccount works again after release');

  // Verify the released vow was rejected, but handle it properly
  const rejectionPromise = vowTools.when(result2);
  await t.throwsAsync(
    rejectionPromise,
    { is: reason },
    'released vow was rejected with the provided reason',
  );
});

test('releaseAccount handles non-existent pending account gracefully', async t => {
  const { makePortfolioKit } = makeTestSetup();
  const { manager } = makePortfolioKit({ portfolioId: 789 });

  // Try to release an account that was never reserved
  t.notThrows(() => {
    manager.releaseAccount('Ethereum', new Error('Some reason'));
  }, 'releaseAccount handles non-existent pending gracefully');

  // Verify reserveAccount still works normally
  const result = manager.reserveAccount('Ethereum');
  t.is(result, undefined, 'reserveAccount works normally after failed release');
});

test('critical section pattern: reserve -> try resolve -> catch release', async t => {
  const { makePortfolioKit, vowTools } = makeTestSetup();
  const { manager } = makePortfolioKit({ portfolioId: 999 });
  const chainName = 'Optimism';

  // First reservation - returns undefined, creates pending entry
  const reserved1 = manager.reserveAccount(chainName);
  t.is(reserved1, undefined, 'first reservation returns undefined');

  // Get the vow that will be rejected
  const pending = manager.reserveAccount(chainName);
  t.truthy(pending, 'second call returns pending vow');

  // Release the account with a reason (simulating failed creation)
  const reason = new Error('Insufficient funds for account creation');
  manager.releaseAccount(chainName, reason);

  // Handle the rejection properly
  await t.throwsAsync(
    vowTools.when(pending),
    { is: reason },
    'pending vow was rejected with expected reason',
  );

  // Second attempt can proceed (not stuck in pending state)
  const reserved2 = manager.reserveAccount(chainName);
  t.is(reserved2, undefined, 'second attempt gets fresh start');
});

test('capture stateShape to be intentional about changes', t => {
  t.snapshot(
    PortfolioStateShape,
    'PortfolioStateShape: changes are limited to adding optional properties',
  );

  t.snapshot(PositionStateShape, 'PositionStateShape');
});

test('evmHandler deposit fails if owner does not match', async t => {
  const ownerAddress = '0x2222222222222222222222222222222222222222' as const;
  const wrongOwnerAddress =
    '0x3333333333333333333333333333333333333333' as const;

  const { makePortfolioKit } = makeTestSetup();
  const { evmHandler } = makePortfolioKit({
    portfolioId: 451,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  const permitDetails: PermitDetails = {
    chainId: 42161n,
    token: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const,
    amount: 1_000n,
    spender: '0xSpenderAddress' as const,
    permit2Payload: {
      owner: wrongOwnerAddress,
      witness: '0xWitnessData' as const,
      witnessTypeString: 'WitnessTypeString' as const,
      permit: {
        permitted: {
          token: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const,
          amount: 1_000n,
        },
        nonce: 123n,
        deadline: 1700000000n,
      },
      signature: '0xSignatureData' as const,
    },
  };

  await t.throws(() => evmHandler.deposit(permitDetails), {
    message: /permit owner .* does not match portfolio source address/,
  });
});

test('evmHandler deposit requires source account', t => {
  const { makePortfolioKit } = makeTestSetup();
  const { evmHandler } = makePortfolioKit({ portfolioId: 452 });

  const permitDetails: PermitDetails = {
    chainId: 42161n,
    token: contractsMock.Arbitrum.usdc as Address,
    amount: 1_000n,
    spender: '0xSpenderAddress000000000000000000000000000000' as Address,
    permit2Payload: {
      owner: '0x4444444444444444444444444444444444444444' as Address,
      witness: '0xWitnessData' as const,
      witnessTypeString: 'WitnessTypeString' as const,
      permit: {
        permitted: {
          token: contractsMock.Arbitrum.usdc as Address,
          amount: 1_000n,
        },
        nonce: 123n,
        deadline: 1700000000n,
      },
      signature: '0xSignatureData' as const,
    },
  };

  t.throws(() => evmHandler.deposit(permitDetails), {
    message: /deposit requires sourceAccountId to be set/,
  });
});

test('evmHandler deposit rejects unknown chainId', t => {
  const ownerAddress = '0x5555555555555555555555555555555555555555' as const;
  const { makePortfolioKit } = makeTestSetup();
  const { evmHandler } = makePortfolioKit({
    portfolioId: 453,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  const permitDetails: PermitDetails = {
    chainId: 999999n,
    token: contractsMock.Arbitrum.usdc as Address,
    amount: 1_000n,
    spender: '0xSpenderAddress000000000000000000000000000000' as Address,
    permit2Payload: {
      owner: ownerAddress,
      witness: '0xWitnessData' as const,
      witnessTypeString: 'WitnessTypeString' as const,
      permit: {
        permitted: {
          token: contractsMock.Arbitrum.usdc as Address,
          amount: 1_000n,
        },
        nonce: 123n,
        deadline: 1700000000n,
      },
      signature: '0xSignatureData' as const,
    },
  };

  t.throws(() => evmHandler.deposit(permitDetails), {
    message: /no Axelar chain for EIP-155 chainId/,
  });
});

test('evmHandler deposit rejects spender mismatch', t => {
  const ownerAddress = '0x6666666666666666666666666666666666666666' as const;
  const { makePortfolioKit } = makeTestSetup();
  const { evmHandler, manager } = makePortfolioKit({
    portfolioId: 454,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  manager.resolveAccount({
    namespace: 'eip155',
    chainName: 'Arbitrum',
    chainId: 'eip155:42161',
    remoteAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  } as any);

  const permitDetails: PermitDetails = {
    chainId: 42161n,
    token: contractsMock.Arbitrum.usdc as Address,
    amount: 1_000n,
    spender: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Address,
    permit2Payload: {
      owner: ownerAddress,
      witness: '0xWitnessData' as const,
      witnessTypeString: 'WitnessTypeString' as const,
      permit: {
        permitted: {
          token: contractsMock.Arbitrum.usdc as Address,
          amount: 1_000n,
        },
        nonce: 123n,
        deadline: 1700000000n,
      },
      signature: '0xSignatureData' as const,
    },
  };

  t.throws(() => evmHandler.deposit(permitDetails), {
    message: /permit spender .* does not match portfolio account/,
  });
});

test('evmHandler deposit rejects token mismatch', t => {
  const ownerAddress = '0x7777777777777777777777777777777777777777' as const;
  const { makePortfolioKit } = makeTestSetup();
  const { evmHandler, manager } = makePortfolioKit({
    portfolioId: 455,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  manager.resolveAccount({
    namespace: 'eip155',
    chainName: 'Arbitrum',
    chainId: 'eip155:42161',
    remoteAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  } as any);

  const permitDetails: PermitDetails = {
    chainId: 42161n,
    token: contractsMock.Arbitrum.permit2 as Address,
    amount: 1_000n,
    spender: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address,
    permit2Payload: {
      owner: ownerAddress,
      witness: '0xWitnessData' as const,
      witnessTypeString: 'WitnessTypeString' as const,
      permit: {
        permitted: {
          token: contractsMock.Arbitrum.permit2 as Address,
          amount: 1_000n,
        },
        nonce: 123n,
        deadline: 1700000000n,
      },
      signature: '0xSignatureData' as const,
    },
  };

  t.throws(() => evmHandler.deposit(permitDetails), {
    message: /permit token address .* does not match usdc contract address/,
  });
});

test('evmHandler deposit starts flow and calls executePlan', t => {
  const ownerAddress = '0x8888888888888888888888888888888888888888' as const;
  const { makePortfolioKit, getCallLog } = makeTestSetup();
  const { evmHandler, manager } = makePortfolioKit({
    portfolioId: 456,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  manager.resolveAccount({
    namespace: 'eip155',
    chainName: 'Arbitrum',
    chainId: 'eip155:42161',
    remoteAddress: '0x9999999999999999999999999999999999999999',
  } as any);

  const permitDetails: PermitDetails = {
    chainId: 42161n,
    token: contractsMock.Arbitrum.usdc as Address,
    amount: 2_500n,
    spender: '0x9999999999999999999999999999999999999999' as Address,
    permit2Payload: {
      owner: ownerAddress,
      witness: '0xWitnessData' as const,
      witnessTypeString: 'WitnessTypeString' as const,
      permit: {
        permitted: {
          token: contractsMock.Arbitrum.usdc as Address,
          amount: 2_500n,
        },
        nonce: 456n,
        deadline: 1700000000n,
      },
      signature: '0xSignatureData' as const,
    },
  };

  t.is(evmHandler.deposit(permitDetails), 'flow1');

  t.like(getCallLog(), [
    [
      'executePlan',
      ,
      {},
      ,
      {
        type: 'deposit',
        amount: AmountMath.make(USDC, 2_500n),
        fromChain: 'Arbitrum',
      },
      { flowId: 1 },
      ,
      {
        evmDepositDetail: {
          fromChain: 'Arbitrum',
          ...permitDetails,
        },
      },
    ],
  ]);
});

test('evmHandler withdraw requires source account', t => {
  const { makePortfolioKit } = makeTestSetup();
  const { evmHandler } = makePortfolioKit({ portfolioId: 1 });

  t.throws(
    () =>
      evmHandler.withdraw({
        withdrawDetails: {
          amount: 1n,
          token: contractsMock.Arbitrum.usdc as Address,
        },
      }),
    { message: /withdraw requires sourceAccountId to be set/ },
  );
});

test('evmHandler withdraw check address', t => {
  const ownerAddress = '0x1111111111111111111111111111111111111111' as const;
  const wrongAddress = '0x2222222222222222222222222222222222222222' as const;
  const { makePortfolioKit } = makeTestSetup();
  const { evmHandler } = makePortfolioKit({
    portfolioId: 3,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  t.throws(
    () =>
      evmHandler.withdraw({
        withdrawDetails: {
          amount: 10n,
          token: contractsMock.Arbitrum.usdc as Address,
        },
        address: wrongAddress,
      }),
    { message: /withdraw address .* does not match source account address/ },
  );
});

test('evmHandler withdraw uses chainId from domain', t => {
  const ownerAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
  const { makePortfolioKit, getCallLog } = makeTestSetup();
  const { evmHandler } = makePortfolioKit({
    portfolioId: 4,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  const amount = 500n;
  const result = evmHandler.withdraw({
    withdrawDetails: {
      amount,
      token: contractsMock.Base.usdc as Address,
    },
    domain: { chainId: 8453n },
  });

  t.is(result, 'flow1');
  t.like(getCallLog(), [
    [
      'executePlan',
      ,
      {},
      ,
      {
        type: 'withdraw',
        amount: AmountMath.make(USDC, amount),
        toChain: 'Base',
      },
      { flowId: 1 },
    ],
  ]);
});

test('evmHandler withdraw defaults to source chainId if domain missing', t => {
  const ownerAddress = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;
  const { makePortfolioKit, getCallLog } = makeTestSetup();
  const { evmHandler } = makePortfolioKit({
    portfolioId: 5,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  const amount = 750n;
  const result = evmHandler.withdraw({
    withdrawDetails: {
      amount,
      token: contractsMock.Arbitrum.usdc as Address,
    },
  });

  t.is(result, 'flow1');
  t.like(getCallLog(), [
    [
      'executePlan',
      ,
      {},
      ,
      {
        type: 'withdraw',
        amount: AmountMath.make(USDC, amount),
        toChain: 'Arbitrum',
      },
      { flowId: 1 },
    ],
  ]);
});

test('evmHandler withdraw fails for unsupported chainId', t => {
  const ownerAddress = '0xcccccccccccccccccccccccccccccccccccccccc' as const;
  const { makePortfolioKit } = makeTestSetup();
  const { evmHandler } = makePortfolioKit({
    portfolioId: 6,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  t.throws(
    () =>
      evmHandler.withdraw({
        withdrawDetails: {
          amount: 10n,
          token: contractsMock.Arbitrum.usdc as Address,
        },
        domain: { chainId: 999999n },
      }),
    { message: /destination chainId .* is not supported for withdraw/ },
  );
});

test('evmHandler withdraw check token address is USDC contract', t => {
  const ownerAddress = '0xdddddddddddddddddddddddddddddddddddddddd' as const;
  const { makePortfolioKit } = makeTestSetup();
  const { evmHandler } = makePortfolioKit({
    portfolioId: 7,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  t.throws(
    () =>
      evmHandler.withdraw({
        withdrawDetails: {
          amount: 10n,
          token: contractsMock.Arbitrum.permit2 as Address,
        },
      }),
    {
      message: /withdraw token address .* does not match usdc contract address/,
    },
  );
});

test('evmHandler rebalance requires source account', t => {
  const { makePortfolioKit } = makeTestSetup();
  const { evmHandler } = makePortfolioKit({ portfolioId: 8 });

  t.throws(() => evmHandler.rebalance(), {
    message: /rebalance requires sourceAccountId to be set/,
  });
});

test('evmHandler rebalance does not yet support deposit', t => {
  const ownerAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as const;
  const { makePortfolioKit } = makeTestSetup();
  const { evmHandler } = makePortfolioKit({
    portfolioId: 9,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  const permitDetails: PermitDetails = {
    chainId: 42161n,
    token: contractsMock.Arbitrum.usdc as Address,
    amount: 1_000n,
    spender: '0xSpenderAddress000000000000000000000000000000' as Address,
    permit2Payload: {
      owner: ownerAddress,
      witness: '0xWitnessData' as const,
      witnessTypeString: 'WitnessTypeString' as const,
      permit: {
        permitted: {
          token: contractsMock.Arbitrum.usdc as Address,
          amount: 1_000n,
        },
        nonce: 123n,
        deadline: 1700000000n,
      },
      signature: '0xSignatureData' as const,
    },
  };

  t.throws(() => evmHandler.rebalance(undefined, permitDetails), {
    message: /rebalance does not yet support deposit/,
  });
});

test('evmHandler rebalance with allocations sets new target allocation', t => {
  const ownerAddress = '0xffffffffffffffffffffffffffffffffffffffff' as const;
  const { makePortfolioKit, getCallLog } = makeTestSetup();
  const { evmHandler, reader } = makePortfolioKit({
    portfolioId: 10,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  const allocations: readonly EIP712Allocation[] = [
    { instrument: 'USDN', portion: 60n },
    { instrument: 'Beefy_compoundUsdc_Arbitrum', portion: 40n },
  ];

  const result = evmHandler.rebalance(allocations);

  t.is(result, 'flow1');
  t.deepEqual(reader.getTargetAllocation(), {
    USDN: 60n,
    Beefy_compoundUsdc_Arbitrum: 40n,
  });

  t.like(getCallLog(), [
    ['executePlan', , {}, , { type: 'rebalance' }, { flowId: 1 }],
  ]);
});

test('evmHandler rebalance with allocations requires non-empty allocations', t => {
  const ownerAddress = '0xabababababababababababababababababababab' as const;
  const { makePortfolioKit } = makeTestSetup();
  const { evmHandler } = makePortfolioKit({
    portfolioId: 11,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  t.throws(() => evmHandler.rebalance([]), {
    message: /rebalance with allocations requires non-empty allocations/,
  });
});

test('evmHandler rebalance without allocations uses current target allocation', t => {
  const ownerAddress = '0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd' as const;
  const { makePortfolioKit } = makeTestSetup();
  const { evmHandler, manager, reader } = makePortfolioKit({
    portfolioId: 12,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  const currentAllocation = {
    USDN: 25n,
    Beefy_compoundUsdc_Arbitrum: 75n,
  };
  manager.setTargetAllocation(currentAllocation);

  t.is(evmHandler.rebalance(), 'flow1');
  t.deepEqual(reader.getTargetAllocation(), currentAllocation);
});

test('evmHandler rebalance without allocations fails without current target allocation', t => {
  const ownerAddress = '0xefefefefefefefefefefefefefefefefefefefef' as const;
  const { makePortfolioKit } = makeTestSetup();
  const { evmHandler } = makePortfolioKit({
    portfolioId: 13,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  t.throws(() => evmHandler.rebalance(), {
    message: /rebalance requires targetAllocation to be set/,
  });
});
