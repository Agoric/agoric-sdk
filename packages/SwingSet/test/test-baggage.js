import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { Far } from '@endo/marshal';
import {
  setupTestLiveslots,
  matchVatstoreDelete,
  matchVatstoreGet,
  matchVatstoreGetAfter,
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

const stringSchema = JSON.stringify(
  capargs([{ '@qclass': 'tagged', tag: 'match:kind', payload: 'string' }]),
);

const anyScalarSchema = JSON.stringify(
  capargs([
    {
      '@qclass': 'tagged',
      tag: 'match:scalar',
      payload: { '@qclass': 'undefined' },
    },
  ]),
);

function validateCreateBuiltInTable(v, idx, idKey, schema, label) {
  validate(v, matchVatstoreGet(idKey, NONE));
  validate(v, matchVatstoreSet(`vc.${idx}.|nextOrdinal`, `1`));
  validate(v, matchVatstoreSet(`vc.${idx}.|entryCount`, `0`));
  validate(v, matchVatstoreSet(`vc.${idx}.|schemata`, schema));
  validate(v, matchVatstoreSet(`vc.${idx}.|label`, label));
  validate(v, matchVatstoreSet(idKey, `o+6/${idx}`));
  validate(v, matchVatstoreGet(`vom.rc.o+6/${idx}`, NONE));
  validate(v, matchVatstoreSet(`vom.rc.o+6/${idx}`, '1'));
}

function validateCreatePromiseWatcherKindTable(v, idx) {
  validateCreateBuiltInTable(
    v,
    idx,
    'watcherTableID',
    anyScalarSchema,
    'promiseWatcherByKind',
  );
}

function validateCreateWatchedPromiseTable(v, idx) {
  validateCreateBuiltInTable(
    v,
    idx,
    'watchedPromiseTableID',
    stringSchema,
    'watchedPromises',
  );
}

function validateCreateBaggage(v, idx) {
  validateCreateBuiltInTable(v, idx, 'baggageID', stringSchema, 'baggage');
}

function validateCreateBuiltInTables(v) {
  validateCreateBaggage(v, 1);
  validateCreatePromiseWatcherKindTable(v, 2);
  validateCreateWatchedPromiseTable(v, 3);
}

function validateSetup(v) {
  validate(v, matchVatstoreGet('idCounters', NONE));
  validate(v, matchVatstoreGet('kindIDID', NONE));
  validate(v, matchVatstoreSet('kindIDID', '1'));
  validate(v, matchVatstoreGet('storeKindIDTable', NONE));
  validate(
    v,
    matchVatstoreSet(
      'storeKindIDTable',
      '{"scalarMapStore":2,"scalarWeakMapStore":3,"scalarSetStore":4,"scalarWeakSetStore":5,"scalarDurableMapStore":6,"scalarDurableWeakMapStore":7,"scalarDurableSetStore":8,"scalarDurableWeakSetStore":9}',
    ),
  );
  validateCreateBuiltInTables(v);
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
  validate(v, matchVatstoreGet('deadPromises', NONE));
  validate(v, matchVatstoreDelete('deadPromises'));
  validate(v, matchVatstoreGetAfter('', 'vc.3.', 'vc.3.{', [NONE, NONE]));
  validate(v, matchVatstoreGetAfter('', 'vom.dkind.', NONE, [NONE, NONE]));
  validateDone(v);

  const rp = await dispatchMessage('doSomething', []);
  validate(v, matchVatstoreGet('vc.1.soutside', stringVal('outer val')));
  validate(v, matchVatstoreGet('vc.1.sinside', NONE));
  validate(v, matchVatstoreSet('vc.1.sinside', stringVal('inner val')));
  validate(v, matchVatstoreGet('vc.1.|entryCount', '1'));
  validate(v, matchVatstoreSet('vc.1.|entryCount', '2'));
  validateReturned(v, rp);
  validate(v, matchVatstoreSet('idCounters'));
  validateDone(v);
});
