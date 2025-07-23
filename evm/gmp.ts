// import { config } from 'dotenv';
import { createRemoteEVMAccount } from './portfolio-helpers';

// config();

// Remote Address Avalanche: 0xf0809c0c67A411A58B936D1adF82C6A8c3632a5e

const main = async () => {
  try {
    await createRemoteEVMAccount({
      destinationEVMChain: 'Avalanche',
      amount: 2_000_000_0,
    });
  } catch (error) {
    console.error('Error during the transaction:', error);
  }
};

main();
