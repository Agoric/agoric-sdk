import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import { E, Far } from '@endo/far';
import { makeNameHubKit } from '@agoric/vats';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import { orcUtils } from '../src/utils/orc.js';

const mockAssetHub = async () => {
  const mockBrand = name => Far(`${name} brand`) as Brand;

  const interchainAsset = {
    'ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9': {
      brand: mockBrand('USDC'),
      denom:
        'ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9',
      displayInfo: {
        assetKind: 'nat',
        decimalPlaces: 6,
      },
      issuer: { tODO: 'issuer' },
      issuerName: 'USDC',
      proposedName: 'USDC',
    },

    // matches mockChainInfo. TODO: match hash?
    'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9': {
      brand: mockBrand('ATOM'),
      denom:
        'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9',
      displayInfo: {
        assetKind: 'nat',
        decimalPlaces: 6,
      },
      issuer: {},
      issuerName: 'ATOM',
      proposedName: 'ATOM',
    },
  };

  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
    makeNameHubKit();
  const noop = harden(() => {});
  const s = await makeWellKnownSpaces(agoricNamesAdmin, noop, ['vbankAsset']);
  const admin = E(agoricNamesAdmin).lookupAdmin('vbankAsset');
  for await (const [denom, info] of Object.entries(interchainAsset)) {
    await E(admin).update(denom, info);
  }
  return E(agoricNames).lookup('vbankAsset');
};

test('makeOsmosisSwap', async t => {
  const hub = await mockAssetHub();
  const vbank = await E(hub)
    .entries()
    .then(es => Object.fromEntries(es.map(([d, a]) => [a.issuerName, a])));

  await null;
  const give = { USDC: AmountMath.make(vbank.USDC.brand, 100n) };
  const offerArgs = { staked: AmountMath.make(vbank.ATOM.brand, 200n) };

  const tiaAddress = {
    address: 'tia1arbitrary',
    chainId: 'celestia-123',
    addressEncoding: 'bech32' as const,
  };

  const expected = orcUtils.makeOsmosisSwap({
    destChain: 'celestia',
    destAddress: tiaAddress,
    amountIn: give.USDC,
    brandOut: offerArgs.staked.brand,
    slippage: 0.03,
  });

  t.deepEqual(expected, 'TODO');
});
