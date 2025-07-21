import { checkBalanceEVM } from './utils';

const main = async () => {
  checkBalanceEVM({
    walletAddress: '0xb49F309041Ef6ED80A218eA2873233bd4af64024',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    tokens: [
      '0x5425890298aed601595a70AB815c96711a31Bc65', // USDC on Avalanche Fuji
    ],
  });
};

main();
