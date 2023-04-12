import { M } from '@agoric/store';
import { E } from '@endo/far';
import { SubscriberShape } from './publish-kit.js';

// XXX PublicTopic is a higher level concern
export const PublicTopicShape = M.splitRecord(
  {
    subscriber: SubscriberShape,
    storagePath: M.promise(/* string */),
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

export const TopicsRecordShape = M.recordOf(M.string(), PublicTopicShape);

/**
 * @typedef {{
 *   [topicName: string]: PublicTopic<unknown>,
 * }} TopicsRecord
 */

/**
 * If the subscriber and storageNode are coming from a Recorder kit,
 * use a makePublicTopic that takes that object directly.
 *
 * @template T
 * @param {string} description
 * @param {Subscriber<T>} subscriber
 * @param {ERef<StorageNode>} storageNode
 * @returns {PublicTopic<T>}
 */
export const makePublicTopic = (description, subscriber, storageNode) => {
  return {
    description,
    subscriber,
    storagePath: E(storageNode).getPath(),
  };
};
