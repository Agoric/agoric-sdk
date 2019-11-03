// Agoric Dapp contract deployment script
import fs from 'fs';

import harden from '@agoric/harden';

const DAPP_NAME = "@DIR@";

export default async function deployContract(homeP, { bundleSource, pathResolve }) {
  // Create a source bundle for the "myFirstDapp" smart contract.
  //const { source, moduleFormat } = await bundleSource(`./myFirstDapp.js`);
  const { source, moduleFormat } = await bundleSource(`./autoswap.js`);

  const installationHandle = await homeP~.zoe~.install(source, moduleFormat);
  const contractId = await homeP~.registrar~.register(DAPP_NAME, installationHandle);

  const CONTRACT_NAME = 'myFirstDapp';

  console.log('- myFirstDapp installed', CONTRACT_NAME, '=>',  installationHandle);
  
  // 1. Assays
  const assays = await Promise.all([
    homeP~.moolaMint~.getAssay(),
    homeP~.simoleanMint~.getAssay(),
  ]);

  // 2. Contract instance.
  try {
    await homeP~.zoe~.makeInstance(installationHandle, { assays });
  } catch(e) {}
  const { instance, instanceHandle, terms } = await homeP~.zoe~.makeInstance(installationHandle, { assays });

  // 3. Offer rules
  const units = await Promise.all([
    terms~.assays~.[0]~.makeUnits(1),
    terms~.assays~.[1]~.makeUnits(1),
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

  // 4. Payments (from mint, not from purse)

  const faucets = await Promise.all([
    homeP~.moolaMint~.mint(units[0]),
    homeP~.simoleanMint~.mint(units[1]),
  ]);

  const payments = await Promise.all([
    faucets[0]~.withdrawAll(),
    faucets[1]~.withdrawAll(),
  ]);

  // 5. Liquidities.
  const { escrowReceipt } = await homeP~.zoe~.escrow(offerRules, payments);
  const liquidityOk = await instance~.addLiquidity(escrowReceipt);
  console.log(liquidityOk);

  if (liquidityOk) {
    // Only store if the contract instance has liquidity.    
    const instanceId = await homeP~.registrar~.register(CONTRACT_NAME, instanceHandle);
    console.log('- Autoswap instance', CONTRACT_NAME, '=>', instanceId);

    // Save the instanceId somewhere where the UI can find it.
    const cjfile = pathResolve(`../ui/src/utils/contractID.js`);
    console.log('writing', cjfile);
    await fs.promises.writeFile(cjfile, `export default ${JSON.stringify(instanceId)};`);
  }
}
