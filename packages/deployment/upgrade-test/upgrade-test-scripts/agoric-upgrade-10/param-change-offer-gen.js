/* global process */

const assert = (cond, message) => {
  if (!cond) {
    throw new Error(message || 'check failed');
  }
};

const [_node, _script, previousOffer, deltaSec] = process.argv;
assert(previousOffer, 'previousOffer is required');
assert(deltaSec, 'deltaSec is required');

const id = `propose-${Date.now()}`;
const deadline = BigInt(Math.round(Date.now() / 1000 + Number(deltaSec)));

// vaultManager instance, IST brand, ATOM brand
const slots = ['board03850', 'board0257', 'board01547'];

const body = {
  method: 'executeOffer',
  offer: {
    id,
    invitationSpec: {
      invitationMakerName: 'VoteOnParamChange',
      previousOffer,
      source: 'continuing',
    },
    offerArgs: {
      deadline: `+${deadline}`,
      instance: '$0.Alleged: SEVERED: InstanceHandle',
      params: {
        DebtLimit: {
          brand: '$1.Alleged: SEVERED: IST brand',
          value: '+123000000000000',
        },
      },
      path: {
        paramPath: {
          key: {
            collateralBrand: '$2.Alleged: SEVERED: ATOM brand',
          },
        },
      },
    },
    proposal: {},
  },
};

const action = JSON.stringify({ body: `#${JSON.stringify(body)}`, slots });

console.log(action);
