// Reference: https://github.com/circlefin/noble-cctp/blob/master/examples/depositForBurn.ts
// Instructions for running: https://github.com/circlefin/noble-cctp/blob/master/examples/README.md
import 'dotenv/config';
import {
  DirectSecp256k1HdWallet,
  Registry,
  type GeneratedType,
} from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';
import _m0 from 'protobufjs/minimal.js';
import Long from 'long';

interface MsgDepositForBurn {
  from: string;
  amount: string;
  destinationDomain: number;
  mintRecipient: Uint8Array;
  burnToken: string;
}

type KeysOfUnion<T> = T extends T ? keyof T : never;
type Builtin =
  | Date
  | Function
  | Uint8Array
  | string
  | number
  | boolean
  | undefined;

type Exact<P, I extends P> = P extends Builtin
  ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & {
      [K in Exclude<keyof I, KeysOfUnion<P>>]: never;
    };

type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Long
    ? string | number | Long
    : T extends globalThis.Array<infer U>
      ? globalThis.Array<DeepPartial<U>>
      : T extends ReadonlyArray<infer U>
        ? ReadonlyArray<DeepPartial<U>>
        : T extends {}
          ? { [K in keyof T]?: DeepPartial<T[K]> }
          : Partial<T>;

const createBaseMsgDepositForBurn = (): MsgDepositForBurn => {
  return {
    from: '',
    amount: '',
    destinationDomain: 0,
    mintRecipient: new Uint8Array(0),
    burnToken: '',
  };
};

const bytesFromBase64 = (b64: string): Uint8Array => {
  if (globalThis.Buffer) {
    return Uint8Array.from(globalThis.Buffer.from(b64, 'base64'));
  } else {
    const bin = globalThis.atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; ++i) {
      arr[i] = bin.charCodeAt(i);
    }
    return arr;
  }
};

const base64FromBytes = (arr: Uint8Array): string => {
  if (globalThis.Buffer) {
    return globalThis.Buffer.from(arr).toString('base64');
  } else {
    const bin: string[] = [];
    arr.forEach(byte => {
      bin.push(globalThis.String.fromCharCode(byte));
    });
    return globalThis.btoa(bin.join(''));
  }
};

const isSet = (value: any): boolean => {
  return value !== null && value !== undefined;
};

const MsgDepositForBurn = {
  encode(
    message: MsgDepositForBurn,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.amount !== '') {
      writer.uint32(18).string(message.amount);
    }
    if (message.destinationDomain !== 0) {
      writer.uint32(24).uint32(message.destinationDomain);
    }
    if (message.mintRecipient.length !== 0) {
      writer.uint32(34).bytes(message.mintRecipient);
    }
    if (message.burnToken !== '') {
      writer.uint32(42).string(message.burnToken);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgDepositForBurn {
    const reader =
      input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDepositForBurn();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.from = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.amount = reader.string();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.destinationDomain = reader.uint32();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.mintRecipient = reader.bytes();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.burnToken = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MsgDepositForBurn {
    return {
      from: isSet(object.from) ? globalThis.String(object.from) : '',
      amount: isSet(object.amount) ? globalThis.String(object.amount) : '',
      destinationDomain: isSet(object.destinationDomain)
        ? globalThis.Number(object.destinationDomain)
        : 0,
      mintRecipient: isSet(object.mintRecipient)
        ? bytesFromBase64(object.mintRecipient)
        : new Uint8Array(0),
      burnToken: isSet(object.burnToken)
        ? globalThis.String(object.burnToken)
        : '',
    };
  },

  toJSON(message: MsgDepositForBurn): unknown {
    const obj: any = {};
    if (message.from !== '') {
      obj.from = message.from;
    }
    if (message.amount !== '') {
      obj.amount = message.amount;
    }
    if (message.destinationDomain !== 0) {
      obj.destinationDomain = Math.round(message.destinationDomain);
    }
    if (message.mintRecipient.length !== 0) {
      obj.mintRecipient = base64FromBytes(message.mintRecipient);
    }
    if (message.burnToken !== '') {
      obj.burnToken = message.burnToken;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgDepositForBurn>, I>>(
    base?: I,
  ): MsgDepositForBurn {
    return MsgDepositForBurn.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MsgDepositForBurn>, I>>(
    object: I,
  ): MsgDepositForBurn {
    const message = createBaseMsgDepositForBurn();
    message.from = object.from ?? '';
    message.amount = object.amount ?? '';
    message.destinationDomain = object.destinationDomain ?? 0;
    message.mintRecipient = object.mintRecipient ?? new Uint8Array(0);
    message.burnToken = object.burnToken ?? '';
    return message;
  },
};

const cctpTypes: ReadonlyArray<[string, GeneratedType]> = [
  ['/circle.cctp.v1.MsgDepositForBurn', MsgDepositForBurn],
];

const createDefaultRegistry = (): Registry => {
  return new Registry(cctpTypes);
};

export const depositForBurn = async () => {
  try {
    console.log('*****depositForBurn*****');
    const NOBLE_RPC = 'https://rpc.testnet.noble.xyz/';
    const amountToSend = '1000000'; // uusdc (1 USDC)
    const gasAmount = '400000'; // Gas amount in uusdc for the transaction
    // https://developers.circle.com/stablecoins/supported-domains
    const destinationDomain = 0; // Ethereum

    const mnemonic = process.env.MNEMONIC;
    if (!mnemonic) {
      throw Error('mnemonic is not defined');
    }
  console.log('*****Setup Wallet*****');
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: 'noble',
  });

  const [account] = await wallet.getAccounts();
  console.log('ADDR:', account.address);

  const client = await SigningStargateClient.connectWithSigner(
    NOBLE_RPC,
    wallet,
    {
      registry: createDefaultRegistry(),
    },
  );
  console.log('*****Connected with Signer*****');

  // Left pad the mint recipient address with 0's to 32 bytes
  const rawMintRecipient = process.env.MINT_RECIPIENT;
  if (!rawMintRecipient) {
    throw Error('rawMintRecipient is not defined');
  }
  console.log('rawMintRecipient:', rawMintRecipient);
  const cleanedMintRecipient = rawMintRecipient.replace(/^0x/, '');
  const zeroesNeeded = 64 - cleanedMintRecipient.length;
  const mintRecipient = '0'.repeat(zeroesNeeded) + cleanedMintRecipient;
  const buffer = Buffer.from(mintRecipient, 'hex');
  const mintRecipientBytes = new Uint8Array(buffer);

  const msg = {
    typeUrl: '/circle.cctp.v1.MsgDepositForBurn',
    value: {
      from: account.address,
      amount: amountToSend,
      destinationDomain,
      mintRecipient: mintRecipientBytes,
      burnToken: 'uusdc',
      // If using DepositForBurnWithCaller, add destinationCaller here
    },
  };

  const fee = {
    amount: [
      {
        denom: 'uusdc',
        amount: gasAmount,
      },
    ],
    gas: gasAmount,
  };
  const memo = '';
  console.log('Broadcasting....');
  const result = await client.signAndBroadcast(
    account.address,
    [msg],
    fee,
    memo,
  );

  console.log(
    `Burned on Noble: https://mintscan.io/noble-testnet/tx/${result.transactionHash}`,
  );
  console.log(
    `Minting on Ethereum to https://sepolia.etherscan.io/address/${rawMintRecipient}`,
  );
  } catch (error) {
    console.error('Error in depositForBurn:', error);
    throw error;
  }
};
