/**
 * @file Tests for portfolio router payload builder.
 */
import type { GuestInterface } from '@agoric/async-flow';
import type { BaseChainInfo, Chain } from '@agoric/orchestration';
import { AxelarChain } from '@agoric/portfolio-api';
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { hexToBytes } from '@noble/hashes/utils';
import { encodeFunctionData } from 'viem';
import { makePortfolioRouter } from '../src/evm-orch-router.ts';
import { aavePoolABI } from '../src/interfaces/aave.ts';
import { erc20ABI } from '../src/interfaces/erc20.ts';
import type { PortfolioKit } from '../src/portfolio.exo.ts';
import type { PortfolioInstanceContext } from '../src/portfolio.flows.ts';
import { predictWalletAddress } from '../src/utils/evm-orch-factory.ts';
import { contractsMock } from './mocks.ts';

const { fromEntries, keys } = Object;

const makeRouterTestContext = () => {
  const lca = {
    getAddress: () => ({ value: 'agoric1testportfolio' }),
  };
  const pk = {
    reader: {
      getPortfolioId: () => 1,
      getLocalAccount: () => lca,
    },
  } as unknown as GuestInterface<PortfolioKit>;

  const ctx = {
    contracts: contractsMock,
    walletBytecode: '0x00',
  } as unknown as PortfolioInstanceContext;
  const infoByChain = fromEntries(
    (keys(AxelarChain) as AxelarChain[]).map((chain, index) => [
      chain,
      { namespace: 'eip155', reference: `${index + 1}` },
    ]),
  ) as Record<AxelarChain, BaseChainInfo<'eip155'>>;
  const axelar = {} as Chain<{ chainId: string }>;
  return { pk, ctx, axelar, infoByChain };
};

test('makePortfolioRouter.buildPayload encodes multicall payload', t => {
  const { pk, ctx, axelar, infoByChain } = makeRouterTestContext();
  const lca = pk.reader.getLocalAccount();
  const portfolioLCA = lca.getAddress().value;
  const chainName: AxelarChain = 'Arbitrum';

  const router = makePortfolioRouter(pk, ctx, infoByChain, axelar);
  const payload = router.buildPayload(
    { chainName, id: 'tx33' },
    (s, addr, c) => {
      const usdc = s.makeContract(c.usdc, erc20ABI);
      const aave = s.makeContract(c.aavePool, aavePoolABI);
      const amount = 899n;
      usdc.approve(addr, amount);
      aave.supply(c.usdc, amount, addr, 0);
    },
  );

  const expectedRemoteAddress =
    '0xa6c0bbd67f5ff44cb51c03db15c6b1f4d7f32f9a' as const;

  const { contracts } = ctx;
  const ca = contracts[chainName];

  t.is(
    predictWalletAddress({
      owner: portfolioLCA,
      factoryAddress: ca.factory,
      gasServiceAddress: ca.gasService,
      gatewayAddress: ca.gateway,
      walletBytecode: hexToBytes('00'),
    }),
    expectedRemoteAddress,
  );

  t.deepEqual(payload, {
    id: 'tx33',
    portfolioLCA,
    remoteAccountAddress: expectedRemoteAddress,
    depositPermit: [],
    multiCalls: [
      {
        target: ca.usdc,
        data: encodeFunctionData({
          abi: erc20ABI,
          functionName: 'approve',
          args: [expectedRemoteAddress, 899n],
        }),
      },
      {
        target: ca.aavePool,
        data: encodeFunctionData({
          abi: aavePoolABI,
          functionName: 'supply',
          args: [ca.usdc, 899n, expectedRemoteAddress, 0],
        }),
      },
    ],
    provideAccount: true,
  });
});
