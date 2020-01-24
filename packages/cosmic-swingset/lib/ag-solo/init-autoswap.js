import harden from '@agoric/harden';
import { upload } from './upload-contract';

const CONTRACT_NAME = 'zoe:autoswap';
const INITIAL_LIQUIDITY = 900;

const getLocalUnitOps = assay =>
  Promise.all([
    E(assay).getLabel(),
    E(assay).getExtentOps(),
  ]).then(([label, { name, extentOpsArgs = [] }]) =>
    makeUnitOps(label, name, extentOpsArgs),
  );

// Usage from within an initialized ag-solo directory:
// ag-solo bundle -e init-autoswap zoe:autoswap=node_modules/@agoric/zoe/src/contracts/autoswap.js

export default async ({ home, bundle }) => {

  console.log('*** AUTOSWAP');

  // *********************
  // AUTOSWAP INSTALL
  // *********************

  // 1. Load & install the autoswap contract.

  await upload(home, bundle, [ CONTRACT_NAME ]);

  // =====================
  // === AWAITING TURN ===
  // =====================

  // 2. Get the autoswap contract installation.
  // 3. Store the contract installation in the registry.

  // *********************
  // AUTOSWAP INSTANCE
  // *********************

  const installationHandleP = home~.uploads~.get(CONTRACT_NAME);
  const registrarKeyP = home~.registrar~.register(CONTRACT_NAME, installationHandleP);

  const [installationHandle, registrarKey] 
    = await Promise.all([installationHandleP, registrarKeyP]);

  // =====================
  // === AWAITING TURN ===
  // =====================

  console.log('- Autoswap installation', CONTRACT_NAME, '=>',  registrarKey);

  // 1. Purses, assays, payments.
  const purse0P = home~.wallet~.getPurse('moola purse');
  const purse1P = home~.wallet~.getPurse('simolean purse');
  const assay0P = purse0P~.getAssay();
  const assay1P = purse1P~.getAssay();
  const payment0P = purse0P~.withdraw(INITIAL_LIQUIDITY);
  const payment1P = purse1P~.withdraw(INITIAL_LIQUIDITY);

  const [
    assay0,
    assay1,
    payment0,
    payment1
  ] = await Promise.all([
    assay0P,
    assay1P,
    payment0P,
    payment1P
  ]);

  // =====================
  // === AWAITING TURN ===
  // =====================

  // 2. Contract instance
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

  // 5. Offer rules.
  const offerRules = harden({
    payoutRules: [
      {
        kind: 'offerExactly',
        units: moolaUnitOps.make(INITIAL_LIQUIDITY),
      },
      {
        kind: 'offerExactly',
        units: simoleanUnitOps.make(INITIAL_LIQUIDITY),
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

  const payments = [payment0, payment1, undefined];

  const { seat } = await homeP~.zoe~.redeem(inviteP, offerRules, payments);

  // =====================
  // === AWAITING TURN ===
  // =====================

  // 6. Initial liquidity.
  const liquidityOkP = seat~.addLiquidity();
  const instanceIdP = home~.registrar~.register(CONTRACT_NAME, instanceHandle);

  const [liquidityOk, instanceId] = await Promise.all([liquidityOkP, instanceIdP]); 

  // =====================
  // === AWAITING TURN ===
  // =====================

  console.log('- Autoswap instance', CONTRACT_NAME, '=>', instanceId);
  console.log(liquidityOk);
}
