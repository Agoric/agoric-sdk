const kindHandle = label => `${label}_kindHandle`;
const singleton = label => `${label}_singleton`;

export const agoricVatDataKeys = {
  exoClass: label => harden([kindHandle(label)]),
  exoClassKit: label => harden([kindHandle(label)]),
  exo: label => harden([kindHandle(label), singleton(label)]),
};
harden(agoricVatDataKeys);
