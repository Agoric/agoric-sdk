// Agoric Dapp contract deployment script
import fs from 'fs';

const DAPP_NAME = "@DIR@";

export default async function deployContract(homeP, { bundleSource }) {
  // Create a source bundle for the Zoe automaticRefeund contract.
  const { source, moduleFormat } = await bundleSource('./automaticRefund.js');

  const contractHandle = homeP~.zoe~.install(source, moduleFormat);
  const contractId = await homeP~.registrar~.set(DAPP_NAME, contractHandler);
  const contractsJson = JSON.stringify({
    [DAPP_NAME]: contractID,
  });

  // Save the contractID somewhere where the UI can find it.
  await fs.promises.writeFile('../ui/contracts.json', contractsJson);
}
