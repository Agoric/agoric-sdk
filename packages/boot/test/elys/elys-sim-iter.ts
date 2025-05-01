/** @file exercise Elys contract in iterations; see chain-impact.test.ts */
import type { ExecutionContext } from 'ava';
import { BridgeId } from '@agoric/internal';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import {
  withChainCapabilities,
  type CosmosChainAddress,
} from '@agoric/orchestration';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import type { IBCChannelID } from '@agoric/vats';
import type { CopyRecord } from '@endo/marshal';
import type { CoinSDKType } from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js';
import { assetOn } from '@agoric/orchestration/src/utils/asset.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { type WalletFactoryTestContext } from '../bootstrapTests/walletFactory.js';
import { minimalChainInfos } from '../tools/chainInfo.js';
import { AckBehavior } from '../../tools/supports.js';

export interface ContractRecord extends CopyRecord {
  agoricOrchestrationAddress: CosmosChainAddress['value'];
}

const makeElysContractQuery = (ctx: WalletFactoryTestContext) => {
  const { storage } = ctx;
  return harden({
    contractRecord: () => {
      const values = storage.getValues('published.ElysContract.address');
      const it: ContractRecord = JSON.parse(values.at(-1)!);
      return it;
    },
  });
};

const makeUA = (elysQ: ReturnType<typeof makeElysContractQuery>) => {
  return harden({
    async advance(t: ExecutionContext) {
      const agoricOrchestrationAddress = elysQ.contractRecord();

      return { agoricOrchestrationAddress };
    },
  });
};

const transferAck = (
  bridgeUtils: WalletFactoryTestContext['bridgeUtils'],
  sourceChannel: IBCChannelID,
  destinationChannel: IBCChannelID,
) => {
  const { runInbound } = bridgeUtils;
  let sequence = 1;
  return harden({
    async ack(
      sender: CosmosChainAddress['value'],
      receiver: CosmosChainAddress['value'],
      denom: string,
    ) {
      await runInbound(
        BridgeId.VTRANSFER,
        buildVTransferEvent({
          sender,
          receiver,
          target: 'agoric1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqp7zqht',
          sourceChannel,
          destinationChannel,
          sequence: `${(sequence += 1)}`,
          denom,
          amount: 8n,
        }),
      );
      await eventLoopIteration();
    },
  });
};

const receiveAtom = (bridgeUtils: WalletFactoryTestContext['bridgeUtils']) => {
  const { runInbound } = bridgeUtils;
  return harden({
    async ack(
      coins: CoinSDKType,
      sourceChannel: any,
      sender: CosmosChainAddress['value'],
      receiver: CosmosChainAddress['value'],
    ) {
      await runInbound(
        BridgeId.VTRANSFER,
        buildVTransferEvent({
          receiver: receiver,
          target: receiver,
          sourceChannel,
          denom: coins.denom,
          amount: 10n,
          sender,
          sequence: '0',
        }),
      );
      await eventLoopIteration();
    },
  });
};

export const makeSimulation = (ctx: WalletFactoryTestContext) => {
  console.log('calling makeSimulation');
  const receiveInAgoricAccount = receiveAtom(ctx.bridgeUtils);

  const elysQ = makeElysContractQuery(ctx);

  const chainInfoWithCaps = withChainCapabilities(fetchedChainInfo);

  const commonAssetInfo = [
    assetOn('uist', 'agoric', undefined, 'cosmoshub', chainInfoWithCaps),
    assetOn('uusdc', 'noble', undefined, 'agoric', chainInfoWithCaps),
    assetOn('uatom', 'cosmoshub', undefined, 'agoric', chainInfoWithCaps),
    assetOn('uusdc', 'noble', undefined, 'dydx', chainInfoWithCaps),
    assetOn(
      'ibc/92287A0B6A572CDB384B6CD0FE396DFE23F5C2E02801E9562659DACCFD74941E',
      'elys',
      undefined,
      'agoric',
      chainInfoWithCaps,
    ),
  ];

  console.log('commonAssetInfo: ', commonAssetInfo);
  return harden({
    async beforeDeploy(t: ExecutionContext) {},

    async deployContract(context: WalletFactoryTestContext) {
      const {
        agoricNamesRemotes,
        bridgeUtils,
        buildProposal,
        evalProposal,
        refreshAgoricNamesRemotes,
      } = context;

      bridgeUtils.setAckBehavior(
        BridgeId.DIBC,
        'startChannelOpenInit',
        AckBehavior.Immediate,
      );

      const materials = buildProposal(
        '@agoric/builders/scripts/testing/init-elys-contract.js',
        [
          '--chainInfo',
          JSON.stringify(withChainCapabilities(minimalChainInfos)),
          '--assetInfo',
          JSON.stringify(commonAssetInfo),
        ],
      );

      await evalProposal(materials);
      refreshAgoricNamesRemotes();
      return agoricNamesRemotes.instance.ElysContract;
    },

    async beforeIterations(t: ExecutionContext) {},

    async iteration(t: ExecutionContext, iter: number) {
      const webUI = makeUA(elysQ);
      const { agoricOrchestrationAddress } = await webUI.advance(t);
      t.not(agoricOrchestrationAddress, undefined, 'agoricOrchestrationAddress should not be undefined');
      // send atom for stride liquid staking
      await receiveInAgoricAccount.ack(
        { amount: '10', denom: 'uatom' },
        'channel-405',
        'cosmos175c7xwly7nwycghwww87x83h56tdkjxzjfv55d',
        agoricOrchestrationAddress.value,
      ),
        await transferAck(ctx.bridgeUtils, 'channel-5', 'channel-405').ack(
          agoricOrchestrationAddress.value,
          'cosmos1test2',
          'ibc/BA313C4A19DFBF943586C0387E6B11286F9E416B4DD27574E6909CABE0E342FA',
        );
      await ctx.bridgeUtils.flushInboundQueue();
    },

    async cleanup(_doCoreEval: (specifier: string) => Promise<void>) {
      await null;
    },
  });
};
