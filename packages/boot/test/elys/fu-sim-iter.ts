/** @file exercise Fast USDC contract in iterations; see chain-impact.test.ts */
import type { ExecutionContext } from 'ava';

import { AckBehavior } from '../../tools/supports.js';
import {
  encodeAddressHook,
  encodeBech32,
} from '@agoric/cosmic-proto/address-hooks.js';
// import type {
//   CctpTxEvidence,
//   ContractRecord,
//   EvmAddress,
//   NobleAddress,
//   PoolMetrics,
// } from '@agoric/fast-usdc';
import { Offers } from '@agoric/fast-usdc/src/clientSupport.js';
import { BridgeId } from '@agoric/internal';
import { Nat } from '@endo/nat';
import { defaultMarshaller } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { withChainCapabilities, type Bech32Address, type CosmosChainAddress } from '@agoric/orchestration';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { IBCChannelID } from '@agoric/vats';
import { makePromiseKit } from '@endo/promise-kit';
// import { configurations } from '@agoric/fast-usdc/src/utils/deploy-config.js';
import { type WalletFactoryTestContext } from '../bootstrapTests/walletFactory.js';
import type { CopyRecord } from '@endo/marshal';
import type { CoinSDKType } from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js';
import { minimalChainInfos } from '../tools/chainInfo.js';

type SmartWallet = Awaited<
  ReturnType<
    WalletFactoryTestContext['walletFactoryDriver']['provideSmartWallet']
  >
>;

const range = (n: number) => Array.from(Array(n).keys());
const prefixedRange = (n: number, pfx: string) =>
  range(n).map(ix => `${pfx}${ix}`);

const nobleAgoricChannelId = 'channel-21';

export interface ContractRecord extends CopyRecord {
  agoricOrchestrationAddress: CosmosChainAddress['value'];
}

const makeFastUsdcQuery = (ctx: WalletFactoryTestContext) => {
  const { storage } = ctx;
  return harden({
    // metrics: () => {
    //   const metrics: PoolMetrics = defaultMarshaller.fromCapData(
    //     JSON.parse(storage.getValues('published.fastUsdc.poolMetrics').at(-1)!),
    //   );
    //   return metrics;
    // },
    contractRecord: () => {
      const values = storage.getValues('published.ElysContract.address');
      const it: ContractRecord = JSON.parse(values.at(-1)!);
      return it;
    },
//     txStatus: (txHash: string) =>
//       storage
//         .getValues(`published.fastUsdc.txns.${txHash}`)
//         .map(txt => defaultMarshaller.fromCapData(JSON.parse(txt))),
  });
};

// /**
//  * https://github.com/noble-assets/forwarding/blob/main/types/account.go#L19
//  *
//  * @param channel
//  * @param recipient
//  * @param fallback
//  */
// const deriveNobleForwardingAddress = (
//   channel: IBCChannelID,
//   recipient: string,
//   fallback: string,
// ) => {
//   if (fallback) throw Error('not supported');
//   const out: NobleAddress = `noble1${channel}${recipient.slice(-30)}`;
//   return out;
// };

const makeUA = (
  // address: CosmosChainAddress,
  fastQ: ReturnType<typeof makeFastUsdcQuery>,
//   cctp: ReturnType<typeof makeCctp>,
//   oracles: TxOracle[],
) => {
  return harden({
    async advance(
      t: ExecutionContext,
      // amount: bigint,
      // EUD: string,
      // nonce: number,
    ) {
      const { agoricOrchestrationAddress } = fastQ.contractRecord();
      // const recipientContractAddress = encodeAddressHook(agoricOrchestrationAddress, { EUD });
      return { agoricOrchestrationAddress };
    },
  });
};

const makeIBCChannel = (
  bridgeUtils: WalletFactoryTestContext['bridgeUtils'],
  sourceChannel: IBCChannelID,
) => {
  const { runInbound } = bridgeUtils;
  let sequence = 0;
  return harden({
    async ack(sender: CosmosChainAddress['value']) {
      await runInbound(
        BridgeId.VTRANSFER,
        buildVTransferEvent({
          sender,
          target: sender,
          sourceChannel,
          sequence: `${(sequence += 1)}`,
        }),
      );
    },
  });
};

const receive = (
  bridgeUtils: WalletFactoryTestContext['bridgeUtils'],
) => {
  const { runInbound } = bridgeUtils;
  let sequence = 0;
  return harden({
    // async ack(coins,sender: CosmosChainAddress['value']) {
    async ack(coins: CoinSDKType, sourceChannel: any, sender: CosmosChainAddress['value'], receiver: CosmosChainAddress['value']) {
      await runInbound(
        BridgeId.VTRANSFER,
        buildVTransferEvent({
          receiver: receiver,
          target: receiver,
          sourceChannel,
          denom: coins.denom,
          amount: 10n,
          sender,
        }),
      );
      await eventLoopIteration();
    },
  });
};

export const makeSimulation = (ctx: WalletFactoryTestContext) => {
  console.log('calling makeSimulation');
  const receiveInAgoricAccount = receive(ctx.bridgeUtils);

  const fastQ = makeFastUsdcQuery(ctx);

  return harden({
    async beforeDeploy(t: ExecutionContext) {
    //   t.log('provision oracle smart wallets');
    //   await Promise.all(oracles.map(o => o.provision()));
    },

    async deployContract(context: WalletFactoryTestContext) {
      const {
        agoricNamesRemotes,
        bridgeUtils,
        buildProposal,
        evalProposal,
        refreshAgoricNamesRemotes,
      } = context;

      // inbound `startChannelOpenInit` responses immediately.
      // needed since the Fusdc StartFn relies on an ICA being created
      bridgeUtils.setAckBehavior(
        BridgeId.DIBC,
        'startChannelOpenInit',
        AckBehavior.Immediate,
      );
      // bridgeUtils.setAckBehavior(
      //   BridgeId.DIBC,
      //   'startChannelOpenInit',
      //   AckBehavior.Immediate,
      // );
      // const {
      //   bootstrap: { storage },
      //   commonPrivateArgs,
      //   mocks: { transferBridge, ibcBridge },
      //   utils: { inspectLocalBridge, inspectDibcBridge, transmitTransferAck },
      // } = await commonSetup(context.);
      //   bridgeUtils.setBech32Prefix('noble');

      // const materials = buildProposal(
      //   '@agoric/builders/scripts/testing/init-elys-contract.js',
      //   ['--net', 'MAINNET'],
      // );

      const materials = buildProposal('@agoric/builders/scripts/testing/init-elys-contract.js', [
            '--chainInfo',
            JSON.stringify(withChainCapabilities(minimalChainInfos)),
            '--assetInfo',
            JSON.stringify([
              [
                'uist',
                {
                  baseDenom: 'uist',
                  brandKey: 'IST',
                  baseName: 'agoric',
                  chainName: 'agoric',
                },
              ],
            ]),
          ]);

      await evalProposal(materials);
      refreshAgoricNamesRemotes();
      return agoricNamesRemotes.instance.ElysContract;
    },

    async beforeIterations(t: ExecutionContext) {
      t.log('Calling before iterations');
    },

    async iteration(t: ExecutionContext, iter: number) {
      console.log('Calling iteration line 223');
      const webUI = makeUA(fastQ);
      const {agoricOrchestrationAddress} = await webUI.advance(t);
      console.log('Calling iteration line 225: Address: ',agoricOrchestrationAddress);
      
      // 5 different users iterating the process
      // const who = iter % 5;
      // const amount = BigInt(10*iter);
      
      // const agoricOrchestrationChainAddress = {
      //   chainId: 'agoric-3',
      //   value: 'agoric1fakeLCAAddress',
      //   encoding: 'bech32'
      // } 
      console.log('Calling iteration line 236');
      
      // send atom for stride liquid staking
      await receiveInAgoricAccount.ack(
        { amount: '10', denom: 'uatom' },
        'channel-405',
        'cosmos175c7xwly7nwycghwww87x83h56tdkjxzjfv55d',
        'agoric1fakeLCAAddress',
      ),
      console.log('Calling iteration line 245');
      await eventLoopIteration();
      console.log('Calling iteration line 247');
    },

    async cleanup(doCoreEval: (specifier: string) => Promise<void>) {
      // await doCoreEval(
      //   '@aglocal/fast-usdc-deploy/scripts/delete-completed-txs.js',
      // );
      await null;
    },
  });
};