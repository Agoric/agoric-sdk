// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { E } from '@agoric/eventual-send';
import '../../../exported';
import buildManualTimer from '../../../tools/manualTimer';

import { setup } from '../setupBasicMints';
import { installationPFromSource } from '../installFromSource';
import { assertPayoutDeposit, assertPayoutAmount } from '../../zoeTestHelpers';
import { makeFakePriceAuthority } from '../../../tools/fakePriceAuthority';

const fundedCallSpread = `${__dirname}/../../../src/contracts/callSpread/fundedCallSpread`;
const pricedCallSpread = `${__dirname}/../../../src/contracts/callSpread/pricedCallSpreads`;
const simpleExchange = `${__dirname}/../../../src/contracts/simpleExchange`;

const makeTestPriceAuthority = (amountMaths, priceList, timer) =>
  makeFakePriceAuthority({
    mathIn: amountMaths.get('simoleans'),
    mathOut: amountMaths.get('moola'),
    priceList,
    timer,
  });

// Underlying is in Simoleans. Collateral, strikePrice and Payout are in bucks.
// Value is in Moola. The price oracle takes an amount in Underlying, and
// gives the value in Moola.
test('fundedCallSpread below Strike1', async t => {
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
    brands,
  } = setup();
  const installation = await installationPFromSource(zoe, fundedCallSpread);

  // Alice will create and fund a call spread contract, and give the invitations
  // to Bob and Carol. Bob and Carol will promptly schedule collection of funds.
  // The spread will then mature at a low price, and carol will get paid.

  // Setup Alice
  const aliceBucksPayment = bucksMint.mintPayment(bucks(300));
  // Setup Bob
  const bobBucksPurse = bucksIssuer.makeEmptyPurse();
  // Setup Carol
  const carolBucksPurse = bucksIssuer.makeEmptyPurse();

  const manualTimer = buildManualTimer(console.log, 0);
  const priceAuthority = makeTestPriceAuthority(
    amountMaths,
    [54, 20, 35, 15, 28],
    manualTimer,
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

  // Alice creates a fundedCallSpread instance
  const issuerKeywordRecord = harden({
    Underlying: simoleanIssuer,
    Collateral: bucksIssuer,
    Strike: moolaIssuer,
    Quote: await E(priceAuthority).getQuoteIssuer(
      brands.get('simoleans'),
      brands.get('moola'),
    ),
  });
  const { creatorInvitation } = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
    terms,
  );

  const invitationDetail = await E(zoe).getInvitationDetails(creatorInvitation);
  const longOptionAmount = invitationDetail.longAmount;
  const shortOptionAmount = invitationDetail.shortAmount;

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

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await Promise.all([bobDeposit, carolDeposit]);
});

// Underlying is in Simoleans. Collateral, strikePrice and Payout are in bucks.
// Value is in Moola.
test('fundedCallSpread above Strike2', async t => {
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
    brands,
  } = setup();
  const installation = await installationPFromSource(zoe, fundedCallSpread);

  // Alice will create and fund a call spread contract, and give the invitations
  // to Bob and Carol. Bob and Carol will promptly schedule collection of funds.
  // The spread will then mature at a high price, and bob will get paid.

  // Setup Alice
  const aliceBucksPayment = bucksMint.mintPayment(bucks(300));
  // Setup Bob
  const bobBucksPurse = bucksIssuer.makeEmptyPurse();
  // Setup Carol
  const carolBucksPurse = bucksIssuer.makeEmptyPurse();

  const manualTimer = buildManualTimer(console.log, 0);
  const priceAuthority = makeTestPriceAuthority(
    amountMaths,
    [20, 55],
    manualTimer,
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

  // Alice creates a fundedCallSpread instance
  const issuerKeywordRecord = harden({
    Underlying: simoleanIssuer,
    Collateral: bucksIssuer,
    Strike: moolaIssuer,
    Quote: await E(priceAuthority).getQuoteIssuer(
      brands.get('simoleans'),
      brands.get('moola'),
    ),
  });

  const { creatorInvitation } = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
    terms,
  );

  const invitationDetail = await E(zoe).getInvitationDetails(creatorInvitation);
  const longOptionAmount = invitationDetail.longAmount;
  const shortOptionAmount = invitationDetail.shortAmount;

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

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await Promise.all([bobDeposit, carolDeposit]);
});

// Underlying is in Simoleans. Collateral, strikePrice and Payout are in bucks.
// Value is in Moola.
test('fundedCallSpread, mid-strike', async t => {
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
    brands,
  } = setup();
  const installation = await installationPFromSource(zoe, fundedCallSpread);

  // Alice will create and fund a call spread contract, and give the invitations
  // to Bob and Carol. Bob and Carol will promptly schedule collection of funds.
  // The spread will then mature, and both will get paid.

  // Setup Alice
  const aliceBucksPayment = bucksMint.mintPayment(bucks(300));
  // Setup Bob
  const bobBucksPurse = bucksIssuer.makeEmptyPurse();
  // Setup Carol
  const carolBucksPurse = bucksIssuer.makeEmptyPurse();

  const manualTimer = buildManualTimer(console.log, 0);
  const priceAuthority = makeTestPriceAuthority(
    amountMaths,
    [20, 45],
    manualTimer,
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
  // Alice creates a fundedCallSpread instance
  const issuerKeywordRecord = harden({
    Underlying: simoleanIssuer,
    Collateral: bucksIssuer,
    Strike: moolaIssuer,
    Quote: await E(priceAuthority).getQuoteIssuer(
      brands.get('simoleans'),
      brands.get('moola'),
    ),
  });

  const { creatorInvitation } = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
    terms,
  );

  const invitationDetail = await E(zoe).getInvitationDetails(creatorInvitation);
  const longOptionAmount = invitationDetail.longAmount;
  const shortOptionAmount = invitationDetail.shortAmount;

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

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await Promise.all([bobDeposit, carolDeposit]);
});

// Underlying is in Simoleans. Collateral, strikePrice and Payout are in bucks.
// Value is in Moola. Carol waits to collect until after settlement
test('fundedCallSpread, late exercise', async t => {
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
    brands,
  } = setup();
  const installation = await installationPFromSource(zoe, fundedCallSpread);

  // Alice will create and fund a call spread contract, and give the invitations
  // to Bob and Carol. Bob and Carol will promptly schedule collection of funds.
  // The spread will then mature, and both will get paid.

  // Setup Alice
  const aliceBucksPayment = bucksMint.mintPayment(bucks(300));
  // Setup Bob
  const bobBucksPurse = bucksIssuer.makeEmptyPurse();
  // Setup Carol
  const carolBucksPurse = bucksIssuer.makeEmptyPurse();

  const manualTimer = buildManualTimer(console.log, 0);
  const priceAuthority = makeTestPriceAuthority(
    amountMaths,
    [20, 45],
    manualTimer,
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

  // Alice creates a fundedCallSpread instance
  const issuerKeywordRecord = harden({
    Underlying: simoleanIssuer,
    Collateral: bucksIssuer,
    Strike: moolaIssuer,
    Quote: await E(priceAuthority).getQuoteIssuer(
      brands.get('simoleans'),
      brands.get('moola'),
    ),
  });
  const { creatorInvitation } = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
    terms,
  );

  const invitationDetails = await E(zoe).getInvitationDetails(
    creatorInvitation,
  );
  const aliceProposal = harden({
    want: {
      LongOption: invitationDetails.longAmount,
      ShortOption: invitationDetails.shortAmount,
    },
    give: { Collateral: bucks(300) },
  });
  const alicePayments = { Collateral: aliceBucksPayment };
  const aliceSeat = await zoe.offer(
    creatorInvitation,
    aliceProposal,
    alicePayments,
  );
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

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();

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

test('fundedCallSpread, sell options', async t => {
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
    brands,
  } = setup();
  const installation = await installationPFromSource(zoe, fundedCallSpread);
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

  const manualTimer = buildManualTimer(console.log, 0);
  const priceAuthority = makeTestPriceAuthority(
    amountMaths,
    [20, 45],
    manualTimer,
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

  // Alice creates a fundedCallSpread instance
  const issuerKeywordRecord = harden({
    Underlying: simoleanIssuer,
    Collateral: bucksIssuer,
    Strike: moolaIssuer,
    Quote: await E(priceAuthority).getQuoteIssuer(
      brands.get('simoleans'),
      brands.get('moola'),
    ),
  });
  const { creatorInvitation } = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
    terms,
  );

  const invitationDetail = await E(zoe).getInvitationDetails(creatorInvitation);
  const longOptionAmount = invitationDetail.longAmount;
  const shortOptionAmount = invitationDetail.shortAmount;

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

  // Carol buys the Short invitation
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

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await Promise.all([aliceLong, aliceShort, bobDeposit, carolDeposit]);
});

test('pricedCallSpread, mid-strike', async t => {
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
    brands,
  } = setup();
  const installation = await installationPFromSource(zoe, pricedCallSpread);

  // Alice will create a call spread contract, and give the invitations
  // to Bob and Carol. Bob and Carol will fund and exercise, then promptly
  // schedule collection of funds. The spread will then mature, and both will
  // get paid.

  // Setup Bob
  const bobBucksPurse = bucksIssuer.makeEmptyPurse();
  const bobBucksPayment = bucksMint.mintPayment(bucks(225));
  // Setup Carol
  const carolBucksPurse = bucksIssuer.makeEmptyPurse();
  const carolBucksPayment = bucksMint.mintPayment(bucks(75));

  const manualTimer = buildManualTimer(console.log, 0);
  const priceAuthority = await makeTestPriceAuthority(
    amountMaths,
    [20, 45, 45, 45, 45, 45, 45],
    manualTimer,
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
  // Alice creates a pricedCallSpread instance
  const issuerKeywordRecord = harden({
    Underlying: simoleanIssuer,
    Collateral: bucksIssuer,
    Strike: moolaIssuer,
    Quote: await E(priceAuthority).getQuoteIssuer(
      brands.get('simoleans'),
      brands.get('moola'),
    ),
  });
  const { creatorFacet } = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
    terms,
  );
  const invitationPair = await E(creatorFacet).makeInvitationPair(75);
  const { longInvitation, shortInvitation } = invitationPair;

  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const longAmount = await E(invitationIssuer).getAmountOf(longInvitation);
  const shortAmount = await E(invitationIssuer).getAmountOf(shortInvitation);

  const longOptionValue = longAmount.value[0];
  t.is('long', longOptionValue.position);
  const longOption = longOptionValue.option;

  // Bob makes an offer for the long option
  const bobProposal = harden({
    want: { Option: longOption },
    give: { Collateral: bucks(225) },
  });
  const bobPurchaseSeat = await zoe.offer(await longInvitation, bobProposal, {
    Collateral: bobBucksPayment,
  });
  // bob gets an option, and exercises it for the payout
  const bobOption = await bobPurchaseSeat.getPayout('Option');
  const bobOptionSeat = await zoe.offer(bobOption);

  const bobPayout = bobOptionSeat.getPayout('Collateral');
  const bobDeposit = assertPayoutDeposit(
    t,
    bobPayout,
    bobBucksPurse,
    bucks(225),
  );

  const shortOptionValue = shortAmount.value[0];
  t.is('short', shortOptionValue.position);
  const shortOption = shortOptionValue.option;

  // carol makes an offer for the short option
  const carolProposal = harden({
    want: { Option: shortOption },
    give: { Collateral: bucks(75) },
  });
  const carolPurchaseSeat = await zoe.offer(
    await shortInvitation,
    carolProposal,
    {
      Collateral: carolBucksPayment,
    },
  );
  // carol gets an option, and exercises it for the payout
  const carolOption = await carolPurchaseSeat.getPayout('Option');
  const carolOptionSeat = await zoe.offer(carolOption);

  const carolPayout = carolOptionSeat.getPayout('Collateral');
  const carolDeposit = assertPayoutDeposit(
    t,
    carolPayout,
    carolBucksPurse,
    bucks(75),
  );

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await Promise.all([bobDeposit, carolDeposit]);
});
