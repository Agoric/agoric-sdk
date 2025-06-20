#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file verify that `nobled tx swap swap ...` etc. work
 *
 * Usage:
 *
 * To add USDC to trader1's account on Noble:
 *   FAUCET=1 noble-usdn-lab.ts
 *
 * To transfer 123uusdc from Noble to Agoric:
 *   TXFR=123 [NET=testnet] noble-usdn-lab.ts
 *
 * To create a stableswap pool in starship:
 *   POOL=1 noble-usdn-lab.ts
 *
 * To swap 123uusdc for USDN:
 *   SWAP=123 [NET=testnet] noble-usdn-lab.ts
 *
 * To lock 123uusdn:
 *   LOCK=1000000uusdn [NET=starship] noble-usdn-lab.ts
 */
import '@endo/init';

import { MsgTransfer } from '@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js';
import type { StdFee } from '@cosmjs/amino';
import { stringToPath } from '@cosmjs/crypto';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';
import { $, execa } from 'execa';
import { ConfigContext, useChain, useRegistry } from 'starshipjs';
import { DEFAULT_TIMEOUT_NS } from '../tools/ibc-transfer.ts';
import { makeQueryClient } from '../tools/query.ts';

const [poolId, denom, denomTo] = [0, 'uusdc', 'uusdn']; // cf. .flows.ts

const keyring1 = {
  trader1: {
    mnemonic:
      'cause eight cattle slot course mail more aware vapor slab hobby match',
    address: 'noble18qlqfelxhe7tszqqprm2eqdpzt9s6ry025y3j5',
  },
} as const;

const configs = {
  starship: {
    noble: {
      chainId: 'noblelocal',
      rpc: 'http://localhost:26654',
      api: 'http://localhost:1314',
    },
    // agoric: {
    //   chainId: 'agoriclocal',
    //   rpc: 'http://localhost:26657',
    //   api: 'http://localhost:1317',
    // },
    agoric: {
      connections: {
        'noblelocal': {
          client_id: '07-tendermint-0',
          counterparty: {
            client_id: '07-tendermint-0',
            connection_id: 'connection-0',
          },
          id: 'connection-0',
          state: 'STATE_OPEN',
          transferChannel: {
            channelId: 'channel-0',
            counterPartyChannelId: 'channel-0',
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

const makeTraderWallet = async opts =>
  DirectSecp256k1HdWallet.fromMnemonic(keyring1.trader1.mnemonic, opts);

const signArgsFor = (config: typeof configs.testnet.noble) =>
  [
    ['--from', 'genesis'],
    // ['--node', config.rpc],
    ['--chain-id', config.chainId],
    ['--keyring-backend', 'test'],
    ['--broadcast-mode', 'sync'],
    ['--gas', 'auto'],
    ['--gas-adjustment', '1.4'],
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
    ].map(makeTraderWallet),
  );
  let [{ address: sender }] = await nobleWallet.getAccounts();
  const [{ address: receiver }] = await agoricWallet.getAccounts();
  // sender = "noble1zhcv8ea0s5adpxv2kmjwm6fwtw6kky3nendx9s"

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

  const clientN = await connectWithSigner("http://localhost:26654", nobleWallet);
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
  const signArgs = signArgsFor(config.noble);
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

const swapForUSDN = async (
  toTrade: bigint,
  config: typeof configs.testnet,
  $v: typeof $,
) => {
  const wallet = await makeTraderWallet({ prefix: 'noble' });
  const [{ address }] = await wallet.getAccounts();

  const queryClient = makeQueryClient(config.noble.api); // XXX ambient
  const { balances: before } = await queryClient.queryBalances(address);
  console.log('balances before', before);

  const signArgs = signArgsFor(config.noble);

  const route = JSON.stringify({ pool_id: poolId, denom_to: denomTo });
  const m99 = (toTrade * 99n) / 100n;
  const [amount, min] = [`${toTrade}${denom}`, `${m99}${denomTo}`];
  
  const base = [
    'exec',
    'noblelocal-genesis-0',
    '-c',
    'validator',
    '--',
    'nobled',
    'tx',
    'swap',
    'swap',
    `${amount}`,
    `${route}`,
    `${min}`,
    ...signArgs,
    '-o',
    'json',
    '-b',
    'sync',
    '--yes'
  ];

  const { stdout } = await execa('kubectl', base);

  // const { stdout } =
  //   await $v`nobled tx swap swap ${amount} ${route} ${min} ${signArgs} -o json`;

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
  const wallet = await makeTraderWallet({ prefix: 'noble' });
  const [{ address }] = await wallet.getAccounts();

  const queryClient = makeQueryClient(config.noble.api); // XXX ambient
  console.log("address", address)
  const { balances: before } = await queryClient.queryBalances(address);
  console.log('balances before', before);
  const signArgs = signArgsFor(config.noble);
  // const cmd = [
  //   'kubectl',
  //   // namespace && '-n', namespace,  // include if you need to target a specific namespace
  //   'exec',
  //   "noblelocal-genesis-0",
  //   '-c',
  //   "validator",
  //   '--',
  //   'nobled',
  //   'tx',
  //   'dollar',
  //   'vaults',
  //   'lock',
  //   vault,
  //   amount,
  //   signArgs,
  //   '-o',
  //   'json',
  // ].filter(Boolean);
  // const { stdout } =
  //   await execa`${cmd}`;
  // build the kubectl arguments
  const base = [
    'exec',
    'noblelocal-genesis-0',
    '-c',
    'validator',
    '--',
    'nobled',
    'tx',
    'dollar',
    'vaults',
    'lock',
    vault,
    `${amount}`,
    ...signArgs,
    '-o',
    'json',
    '-b',
    'sync',
    '--yes'
  ];
  // const args = namespace
  //   ? ['-n', namespace, ...base]
  //   : base;

  // run it
  const { stdout } = await execa('kubectl', base);
  const txhash = parseTx(stdout);

  await $v`sleep 6`;
  const { balances: after } = await queryClient.queryBalances(address);
  console.log('balances after (TODO: wait until this changes)', after);
  console.log({ txhash, url: `${config.noble.explorer}/tx/${txhash}` });
};

const main = async ({
  env = process.env,
  configFile = 'config.ymax.yaml',
  connectWithSigner = SigningStargateClient.connectWithSigner,
} = {}) => {
  const fetcher = await useRegistry(configFile);
  await ConfigContext.init(configFile, fetcher);

  const $v = $({ verbose: 'short' });

  const config = configs[env.NET || 'testnet'];
  if (env.FAUCET) {
    if (env.NET === 'testnet') {
      throw Error(`use ${configs.testnet.noble.faucet}`);
    }
    const wallet = await makeTraderWallet({ prefix: 'noble' });
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
    const { stdout } = await createPool($v, config);
    console.log(JSON.parse(stdout));
  }
  if (env.SWAP) {
    await swapForUSDN(BigInt(env.SWAP), config, $v);
  }
  if (env.LOCK) {
    await lockUSDN(BigInt(env.LOCK), config, $v);
  }
};

// TODO: use endo-exec so we can unit test the above
main().catch(err => {
  console.error('failed', err);
  process.exit(1);
});
