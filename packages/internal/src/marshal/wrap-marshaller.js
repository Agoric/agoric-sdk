// @ts-check
import { E } from '@endo/eventual-send';
import { Far } from '@endo/far';

/**
 * @import {EOnly} from '@endo/eventual-send';
 * @import {Simplify} from '@endo/pass-style';
 * @import {CapData, Passable, Marshal} from '@endo/marshal';
 * @import {ERemote} from '../types.js';
 */

/**
 * A Marshaller which methods may be async. Use this type to indicate accepting
 * either a sync or async marshaller, usually through `E` eventual-sends.
 *
 * @template [Slot=unknown]
 * @typedef {Simplify<EOnly<Marshal<Slot>>>} EMarshaller
 */

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

export const wrapRemoteMarshaller = wrapRemoteMarshallerDirectSend;
