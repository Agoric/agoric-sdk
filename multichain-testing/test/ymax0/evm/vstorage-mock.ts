/**
 * Mock vstorage implementation for testing Execution Engine and Resolver
 */

export type PendingCCTPTransfer = {
  destinationAddr: string; // 0x address on destination chain
  amount: string; // amount to send in base units (e.g., "1000000" for 1 USDC)
  destinationDomain: number; // CCTP domain ID (0 for Ethereum, etc.)
  mintRecipient: string; // bytes32 representation of destination address
  burnToken: string; // token denom (e.g., "uusdc")
  status: 'pending' | 'completed' | 'failed';
};

export type PortfolioStatus = {
  positionKeys: string[];
  flowCount: number;
  accountIdByChain: Record<string, string>;
  depositAddress?: string;
  targetAllocation?: Record<string, any>;
  pendingCCTP?: PendingCCTPTransfer[];
};

const addressToBytes32 = (addr: string) => {
  const cleanedAddr = addr.replace(/^0x/, '');
  const zeroesNeeded = 64 - cleanedAddr.length;
  const paddedAddress = '0'.repeat(zeroesNeeded) + cleanedAddr;
  return `0x${paddedAddress}`;
};

/**
 * Mock vstorage implementation
 */
import * as fs from 'fs';
import * as path from 'path';

const DATA_FILE = path.join(__dirname, 'vstorage-data.json');

export class VStorageMock {
  private subscriptions = new Map<string, Set<(data: any) => void>>();

  private loadData(): Map<string, any> {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const jsonData = fs.readFileSync(DATA_FILE, 'utf8');
        const obj = JSON.parse(jsonData);
        return new Map(Object.entries(obj));
      }
    } catch (error) {
      console.warn('Failed to load vstorage data:', error);
    }
    return new Map();
  }

  private saveData(data: Map<string, any>): void {
    try {
      const obj = Object.fromEntries(data);
      fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2));
    } catch (error) {
      console.error('Failed to save vstorage data:', error);
    }
  }

  /**
   * Simulate publishing data to vstorage path
   */
  setValue(path: string, data: any): void {
    console.log(
      `[VStorageMock] Setting ${path}:`,
      JSON.stringify(data, null, 2),
    );
    
    const allData = this.loadData();
    allData.set(path, data);
    this.saveData(allData);

    // Notify subscribers
    const subs = this.subscriptions.get(path);
    if (subs) {
      subs.forEach(callback => callback(data));
    }
  }

  /**
   * Read latest data from vstorage path
   */
  readLatest(path: string): any {
    const allData = this.loadData();
    const data = allData.get(path);
    return data;
  }

  /**
   * Subscribe to changes on a vstorage path
   */
  subscribe(path: string, callback: (data: any) => void): () => void {
    if (!this.subscriptions.has(path)) {
      this.subscriptions.set(path, new Set());
    }
    this.subscriptions.get(path)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(path);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscriptions.delete(path);
        }
      }
    };
  }

  /**
   * Mock adding a pending CCTP transfer before depositForBurn
   */
  addPendingCCTPTransfer(
    portfolioId: string,
    transfer: {
      destinationAddr: string;
      amount: string;
      destinationDomain: number;
      burnToken: string;
    },
  ): void {
    const path = `published.ymax0.portfolios.${portfolioId}`;
    const currentStatus = this.readLatest(path) || {
      positionKeys: [],
      flowCount: 0,
      accountIdByChain: {},
    };

    const pendingTransfer: PendingCCTPTransfer = {
      destinationAddr: transfer.destinationAddr,
      amount: transfer.amount,
      destinationDomain: transfer.destinationDomain,
      mintRecipient: addressToBytes32(transfer.destinationAddr),
      burnToken: transfer.burnToken,
      status: 'pending',
    };

    const updatedStatus: PortfolioStatus = {
      ...currentStatus,
      pendingCCTP: [...(currentStatus.pendingCCTP || []), pendingTransfer],
    };

    this.setValue(path, updatedStatus);
  }

  /**
   * Mock completing a CCTP transfer after depositForBurn
   */
  completeCCTPTransfer(
    portfolioId: string,
    destinationAddr: string,
    status: 'completed' | 'failed' = 'completed',
  ): void {
    const path = `published.ymax0.portfolios.${portfolioId}`;
    const currentStatus = this.readLatest(path);

    if (!currentStatus || !currentStatus.pendingCCTP) {
      console.warn(
        `[VStorageMock] No pending CCTP transfers found for ${portfolioId}`,
      );
      return;
    }

    const updatedTransfers = currentStatus.pendingCCTP.map(
      (transfer: PendingCCTPTransfer) =>
        transfer.destinationAddr === destinationAddr
          ? { ...transfer, status }
          : transfer,
    );

    const updatedStatus = {
      ...currentStatus,
      pendingCCTP: updatedTransfers,
    };

    this.setValue(path, updatedStatus);
  }

  /**
   * Clear all data (for test cleanup)
   */
  clear(): void {
    try {
      if (fs.existsSync(DATA_FILE)) {
        fs.unlinkSync(DATA_FILE);
      }
    } catch (error) {
      console.warn('Failed to clear vstorage data:', error);
    }
    this.subscriptions.clear();
  }
}

export const vstorageKit = new VStorageMock();
