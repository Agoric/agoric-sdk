// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import { AmountMath, makeIssuerKit, AssetKind } from '@agoric/ertp';
import { extendExpiration } from '../../../../../src/contracts/attestation/expiring/extendExpiration';
import { makeAttestationElem } from '../../../../../src/contracts/attestation/expiring/expiringHelpers';
import { makeHandle } from '../../../../../src/makeHandle';

const doTest = (
  t,
  newExpiration,
  canExtend = _address => true,
  escrowsNothing = false,
  moreThanOneElem = false,
) => {
  const { brand: attestationBrand } = makeIssuerKit(
    'attestation',
    AssetKind.SET,
  );

  const { brand: externalBrand } = makeIssuerKit('external');

  const amountLiened = AmountMath.make(externalBrand, 100n);
  const elem = makeAttestationElem(
    'address',
    amountLiened,
    4n,
    makeHandle('attestation'),
  );
  const newElem = makeAttestationElem(
    'address',
    amountLiened,
    newExpiration,
    elem.handle,
  );

  let currentAllocation;

  if (escrowsNothing) {
    currentAllocation = {};
  } else if (moreThanOneElem) {
    currentAllocation = {
      Attestation: AmountMath.make(attestationBrand, [elem, newElem]),
    };
  } else {
    currentAllocation = {
      Attestation: AmountMath.make(attestationBrand, [elem]),
    };
  }

  let hasExited = false;

  const zcfSeat = {
    getAmountAllocated: keyword => currentAllocation[keyword],
    getCurrentAllocation: () => currentAllocation,
    exit: () => {
      hasExited = true;
    },
    getProposal: () => {
      return { want: {}, give: currentAllocation };
    },
  };
  const zcfMint = {
    burnLosses: (losses, seat) => {
      t.deepEqual(losses, currentAllocation);
      t.is(seat, zcfSeat);
    },
    mintGains: (gains, seat) => {
      t.deepEqual(gains, {
        Attestation: AmountMath.make(attestationBrand, [newElem]),
      });
      t.is(seat, zcfSeat);
    },
  };
  const updateLienedAmounts = updated => {
    t.deepEqual(updated, newElem);
  };

  extendExpiration(
    // @ts-ignore ZCFSeat is mocked for testing
    zcfSeat,
    zcfMint,
    canExtend,
    updateLienedAmounts,
    attestationBrand,
    newExpiration,
  );

  t.true(hasExited);
};

test('happy path', async t => {
  doTest(t, 5n);
});

test('bad newExpiration', async t => {
  t.throws(() => doTest(t, 0n), {
    message: "The new expiration '0' must be later than the old expiration '4'",
  });
});

test('nothing escrowed', async t => {
  t.throws(() => doTest(t, 5n, undefined, true), {
    message: 'actual {} did not match expected {"Attestation":null}',
  });
});

test('more than one elem', async t => {
  t.throws(() => doTest(t, 5n, undefined, false, true), {
    message: /We can currently only extend a single attestation element at a time/,
  });
});

test('cannot extend', async t => {
  const canExtend = _address => false;
  t.throws(() => doTest(t, 5n, canExtend), {
    message:
      "The address 'address' cannot extend the expiration for attestations",
  });
});
