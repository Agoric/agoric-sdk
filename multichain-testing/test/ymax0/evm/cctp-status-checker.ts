import { ethers } from 'ethers';
import { type PendingCCTPTransfer } from './vstorage-mock';

export interface CCTPStatusResult {
  transfer: PendingCCTPTransfer;
  isComplete: boolean;
  balance?: string;
  error?: string;
}

const domainToRpc = {
  // TODO: will it work in prod or we need to use some paid service
  0: 'https://ethereum-sepolia-rpc.publicnode.com', // Ethereum Sepolia (free public RPC)
  1: 'https://api.avax-test.network/ext/bc/C/rpc', // Avalanche Fuji
};

const usdcAddresses = {
  0: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Ethereum Sepolia USDC
  1: '0x5425890298aed601595a70AB815c96711a31Bc65', // Avalanche Fuji USDC
};

export class CCTPStatusChecker {
  async checkTransferStatus(
    transfer: PendingCCTPTransfer,
  ): Promise<CCTPStatusResult> {
    try {
      const rpcUrl = domainToRpc[transfer.destinationDomain];
      if (!rpcUrl) {
        return {
          transfer,
          isComplete: false,
          error: `No RPC configured for domain ${transfer.destinationDomain}`,
        };
      }

      const balance = await this.checkUSDCBalance(
        rpcUrl,
        transfer.destinationAddr,
        transfer.destinationDomain,
      );

      const expectedAmount = BigInt(transfer.amount);
      const currentBalance = BigInt(balance);
      const isComplete = currentBalance >= expectedAmount;

      return {
        transfer,
        isComplete,
        balance: balance,
      };
    } catch (error) {
      return {
        transfer,
        isComplete: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkUSDCBalance(
    rpcUrl: string,
    address: string,
    domain: number,
  ): Promise<string> {
    const usdcAddress = usdcAddresses[domain];
    if (!usdcAddress) {
      throw new Error(`USDC address not configured for domain ${domain}`);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
    const contract = new ethers.Contract(usdcAddress, usdcAbi, provider);
    const balance = await contract.balanceOf(address);
    return balance.toString();
  }
}
