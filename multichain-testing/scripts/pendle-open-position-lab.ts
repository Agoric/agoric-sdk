#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file Open a Pendle PT position on Arbitrum via Pendle Hosted SDK + viem.
 */

import {
  http as ambientHttp,
  createPublicClient,
  createWalletClient,
  formatUnits,
  getContract,
  type Address,
  type Chain,
  type Hex,
  type PublicClient,
  type WalletClient,
} from 'viem';
import {
  mnemonicToAccount,
  privateKeyToAccount,
  type Account,
} from 'viem/accounts';

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

const usage = (argv0: string) => `Usage: ${argv0}

Environment:
  MNEMONIC   optional EVM wallet mnemonic
  TRADER_KEY optional EVM private key
  RPC_URL    optional Arbitrum RPC URL (default: ${arbitrum.main.rpcs[0]})
  RECEIVER   optional, defaults to the trader account address
  SLIPPAGE   optional, defaults to 0.01

Arguments:
  amountIn   required USDC amount like 4.25`;

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

const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const PENDLE_ROUTER_ABI = [
  {
    type: 'function',
    name: 'swapExactTokenForPt',
    stateMutability: 'payable',
    inputs: [
      { name: 'receiver', type: 'address' },
      { name: 'market', type: 'address' },
      { name: 'minPtOut', type: 'uint256' },
      {
        name: 'guessPtOut',
        type: 'tuple',
        components: [
          { name: 'guessMin', type: 'uint256' },
          { name: 'guessMax', type: 'uint256' },
          { name: 'guessOffchain', type: 'uint256' },
          { name: 'maxIteration', type: 'uint256' },
          { name: 'eps', type: 'uint256' },
        ],
      },
      {
        name: 'input',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'netTokenIn', type: 'uint256' },
          { name: 'tokenMintSy', type: 'address' },
          { name: 'pendleSwap', type: 'address' },
          {
            name: 'swapData',
            type: 'tuple',
            components: [
              { name: 'swapType', type: 'uint8' },
              { name: 'extRouter', type: 'address' },
              { name: 'extCalldata', type: 'bytes' },
              { name: 'needScale', type: 'bool' },
            ],
          },
        ],
      },
      {
        name: 'limit',
        type: 'tuple',
        components: [
          { name: 'limitRouter', type: 'address' },
          { name: 'epsSkipMarket', type: 'uint256' },
          { name: 'normalFills', type: 'tuple[]', components: [] },
          { name: 'flashFills', type: 'tuple[]', components: [] },
          { name: 'optData', type: 'bytes' },
        ],
      },
    ],
    outputs: [
      { name: 'netPtOut', type: 'uint256' },
      { name: 'netSyFee', type: 'uint256' },
      { name: 'netSyInterm', type: 'uint256' },
    ],
  },
] as const;

type ConvertResponse = {
  requiredApprovals?: Array<{ token: Address; amount: string }>;
  routes: Array<{
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

const ensureApprovals = async ({
  requiredApprovals,
  spender,
  client,
  account,
}: {
  requiredApprovals: ConvertResponse['requiredApprovals'];
  spender: Address;
  client: { public: PublicClient; wallet: WalletClient };
  account: Account;
}) => {
  const usdc = getContract({
    address: arbitrum.main.tokens.usdc,
    abi: ERC20_ABI,
    client,
  });
  for (const approval of requiredApprovals || []) {
    if (
      approval.token.toLowerCase() !== arbitrum.main.tokens.usdc.toLowerCase()
    ) {
      continue;
    }
    const need = BigInt(approval.amount);
    const have = (await usdc.read.allowance([
      account.address,
      spender,
    ])) as bigint;
    if (have >= need) continue;
    console.log(
      'approving',
      `${formatUnits(need, 6)} USDC`,
      'to',
      spender,
      '(Pendle SDK route tx.to)',
    );
    const hash = await usdc.write.approve([spender, need], {
      account,
      chain: arbitrumViemChain,
    });
    console.log('approve tx', hash);
    await client.public.waitForTransactionReceipt({ hash });
  }
};

const executeRoute = async ({
  route,
  client,
  account,
}: {
  route: ConvertResponse['routes'][number];
  client: { public: PublicClient; wallet: WalletClient };
  account: Account;
}) => {
  const hash = await client.wallet.sendTransaction({
    account,
    chain: arbitrumViemChain,
    to: route.tx.to,
    data: route.tx.data,
    value: route.tx.value ? BigInt(route.tx.value) : undefined,
  });
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
  const amountInArg = argv[2];
  if (!MNEMONIC && !TRADER_KEY) {
    throw Error('set either MNEMONIC or TRADER_KEY');
  }
  if (!amountInArg) throw Error('amountIn argument not set');

  const account = TRADER_KEY
    ? privateKeyToAccount(normalizePrivateKey(TRADER_KEY))
    : mnemonicToAccount(MNEMONIC!);
  const receiver = (env.RECEIVER || account.address) as Address;
  const amountIn = parseUsdc(amountInArg);
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
  await ensureApprovals({
    requiredApprovals: quote.requiredApprovals,
    spender: route.tx.to,
    client,
    account,
  });
  await executeRoute({ route, client, account });

  // TODO later: encode the router call directly with viem instead of relying on Hosted SDK tx payloads.
  void PENDLE_ROUTER_ABI;
};

void main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
