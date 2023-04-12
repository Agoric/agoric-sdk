import { E } from '@endo/eventual-send';

/**
 * @template T
 * @param {string} description
 * @param {import('./recorder.js').RecorderKit<T> | import('./recorder.js').EventualRecorderKit<T>} recorderKit
 * @returns {import('@agoric/notifier').PublicTopic<T>}
 */
export const makeRecorderTopic = (description, recorderKit) => {
  const recP =
    'recorder' in recorderKit ? recorderKit.recorder : recorderKit.recorderP;
  return {
    description,
    subscriber: recorderKit.subscriber,
    storagePath: E(recP).getStoragePath(),
  };
};
