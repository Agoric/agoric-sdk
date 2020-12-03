// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { E } from '@agoric/eventual-send';
import bundleSource from '@agoric/bundle-source';

import { setup } from '../setupBasicMints';
import { makeZoe } from '../../..';
import { makeFakeVatAdmin } from '../../../src/contractFacet/fakeVatAdmin';
import {
  offerTo,
  assertProposalShape,
  swapExact,
} from '../../../src/contractSupport/zoeHelpers';

const contractRoot = `${__dirname}/../zcf/zcfTesterContract`;

const makeOffer = async (zoe, zcf, proposal, payments) => {
  let zcfSeat;
  const getSeat = seat => {
    zcfSeat = seat;
  };
  const invitation = await zcf.makeInvitation(getSeat, 'seat');
  const userSeat = await E(zoe).offer(invitation, proposal, payments);
  return { zcfSeat, userSeat };
};

const setupContract = async (moolaIssuer, bucksIssuer) => {
  const instanceToZCF = new Map();
  const setJig = jig => {
    instanceToZCF.set(jig.instance, jig.zcf);
  };
  const zoe = makeZoe(makeFakeVatAdmin(setJig).admin);

  // pack the contract
  const bundle = await bundleSource(contractRoot);
  // install the contract
  const installation = await zoe.install(bundle);

  // Create TWO instances of the zcfTesterContract which have
  // different keywords
  const issuerKeywordRecord1 = harden({
    TokenA: moolaIssuer,
    TokenB: bucksIssuer,
  });

  const issuerKeywordRecord2 = harden({
    TokenC: moolaIssuer,
    TokenD: bucksIssuer,
  });

  // contract instance A
  const { instance: instanceA } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord1,
  );

  // contract instance B
  const { instance: instanceB } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord2,
  );

  // instanceToZCF a map containing both instances as keys and zcfs as
  // values
  return { zoe, instanceToZCF, instanceA, instanceB };
};

test(`offerTo - basic usage`, async t => {
  const {
    moola,
    moolaIssuer,
    moolaMint,
    bucksMint,
    bucks,
    bucksIssuer,
  } = setup();
  const { zoe, instanceToZCF, instanceA, instanceB } = await setupContract(
    moolaIssuer,
    bucksIssuer,
  );

  const zcfA = instanceToZCF.get(instanceA);
  const zcfB = instanceToZCF.get(instanceB);

  // Make an offer from contract A to contract B from a seat in
  // contract A, and deposit the winnings in a different seat on contract A.

  // Create a fromSeat on contract instance A that starts with 5 bucks
  // under keyword TokenB

  const { zcfSeat: fromSeatContractA } = await makeOffer(
    zoe,
    zcfA,
    harden({ want: {}, give: { TokenB: bucks(5) } }),
    harden({ TokenB: bucksMint.mintPayment(bucks(5)) }),
  );

  // Create a seat in contract instance B to exchange with.

  const { zcfSeat: contractBCollateralSeat } = await makeOffer(
    zoe,
    zcfB,
    harden({ want: { TokenD: bucks(5) }, give: { TokenC: moola(10) } }),
    harden({ TokenC: moolaMint.mintPayment(moola(10)) }),
  );

  // create an invitation for contract instance B. This offer will
  // take the 5 bucks and give 10 moola in exchange.

  const successMsg = 'offer to contractB successful';

  const offerHandler = seat => {
    assertProposalShape(seat, {
      give: {
        TokenD: null,
      },
      want: {
        TokenC: null,
      },
      exit: {
        onDemand: null,
      },
    });

    swapExact(zcfB, contractBCollateralSeat, seat);
    return successMsg;
  };
  const contractBInvitation = zcfB.makeInvitation(
    offerHandler,
    'contractB invitation',
  );

  // Map the keywords in contract A to the keywords in contract B
  const keywordMapping = harden({
    TokenA: 'TokenC',
    TokenB: 'TokenD',
  });

  const proposal = harden({
    give: {
      TokenD: bucks(5),
    },
    want: {
      TokenC: moola(10),
    },
  });

  const { zcfSeat: toSeatContractA } = zcfA.makeEmptySeatKit();
  t.deepEqual(toSeatContractA.getCurrentAllocation(), {});

  const { userSeatPromise: contractBUserSeat, deposited } = await offerTo(
    zcfA,
    contractBInvitation,
    keywordMapping,
    proposal,
    fromSeatContractA,
    toSeatContractA,
  );

  await deposited;
  // The toSeat successfully got the payout from the offer to Contract
  // Instance B
  t.deepEqual(toSeatContractA.getCurrentAllocation(), {
    TokenA: moola(10),
    TokenB: bucks(0),
  });

  // The offerResult is as expected
  t.is(await E(contractBUserSeat).getOfferResult(), successMsg);
});

test(`offerTo - violates offer safety of fromSeat`, async t => {
  const { moola, moolaIssuer, bucksMint, bucks, bucksIssuer } = setup();
  const { zoe, instanceToZCF, instanceA, instanceB } = await setupContract(
    moolaIssuer,
    bucksIssuer,
  );

  const zcfA = instanceToZCF.get(instanceA);
  const zcfB = instanceToZCF.get(instanceB);

  // Make an offer from contract A to contract B from a seat in
  // contract A, and deposit the winnings in a different seat on contract A.

  // Create a fromSeat on contract instance A that starts with 5 bucks
  // under keyword TokenB

  const { zcfSeat: fromSeatContractA } = await makeOffer(
    zoe,
    zcfA,
    // Actually enforce offer safety
    harden({ want: { TokenA: moola(3) }, give: { TokenB: bucks(5) } }),
    harden({ TokenB: bucksMint.mintPayment(bucks(5)) }),
  );

  const offerHandler = () => {};
  const contractBInvitation = zcfB.makeInvitation(
    offerHandler,
    'contractB invitation',
  );

  // Map the keywords in contract A to the keywords in contract B
  const keywordMapping = harden({
    TokenA: 'TokenC',
    TokenB: 'TokenD',
  });

  const proposal = harden({
    give: {
      TokenD: bucks(5),
    },
    want: {
      TokenC: moola(10),
    },
  });

  const { zcfSeat: toSeatContractA } = zcfA.makeEmptySeatKit();
  t.deepEqual(toSeatContractA.getCurrentAllocation(), {});

  await t.throwsAsync(
    () =>
      offerTo(
        zcfA,
        contractBInvitation,
        keywordMapping,
        proposal,
        fromSeatContractA,
        toSeatContractA,
      ),
    {
      message:
        'The trade between left [object Object] and right [object Object] failed offer safety. Please check the log for more information',
    },
  );

  t.deepEqual(fromSeatContractA.getCurrentAllocation(), {
    TokenA: moola(0),
    TokenB: bucks(5),
  });
  t.falsy(fromSeatContractA.hasExited());
});
