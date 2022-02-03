// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import { makeIssuerKit, AssetKind, AmountMath } from '@agoric/ertp';

import bundleSource from '@endo/bundle-source';
import { E } from '@agoric/eventual-send';

import { makeZoeKit } from '../../../../src/zoeService/zoe.js';
import fakeVatAdmin from '../../../../tools/fakeVatAdmin.js';
import { makeAttestationElem } from '../../../../src/contracts/attestation/expiring/expiringHelpers.js';
import { makeHandle } from '../../../../src/makeHandle.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const exampleVotingUsageRoot = `${dirname}/exampleVotingUsage.js`;

test('exampleVotingUsage', async t => {
  const bundle = await bundleSource(exampleVotingUsageRoot);

  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);
  const installation = await E(zoe).install(bundle);

  const bldIssuerKit = makeIssuerKit(
    'BLD',
    AssetKind.NAT,
    harden({
      decimalPlaces: 6,
    }),
  );

  const issuerKit = makeIssuerKit('BldAttGov', AssetKind.SET);

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
  const firstHandle = makeHandle('Attestation');
  const bld40 = AmountMath.make(bldIssuerKit.brand, 40n);
  const elem1 = makeAttestationElem('myaddress', bld40, 5n, firstHandle);
  await doVote(AmountMath.make(issuerKit.brand, harden([elem1])), 'Yes');

  // Another vote, but which expires at 1n
  const secondHandle = makeHandle('Attestation');
  const bld3 = AmountMath.make(bldIssuerKit.brand, 3n);
  const elem2 = makeAttestationElem('myaddress', bld3, 1n, secondHandle);
  await doVote(AmountMath.make(issuerKit.brand, harden([elem2])), 'No');

  // Let's decide to trade that attestation in for one with a longer
  // expiration. Note that the handle and the value are the same.
  const elem3 = makeAttestationElem('myaddress', bld3, 4n, secondHandle);
  await doVote(AmountMath.make(issuerKit.brand, harden([elem3])), 'Maybe');

  // This vote should not be counted as it is expired.
  const thirdHandle = makeHandle('Attestation');
  const bld5 = AmountMath.make(bldIssuerKit.brand, 5n);
  const elem4 = makeAttestationElem('myaddress', bld5, 1n, thirdHandle);
  await doVote(
    AmountMath.make(issuerKit.brand, harden([elem4])),
    'Should not count',
  );

  const result = await E(creatorFacet).closeVote(3n);

  t.deepEqual(result, [
    ['Maybe', 3n],
    ['Yes', 40n],
  ]);
});
