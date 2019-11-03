import harden from '@agoric/harden';
import { upload } from './upload-contract';

const CONTRACT_NAME = 'zoe:autoswap';
const INITIAL_LIQUIDITY = 900;

// Usage:
// ag-solo bundle -e init-autoswap zoe:autoswap=../node_modules/@agoric/ertp/core/zoe/contracts/autoswap.js

export default async ({ home, bundle }) => {

  console.log('*** AUTOSWAP');

  // AUTOSWAP INSTALL

  // 1. Load & install the autoswap contract.
  await upload(home, bundle, [ CONTRACT_NAME ]);

  // 2. Get the autoswap contract installation.
  const installationHandle = await home~.uploads~.get(CONTRACT_NAME);

  // 3. Store the contract installation in the registry.
  const installationId = await home~.registrar~.register(CONTRACT_NAME, installationHandle);

  console.log('- Autoswap intallation', CONTRACT_NAME, '=>',  installationId);

  // AUTOSWAP INSTANCE

  // 1. Wallet has (at least 2?) purses. Get their assays
  const purses = await Promise.all([
    home~.wallet~.getPurse('Moola purse'),
    home~.wallet~.getPurse('Simolean purse'),
  ]);
  const assays = await Promise.all(
      purses.map(purse => purse~.getAssay()),
  )

  // 2. Contract instance.
  try {
    await home~.zoe~.makeInstance(installationHandle, { assays });
  } catch(e) {}
  const { instance, instanceHandle, terms } = await home~.zoe~.makeInstance(installationHandle, { assays });

  // 3. Offer rules
  const units = await Promise.all([
    terms~.assays~.[0]~.makeUnits(INITIAL_LIQUIDITY),
    terms~.assays~.[1]~.makeUnits(INITIAL_LIQUIDITY),
    terms~.assays~.[2]~.makeUnits(0),
  ]);

  const offerRules = harden({
    payoutRules: [
      {
        kind: 'offerExactly',
        units: units[0],
      },
      {
        kind: 'offerExactly',
        units: units[1],
      },
      {
        kind: 'wantAtLeast',
        units: units[2],
      },
    ],
    exitRule: {
      kind: 'onDemand',
    },
  });

  // 4. Payments
  const payments = await Promise.all([
    purses[0]~.withdraw(INITIAL_LIQUIDITY),
    purses[1]~.withdraw(INITIAL_LIQUIDITY),
  ]);

  // 5. Liquidities.
  const { escrowReceipt } = await home~.zoe~.escrow(offerRules, payments);
  const liquidityOk = await instance~.addLiquidity(escrowReceipt);
  console.log(liquidityOk);

  if (liquidityOk) {
    // Only store if the contract instance has liquidities.    
    const instanceId = await home~.registrar~.register(CONTRACT_NAME, instanceHandle);
    console.log('- Autoswap instance', CONTRACT_NAME, '=>', instanceId);
  }
}
