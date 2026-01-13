import type { ProgressTracker } from '@agoric/orchestration';
import type { TxId } from '@agoric/portfolio-api';

export const setTailTxId = (
  progressTracker: ProgressTracker | undefined,
  txId: TxId,
) => {
  if (!progressTracker) {
    return;
  }
  const progressReport = progressTracker.getCurrentProgressReport();
  const newReport = {
    ...progressReport,
    tailTxId: txId,
  };
  progressTracker.update(newReport);
};
