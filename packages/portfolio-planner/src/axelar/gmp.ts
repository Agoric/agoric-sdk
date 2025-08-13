import {
  SigningStargateClient,
  assertIsDeliverTxSuccess,
} from '@cosmjs/stargate';
import { buildGasPayload } from './support';
import type {
  AxelarGmpOutgoingMemo,
  BaseGmpArgs,
  GmpArgsContractCall,
  PortfolioInstanceContext,
} from './types';

const GAS_TOKEN = 'ubld';

const makeAxelarMemo = (gmpArgs: GmpArgsContractCall) => {
  const { destinationChain, destinationAddr, gasAmt, type, gasAddr } = gmpArgs;

  const payload = buildGasPayload(0n);
  const memo: AxelarGmpOutgoingMemo = {
    destination_chain: destinationChain,
    destination_address: destinationAddr,
    payload,
    type,
    fee: {
      amount: String(gasAmt),
      recipient: gasAddr,
    },
  };

  return JSON.stringify(memo);
};

export const sendGmp = async (
  ctx: PortfolioInstanceContext,
  gmpArgs: GmpArgsContractCall,
) => {
  const { signer, sourceChannel, rpcUrl } = ctx;
  const memo = makeAxelarMemo(gmpArgs);

  const accounts = await signer.getAccounts();
  const senderAddress = accounts[0].address;
  console.log('Sender Address:', senderAddress);

  const ibcPayload = [
    {
      typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
      value: {
        sender: senderAddress,
        receiver: gmpArgs.gmpAddr,
        token: {
          denom: GAS_TOKEN,
          amount: String(gmpArgs.gasAmt),
        },
        timeoutTimestamp: (Math.floor(Date.now() / 1000) + 600) * 1e9,
        sourceChannel,
        sourcePort: 'transfer',
        memo,
      },
    },
  ];

  console.log('Connecting with Signer...');
  const signingClient = await SigningStargateClient.connectWithSigner(
    rpcUrl,
    signer,
  );

  const fee = {
    gas: '1000000',
    amount: [{ denom: GAS_TOKEN, amount: '1000000' }],
  };

  console.log('Sign and Broadcast transaction...');
  const response = await signingClient.signAndBroadcast(
    senderAddress,
    ibcPayload,
    fee,
  );

  console.log('Asserting');
  assertIsDeliverTxSuccess(response);
};

export const createRemoteEVMAccount = async (
  ctx: PortfolioInstanceContext,
  gmpArgs: BaseGmpArgs,
) => {
  const { destinationChain, gasAmt } = gmpArgs;
  const { contracts, gmpAddresses } = ctx.axelarConfig[destinationChain];
  const { AXELAR_GAS, AXELAR_GMP } = gmpAddresses;

  await sendGmp(ctx, {
    destinationAddr: contracts.factory,
    destinationChain,
    gmpAddr: AXELAR_GMP,
    gasAddr: AXELAR_GAS,
    type: 1,
    gasAmt,
    calls: [],
  });
};

export const supplyToAave = async (
  ctx: PortfolioInstanceContext,
  gmpArgs: BaseGmpArgs & {
    transferAmt: bigint;
  },
  remoteAddr: string,
) => {
  const { destinationChain, transferAmt, gasAmt } = gmpArgs;
  const { contracts, gmpAddresses } = ctx.axelarConfig[destinationChain];
  const { AXELAR_GAS, AXELAR_GMP } = gmpAddresses;

  await sendGmp(ctx, {
    destinationAddr: remoteAddr,
    destinationChain,
    gmpAddr: AXELAR_GMP,
    gasAddr: AXELAR_GAS,
    type: 1,
    gasAmt,
    calls: [
      {
        functionSignature: 'approve(address,uint256)',
        args: [contracts.aavePool, transferAmt],
        target: contracts.usdc,
      },
      {
        functionSignature: 'supply(address,uint256,address,uint16)',
        args: [contracts.usdc, transferAmt, remoteAddr, 0],
        target: contracts.aavePool,
      },
    ],
  });
};

export const supplyToCompound = async (
  ctx: PortfolioInstanceContext,
  gmpArgs: BaseGmpArgs & {
    transferAmt: bigint;
  },
  remoteAddr: string,
) => {
  const { destinationChain, transferAmt, gasAmt } = gmpArgs;
  const { contracts, gmpAddresses } = ctx.axelarConfig[destinationChain];
  const { AXELAR_GAS, AXELAR_GMP } = gmpAddresses;

  await sendGmp(ctx, {
    destinationAddr: remoteAddr,
    destinationChain,
    gmpAddr: AXELAR_GMP,
    gasAddr: AXELAR_GAS,
    type: 1,
    gasAmt,
    calls: [
      {
        functionSignature: 'approve(address,uint256)',
        args: [contracts.compound, transferAmt],
        target: contracts.usdc,
      },
      {
        functionSignature: 'supply(address,uint256)',
        args: [contracts.usdc, transferAmt],
        target: contracts.compound,
      },
    ],
  });
};
