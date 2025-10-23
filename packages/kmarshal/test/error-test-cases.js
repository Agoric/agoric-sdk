import { passStyleOf, toPassableError } from '@endo/marshal';

import { kser, makeError } from '../src/kmarshal.js';

/**
 * @import {ExecutionContext} from 'ava';
 */

/** @type {Record<string, (t: ExecutionContext) => void>} */
export const cases = {
  'kernel serialization of errors': t => {
    // The kernel synthesizes e.g. `Error('vat terminated')`, so we
    // need kmarshal to serialize those errors in a deterministic
    // way. This test checks that we don't get surprising things like
    // `errorId` or stack traces.
    const e1 = kser(Error('fake error'));
    const ref = {
      body: '#{"#error":"fake error","name":"Error"}',
      slots: [],
    };
    t.deepEqual(e1, ref);

    const e2 = makeError('fake error');
    t.deepEqual(e2, ref);
  },
  'kernel serialization of passable errors in deliveries': t => {
    // The kernel synthesizes e.g. `Error('vat-upgrade failure')`, and includes
    // it in arguments to deliveries, so we need kmarshal to serialize those
    // nested errors reliably. This test checks that we don't get surprising
    // behaviors like non-passable errors even when the kernel explicitly
    // coerce those to passable.
    const e1 = toPassableError(Error('fake nested error'));
    const methargs = ['someMethod', [e1]];
    const ref = {
      body: '#["someMethod",[{"#error":"fake nested error","name":"Error"}]]',
      slots: [],
    };
    t.deepEqual(kser(methargs), ref);
  },
  'kernel serialization of raw errors in deliveries': t => {
    // The kernel synthesizes e.g. `Error('vat-upgrade failure')`, and includes
    // it in arguments to deliveries, so we need kmarshal to serialize those
    // nested errors reliably. While the kernel coerces errors it synthesizes to
    // passable errors, here we check the behavior if it didn't.
    const e1 = Error('fake nested error');
    const methargs = ['someMethod', [e1]];

    try {
      t.is(passStyleOf(harden({ error: Error('sentinel') })), 'copyRecord');
      // If the above doesn't throw, raw errors are passable, or passStyle repairs them
      const ref = {
        body: '#["someMethod",[{"#error":"fake nested error","name":"Error"}]]',
        slots: [],
      };
      t.deepEqual(kser(methargs), ref);
    } catch {
      // If we threw, raw errors are not passable. We expect kser to throw as well

      t.throws(() => kser(methargs));
    }
  },
};
