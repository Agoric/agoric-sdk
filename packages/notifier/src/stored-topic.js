import { assertAllDefined } from '@agoric/internal';
import { makeMarshallToStorage } from '@agoric/internal/src/lib-chainStorage.js';
import { forEachPublicationRecord } from './storesub.js';

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

  const marshallToStorage = makeMarshallToStorage(storageNode, marshaller);

  // Start publishing the source.
  forEachPublicationRecord(topic, marshallToStorage).catch(err => {
    // TODO: How should we handle and/or surface this failure?
    // https://github.com/Agoric/agoric-sdk/pull/5766#discussion_r922498088
    console.error('followAndStoreTopic failed to iterate', err);
  });
};
harden(pipeTopicToStorage);
