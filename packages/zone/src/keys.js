/** @param {string} label */
const kind = label => `${label}_kindHandle`;
/** @param {string} label */
const singleton = label => `${label}_singleton`;

/** @type {Record<'exoClass' | 'exoClassKit' | 'exo', (label: string) => string[]>} */
export const agoricVatDataKeys = {
  exoClass: label => harden([kind(label)]),
  exoClassKit: label => harden([kind(label)]),
  exo: label => harden([kind(label), singleton(label)]),
};
harden(agoricVatDataKeys);
