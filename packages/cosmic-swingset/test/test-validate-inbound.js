import '@endo/init/debug.js';
import test from 'ava';
import { WALLET_SPEND_ACTION } from '../src/action-types.js';
import { validateWalletAction } from '../src/validate-inbound.js';

const makeWalletSpendAction = (actionBody, owner = 'agoric1foobar') => {
  const blockHeight = 7123456;
  const blockTime = Date.now();
  const type = WALLET_SPEND_ACTION;

  return harden({
    type,
    owner,
    spendAction: JSON.stringify({
      body: JSON.stringify(actionBody),
      slots: ['foo'],
    }),
    blockHeight,
    blockTime,
  });
};

const validBody = harden({
  method: 'executeOffer',
  offer: {
    id: Math.floor(Date.now()),
    invitationSpec: {
      instance: {
        '@qclass': 'slot',
        iface: 'Alleged: SEVERED: InstanceHandle',
        index: 0,
      },
      publicInvitationMaker: 'makeWantMintedInvitation',
      source: 'contract',
    },
    proposal: {
      give: {
        In: {
          brand: {
            '@qclass': 'slot',
            iface: 'Alleged: USDC_axl brand',
            index: 1,
          },
          value: {
            '@qclass': 'bigint',
            digits: '100000000',
          },
        },
      },
      want: {
        Out: {
          brand: {
            '@qclass': 'slot',
            iface: 'Alleged: IST brand',
            index: 2,
          },
          value: {
            '@qclass': 'bigint',
            digits: '100000000',
          },
        },
      },
    },
  },
});

const validEconomicCommitteeVote = harden({
  method: 'executeOffer',
  offer: {
    id: Math.floor(Date.now()),
    invitationSpec: {
      source: 'continuing',
      previousOffer: Math.floor(Date.now()) - 1000000,
      invitationMakerName: 'VoteOnParamChange',
    },
    offerArgs: {
      instance: {
        '@qclass': 'slot',
        index: 0,
        iface: 'Alleged: InstanceHandle',
      },
      params: {
        MintLimit: {
          brand: {
            '@qclass': 'slot',
            index: 1,
            iface: 'Alleged: IST brand',
          },
          value: {
            '@qclass': 'bigint',
            digits: '300000000000',
          },
        },
      },
      deadline: {
        '@qclass': 'bigint',
        digits: String(Math.floor(Date.now() / 1000) + 3600),
      },
    },
    proposal: {},
  },
});

const invalidKeyInBody = harden({
  method: 'executeOffer',
  offer: {
    id: Date.now(),
    someInvalidKey: 'foo',
  },
});

const makeDeeplyNestedBody = depth =>
  JSON.parse(
    // eslint-disable-next-line prefer-template
    '{"id":'.repeat(depth) + 'true' + '}'.repeat(depth),
  );

const allowValid = async (t, body, owner) => {
  const action = makeWalletSpendAction(body, owner);
  await t.notThrowsAsync(validateWalletAction(action));
};

test(
  'validateWalletAction - allow regular spend action',
  allowValid,
  validBody,
);
test(
  'validateWalletAction - allow economic committee action',
  allowValid,
  validEconomicCommitteeVote,
  'agoric1zayxg4e9vd0es9c9jlpt36qtth255txjp6a8yc',
);
test(
  'validateWalletAction - allow nested body up to a depth of 49',
  allowValid,
  makeDeeplyNestedBody(49),
);

const disallowInvalid = async (t, body, owner) => {
  const action = makeWalletSpendAction(body, owner);
  await t.throwsAsync(validateWalletAction(action));
};

test(
  'validateWalletAction - disallow invalid key in spend action',
  disallowInvalid,
  invalidKeyInBody,
);
test(
  'validateWalletAction - disallow economic committee action by non member',
  disallowInvalid,
  validEconomicCommitteeVote,
);
test(
  'validateWalletAction - disallow nested body with a depth of 50',
  disallowInvalid,
  makeDeeplyNestedBody(50),
);
