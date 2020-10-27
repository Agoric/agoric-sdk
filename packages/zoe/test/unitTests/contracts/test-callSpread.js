// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { E } from '@agoric/eventual-send';
import '../../../exported';
import { makePromiseKit } from '@agoric/promise-kit';
import { makeIssuerKit, MathKind } from '@agoric/ertp';
import buildManualTimer from '../../../tools/manualTimer';

import { setup } from '../setupBasicMints';
import { installationPFromSource } from '../installFromSource';
import { assertPayoutDeposit, assertPayoutAmount } from '../../zoeTestHelpers';

const callSpread = `${__dirname}/../../../src/contracts/callSpread`;
const simpleExchange = `${__dirname}/../../../src/contracts/simpleExchange`;

function makeFakePriceAuthority(
  // timer,
  underlyingAmountMath,
  strikeAmountMath,
  priceSchedule,
) {
  const {
    mint: quoteMint,
    issuer: quoteIssuer,
    amountMath: quote,
  } = makeIssuerKit('quote', MathKind.SET);

  function priceFromSchedule(strikeTime) {
    let freshestPrice = 0;
    let freshestTime = -1;
    for (const tick of priceSchedule) {
      if (tick.time > freshestTime && tick.time <= strikeTime) {
        freshestTime = tick.time;
        freshestPrice = tick.price;
      }
    }
    return freshestPrice;
  }

  function getRecentPrice(timer, desiredPriceBrand, underlyingAmount) {
    const underlyingValue = underlyingAmountMath.getValue(underlyingAmount);
    return E(timer)
      .getCurrentTimestamp()
      .then(now => {
        const price = priceFromSchedule(now);
        const strikePrice = strikeAmountMath.make(price * underlyingValue);
        return quoteMint.mintPayment(
          quote.make(
            harden([
              {
                Asset: underlyingAmount,
                Price: strikePrice,
                timer,
                timestamp: now,
              },
            ]),
          ),
        );
      });
  }

  const priceAuthority = {
    getQuoteIssuer: () => quoteIssuer,
    priceAtTime: (timer, timeStamp, underlyingAmount, strikeBrand) => {
      const { promise, resolve } = makePromiseKit();

      E(timer).setWakeup(
        timeStamp,
        harden({
          wake: () => {
            return resolve(
              getRecentPrice(timer, strikeBrand, underlyingAmount),
            );
          },
        }),
      );
      return promise;
    },
  };
  return priceAuthority;
}

// Underlying is in Simoleans. Collateral, strikePrice and Payout are in bucks.
// Value is in Moola. The price oracle takes an amount in Underlying, and
// gives the value in Moola.
test('callSpread below Strike1', async t => {
  const {
    moolaIssuer,
    simoleanIssuer,
    moola,
    simoleans,
    bucksIssuer,
    bucksMint,
    bucks,
    zoe,
    amountMaths,
  } = setup();
  const installation = await installationPFromSource(zoe, callSpread);
  const invitationIssuer = await E(zoe).getInvitationIssuer();

  // Alice will create and fund a call spread contract, and give the invitations
  // to Bob and Carol. Bob and Carol will promptly schedule collection of funds.
  // The spread will then mature at a low price, and carol will get paid.

  // Setup Alice
  const aliceBucksPayment = bucksMint.mintPayment(bucks(300));
  // Setup Bob
  const bobBucksPurse = bucksIssuer.makeEmptyPurse();
  // Setup Carol
  const carolBucksPurse = bucksIssuer.makeEmptyPurse();

  const manualTimer = buildManualTimer(console.log, 1);
  const priceAuthority = makeFakePriceAuthority(
    amountMaths.get('simoleans'),
    amountMaths.get('moola'),
    [
      { time: 0, price: 20 },
      { time: 1, price: 35 },
      { time: 2, price: 15 },
      { time: 3, price: 28 },
    ],
  );
  // underlying is 2 Simoleans, strike range is 30-50 (doubled)
  const terms = harden({
    expiration: 3,
    underlyingAmount: simoleans(2),
    priceAuthority,
    strikePrice1: moola(60),
    strikePrice2: moola(100),
    settlementAmount: bucks(300),
    timer: manualTimer,
  });

  // Alice creates a callSpread instance
  const issuerKeywordRecord = harden({
    Underlying: simoleanIssuer,
    Collateral: bucksIssuer,
    Strike: moolaIssuer,
    Options: invitationIssuer,
    Quote: priceAuthority.getQuoteIssuer(),
  });
  const { creatorInvitation } = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
    terms,
  );

  const optionAmount = await invitationIssuer.getAmountOf(creatorInvitation);
  const longOptionAmount = optionAmount.value[0].LongOption;
  const shortOptionAmount = optionAmount.value[0].ShortOption;

  const aliceProposal = harden({
    want: { LongOption: longOptionAmount, ShortOption: shortOptionAmount },
    give: { Collateral: bucks(300) },
  });
  const alicePayments = { Collateral: aliceBucksPayment };
  const aliceSeat = await zoe.offer(
    creatorInvitation,
    aliceProposal,
    alicePayments,
  );
  const aliceOption = await aliceSeat.getOfferResult();
  t.truthy(invitationIssuer.isLive(aliceOption));
  const {
    LongOption: bobLongOption,
    ShortOption: carolShortOption,
  } = await aliceSeat.getPayouts();

  const bobOptionSeat = await zoe.offer(bobLongOption);
  const bobPayout = bobOptionSeat.getPayout('Collateral');
  const bobDeposit = assertPayoutDeposit(t, bobPayout, bobBucksPurse, bucks(0));

  const carolOptionSeat = await zoe.offer(carolShortOption);
  const carolPayout = carolOptionSeat.getPayout('Collateral');
  const carolDeposit = assertPayoutDeposit(
    t,
    carolPayout,
    carolBucksPurse,
    bucks(300),
  );

  manualTimer.tick();
  manualTimer.tick();
  await Promise.all([bobDeposit, carolDeposit]);
});

// Underlying is in Simoleans. Collateral, strikePrice and Payout are in bucks.
// Value is in Moola.
test('callSpread above Strike2', async t => {
  const {
    moolaIssuer,
    simoleanIssuer,
    moola,
    simoleans,
    bucksIssuer,
    bucksMint,
    bucks,
    zoe,
    amountMaths,
  } = setup();
  const installation = await installationPFromSource(zoe, callSpread);
  const invitationIssuer = await E(zoe).getInvitationIssuer();

  // Alice will create and fund a call spread contract, and give the invitations
  // to Bob and Carol. Bob and Carol will promptly schedule collection of funds.
  // The spread will then mature at a high price, and bob will get paid.

  // Setup Alice
  const aliceBucksPayment = bucksMint.mintPayment(bucks(300));
  // Setup Bob
  const bobBucksPurse = bucksIssuer.makeEmptyPurse();
  // Setup Carol
  const carolBucksPurse = bucksIssuer.makeEmptyPurse();

  const manualTimer = buildManualTimer(console.log, 1);
  const priceAuthority = makeFakePriceAuthority(
    amountMaths.get('simoleans'),
    amountMaths.get('moola'),
    [
      { time: 0, price: 20 },
      { time: 3, price: 55 },
    ],
  );
  // underlying is 2 Simoleans, strike range is 30-50 (doubled)
  const terms = harden({
    expiration: 3,
    underlyingAmount: simoleans(2),
    priceAuthority,
    strikePrice1: moola(60),
    strikePrice2: moola(100),
    settlementAmount: bucks(300),
    timer: manualTimer,
  });

  // Alice creates a callSpread instance
  const issuerKeywordRecord = harden({
    Underlying: simoleanIssuer,
    Collateral: bucksIssuer,
    Strike: moolaIssuer,
    Options: invitationIssuer,
    Quote: priceAuthority.getQuoteIssuer(),
  });

  const { creatorInvitation } = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
    terms,
  );

  const optionAmount = await invitationIssuer.getAmountOf(creatorInvitation);
  const longOptionAmount = optionAmount.value[0].LongOption;
  const shortOptionAmount = optionAmount.value[0].ShortOption;

  const aliceProposal = harden({
    want: { LongOption: longOptionAmount, ShortOption: shortOptionAmount },
    give: { Collateral: bucks(300) },
  });
  const alicePayments = { Collateral: aliceBucksPayment };
  const aliceSeat = await zoe.offer(
    creatorInvitation,
    aliceProposal,
    alicePayments,
  );
  const aliceOption = await aliceSeat.getOfferResult();
  t.truthy(invitationIssuer.isLive(aliceOption));
  const {
    LongOption: bobLongOption,
    ShortOption: carolShortOption,
  } = await aliceSeat.getPayouts();

  const bobOptionSeat = await zoe.offer(bobLongOption);
  const bobPayout = bobOptionSeat.getPayout('Collateral');
  const bobDeposit = assertPayoutDeposit(
    t,
    bobPayout,
    bobBucksPurse,
    bucks(300),
  );

  const carolOptionSeat = await zoe.offer(carolShortOption);
  const carolPayout = carolOptionSeat.getPayout('Collateral');
  const carolDeposit = assertPayoutDeposit(
    t,
    carolPayout,
    carolBucksPurse,
    bucks(0),
  );

  manualTimer.tick();
  manualTimer.tick();
  await Promise.all([bobDeposit, carolDeposit]);
});

// Underlying is in Simoleans. Collateral, strikePrice and Payout are in bucks.
// Value is in Moola.
test('callSpread, mid-strike', async t => {
  const {
    moolaIssuer,
    simoleanIssuer,
    moola,
    simoleans,
    bucksIssuer,
    bucksMint,
    bucks,
    zoe,
    amountMaths,
  } = setup();
  const installation = await installationPFromSource(zoe, callSpread);
  const invitationIssuer = await E(zoe).getInvitationIssuer();

  // Alice will create and fund a call spread contract, and give the invitations
  // to Bob and Carol. Bob and Carol will promptly schedule collection of funds.
  // The spread will then mature, and both will get paid.

  // Setup Alice
  const aliceBucksPayment = bucksMint.mintPayment(bucks(300));
  // Setup Bob
  const bobBucksPurse = bucksIssuer.makeEmptyPurse();
  // Setup Carol
  const carolBucksPurse = bucksIssuer.makeEmptyPurse();

  const manualTimer = buildManualTimer(console.log, 1);
  const priceAuthority = makeFakePriceAuthority(
    amountMaths.get('simoleans'),
    amountMaths.get('moola'),
    [
      { time: 0, price: 20 },
      { time: 3, price: 45 },
    ],
  );
  // underlying is 2 Simoleans, strike range is 30-50 (doubled)
  const terms = harden({
    expiration: 3,
    underlyingAmount: simoleans(2),
    priceAuthority,
    strikePrice1: moola(60),
    strikePrice2: moola(100),
    settlementAmount: bucks(300),
    timer: manualTimer,
  });
  // Alice creates a callSpread instance
  const issuerKeywordRecord = harden({
    Underlying: simoleanIssuer,
    Collateral: bucksIssuer,
    Strike: moolaIssuer,
    Options: invitationIssuer,
    Quote: priceAuthority.getQuoteIssuer(),
  });

  const { creatorInvitation } = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
    terms,
  );

  const optionAmount = await invitationIssuer.getAmountOf(creatorInvitation);
  const longOptionAmount = optionAmount.value[0].LongOption;
  const shortOptionAmount = optionAmount.value[0].ShortOption;

  const aliceProposal = harden({
    want: { LongOption: longOptionAmount, ShortOption: shortOptionAmount },
    give: { Collateral: bucks(300) },
  });
  const alicePayments = { Collateral: aliceBucksPayment };
  const aliceSeat = await zoe.offer(
    creatorInvitation,
    aliceProposal,
    alicePayments,
  );
  const aliceOption = await aliceSeat.getOfferResult();
  t.truthy(invitationIssuer.isLive(aliceOption));
  const {
    LongOption: bobLongOption,
    ShortOption: carolShortOption,
  } = await aliceSeat.getPayouts();

  const bobOptionSeat = await zoe.offer(bobLongOption);
  const bobPayout = bobOptionSeat.getPayout('Collateral');
  const bobDeposit = assertPayoutDeposit(
    t,
    bobPayout,
    bobBucksPurse,
    bucks(225),
  );

  const carolOptionSeat = await zoe.offer(carolShortOption);
  const carolPayout = carolOptionSeat.getPayout('Collateral');
  const carolDeposit = assertPayoutDeposit(
    t,
    carolPayout,
    carolBucksPurse,
    bucks(75),
  );

  manualTimer.tick();
  manualTimer.tick();
  await Promise.all([bobDeposit, carolDeposit]);
});

// Underlying is in Simoleans. Collateral, strikePrice and Payout are in bucks.
// Value is in Moola. Carol waits to collect until after settlement
test('callSpread, late exercise', async t => {
  const {
    moolaIssuer,
    simoleanIssuer,
    moola,
    simoleans,
    bucksIssuer,
    bucksMint,
    bucks,
    zoe,
    amountMaths,
  } = setup();
  const installation = await installationPFromSource(zoe, callSpread);
  const invitationIssuer = await E(zoe).getInvitationIssuer();

  // Alice will create and fund a call spread contract, and give the invitations
  // to Bob and Carol. Bob and Carol will promptly schedule collection of funds.
  // The spread will then mature, and both will get paid.

  // Setup Alice
  const aliceBucksPayment = bucksMint.mintPayment(bucks(300));
  // Setup Bob
  const bobBucksPurse = bucksIssuer.makeEmptyPurse();
  // Setup Carol
  const carolBucksPurse = bucksIssuer.makeEmptyPurse();

  const manualTimer = buildManualTimer(console.log, 1);
  const priceAuthority = makeFakePriceAuthority(
    amountMaths.get('simoleans'),
    amountMaths.get('moola'),
    [
      { time: 0, price: 20 },
      { time: 3, price: 45 },
    ],
  );
  // underlying is 2 Simoleans, strike range is 30-50 (doubled)
  const terms = harden({
    expiration: 3,
    underlyingAmount: simoleans(2),
    priceAuthority,
    strikePrice1: moola(60),
    strikePrice2: moola(100),
    settlementAmount: bucks(300),
    timer: manualTimer,
  });

  // Alice creates a callSpread instance
  const issuerKeywordRecord = harden({
    Underlying: simoleanIssuer,
    Collateral: bucksIssuer,
    Strike: moolaIssuer,
    Options: invitationIssuer,
    Quote: priceAuthority.getQuoteIssuer(),
  });
  const { creatorInvitation } = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
    terms,
  );

  const optionAmount = await invitationIssuer.getAmountOf(creatorInvitation);
  const longOptionAmount = optionAmount.value[0].LongOption;
  const shortOptionAmount = optionAmount.value[0].ShortOption;

  const aliceProposal = harden({
    want: { LongOption: longOptionAmount, ShortOption: shortOptionAmount },
    give: { Collateral: bucks(300) },
  });
  const alicePayments = { Collateral: aliceBucksPayment };
  const aliceSeat = await zoe.offer(
    creatorInvitation,
    aliceProposal,
    alicePayments,
  );
  const aliceOption = await aliceSeat.getOfferResult();
  t.truthy(invitationIssuer.isLive(aliceOption));
  const {
    LongOption: bobLongOption,
    ShortOption: carolShortOption,
  } = await aliceSeat.getPayouts();

  const bobOptionSeat = await zoe.offer(bobLongOption);
  const bobPayout = bobOptionSeat.getPayout('Collateral');
  const bobDeposit = assertPayoutDeposit(
    t,
    bobPayout,
    bobBucksPurse,
    bucks(225),
  );

  manualTimer.tick();
  manualTimer.tick();

  const carolOptionSeat = await zoe.offer(carolShortOption);
  const carolPayout = await carolOptionSeat.getPayout('Collateral');
  const carolDepositAmount = await E(carolBucksPurse).deposit(carolPayout);
  await t.deepEqual(
    carolDepositAmount,
    bucks(75),
    `payout was ${carolDepositAmount.value}, expected 75`,
  );
  await Promise.all([bobDeposit]);
});

test('callSpread, sell options', async t => {
  const {
    moolaIssuer,
    simoleanIssuer,
    moola,
    simoleans,
    bucksIssuer,
    bucksMint,
    bucks,
    zoe,
    amountMaths,
  } = setup();
  const installation = await installationPFromSource(zoe, callSpread);
  const invitationIssuer = await E(zoe).getInvitationIssuer();

  // Alice will create and fund a call spread contract, and sell the invitations
  // to Bob and Carol. Bob and Carol will promptly schedule collection of funds.
  // The spread will then mature, and both will get paid.

  // Setup Alice
  const aliceBucksPayment = bucksMint.mintPayment(bucks(300));
  const aliceBucksPurse = bucksIssuer.makeEmptyPurse();
  // Setup Bob
  const bobBucksPurse = bucksIssuer.makeEmptyPurse();
  const bobBucksPayment = bucksMint.mintPayment(bucks(200));
  // Setup Carol
  const carolBucksPurse = bucksIssuer.makeEmptyPurse();
  const carolBucksPayment = bucksMint.mintPayment(bucks(100));

  const manualTimer = buildManualTimer(console.log, 1);
  const priceAuthority = makeFakePriceAuthority(
    amountMaths.get('simoleans'),
    amountMaths.get('moola'),
    [
      { time: 0, price: 20 },
      { time: 3, price: 45 },
    ],
  );
  // underlying is 2 Simoleans, strike range is 30-50 (doubled)
  const terms = harden({
    expiration: 3,
    underlyingAmount: simoleans(2),
    priceAuthority,
    strikePrice1: moola(60),
    strikePrice2: moola(100),
    settlementAmount: bucks(300),
    timer: manualTimer,
  });

  // Alice creates a callSpread instance
  const issuerKeywordRecord = harden({
    Underlying: simoleanIssuer,
    Collateral: bucksIssuer,
    Strike: moolaIssuer,
    Options: invitationIssuer,
    Quote: priceAuthority.getQuoteIssuer(),
  });
  const { creatorInvitation } = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
    terms,
  );

  const optionAmount = await invitationIssuer.getAmountOf(creatorInvitation);
  const longOptionAmount = optionAmount.value[0].LongOption;
  const shortOptionAmount = optionAmount.value[0].ShortOption;

  const aliceProposal = harden({
    want: { LongOption: longOptionAmount, ShortOption: shortOptionAmount },
    give: { Collateral: bucks(300) },
  });
  const alicePayments = { Collateral: aliceBucksPayment };
  const aliceSeat = await zoe.offer(
    creatorInvitation,
    aliceProposal,
    alicePayments,
  );
  const aliceOption = await aliceSeat.getOfferResult();
  t.truthy(invitationIssuer.isLive(aliceOption));
  const {
    LongOption: longOption,
    ShortOption: shortOption,
  } = await aliceSeat.getPayouts();

  const exchangeInstallation = await installationPFromSource(
    zoe,
    simpleExchange,
  );
  const { publicFacet: exchangePublic } = await zoe.startInstance(
    exchangeInstallation,
    {
      Asset: invitationIssuer,
      Price: bucksIssuer,
    },
  );

  // Alice offers to sell the long invitation
  const aliceLongInvitation = E(exchangePublic).makeInvitation();
  const proposalLong = harden({
    give: { Asset: longOptionAmount },
    want: { Price: bucks(200) },
  });
  const aliceSellLongSeat = await zoe.offer(aliceLongInvitation, proposalLong, {
    Asset: longOption,
  });
  const aliceLong = assertPayoutDeposit(
    t,
    aliceSellLongSeat.getPayout('Price'),
    aliceBucksPurse,
    bucks(200),
  );

  // Alice offers to sell the short invitation
  const aliceShortInvitation = E(exchangePublic).makeInvitation();
  const proposalShort = harden({
    give: { Asset: shortOptionAmount },
    want: { Price: bucks(100) },
  });
  const aliceSellShortSeat = await zoe.offer(
    aliceShortInvitation,
    proposalShort,
    { Asset: shortOption },
  );
  const aliceShort = assertPayoutDeposit(
    t,
    aliceSellShortSeat.getPayout('Price'),
    carolBucksPurse,
    bucks(100),
  );

  // Bob buys the long invitation
  const bobLongInvitation = E(exchangePublic).makeInvitation();
  const bobProposal = harden({
    give: { Price: bucks(200) },
    want: { Asset: longOptionAmount },
  });
  const bobBuySeat = await zoe.offer(bobLongInvitation, bobProposal, {
    Price: bobBucksPayment,
  });
  const longInvitationPayout = await bobBuySeat.getPayout('Asset');
  assertPayoutAmount(
    t,
    invitationIssuer,
    longInvitationPayout,
    longOptionAmount,
  );
  const bobOptionSeat = await zoe.offer(longInvitationPayout);
  const bobPayout = bobOptionSeat.getPayout('Collateral');
  const bobDeposit = assertPayoutDeposit(
    t,
    bobPayout,
    bobBucksPurse,
    bucks(225),
  );

  // Bob buys the Short invitation
  const carolShortInvitation = E(exchangePublic).makeInvitation();
  const carolProposal = harden({
    give: { Price: bucks(100) },
    want: { Asset: shortOptionAmount },
  });
  const carolBuySeat = await zoe.offer(carolShortInvitation, carolProposal, {
    Price: carolBucksPayment,
  });
  const ShortInvitationPayout = await carolBuySeat.getPayout('Asset');
  assertPayoutAmount(
    t,
    invitationIssuer,
    ShortInvitationPayout,
    shortOptionAmount,
  );
  const carolOptionSeat = await zoe.offer(ShortInvitationPayout);
  const carolPayout = carolOptionSeat.getPayout('Collateral');
  const carolDeposit = assertPayoutDeposit(
    t,
    carolPayout,
    carolBucksPurse,
    bucks(75),
  );

  manualTimer.tick();
  manualTimer.tick();
  await Promise.all([aliceLong, aliceShort, bobDeposit, carolDeposit]);
});
