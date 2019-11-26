// Agoric Dapp contract deployment script
import fs from 'fs';

import harden from '@agoric/harden';

const DAPP_NAME = "@DIR@";

export default async function deployContract(homeP, { bundleSource, pathResolve },
  CONTRACT_NAME = 'autoswap') {

  // Create a source bundle for the "myFirstDapp" smart contract.
  const { source, moduleFormat } = await bundleSource(`./${CONTRACT_NAME}.js`);

  // =====================
  // === AWAITING TURN ===
  // =====================

  const installationHandle = await homeP~.zoe~.install(source, moduleFormat);

  // =====================
  // === AWAITING TURN ===
  // =====================
  
  // 1. Assays and payments
  const purse0P = homeP~.wallet~.getPurse('Moola purse');
  const purse1P = homeP~.wallet~.getPurse('Simolean purse');
  const assay0P = purse0P~.getAssay();
  const assay1P = purse1P~.getAssay();
  const payment0P = purse0P~.withdraw(1);
  const payment1P = purse1P~.withdraw(1);

  const [
    purse0,
    purse1,
    assay0,
    assay1,
    payment0,
    payment1
  ] = await Promise.all([
    purse0P,
    purse1P,
    assay0P,
    assay1P,
    payment0P,
    payment1P
  ]);

  // =====================
  // === AWAITING TURN ===
  // =====================

  // 2. Contract instance.
  const { instance, instanceHandle, terms: { assays } } 
    = await homeP~.zoe~.makeInstance(installationHandle, { assays: [assay0, assay1] });

  // =====================
  // === AWAITING TURN ===
  // =====================

  // 3. Offer rules
  const [unit0, unit1, unit2] = await Promise.all([
    assays~.[0]~.makeUnits(1),
    assays~.[1]~.makeUnits(1),
    assays~.[2]~.makeUnits(0),
  ]);

  // =====================
  // === AWAITING TURN ===
  // =====================

  const offerRules = harden({
    payoutRules: [
      {
        kind: 'offerExactly',
        units: unit0,
      },
      {
        kind: 'offerExactly',
        units: unit1,
      },
      {
        kind: 'wantAtLeast',
        units: unit2,
      },
    ],
    exitRule: {
      kind: 'onDemand',
    },
  });

  // 4. Liquidities.

  const payments = [payment0, payment1];

  const { escrowReceipt } = await homeP~.zoe~.escrow(offerRules, payments);

  // =====================
  // === AWAITING TURN ===
  // =====================

  const [liquidityOk, contractId, instanceId] = await Promise.all([
    instance~.addLiquidity(escrowReceipt),
    homeP~.registrar~.register(DAPP_NAME, installationHandle),
    homeP~.registrar~.register(CONTRACT_NAME, instanceHandle),
  ]);

  // =====================
  // === AWAITING TURN ===
  // =====================

  console.log('- installation made', CONTRACT_NAME, '=>',  installationHandle);
  console.log('- instance made', CONTRACT_NAME, '=>', instanceId);
  console.log(liquidityOk);

    // Save the instanceId somewhere where the UI can find it.
  if (liquidityOk) {
    const cjfile = pathResolve(`../ui/src/utils/contractID.js`);
    console.log('writing', cjfile);
    await fs.promises.writeFile(cjfile, `export default ${JSON.stringify(instanceId)};`);

    // =====================
    // === AWAITING TURN ===
    // =====================
  }
}
