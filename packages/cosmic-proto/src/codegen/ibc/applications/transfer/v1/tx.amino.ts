//@ts-nocheck
import { MsgTransfer } from './tx.js';
export const AminoConverter = {
  '/ibc.applications.transfer.v1.MsgTransfer': {
    aminoType: 'cosmos-sdk/MsgTransfer',
    toAmino: MsgTransfer.toAmino,
    fromAmino: MsgTransfer.fromAmino,
  },
};
