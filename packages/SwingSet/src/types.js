/**
 * see also docs/vat-worker.md
 */

/**
 * @typedef {Object} CapData
 * @property {string} body
 * @property {Array<string>} slots
 */

/**
 * @typedef {{
 *   method: string,
 *   args: CapData,
 *   result: string | null,
 * }} Message
 */

/**
 * @typedef { DeliveryMessage | DeliveryNotify } Delivery
 * @typedef { ['message', Reference, Message] } DeliveryMessage
 * @typedef { ['notify', PromiseReference, Resolution] } DeliveryNotify
 * vp is the current (final) promise data, rendered in vat form
 */

/**
 * @typedef { string } ObjectReference e.g. `o+13`
 * @typedef { string } PromiseReference e.g. `p-24`
 * @typedef { ObjectReference | PromiseReference } Reference
 */

/**
 * @typedef { ToPresence | ToData | Rejected } Resolution
 * @typedef {{ state: 'fulfilledToPresence', slot: ObjectReference }} ToPresence
 * @typedef {{ state: 'fulfilledToData', data: CapData }} ToData
 * @typedef {{ state: 'rejected', data: CapData }} Rejected
 */
