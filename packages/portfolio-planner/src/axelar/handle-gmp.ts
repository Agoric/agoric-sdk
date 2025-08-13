import type { AxelarChain } from '@aglocal/portfolio-contract/src/constants';
import {
  createRemoteEVMAccount,
  supplyToAave,
  supplyToCompound,
  type PortfolioInstanceContext,
} from './gmp';

const { keys } = Object;

export type ArgsMap = {
  createRemoteAccount: [chain: string, gasAmt: string];
  supplyToAave: [
    chain: string,
    gasAmt: string,
    transferAmt: string,
    remoteAddr: string,
  ];
  supplyToCompound: [
    chain: string,
    gasAmt: string,
    transferAmt: string,
    remoteAddr: string,
  ];
};

type ArgsForCommand<C extends keyof ArgsMap> = ArgsMap[C];

export const handleGmp = async <C extends keyof ArgsMap>(
  ctx: PortfolioInstanceContext,
  command: C,
  args: ArgsForCommand<C>,
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
