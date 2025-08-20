import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';

// XXX replace with Hyperweb https://github.com/Agoric/agoric-sdk/issues/11780
import { stringToPath } from '@cosmjs/crypto';
import {
  DirectSecp256k1HdWallet,
  Registry,
  type GeneratedType,
} from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';
import { Fail } from '@endo/errors';

// XXX should come from code https://github.com/Agoric/agoric-sdk/issues/5912
const AgoricMsgs = {
  MsgWalletSpendAction: {
    typeUrl: '/agoric.swingset.MsgWalletSpendAction',
    aminoType: 'swingset/WalletSpendAction',
  },
};
const agoricRegistryTypes: [string, GeneratedType][] = [
  [
    AgoricMsgs.MsgWalletSpendAction.typeUrl,
    MsgWalletSpendAction as GeneratedType,
  ],
];

export const makeStargateClientKit = async (
  mnemonic: string,
  {
    prefix = 'agoric',
    hdPath = `m/44'/564'/0'/0/0`,
    rpcAddr,
    connectWithSigner,
  }: {
    prefix?: string;
    hdPath?: string;
    rpcAddr: string;
    connectWithSigner: typeof SigningStargateClient.connectWithSigner;
  },
) => {
  const signer = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix,
    hdPaths: [stringToPath(hdPath)],
  });
  const accounts = await signer.getAccounts();
  accounts.length === 1 || Fail`expected exactly one account`;
  const [{ address }] = accounts;
  const client = await connectWithSigner(rpcAddr, signer, {
    registry: new Registry(agoricRegistryTypes),
  });

  return Object.freeze({ address, client });
};
