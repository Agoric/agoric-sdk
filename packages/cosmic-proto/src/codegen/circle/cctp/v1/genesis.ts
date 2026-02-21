//@ts-nocheck
import { Attester, type AttesterSDKType } from './attester.js';
import {
  PerMessageBurnLimit,
  type PerMessageBurnLimitSDKType,
} from './per_message_burn_limit.js';
import {
  BurningAndMintingPaused,
  type BurningAndMintingPausedSDKType,
} from './burning_and_minting_paused.js';
import {
  SendingAndReceivingMessagesPaused,
  type SendingAndReceivingMessagesPausedSDKType,
} from './sending_and_receiving_messages_paused.js';
import {
  MaxMessageBodySize,
  type MaxMessageBodySizeSDKType,
} from './max_message_body_size.js';
import { Nonce, type NonceSDKType } from './nonce.js';
import {
  SignatureThreshold,
  type SignatureThresholdSDKType,
} from './signature_threshold.js';
import { TokenPair, type TokenPairSDKType } from './token_pair.js';
import {
  RemoteTokenMessenger,
  type RemoteTokenMessengerSDKType,
} from './remote_token_messenger.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/** GenesisState defines the cctp module's genesis state. */
export interface GenesisState {
  owner: string;
  attesterManager: string;
  pauser: string;
  tokenController: string;
  attesterList: Attester[];
  perMessageBurnLimitList: PerMessageBurnLimit[];
  burningAndMintingPaused?: BurningAndMintingPaused;
  sendingAndReceivingMessagesPaused?: SendingAndReceivingMessagesPaused;
  maxMessageBodySize?: MaxMessageBodySize;
  nextAvailableNonce?: Nonce;
  signatureThreshold?: SignatureThreshold;
  tokenPairList: TokenPair[];
  usedNoncesList: Nonce[];
  tokenMessengerList: RemoteTokenMessenger[];
}
export interface GenesisStateProtoMsg {
  typeUrl: '/circle.cctp.v1.GenesisState';
  value: Uint8Array;
}
/** GenesisState defines the cctp module's genesis state. */
export interface GenesisStateSDKType {
  owner: string;
  attester_manager: string;
  pauser: string;
  token_controller: string;
  attester_list: AttesterSDKType[];
  per_message_burn_limit_list: PerMessageBurnLimitSDKType[];
  burning_and_minting_paused?: BurningAndMintingPausedSDKType;
  sending_and_receiving_messages_paused?: SendingAndReceivingMessagesPausedSDKType;
  max_message_body_size?: MaxMessageBodySizeSDKType;
  next_available_nonce?: NonceSDKType;
  signature_threshold?: SignatureThresholdSDKType;
  token_pair_list: TokenPairSDKType[];
  used_nonces_list: NonceSDKType[];
  token_messenger_list: RemoteTokenMessengerSDKType[];
}
function createBaseGenesisState(): GenesisState {
  return {
    owner: '',
    attesterManager: '',
    pauser: '',
    tokenController: '',
    attesterList: [],
    perMessageBurnLimitList: [],
    burningAndMintingPaused: undefined,
    sendingAndReceivingMessagesPaused: undefined,
    maxMessageBodySize: undefined,
    nextAvailableNonce: undefined,
    signatureThreshold: undefined,
    tokenPairList: [],
    usedNoncesList: [],
    tokenMessengerList: [],
  };
}
export const GenesisState = {
  typeUrl: '/circle.cctp.v1.GenesisState' as const,
  encode(
    message: GenesisState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner !== '') {
      writer.uint32(18).string(message.owner);
    }
    if (message.attesterManager !== '') {
      writer.uint32(26).string(message.attesterManager);
    }
    if (message.pauser !== '') {
      writer.uint32(34).string(message.pauser);
    }
    if (message.tokenController !== '') {
      writer.uint32(42).string(message.tokenController);
    }
    for (const v of message.attesterList) {
      Attester.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    for (const v of message.perMessageBurnLimitList) {
      PerMessageBurnLimit.encode(v!, writer.uint32(58).fork()).ldelim();
    }
    if (message.burningAndMintingPaused !== undefined) {
      BurningAndMintingPaused.encode(
        message.burningAndMintingPaused,
        writer.uint32(66).fork(),
      ).ldelim();
    }
    if (message.sendingAndReceivingMessagesPaused !== undefined) {
      SendingAndReceivingMessagesPaused.encode(
        message.sendingAndReceivingMessagesPaused,
        writer.uint32(74).fork(),
      ).ldelim();
    }
    if (message.maxMessageBodySize !== undefined) {
      MaxMessageBodySize.encode(
        message.maxMessageBodySize,
        writer.uint32(82).fork(),
      ).ldelim();
    }
    if (message.nextAvailableNonce !== undefined) {
      Nonce.encode(
        message.nextAvailableNonce,
        writer.uint32(90).fork(),
      ).ldelim();
    }
    if (message.signatureThreshold !== undefined) {
      SignatureThreshold.encode(
        message.signatureThreshold,
        writer.uint32(98).fork(),
      ).ldelim();
    }
    for (const v of message.tokenPairList) {
      TokenPair.encode(v!, writer.uint32(106).fork()).ldelim();
    }
    for (const v of message.usedNoncesList) {
      Nonce.encode(v!, writer.uint32(114).fork()).ldelim();
    }
    for (const v of message.tokenMessengerList) {
      RemoteTokenMessenger.encode(v!, writer.uint32(122).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): GenesisState {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGenesisState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          message.owner = reader.string();
          break;
        case 3:
          message.attesterManager = reader.string();
          break;
        case 4:
          message.pauser = reader.string();
          break;
        case 5:
          message.tokenController = reader.string();
          break;
        case 6:
          message.attesterList.push(Attester.decode(reader, reader.uint32()));
          break;
        case 7:
          message.perMessageBurnLimitList.push(
            PerMessageBurnLimit.decode(reader, reader.uint32()),
          );
          break;
        case 8:
          message.burningAndMintingPaused = BurningAndMintingPaused.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 9:
          message.sendingAndReceivingMessagesPaused =
            SendingAndReceivingMessagesPaused.decode(reader, reader.uint32());
          break;
        case 10:
          message.maxMessageBodySize = MaxMessageBodySize.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 11:
          message.nextAvailableNonce = Nonce.decode(reader, reader.uint32());
          break;
        case 12:
          message.signatureThreshold = SignatureThreshold.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 13:
          message.tokenPairList.push(TokenPair.decode(reader, reader.uint32()));
          break;
        case 14:
          message.usedNoncesList.push(Nonce.decode(reader, reader.uint32()));
          break;
        case 15:
          message.tokenMessengerList.push(
            RemoteTokenMessenger.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GenesisState {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
      attesterManager: isSet(object.attesterManager)
        ? String(object.attesterManager)
        : '',
      pauser: isSet(object.pauser) ? String(object.pauser) : '',
      tokenController: isSet(object.tokenController)
        ? String(object.tokenController)
        : '',
      attesterList: Array.isArray(object?.attesterList)
        ? object.attesterList.map((e: any) => Attester.fromJSON(e))
        : [],
      perMessageBurnLimitList: Array.isArray(object?.perMessageBurnLimitList)
        ? object.perMessageBurnLimitList.map((e: any) =>
            PerMessageBurnLimit.fromJSON(e),
          )
        : [],
      burningAndMintingPaused: isSet(object.burningAndMintingPaused)
        ? BurningAndMintingPaused.fromJSON(object.burningAndMintingPaused)
        : undefined,
      sendingAndReceivingMessagesPaused: isSet(
        object.sendingAndReceivingMessagesPaused,
      )
        ? SendingAndReceivingMessagesPaused.fromJSON(
            object.sendingAndReceivingMessagesPaused,
          )
        : undefined,
      maxMessageBodySize: isSet(object.maxMessageBodySize)
        ? MaxMessageBodySize.fromJSON(object.maxMessageBodySize)
        : undefined,
      nextAvailableNonce: isSet(object.nextAvailableNonce)
        ? Nonce.fromJSON(object.nextAvailableNonce)
        : undefined,
      signatureThreshold: isSet(object.signatureThreshold)
        ? SignatureThreshold.fromJSON(object.signatureThreshold)
        : undefined,
      tokenPairList: Array.isArray(object?.tokenPairList)
        ? object.tokenPairList.map((e: any) => TokenPair.fromJSON(e))
        : [],
      usedNoncesList: Array.isArray(object?.usedNoncesList)
        ? object.usedNoncesList.map((e: any) => Nonce.fromJSON(e))
        : [],
      tokenMessengerList: Array.isArray(object?.tokenMessengerList)
        ? object.tokenMessengerList.map((e: any) =>
            RemoteTokenMessenger.fromJSON(e),
          )
        : [],
    };
  },
  toJSON(message: GenesisState): JsonSafe<GenesisState> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    message.attesterManager !== undefined &&
      (obj.attesterManager = message.attesterManager);
    message.pauser !== undefined && (obj.pauser = message.pauser);
    message.tokenController !== undefined &&
      (obj.tokenController = message.tokenController);
    if (message.attesterList) {
      obj.attesterList = message.attesterList.map(e =>
        e ? Attester.toJSON(e) : undefined,
      );
    } else {
      obj.attesterList = [];
    }
    if (message.perMessageBurnLimitList) {
      obj.perMessageBurnLimitList = message.perMessageBurnLimitList.map(e =>
        e ? PerMessageBurnLimit.toJSON(e) : undefined,
      );
    } else {
      obj.perMessageBurnLimitList = [];
    }
    message.burningAndMintingPaused !== undefined &&
      (obj.burningAndMintingPaused = message.burningAndMintingPaused
        ? BurningAndMintingPaused.toJSON(message.burningAndMintingPaused)
        : undefined);
    message.sendingAndReceivingMessagesPaused !== undefined &&
      (obj.sendingAndReceivingMessagesPaused =
        message.sendingAndReceivingMessagesPaused
          ? SendingAndReceivingMessagesPaused.toJSON(
              message.sendingAndReceivingMessagesPaused,
            )
          : undefined);
    message.maxMessageBodySize !== undefined &&
      (obj.maxMessageBodySize = message.maxMessageBodySize
        ? MaxMessageBodySize.toJSON(message.maxMessageBodySize)
        : undefined);
    message.nextAvailableNonce !== undefined &&
      (obj.nextAvailableNonce = message.nextAvailableNonce
        ? Nonce.toJSON(message.nextAvailableNonce)
        : undefined);
    message.signatureThreshold !== undefined &&
      (obj.signatureThreshold = message.signatureThreshold
        ? SignatureThreshold.toJSON(message.signatureThreshold)
        : undefined);
    if (message.tokenPairList) {
      obj.tokenPairList = message.tokenPairList.map(e =>
        e ? TokenPair.toJSON(e) : undefined,
      );
    } else {
      obj.tokenPairList = [];
    }
    if (message.usedNoncesList) {
      obj.usedNoncesList = message.usedNoncesList.map(e =>
        e ? Nonce.toJSON(e) : undefined,
      );
    } else {
      obj.usedNoncesList = [];
    }
    if (message.tokenMessengerList) {
      obj.tokenMessengerList = message.tokenMessengerList.map(e =>
        e ? RemoteTokenMessenger.toJSON(e) : undefined,
      );
    } else {
      obj.tokenMessengerList = [];
    }
    return obj;
  },
  fromPartial(object: Partial<GenesisState>): GenesisState {
    const message = createBaseGenesisState();
    message.owner = object.owner ?? '';
    message.attesterManager = object.attesterManager ?? '';
    message.pauser = object.pauser ?? '';
    message.tokenController = object.tokenController ?? '';
    message.attesterList =
      object.attesterList?.map(e => Attester.fromPartial(e)) || [];
    message.perMessageBurnLimitList =
      object.perMessageBurnLimitList?.map(e =>
        PerMessageBurnLimit.fromPartial(e),
      ) || [];
    message.burningAndMintingPaused =
      object.burningAndMintingPaused !== undefined &&
      object.burningAndMintingPaused !== null
        ? BurningAndMintingPaused.fromPartial(object.burningAndMintingPaused)
        : undefined;
    message.sendingAndReceivingMessagesPaused =
      object.sendingAndReceivingMessagesPaused !== undefined &&
      object.sendingAndReceivingMessagesPaused !== null
        ? SendingAndReceivingMessagesPaused.fromPartial(
            object.sendingAndReceivingMessagesPaused,
          )
        : undefined;
    message.maxMessageBodySize =
      object.maxMessageBodySize !== undefined &&
      object.maxMessageBodySize !== null
        ? MaxMessageBodySize.fromPartial(object.maxMessageBodySize)
        : undefined;
    message.nextAvailableNonce =
      object.nextAvailableNonce !== undefined &&
      object.nextAvailableNonce !== null
        ? Nonce.fromPartial(object.nextAvailableNonce)
        : undefined;
    message.signatureThreshold =
      object.signatureThreshold !== undefined &&
      object.signatureThreshold !== null
        ? SignatureThreshold.fromPartial(object.signatureThreshold)
        : undefined;
    message.tokenPairList =
      object.tokenPairList?.map(e => TokenPair.fromPartial(e)) || [];
    message.usedNoncesList =
      object.usedNoncesList?.map(e => Nonce.fromPartial(e)) || [];
    message.tokenMessengerList =
      object.tokenMessengerList?.map(e =>
        RemoteTokenMessenger.fromPartial(e),
      ) || [];
    return message;
  },
  fromProtoMsg(message: GenesisStateProtoMsg): GenesisState {
    return GenesisState.decode(message.value);
  },
  toProto(message: GenesisState): Uint8Array {
    return GenesisState.encode(message).finish();
  },
  toProtoMsg(message: GenesisState): GenesisStateProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.GenesisState',
      value: GenesisState.encode(message).finish(),
    };
  },
};
