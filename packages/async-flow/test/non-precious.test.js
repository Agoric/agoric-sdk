// eslint-disable-next-line import/order
import { test } from './prepare-test-env-ava.js';

import { M, makeCopyMap } from '@endo/patterns';
import { prepareVowTools } from '@agoric/vow';
import { makeHeapZone } from '@agoric/zone/heap.js';

import { prepareTestAsyncFlowTools } from './_utils.js';

const guestCreatedPromise = harden(Promise.resolve('guest-created'));

/**
 * @import {Zone} from '@agoric/base-zone'
 */

/**
 * @param {Zone} zone
 */
const prepareBadHost = zone =>
  zone.exoClass(
    'BadHost',
    M.interface('BadHost', {}, { defaultGuards: 'raw' }),
    () => ({}),
    {
      badMethod(_badArg = undefined) {
        return undefined;
      },
    },
  );

test('non-precious flow rejects outcome without recording failure', async t => {
  const zone = makeHeapZone('heapRoot');
  const vowTools = prepareVowTools(zone);
  const { asyncFlow, adminAsyncFlow } = prepareTestAsyncFlowTools(t, zone, {
    vowTools,
    panicHandler: e => {
      t.log('unexpected panic handler call', e);
      t.fail('panicHandler should not run for non-precious flows');
    },
  });
  const makeBadHost = prepareBadHost(zone);
  const { when } = vowTools;

  const { guestMethod } = {
    async guestMethod(badGuest) {
      t.is(badGuest.badMethod(), undefined);
      t.throws(() => badGuest.badMethod(guestCreatedPromise), {
        message:
          'In a Failed state: see getFailures() or getOptFatalProblem() for more information',
      });
      return 'bogus';
    },
  };

  const wrapperFunc = asyncFlow(zone, 'AsyncFlowNonPrecious', guestMethod, {
    precious: false,
  });

  const badHost = zone.makeOnce('badHost', () => makeBadHost());
  const outcomeV = wrapperFunc(badHost);
  const outcomeErr = await when(outcomeV).then(
    () => 'fulfilled',
    err => err,
  );

  t.true(outcomeErr instanceof Error);
  t.is(
    outcomeErr.message,
    '[3]: [0]: cannot yet send guest promises "[Promise]"',
  );
  t.deepEqual(adminAsyncFlow.getFailures(), makeCopyMap([]));
});
