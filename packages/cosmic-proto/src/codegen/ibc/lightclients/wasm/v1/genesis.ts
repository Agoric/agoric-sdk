//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
import { isSet } from '../../../../helpers.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
/** GenesisState defines 08-wasm's keeper genesis state */
export interface GenesisState {
  /** uploaded light client wasm contracts */
  contracts: Contract[];
}
export interface GenesisStateProtoMsg {
  typeUrl: '/ibc.lightclients.wasm.v1.GenesisState';
  value: Uint8Array;
}
/** GenesisState defines 08-wasm's keeper genesis state */
export interface GenesisStateSDKType {
  contracts: ContractSDKType[];
}
/** Contract stores contract code */
export interface Contract {
  /** contract byte code */
  codeBytes: Uint8Array;
}
export interface ContractProtoMsg {
  typeUrl: '/ibc.lightclients.wasm.v1.Contract';
  value: Uint8Array;
}
/** Contract stores contract code */
export interface ContractSDKType {
  code_bytes: Uint8Array;
}
function createBaseGenesisState(): GenesisState {
  return {
    contracts: [],
  };
}
export const GenesisState = {
  typeUrl: '/ibc.lightclients.wasm.v1.GenesisState' as const,
  encode(
    message: GenesisState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.contracts) {
      Contract.encode(v!, writer.uint32(10).fork()).ldelim();
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
        case 1:
          message.contracts.push(Contract.decode(reader, reader.uint32()));
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
      contracts: Array.isArray(object?.contracts)
        ? object.contracts.map((e: any) => Contract.fromJSON(e))
        : [],
    };
  },
  toJSON(message: GenesisState): JsonSafe<GenesisState> {
    const obj: any = {};
    if (message.contracts) {
      obj.contracts = message.contracts.map(e =>
        e ? Contract.toJSON(e) : undefined,
      );
    } else {
      obj.contracts = [];
    }
    return obj;
  },
  fromPartial(object: Partial<GenesisState>): GenesisState {
    const message = createBaseGenesisState();
    message.contracts =
      object.contracts?.map(e => Contract.fromPartial(e)) || [];
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
      typeUrl: '/ibc.lightclients.wasm.v1.GenesisState',
      value: GenesisState.encode(message).finish(),
    };
  },
};
function createBaseContract(): Contract {
  return {
    codeBytes: new Uint8Array(),
  };
}
export const Contract = {
  typeUrl: '/ibc.lightclients.wasm.v1.Contract' as const,
  encode(
    message: Contract,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.codeBytes.length !== 0) {
      writer.uint32(10).bytes(message.codeBytes);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Contract {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseContract();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.codeBytes = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Contract {
    return {
      codeBytes: isSet(object.codeBytes)
        ? bytesFromBase64(object.codeBytes)
        : new Uint8Array(),
    };
  },
  toJSON(message: Contract): JsonSafe<Contract> {
    const obj: any = {};
    message.codeBytes !== undefined &&
      (obj.codeBytes = base64FromBytes(
        message.codeBytes !== undefined ? message.codeBytes : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<Contract>): Contract {
    const message = createBaseContract();
    message.codeBytes = object.codeBytes ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: ContractProtoMsg): Contract {
    return Contract.decode(message.value);
  },
  toProto(message: Contract): Uint8Array {
    return Contract.encode(message).finish();
  },
  toProtoMsg(message: Contract): ContractProtoMsg {
    return {
      typeUrl: '/ibc.lightclients.wasm.v1.Contract',
      value: Contract.encode(message).finish(),
    };
  },
};
