import harden from '@agoric/harden';
import { upload } from './upload-contract';

const CONTRACT_NAME = 'zoe:autoswap';
const INITIAL_LIQUIDITY = 900;

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
  const installationIdP = home~.registrar~.register(CONTRACT_NAME, installationHandleP);

  const [installationHandle, installationId] 
    = await Promise.all([installationHandleP, installationIdP]);

  // =====================
  // === AWAITING TURN ===
  // =====================

  console.log('- Autoswap intallation', CONTRACT_NAME, '=>',  installationId);

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

  // 2. Contract instance, contract assays.
  const invite = 
    await home~.zoe~.makeInstance(installationHandle, { assays: [assay0, assay1] });
    
  // =====================
  // === AWAITING TURN ===
  // =====================

  // 3. Get the instanceHandle

  const {
    extent: { instanceHandle },
  } = await invite~.getBalance();

  // =====================
  // === AWAITING TURN ===
  // =====================

  // 4. Get the contract terms and assays

  const { terms: { assays }} = await home~.zoe~.getInstance(instanceHandle);

  // =====================
  // === AWAITING TURN ===
  // =====================

  // 5. Offer rules.
  const unit0P = assays~.[0]~.makeUnits(INITIAL_LIQUIDITY);
  const unit1P = assays~.[1]~.makeUnits(INITIAL_LIQUIDITY);
  const unit2P = assays~.[2]~.makeUnits(0);

  const [
    unit0,
    unit1, 
    unit2,
  ] = await Promise.all([
    unit0P,
    unit1P,
    unit2P,
  ]);

  // =====================
  // === AWAITING TURN ===
  // =====================

  const offerRules = harden({
    payoutRules: [
      {
        kind: 'offerAtMost',
        units: unit0,
      },
      {
        kind: 'offerAtMost',
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

  const { seat, payout } = await home~.zoe~.redeem(invite, offerRules, [payment0, payment1]);

  // =====================
  // === AWAITING TURN ===
  // =====================

  // 4. Initial liquidity.
  const liquidityOkP = invite~.addLiquidity();
  const instanceIdP = home~.registrar~.register(CONTRACT_NAME, instanceHandle);

  const [liquidityOk, instanceId] = await Promise.all([liquidityOkP, instanceIdP]); 

  // =====================
  // === AWAITING TURN ===
  // =====================

  console.log('- Autoswap instance', CONTRACT_NAME, '=>', instanceId);
  console.log(liquidityOk);
}
