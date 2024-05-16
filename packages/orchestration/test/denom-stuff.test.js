// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import crypto from 'crypto';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/far';
import { mockChainInfo } from './chain-info.js';

/** @import {ChainInfo, CosmosChainInfo} from '../src/types.js'; */

const { entries, fromEntries, values } = Object;
const { Fail } = assert;

const mockBrand = name => /** @type {Brand} */ (Far(`${name} brand`));

const vbankAsset = {
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

  // matches mockChainInfo
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

const te = new TextEncoder();

// ack: https://stackoverflow.com/a/40031979/7963
function buf2hex(buffer) {
  // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}

// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
const sha256 = txt =>
  crypto.subtle.digest('SHA-256', te.encode(txt)).then(buf => buf2hex(buf));

const denomHash = async ({ channel, denom, port = 'transfer' }) => {
  const path = `${port}/${channel}/${denom}`;
  return sha256(path);
};

const mockRegistry = () => {
  const byName = new Map();
  const it = harden({
    register(name, info) {
      byName.set(name, info);
    },
    lookup(name) {
      const info = byName.get(name);
      assert(info);
      return info;
    },
  });
  return it;
};

/** @param {typeof mockChainInfo.agoric} info */
const mockChain = info => {
  const pathToDestId = new Map();
  for (const conn of info.connections) {
    for (const chan of conn.transferChannels) {
      const { sourcePortId, sourceChannelId } = chan;
      const path = `${sourcePortId}/${sourceChannelId}`;
      pathToDestId.set(path, conn.chainId);
    }
  }

  const it = harden({
    /** @returns {CosmosChainInfo} */
    getChainInfo: () => Fail`TODO`,
    getId: () => info.chainId,
    getConnections: () => info.connections,
    getDenoms: () => info.denoms,
    getTransferPeerId: path => pathToDestId.get(path) || Fail`${path}`,
  });
  return it;
};

/** @param {typeof mockChainInfo} infoByName */
const mockOrchestrator = infoByName => {
  const chainByName = new Map(
    entries(infoByName).map(([name, info]) => [name, mockChain(info)]),
  );
  const chains = [...chainByName.values()];
  const chainById = new Map(
    entries(infoByName).map(([name, info]) => [
      info.chainId,
      chainByName.get(name),
    ]),
  );
  const byDenom = new Map(
    chains.flatMap(chain =>
      chain.getDenoms().map(d => {
        const { denom, baseDenom, path } = d;
        if (d.native)
          return harden([denom, { chain, base: chain, baseDenom: denom }]);
        assert(path);
        const base = chainById.get(chain.getTransferPeerId(path));

        return harden([denom, { chain, base, baseDenom }]);
      }),
    ),
  );

  const it = harden({
    // https://github.com/Agoric/agoric-sdk/blob/d1a35d8054beb60538fca459f276aeb5526e094e/packages/orchestration/src/orchestration-api.ts#L98
    getBrandInfo(denom) {
      return byDenom.get(denom) || Fail`${denom}`;
    },
  });
  return it;
};

const coreEval1 = async (chainInfoRecord = mockChainInfo) => {
  const orchestrator = mockOrchestrator(chainInfoRecord);
  return { orchestrator };
};

test.skip('given Agoric denom for USDC, what is corresponding denom on noble?', t => {
  const usdc = Object.values(vbankAsset).find(a => a.issuerName === 'USDC');
  t.log(usdc);
});

test.skip('find denoms to swap ATOM on osmosis', async t => {
  const atomAsset =
    values(vbankAsset).find(a => a.issuerName === 'ATOM') || Fail``;

  const { orchestrator } = await coreEval1();
  const { baseDenom } = orchestrator.getBrandInfo(atomAsset.denom);
  t.is(baseDenom, 'uatom', 'ATOM denom on cosmos');

  // assume no chainId collisions
  const registry = mockRegistry();
  registry.register(
    'cosmos',
    mockChainInfo.agoric.connections.find(c => c.chainId === 'gaia-test'),
  );
  registry.register(
    'osmosis',
    mockChainInfo.agoric.connections.find(c => c.chainId === 'osmosis-test'),
  );

  mockChainInfo.osmosis.connections.find(c => c.chainId === XXX);

  const d = await denomHash({ channel: osmoToCosmos, denom: atomBaseDenom });
});

test.skip('given Agoric denom for USDC, what is corresponding denom on osmosis?', async t => {
  // by issuer name
  const vbank = fromEntries(values(vbankAsset).map(a => [a.issuerName, a]));

  const knownChains = {
    osmosis: 'connection-0',
  };
  const osmosisConn = values(mockChainInfo.agoric.connections).find(
    conn => conn.connectionInfo.id === knownChains.osmosis,
  );

  const d = await denomHash({ channel: osmoToNoble, denom: 'uusdc' });
});

test('given Agoric denom for ATOM, what is corresponding denom on cosmos hub?', async t => {
  // by issuer name
  const vbank = fromEntries(values(vbankAsset).map(a => [a.issuerName, a]));

  const { orchestrator } = await coreEval1();
  const dInfo = orchestrator.getBrandInfo(vbank.ATOM.denom);

  t.log(vbank.ATOM.denom, dInfo.baseDenom);
  t.is(dInfo.baseDenom, 'uatom');
});

test.skip('top goal: PFM swap', async t => {
  // by issuer name
  const vbank = fromEntries(values(vbankAsset).map(a => [a.issuerName, a]));

  const tiaAddress = 'does-not-matter';
  const give = { USDC: AmountMath.make(vbank.USDC.brand, 100n) };
  const offerArgs = { staked: AmountMath.make(vbank.ATOM.brand, 200n) };

  // https://github.com/Agoric/agoric-sdk/blob/f951cde10ee6618660938b2e5b404f797231d8e2/packages/orchestration/src/examples/swapExample.contract.js#L64C1-L71C10
  // but we don't have relevant mock chain config
  // so let's use cosmos for now.

  // build swap instructions with orcUtils library
  const transferMsg = orcUtils.makeOsmosisSwap({
    destChain: 'cosmos',
    destAddress: tiaAddress,
    amountIn: give.USDC,
    brandOut: offerArgs.staked.brand,
    slippage: 0.03,
  });
});
