import type { ProgressTracker } from '@agoric/orchestration';
import type { TxId } from '@agoric/portfolio-api';

/**
 * Add the given txIds at the end of progressTracker's updated progress report.
 *
 * Take care to append in causal order.
 */
export const appendTxIds = (
  progressTracker: ProgressTracker | undefined,
  txIds: TxId[],
) => {
  if (!progressTracker) {
    // No progress tracker to update.
    return;
  }

  const progressReport = progressTracker.getCurrentProgressReport();
  const { appendedTxIds: current } = progressReport;
  const newReport = {
    ...progressReport,
    appendedTxIds: [...(current || []), ...txIds],
  };
  progressTracker.update(newReport);
};
