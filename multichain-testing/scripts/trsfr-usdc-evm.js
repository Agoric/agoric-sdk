import { ethers } from 'ethers';

async function transferUSDC() {
  try {
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    
    // Use environment variable for private key
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY environment variable is required');
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('Using wallet address:', wallet.address);

    // USDC contract
    const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
    const usdcAbi = [
      'function transfer(address to, uint256 amount) returns (bool)',
    ];
    const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, wallet);

    // Send USDC
    const amount = ethers.parseUnits('0.1', 6); // 0.1 USDC (6 decimals)
    const toAddress = '0x2fE4f6C419CAB1D4f68fcE0F865a02681415662c';
    
    console.log('Transferring 0.1 USDC to:', toAddress);
    console.log('Amount in wei:', amount.toString());

    const tx = await usdcContract.transfer(toAddress, amount);
    console.log('Transaction hash:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());
    
  } catch (error) {
    console.error('Error transferring USDC:', error.message);
    process.exit(1);
  }
}

transferUSDC();
