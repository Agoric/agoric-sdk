// @ts-check
import { makeChainInfo } from '../SuggestChain.js';

test('apiAddrs overrides rpcAddrs', () => {
  expect(
    makeChainInfo(
      {
        chainName: 'agoric-3',
        rpcAddrs: ['basicRpc'],
      },
      'a caption',
      0,
    ).rest,
  ).toBe('http://basicRpc:1317');
  expect(
    makeChainInfo(
      {
        chainName: 'agoric-3',
        rpcAddrs: ['basicRpc'],
        apiAddrs: ['restOverride'],
      },
      'a caption',
      0,
    ).rest,
  ).toBe('restOverride');
});
