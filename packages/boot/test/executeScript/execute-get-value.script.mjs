/* global E powers */
/// <reference types="@agoric/smart-wallet/src/wallet-script-env" />

const { offers } = powers;

const getResultP = E(offers).executeOffer({
  id: 'get-value',
  invitationSpec: {
    source: 'agoricContract',
    instancePath: ['valueVow'],
    callPipe: [['makeGetterInvitation']],
  },
  proposal: {},
});

await getResultP;
