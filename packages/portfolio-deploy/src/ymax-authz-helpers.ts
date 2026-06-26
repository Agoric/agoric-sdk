import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import {
  GenericAuthorization,
  Grant,
} from '@agoric/cosmic-proto/codegen/cosmos/authz/v1beta1/authz.js';
import {
  MsgExec,
  MsgGrant,
} from '@agoric/cosmic-proto/codegen/cosmos/authz/v1beta1/tx.js';
import { Any } from '@agoric/cosmic-proto/codegen/google/protobuf/any.js';
import type { EncodeObject } from '@cosmjs/proto-signing';
import { toAccAddress } from '@cosmjs/stargate/build/queryclient/utils.js';
import { WALLET_KEY } from './ymax-admin-helpers.ts';

export const dateToTimestamp = (date: Date) => {
  const ms = date.getTime();
  return {
    seconds: BigInt(Math.floor(ms / 1000)),
    nanos: (ms % 1000) * 1_000_000,
  };
};

export const makeGrantEncodeObject = ({
  granter,
  grantee,
  expiresAt,
}: {
  granter: string;
  grantee: string;
  expiresAt: Date;
}): EncodeObject => ({
  typeUrl: MsgGrant.typeUrl,
  value: MsgGrant.fromPartial({
    granter,
    grantee,
    grant: Grant.fromPartial({
      authorization: Any.fromPartial({
        typeUrl: GenericAuthorization.typeUrl,
        value: GenericAuthorization.encode(
          GenericAuthorization.fromPartial({
            msg: MsgWalletSpendAction.typeUrl,
          }),
        ).finish(),
      }),
      expiration: dateToTimestamp(expiresAt),
    }),
  }),
});

export const makeUpgradeExecEncodeObject = ({
  marshaller,
  controlAddress,
  grantee,
  bundleId,
  invocationId,
  privateArgsOverrides,
}: {
  marshaller: { toCapData: (specimen: unknown) => unknown };
  controlAddress: string;
  grantee: string;
  bundleId: string;
  invocationId: string;
  privateArgsOverrides: Record<string, unknown>;
}): EncodeObject => {
  const action = harden({
    method: 'invokeEntry',
    message: {
      id: invocationId,
      targetName: WALLET_KEY,
      method: 'upgrade',
      args: [{ bundleId, privateArgsOverrides }],
    },
  });
  const spendAction = JSON.stringify(marshaller.toCapData(action));
  const msgSpend = MsgWalletSpendAction.fromPartial({
    owner: toAccAddress(controlAddress),
    spendAction,
  });
  return {
    typeUrl: MsgExec.typeUrl,
    value: MsgExec.fromPartial({
      grantee,
      msgs: [
        Any.fromPartial({
          typeUrl: MsgWalletSpendAction.typeUrl,
          value: MsgWalletSpendAction.encode(msgSpend).finish(),
        }),
      ],
    }),
  };
};
