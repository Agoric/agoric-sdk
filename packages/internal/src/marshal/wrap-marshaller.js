// @ts-check
import { Fail, q } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/far';
import { PASS_STYLE } from '@endo/pass-style';
import { makeMarshal } from '@endo/marshal';
import { makeInaccessibleVal } from './inaccessible-val.js';

/**
 * @import {EOnly} from '@endo/eventual-send';
 * @import {RemotableObject, Simplify} from '@endo/pass-style';
 * @import {CapData, Passable, Marshal, MakeMarshalOptions} from '@endo/marshal';
 * @import {ERemote} from '../types.js';
 */

/**
 * A Marshaller which methods may be async. Use this type to indicate accepting
 * either a sync or async marshaller, usually through `E` eventual-sends.
 *
 * @template [Slot=unknown]
 * @typedef {Simplify<EOnly<Marshal<Slot>>>} EMarshaller
 */

const { slotToWrapper, wrapperToSlot } = (() => {
  /** @typedef {'Remotable' | `Alleged: ${string}`} InterfaceSpec */

  /** @template [Slot=unknown] */
  class SlotWrapper {
    /** @type {Slot} */
    #slot;

    /** @type {InterfaceSpec} */
    [Symbol.toStringTag];

    /**
     * @param {Slot} slot
     * @param {string} [iface]
     */
    constructor(slot, iface) {
      if (iface == null || iface === 'Remotable') {
        iface = 'Remotable';
      } else if (!iface.startsWith('Alleged: ')) {
        iface = `Alleged: ${iface}`;
      }
      this.#slot = slot;
      this[Symbol.toStringTag] = /** @type {InterfaceSpec} */ (iface);
    }

    /** @param {SlotWrapper} wrapper */
    static getSlot(wrapper) {
      return wrapper.#slot;
    }
  }
  Object.defineProperties(SlotWrapper.prototype, {
    [PASS_STYLE]: { value: 'remotable' },
    [Symbol.toStringTag]: { value: 'Alleged: SlotWrapper' },
  });
  Reflect.deleteProperty(SlotWrapper.prototype, 'constructor');
  harden(SlotWrapper);

  /**
   * @type {<Slot = unknown>(
   *   wrapper: SlotWrapper<Slot> & RemotableObject<InterfaceSpec>,
   * ) => Slot}
   */
  const getSlot = SlotWrapper.getSlot;

  return {
    /**
     * @template [Slot=unknown]
     * @param {Slot} slot
     * @param {string} [iface]
     */
    slotToWrapper: (slot, iface) =>
      /** @type {SlotWrapper<Slot> & RemotableObject<InterfaceSpec>} */ (
        harden(new SlotWrapper(slot, iface))
      ),

    wrapperToSlot: getSlot,
  };
})();

/**
 * @template [Slot=unknown] @typedef {ReturnType<typeof slotToWrapper<Slot>>}
 *   SlotWrapper
 */

/**
 * Wraps a marshaller, either sync or async, local or remote, into a local async
 * marshaller which only sends slots for resolution to the wrapped marshaller.
 *
 * Assumes that a null-ish slot value is a severed presence that can be resolved
 * locally.
 *
 * @template [Slot=unknown]
 * @param {ERemote<Pick<EMarshaller<Slot>, 'fromCapData' | 'toCapData'>>} marshaller
 * @param {MakeMarshalOptions} [marshalOptions]
 * @returns {ReturnType<typeof Far<EMarshaller<Slot>>>}
 */
export const wrapRemoteMarshallerSendSlotsOnly = (
  marshaller,
  {
    serializeBodyFormat = 'smallcaps',
    errorTagging = 'off', // Disable error tagging by default
    ...otherMarshalOptions
  } = {},
) => {
  const marshalOptions = harden({
    serializeBodyFormat,
    errorTagging,
    ...otherMarshalOptions,
  });
  // The implementation of this wrapped marshaller internally uses 2 marshallers
  // to transform the CapData into a Passable structure and vice-versa:
  // - A cap pass-through marshaller which places capabilities as-is in the slots.
  //   When unserializing CapData with null-ish slots, a severed presence is created.
  //   This pass-through marshaller is used to locally process the structure, and
  //   separate capabilities into a slots array for potential resolution by the
  //   wrapped marshaller.
  // - A "SlotWrapper" marshaller used to wrap into remotables the slots of the
  //   wrapped marshaller. When unserializing CapData, it is used to recreate
  //   CapData of a simple array of non-severed capabilities for resolution by
  //   the wrapped marshaller. When serializing to CapData, it allows extracting
  //   the slots from the capabilities array serialized by the wrapped marshaller.

  /** @type {Marshal<object | null>} */
  const passThroughMarshaller = makeMarshal(
    undefined,
    (slot, iface) => slot ?? makeInaccessibleVal(iface),
    marshalOptions,
  );

  /** @type {Map<Slot, SlotWrapper<NonNullable<Slot>>>} */
  const currentSlotToWrapper = new Map();

  const convertWrapperToSlot = /** @type {typeof wrapperToSlot<Slot>} */ (
    wrapperToSlot
  );
  /**
   * @param {Slot} slot
   * @param {string | undefined} [iface]
   */
  const convertSlotToWrapper = (slot, iface) => {
    if (slot == null) {
      // The wrapped marshaller may send us CapData with a null slot. These are not
      // meant to be considered equivalent with each other, so bypass mapping.
      return slotToWrapper(slot, iface);
    }
    let wrapper = currentSlotToWrapper.get(slot);
    if (!wrapper) {
      wrapper = slotToWrapper(slot, iface);
      currentSlotToWrapper.set(slot, wrapper);
    }

    return wrapper;
  };

  /** @type {Pick<Marshal<Slot>, 'toCapData' | 'fromCapData'>} */
  const slotWrapperMarshaller = makeMarshal(
    convertWrapperToSlot,
    convertSlotToWrapper,
    marshalOptions,
  );

  /**
   * Resolves an array of wrapped marshaller's slots to an array of
   * capabilities.
   *
   * This is used by `fromCapData` to map slots before using the pass-through
   * marshaller to recreate the passable data.
   *
   * @param {Slot[]} slots
   * @param {(index: number) => SlotWrapper<NonNullable<Slot>>} getWrapper
   * @returns {Promise<(object | null)[]>}
   */
  const mapSlotsToCaps = async (slots, getWrapper) => {
    let hasCap = false;
    const slotWrapperMappedSlots = harden(
      slots.map((slot, index) => {
        if (slot == null) return null;
        hasCap = true;
        return getWrapper(index);
      }),
    );
    if (!hasCap) return slotWrapperMappedSlots;

    const slotsOnlyCapData = slotWrapperMarshaller.toCapData(
      slotWrapperMappedSlots,
    );
    return E(marshaller).fromCapData(slotsOnlyCapData);
  };

  /**
   * Resolves an array of capabilities into an array of slots of the wrapped
   * marshaller.
   *
   * This is used by `toCapData` to map slots after the pass-through marshaller
   * has serialized the passable data.
   *
   * @param {object[]} caps
   * @returns {Promise<Slot[]>}
   */
  const mapCapsToSlots = async caps => {
    if (caps.length === 0) {
      return caps;
    }
    const mappedSlotsCapData = await E(marshaller).toCapData(caps);
    try {
      /** @type {SlotWrapper<Slot>[]} */
      const slotWrapperMappedSlots =
        slotWrapperMarshaller.fromCapData(mappedSlotsCapData);
      return slotWrapperMappedSlots.map(slotWrapper =>
        convertWrapperToSlot(slotWrapper),
      );
    } finally {
      // We're done with the slotWrapperMarshaller, clear its state
      currentSlotToWrapper.clear();
    }
  };

  /**
   * Unfortunately CapData only contains iface information for slotted
   * capabilities nested inside the body, which means we need to process the
   * body to extract it. Maybe in the future CapData could be extended to carry
   * this separately. See https://github.com/endojs/endo/issues/2991
   *
   * Since this helper is used internally to ultimately provide SlotWrapper
   * objects to the corresponding marshaller, and that we use the same
   * marshaller to extract the iface information, directly return the full
   * SlotWrapper object instead of just the iface.
   *
   * @param {CapData<Slot>} data
   */
  const makeIfaceExtractor = data => {
    const { slots } = data;
    /** @param {number} index */
    const getWrapper = index => {
      const slot = slots[index];
      let wrapper = currentSlotToWrapper.get(slot);
      if (!wrapper) {
        void slotWrapperMarshaller.fromCapData(data);
      }
      wrapper = currentSlotToWrapper.get(slot);
      if (!wrapper) {
        throw Fail`Marshaller didn't create wrapper for slot ${q(slot)} (index=${q(index)})`;
      }
      return wrapper;
    };

    return getWrapper;
  };

  /**
   * @param {Passable} val
   * @returns {Promise<CapData<Slot>>}
   */
  const toCapData = async val => {
    const capData = passThroughMarshaller.toCapData(val);
    const mappedSlots = await mapCapsToSlots(capData.slots);
    return harden({ ...capData, slots: mappedSlots });
  };

  /**
   * @param {CapData<Slot>} data
   * @returns {Promise<Passable>}
   */
  const fromCapData = async data => {
    const getWrapper = makeIfaceExtractor(data);
    await null;
    try {
      const mappedSlots = await mapSlotsToCaps(data.slots, getWrapper);
      return passThroughMarshaller.fromCapData({ ...data, slots: mappedSlots });
    } finally {
      currentSlotToWrapper.clear();
    }
  };

  return Far('wrapped remote marshaller', {
    toCapData,
    fromCapData,

    // for backwards compatibility
    /** @deprecated use toCapData */
    serialize: toCapData,
    /** @deprecated use fromCapData */
    unserialize: fromCapData,
  });
};

/**
 * @template [Slot=unknown]
 * @param {ERemote<Pick<EMarshaller<Slot>, 'fromCapData' | 'toCapData'>>} marshaller
 * @returns {ReturnType<typeof Far<EMarshaller<Slot>>>}
 */
export const wrapRemoteMarshallerDirectSend = marshaller => {
  /**
   * @param {Passable} val
   * @returns {Promise<CapData<Slot>>}
   */
  const toCapData = val => E(marshaller).toCapData(val);

  /**
   * @param {CapData<Slot>} data
   * @returns {Promise<Passable>}
   */
  const fromCapData = data => E(marshaller).fromCapData(data);

  return Far('wrapped remote marshaller', {
    toCapData,
    fromCapData,

    // for backwards compatibility
    /** @deprecated use toCapData */
    serialize: toCapData,
    /** @deprecated use fromCapData */
    unserialize: fromCapData,
  });
};

export const wrapRemoteMarshaller = wrapRemoteMarshallerSendSlotsOnly;
