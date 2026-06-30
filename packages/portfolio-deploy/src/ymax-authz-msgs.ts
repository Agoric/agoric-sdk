import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.js';
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
import type { ContractControl } from '@agoric/deploy-script-support/src/control/contract-control.contract.js';
import type { EncodeObject } from '@cosmjs/proto-signing';
import { toAccAddress } from '@cosmjs/stargate/build/queryclient/utils.js';
import { WALLET_KEY } from './ymax-admin-helpers.ts';

type WalletAction<
  Method extends string = string,
  Args extends readonly unknown[] = readonly unknown[],
> = {
  method: 'invokeEntry';
  message: { id: string; targetName: string; method: Method; args: Args };
};

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

export const makeWalletActionBuilder = <T extends object>(
  targetName: string,
  id: string,
): {
  readonly [M in keyof T]: T[M] extends (...args: infer P) => unknown
    ? (...args: P) => WalletAction<M & string, P>
    : never;
} =>
  new Proxy(harden({}), {
    get(_target, prop) {
      if (typeof prop !== 'string') {
        return undefined;
      }
      return (...args: readonly unknown[]) =>
        harden({
          method: 'invokeEntry',
          message: { id, targetName, method: prop, args },
        });
    },
  }) as {
    readonly [M in keyof T]: T[M] extends (...args: infer P) => unknown
      ? (...args: P) => WalletAction<M & string, P>
      : never;
  };

export const makeUpgradeSpendAction = (
  upgradeArgs: {
    bundleId: string;
    privateArgsOverrides: Record<string, unknown>;
  },
  {
    marshaller,
    controlAddress,
    invocationId,
  }: {
    marshaller: { toCapData: (specimen: unknown) => unknown };
    controlAddress: string;
    invocationId: string;
  },
) => {
  const builder = makeWalletActionBuilder<ContractControl<typeof YMaxStart>>(
    WALLET_KEY,
    invocationId,
  );
  const action = builder.upgrade(upgradeArgs);
  const spendAction = JSON.stringify(marshaller.toCapData(action));
  return MsgWalletSpendAction.fromPartial({
    owner: toAccAddress(controlAddress),
    spendAction,
  });
};

export const makeUpgradeEncodeObject = (
  upgradeArgs: {
    bundleId: string;
    privateArgsOverrides: Record<string, unknown>;
  },
  opts: {
    marshaller: { toCapData: (specimen: unknown) => unknown };
    controlAddress: string;
    invocationId: string;
  },
): EncodeObject => ({
  typeUrl: MsgWalletSpendAction.typeUrl,
  value: makeUpgradeSpendAction(upgradeArgs, opts),
});

export const makeUpgradeExecEncodeObject = (
  upgradeArgs: {
    bundleId: string;
    privateArgsOverrides: Record<string, unknown>;
  },
  opts: {
    marshaller: { toCapData: (specimen: unknown) => unknown };
    controlAddress: string;
    grantee: string;
    invocationId: string;
  },
): EncodeObject => {
  const { grantee, ...rest } = opts;
  const msgSpend = makeUpgradeSpendAction(upgradeArgs, rest);
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
