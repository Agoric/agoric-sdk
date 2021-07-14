// @ts-check

/* global __dirname */

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import { makeIssuerKit, AssetKind } from '@agoric/ertp';

import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';

import { makeZoe } from '../../../../src/zoeService/zoe';
import fakeVatAdmin from '../../../../tools/fakeVatAdmin';
import { makeAttestationAmount } from '../../../../src/contracts/attestation/expiringNFT';
import { makeHandle } from '../../../../src/makeHandle';

const exampleVotingUsageRoot = `${__dirname}/../../../../src/contracts/attestation/exampleVotingUsage`;

test('exampleVotingUsage', async t => {
  const bundle = await bundleSource(exampleVotingUsageRoot);

  const zoe = makeZoe(fakeVatAdmin);
  const installation = await E(zoe).install(bundle);

  const issuerKit = makeIssuerKit('BLD-ATT-GOV', AssetKind.SET);

  const { creatorFacet, publicFacet } = await E(zoe).startInstance(
    installation,
    {
      Attestation: issuerKit.issuer,
    },
  );

  const doVote = (attAmount, answer) => {
    const voteInvitation = E(publicFacet).makeVoteInvitation();

    const proposal = harden({
      give: { Attestation: attAmount },
    });

    const payments = harden({
      Attestation: issuerKit.mint.mintPayment(attAmount),
    });
    const seat = E(zoe).offer(voteInvitation, proposal, payments);
    const offerResult = E(seat).getOfferResult();
    return E(offerResult).castVote(answer);
  };

  // A normal vote which is weighted at 40 tokens and expires at 5n
  const firstHandle = makeHandle('attestation');
  await doVote(
    makeAttestationAmount(issuerKit.brand, 'myaddress', firstHandle, 40n, 5n),
    'Yes',
  );

  // Another vote, but which expires at 1n
  const secondHandle = makeHandle('attestation');
  await doVote(
    makeAttestationAmount(issuerKit.brand, 'myaddress', secondHandle, 3n, 1n),
    'No',
  );

  // Let's decide to trade that attestation in for one with a longer
  // expiration. Note that the handle and the value are the same.
  await doVote(
    makeAttestationAmount(issuerKit.brand, 'myaddress', secondHandle, 3n, 4n),
    'Maybe',
  );

  // Let's decide to trade that attestation in for one with a longer
  // expiration, AGAIN. Note that the handle is the same, but the
  // value is reduced.
  await doVote(
    makeAttestationAmount(issuerKit.brand, 'myaddress', secondHandle, 2n, 5n),
    'Maybe 2',
  );

  // This vote should not be counted as it is expired.
  const thirdHandle = makeHandle('attestation');
  await doVote(
    makeAttestationAmount(issuerKit.brand, 'myaddress', thirdHandle, 5n, 1n),
    'Should not count',
  );

  const result = await E(creatorFacet).closeVote(3n);

  t.deepEqual(result, [
    ['Yes', 40n],
    ['Maybe 2', 2n],
  ]);
});
