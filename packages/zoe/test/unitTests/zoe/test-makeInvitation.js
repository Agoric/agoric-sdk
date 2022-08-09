// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath } from '@agoric/ertp';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import {
  makeScalarBigWeakMapStore,
  makeScalarBigMapStore,
} from '@agoric/vat-data';

import { vivifyInvitationKit } from '../../../src/zoeService/makeInvitation.js';

const proposalSchemas = makeScalarBigWeakMapStore('proposal schemas');

test('vivifyInvitationKit', async t => {
  const { setupMakeInvitation, invitationIssuer } = vivifyInvitationKit(
    makeScalarBigMapStore('zoe baggage', { durable: true }),
  );

  const mockInstance = Far('mockInstance', {});
  const mockInstallation = Far('mockInstallation', {});

  const makeInvitation = setupMakeInvitation(
    // @ts-expect-error mockInstance is mocked
    mockInstance,
    mockInstallation,
    proposalSchemas,
  );

  const mockInvitationHandle = Far('mockInvitationHandle', {});
  const description = 'myInvitation';
  const customProperties = harden({
    fruit: 'apple',
  });

  const invitation = makeInvitation(
    // @ts-expect-error mockInvitationHandle is mocked
    mockInvitationHandle,
    description,
    customProperties,
  );

  const amount = await E(invitationIssuer).getAmountOf(invitation);
  const invitationBrand = await E(invitationIssuer).getBrand();

  t.deepEqual(
    amount,
    AmountMath.make(
      invitationBrand,
      harden([
        {
          description: 'myInvitation',
          fruit: 'apple',
          handle: mockInvitationHandle,
          installation: mockInstallation,
          instance: mockInstance,
        },
      ]),
    ),
  );
});

test('description is omitted, wrongly', async t => {
  const { setupMakeInvitation } = vivifyInvitationKit(
    makeScalarBigMapStore('zoe baggage', { durable: true }),
  );

  const mockInstance = Far('mockInstance', {});
  const mockInstallation = Far('mockInstallation', {});

  const makeInvitation = setupMakeInvitation(
    // @ts-expect-error mockInstance is mocked
    mockInstance,
    mockInstallation,
    proposalSchemas,
  );

  const mockInvitationHandle = Far('mockInvitationHandle', {});
  const description = undefined;
  const customProperties = harden({
    fruit: 'apple',
  });

  await t.throwsAsync(
    async () =>
      makeInvitation(
        // @ts-expect-error mockInvitationHandle is mocked
        mockInvitationHandle,
        description,
        customProperties,
      ),
    { message: `The description "[undefined]" must be a string` },
  );
});

test('customProperties ok to omit', async t => {
  const { setupMakeInvitation, invitationIssuer } = vivifyInvitationKit(
    makeScalarBigMapStore('zoe baggage', { durable: true }),
  );

  const mockInstance = Far('mockInstance', {});
  const mockInstallation = Far('mockInstallation', {});

  const makeInvitation = setupMakeInvitation(
    // @ts-expect-error mockInstance is mocked
    mockInstance,
    mockInstallation,
    proposalSchemas,
  );

  const mockInvitationHandle = Far('mockInvitationHandle', {});
  const description = 'myInvitation';

  const invitation = makeInvitation(
    // @ts-expect-error mockInvitationHandle is mocked
    mockInvitationHandle,
    description,
  );

  const amount = await E(invitationIssuer).getAmountOf(invitation);
  const invitationBrand = await E(invitationIssuer).getBrand();

  t.deepEqual(
    amount,
    AmountMath.make(
      invitationBrand,
      harden([
        {
          description: 'myInvitation',
          handle: mockInvitationHandle,
          installation: mockInstallation,
          instance: mockInstance,
        },
      ]),
    ),
  );
});
