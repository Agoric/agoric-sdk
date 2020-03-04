// Agoric Dapp contract deployment script for autoswap
import fs from 'fs';
import makeAmountMath from '@agoric/ertp/src/amountMath';

import harden from '@agoric/harden';

const MOOLA_NAME = 'moola';
const SIMOLEAN_NAME = 'simolean';

function makeRulesOfferXForY(offerAmount, wantAmount) {
  return harden({
    payoutRules: [
      {
        kind: 'offerAtMost',
        amount: offerAmount,
      },
      {
        kind: 'wantAtLeast',
        amount: wantAmount,
      },
    ],
    exitRule: {
      kind: 'onDemand',
    },
  });
}

function makeRulesWantXForY(wantAmount, offerAmount) {
  return harden({
    payoutRules: [
      {
        kind: 'wantAtLeast',
        amount: wantAmount,
      },
      {
        kind: 'offerAtMost',
        amount: offerAmount,
      },
    ],
    exitRule: {
      kind: 'onDemand',
    },
  });
}

export default async function deployContract(
  homeP,
  { bundleSource, pathResolve },
  CONTRACT_NAME = 'myFirstDapp') {

  // Create a source bundle for the "myFirstDapp" smart contract.
  const { source, moduleFormat } = await bundleSource(`./${CONTRACT_NAME}.js`);

  // =====================
  // === AWAITING TURN ===
  // =====================
  
  // 1. Purses, Issuers stage 1, and Brands
  const installationHandleP = homeP~.zoe~.install(source, moduleFormat);
  const issuersP = homeP~.wallet~.getIssuers();
  const moolaPurseP = homeP~.wallet~.getPurse(MOOLA_NAME);
  const simoleanPurseP = homeP~.wallet~.getPurse(SIMOLEAN_NAME);
  const moolaBrandP = moolaPurseP~.getAllegedBrand();
  const simoleanBrandP = simoleanPurseP~.getAllegedBrand();
  const inviteIssuerP = homeP~.zoe~.getInviteIssuer();

  const [
    issuerPsArray,
    moolaBrand,
    simoleanBrand,
    inviteIssuer,
    installationHandle,
  ] = await Promise.all([
    issuersP,
    moolaBrandP,
    simoleanBrandP,
    inviteIssuerP,
    installationHandleP,
  ]);

  // =====================
  // === AWAITING TURN ===
  // =====================

  // 2. AmountMath, individual Issuers, and contract invite
  const moola = makeAmountMath(moolaBrand, 'nat').make;
  const simolean = makeAmountMath(simoleanBrand, 'nat').make;
  const moolaAmount = moola(900);
  const simoleanAmount = simolean(900);
  const moolaPaymentP = moolaPurseP~.withdraw(moolaAmount);
  const simoleanPaymentP = simoleanPurseP~.withdraw(simoleanAmount);
  const issuerPs = new Map(issuerPsArray);
  const moolaIssuer = issuerPs.get(MOOLA_NAME);
  const simoleanIssuer = issuerPs.get(SIMOLEAN_NAME);

  const issuers = [moolaIssuer, simoleanIssuer];
  const { invite }
    = await homeP~.zoe~.makeInstance(installationHandle, { issuers });

  // =====================
  // === AWAITING TURN ===
  // =====================

  // 3. Get payments and the instanceHandle from an invite.
  const inviteAmountP = inviteIssuer~.getAmountOf(invite);
  const [
    moolaPayment,
    simoleanPayment,
    inviteAmount,
  ] = await Promise.all([
    moolaPaymentP,
    simoleanPaymentP,
    inviteAmountP,
  ]);

  // =====================
  // === AWAITING TURN ===
  // =====================

  // 4. The contract instance's public API
  const {
    extent: [{ instanceHandle }],
  } = inviteAmount;

  const { publicAPI } = await homeP~.zoe~.getInstance(instanceHandle);

  // =====================
  // === AWAITING TURN ===
  // =====================

  // 5. Payments for initialize the market with standing orders
  async function addExchangeOffer(offerAmount, payments, wantAmount) {
    const offerRules = makeRulesOfferXForY(offerAmount, wantAmount);
    const { invite: anInvite } = await publicAPI~.makeInvite();
    const { seat } = await homeP~.zoe~.redeem(anInvite, offerRules, payments);
    return seat~.addOrder();
  }

  async function addExchangeOffer2(wantAmount, offerAmount, payments) {
    const offerRules = makeRulesWantXForY(wantAmount, offerAmount);
    const { invite: anInvite } = await publicAPI~.makeInvite();
    const { seat } = await homeP~.zoe~.redeem(anInvite, offerRules, payments);
    return seat~.addOrder();
  }

  const moolaPayments = moolaIssuer~.splitMany(
    moolaPayment,
    [500, 400].map(x => moola(x)),
  );

  const simoleanPayments = simoleanIssuer~.splitMany(
    simoleanPayment,
    [200, 300, 400].map(x => simolean(x)),
  );

  const [
    [moolaPayment1, moolaPayment2],
    [simoleanPayment1, simoleanPayment2, simoleanPayment3],
  ] = await Promise.all([moolaPayments, simoleanPayments]);

  // =====================
  // === AWAITING TURN ===
  // =====================

  // 7. Add the offers
  // add some orders. The values are arbitrary; there was no consistent plan
  const offer1 = addExchangeOffer(moola(500), [moolaPayment1, undefined], simolean(600));
  const offer2 = addExchangeOffer(moola(400), [moolaPayment2, undefined], simolean(800));
  const offer3 = addExchangeOffer2(moola(100), simolean(200), [undefined, simoleanPayment1]);
  const offer4 = addExchangeOffer2(moola(700), simolean(300), [undefined, simoleanPayment2]);
  const offer5 = addExchangeOffer2(moola(500), simolean(400), [undefined, simoleanPayment3]);

  // =====================
  // === AWAITING TURN ===
  // =====================

  // 8. Register the installation and instance.
  const [contractId, instanceId] = await Promise.all([
    homeP~.registrar~.register(`installation-${CONTRACT_NAME}`, installationHandle),
    homeP~.registrar~.register(`instance-${CONTRACT_NAME}`, instanceHandle),
  ]);

  // =====================
  // === AWAITING TURN ===
  // =====================

  console.log('- installation made', CONTRACT_NAME, '=>',  contractId);
  console.log('- instance made', CONTRACT_NAME, '=>', instanceId);

  // 9.  Save the instanceId somewhere where the UI can find it.
  if (contractId) {
    const cjfile = pathResolve(`../ui/src/utils/contractID.js`);
    console.log('writing', cjfile);
    await fs.promises.writeFile(cjfile, `export default ${JSON.stringify(instanceId)};`);

    // =====================
    // === AWAITING TURN ===
    // =====================
  }

  await Promise.all([offer1, offer2, offer3, offer4, offer5]);
  console.log(`==== added orders. ===`)
}
