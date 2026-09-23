import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  chooseRpcAddrMainGood,
  MAINNET_RPC_ADDR_KLUDGE,
  withWalletAdminRpcKludge,
} from '../src/wallet-admin-rpc.ts';

test('wallet-admin only applies the RPC kludge on mainnet by default', t => {
  t.is(chooseRpcAddrMainGood({ AGORIC_NET: 'main' }), MAINNET_RPC_ADDR_KLUDGE);
  t.is(chooseRpcAddrMainGood({ AGORIC_NET: 'devnet' }), undefined);
  t.is(chooseRpcAddrMainGood({ AGORIC_NET: 'local' }), undefined);
  t.is(chooseRpcAddrMainGood({}), undefined);
});

test('wallet-admin preserves fetched RPCs unless a kludge RPC is supplied', t => {
  const networkConfig = {
    chainName: 'agoricdev-25',
    rpcAddrs: ['https://devnet.rpc.agoric.net:443'],
    apiAddrs: ['https://devnet.api.agoric.net:443'],
  };

  t.is(withWalletAdminRpcKludge(networkConfig, undefined), networkConfig);
  t.deepEqual(
    withWalletAdminRpcKludge(networkConfig, MAINNET_RPC_ADDR_KLUDGE),
    {
      ...networkConfig,
      rpcAddrs: [MAINNET_RPC_ADDR_KLUDGE],
    },
  );
});
