import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import {
  DirectSecp256k1HdWallet,
  Registry,
  type GeneratedType,
} from '@cosmjs/proto-signing';
import { stringToPath } from '@cosmjs/crypto';
import { SigningStargateClient } from '@cosmjs/stargate';
import { Fail } from '@endo/errors';
import { verifyStatus } from './utils.ts';

const AgoricMsgs = {
  MsgWalletSpendAction: {
    aminoType: 'swingset/WalletSpendAction',
    typeUrl: '/agoric.swingset.MsgWalletSpendAction',
  },
};

const agoricRegistryTypes: Array<[string, GeneratedType]> = [
  [
    AgoricMsgs.MsgWalletSpendAction.typeUrl,
    MsgWalletSpendAction as GeneratedType,
  ],
];

const makeStargateClientKit = async (
  mnemonic: string,
  {
    connectWithSigner,
    hdPath = `m/44'/564'/0'/0/0`,
    now,
    prefix = 'agoric',
    rpcAddresses,
  }: {
    connectWithSigner: typeof SigningStargateClient.connectWithSigner;
    hdPath?: string;
    now: () => number;
    prefix?: string;
    rpcAddresses: Array<string>;
  },
) => {
  const [priorityRpcAddress, fallbackRpcAddress] = rpcAddresses;

  let fallbackClient: SigningStargateClient;

  const signer = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix,
    hdPaths: [stringToPath(hdPath)],
  });

  const accounts = await signer.getAccounts();
  accounts.length === 1 || Fail`expected exactly one account`;

  const [{ address }] = accounts;

  const client = await connectWithSigner(priorityRpcAddress, signer, {
    registry: new Registry(agoricRegistryTypes),
  });

  if (fallbackRpcAddress)
    fallbackClient = await connectWithSigner(fallbackRpcAddress, signer, {
      registry: new Registry(agoricRegistryTypes),
    });

  const broadcastTx: typeof client.broadcastTx = async (
    tx,
    timeoutMs,
    pollIntervalMs,
  ) => {
    let response: Awaited<ReturnType<typeof client.broadcastTx>>;

    await null;

    try {
      if (fallbackClient) await verifyStatus({ now }, priorityRpcAddress);

      response = await client.broadcastTx(tx, timeoutMs, pollIntervalMs);
    } catch (err) {
      if (fallbackClient) {
        console.error(
          `Error while executing "broadcastTx" on ${priorityRpcAddress}, falling back to ${fallbackRpcAddress}`,
          err,
        );

        response = await fallbackClient.broadcastTx(
          tx,
          timeoutMs,
          pollIntervalMs,
        );
      } else throw err;
    }

    return response;
  };

  const sign: typeof client.sign = async (
    signerAddress,
    messages,
    fee,
    memo,
    explicitSignerData,
    timeoutHeight,
  ) => {
    let response: Awaited<ReturnType<typeof client.sign>>;

    await null;

    try {
      if (fallbackClient) await verifyStatus({ now }, priorityRpcAddress);

      response = await client.sign(
        signerAddress,
        messages,
        fee,
        memo,
        explicitSignerData,
        timeoutHeight,
      );
    } catch (err) {
      if (fallbackClient) {
        console.error(
          `Error while executing "sign" on ${priorityRpcAddress}, falling back to ${fallbackRpcAddress}`,
          err,
        );

        response = await fallbackClient.sign(
          signerAddress,
          messages,
          fee,
          memo,
          explicitSignerData,
          timeoutHeight,
        );
      } else throw err;
    }

    return response;
  };

  const signAndBroadcast: typeof client.signAndBroadcast = async (
    signerAddress,
    messages,
    fee,
    memo,
    timeoutHeight,
  ) => {
    let response: Awaited<ReturnType<typeof client.signAndBroadcast>>;

    await null;

    try {
      if (fallbackClient) await verifyStatus({ now }, priorityRpcAddress);

      response = await client.signAndBroadcast(
        signerAddress,
        messages,
        fee,
        memo,
        timeoutHeight,
      );
    } catch (err) {
      if (fallbackClient) {
        console.error(
          `Error while executing "signAndBroadcast" on ${priorityRpcAddress}, falling back to ${fallbackRpcAddress}`,
          err,
        );

        response = await fallbackClient.signAndBroadcast(
          signerAddress,
          messages,
          fee,
          memo,
          timeoutHeight,
        );
      } else throw err;
    }

    return response;
  };

  client.broadcastTx = broadcastTx;
  client.sign = sign;
  client.signAndBroadcast = signAndBroadcast;

  return Object.freeze({ address, client });
};

export default makeStargateClientKit;
