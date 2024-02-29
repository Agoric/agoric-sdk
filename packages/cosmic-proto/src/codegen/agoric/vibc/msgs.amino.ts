//@ts-nocheck
import { MsgSendPacket } from './msgs.js';
export const AminoConverter = {
  '/agoric.vibc.MsgSendPacket': {
    aminoType: '/agoric.vibc.MsgSendPacket',
    toAmino: MsgSendPacket.toAmino,
    fromAmino: MsgSendPacket.fromAmino,
  },
};
