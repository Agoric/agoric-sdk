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

const denomHash = async ({
  port = 'transfer',
  channel = undefined,
  path = `${port}/${channel}`,
  denom,
}) => {
  return sha256(`${path}/${denom}`).then(s => s.toUpperCase());
};

/** @param {typeof mockChainInfo.agoric} info */
const mockChain = info => {
  const pathToPeerId = new Map();
  const peerIdToPath = new Map();
  for (const conn of info.connections) {
    for (const chan of conn.transferChannels) {
      const { sourcePortId, sourceChannelId } = chan;
      const path = `${sourcePortId}/${sourceChannelId}`;
      pathToPeerId.set(path, conn.chainId);
      peerIdToPath.set(conn.chainId, path);
    }
  }

  const it = harden({
    [Symbol.toStringTag]: info.chainId,
    /** @returns {CosmosChainInfo} */
    getChainInfo: () => Fail`TODO`,
    getId: () => info.chainId,
    getDenoms: () => info.denoms,
    getTransferPeerId: path =>
      pathToPeerId.get(path) || Fail`no such channel: ${path}`,
    getPathToPeer: id =>
      peerIdToPath.get(id) || Fail`no path from ${info.chainId} to ${id}`,
    findDenom: (id, baseDenom) => {
      const path = it.getPathToPeer(id);
      const dInfo =
        info.denoms.find(d => d.path === path && d.baseDenom === baseDenom) ||
        Fail`not found: ${baseDenom} from ${id} on ${info.chainId}`;
      return dInfo.denom;
    },
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
        const peerId = chain.getTransferPeerId(path);
        const base = chainById.get(peerId) || Fail`no such peer: ${peerId}`;

        return harden([denom, { chain, base, baseDenom }]);
      }),
    ),
  );

  const it = harden({
    getChain: name => chainByName.get(name) || Fail`no such chain: ${name}`,
    // https://github.com/Agoric/agoric-sdk/blob/d1a35d8054beb60538fca459f276aeb5526e094e/packages/orchestration/src/orchestration-api.ts#L98
    getBrandInfo(denom) {
      return byDenom.get(denom) || Fail`no such denom: ${denom}`;
    },
  });
  return it;
};

const coreEval1 = async (chainInfoRecord = mockChainInfo) => {
  const orchestrator = mockOrchestrator(chainInfoRecord);
  return { orchestrator };
};

test('Agoric ATOM denom -> cosmos hub ATOM denom -> osmosis ATOM denom', async t => {
  // by issuer name
  const vbank = fromEntries(values(vbankAsset).map(a => [a.issuerName, a]));

  const { orchestrator } = await coreEval1();
  const { chain, base, baseDenom } = orchestrator.getBrandInfo(
    vbank.ATOM.denom,
  );
  t.truthy(base);
  assert(base); // for static typing

  t.log(chain.getId(), vbank.ATOM.denom);
  t.log(base.getId(), baseDenom);
  t.is(baseDenom, 'uatom');

  const osmosis = orchestrator.getChain('osmosis');
  const osmoDenom = osmosis.findDenom(base.getId(), baseDenom);
  t.log(osmosis.getId(), osmoDenom);

  const path = osmosis.getPathToPeer(base.getId());
  const hash = await denomHash({ path, denom: 'uatom' });
  t.is(osmoDenom, `ibc/${hash}`);
});

test('Agoric USDC denom -> noble USDC denom -> osmosis USDC denom', async t => {
  // by issuer name
  const vbank = fromEntries(values(vbankAsset).map(a => [a.issuerName, a]));

  const { orchestrator } = await coreEval1();
  const { chain, base, baseDenom } = orchestrator.getBrandInfo(
    vbank.USDC.denom,
  );

  t.truthy(base);
  assert(base); // for static typing
  t.log(chain.getId(), vbank.USDC.denom);
  t.log(base.getId(), baseDenom);
  t.is(baseDenom, 'uusdc');

  const osmosis = orchestrator.getChain('osmosis');
  const osmoDenom = osmosis.findDenom(base.getId(), baseDenom);
  t.log(osmosis.getId(), osmoDenom);

  const path = osmosis.getPathToPeer(base.getId());
  const hash = await denomHash({ path, denom: 'uusdc' });
  t.is(osmoDenom, `ibc/${hash}`);
});

/** @param {ReturnType<typeof mockOrchestrator>} orchestrator */
const makeOrcUtils = orchestrator => {
  const osmosis = orchestrator.getChain('osmosis');

  const it = harden({
    makeOsmosisSwap({ destChain, destAddress, amountIn, brandOut, slippage }) {
      //   const dest = orchestrator.getChain(destChain);

      const findOsmoDenom = b => {
        const local =
          values(vbankAsset).find(a => a.brand === b) ||
          Fail`${b} not in vbank`;
        const { base, baseDenom } = orchestrator.getBrandInfo(local.denom);
        if (base === osmosis) return baseDenom;
        return osmosis.findDenom(base.getId(), baseDenom);
      };

      const denomIn = findOsmoDenom(amountIn.brand);
      const denomOut = findOsmoDenom(brandOut);
      const swapDenomsEtc = {
        swap: {
          in: { denom: denomIn, value: amountIn.value },
          out: { denom: denomOut },
          slippage,
        },
        txfr: { destChain, destAddress },
      };
      return swapDenomsEtc;
    },
  });
  return it;
};

test('find denoms to swap USDC for ATOM on osmosis', async t => {
  // by issuer name
  const vbank = fromEntries(values(vbankAsset).map(a => [a.issuerName, a]));

  const tiaAddress = 'cosmos123dest';
  const give = { USDC: AmountMath.make(vbank.USDC.brand, 100n) };
  const offerArgs = { staked: AmountMath.make(vbank.ATOM.brand, 200n) };

  const { orchestrator } = await coreEval1();
  const orcUtils = makeOrcUtils(orchestrator);

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

  t.log(transferMsg);
  const osmosis = orchestrator.getChain('osmosis');
  const cosmos = orchestrator.getChain('cosmos');
  const noble = orchestrator.getChain('noble');
  const usdcOnOsmo = osmosis.findDenom(noble.getId(), 'uusdc');
  const atomOnOsmo = osmosis.findDenom(cosmos.getId(), 'uatom');
  t.deepEqual(transferMsg, {
    swap: {
      in: {
        denom: usdcOnOsmo,
        value: 100n,
      },
      out: {
        denom: atomOnOsmo,
      },
      slippage: 0.03,
    },
    txfr: {
      destAddress: 'cosmos123dest',
      destChain: 'cosmos',
    },
  });
});
