import { SubscriberShape } from '@agoric/notifier';
import { M } from '@agoric/store';
import { E } from '@endo/far';

export { SubscriberShape };

export const PublicTopicShape = M.splitRecord(
  {
    subscriber: SubscriberShape,
    storagePath: M.or(M.promise(/* string */), M.string()),
  },
  { description: M.string() },
);

/**
 * @template {object} T topic value
 * @typedef {{
 *   description?: string,
 *   subscriber: Subscriber<T>,
 *   storagePath: ERef<string>,
 * }} PublicTopic
 */

/**
 * A {PublicTopic} in which the `storagePath` is always a resolved string.
 *
 * Useful when working with Vows and async-flow.
 *
 * @template {object} T topic value
 * @typedef {{
 *   description?: string,
 *   subscriber: Subscriber<T>,
 *   storagePath: string,
 * }} ResolvedPublicTopic
 */

export const TopicsRecordShape = M.recordOf(M.string(), PublicTopicShape);

/**
 * @typedef {{
 *   [topicName: string]: PublicTopic<unknown>,
 * }} TopicsRecord
 */

/**
 * @template T
 * @param {string} description
 * @param {import('./recorder.js').RecorderKit<T> | import('./recorder.js').EventualRecorderKit<T>} recorderKit
 * @returns {PublicTopic<T>}
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
