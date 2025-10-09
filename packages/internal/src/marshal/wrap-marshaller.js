// @ts-check

/**
 * @import {EOnly} from '@endo/eventual-send';
 * @import {Simplify} from '@endo/pass-style';
 * @import {Marshal} from '@endo/marshal';
 */

/**
 * A Marshaller which methods may be async. Use this type to indicate accepting
 * either a sync or async marshaller, usually through `E` eventual-sends.
 *
 * @template [Slot=unknown]
 * @typedef {Simplify<EOnly<Marshal<Slot>>>} EMarshaller
 */

export {};
