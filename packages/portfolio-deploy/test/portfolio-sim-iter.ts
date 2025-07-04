import type { ExecutionContext } from 'ava';
import { AmountMath } from '@agoric/ertp';
import { makeTrader } from '../../../packages/portfolio-contract/test/portfolio-actors.ts';
import { BridgeId } from '@agoric/internal';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { AckBehavior } from '@aglocal/boot/tools/supports.js';
import { configurations } from '../src/utils/deploy-config.js'; //TODO this will be removed

import type { IBCChannelID } from '@agoric/vats';
import type { CosmosChainAddress } from '@agoric/orchestration';
// The simulation context type is based on WalletFactoryTestContext
import type { WalletFactoryTestContext } from './walletFactory.ts';
import type {
  CctpTxEvidence,
  EvmAddress,
  NobleAddress,
} from '@agoric/fast-usdc';

const nobleAgoricChannelId = 'channel-21';

const makeCctp = (
  ctx: WalletFactoryTestContext,
  forwardingChannel: IBCChannelID,
  destinationChannel: IBCChannelID,
) => {
  const { runInbound } = ctx.bridgeUtils;

  const modern = new Date('2020-01-01');

  return harden({
    depositForBurn(
      amount: bigint,
      sender: EvmAddress,
      forwardingAddress: NobleAddress,
      nonce: number,
    ) {
      const hex1 = (nonce * 51).toString(16);
      const hex2 = (nonce * 73).toString(16);
      const txInfo: Omit<CctpTxEvidence, 'aux'> = harden({
        blockHash: `0x${hex2.repeat(64 / hex2.length)}`,
        blockNumber: 21037663n + BigInt(nonce),
        blockTimestamp: BigInt(modern.getTime() + nonce * 1000),
        txHash: `0x${hex1.repeat(64 / hex1.length)}`,
        tx: { amount, forwardingAddress, sender },
        chainId: 42161,
      });
      return txInfo;
    },
    async mint(
      amount: bigint,
      sender: CosmosChainAddress['value'],
      target: CosmosChainAddress['value'],
      receiver: CosmosChainAddress['value'],
    ) {
      // in due course, minted USDC arrives
      await runInbound(
        BridgeId.VTRANSFER,

        buildVTransferEvent({
          sequence: '1', // arbitrary; not used
          amount,
          denom: 'uusdc',
          sender,
          target,
          receiver,
          sourceChannel: forwardingChannel,
          destinationChannel,
        }),
      );
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

export const makeSimulation = (ctx: WalletFactoryTestContext) => {
  
  const cctp = makeCctp(ctx, nobleAgoricChannelId, 'channel-62');
  const toNoble = makeIBCChannel(ctx.bridgeUtils, 'channel-62');
  const oracles = Object.entries(configurations.MAINNET.oracles).map(
    ([name, addr]) => makeTxOracle(ctx, name, addr),
  );
  
  let trader;
  let instance;
  let wallet;

  return {
    async beforeDeploy(t: ExecutionContext) {  
      t.log('provision oracle smart wallets');
      await Promise.all(oracles.map(o => o.provision()));
      
    },
    async deployContract(context: WalletFactoryTestContext) {

    const {
        agoricNamesRemotes,
        bridgeUtils,
        buildProposal,
        evalProposal,
        refreshAgoricNamesRemotes,
        walletFactoryDriver,
      } = context;
      // inbound `startChannelOpenInit` responses immediately.
    // needed since the YMAX StartFn relies on an ICA being created
      bridgeUtils.setAckBehavior(
        BridgeId.DIBC,
        'startChannelOpenInit',
        AckBehavior.Immediate,
      );
      bridgeUtils.setBech32Prefix('noble');

      const beneficiary = 'agoric126sd64qkuag2fva3vy3syavggvw44ca2zfrzyy';
      wallet = await walletFactoryDriver.provideSmartWallet("agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce");
      let materials = buildProposal(
        '@aglocal/portfolio-deploy/src/access-token-setup.build.js',
      );
      await evalProposal(materials);
      // Deploy the contract
      materials = buildProposal(
        '@aglocal/portfolio-deploy/src/chain-info.build.js',
      );
      await evalProposal(materials);
      // Deploy the contract
      materials = buildProposal(
        '@aglocal/portfolio-deploy/src/portfolio.build.js',
      );
      await evalProposal(materials);
      refreshAgoricNamesRemotes();
      instance = agoricNamesRemotes.instance.ymax0;
      // Set up a wallet for the trader
      wallet = await walletFactoryDriver.provideSmartWallet(beneficiary);
      trader = makeTrader(wallet, instance);
      return instance;
    },
    async beforeIterations(t: ExecutionContext) {
      // No-op for now
    },
    async iteration(t: ExecutionContext, iter: number) {
      // Simulate opening a portfolio with a small Access token give
      const give = {};
      await trader.openPortfolio(t, give, {});
    },
    async cleanup(doCoreEval: (specifier: string) => Promise<void>) {
      // No-op for now
    },
  };
}; 