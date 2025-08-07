import { vstorageKit } from './vstorage-mock';
import { depositForBurn } from './depositForBurn';

export const createMockPortfolioWithPendingCCTP = (
  portfolioId: string = 'portfolio1',
  destinationAddr: string = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF',
  amount: string = '1000000', // 1 USDC
): void => {
  // Set up basic portfolio status
  vstorageKit.setValue(`published.ymax0.portfolios.${portfolioId}`, {
    positionKeys: [],
    flowCount: 0,
    accountIdByChain: {
      agoric: 'agoric1test',
      noble: 'noble1test',
      ethereum: 'eip155:1:0x123...',
    },
    depositAddress: 'agoric1test',
  });

  vstorageKit.addPendingCCTPTransfer(portfolioId, {
    destinationAddr,
    amount,
    destinationDomain: 0,
    burnToken: 'uusdc',
  });

  console.log(
    `[VStorageMock] Created mock portfolio ${portfolioId} with pending CCTP transfer`,
  );
  console.log(`  - Destination: ${destinationAddr}`);
  console.log(`  - Amount: ${amount} uusdc`);
};

const runMockContractCall = async () => {
  console.log('Starting Mock Contract Call with vstorage Integration');
  console.log('='.repeat(60));
  createMockPortfolioWithPendingCCTP();
  await depositForBurn();
};

runMockContractCall();
