import { test } from './prepare-test-env-ava.js';
import { assertNetworkConfig } from '../src/netconfig.js';

test('https://main.agoric.net/network-config 2022-10-27', t => {
  /**
   * @type {import('@agoric/casting/src/netconfig.js').NetworkConfig}
   */
  const specimen = {
    chainName: 'agoric-3',
    gci: 'edef208d407403e6f478bc33dcf7bb294febc5bc6a423c720f0c9c50da5176d5',
    peers: [
      'a26158a5cbb1df581dd6843ac427191af76d6d5d@104.154.240.50:26656',
      '6e26a1b4afa6889f841d7957e8c2b5d50d32d485@95.216.53.26:26656',
    ],
    rpcAddrs: ['https://agoric-rpc.polkachu.com:443'],
    apiAddrs: ['https://agoric-api.polkachu.com:443'],
    // @ts-expect-error extraneous
    oldRpcAddrs: ['https://main.rpc.agoric.net:443'],
    seeds: [],
  };
  t.notThrows(() => assertNetworkConfig(harden(specimen)));
});

test('https://ollinet.agoric.net/network-config 2022-10-27', t => {
  /**
   * @type {import('@agoric/casting/src/netconfig.js').NetworkConfig}
   */
  const specimen = {
    chainName: 'agoricollinet-44',
    gci: 'https://ollinet.rpc.agoric.net:443/genesis',
    peers: ['fb86a0993c694c981a28fa1ebd1fd692f345348b@34.67.167.8:26656'],
    rpcAddrs: ['https://ollinet.rpc.agoric.net:443'],
    seeds: ['0f04c4610b7511a64b8644944b907416db568590@34.172.146.145:26656'],
  };
  t.notThrows(() => assertNetworkConfig(harden(specimen)));
});

test('https://ollinet.agoric.net/network-config 2022-10-27 minus rpcAddrs', t => {
  const specimen = {
    chainName: 'agoricollinet-44',
    gci: 'https://ollinet.rpc.agoric.net:443/genesis',
    peers: ['fb86a0993c694c981a28fa1ebd1fd692f345348b@34.67.167.8:26656'],
    seeds: ['0f04c4610b7511a64b8644944b907416db568590@34.172.146.145:26656'],
  };
  t.throws(() => assertNetworkConfig(harden(specimen)), {
    message: /Must have missing properties \["rpcAddrs"\]/,
  });
});
