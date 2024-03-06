//@ts-nocheck
import { GeneratedType, Registry } from '@cosmjs/proto-signing';
import {
  MsgInstallBundle,
  MsgDeliverInbound,
  MsgWalletAction,
  MsgWalletSpendAction,
  MsgProvision,
} from './msgs.js';
export const registry: ReadonlyArray<[string, GeneratedType]> = [
  ['/agoric.swingset.MsgInstallBundle', MsgInstallBundle],
  ['/agoric.swingset.MsgDeliverInbound', MsgDeliverInbound],
  ['/agoric.swingset.MsgWalletAction', MsgWalletAction],
  ['/agoric.swingset.MsgWalletSpendAction', MsgWalletSpendAction],
  ['/agoric.swingset.MsgProvision', MsgProvision],
];
export const load = (protoRegistry: Registry) => {
  registry.forEach(([typeUrl, mod]) => {
    protoRegistry.register(typeUrl, mod);
  });
};
export const MessageComposer = {
  encoded: {
    installBundle(value: MsgInstallBundle) {
      return {
        typeUrl: '/agoric.swingset.MsgInstallBundle',
        value: MsgInstallBundle.encode(value).finish(),
      };
    },
    deliverInbound(value: MsgDeliverInbound) {
      return {
        typeUrl: '/agoric.swingset.MsgDeliverInbound',
        value: MsgDeliverInbound.encode(value).finish(),
      };
    },
    walletAction(value: MsgWalletAction) {
      return {
        typeUrl: '/agoric.swingset.MsgWalletAction',
        value: MsgWalletAction.encode(value).finish(),
      };
    },
    walletSpendAction(value: MsgWalletSpendAction) {
      return {
        typeUrl: '/agoric.swingset.MsgWalletSpendAction',
        value: MsgWalletSpendAction.encode(value).finish(),
      };
    },
    provision(value: MsgProvision) {
      return {
        typeUrl: '/agoric.swingset.MsgProvision',
        value: MsgProvision.encode(value).finish(),
      };
    },
  },
  withTypeUrl: {
    installBundle(value: MsgInstallBundle) {
      return {
        typeUrl: '/agoric.swingset.MsgInstallBundle',
        value,
      };
    },
    deliverInbound(value: MsgDeliverInbound) {
      return {
        typeUrl: '/agoric.swingset.MsgDeliverInbound',
        value,
      };
    },
    walletAction(value: MsgWalletAction) {
      return {
        typeUrl: '/agoric.swingset.MsgWalletAction',
        value,
      };
    },
    walletSpendAction(value: MsgWalletSpendAction) {
      return {
        typeUrl: '/agoric.swingset.MsgWalletSpendAction',
        value,
      };
    },
    provision(value: MsgProvision) {
      return {
        typeUrl: '/agoric.swingset.MsgProvision',
        value,
      };
    },
  },
  toJSON: {
    installBundle(value: MsgInstallBundle) {
      return {
        typeUrl: '/agoric.swingset.MsgInstallBundle',
        value: MsgInstallBundle.toJSON(value),
      };
    },
    deliverInbound(value: MsgDeliverInbound) {
      return {
        typeUrl: '/agoric.swingset.MsgDeliverInbound',
        value: MsgDeliverInbound.toJSON(value),
      };
    },
    walletAction(value: MsgWalletAction) {
      return {
        typeUrl: '/agoric.swingset.MsgWalletAction',
        value: MsgWalletAction.toJSON(value),
      };
    },
    walletSpendAction(value: MsgWalletSpendAction) {
      return {
        typeUrl: '/agoric.swingset.MsgWalletSpendAction',
        value: MsgWalletSpendAction.toJSON(value),
      };
    },
    provision(value: MsgProvision) {
      return {
        typeUrl: '/agoric.swingset.MsgProvision',
        value: MsgProvision.toJSON(value),
      };
    },
  },
  fromJSON: {
    installBundle(value: any) {
      return {
        typeUrl: '/agoric.swingset.MsgInstallBundle',
        value: MsgInstallBundle.fromJSON(value),
      };
    },
    deliverInbound(value: any) {
      return {
        typeUrl: '/agoric.swingset.MsgDeliverInbound',
        value: MsgDeliverInbound.fromJSON(value),
      };
    },
    walletAction(value: any) {
      return {
        typeUrl: '/agoric.swingset.MsgWalletAction',
        value: MsgWalletAction.fromJSON(value),
      };
    },
    walletSpendAction(value: any) {
      return {
        typeUrl: '/agoric.swingset.MsgWalletSpendAction',
        value: MsgWalletSpendAction.fromJSON(value),
      };
    },
    provision(value: any) {
      return {
        typeUrl: '/agoric.swingset.MsgProvision',
        value: MsgProvision.fromJSON(value),
      };
    },
  },
  fromPartial: {
    installBundle(value: MsgInstallBundle) {
      return {
        typeUrl: '/agoric.swingset.MsgInstallBundle',
        value: MsgInstallBundle.fromPartial(value),
      };
    },
    deliverInbound(value: MsgDeliverInbound) {
      return {
        typeUrl: '/agoric.swingset.MsgDeliverInbound',
        value: MsgDeliverInbound.fromPartial(value),
      };
    },
    walletAction(value: MsgWalletAction) {
      return {
        typeUrl: '/agoric.swingset.MsgWalletAction',
        value: MsgWalletAction.fromPartial(value),
      };
    },
    walletSpendAction(value: MsgWalletSpendAction) {
      return {
        typeUrl: '/agoric.swingset.MsgWalletSpendAction',
        value: MsgWalletSpendAction.fromPartial(value),
      };
    },
    provision(value: MsgProvision) {
      return {
        typeUrl: '/agoric.swingset.MsgProvision',
        value: MsgProvision.fromPartial(value),
      };
    },
  },
};
