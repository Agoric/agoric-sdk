import { Fail } from '@agoric/assert';
import { StorageNodeShape } from '@agoric/internal';
import { prepareDurablePublishKit } from '@agoric/notifier';
import { mustMatch } from '@agoric/store';
import { M, prepareExoClass } from '@agoric/vat-data';
import { E } from '@endo/eventual-send';

/**
 * Recorders support publishing data to vstorage.
 *
 * `Recorder` is similar to `Publisher` (in that they send out data) but has
 *    different signatures:
 * - methods are async because they await remote calls to Marshaller and StorageNode
 * - method names convey the durability
 * - omits fail()
 * - adds getStorageNode() from its durable state
 *
 * Other names such as StoredPublisher or ChainStoragePublisher were considered,
 * but found to be sometimes confused with *durability*, another trait of this class.
 */

/**
 * @template T
 * @typedef {{ getStorageNode(): ERef<StorageNode>, getStoragePath(): Promise<string>, write(value: T): Promise<void>, writeFinal(value: T): Promise<void> }} Recorder
 */

/**
 * @template T
 * @typedef {Pick<PublishKit<T>, 'subscriber'> & { recorder: Recorder<T> }} RecorderKit
 */

/**
 * @template T
 * @typedef {Pick<PublishKit<T>, 'subscriber'> & { recorderP: ERef<Recorder<T>> }} EventualRecorderKit
 */

const serializeToStorageIfOpen = async (state, value, marshaller, node) => {
  const { closed, valueShape } = state;
  !closed || Fail`cannot write to closed recorder`;
  mustMatch(value, valueShape);
  const encoded = await E(marshaller).toCapData(value);
  const serialized = JSON.stringify(encoded);
  await E(node).setValue(serialized);
};

/**
 * Wrap a Publisher to record all the values to chain storage at a child of the
 * given storage node.
 *
 * We need to be able to create durable recorders synchronously for child
 * storageNodes. Since creating the child node is async, we'll record the
 * address and make the child node lazily, so the maker can return immediately.
 *
 * @param {import('@agoric/zoe').Baggage} baggage
 * @param {ERef<Marshaller>} marshaller
 */
export const prepareRecorder = (baggage, marshaller) => {
  const makeRecorder = prepareExoClass(
    baggage,
    'Recorder',
    M.interface('Recorder', {
      getStorageNode: M.call().returns(M.eref(StorageNodeShape)),
      getStoragePath: M.call().returns(M.promise(/* string */)),
      write: M.call(M.any()).returns(M.promise()),
      writeFinal: M.call(M.any()).returns(M.promise()),
    }),
    /**
     * @template T
     * @param {PublishKit<T>['publisher']} publisher
     * @param {ERef<StorageNode>} storageNode
     * @param {TypedMatcher<T>} [valueShape]
     * @param {string} [childName]
     */
    (
      publisher,
      storageNode,
      valueShape = /** @type {TypedMatcher<any>} */ (M.any()),
      childName,
    ) => {
      const childNode = childName ? undefined : storageNode;

      return {
        closed: false,
        publisher,
        parentStorageNode: storageNode,
        storageNode: /** @type {ERef<StorageNode>}*/ (childNode),
        childName,
        storagePath: /** @type {string | undefined} */ (undefined),
        valueShape,
      };
    },
    {
      getStorageNode() {
        const {
          state: { storageNode, childName, parentStorageNode },
        } = this;
        if (!childName) {
          return parentStorageNode;
        }

        if (storageNode) {
          return storageNode;
        }

        return E(parentStorageNode).makeChildNode(childName);
      },
      /**
       * Memoizes the remote call to the storage node
       *
       * @returns {Promise<string>}
       */
      async getStoragePath() {
        const { state, self } = this;
        const { storagePath: heldPath } = state;
        // end synchronous prelude
        await null;
        if (heldPath !== undefined) {
          return heldPath;
        }
        const path = await E(self.getStorageNode()).getPath();
        state.storagePath = path;
        return path;
      },
      /**
       * Marshalls before writing to storage or publisher to help ensure the two streams match.
       *
       * @param {unknown} value
       * @returns {Promise<void>}
       */
      async write(value) {
        const { state, self } = this;

        const storageNode = self.getStorageNode();
        await serializeToStorageIfOpen(state, value, marshaller, storageNode);
        return state.publisher.publish(value);
      },
      /**
       * Like `write` but prevents future writes and terminates the publisher.
       *
       * @param {unknown} value
       * @returns {Promise<void>}
       */
      async writeFinal(value) {
        const { self, state } = this;
        const storageNode = self.getStorageNode();
        await serializeToStorageIfOpen(state, value, marshaller, storageNode);
        this.state.closed = true;
        return state.publisher.finish(value);
      },
    },
    {
      finish: ({ state }) => {
        if (state.childName) {
          // XXX Doesn't the catch clause satisfy our requirement?
          void E.when(
            E(state.parentStorageNode).makeChildNode(state.childName),
            childNode => {
              state.storageNode = childNode;
            },
            e =>
              Fail`Unable ${e} to create child node for ${
                state.childName
              } on ${E(state.parentStorageNode).getPath()}`,
          );
        }
      },
    },
  );

  return makeRecorder;
};
harden(prepareRecorder);
/** @typedef {ReturnType<typeof prepareRecorder>} MakeRecorder */

/**
 * `makeRecorderKit` is suitable for making a durable `RecorderKit` which can be held in Exo state.
 *
 * @see {defineERecorderKit}
 *
 * @param {{makeRecorder: MakeRecorder, makeDurablePublishKit: ReturnType<typeof prepareDurablePublishKit>}} makers
 */
export const defineRecorderKit = ({ makeRecorder, makeDurablePublishKit }) => {
  /**
   * @template T
   * @param {ERef<StorageNode>} storageNode
   * @param {TypedMatcher<T>} [valueShape]
   * @param {string} [childName]
   * @returns {RecorderKit<T>}
   */
  const makeRecorderKit = (storageNode, valueShape, childName = undefined) => {
    const { subscriber, publisher } = makeDurablePublishKit();
    const recorder = makeRecorder(
      publisher,
      storageNode,
      valueShape,
      childName,
    );
    return harden({ subscriber, recorder });
  };
  return makeRecorderKit;
};
/** @typedef {ReturnType<typeof defineRecorderKit>} MakeRecorderKit */

/**
 * Convenience wrapper to prepare the DurablePublishKit and Recorder kinds.
 * Note that because prepareRecorder() can only be called once per vat instance,
 * this should only be used when there is no need for an EventualRecorderKit.
 * When EventualRecorderKits are needed, prepare the kinds separately and pass
 * them to the kit definers.
 *
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {ERef<Marshaller>} marshaller
 */
export const prepareRecorderKit = (baggage, marshaller) => {
  const makeDurablePublishKit = prepareDurablePublishKit(
    baggage,
    'Durable Publish Kit',
  );
  const makeRecorder = prepareRecorder(baggage, marshaller);
  return defineRecorderKit({ makeDurablePublishKit, makeRecorder });
};

/**
 * Convenience wrapper for DurablePublishKit and Recorder kinds.
 *
 * NB: this defines two durable kinds. Must be called at most once per vat instance.
 *
 * `makeRecorderKit` is suitable for making a durable `RecorderKit` which can be held in Exo state.
 *
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {ERef<Marshaller>} marshaller
 */
export const prepareRecorderKitMakers = (baggage, marshaller) => {
  const makeDurablePublishKit = prepareDurablePublishKit(
    baggage,
    'Durable Publish Kit',
  );
  const makeRecorder = prepareRecorder(baggage, marshaller);

  const makeRecorderKit = defineRecorderKit({
    makeRecorder,
    makeDurablePublishKit,
  });

  return harden({
    makeDurablePublishKit,
    makeRecorder,
    makeRecorderKit,
  });
};

/**
 * Stop-gap until https://github.com/Agoric/agoric-sdk/issues/6160
 * explictly specify the type that the Pattern will verify through a match.
 *
 * This is a Pattern but since that's `any`, including in the typedef turns the
 * whole thing to `any`.
 *
 * @template T
 * @typedef {{ validatedType?: T }} TypedMatcher
 */

/**
 * @template {TypedMatcher<any>} TM
 * @typedef {TM extends TypedMatcher<infer T> ? T : never} MatchedType
 */
