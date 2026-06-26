import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import { GenericAuthorization } from '@agoric/cosmic-proto/codegen/cosmos/authz/v1beta1/authz.js';
import {
  MsgExec,
  MsgGrant,
} from '@agoric/cosmic-proto/codegen/cosmos/authz/v1beta1/tx.js';
import { Any } from '@agoric/cosmic-proto/codegen/google/protobuf/any.js';
import { toAccAddress } from '@cosmjs/stargate/build/queryclient/utils.js';
import {
  makeGrantEncodeObject,
  makeUpgradeExecEncodeObject,
} from '../src/ymax-authz-helpers.ts';
import { WALLET_KEY } from '../src/ymax-admin-helpers.ts';

test('makeGrantEncodeObject grants MsgWalletSpendAction for 4 hours', t => {
  const granter = 'agoric10utru593dspjwfewcgdak8lvp9tkz0xttvcnxv';
  const grantee = 'agoric18dx5f8ck5xy2dgkgeyp2w478dztxv3z2mnz928';
  const expiresAt = new Date('2026-07-01T16:00:00.000Z');
  const actual = makeGrantEncodeObject({
    granter,
    grantee,
    expiresAt,
  });

  t.is(actual.typeUrl, MsgGrant.typeUrl);
  const decoded = MsgGrant.decode(
    MsgGrant.encode(actual.value as any).finish(),
  );
  t.is(decoded.granter, granter);
  t.is(decoded.grantee, grantee);
  const authorization = Any.decode(
    Any.encode(decoded.grant?.authorization as any).finish(),
  );
  t.is(authorization.typeUrl, GenericAuthorization.typeUrl);
  t.deepEqual(GenericAuthorization.decode(authorization.value), {
    $typeUrl: GenericAuthorization.typeUrl,
    msg: MsgWalletSpendAction.typeUrl,
  });
  t.deepEqual(decoded.grant?.expiration, {
    seconds: BigInt(1782921600),
    nanos: 0,
  });
});

test('makeUpgradeExecEncodeObject wraps upgrade in authz exec', t => {
  const controlAddress = 'agoric10utru593dspjwfewcgdak8lvp9tkz0xttvcnxv';
  const grantee = 'agoric18dx5f8ck5xy2dgkgeyp2w478dztxv3z2mnz928';
  const marshaller = {
    toCapData: (specimen: unknown) => specimen,
  };
  const postalServiceInstance = harden({ kind: 'postalService' });
  const actual = makeUpgradeExecEncodeObject({
    marshaller,
    controlAddress,
    grantee,
    bundleId: 'b1-abc123',
    invocationId: 'devnet-ymax0-2026-07-01T12:00:00.000Z',
    privateArgsOverrides: {
      oracle: 'value',
      postalServiceInstance,
    },
  });

  t.is(actual.typeUrl, MsgExec.typeUrl);
  const decodedExec = MsgExec.decode(
    MsgExec.encode(actual.value as any).finish(),
  );
  t.is(decodedExec.grantee, grantee);
  t.is(decodedExec.msgs.length, 1);
  t.is(decodedExec.msgs[0].typeUrl, MsgWalletSpendAction.typeUrl);

  const decodedSpend = MsgWalletSpendAction.decode(decodedExec.msgs[0].value);
  t.deepEqual(decodedSpend.owner, toAccAddress(controlAddress));
  t.deepEqual(JSON.parse(decodedSpend.spendAction), {
    method: 'invokeEntry',
    message: {
      id: 'devnet-ymax0-2026-07-01T12:00:00.000Z',
      targetName: WALLET_KEY,
      method: 'upgrade',
      args: [
        {
          bundleId: 'b1-abc123',
          privateArgsOverrides: {
            oracle: 'value',
            postalServiceInstance,
          },
        },
      ],
    },
  });
});
