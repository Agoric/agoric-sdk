//@ts-nocheck
import {
  MsgInstallBundle,
  MsgDeliverInbound,
  MsgWalletAction,
  MsgWalletSpendAction,
  MsgProvision,
} from './msgs.js';
export const AminoConverter = {
  '/agoric.swingset.MsgInstallBundle': {
    aminoType: '/agoric.swingset.MsgInstallBundle',
    toAmino: MsgInstallBundle.toAmino,
    fromAmino: MsgInstallBundle.fromAmino,
  },
  '/agoric.swingset.MsgDeliverInbound': {
    aminoType: '/agoric.swingset.MsgDeliverInbound',
    toAmino: MsgDeliverInbound.toAmino,
    fromAmino: MsgDeliverInbound.fromAmino,
  },
  '/agoric.swingset.MsgWalletAction': {
    aminoType: '/agoric.swingset.MsgWalletAction',
    toAmino: MsgWalletAction.toAmino,
    fromAmino: MsgWalletAction.fromAmino,
  },
  '/agoric.swingset.MsgWalletSpendAction': {
    aminoType: '/agoric.swingset.MsgWalletSpendAction',
    toAmino: MsgWalletSpendAction.toAmino,
    fromAmino: MsgWalletSpendAction.fromAmino,
  },
  '/agoric.swingset.MsgProvision': {
    aminoType: '/agoric.swingset.MsgProvision',
    toAmino: MsgProvision.toAmino,
    fromAmino: MsgProvision.fromAmino,
  },
};
