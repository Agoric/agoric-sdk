import type { ExecutionContext } from 'ava';
import { AmountMath } from '@agoric/ertp';
import { makeTrader } from './portfolio-actors.ts';
import { BridgeId } from '@agoric/internal';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { AckBehavior } from '@aglocal/boot/tools/supports.js';
import { configurations } from '../src/utils/deploy-config.js'; //TODO this will be removed
import { makePromiseKit } from '@endo/promise-kit';
import { makeWallet } from '../../../packages/portfolio-contract/test/wallet-offer-tools.ts';
import { makeFakeBankManagerKit } from '../../../packages/vats/tools/bank-utils.js';
import { E } from '@endo/far';

import type { WalletTool } from '../../../packages/portfolio-contract/test/wallet-offer-tools.ts';
import type { IBCChannelID } from '@agoric/vats';
import type { CosmosChainAddress } from '@agoric/orchestration';
// The simulation context type is based on WalletFactoryTestContext
import type { WalletFactoryTestContext } from './walletFactory.ts';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type {
  CctpTxEvidence,
  EvmAddress,
  NobleAddress,
} from '@agoric/fast-usdc';
import { trace } from 'console';

type SmartWallet = Awaited<
  ReturnType<
    WalletFactoryTestContext['walletFactoryDriver']['provideSmartWallet']
  >
>;

const nobleAgoricChannelId = 'channel-21';

const makeTxOracle = (
  ctx: WalletFactoryTestContext,
  name: string,
  addr: string,
) => {
  const { agoricNamesRemotes, walletFactoryDriver: wfd } = ctx;
  const walletPK = makePromiseKit<SmartWallet>();

  return harden({
    async provision() {
      walletPK.resolve(wfd.provideSmartWallet(addr));
      return walletPK.promise;
    },
    async claim() {
      const wallet = await walletPK.promise;
      await wallet.sendOffer({
        id: 'claim-oracle-invitation',
        invitationSpec: {
          source: 'purse',
          instance: agoricNamesRemotes.instance.fastUsdc,
          description: 'oracle operator invitation',
        },
        proposal: {},
      });
    },
    async submit(evidence: CctpTxEvidence, nonce: number) {
      const wallet = await walletPK.promise;
      const it: OfferSpec = {
        id: `submit-evidence-${nonce}`,
        invitationSpec: {
          source: 'continuing',
          previousOffer: 'claim-oracle-invitation',
          invitationMakerName: 'SubmitEvidence',
          invitationArgs: [evidence],
        },
        proposal: {},
      };
      await wallet.sendOffer(it);
      return it;
    },
  });
};
type TxOracle = ReturnType<typeof makeTxOracle>;

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
  let zoe: ZoeService;
  let usdcBrand: Brand<'nat'>;

  return {
    async beforeDeploy(t: ExecutionContext<{ runUtils: { EV: any } }>) {
      t.log('provision oracle smart wallets');
      const { EV } = t.context.runUtils;
      zoe = await EV.vat('bootstrap').consumeItem('zoe');

      // await Promise.all(oracles.map(o => o.provision()));
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

      const beneficiary = 'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce';
      wallet = await walletFactoryDriver.provideSmartWallet(
        'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
      );
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
      // agoricNamesRemotes.brand

      refreshAgoricNamesRemotes();
      instance = agoricNamesRemotes.instance.ymax0;
      // Set up a wallet for the trader
      wallet = await walletFactoryDriver.provideSmartWallet(beneficiary);

      // wallet.deposit(
      //   AmountMath.make(
      //     agoricNamesRemotes.brand.PoC26,
      //     100n,
      //   ),
      // );

      // makeWallet({ Access: { issuer: agoricNamesRemotes.issuer.Access }, USDC: { issuer: agoricNamesRemotes.issuer.USDC } }, zoe, vowTools.when);

      trader = makeTrader(wallet, instance, agoricNamesRemotes.brand.PoC26);

      // Initialize bank manager kit to get pourPayment
      const { bankManager, pourPayment } = await makeFakeBankManagerKit();
      refreshAgoricNamesRemotes();
      trace('usdcBrand', agoricNamesRemotes.brand);
      usdcBrand = agoricNamesRemotes.brand.USDC as any;
      const USDCPmt = await pourPayment(AmountMath.make(usdcBrand, 100000n));
      const purse = await E(E(bankManager).getBankForAddress(beneficiary)).getPurse(
        usdcBrand,
      );
      await E(purse).deposit(USDCPmt);

      // const brand = await E(issuer).getBrand();
      // const purse = E(issuer).makeEmptyPurse();
      // const pmt = await pourPayment(make(brand, value));
      // await E(purse).deposit(pmt);
      // return purse;

      return instance;
    },
    async beforeIterations(t: ExecutionContext) {
      // No-op for now
    },
    async iteration(t: ExecutionContext, iter: number) {
      // Simulate opening a portfolio with a small Access token give
      const give = {
        USDC: AmountMath.make(
          usdcBrand,
          100_000n,
        )
      };
      await trader.openPortfolio(t, give, {});
    },
    async cleanup(doCoreEval: (specifier: string) => Promise<void>) {
      // No-op for now
    },
  };
};
