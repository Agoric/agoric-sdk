import { assertAllDefined } from '@agoric/internal';
import { makeSerializeToStorage } from '@agoric/internal/src/lib-chainStorage.js';
import { M } from '@agoric/store';
import { E } from '@endo/far';
import { SubscriberShape } from './publish-kit.js';
import { forEachPublicationRecord } from './storesub.js';

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
 * NB: caller must ensure that `publisher.finish()` or `publisher.fail()` is
 * called when the publisher stores its final value.
 * Otherwise this watch is retained and can't be GCed.
 *
 * @param {Subscriber<any>} topic
 * @param {ERef<StorageNode>} storageNode
 * @param {ERef<ReturnType<import('@endo/marshal').makeMarshal>>} marshaller
 * @returns {void}
 */
export const pipeTopicToStorage = (topic, storageNode, marshaller) => {
  assertAllDefined({ topic, storageNode, marshaller });

  const marshallToStorage = makeSerializeToStorage(storageNode, marshaller);

  // Start publishing the source.
  forEachPublicationRecord(topic, marshallToStorage).catch(err => {
    // TODO: How should we handle and/or surface this failure?
    // https://github.com/Agoric/agoric-sdk/pull/5766#discussion_r922498088
    console.error('followAndStoreTopic failed to iterate', err);
  });
};
harden(pipeTopicToStorage);

/**
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
