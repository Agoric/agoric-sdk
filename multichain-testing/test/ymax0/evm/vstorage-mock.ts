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
export class VStorageMock {
  private data = new Map<string, any>();
  private subscriptions = new Map<string, Set<(data: any) => void>>();

  /**
   * Simulate publishing data to vstorage path
   */
  setValue(path: string, data: any): void {
    console.log(
      `[VStorageMock] Setting ${path}:`,
      JSON.stringify(data, null, 2),
    );
    this.data.set(path, data);

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
    const data = this.data.get(path);
    console.log(
      `[VStorageMock] Reading ${path}:`,
      JSON.stringify(data, null, 2),
    );
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
    this.data.clear();
    this.subscriptions.clear();
  }
}

export const vstorageKit = new VStorageMock();
