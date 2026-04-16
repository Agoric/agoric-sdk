// @ts-check

/**
 * @import {KeyMakers} from './types.js';
 */

/** @param {string} label */
const kind = label => `${label}_kindHandle`;

/** @param {string} label */
const singleton = label => `${label}_singleton`;

/**
 * KeyMakers compatible with `@agoric/vat-data`.
 *
 * @type {KeyMakers}
 */
export const agoricVatDataKeys = {
  exoClass: label => harden([kind(label)]),
  exoClassKit: label => harden([kind(label)]),
  exo: label => harden([kind(label), singleton(label)]),
  store: label => harden([label]),
  zone: label => harden([label]),
};
harden(agoricVatDataKeys);
