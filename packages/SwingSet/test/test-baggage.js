import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { Far } from '@endo/far';
import {
  setupTestLiveslots,
  matchVatstoreGet,
  matchVatstoreGetAfter,
  matchVatstoreSet,
  validate,
  validateDone,
  validateReturned,
} from './liveslots-helpers.js';
import { validateCreateBuiltInTables } from './gc-helpers.js';
import { vstr } from './util.js';

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
  validate(v, matchVatstoreSet('vc.1.soutside', vstr('outer val')));
  validate(v, matchVatstoreGet('vc.1.|entryCount', '0'));
  validate(v, matchVatstoreSet('vc.1.|entryCount', '1'));
  validate(v, matchVatstoreGet('deadPromises', NONE));
  validate(v, matchVatstoreGetAfter('', 'vom.dkind.', NONE, [NONE, NONE]));
  validateDone(v);

  const rp = await dispatchMessage('doSomething', []);
  validate(v, matchVatstoreGet('vc.1.soutside', vstr('outer val')));
  validate(v, matchVatstoreGet('vc.1.sinside', NONE));
  validate(v, matchVatstoreSet('vc.1.sinside', vstr('inner val')));
  validate(v, matchVatstoreGet('vc.1.|entryCount', '1'));
  validate(v, matchVatstoreSet('vc.1.|entryCount', '2'));
  validateReturned(v, rp);
  validate(v, matchVatstoreSet('idCounters'));
  validateDone(v);
});
