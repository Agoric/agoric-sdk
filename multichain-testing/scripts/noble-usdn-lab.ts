#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file verify that `nobled swap ...` works
 */
import '@endo/init';

import { $ } from 'execa';
import { useRegistry, useChain, ConfigContext } from 'starshipjs';
import { makeQueryClient } from '../tools/query.ts';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';

const configs = {
  starship: {
    noble: {
      rpc: 'http://localhost:26654',
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
  },
};

const keyMaterial = {
  trader1:
    'cause eight cattle slot course mail more aware vapor slab hobby match',
} as const;

const session1 = `
$ nobled keys --keyring-backend=test add --recover trader1
> Enter your bip39 mnemonic
cause eight cattle slot course mail more aware vapor slab hobby match

- address: noble18qlqfelxhe7tszqqprm2eqdpzt9s6ry025y3j5
  name: trader1
  pubkey: '{"@type":"/cosmos.crypto.secp256k1.PubKey","key":"Air1mbActJ/1BQcvm15JF8g3fKF9xCRwf92W4itI2tcp"}'
  type: local
`;

const main = async ({
  env = process.env,
  configFile = 'config.fusdc.yaml',
} = {}) => {
  const fetcher = await useRegistry(configFile);
  await ConfigContext.init(configFile, fetcher);

  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
    keyMaterial.trader1,
    { prefix: 'noble' },
  );
  const [{ address }] = await wallet.getAccounts();

  //   const nobleChain = useChain('noble');
  //   const apiUrl = await nobleChain.getRestEndpoint();
  const { api: apiUrl } = configs.testnet.noble;
  const queryClient = makeQueryClient(apiUrl); // XXX pass fetch

  const fundsWanted = 4_000_000n;
  for (;;) {
    const { balance } = await queryClient.queryBalance(address, 'uusdc');
    if (balance) {
      console.log(address, 'has', balance);
      const amount = BigInt(balance.amount);
      if (amount >= fundsWanted) break;
    }
    console.log('getting creditFromFaucet for', address);
    throw Error(`use ${configs.testnet.noble.faucet}`);
    // await nobleChain.creditFromFaucet(address);
  }

  const toTrade = fundsWanted / 15n; // 15 tries
  const [poolId, denom, denomTo] = [0, 'uusdc', 'uusdn']; // cf. .flows.ts
  //   const route = `pool_id: ${poolId} denom_to: "${denomTo}"`; // protobuf text format
  const route = JSON.stringify({ pool_id: poolId, denom_to: denomTo });
  const { rpc, chainId, explorer } = configs.testnet.noble;
  const signArgs = [
    `--chain-id=${chainId}`,
    // '--broadcast-mode=block',
    '--from=trader1',
    '--keyring-backend=test',
    '--yes',
    '--fees=25000uusdc',
    '--gas=auto',
    '--gas-adjustment=1.3',
  ];

  const $v = $({ verbose: 'short' });
  if (env.SWAP) {
    const { balances: before } = await queryClient.queryBalances(address);
    console.log('balances before', before);
    const actual =
      await $v`nobled --node ${rpc} tx swap swap ${toTrade.toString()}${denom} ${route} ${((toTrade * 99n) / 100n).toString()}${denomTo} ${signArgs} -o json`;
    //   console.log(actual);
    const { code, raw_log, txhash } = JSON.parse(actual.stdout);
    if (code !== 0) {
      throw Error(raw_log);
    }
    const { balances: after } = await queryClient.queryBalances(address);
    console.log('balances after (TODO: wait until this changes)', after);
    console.log({ txhash, url: `${explorer}/tx/${txhash}` });
  }

  if (env.LOCK) {
    // NOTE: must lock at least 1000000uusdn
    const { balances: before } = await queryClient.queryBalances(address);
    console.log('balances before', before);
    const STAKED = 'staked';
    const actual =
      await $v`nobled --node ${rpc} tx dollar vaults lock ${STAKED} ${env.LOCK} ${signArgs} -o json`;
    //   console.log(actual);
    const { code, raw_log, txhash } = JSON.parse(actual.stdout);
    if (code !== 0) {
      throw Error(raw_log);
    }
    await $v`sleep 6`;
    const { balances: after } = await queryClient.queryBalances(address);
    console.log('balances after (TODO: wait until this changes)', after);
    console.log({ txhash, url: `${explorer}/tx/${txhash}` });
  }
};

main().catch(err => {
  console.error('failed', err);
  process.exit(1);
});
