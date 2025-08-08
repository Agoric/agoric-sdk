import './lockdown';
import { depositForBurn } from './depositForBurn';
import { updateVStorage } from './update-vstorage';

/**
 * Performs an off-chain CCTP transfer to the address `0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF`.
 *
 * The `updateVStorage` function creates a dummy portfolio entry in vstorage on devnet.
 * For this to work correctly, ensure the A3P chain is running locally.
 *
 * This is because `updateVStorage` internally performs a contract call to the `resolverMock` contract.
 * That contract interaction requires the A3P chain to be active, since the offer to the contract is made
 * by:
 *   1. Preparing the offer file
 *   2. Copying it into the A3P container
 *   3. Executing the offer using the address `agoric1ee9hr0jyrxhy999y755mp862ljgycmwyp4pl7q` on the container
 */

const simulateContractCall = async () => {
  console.log('Simulate Contract Call');

  await updateVStorage({
    vPath: 'portfolio1',
    vData: {
      pendingCCTPTransfers: {
        Ethereum: {
          caip: 'eip155:11155111',
          receiver: '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF',
          amount: 1000000,
          status: 'pending',
        },
      },
    },
  });
  await depositForBurn();
};

simulateContractCall();
