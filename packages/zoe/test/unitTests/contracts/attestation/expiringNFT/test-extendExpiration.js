// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath, makeIssuerKit, AssetKind } from '@agoric/ertp';
import { extendExpiration } from '../../../../../src/contracts/attestation/expiring/extendExpiration.js';
import { makeAttestationElem } from '../../../../../src/contracts/attestation/expiring/expiringHelpers.js';
import { makeHandle } from '../../../../../src/makeHandle.js';

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
    makeHandle('Attestation'),
  );
  const elem2 = makeAttestationElem(
    'address',
    amountLiened,
    5n,
    makeHandle('Attestation'),
  );

  let currentAllocation;

  if (escrowsNothing) {
    currentAllocation = {};
  } else if (moreThanOneElem) {
    currentAllocation = {
      Attestation: AmountMath.make(attestationBrand, [elem, elem2]),
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

  const newElem = makeAttestationElem(
    'address',
    amountLiened,
    newExpiration,
    elem.handle,
  );
  const newElem2 = makeAttestationElem(
    'address',
    amountLiened,
    newExpiration,
    elem2.handle,
  );

  const zcfMint = {
    burnLosses: (losses, seat) => {
      t.deepEqual(losses, currentAllocation);
      t.is(seat, zcfSeat);
    },
    mintGains: (gains, seat) => {
      if (moreThanOneElem) {
        t.deepEqual(gains, {
          Attestation: AmountMath.make(attestationBrand, [newElem, newElem2]),
        });
      } else {
        t.deepEqual(gains, {
          Attestation: AmountMath.make(attestationBrand, [newElem]),
        });
      }
      t.is(seat, zcfSeat);
    },
  };
  const updateLienedAmount = updated => {
    t.deepEqual(updated, newElem);
  };

  extendExpiration(
    // @ts-ignore ZCFSeat is mocked for testing
    zcfSeat,
    zcfMint,
    canExtend,
    updateLienedAmount,
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
    message:
      'The new expiration "[0n]" must be later than the old expiration "[4n]"',
  });
});

test('nothing escrowed', async t => {
  t.throws(() => doTest(t, 5n, undefined, true), {
    message: 'actual {} did not match expected {"Attestation":null}',
  });
});

test('more than one elem', async t => {
  doTest(t, 6n, undefined, false, true);
});

test('cannot extend', async t => {
  const canExtend = _address => false;
  t.throws(() => doTest(t, 5n, canExtend), {
    message: `The address "address" cannot extend the expiration for attestations`,
  });
});
