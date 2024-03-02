//@ts-nocheck
import { GeneratedType, Registry } from '@cosmjs/proto-signing';
import { MsgRegisterInterchainAccount, MsgSendTx } from './tx.js';
export const registry: ReadonlyArray<[string, GeneratedType]> = [
  [
    '/ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccount',
    MsgRegisterInterchainAccount,
  ],
  ['/ibc.applications.interchain_accounts.controller.v1.MsgSendTx', MsgSendTx],
];
export const load = (protoRegistry: Registry) => {
  registry.forEach(([typeUrl, mod]) => {
    protoRegistry.register(typeUrl, mod);
  });
};
export const MessageComposer = {
  encoded: {
    registerInterchainAccount(value: MsgRegisterInterchainAccount) {
      return {
        typeUrl:
          '/ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccount',
        value: MsgRegisterInterchainAccount.encode(value).finish(),
      };
    },
    sendTx(value: MsgSendTx) {
      return {
        typeUrl:
          '/ibc.applications.interchain_accounts.controller.v1.MsgSendTx',
        value: MsgSendTx.encode(value).finish(),
      };
    },
  },
  withTypeUrl: {
    registerInterchainAccount(value: MsgRegisterInterchainAccount) {
      return {
        typeUrl:
          '/ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccount',
        value,
      };
    },
    sendTx(value: MsgSendTx) {
      return {
        typeUrl:
          '/ibc.applications.interchain_accounts.controller.v1.MsgSendTx',
        value,
      };
    },
  },
  toJSON: {
    registerInterchainAccount(value: MsgRegisterInterchainAccount) {
      return {
        typeUrl:
          '/ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccount',
        value: MsgRegisterInterchainAccount.toJSON(value),
      };
    },
    sendTx(value: MsgSendTx) {
      return {
        typeUrl:
          '/ibc.applications.interchain_accounts.controller.v1.MsgSendTx',
        value: MsgSendTx.toJSON(value),
      };
    },
  },
  fromJSON: {
    registerInterchainAccount(value: any) {
      return {
        typeUrl:
          '/ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccount',
        value: MsgRegisterInterchainAccount.fromJSON(value),
      };
    },
    sendTx(value: any) {
      return {
        typeUrl:
          '/ibc.applications.interchain_accounts.controller.v1.MsgSendTx',
        value: MsgSendTx.fromJSON(value),
      };
    },
  },
  fromPartial: {
    registerInterchainAccount(value: MsgRegisterInterchainAccount) {
      return {
        typeUrl:
          '/ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccount',
        value: MsgRegisterInterchainAccount.fromPartial(value),
      };
    },
    sendTx(value: MsgSendTx) {
      return {
        typeUrl:
          '/ibc.applications.interchain_accounts.controller.v1.MsgSendTx',
        value: MsgSendTx.fromPartial(value),
      };
    },
  },
};
