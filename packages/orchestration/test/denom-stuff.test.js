// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import crypto from 'crypto';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/far';
import { mockChainInfo } from './chain-info.js';

/** @import {Chain, ChainInfo, CosmosChainInfo, DenomArg, Orchestrator} from '../src/types.js'; */

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

/**
 * @param {typeof mockChainInfo.agoric} info
 * @param {Orchestrator} orchestrator
 *
 * @typedef {ReturnType<mockChain>} MChain
 */
const mockChain = (info, orchestrator) => {
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
  const { chainId, allowedMessages, allowedQueries } = info;
  const ibcConnectionInfo = info.connections.map(c => c.connectionInfo);

  /** @type {CosmosChainInfo} */
  const chainInfo = {
    chainId,
    allowedMessages,
    allowedQueries,
    // @ts-expect-error clientId => client_id etc.
    ibcConnectionInfo,
    // these flags are iffy???
    ibcHooksEnabled: false,
    icaEnabled: info.icaParams.hostEnabled,
    icqEnabled: info.icqParams.hostEnabled,
    pfmEnabled: false,
  };

  /** @param { string } path */
  const getTransferPeerId = path =>
    pathToPeerId.get(path) || Fail`no such channel: ${path}`;
  /** @param { string } id */
  const getPathToPeer = id =>
    peerIdToPath.get(id) || Fail`no path from ${info.chainId} to ${id}`;

  const findDenom = (id, baseDenom) => {
    const path = getPathToPeer(id);
    const dInfo =
      info.denoms.find(d => d.path === path && d.baseDenom === baseDenom) ||
      Fail`not found: ${baseDenom} from ${id} on ${info.chainId}`;
    return dInfo.denom;
  };

  /** @satisfies {Chain} */
  const self = harden({
    [Symbol.toStringTag]: info.chainId,
    getChainInfo: async () => chainInfo,

    makeAccount: async () => Fail`not impl`,

    findDenom,
    getPathToPeer,
    getTransferPeerId,

    /** @param {DenomArg} b */
    getLocalDenom: async b => {
      await null;
      let d0;
      if (typeof b === 'string') {
        d0 = b;
      } else {
        // XXX vbank access is async
        const vba =
          values(vbankAsset).find(a => a.brand === b) ||
          Fail`${b} not in vbank`;
        d0 = vba.denom;
      }
      const { chain, base, baseDenom } = orchestrator.getBrandInfo(d0);
      if (base === self) return baseDenom;
      if (chain === self) return d0;
      const { chainId: baseId } = await base.getChainInfo();
      return findDenom(baseId, baseDenom);
    },
  });

  return self;
};

/** @param {typeof mockChainInfo} infoByName */
const mockOrchestrator = infoByName => {
  /** @type {Map<string, MChain>} */
  const chainByName = new Map();
  /** @type {Map<string, MChain>} */
  const chainById = new Map();
  const byDenom = new Map();

  /** @type {Orchestrator} */
  const self = harden({
    getChain: async name =>
      chainByName.get(name) || Fail`no such chain: ${name}`,
    // https://github.com/Agoric/agoric-sdk/blob/d1a35d8054beb60538fca459f276aeb5526e094e/packages/orchestration/src/orchestration-api.ts#L98
    getBrandInfo(denom) {
      return byDenom.get(denom) || Fail`no such denom: ${denom}`;
    },
    makeLocalAccount: async () => Fail`not impl`,
    asAmount: () => Fail`not impl`,
  });

  for (const [name, info] of entries(infoByName)) {
    const chain = mockChain(info, self);
    chainByName.set(name, chain);
  }
  for (const [name, info] of entries(infoByName)) {
    chainById.set(info.chainId, chainByName.get(name) || Fail`unreachable`);
  }

  for (const info of values(infoByName)) {
    for (const d of info.denoms) {
      const chain = chainById.get(info.chainId) || Fail`unreachable`;
      const { denom, baseDenom, path } = d;
      if (d.native) {
        byDenom.set(denom, harden({ chain, base: chain, baseDenom: denom }));
        continue;
      }
      assert(path);
      const peerId = chain.getTransferPeerId(path);
      const base = chainById.get(peerId) || Fail`no such peer: ${peerId}`;

      byDenom.set(denom, harden({ chain, base, baseDenom }));
    }
  }

  return self;
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

  const getId = c => c[Symbol.toStringTag]; // XXX cheating

  t.log(getId(chain), vbank.ATOM.denom);
  t.log(getId(base), baseDenom);
  t.is(baseDenom, 'uatom');

  const osmosis = await orchestrator.getChain('osmosis');
  const osmoDenom = await osmosis.findDenom(getId(base), baseDenom);
  t.log(getId(osmosis), osmoDenom);

  const path = osmosis.getPathToPeer(getId(base));
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

  const getId = c => c[Symbol.toStringTag]; // XXX cheating

  t.truthy(base);
  assert(base); // for static typing
  t.log(getId(chain), vbank.USDC.denom);
  t.log(getId(base), baseDenom);
  t.is(baseDenom, 'uusdc');

  const osmosis = await orchestrator.getChain('osmosis');
  const osmoDenom = await osmosis.findDenom(getId(base), baseDenom);
  t.log(getId(osmosis), osmoDenom);

  const path = osmosis.getPathToPeer(getId(base));
  const hash = await denomHash({ path, denom: 'uusdc' });
  t.is(osmoDenom, `ibc/${hash}`);
});

/** @param {ReturnType<typeof mockOrchestrator>} orchestrator */
const makeOrcUtils = async orchestrator => {
  const osmosis = await orchestrator.getChain('osmosis');

  const getId = c => c[Symbol.toStringTag]; // XXX cheating
  const it = harden({
    makeOsmosisSwap({ destChain, destAddress, amountIn, brandOut, slippage }) {
      //   const dest = orchestrator.getChain(destChain);

      const findOsmoDenom = b => {
        const local =
          values(vbankAsset).find(a => a.brand === b) ||
          Fail`${b} not in vbank`;
        const { base, baseDenom } = orchestrator.getBrandInfo(local.denom);
        if (base === osmosis) return baseDenom;
        return osmosis.findDenom(getId(base), baseDenom);
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
  const orcUtils = await makeOrcUtils(orchestrator);

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

  const getId = c => c[Symbol.toStringTag]; // XXX cheating
  t.log(transferMsg);
  const osmosis = await orchestrator.getChain('osmosis');
  const cosmos = await orchestrator.getChain('cosmos');
  const noble = await orchestrator.getChain('noble');
  const usdcOnOsmo = osmosis.findDenom(getId(noble), 'uusdc');
  const atomOnOsmo = osmosis.findDenom(getId(cosmos), 'uatom');
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
