import { VStorageMock, type PendingCCTPTransfer } from './vstorage-mock';
import { CCTPStatusChecker } from './cctp-status-checker';

export class PortfolioListener {
  private vstorageKit: VStorageMock;
  private cctpChecker: CCTPStatusChecker;
  private isRunning = false;
  private monitoredTransfers = new Set<string>();

  constructor(vstorageKit: VStorageMock) {
    this.vstorageKit = vstorageKit;
    this.cctpChecker = new CCTPStatusChecker();
  }

  start(): void {
    if (this.isRunning) return;

    console.log('[PortfolioListener] Starting continuous CCTP monitoring...');
    this.isRunning = true;

    this.continuousMonitor();
  }

  stop(): void {
    console.log('[PortfolioListener] Stopping CCTP monitoring...');
    this.isRunning = false;
  }

  private async continuousMonitor(): Promise<void> {
    while (this.isRunning) {
      await this.scanForNewTransfers();
      // Check every 10 seconds for new transfers
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  private async scanForNewTransfers(): Promise<void> {
    const portfolioIds = ['portfolio1', 'portfolio2', 'portfolio3'];

    for (const portfolioId of portfolioIds) {
      const path = `published.ymax0.portfolios.${portfolioId}`;
      const portfolioStatus = this.vstorageKit.readLatest(path);

      if (portfolioStatus?.pendingCCTP) {
        for (const transfer of portfolioStatus.pendingCCTP) {
          if (transfer.status === 'pending') {
            // TODO: too fragile. Use a better transfer ID
            const transferId = transfer.destinationAddr;

            // Only start monitoring if we haven't seen this transfer before
            if (!this.monitoredTransfers.has(transferId)) {
              console.log(`New pending transfer detected: ${transferId}`);
              this.monitoredTransfers.add(transferId);

              // Start monitoring this transfer in background
              this.monitorTransfer(transfer).finally(() => {
                this.monitoredTransfers.delete(transferId);
              });
            }
          }
        }
      }
    }
  }

  private async monitorTransfer(transfer: PendingCCTPTransfer): Promise<void> {
    console.log(`Starting to monitor: ${transfer.destinationAddr}`);

    const startTime = Date.now();
    const maxTimeMs = 5 * 60 * 1000; // 5 minutes

    while (true) {
      const elapsedMs = Date.now() - startTime;

      // Timeout check
      if (elapsedMs > maxTimeMs) {
        console.log(
          `Timeout: no data for ${transfer.destinationAddr} after 5 minutes`,
        );
        break;
      }

      console.log(
        `Checking ${transfer.destinationAddr}... (${Math.round(elapsedMs / 1000)}s)`,
      );

      const result = await this.cctpChecker.checkTransferStatus(transfer);

      if (result.isComplete) {
        console.log(
          `✅ Complete: ${transfer.destinationAddr}, Balance: ${result.balance}`,
        );
        // TODO: make offer to the contract to resolve the tx
        break;
      } else if (result.error) {
        console.log(`❌ Error: ${result.error}`);
      } else {
        console.log(`Still pending...`);
      }

      // Wait 20 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 20000));
    }
  }
}
