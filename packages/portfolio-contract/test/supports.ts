import { makeIssuerKit } from '@agoric/ertp';
import {
  denomHash,
  type CosmosChainInfo,
  type Denom,
} from '@agoric/orchestration';
import type {
  AxelarGmpIncomingMemo,
  SupportedEVMChains,
} from '@agoric/orchestration/src/axelar-types.js';
import { type DenomDetail } from '@agoric/orchestration/src/exos/chain-hub.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { setupOrchestrationTest } from '@agoric/orchestration/tools/contract-tests.ts';
import type { AssetInfo } from '@agoric/vats/src/vat-bank.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { E } from '@endo/far';
import type { ExecutionContext } from 'ava';
import { encodeAbiParameters } from 'viem';
import { DECODE_CONTRACT_CALL_RESULT_ABI } from '../src/portfolio.exo.ts';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.ts';

export const makeIncomingEvent = (
  target: string,
  source_chain: SupportedEVMChains,
  amount = 123n,
) => {
  const arbEth = '0x3dA3050208a3F2e0d04b33674aAa7b1A9F9B313C';
  const p2 = encodeAbiParameters([{ type: 'address' }], [arbEth]);
  const payload = encodeAbiParameters(DECODE_CONTRACT_CALL_RESULT_ABI, [
    { isContractCallResult: false, data: [{ success: true, result: p2 }] },
  ]);
  const incoming: AxelarGmpIncomingMemo = {
    source_address: arbEth,
    type: 2,
    source_chain,
    payload,
  };

  const agToAxelar = fetchedChainInfo.agoric.connections['axelar-dojo-1'];

  const event = buildVTransferEvent({
    receiver: target, // TODO: receiver?
    target,
    sourceChannel: agToAxelar.transferChannel.counterPartyChannelId,
    denom: 'uusdc',
    amount,
    sender: `axelar1TODO`,
    memo: JSON.stringify(incoming),
  });
  return event;
};

export {
  makeFakeLocalchainBridge,
  makeFakeTransferBridge,
} from '@agoric/vats/tools/fake-bridge.js';

const assetOn = (
  baseDenom: Denom,
  baseName: string,
  chainName?: string,
  infoOf?: Record<string, CosmosChainInfo>,
  brandKey?: string,
): [string, DenomDetail & { brandKey?: string }] => {
  if (!chainName) {
    return [baseDenom, { baseName, chainName: baseName, baseDenom }];
  }
  if (!infoOf) throw Error(`must provide infoOf`);
  const issuerInfo = infoOf[baseName];
  const holdingInfo = infoOf[chainName];
  if (!holdingInfo) throw Error(`${chainName} missing`);
  if (!holdingInfo.connections)
    throw Error(`connections missing for ${chainName}`);
  const { channelId } =
    holdingInfo.connections[issuerInfo.chainId].transferChannel;
  const denom = `ibc/${denomHash({ denom: baseDenom, channelId })}`;
  return [denom, { baseName, chainName, baseDenom, brandKey }];
};

export const [uusdcOnAgoric, agUSDCDetail] = assetOn(
  'uusdc',
  'noble',
  'agoric',
  fetchedChainInfo,
  'USDC',
);

export const setupPortfolioTest = async ({
  log,
}: {
  log: ExecutionContext<any>['log'];
}) => {
  const common = await setupOrchestrationTest({ log });
  const {
    bootstrap: { agoricNamesAdmin, bankManager },
  } = common;
  const usdc = withAmountUtils(makeIssuerKit('USDC'));
  await E(bankManager).addAsset(
    uusdcOnAgoric,
    'USDC',
    'USD Circle Stablecoin',
    usdc.issuerKit,
  );
  // These mints no longer stay in sync with bankManager.
  // Use pourPayment() for IST.
  const { mint: _i, ...usdcSansMint } = usdc;
  await E(E(agoricNamesAdmin).lookupAdmin('vbankAsset')).update(
    uusdcOnAgoric,
    harden({
      brand: usdc.brand,
      issuer: usdc.issuer,
      issuerName: 'USDC',
      denom: 'uusdc',
      proposedName: 'USDC',
      displayInfo: { assetKind: 'nat', IOU: true },
    }) as AssetInfo,
  );

  const assetInfo: [Denom, DenomDetail & { brandKey?: string }][] = harden([
    assetOn('uusdc', 'noble'),
    [uusdcOnAgoric, agUSDCDetail],
    assetOn('uusdc', 'noble', 'osmosis', fetchedChainInfo),
  ]);

  // XXX poolMetricsNode is fastUsdc-specific
  const { poolMetricsNode: _p, ...commonPrivateArgs } =
    common.commonPrivateArgs;

  return {
    ...common,
    brands: { usdc: usdcSansMint },
    commonPrivateArgs: {
      ...commonPrivateArgs,
      assetInfo,
    },
    utils: common.utils,
  };
};
