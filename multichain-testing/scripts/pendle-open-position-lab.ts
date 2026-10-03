#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file Open a Pendle PT position on Arbitrum via Pendle Hosted SDK + viem.
 */

import '@endo/init';
import {
  http as ambientHttp,
  createPublicClient,
  createWalletClient,
  formatUnits,
  getContract,
  type Address,
  type Chain,
  type Client,
  type Hex,
  type PublicClient,
  type Transport,
  type WalletClient,
} from 'viem';
import {
  mnemonicToAccount,
  privateKeyToAccount,
  type Account,
} from 'viem/accounts';
import { erc20ABI } from '@aglocal/portfolio-contract/interfaces/erc20';
import { pendleRouterABI } from '@aglocal/portfolio-contract/interfaces/pendle';

const usage = (argv0: string) => `Usage: ${argv0}

Environment:
  MNEMONIC   optional EVM wallet mnemonic
  TRADER_KEY optional EVM private key
  RPC_URL    optional Arbitrum RPC URL (default: ${arbitrum.main.rpcs[0]})
  RECEIVER   optional, defaults to the trader account address
  SLIPPAGE   optional, defaults to 0.01

Arguments:
  amountIn   required USDC amount like 4.25`;

const arbitrum = {
  main: {
    chainId: 42161,
    rpcs: ['https://arb1.arbitrum.io/rpc'],
    tokens: {
      usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Address,
    },
  },
} as const;

const pendle = {
  apiBase: 'https://api-v2.pendle.finance/core',
  market: {
    name: 'gUSDC',
    address: '0x0934e592cee932b04b3967162b3cd6c85748c470' as Address,
    pt: '0x97c1a4ae3e0da8009aff13e3e3ee7ea5ee4afe84' as Address,
    yt: '0x08701db4d31e0e88bd338fdeb38ff391cc75bcf8' as Address,
    sy: '0x0a9ed458e6c283d1e84237e3347333aa08221d09' as Address,
    expiry: '2026-06-25T00:00:00.000Z',
  },
} as const;

const arbitrumViemChain = {
  id: arbitrum.main.chainId,
  name: 'Arbitrum One',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [...arbitrum.main.rpcs] },
    public: { http: [...arbitrum.main.rpcs] },
  },
} as const satisfies Chain;

const parseUsdc = (s: string) => {
  s.match(/^\d+(\.\d{1,6})?$/) ||
    (() => {
      throw Error(`invalid USDC amount: ${s}`);
    })();
  const [whole, frac = ''] = s.split('.');
  return BigInt(whole) * 1_000_000n + BigInt(frac.padEnd(6, '0'));
};

const normalizePrivateKey = (s: string): Hex => {
  const trimmed = s.trim();
  const hex = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hex)) {
    throw Error('invalid TRADER_KEY: expected 32-byte hex, with or without 0x');
  }
  return hex as Hex;
};

type ConvertResponse = {
  requiredApprovals?: Array<{ token: Address; amount: string }>;
  routes: Array<{
    contractParamInfo?: {
      method: string;
      contractCallParams: [
        Address,
        Address,
        string,
        {
          guessMin: string;
          guessMax: string;
          guessOffchain: string;
          maxIteration: string;
          eps: string;
        },
        {
          tokenIn: Address;
          netTokenIn: string;
          tokenMintSy: Address;
          pendleSwap: Address;
          swapData: {
            swapType: string;
            extRouter: Address;
            extCalldata: Hex;
            needScale: boolean;
          };
        },
        {
          limitRouter: Address;
          epsSkipMarket: string;
          normalFills: [];
          flashFills: [];
          optData: Hex;
        },
      ];
    };
    tx: { to: Address; data: Hex; value?: string; from?: Address };
    outputs?: Array<{ token: Address; amount: string }>;
    data?: { impliedApy?: number; effectiveApy?: number };
  }>;
};

const makePendleAPI = (
  apiBase: string,
  { fetch }: { fetch: typeof globalThis.fetch },
) => ({
  async getQuote({
    amountIn,
    receiver,
    slippage,
  }: {
    amountIn: bigint;
    receiver: Address;
    slippage: string;
  }) {
    const params = new URLSearchParams({
      receiver,
      slippage,
      tokensIn: arbitrum.main.tokens.usdc,
      tokensOut: pendle.market.pt,
      amountsIn: amountIn.toString(),
      enableAggregator: 'true',
      additionalData: 'impliedApy,effectiveApy',
    });
    const url = `${apiBase}/v2/sdk/${arbitrum.main.chainId}/convert?${params}`;
    const quote = (await fetch(url).then(r => {
      if (!r.ok) throw Error(`Pendle SDK ${r.status}: ${r.statusText}`);
      return r.json();
    })) as ConvertResponse;
    const route = quote.routes[0];
    if (!route) throw Error('Pendle SDK returned no routes');
    return { quote, route };
  },
});

const reportQuote = ({
  account,
  receiver,
  amountIn,
  route,
}: {
  account: Address;
  receiver: Address;
  amountIn: bigint;
  route: ConvertResponse['routes'][number];
}) => {
  console.log('chainId', arbitrum.main.chainId);
  console.log('market', pendle.market.address);
  console.log('pt', pendle.market.pt);
  console.log('yt', pendle.market.yt);
  console.log('sy', pendle.market.sy);
  console.log('expiry', pendle.market.expiry);
  console.log('wallet', account);
  console.log('receiver', receiver);
  console.log('amountIn', `${formatUnits(amountIn, 6)} USDC`);
  if (route.data?.impliedApy !== undefined) {
    console.log('impliedApy', `${(route.data.impliedApy * 100).toFixed(2)}%`);
  }
  if (route.data?.effectiveApy !== undefined) {
    console.log(
      'effectiveApy',
      `${(route.data.effectiveApy * 100).toFixed(2)}%`,
    );
  }
};

const normalizeSwapExactTokenForPtParams = (
  params: NonNullable<
    ConvertResponse['routes'][number]['contractParamInfo']
  >['contractCallParams'],
) => {
  const [receiver, market, minPtOut, guessPtOut, input, limit] = params;
  return [
    receiver,
    market,
    BigInt(minPtOut),
    {
      guessMin: BigInt(guessPtOut.guessMin),
      guessMax: BigInt(guessPtOut.guessMax),
      guessOffchain: BigInt(guessPtOut.guessOffchain),
      maxIteration: BigInt(guessPtOut.maxIteration),
      eps: BigInt(guessPtOut.eps),
    },
    {
      tokenIn: input.tokenIn,
      netTokenIn: BigInt(input.netTokenIn),
      tokenMintSy: input.tokenMintSy,
      pendleSwap: input.pendleSwap,
      swapData: {
        swapType: Number(input.swapData.swapType),
        extRouter: input.swapData.extRouter,
        extCalldata: input.swapData.extCalldata,
        needScale: input.swapData.needScale,
      },
    },
    {
      limitRouter: limit.limitRouter,
      epsSkipMarket: BigInt(limit.epsSkipMarket),
      normalFills: limit.normalFills,
      flashFills: limit.flashFills,
      optData: limit.optData,
    },
  ] as const;
};

type SigningClient = WalletClient<Transport, Chain, Account>;

const ensureApprovals = async ({
  requiredApprovals,
  spender,
  client,
}: {
  requiredApprovals: ConvertResponse['requiredApprovals'];
  spender: Address;
  client: { public: PublicClient; wallet: SigningClient };
}) => {
  const usdc = getContract({
    address: arbitrum.main.tokens.usdc,
    abi: erc20ABI,
    client: { public: client.public, wallet: client.wallet },
  });

  const { address: owner } = client.wallet.account;

  for (const approval of requiredApprovals || []) {
    if (
      approval.token.toLowerCase() !== arbitrum.main.tokens.usdc.toLowerCase()
    ) {
      continue;
    }
    const need = BigInt(approval.amount);
    const have = (await usdc.read.allowance([owner, spender])) as bigint;
    if (have >= need) continue;
    console.log(
      'approving',
      `${formatUnits(need, 6)} USDC`,
      'to',
      spender,
      '(Pendle SDK route tx.to)',
    );
    const hash = await usdc.write.approve([spender, need]);
    console.log('approve tx', hash);
    await client.public.waitForTransactionReceipt({ hash });
  }
};

const executeRoute = async ({
  route,
  routerAddress,
  client,
}: {
  route: ConvertResponse['routes'][number];
  routerAddress: Address;
  client: { public: PublicClient; wallet: SigningClient };
}) => {
  const cpi = route.contractParamInfo;
  if (!cpi) throw Error('Pendle SDK route missing contractParamInfo');
  if (cpi.method !== 'swapExactTokenForPt') {
    throw Error(`unsupported Pendle method: ${cpi.method}`);
  }
  const router = getContract({
    address: routerAddress,
    abi: pendleRouterABI,
    client,
  });
  const hash = await router.write.swapExactTokenForPt(
    normalizeSwapExactTokenForPtParams(cpi.contractCallParams),
    {
      value: route.tx.value ? BigInt(route.tx.value) : undefined,
    },
  );
  console.log('swap tx', hash);
  const receipt = await client.public.waitForTransactionReceipt({ hash });
  console.log('status', receipt.status);
  if (route.outputs?.[0]) {
    console.log('expectedPtOut', route.outputs[0].amount);
  }
};

const main = async ({
  argv = process.argv,
  env = process.env,
  http = ambientHttp,
  fetch = globalThis.fetch,
} = {}) => {
  if (argv.includes('--help')) {
    console.error(usage(argv[1]));
    return;
  }
  const {
    MNEMONIC,
    TRADER_KEY,
    RPC_URL = arbitrum.main.rpcs[0],
    SLIPPAGE = '0.01',
  } = env;
  if (!MNEMONIC && !TRADER_KEY) {
    throw Error('set either MNEMONIC or TRADER_KEY');
  }

  const amountInArg = argv[2];
  if (!amountInArg) throw Error('amountIn argument not set');
  const amountIn = parseUsdc(amountInArg);

  const account = TRADER_KEY
    ? privateKeyToAccount(normalizePrivateKey(TRADER_KEY))
    : mnemonicToAccount(MNEMONIC!);
  const receiver = (env.RECEIVER || account.address) as Address;
  const transport = http(RPC_URL);
  const chain = arbitrumViemChain;
  const client = {
    public: createPublicClient({ chain, transport }),
    wallet: createWalletClient({ account, chain, transport }),
  };
  const pendleAPI = makePendleAPI(pendle.apiBase, { fetch });
  const { quote, route } = await pendleAPI.getQuote({
    amountIn,
    receiver,
    slippage: SLIPPAGE,
  });

  reportQuote({
    account: account.address,
    receiver,
    amountIn,
    route,
  });
  const { requiredApprovals } = quote;
  await ensureApprovals({ requiredApprovals, spender: route.tx.to, client });
  await executeRoute({ route, routerAddress: route.tx.to, client });
};

void main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
