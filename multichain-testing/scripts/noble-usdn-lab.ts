#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file verify that `nobled tx swap swap ...` etc. work
 *
 * Prereqisite: To create a stableswap pool in starship,
 *   see Makefile
 *
 * Usage:
 *
 * To add USDC to trader1's account on Noble:
 *   FAUCET=1 noble-usdn-lab.ts
 *
 * To transfer 1.25 USDC from Noble to Agoric:
 *   TXFR=1250000 [NET=testnet] noble-usdn-lab.ts
 *
 * To swap 1.23 USDC for USDN:
 *   SWAP=1230000 [NET=testnet] noble-usdn-lab.ts
 *
 * To lock 1.23 USDN:
 *   LOCK=1230000 [NET=testnet] noble-usdn-lab.ts
 */
import '@endo/init';

import { MsgTransfer } from '@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js';
import type { StdFee } from '@cosmjs/amino';
import { stringToPath } from '@cosmjs/crypto';
import {
  DirectSecp256k1HdWallet,
  Registry,
  type GeneratedType,
} from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';
import { $ } from 'execa';
import { ConfigContext, useChain, useRegistry } from 'starshipjs';
import { DEFAULT_TIMEOUT_NS } from '../tools/ibc-transfer.ts';
import { makeQueryClient } from '../tools/query.ts';
import { makeSwapLockMessages } from '@aglocal/portfolio-contract/src/portfolio.flows.ts';
import { MsgSwap } from '@agoric/cosmic-proto/noble/swap/v1/tx.js';
import { MsgLock } from '@agoric/cosmic-proto/noble/dollar/vaults/v1/tx.js';

const [poolId, denom, denomTo] = [0, 'uusdc' as const, 'uusdn' as const]; // cf. .flows.ts

const keyring1 = {
  trader1: {
    mnemonic:
      'cause eight cattle slot course mail more aware vapor slab hobby match',
    address: 'noble18qlqfelxhe7tszqqprm2eqdpzt9s6ry025y3j5',
  },
  whale: {
    mnemonic:
      'energy bar acquire twist stick uncle echo chicken track dad position unveil define addict else matrix sauce onion tornado breeze grape basket gauge soon',
    address: 'noble16fskzhlguwkq35f5hmvnxg6urug46fhmn9frwu',
  },
  genesis: {
    // see `nobled keys --keyring-backend=test show genesis` in the pod
    mnemonic: '???',
    address: '???',
  },
} as const;
type Who = keyof typeof keyring1;

const configs = {
  starship: {
    noble: {
      // XXX should get these from starship registry
      // meanwhile, see config.ymax.yml
      chainId: 'noblelocal',
      rpc: 'http://localhost:26654',
      api: 'http://localhost:1314',
    },
  },
  testnet: {
    noble: {
      faucet: 'https://faucet.circle.com/',
      rpc: 'https://noble-testnet-rpc.polkachu.com:443',
      api: 'https://noble-testnet-api.polkachu.com:443',
      chainId: 'grand-1',
      explorer: 'https://www.mintscan.io/noble-testnet',
    },
    agoric: {
      connections: {
        'grand-1': {
          client_id: '07-tendermint-13',
          counterparty: {
            client_id: '07-tendermint-432',
            connection_id: 'connection-396',
          },
          id: 'connection-13',
          state: 'STATE_OPEN',
          transferChannel: {
            channelId: 'channel-11',
            counterPartyChannelId: 'channel-337',
            counterPartyPortId: 'transfer',
            ordering: 'ORDER_UNORDERED',
            portId: 'transfer',
            state: 'STATE_OPEN',
            version: 'ics20-1',
          },
        },
      },
    },
  },
} as const;
harden(configs);

const makeWallet = async (who: Who, opts) =>
  DirectSecp256k1HdWallet.fromMnemonic(keyring1[who].mnemonic, opts);

const signArgsFor = (from: Who, config: typeof configs.testnet.noble) =>
  [
    ['--from', from],
    ['--node', config.rpc],
    ['--chain-id', config.chainId],
    ['--keyring-backend', 'test'],
    ['--fees', '25000uusdc'],
    ['--gas', 'auto'],
    ['--gas-adjustment', '1.4'],
    ['--yes'],
  ].flat();

const parseTx = stdout => {
  const { code, raw_log, txhash } = JSON.parse(stdout);
  if (code !== 0) {
    throw Error(raw_log);
  }
  return txhash;
};

const transferFromNoble = async (
  amount: bigint,
  config: typeof configs.testnet,
  { connectWithSigner },
  memo = 'noble-usdn-lab',
) => {
  const token = { denom, amount: String(amount) };
  const [nobleWallet, agoricWallet] = await Promise.all(
    [
      { prefix: 'noble' },
      { prefix: 'agoric', hdPaths: [stringToPath(`m/44'/564'/0'/0/0`)] },
    ].map(opts => makeWallet('trader1', opts)),
  );
  const [{ address: sender }] = await nobleWallet.getAccounts();
  const [{ address: receiver }] = await agoricWallet.getAccounts();

  const { chainId } = config.noble;
  const { counterPartyChannelId, counterPartyPortId } =
    config.agoric.connections[chainId].transferChannel;

  const msgTransfer = MsgTransfer.fromPartial({
    sender,
    receiver,
    token,
    sourcePort: counterPartyPortId,
    sourceChannel: counterPartyChannelId,
    timeoutHeight: undefined,
    timeoutTimestamp: DEFAULT_TIMEOUT_NS,
    memo,
  });

  const fee: StdFee = { amount: [{ denom, amount: '30000' }], gas: '197000' };

  const clientN = await connectWithSigner(config.noble.rpc, nobleWallet);
  console.log('transfer from', sender, msgTransfer, fee);
  return clientN.signAndBroadcast(
    sender,
    [{ typeUrl: MsgTransfer.typeUrl, value: msgTransfer }],
    fee,
  );
};

const createPool = async (
  $v: typeof $,
  config: (typeof configs)['testnet'],
) => {
  const signArgs = signArgsFor('genesis', config.noble);
  const poolArgs = Object.values({
    pair: 'uusdn/uusdc',
    rewards_fee: '0',
    protocol_fee: '5', // BP
    max_fee: '1', // ????
    initial_a: '100',
    future_a: '100',
    future_a_time: '0',
    // rate_multipliers: ''
  });
  return $v`nobled tx swap stableswap create-pool ${poolArgs} ${signArgs} -o json`;
};

const depositToPool = async (
  $v: typeof $,
  config: (typeof configs)['testnet'],
  qty = 3,
) => {
  const signArgs = signArgsFor('whale', config.noble);
  const unit = 1_000_000;
  const args = Object.values({
    pool_id: '0',
    slippage_percentage: '5',
    amount1: `${qty}${unit}uusdc`,
    amount2: `${qty}${unit}uusdn`,
  });
  return $v`nobled tx swap stableswap add-liquidity ${args} ${signArgs} -o json`;
};

const swapForUSDN = async (
  toTrade: bigint,
  config: typeof configs.testnet,
  $v: typeof $,
) => {
  const wallet = await makeWallet('trader1', { prefix: 'noble' });
  const [{ address }] = await wallet.getAccounts();

  const queryClient = makeQueryClient(config.noble.api); // XXX ambient
  const { balances: before } = await queryClient.queryBalances(address);
  console.log('balances before', before);

  const signArgs = signArgsFor('trader1', config.noble);

  const route = JSON.stringify({ pool_id: poolId, denom_to: denomTo });
  const m99 = (toTrade * 99n) / 100n;
  const [amount, min] = [`${toTrade}${denom}`, `${m99}${denomTo}`];
  const { stdout } =
    await $v`nobled tx swap swap ${amount} ${route} ${min} ${signArgs} -o json`;
  const txhash = parseTx(stdout);
  const { balances: after } = await queryClient.queryBalances(address);
  console.log('balances after (TODO: wait until this changes)', after);
  console.log({ txhash, url: `${config.noble.explorer}/tx/${txhash}` });
  return txhash;
};

const lockUSDN = async (
  /** NOTE: must lock at least 1000000uusdn */
  amount: bigint,
  config: typeof configs.testnet,
  $v: typeof $,
  vault = 'staked',
) => {
  const wallet = await makeWallet('trader1', { prefix: 'noble' });
  const [{ address }] = await wallet.getAccounts();

  const queryClient = makeQueryClient(config.noble.api); // XXX ambient
  const { balances: before } = await queryClient.queryBalances(address);
  console.log('balances before', before);
  const signArgs = signArgsFor('trader1', config.noble);
  const { stdout } =
    await $v`nobled tx dollar vaults lock ${vault} ${`${amount}`} ${signArgs} -o json`;
  const txhash = parseTx(stdout);

  await $v`sleep 6`;
  const { balances: after } = await queryClient.queryBalances(address);
  console.log('balances after (TODO: wait until this changes)', after);
  console.log({ txhash, url: `${config.noble.explorer}/tx/${txhash}` });
};

const nobleRegistryTypes: [string, GeneratedType][] = [
  [MsgSwap.typeUrl, MsgSwap as GeneratedType],
  [MsgLock.typeUrl, MsgLock as GeneratedType],
];

const swapAndLock = async (
  amount: bigint,
  config: typeof configs.testnet,
  {
    connectWithSigner,
  }: { connectWithSigner: typeof SigningStargateClient.connectWithSigner },
  memo = 'noble-usdn-lab',
) => {
  const [nobleWallet] = await Promise.all(
    [{ prefix: 'noble' }].map(opts => makeWallet('trader1', opts)),
  );
  const [{ address: signer }] = await nobleWallet.getAccounts();

  const { chainId } = config.noble;

  const usdnOut = (amount * 99n) / 100n; // XXX should query
  const { msgSwap, msgLock, protoMessages } = makeSwapLockMessages(
    { value: signer as `${string}1${string}`, chainId, encoding: 'bech32' },
    amount,
    {
      usdnOut,
    },
  );

  const defaultGas = 2_000_000n;
  const fee: StdFee = {
    amount: [{ denom, amount: `${2_000_000}` }],
    gas: `${defaultGas * 10n}`,
  };

  const clientN = await connectWithSigner(config.noble.rpc, nobleWallet, {
    registry: new Registry(nobleRegistryTypes),
  });
  console.log('swap, lock', signer, [msgSwap, msgLock], fee);
  console.log(protoMessages);
  const tx = await clientN.signAndBroadcast(
    signer,
    [
      { typeUrl: MsgSwap.typeUrl, value: msgSwap },
      { typeUrl: MsgLock.typeUrl, value: msgLock },
    ],
    fee,
    memo,
  );
  return tx;
};

const main = async ({
  env = process.env,
  configFile = 'config.ymax.yaml',
  connectWithSigner = SigningStargateClient.connectWithSigner,
} = {}) => {
  if (env.NET !== 'testnet') {
    const fetcher = await useRegistry(configFile);
    await ConfigContext.init(configFile, fetcher);
  }

  const $v = $({ verbose: 'short' });

  const config = configs[env.NET || 'starship'];
  if (env.FAUCET) {
    if (env.NET === 'testnet') {
      throw Error(`use ${configs.testnet.noble.faucet}`);
    }
    const who = env.FAUCET in keyring1 ? (env.FAUCET as Who) : 'trader1';
    const wallet = await makeWallet(who, { prefix: 'noble' });
    const [{ address }] = await wallet.getAccounts();
    await useChain('noble').creditFromFaucet(address);
  }
  if (env.TXFR) {
    const tx = await transferFromNoble(
      BigInt(env.TXFR),
      configs[env.NET || 'testnet'],
      { connectWithSigner },
    );
    console.log(tx);
  }
  if (env.POOL) {
    throw Error('does not work; needs to use authority exec');
    const { stdout } = await createPool($v, config);
    console.log(JSON.parse(stdout));
  }
  if (env.DEPOSIT) {
    const { stdout } = await depositToPool($v, config, Number(env.DEPOSIT));
    console.log(JSON.parse(stdout));
  }
  if (env.SWAP) {
    await swapForUSDN(BigInt(env.SWAP), config, $v);
  }
  if (env.LOCK) {
    await lockUSDN(BigInt(env.LOCK), config, $v);
  }
  if (env.SWAPLOCK) {
    const tx = await swapAndLock(
      BigInt(env.SWAPLOCK),
      configs[env.NET || 'testnet'],
      { connectWithSigner },
    );
    console.log(tx);
  }
};

// TODO: use endo-exec so we can unit test the above
main().catch(err => {
  console.error('failed', err);
  process.exit(1);
});
