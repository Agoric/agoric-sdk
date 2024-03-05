import { cosmos, ibc } from '@agoric/cosmic-proto';
import {
  MsgGrant,
  MsgRevoke,
  MsgExec,
} from '@agoric/cosmic-proto/dist/codegen/cosmos/authz/v1beta1/tx.js';
import { QueryAllBalancesRequest } from '@agoric/cosmic-proto/dist/codegen/cosmos/bank/v1beta1/query.js';
import {
  MsgSend,
  MsgMultiSend,
} from '@agoric/cosmic-proto/dist/codegen/cosmos/bank/v1beta1/tx.js';
import {
  MsgBeginRedelegate,
  MsgDelegate,
  MsgUndelegate,
} from '@agoric/cosmic-proto/dist/codegen/cosmos/staking/v1beta1/tx.js';
import { MsgTransfer } from '@agoric/cosmic-proto/dist/codegen/ibc/applications/transfer/v1/tx.js';

export const makeEncoders = () => {
  return {
    query: {
      bank: {
        allBalances(args: QueryAllBalancesRequest) {
          return {
            typeUrl: cosmos.bank.v1beta1.QueryAllBalancesRequest.typeUrl,
            value:
              cosmos.bank.v1beta1.QueryAllBalancesRequest.encode(args).finish(),
          };
        },
      },
    },
    tx: {
      authz: {
        msgExec(args: MsgExec) {
          return {
            typeUrl: cosmos.authz.v1beta1.MsgExec.typeUrl,
            value: cosmos.authz.v1beta1.MsgExec.encode(args).finish(),
          };
        },
        msgGrant(args: MsgGrant) {
          return {
            typeUrl: cosmos.authz.v1beta1.MsgGrant.typeUrl,
            value: cosmos.authz.v1beta1.MsgGrant.encode(args).finish(),
          };
        },
        msgRevoke(args: MsgRevoke) {
          return {
            typeUrl: cosmos.authz.v1beta1.MsgRevoke.typeUrl,
            value: cosmos.authz.v1beta1.MsgRevoke.encode(args).finish(),
          };
        },
      },
      bank: {
        msgSend(args: MsgSend) {
          return {
            typeUrl: cosmos.bank.v1beta1.MsgSend.typeUrl,
            value: cosmos.bank.v1beta1.MsgSend.encode(args).finish(),
          };
        },
        msgMultiSend(args: MsgMultiSend) {
          return {
            typeUrl: cosmos.bank.v1beta1.MsgMultiSend.typeUrl,
            value: cosmos.bank.v1beta1.MsgMultiSend.encode(args).finish(),
          };
        },
      },
      ibc: {
        msgTransfer(args: MsgTransfer) {
          return {
            typeUrl: ibc.applications.transfer.v1.MsgTransfer.typeUrl,
            value:
              ibc.applications.transfer.v1.MsgTransfer.encode(args).finish(),
          };
        },
      },
      staking: {
        msgBeginRedelegate(args: MsgBeginRedelegate) {
          return {
            typeUrl: cosmos.staking.v1beta1.MsgBeginRedelegate.typeUrl,
            value:
              cosmos.staking.v1beta1.MsgBeginRedelegate.encode(args).finish(),
          };
        },
        msgDelegate(args: MsgDelegate) {
          return {
            typeUrl: cosmos.staking.v1beta1.MsgDelegate.typeUrl,
            value: cosmos.staking.v1beta1.MsgDelegate.encode(args).finish(),
          };
        },
        msgUndelegate(args: MsgUndelegate) {
          return {
            typeUrl: cosmos.staking.v1beta1.MsgUndelegate.typeUrl,
            value: cosmos.staking.v1beta1.MsgUndelegate.encode(args).finish(),
          };
        },
      },
    },
  };
};

export const makeDecoders = () => {
  return {
    query: {
      bank: {
        allBalancesResponse(msg: Uint8Array) {
          cosmos.bank.v1beta1.QueryAllBalancesResponse.decode(msg);
        },
      },
    },
    tx: {
      authz: {
        msgExecResponse(msg: Uint8Array) {
          return cosmos.authz.v1beta1.MsgExecResponse.decode(msg);
        },
        msgGrant(msg: Uint8Array) {
          return cosmos.authz.v1beta1.MsgGrantResponse.decode(msg);
        },
        msgRevoke(msg: Uint8Array) {
          return cosmos.authz.v1beta1.MsgRevokeResponse.decode(msg);
        },
      },
      bank: {
        msgSend(msg: Uint8Array) {
          return cosmos.bank.v1beta1.MsgSendResponse.decode(msg);
        },
        msgMultiSend(msg: Uint8Array) {
          return cosmos.bank.v1beta1.MsgMultiSendResponse.decode(msg);
        },
      },
      ibc: {
        msgTransfer(msg: Uint8Array) {
          return ibc.applications.transfer.v1.MsgTransferResponse.decode(msg);
        },
      },
      staking: {
        msgBeginRedelegate(msg: Uint8Array) {
          return cosmos.staking.v1beta1.MsgBeginRedelegateResponse.decode(msg);
        },
        msgDelegate(msg: Uint8Array) {
          return cosmos.staking.v1beta1.MsgDelegateResponse.decode(msg);
        },
        msgMultiSend(msg: Uint8Array) {
          return cosmos.staking.v1beta1.MsgUndelegateResponse.decode(msg);
        },
      },
    },
  };
};
