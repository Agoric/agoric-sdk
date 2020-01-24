// Agoric Dapp contract deployment script
import fs from 'fs';

import harden from '@agoric/harden';
import { makeUnitOps } from '@agoric/ertp/core/unitOps';

const DAPP_NAME = "@DIR@";

const getLocalUnitOps = assay =>
  Promise.all([
    E(assay).getLabel(),
    E(assay).getExtentOps(),
  ]).then(([label, { name, extentOpsArgs = [] }]) =>
    makeUnitOps(label, name, extentOpsArgs),
  );

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

  // 2. Make contract and get instanceHandle
  const inviteP
    = homeP~.zoe~.makeInstance(installationHandle, { assays: [assay0, assay1] });
  const {
    extent: { instanceHandle },
  } = await inviteP~.getBalance();
    
  // =====================
  // === AWAITING TURN ===
  // =====================

  // 3. Get assays, including liquidity assay  
  const { assays } = await homeP~.zoe~.getInstance(instanceHandle);

  // =====================
  // === AWAITING TURN ===
  // =====================

  // 4. Get local unitOps for all assays
  const liquidityAssay = assays[2];
  const [moolaUnitOps, simoleanUnitOps, liquidityUnitOps] = await Promise.all([getLocalUnitOps(assay0), getLocalUnitOps(assay1), getLocalUnitOps(liquidityAssay)]);

  // =====================
  // === AWAITING TURN ===
  // =====================

  // 5. Redeem invite and escrow with Zoe

  const offerRules = harden({
    payoutRules: [
      {
        kind: 'offerExactly',
        units: moolaUnitOps.make(1),
      },
      {
        kind: 'offerExactly',
        units: simoleanUnitOps.make(1),
      },
      {
        kind: 'wantAtLeast',
        units: liquidityUnitOps.make(0),
      },
    ],
    exitRule: {
      kind: 'onDemand',
    },
  });

  // 4. Liquidities.

  const payments = [payment0, payment1, undefined];

  const { seat } = await homeP~.zoe~.redeem(inviteP, offerRules, payments);

  // =====================
  // === AWAITING TURN ===
  // =====================

  const [liquidityOk, contractId, instanceId] = await Promise.all([
    seat~.addLiquidity(),
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
