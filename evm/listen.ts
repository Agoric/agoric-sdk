import { ethers } from 'ethers';
import { axelarChainsMap } from './portfolio-helpers';
import contractABI from './abi.json';

const provider = new ethers.WebSocketProvider(
  'wss://api.avax-test.network/ext/bc/C/ws',
);
const contractAddress = axelarChainsMap.Avalanche.contractAddresses.factory;

const contract = new ethers.Contract(contractAddress, contractABI, provider);

// const iface = new ethers.Interface(contractABI);
// for (const fragment of iface.fragments) {
//   if (fragment.type === 'event') {
//     console.log('Event name:', fragment);
//   }
// }

console.log('Listening for events on Avalanche Fuji Testnet...');

contract.on(
  'SmartWalletCreated',
  (wallet, owner, sourceChain, sourceAddress, event) => {
    console.log('Smart Wallet Created!');
    console.log('Wallet address:', wallet);
    console.log('Owner:', owner);
    console.log('Source Chain:', sourceChain);
    console.log('Source Address:', sourceAddress);
  },
);
