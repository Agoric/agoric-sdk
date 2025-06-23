import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { config } from 'dotenv';

config();

const { GATEWAY_CONTRACT, GAS_SERVICE_CONTRACT } = process.env;

console.log('Deploying with Gateway:', GATEWAY_CONTRACT);
console.log('Deploying with Gas Service:', GAS_SERVICE_CONTRACT);

if (!GATEWAY_CONTRACT || !GAS_SERVICE_CONTRACT) {
  throw new Error('Missing env vars');
}

export default buildModule('FactoryModule', (m) => {
  const gateway = m.getParameter('gateway_', GATEWAY_CONTRACT);
  const gasService = m.getParameter('gasReceiver_', GAS_SERVICE_CONTRACT);
  const chainName = m.getParameter('chainName_', 'Avalanche');

  const factory = m.contract('Factory', [gateway, gasService, chainName]);

  return { factory };
});
