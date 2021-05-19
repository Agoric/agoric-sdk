// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { makeIssuerKit, AssetKind, AmountMath } from '@agoric/ertp';

import { burnInvitation } from '../../../src/zoeService/offer/burnInvitation';

test('burnInvitation', async t => {
  const mockInvitationKit = makeIssuerKit('mockInvitation', AssetKind.SET);

  const instanceHandle = {};
  const invitationHandle = {};

  const invitation = mockInvitationKit.mint.mintPayment(
    AmountMath.make(mockInvitationKit.brand, [
      { instance: instanceHandle, handle: invitationHandle },
    ]),
  );

  t.deepEqual(await burnInvitation(mockInvitationKit.issuer, invitation), {
    instanceHandle,
    invitationHandle,
  });
});

test('burnInvitation - not an invitation', async t => {
  const mockInvitationKit = makeIssuerKit('mockInvitation', AssetKind.SET);

  await t.throwsAsync(
    // @ts-ignore invalid payment for the purposes of testing
    () => burnInvitation(mockInvitationKit.issuer, undefined),
    { message: 'A Zoe invitation is required, not "[undefined]"' },
  );
});

test('burnInvitation - invitation already used', async t => {
  const mockInvitationKit = makeIssuerKit('mockInvitation', AssetKind.SET);

  const instanceHandle = {};
  const invitationHandle = {};

  const invitation = mockInvitationKit.mint.mintPayment(
    AmountMath.make(mockInvitationKit.brand, [
      { instance: instanceHandle, handle: invitationHandle },
    ]),
  );

  t.deepEqual(await burnInvitation(mockInvitationKit.issuer, invitation), {
    instanceHandle,
    invitationHandle,
  });

  await t.throwsAsync(
    () => burnInvitation(mockInvitationKit.issuer, invitation),
    {
      message:
        'A Zoe invitation is required, not "[Alleged: mockInvitation payment]"',
    },
  );
});
