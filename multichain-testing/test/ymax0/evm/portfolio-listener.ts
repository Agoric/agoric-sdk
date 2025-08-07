import { VStorageMock, type PendingCCTPTransfer } from './vstorage-mock';
import { CCTPStatusChecker } from './cctp-status-checker';
import { ethers } from 'ethers';

export class PortfolioListener {
  private vstorageKit: VStorageMock;
  private cctpChecker: CCTPStatusChecker;
  private isRunning = false;
  private monitoredTransfers = new Set<string>();

  private provider = new ethers.JsonRpcProvider(
    'https://ethereum-sepolia-rpc.publicnode.com',
  );
  private bridgeAddress = '0x9f3b8679c73c2fef8b59b4f3444d4e156fb70aa5';
  private bridgeAbi = [
    'event MintAndWithdraw(address indexed mintRecipient, uint256 amount, address indexed mintToken)',
  ];
  private bridgeContract = new ethers.Contract(
    this.bridgeAddress,
    this.bridgeAbi,
    this.provider,
  );

  constructor(vstorageKit: VStorageMock) {
    this.vstorageKit = vstorageKit;
    this.cctpChecker = new CCTPStatusChecker();
  }

  start(): void {
    if (this.isRunning) return;

    console.log('[PortfolioListener] Starting continuous CCTP monitoring...');
    this.isRunning = true;

    this.setupMintAndWithdrawListener();
    this.continuousMonitor();
  }

  stop(): void {
    console.log('[PortfolioListener] Stopping CCTP monitoring...');
    this.isRunning = false;
    this.bridgeContract.removeAllListeners('MintAndWithdraw');
  }

  private setupMintAndWithdrawListener(): void {
    console.log(
      '[PortfolioListener] Setting up MintAndWithdraw event listener...',
    );

    this.bridgeContract.on(
      'MintAndWithdraw',
      async (
        recipient: string,
        amount: ethers.BigNumberish,
        token: string,
        event: ethers.Event,
      ) => {
        console.log(
          `📥 Detected MintAndWithdraw: to=${recipient}, amount=${amount}, token=${token}`,
        );

        if (!this.monitoredTransfers.has(recipient)) {
          console.log(
            `[PortfolioListener] Detected new bridged USDC for ${recipient}. Triggering monitorTransfer...`,
          );

          // Simulate a fake PendingCCTPTransfer for compatibility
          const transfer: PendingCCTPTransfer = {
            sourceDomain: 0, // Fill appropriately if needed
            destinationAddr: recipient,
            status: 'pending',
            // Include more fields if your logic expects them
          };

          this.monitoredTransfers.add(recipient);
          this.monitorTransfer(transfer).finally(() => {
            this.monitoredTransfers.delete(recipient);
          });
        }
      },
    );
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
