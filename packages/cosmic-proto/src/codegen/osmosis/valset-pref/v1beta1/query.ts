//@ts-nocheck
import { ValidatorPreference, ValidatorPreferenceSDKType } from './state.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
/** Request type for UserValidatorPreferences. */
export interface UserValidatorPreferencesRequest {
  /** user account address */
  address: string;
}
export interface UserValidatorPreferencesRequestProtoMsg {
  typeUrl: '/osmosis.valsetpref.v1beta1.UserValidatorPreferencesRequest';
  value: Uint8Array;
}
/** Request type for UserValidatorPreferences. */
export interface UserValidatorPreferencesRequestSDKType {
  address: string;
}
/** Response type the QueryUserValidatorPreferences query request */
export interface UserValidatorPreferencesResponse {
  preferences: ValidatorPreference[];
}
export interface UserValidatorPreferencesResponseProtoMsg {
  typeUrl: '/osmosis.valsetpref.v1beta1.UserValidatorPreferencesResponse';
  value: Uint8Array;
}
/** Response type the QueryUserValidatorPreferences query request */
export interface UserValidatorPreferencesResponseSDKType {
  preferences: ValidatorPreferenceSDKType[];
}
function createBaseUserValidatorPreferencesRequest(): UserValidatorPreferencesRequest {
  return {
    address: '',
  };
}
export const UserValidatorPreferencesRequest = {
  typeUrl: '/osmosis.valsetpref.v1beta1.UserValidatorPreferencesRequest',
  encode(
    message: UserValidatorPreferencesRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.address !== '') {
      writer.uint32(10).string(message.address);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): UserValidatorPreferencesRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserValidatorPreferencesRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): UserValidatorPreferencesRequest {
    return {
      address: isSet(object.address) ? String(object.address) : '',
    };
  },
  toJSON(
    message: UserValidatorPreferencesRequest,
  ): JsonSafe<UserValidatorPreferencesRequest> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    return obj;
  },
  fromPartial(
    object: Partial<UserValidatorPreferencesRequest>,
  ): UserValidatorPreferencesRequest {
    const message = createBaseUserValidatorPreferencesRequest();
    message.address = object.address ?? '';
    return message;
  },
  fromProtoMsg(
    message: UserValidatorPreferencesRequestProtoMsg,
  ): UserValidatorPreferencesRequest {
    return UserValidatorPreferencesRequest.decode(message.value);
  },
  toProto(message: UserValidatorPreferencesRequest): Uint8Array {
    return UserValidatorPreferencesRequest.encode(message).finish();
  },
  toProtoMsg(
    message: UserValidatorPreferencesRequest,
  ): UserValidatorPreferencesRequestProtoMsg {
    return {
      typeUrl: '/osmosis.valsetpref.v1beta1.UserValidatorPreferencesRequest',
      value: UserValidatorPreferencesRequest.encode(message).finish(),
    };
  },
};
function createBaseUserValidatorPreferencesResponse(): UserValidatorPreferencesResponse {
  return {
    preferences: [],
  };
}
export const UserValidatorPreferencesResponse = {
  typeUrl: '/osmosis.valsetpref.v1beta1.UserValidatorPreferencesResponse',
  encode(
    message: UserValidatorPreferencesResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.preferences) {
      ValidatorPreference.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): UserValidatorPreferencesResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserValidatorPreferencesResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.preferences.push(
            ValidatorPreference.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): UserValidatorPreferencesResponse {
    return {
      preferences: Array.isArray(object?.preferences)
        ? object.preferences.map((e: any) => ValidatorPreference.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: UserValidatorPreferencesResponse,
  ): JsonSafe<UserValidatorPreferencesResponse> {
    const obj: any = {};
    if (message.preferences) {
      obj.preferences = message.preferences.map(e =>
        e ? ValidatorPreference.toJSON(e) : undefined,
      );
    } else {
      obj.preferences = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<UserValidatorPreferencesResponse>,
  ): UserValidatorPreferencesResponse {
    const message = createBaseUserValidatorPreferencesResponse();
    message.preferences =
      object.preferences?.map(e => ValidatorPreference.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: UserValidatorPreferencesResponseProtoMsg,
  ): UserValidatorPreferencesResponse {
    return UserValidatorPreferencesResponse.decode(message.value);
  },
  toProto(message: UserValidatorPreferencesResponse): Uint8Array {
    return UserValidatorPreferencesResponse.encode(message).finish();
  },
  toProtoMsg(
    message: UserValidatorPreferencesResponse,
  ): UserValidatorPreferencesResponseProtoMsg {
    return {
      typeUrl: '/osmosis.valsetpref.v1beta1.UserValidatorPreferencesResponse',
      value: UserValidatorPreferencesResponse.encode(message).finish(),
    };
  },
};
