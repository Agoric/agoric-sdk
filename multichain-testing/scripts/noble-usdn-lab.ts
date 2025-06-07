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

  const nobleChain = useChain('noble');
  const apiUrl = await nobleChain.getRestEndpoint();
  const queryClient = makeQueryClient(apiUrl); // XXX pass fetch

  const fundsWanted = 10_000_000_000;
  for (;;) {
    const { balance } = await queryClient.queryBalance(address, 'uusdc');
    if (balance) {
      console.log(address, 'has', balance);
      const amount = BigInt(balance.amount);
      if (amount >= fundsWanted) break;
    }
    console.log('getting creditFromFaucet for', address);
    await nobleChain.creditFromFaucet(address);
  }

  const route = `pool_id: 0 denom_to: "uusdn"`; // protobuf text format
  const actual =
    await $`nobled tx swap swap 1000000uusdc ${route} 950000uusdn --from=trader1 --keyring-backend=test`;
  console.log(actual);
};

main().catch(err => {
  console.error('failed', err);
  process.exit(1);
});
