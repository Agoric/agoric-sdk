import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { Far } from '@endo/marshal';
import {
  setupTestLiveslots,
  matchVatstoreGet,
  matchVatstoreSet,
  validate,
  validateDone,
  validateReturned,
} from './liveslots-helpers.js';
import { capargs } from './util.js';

function buildRootObject(vatPowers, vatParameters, baggage) {
  baggage.has('outside');
  baggage.init('outside', 'outer val');
  return Far('root', {
    doSomething() {
      baggage.get('outside');
      baggage.init('inside', 'inner val');
    },
  });
}

const NONE = undefined; // mostly just shorter, to maintain legibility while making prettier shut up

function stringVal(str) {
  return JSON.stringify({
    body: JSON.stringify(str),
    slots: [],
  });
}

function validateCreateBaggage(v, idx) {
  validate(v, matchVatstoreSet(`vc.${idx}.|nextOrdinal`, `1`));
  validate(v, matchVatstoreSet(`vc.${idx}.|entryCount`, `0`));
  const baggageSchema = JSON.stringify(
    capargs([{ '@qclass': 'tagged', tag: 'match:kind', payload: 'string' }]),
  );
  validate(v, matchVatstoreSet(`vc.${idx}.|schemata`, baggageSchema));
  validate(v, matchVatstoreSet(`vc.${idx}.|label`, 'baggage'));
  validate(v, matchVatstoreSet('baggageID', 'o+5/1'));
  validate(v, matchVatstoreGet('vom.rc.o+5/1', NONE));
  validate(v, matchVatstoreSet('vom.rc.o+5/1', '1'));
}

function validateSetup(v) {
  validate(v, matchVatstoreGet('idCounters', NONE));
  validate(v, matchVatstoreGet('storeKindIDTable', NONE));
  validate(
    v,
    matchVatstoreSet(
      'storeKindIDTable',
      '{"scalarMapStore":1,"scalarWeakMapStore":2,"scalarSetStore":3,"scalarWeakSetStore":4,"scalarDurableMapStore":5,"scalarDurableWeakMapStore":6,"scalarDurableSetStore":7,"scalarDurableWeakSetStore":8}',
    ),
  );
  validate(v, matchVatstoreGet('baggageID', NONE));
  validateCreateBaggage(v, 1);
}

test.serial('exercise baggage', async t => {
  const { v, dispatchMessage } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    true,
  );
  validateSetup(v);
  validate(v, matchVatstoreGet('vc.1.soutside', NONE));
  validate(v, matchVatstoreGet('vc.1.soutside', NONE));
  validate(v, matchVatstoreSet('vc.1.soutside', stringVal('outer val')));
  validate(v, matchVatstoreGet('vc.1.|entryCount', '0'));
  validate(v, matchVatstoreSet('vc.1.|entryCount', '1'));
  validateDone(v);

  const rp = await dispatchMessage('doSomething', capargs([]));
  validate(v, matchVatstoreGet('vc.1.soutside', stringVal('outer val')));
  validate(v, matchVatstoreGet('vc.1.sinside', NONE));
  validate(v, matchVatstoreSet('vc.1.sinside', stringVal('inner val')));
  validate(v, matchVatstoreGet('vc.1.|entryCount', '1'));
  validate(v, matchVatstoreSet('vc.1.|entryCount', '2'));
  validateReturned(v, rp);
  validate(v, matchVatstoreSet('idCounters'));
  validateDone(v);
});
