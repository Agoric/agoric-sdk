import type { AxelarChain } from '@aglocal/portfolio-contract/src/constants';
import {
  createRemoteEVMAccount,
  supplyToAave,
  supplyToCompound,
  type PortfolioInstanceContext,
} from './gmp.ts';

const { keys } = Object;

export type GmpArgsMap = {
  createRemoteAccount: [chain: AxelarChain, gasAmt: string];
  supplyToAave: [
    chain: AxelarChain,
    gasAmt: string,
    transferAmt: string,
    remoteAddr: string,
  ];
  supplyToCompound: [
    chain: AxelarChain,
    gasAmt: string,
    transferAmt: string,
    remoteAddr: string,
  ];
};

export type GmpArgsForCommand<C extends keyof GmpArgsMap> = GmpArgsMap[C];

export const handleGmp = async <C extends keyof GmpArgsMap>(
  ctx: PortfolioInstanceContext,
  command: C,
  args: GmpArgsForCommand<C>,
) => {
  const { axelarIds } = ctx.axelarConfig;
  switch (command) {
    case 'createRemoteAccount': {
      const [chainStr, gasAmtStr] = args;
      if (!chainStr || !gasAmtStr) {
        console.error(
          'Error: createRemoteAccount requires chain and gasAmount',
        );
        return;
      }

      const chain = chainStr as AxelarChain;
      const gasAmt = parseInt(gasAmtStr);

      if (!axelarIds[chain]) {
        console.error(
          `Error: Invalid chain ${chain}. Must be one of: ${keys(axelarIds).join(', ')}`,
        );
        return;
      }

      console.log(
        `Creating remote account on ${chain} with gas amount ${gasAmt}...`,
      );
      await createRemoteEVMAccount(ctx, { destinationChain: chain, gasAmt });
      console.log('Remote account creation transaction sent successfully!');
      break;
    }

    case 'supplyToAave': {
      const [chainStr, gasAmtStr, transferAmtStr, remoteAddr] = args;
      if (!chainStr || !gasAmtStr || !transferAmtStr || !remoteAddr) {
        console.error(
          'Error: supplyToAave requires chain, gasAmount, transferAmount, and remoteAddress',
        );
        return;
      }

      const chain = chainStr as AxelarChain;
      const gasAmt = parseInt(gasAmtStr);
      const transferAmt = BigInt(transferAmtStr);

      if (!axelarIds[chain]) {
        console.error(
          `Error: Invalid chain ${chain}. Must be one of: ${keys(axelarIds).join(', ')}`,
        );
        return;
      }

      console.log(
        `Supplying ${transferAmt} to Aave on ${chain} with gas amount ${gasAmt}...`,
      );
      await supplyToAave(
        ctx,
        { destinationChain: chain, gasAmt, transferAmt },
        remoteAddr,
      );
      console.log('Aave supply transaction sent successfully!');
      break;
    }

    case 'supplyToCompound': {
      const [chainStr, gasAmtStr, transferAmtStr, remoteAddr] = args;
      if (!chainStr || !gasAmtStr || !transferAmtStr || !remoteAddr) {
        console.error(
          'Error: supplyToCompound requires chain, gasAmount, transferAmount, and remoteAddress',
        );
        return;
      }

      const chain = chainStr as AxelarChain;
      const gasAmt = parseInt(gasAmtStr);
      const transferAmt = BigInt(transferAmtStr);

      if (!axelarIds[chain]) {
        console.error(
          `Error: Invalid chain ${chain}. Must be one of: ${keys(axelarIds).join(', ')}`,
        );
        return;
      }

      console.log(
        `Supplying ${transferAmt} to Compound on ${chain} with gas amount ${gasAmt}...`,
      );
      await supplyToCompound(
        ctx,
        { destinationChain: chain, gasAmt, transferAmt },
        remoteAddr,
      );
      console.log('Compound supply transaction sent successfully!');
      break;
    }

    default:
      console.error(`Error: Unknown command '${command}'`);
      return;
  }
};
