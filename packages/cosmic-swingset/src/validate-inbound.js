import { assert, details as X } from '@agoric/assert';

import * as ActionType from './action-types.js';

const MAX_BODY_DEPTH = 50n;

const SMART_WALLET_BODY_KEYS = new Set([
  '',
  'brand',
  'digits',
  'give',
  'id',
  'iface',
  'In',
  'index',
  'instance',
  'invitationSpec',
  'method',
  'offer',
  'Out',
  'proposal',
  'publicInvitationMaker',
  '@qclass',
  'source',
  'value',
  'want',
]);

// From economicCommitteeAddresses in `decentral-main-psm-config.json`
const SMART_WALLET_EC_COMMITTEE = new Set(
  Object.values({
    'Jason Potts': 'agoric1gx9uu7y6c90rqruhesae2t7c2vlw4uyyxlqxrx',
    'Chloe White': 'agoric1d4228cvelf8tj65f4h7n2td90sscavln2283h5',
    'Thibault Schrepel': 'agoric14543m33dr28x7qhwc558hzlj9szwhzwzpcmw6a',
    'Chris Berg': 'agoric13p9adwk0na5npfq64g22l6xucvqdmu3xqe70wq',
    'Youssef Amrani': 'agoric1el6zqs8ggctj5vwyukyk4fh50wcpdpwgugd5l5',
    'Joe Clark': 'agoric1zayxg4e9vd0es9c9jlpt36qtth255txjp6a8yc',
  }),
);

export const validateWalletAction = async action => {
  if (SMART_WALLET_EC_COMMITTEE.has(action.owner)) {
    // The Economic Committee uses the smart wallet for governance votes
    // which have a less structured payload.
    return;
  }

  const actualAction =
    action.type === ActionType.WALLET_SPEND_ACTION
      ? action.spendAction
      : action.action;
  assert(
    actualAction !== undefined,
    X`Wallet action undefined for ${action.type}`,
  );
  const actualPayloadBody = JSON.parse(actualAction).body;

  assert.typeof(actualPayloadBody, 'string');
  assert(
    !actualPayloadBody.startsWith('#'),
    X`Unexpected smallcaps in smart wallet payload`,
  );

  let bodyMaxDepth = 0n;
  try {
    bodyMaxDepth = JSON.parse(
      actualPayloadBody,
      function reviverCheck(key, value) {
        if (!Array.isArray(this)) {
          assert(
            SMART_WALLET_BODY_KEYS.has(key),
            X`Unexpected key in smart wallet payload: ${key}`,
          );
        }

        switch (typeof value) {
          case 'object': {
            if (!value) return 0n;
            let maxChildDepth = 0n;

            for (const childDepth of Object.values(value)) {
              if (childDepth > maxChildDepth) {
                maxChildDepth = childDepth;
              }
            }
            return 1n + maxChildDepth;
          }
          case 'boolean':
          case 'number':
          case 'string':
            return 0n;
          default:
            assert.fail(X`Unexpected parsed type`);
        }
      },
    );
  } catch (err) {
    if (err.name === 'SyntaxError') {
      console.warn('Invalid smart wallet body', action, err);
    } else {
      throw err;
    }
  }

  assert(
    bodyMaxDepth < MAX_BODY_DEPTH,
    X`Smart wallet message body too deep: ${bodyMaxDepth}`,
  );
};
