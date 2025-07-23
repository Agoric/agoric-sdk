import {
  SigningStargateClient,
  assertIsDeliverTxSuccess,
} from '@cosmjs/stargate';
import { getSigner } from './utils';
import { buildGMPPayload } from './axelar-support';
import { addresses, channels, tokens, urls } from './config';
import {
  AxelarGMPMessageType,
  type AxelarGmpOutgoingMemo,
  type BaseGmpArgs,
  type GmpArgsContractCall,
} from './types';
import { getWalletAddress } from './listen';

export const axelarChainsMap = {
  Ethereum: {
    caip: 'eip155:11155111',
    axelarId: 'ethereum-sepolia',
    contractAddresses: {
      usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    },
  },
  Avalanche: {
    caip: 'eip155:43113',
    axelarId: 'Avalanche',
    contractAddresses: {
      factory: '0x84E2eFa88324A270b95B062048BD43fb821FDb0f',
      usdc: '0x5425890298aed601595a70AB815c96711a31Bc65',
    },
  },
};

export const createRemoteEVMAccount = async (gmpArgs: BaseGmpArgs) => {
  const { destinationEVMChain, amount: gasAmounts } = gmpArgs;
  const { contractAddresses } = axelarChainsMap[destinationEVMChain];

  await sendGmp({
    destinationAddress: contractAddresses.factory,
    destinationEVMChain,
    type: AxelarGMPMessageType.ContractCall,
    amount: gasAmounts,
    contractInvocationData: [],
  });
};

export const makeAxelarMemo = (gmpArgs: GmpArgsContractCall) => {
  const {
    contractInvocationData,
    destinationEVMChain,
    destinationAddress,
    amount: gasAmount,
    type,
  } = gmpArgs;

  const payload = buildGMPPayload(contractInvocationData);
  const memo: AxelarGmpOutgoingMemo = {
    destination_chain: axelarChainsMap[destinationEVMChain].axelarId,
    destination_address: destinationAddress,
    payload,
    type,
  };

  memo.fee = {
    amount: String(gasAmount),
    recipient: addresses.AXELAR_GAS,
  };

  return JSON.stringify(memo);
};

export const sendIbc = async ({ memo, amount }) => {
  const signer = await getSigner();
  const accounts = await signer.getAccounts();
  const senderAddress = accounts[0].address;
  console.log('Sender Address:', senderAddress);

  const ibcPayload = [
    {
      typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
      value: {
        sender: senderAddress,
        receiver: addresses.AXELAR_GMP,
        token: {
          denom: tokens.nativeTokenAgoric,
          amount,
        },
        timeoutTimestamp: (Math.floor(Date.now() / 1000) + 600) * 1e9,
        sourceChannel: channels.AGORIC_DEVNET_TO_AXELAR,
        sourcePort: 'transfer',
        memo,
      },
    },
  ];

  console.log('Connecting with Signer...');
  const signingClient = await SigningStargateClient.connectWithSigner(
    urls.RPC_AGORIC_DEVNET,
    signer,
  );

  const fee = {
    gas: '1000000',
    amount: [{ denom: tokens.nativeTokenAgoric, amount: '1000000' }],
  };

  console.log('Sign and Broadcast transaction...');
  const response = await signingClient.signAndBroadcast(
    senderAddress,
    ibcPayload,
    fee,
  );

  console.log('Asserting');
  assertIsDeliverTxSuccess(response);

  console.log('Transaction hash:', response.transactionHash);

  await getWalletAddress({ txHash: response.transactionHash });
};

export const sendGmp = async (gmpArgs: GmpArgsContractCall) => {
  const memo = makeAxelarMemo(gmpArgs);
  return sendIbc({ memo, amount: String(gmpArgs.amount) });
};
