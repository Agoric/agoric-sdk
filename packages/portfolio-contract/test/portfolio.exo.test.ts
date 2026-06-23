/** @file tests for PortfolioKit exo */
/* eslint-disable no-sparse-arrays */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { ThrowsExpectation } from 'ava';

import { makeIssuerKit } from '@agoric/ertp';
import {
  fromTypedEntries,
  typedEntries,
  type Callable,
} from '@agoric/internal';
import type { StorageNode } from '@agoric/internal/src/lib-chainStorage.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { PortfolioPlannerAgent } from '@agoric/portfolio-api';
import type { AxelarChain } from '@agoric/portfolio-api';
import type { TargetAllocation as EIP712Allocation } from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import type { PermitDetails } from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { prepareVowTools } from '@agoric/vow';
import { makeHeapZone } from '@agoric/zone';
import { Far } from '@endo/pass-style';
import { hexToBytes } from '@noble/hashes/utils';
import type { Address } from 'abitype';
import {
  PortfolioStateShape,
  preparePortfolioKit,
  type AccountInfoFor,
} from '../src/portfolio.exo.ts';
import type { LocalAccount } from '../src/portfolio.flows.ts';
import { PositionStateShape } from '../src/pos.exo.ts';
import type { StatusFor } from '../src/type-guards.ts';
import { predictWalletAddress } from '../src/utils/evm-orch-factory.ts';
import { predictRemoteAccountAddress } from '../src/utils/evm-orch-router.ts';
import { contractsMock } from './mocks.ts';
import { axelarCCTPConfig, makeStorageTools } from './supports.ts';

const { brand: USDC } = makeIssuerKit('USDC');

type PortfolioKitDeps = Parameters<typeof preparePortfolioKit>[1];

const makeSpies = <T extends Record<string, Callable>>(
  stubs: T,
): {
  spies: T;
  log: { [P in keyof T]: [P, ...Parameters<T[P]>] }[keyof T][];
} => {
  const log: { [P in keyof T]: [P, ...Parameters<T[P]>] }[keyof T][] = [];

  const spies = fromTypedEntries(
    typedEntries(stubs).map(([k, stub]) => {
      const key = k as keyof T;
      type Stub = (typeof stubs)[typeof k];
      const wrapped = ((...args: Parameters<Stub>) => {
        log.push([key, ...args] as [typeof key, ...Parameters<Stub>]);
        // `stub` is a Callable, so this cast is safe with respect to `T[keyof T]`
        return (stub as Callable)(...args);
      }) as Stub;
      return [key, wrapped];
    }),
  );

  // @ts-expect-error generics
  return { spies, log };
};

const makeTestSetup = (
  opts: {
    storage?: ReturnType<typeof makeFakeStorageKit>;
  } = {},
) => {
  const zone = makeHeapZone();
  const board = makeFakeBoard();
  const marshaller = board.getReadonlyMarshaller();
  const vowTools = prepareVowTools(zone);

  const depStubs: Pick<
    PortfolioKitDeps,
    'rebalance' | 'executePlan' | 'deliverDelegation'
  > = {
    rebalance: (..._args: Parameters<PortfolioKitDeps['rebalance']>) =>
      vowTools.asVow(() => {}),
    executePlan: (..._args: Parameters<PortfolioKitDeps['executePlan']>) =>
      vowTools.asVow(() => {}),
    deliverDelegation: async (
      ..._args: Parameters<PortfolioKitDeps['deliverDelegation']>
    ) => {},
  };

  const { spies, log: callLog } = makeSpies(depStubs);

  const makeMockNode = (here: string) => {
    const node = harden({
      makeChildNode: (name: string) => makeMockNode(`${here}.${name}`),
      setValue: _x => {},
    }) as unknown as StorageNode;
    return node;
  };

  const eip155ChainIdToAxelarChain = fromTypedEntries(
    typedEntries(axelarCCTPConfig).map(([name, info]) => [
      `${Number(info.reference)}`,
      name,
    ]),
  ) as Record<`${number}`, AxelarChain>;

  let lcaNonce = 0;
  const makeMockLCA = (): LocalAccount => {
    const addr = harden({
      chainId: 'cosmos:agoric-3',
      value: `agoric1${1000 + 7 * (lcaNonce += 2)}`,
      encoding: 'bech32',
    } as const);

    const lca = Far('AgoricAccount', {
      getAddress: () => addr,
    }) satisfies Partial<LocalAccount>;

    return lca as any;
  };

  const walletBytecode = '0x1234';

  const predictMockWalletAddress = (lca: LocalAccount) =>
    predictWalletAddress({
      owner: lca.getAddress().value,
      factoryAddress: contractsMock.Arbitrum.factory,
      gatewayAddress: contractsMock.Arbitrum.gateway,
      gasServiceAddress: contractsMock.Arbitrum.gasService,
      walletBytecode: hexToBytes(walletBytecode.replace(/^0x/, '')),
    });

  const predictMockRemoteAccountAddress = (lca: LocalAccount) =>
    predictRemoteAccountAddress({
      factoryAddress: contractsMock.Arbitrum.remoteAccountFactory,
      implementationAddress: contractsMock.Arbitrum.remoteAccountImplementation,
      owner: lca.getAddress().value,
    });

  const agoricConns = fetchedChainInfo.agoric.connections;
  const transferChannels = {
    noble: agoricConns[fetchedChainInfo.noble.chainId].transferChannel,
    axelar: agoricConns[fetchedChainInfo.axelar.chainId].transferChannel,
  } as const;

  const portfoliosNode = opts.storage
    ? opts.storage.rootNode.makeChildNode('ymax0').makeChildNode('portfolios')
    : makeMockNode('published.ymax0.portfolios');

  const makePortfolioKit = preparePortfolioKit(zone, {
    portfoliosNode,
    marshaller,
    usdcBrand: USDC,
    vowTools,
    eip155ChainIdToAxelarChain,
    ...spies,
    zcf: {
      makeEmptySeatKit: () => ({ zcfSeat: harden({}) }),
    } as any,
    contracts: contractsMock,
    walletBytecode,
    transferChannels,
    // rest are not used for this test
    ...({} as any),
  });

  return {
    makePortfolioKit,
    makeMockLCA,
    predictMockWalletAddress,
    predictMockRemoteAccountAddress,
    vowTools,
    getCallLog: () => callLog.slice(),
    ...(opts.storage ? makeStorageTools(opts.storage) : {}),
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

test('manager releases evm pending accounts when starting a new flow', async t => {
  const { makePortfolioKit } = makeTestSetup();
  const { manager, reader } = makePortfolioKit({ portfolioId: 1 });

  manager.reserveAccount('noble');
  const { state: arbitrumStateBefore } =
    manager.reserveAccountState('Arbitrum');
  t.is(arbitrumStateBefore, 'new');
  manager.initAccountInfo({
    chainName: 'Arbitrum',
    chainId: 'eip155:42161',
    namespace: 'eip155',
    remoteAddress: '0x1234',
  });

  const { state: arbitrumStateAfterInit } =
    manager.reserveAccountState('Arbitrum');
  t.is(arbitrumStateAfterInit, 'pending');

  manager.startFlow({ type: 'deposit', amount: { brand: USDC, value: 100n } });

  const accountInfoAfterStart = reader.getGMPInfo('Arbitrum');
  t.truthy(accountInfoAfterStart.err);
  const { state: arbitrumStateAfterStart } =
    manager.reserveAccountState('Arbitrum');
  t.is(arbitrumStateAfterStart, 'failed');

  const { noble } = reader.accountIdByChain();
  t.is(noble, undefined, 'no noble info');
  const { state: nobleStateAfterStart } = manager.reserveAccountState('noble');
  t.is(nobleStateAfterStart, 'pending');
});

test('evmHandler deposit fails if owner does not match', async t => {
  const ownerAddress = '0x2222222222222222222222222222222222222222' as Address;
  const wrongOwnerAddress =
    '0x3333333333333333333333333333333333333333' as Address;

  const { makePortfolioKit } = makeTestSetup();
  const { evmHandler } = makePortfolioKit({
    portfolioId: 451,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  const permitDetails: PermitDetails = {
    chainId: 42161n,
    token: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    amount: 1_000n,
    spender: '0xSpenderAddress',
    permit2Payload: {
      owner: wrongOwnerAddress,
      witness: '0xWitnessData',
      witnessTypeString: 'WitnessTypeString',
      permit: {
        permitted: {
          token: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          amount: 1_000n,
        },
        nonce: 123n,
        deadline: 1700000000n,
      },
      signature: '0xSignatureData',
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
    token: contractsMock.Arbitrum.usdc,
    amount: 1_000n,
    spender: '0xSpenderAddress000000000000000000000000000000',
    permit2Payload: {
      owner: '0x4444444444444444444444444444444444444444',
      witness: '0xWitnessData',
      witnessTypeString: 'WitnessTypeString',
      permit: {
        permitted: {
          token: contractsMock.Arbitrum.usdc,
          amount: 1_000n,
        },
        nonce: 123n,
        deadline: 1700000000n,
      },
      signature: '0xSignatureData',
    },
  };

  t.throws(() => evmHandler.deposit(permitDetails), {
    message: /deposit requires sourceAccountId to be set/,
  });
});

test('evmHandler deposit rejects unknown chainId', t => {
  const ownerAddress = '0x5555555555555555555555555555555555555555' as Address;
  const { makePortfolioKit } = makeTestSetup();
  const { evmHandler } = makePortfolioKit({
    portfolioId: 453,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  const permitDetails: PermitDetails = {
    chainId: 999999n,
    token: contractsMock.Arbitrum.usdc,
    amount: 1_000n,
    spender: '0xSpenderAddress000000000000000000000000000000',
    permit2Payload: {
      owner: ownerAddress,
      witness: '0xWitnessData',
      witnessTypeString: 'WitnessTypeString',
      permit: {
        permitted: {
          token: contractsMock.Arbitrum.usdc,
          amount: 1_000n,
        },
        nonce: 123n,
        deadline: 1700000000n,
      },
      signature: '0xSignatureData',
    },
  };

  t.throws(() => evmHandler.deposit(permitDetails), {
    message: /no Axelar chain for EIP-155 chainId/,
  });
});

type EVMDepositRemoteAccountConfig = {
  remoteAddress: Address | 'deriveDepositFactory' | 'deriveRouter';
  routerFactory?: Address;
};

const doEVMDeposit = test.macro(
  async (
    t,
    params: {
      remoteAccount?: EVMDepositRemoteAccountConfig | undefined;
      otherRemoteAccount?: EVMDepositRemoteAccountConfig | undefined;
      spender?: Address | 'deriveDepositFactory' | 'deriveRouter';
      expectFail?: ThrowsExpectation<any> | boolean;
    },
  ) => {
    const ownerAddress =
      '0x6666666666666666666666666666666666666666' as Address;
    const storage = makeFakeStorageKit('published', { sequence: true });
    const {
      makePortfolioKit,
      makeMockLCA,
      predictMockWalletAddress,
      predictMockRemoteAccountAddress,
      getCallLog,
      getPortfolioStatus,
    } = makeTestSetup({ storage });
    const { evmHandler, manager, reader } = makePortfolioKit({
      portfolioId: 454,
      sourceAccountId: `eip155:42161:${ownerAddress}`,
    });
    const agoricInfo: AccountInfoFor['agoric'] = {
      namespace: 'cosmos',
      chainName: 'agoric',
      lca: makeMockLCA(),
      lcaIn: makeMockLCA(),
      reg: undefined as any,
    };
    manager.resolveAccount(agoricInfo);

    const expectedRemoteAccountAddress = predictMockRemoteAccountAddress(
      agoricInfo.lca,
    );
    const expectedWalletAddress = predictMockWalletAddress(agoricInfo.lca);

    if (params.remoteAccount) {
      const { remoteAddress, ...otherRemoteAccountInfo } = params.remoteAccount;
      const resolvedRemoteAddress =
        remoteAddress === 'deriveDepositFactory'
          ? expectedWalletAddress
          : remoteAddress === 'deriveRouter'
            ? expectedRemoteAccountAddress
            : remoteAddress;

      const arbitrumInfo: AccountInfoFor['Arbitrum'] = {
        namespace: 'eip155',
        chainName: 'Arbitrum',
        chainId: 'eip155:42161',
        remoteAddress: resolvedRemoteAddress,
        ...otherRemoteAccountInfo,
      };
      manager.resolveAccount(arbitrumInfo);
    }

    if (params.otherRemoteAccount) {
      const { remoteAddress, ...otherRemoteAccountInfo } =
        params.otherRemoteAccount;
      const resolvedRemoteAddress =
        remoteAddress === 'deriveDepositFactory'
          ? expectedWalletAddress
          : remoteAddress === 'deriveRouter'
            ? expectedRemoteAccountAddress
            : remoteAddress;

      const baseInfo: AccountInfoFor['Base'] = {
        namespace: 'eip155',
        chainName: 'Base',
        chainId: 'eip155:8453',
        remoteAddress: resolvedRemoteAddress,
        ...otherRemoteAccountInfo,
      };
      manager.resolveAccount(baseInfo);
    }

    const permitDetails: PermitDetails = {
      chainId: 42161n,
      token: contractsMock.Arbitrum.usdc,
      amount: 1_000n,
      spender:
        params.spender === 'deriveDepositFactory'
          ? expectedWalletAddress
          : params.spender === 'deriveRouter'
            ? expectedRemoteAccountAddress
            : (params.spender ?? reader.getGMPInfo('Arbitrum').remoteAddress),
      permit2Payload: {
        owner: ownerAddress,
        witness: '0xWitnessData',
        witnessTypeString: 'WitnessTypeString',
        permit: {
          permitted: {
            token: contractsMock.Arbitrum.usdc,
            amount: 1_000n,
          },
          nonce: 123n,
          deadline: 1700000000n,
        },
        signature: '0xSignatureData',
      },
    };

    if (params.expectFail) {
      const assertion =
        params.expectFail === true ? undefined : params.expectFail;
      t.throws(() => evmHandler.deposit(permitDetails), assertion);
      return;
    }

    t.is(evmHandler.deposit(permitDetails), 'flow1');
    t.like(getCallLog(), [
      [
        'executePlan',
        ,
        {},
        ,
        undefined,
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
    t.like(await getPortfolioStatus!(454), {
      flowsRunning: {
        flow1: {
          type: 'deposit',
          fromChain: 'Arbitrum',
          amount: { value: 1_000n },
        },
      },
    });
  },
);

test(
  'evmHandler deposit handles depositFactory spender without existing remote account',
  doEVMDeposit,
  { spender: contractsMock.Arbitrum.depositFactory },
);

test(
  'evmHandler deposit handles router spender without existing remote account',
  doEVMDeposit,
  { spender: contractsMock.Arbitrum.remoteAccountRouter },
);

test(
  'evmHandler deposit handles depositFactory spender with existing remote account',
  doEVMDeposit,
  {
    spender: contractsMock.Arbitrum.depositFactory,
    remoteAccount: { remoteAddress: 'deriveDepositFactory' },
  },
);

test(
  'evmHandler deposit handles router spender with existing remote account',
  doEVMDeposit,
  {
    spender: contractsMock.Arbitrum.remoteAccountRouter,
    remoteAccount: {
      remoteAddress: 'deriveRouter',
      routerFactory: contractsMock.Arbitrum.remoteAccountFactory,
    },
  },
);

test(
  'evmHandler deposit rejects depositFactory spender if existing remote account is not factory generated',
  doEVMDeposit,
  {
    spender: contractsMock.Arbitrum.depositFactory,
    remoteAccount: {
      remoteAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    },
    expectFail: true,
  },
);

test(
  'evmHandler deposit rejects router spender if existing remote account is not factory generated',
  doEVMDeposit,
  {
    spender: contractsMock.Arbitrum.remoteAccountRouter,
    remoteAccount: {
      remoteAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    },
    expectFail: true,
  },
);

test(
  'evmHandler deposit handles non-router based arbitrary remote account spender',
  doEVMDeposit,
  {
    remoteAccount: {
      remoteAddress: '0x9999999999999999999999999999999999999999',
    },
  },
);

test(
  'evmHandler deposit handles deposit factory derived remote account spender',
  doEVMDeposit,
  { remoteAccount: { remoteAddress: 'deriveDepositFactory' } },
);

test(
  'evmHandler deposit handles router-based remote account spender',
  doEVMDeposit,
  {
    remoteAccount: {
      remoteAddress: 'deriveRouter',
      routerFactory: contractsMock.Arbitrum.remoteAccountFactory,
    },
  },
);

test(
  'evmHandler deposit rejects misconfigured router based remote account spender',
  doEVMDeposit,
  {
    remoteAccount: {
      remoteAddress: '0x9999999999999999999999999999999999999999',
      routerFactory: contractsMock.Arbitrum.remoteAccountFactory,
    },
    expectFail: true,
  },
);

test(
  'evmHandler deposit rejects spender mismatch with non-router based remote account',
  doEVMDeposit,
  {
    remoteAccount: {
      remoteAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    },
    spender: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    expectFail: true,
  },
);
test(
  'evmHandler deposit rejects spender mismatch with router based remote account',
  doEVMDeposit,
  {
    remoteAccount: {
      remoteAddress: 'deriveRouter',
      routerFactory: contractsMock.Arbitrum.remoteAccountFactory,
    },
    spender: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    expectFail: {
      message: /permit spender .* does not match/,
    },
  },
);

test(
  'evmHandler deposit rejects spender mismatch with expected deposit factory derived remote account',
  doEVMDeposit,
  {
    spender: 'deriveRouter',
    expectFail: true,
  },
);

test(
  'evmHandler deposit rejects spender mismatch with expected router based remote account',
  doEVMDeposit,
  {
    otherRemoteAccount: {
      remoteAddress: 'deriveRouter',
      routerFactory: contractsMock.Base.remoteAccountFactory,
    },
    spender: 'deriveDepositFactory',
    expectFail: true,
  },
);

test('evmHandler deposit rejects token mismatch', t => {
  const ownerAddress = '0x7777777777777777777777777777777777777777' as Address;
  const { makePortfolioKit } = makeTestSetup();
  const { evmHandler, manager } = makePortfolioKit({
    portfolioId: 455,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  const arbitrumInfo: AccountInfoFor['Arbitrum'] = {
    namespace: 'eip155',
    chainName: 'Arbitrum',
    chainId: 'eip155:42161',
    remoteAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  };
  manager.resolveAccount(arbitrumInfo);

  const permitDetails: PermitDetails = {
    chainId: 42161n,
    token: contractsMock.Arbitrum.permit2,
    amount: 1_000n,
    spender: arbitrumInfo.remoteAddress,
    permit2Payload: {
      owner: ownerAddress,
      witness: '0xWitnessData',
      witnessTypeString: 'WitnessTypeString',
      permit: {
        permitted: {
          token: contractsMock.Arbitrum.permit2,
          amount: 1_000n,
        },
        nonce: 123n,
        deadline: 1700000000n,
      },
      signature: '0xSignatureData',
    },
  };

  t.throws(() => evmHandler.deposit(permitDetails), {
    message: /permit token address .* does not match usdc contract address/,
  });
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

test('evmHandler withdraw uses chainId from domain', async t => {
  const ownerAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
  const storage = makeFakeStorageKit('published', { sequence: true });
  const { makePortfolioKit, getCallLog, getPortfolioStatus } = makeTestSetup({
    storage,
  });
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
  t.like(getCallLog(), [['executePlan', , {}, , undefined, { flowId: 1 }]]);
  t.like(await getPortfolioStatus!(4), {
    flowsRunning: {
      flow1: { type: 'withdraw', toChain: 'Base', amount: { value: amount } },
    },
  });
});

test('evmHandler withdraw defaults to source chainId if domain missing', async t => {
  const ownerAddress = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;
  const storage = makeFakeStorageKit('published', { sequence: true });
  const { makePortfolioKit, getCallLog, getPortfolioStatus } = makeTestSetup({
    storage,
  });
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
  t.like(getCallLog(), [['executePlan', , {}, , undefined, { flowId: 1 }]]);
  t.like(await getPortfolioStatus!(5), {
    flowsRunning: {
      flow1: {
        type: 'withdraw',
        toChain: 'Arbitrum',
        amount: { value: amount },
      },
    },
  });
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

test('evmHandler rebalance with allocations sets new target allocation', async t => {
  const ownerAddress = '0xffffffffffffffffffffffffffffffffffffffff' as const;
  const storage = makeFakeStorageKit('published', { sequence: true });
  const { makePortfolioKit, getCallLog, getPortfolioStatus } = makeTestSetup({
    storage,
  });
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

  t.like(getCallLog(), [['executePlan', , {}, , undefined, { flowId: 1 }]]);
  t.like(await getPortfolioStatus!(10), {
    flowsRunning: { flow1: { type: 'rebalance' } },
  });
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

test('evmHandler grant passes only the delegation client to delivery', async t => {
  const ownerAddress = '0x1212121212121212121212121212121212121212' as const;
  const { makePortfolioKit, getCallLog } = makeTestSetup();
  const { evmHandler, delegationHelper } = makePortfolioKit({
    portfolioId: 14,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });
  t.truthy(delegationHelper);

  await evmHandler.grant('agoric1delegate', { allocation: true });

  const callLog = getCallLog();
  t.is(callLog.length, 1);
  t.is(callLog[0][0], 'deliverDelegation');
  const [, client, portfolioId, agentId, grantee, permissions] = callLog[0] as [
    'deliverDelegation',
    ...Parameters<PortfolioKitDeps['deliverDelegation']>,
  ];
  t.truthy(client);
  t.is(portfolioId, 14);
  t.is(agentId, 1);
  t.is(grantee, 'agoric1delegate');
  t.deepEqual(permissions, { allocation: true });
});

test('evmHandler grant allocates sequential agent ids', async t => {
  const ownerAddress = '0x3434343434343434343434343434343434343434' as const;
  const { makePortfolioKit, getCallLog } = makeTestSetup();
  const { evmHandler } = makePortfolioKit({
    portfolioId: 18,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  await evmHandler.grant('agoric1delegatea', { allocation: true });
  await evmHandler.grant('agoric1delegateb', { allocation: true });

  const callLog = getCallLog();
  t.is(callLog.length, 2);
  t.is(callLog[0][3], 1);
  t.is(callLog[1][3], 2);

  await Promise.all([
    evmHandler.grant('agoric1delegatec', { allocation: true }),
    evmHandler.grant('agoric1delegated', { allocation: true }),
  ]);

  const callLogRaced = getCallLog();
  t.is(callLogRaced.length, 4);
  t.is(callLogRaced[2][3], 3);
  t.is(callLogRaced[3][3], 4);
});

test('delegation rebalance creates flow and calls executePlan', async t => {
  const storage = makeFakeStorageKit('published', { sequence: true });
  const { makePortfolioKit, getCallLog, getPortfolioStatus } = makeTestSetup({
    storage,
  });
  const { manager } = makePortfolioKit({ portfolioId: 20 });

  const agentId = await manager.grantDelegation('agoric1delegate', {
    allocation: false,
    rebalance: true,
  });

  t.is(agentId, 1);

  const callLog = getCallLog();
  t.is(callLog.length, 1);
  t.is(callLog[0][0], 'deliverDelegation');

  const [, client] = callLog[0] as [
    'deliverDelegation',
    ...Parameters<PortfolioKitDeps['deliverDelegation']>,
  ];

  t.is(client.rebalance({ policyVersion: 0, rebalanceCount: 0 }), 'flow1');
  t.like(getCallLog()[1], ['executePlan', , {}, , undefined, { flowId: 1 }]);
  t.like(await getPortfolioStatus!(20), {
    flowsRunning: { flow1: { type: 'rebalance' } },
  });
});

test('allocation delegation cannot use rebalance', async t => {
  const { makePortfolioKit, getCallLog } = makeTestSetup();
  const { manager } = makePortfolioKit({ portfolioId: 21 });

  const agentId = await manager.grantDelegation('agoric1delegate', {
    allocation: true,
  });

  t.is(agentId, 1);

  const callLog = getCallLog();
  t.is(callLog.length, 1);
  t.is(callLog[0][0], 'deliverDelegation');

  const [, client] = callLog[0] as [
    'deliverDelegation',
    ...Parameters<PortfolioKitDeps['deliverDelegation']>,
  ];

  t.throws(() => client.rebalance({ policyVersion: 0, rebalanceCount: 0 }), {
    message: /delegation agent1 does not have required permission "rebalance"/,
  });
  t.is(getCallLog().length, 1, 'rebalance denial does not start a flow');
});

test('revoked delegation client is no longer usable', async t => {
  const ownerAddress = '0x4545454545454545454545454545454545454545' as const;
  const storage = makeFakeStorageKit('published', { sequence: true });
  const { makePortfolioKit, getCallLog, getPortfolioAgents } = makeTestSetup({
    storage,
  });
  const { evmHandler, manager } = makePortfolioKit({
    portfolioId: 19,
    sourceAccountId: `eip155:42161:${ownerAddress}`,
  });

  manager.setTargetAllocation({ USDN: 100n });
  await evmHandler.grant('agoric1delegate', { allocation: true });

  const callLog = getCallLog();
  t.is(callLog.length, 1);
  t.is(callLog[0][0], 'deliverDelegation');
  const [, client, , agentId] = callLog[0] as [
    'deliverDelegation',
    ...Parameters<PortfolioKitDeps['deliverDelegation']>,
  ];

  t.true(client.getReader().isActive());
  t.like(await getPortfolioAgents!(19), {
    agent1: { state: 'active' },
  });

  manager.revokeDelegation(agentId);

  t.false(client.getReader().isActive());
  t.like(await getPortfolioAgents!(19), {
    agent1: { state: 'revoked' },
  });
  t.throws(
    () =>
      client.setTargetAllocation(
        { USDN: 100n },
        { policyVersion: 1, rebalanceCount: 0 },
      ),
    {
      message: /delegation client is not active for agent1/,
    },
  );
});

test('setAutoFeatures grants, updates, and regrants planner delegation and publishes status', async t => {
  const storage = makeFakeStorageKit('published', { sequence: true });
  const {
    makePortfolioKit,
    getCallLog,
    getPortfolioStatus,
    getPortfolioAgents,
  } = makeTestSetup({
    storage,
  });

  const { manager } = makePortfolioKit({ portfolioId: 22 });

  await manager.setAutoFeatures({ rebalance: false });
  t.is(
    getCallLog().length,
    0,
    'no planner delegation is granted without permissions',
  );
  t.like(await getPortfolioStatus!(22), {
    enabledAutoFeatures: { rebalance: false },
  });

  await manager.setAutoFeatures({ rebalance: true });
  t.like(getCallLog(), [
    ['deliverDelegation', , 22, 1, PortfolioPlannerAgent, { rebalance: true }],
  ]);
  t.like(await getPortfolioStatus!(22), {
    enabledAutoFeatures: { rebalance: true },
  });
  t.like(await getPortfolioAgents!(22), {
    agent1: {
      grantee: PortfolioPlannerAgent,
      permissions: { rebalance: true },
      state: 'active',
    },
  });
  const [, client] = getCallLog()[0] as [
    'deliverDelegation',
    ...Parameters<PortfolioKitDeps['deliverDelegation']>,
  ];

  t.is(client.rebalance({ policyVersion: 0, rebalanceCount: 0 }), 'flow1');
  t.is(getCallLog().length, 2);
  t.like(getCallLog(), [
    ['deliverDelegation'],
    ['executePlan', , {}, , undefined, { flowId: 1 }],
  ]);
  t.like(await getPortfolioStatus!(22), {
    flowsRunning: { flow1: { type: 'rebalance' } },
  });

  await manager.setAutoFeatures({ rebalance: false });
  t.is(getCallLog().length, 2, 'active planner delegation is updated in place');
  t.like(await getPortfolioStatus!(22), {
    enabledAutoFeatures: { rebalance: false },
  });
  t.like(await getPortfolioAgents!(22), {
    agent1: {
      grantee: PortfolioPlannerAgent,
      permissions: { rebalance: false },
      state: 'active',
    },
  });
  t.throws(() => client.rebalance({ policyVersion: 1, rebalanceCount: 0 }), {
    message: /delegation agent1 does not have required permission "rebalance"/,
  });

  manager.revokeDelegation(1);

  await manager.setAutoFeatures({ rebalance: false });
  t.is(
    getCallLog().length,
    2,
    'revoked planner delegation is not regranted without permissions',
  );
  t.like(await getPortfolioStatus!(22), {
    enabledAutoFeatures: { rebalance: false },
  });
  t.like(await getPortfolioAgents!(22), {
    agent1: {
      grantee: PortfolioPlannerAgent,
      permissions: { rebalance: false },
      state: 'revoked',
    },
  });

  await manager.setAutoFeatures({ rebalance: true });
  t.is(getCallLog().length, 3);
  t.like(getCallLog(), [
    ['deliverDelegation'],
    ['executePlan'],
    ['deliverDelegation', , 22, 2, PortfolioPlannerAgent, { rebalance: true }],
  ]);
  t.like(await getPortfolioStatus!(22), {
    enabledAutoFeatures: { rebalance: true },
  });
  t.like(await getPortfolioAgents!(22), {
    agent1: {
      grantee: PortfolioPlannerAgent,
      permissions: { rebalance: false },
      state: 'revoked',
    },
    agent2: {
      grantee: PortfolioPlannerAgent,
      permissions: { rebalance: true },
      state: 'active',
    },
  });
});

test('planResolved is published in flowsRunning and reflects resolution state', async t => {
  const storage = makeFakeStorageKit('published', { sequence: true });
  const { makePortfolioKit, getPortfolioStatus, vowTools } = makeTestSetup({
    storage,
  });
  const { manager, planner } = makePortfolioKit({ portfolioId: 1 });

  const amount = { brand: USDC, value: 100n };
  const steps = [{ src: '@agoric' as const, dest: '@noble' as const, amount }];

  // Flow started without pre-resolved steps: plan is pending
  const { flowId } = manager.startFlow({ type: 'withdraw', amount });

  {
    const { flowsRunning = {} } = await getPortfolioStatus!(1);
    t.is(Object.keys(flowsRunning).length, 1, 'one flow running');
    t.is(
      flowsRunning[`flow${flowId}`].planResolved,
      false,
      'planResolved is false before resolveFlowPlan',
    );
  }

  // resolveFlowPlan publishes status immediately
  planner.resolveFlowPlan(flowId, steps);

  {
    const { flowsRunning = {} } = await getPortfolioStatus!(1);
    t.is(
      flowsRunning[`flow${flowId}`].planResolved,
      true,
      'planResolved is true after resolveFlowPlan',
    );
  }

  // Flow started with pre-resolved steps: planResolved is true immediately
  const { flowId: flowId2 } = manager.startFlow(
    { type: 'withdraw', amount },
    steps,
  );

  {
    const { flowsRunning = {} } = await getPortfolioStatus!(1);
    t.is(
      flowsRunning[`flow${flowId2}`].planResolved,
      true,
      'planResolved is true immediately when steps are provided at startFlow',
    );
  }

  // rejectFlowPlan also publishes status immediately
  const { flowId: flowId3, stepsP } = manager.startFlow({
    type: 'withdraw',
    amount,
  });

  {
    const { flowsRunning = {} } = await getPortfolioStatus!(1);
    t.is(
      flowsRunning[`flow${flowId3}`].planResolved,
      false,
      'planResolved is false before rejectFlowPlan',
    );
  }

  planner.rejectFlowPlan(flowId3, 'insufficient funds');

  {
    const { flowsRunning = {} } = await getPortfolioStatus!(1);
    t.is(
      flowsRunning[`flow${flowId3}`].planResolved,
      true,
      'planResolved is true after rejectFlowPlan',
    );
  }

  await t.throwsAsync(vowTools.when(stepsP), { message: 'insufficient funds' });
});
