import type { ExecutionContext } from 'ava';
import { AmountMath } from '@agoric/ertp';
import { makeTrader } from '../../../packages/portfolio-contract/test/portfolio-actors.ts';

// The simulation context type is based on WalletFactoryTestContext
import type { WalletFactoryTestContext } from './walletFactory.ts';

export const makeSimulation = (ctx: WalletFactoryTestContext) => {
  let trader;
  let instance;
  let wallet;

  return {
    async beforeDeploy(t: ExecutionContext) {
      // No-op for now
    },
    async deployContract(context: WalletFactoryTestContext) {
      // Deploy the portfolio contract using the build proposal
      const { buildProposal, evalProposal, agoricNamesRemotes, refreshAgoricNamesRemotes, walletFactoryDriver } = context;
      const beneficiary = 'agoric126sd64qkuag2fva3vy3syavggvw44ca2zfrzyy';
      // Deploy the contract
      const materials = buildProposal(
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