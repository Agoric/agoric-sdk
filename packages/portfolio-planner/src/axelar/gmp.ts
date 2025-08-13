import { SigningStargateClient } from '@cosmjs/stargate';
import { buildGasPayload } from './support';
import type { Bech32Address } from '@agoric/orchestration';
import type { EVMContractAddressesMap } from '@aglocal/portfolio-contract/src/type-guards';
import type {
  AxelarId,
  GmpAddresses,
} from '@aglocal/portfolio-contract/src/portfolio.contract';
import type { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import type { AxelarChain } from '@aglocal/portfolio-contract/src/constants';
import {
  extractWalletAddress,
  getTxStatus,
  type AxelarExecutedEvent,
} from './gmp-status.ts';

const GAS_TOKEN = 'ubld';

type AxelarGmpOutgoingMemo = {
  destination_chain: string;
  destination_address: string;
  payload: number[] | null;
  type: 1 | 2; // 1 == ContractCall and 2 == ContractCallWithToken;
  fee: {
    amount: string;
    recipient: Bech32Address;
  };
};

export type PortfolioInstanceContext = {
  axelarConfig: {
    axelarIds: AxelarId;
    contracts: EVMContractAddressesMap;
    gmpAddresses: GmpAddresses;
    queryApi: string;
  };
  signer: DirectSecp256k1HdWallet;
  sourceChannel: string;
  rpcUrl: string;
};

export type ContractCall = {
  target: `0x${string}`;
  functionSignature: string;
  args: unknown[];
};

export type AbiEncodedContractCall = {
  target: `0x${string}`;
  data: `0x${string}`;
};

export type BaseGmpArgs = {
  destinationChain: AxelarChain;
  gasAmt: number;
};

type GmpArgsContractCall = BaseGmpArgs & {
  destinationAddr: string;
  type: 1 | 2; // 1 == ContractCall and 2 == ContractCallWithToken
  calls: Array<ContractCall>;
  gmpAddr: Bech32Address;
  gasAddr: Bech32Address;
};

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
  console.log('DeliverTxResponse:', response);

  return response.transactionHash;
};

export const createRemoteEVMAccount = async (
  ctx: PortfolioInstanceContext,
  gmpArgs: BaseGmpArgs,
) => {
  const { destinationChain, gasAmt } = gmpArgs;
  const contracts = ctx.axelarConfig.contracts[destinationChain];
  const { AXELAR_GAS, AXELAR_GMP } = ctx.axelarConfig.gmpAddresses;

  const txHash = await sendGmp(ctx, {
    destinationAddr: contracts.factory,
    destinationChain,
    gmpAddr: AXELAR_GMP,
    gasAddr: AXELAR_GAS,
    type: 1,
    gasAmt,
    calls: [],
  });

  console.log('Waiting for wallet creation...');
  const res = await getTxStatus(ctx.axelarConfig.queryApi, fetch, {
    txHash,
  });
  if (!res.success) {
    throw Error(
      'TODO: if logs not defined after 4min polling, maybe some tx failure/delay?',
    );
  }
  const addr = await extractWalletAddress(res.logs as AxelarExecutedEvent);
  console.log('Remote EVM Addr:', addr);
  console.log('TODO: make offer to the contract to resolve the pending vow');
};

export const supplyToAave = async (
  ctx: PortfolioInstanceContext,
  gmpArgs: BaseGmpArgs & {
    transferAmt: bigint;
  },
  remoteAddr: string,
) => {
  const { destinationChain, transferAmt, gasAmt } = gmpArgs;
  const contracts = ctx.axelarConfig.contracts[destinationChain];
  const { AXELAR_GAS, AXELAR_GMP } = ctx.axelarConfig.gmpAddresses;

  const txHash = await sendGmp(ctx, {
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

  const res = await getTxStatus(ctx.axelarConfig.queryApi, fetch, {
    txHash,
  });
  if (!res.success) {
    throw Error('deployment of funds not successful');
  }
  // TODO: notify the contract about success
};

export const supplyToCompound = async (
  ctx: PortfolioInstanceContext,
  gmpArgs: BaseGmpArgs & {
    transferAmt: bigint;
  },
  remoteAddr: string,
) => {
  const { destinationChain, transferAmt, gasAmt } = gmpArgs;
  const contracts = ctx.axelarConfig.contracts[destinationChain];
  const { AXELAR_GAS, AXELAR_GMP } = ctx.axelarConfig.gmpAddresses;

  const txHash = await sendGmp(ctx, {
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

  const res = await getTxStatus(ctx.axelarConfig.queryApi, fetch, {
    txHash,
  });
  if (!res.success) {
    throw Error('deployment of funds not successful');
  }
  // TODO: notify the contract about success
};
