import type { ProgressTracker } from '@agoric/orchestration';
import type { TxId } from '@agoric/portfolio-api';

/**
 * Add the given txIds at the end of progressTracker's updated progress report.
 */
export const setAppendedTxIds = (
  progressTracker: ProgressTracker | undefined,
  txIds: TxId[],
) => {
  if (!progressTracker) {
    // No progress tracker to update.
    return;
  }

  const progressReport = progressTracker.getCurrentProgressReport();
  const newReport = {
    ...progressReport,
    appendTxIds: txIds,
  };
  progressTracker.update(newReport);
};
