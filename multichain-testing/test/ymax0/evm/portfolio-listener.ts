import { VStorageMock, type PendingCCTPTransfer } from './vstorage-mock';
import { CCTPStatusChecker } from './cctp-status-checker';

export class PortfolioListener {
  private vstorageKit: VStorageMock;
  private cctpChecker: CCTPStatusChecker;

  constructor(vstorageKit: VStorageMock) {
    this.vstorageKit = vstorageKit;
    this.cctpChecker = new CCTPStatusChecker();
  }

  async start(): Promise<void> {
    console.log('[PortfolioListener] Starting CCTP monitoring...');

    // Get all pending transfers
    const portfolioIds = ['portfolio1', 'portfolio2', 'portfolio3'];
    const pendingTransfers: PendingCCTPTransfer[] = [];

    for (const portfolioId of portfolioIds) {
      const path = `published.ymax0.portfolios.${portfolioId}`;
      const portfolioStatus = this.vstorageKit.readLatest(path);

      if (portfolioStatus?.pendingCCTP) {
        for (const transfer of portfolioStatus.pendingCCTP) {
          if (transfer.status === 'pending') {
            pendingTransfers.push(transfer);
          }
        }
      }
    }

    console.log(`Found ${pendingTransfers.length} pending transfers`);

    const promises = pendingTransfers.map(transfer =>
      this.monitorTransfer(transfer),
    );

    await Promise.all(promises);
    console.log('[PortfolioListener] All transfers finished monitoring');
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
