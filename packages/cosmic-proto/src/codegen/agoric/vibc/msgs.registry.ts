//@ts-nocheck
import { GeneratedType, Registry } from '@cosmjs/proto-signing';
import { MsgSendPacket } from './msgs.js';
export const registry: ReadonlyArray<[string, GeneratedType]> = [
  ['/agoric.vibc.MsgSendPacket', MsgSendPacket],
];
export const load = (protoRegistry: Registry) => {
  registry.forEach(([typeUrl, mod]) => {
    protoRegistry.register(typeUrl, mod);
  });
};
export const MessageComposer = {
  encoded: {
    sendPacket(value: MsgSendPacket) {
      return {
        typeUrl: '/agoric.vibc.MsgSendPacket',
        value: MsgSendPacket.encode(value).finish(),
      };
    },
  },
  withTypeUrl: {
    sendPacket(value: MsgSendPacket) {
      return {
        typeUrl: '/agoric.vibc.MsgSendPacket',
        value,
      };
    },
  },
  toJSON: {
    sendPacket(value: MsgSendPacket) {
      return {
        typeUrl: '/agoric.vibc.MsgSendPacket',
        value: MsgSendPacket.toJSON(value),
      };
    },
  },
  fromJSON: {
    sendPacket(value: any) {
      return {
        typeUrl: '/agoric.vibc.MsgSendPacket',
        value: MsgSendPacket.fromJSON(value),
      };
    },
  },
  fromPartial: {
    sendPacket(value: MsgSendPacket) {
      return {
        typeUrl: '/agoric.vibc.MsgSendPacket',
        value: MsgSendPacket.fromPartial(value),
      };
    },
  },
};
