import { test } from 'tape-promise/tape';
import { harden, makeCapTP } from '../lib/captp';

test('try disconnecting captp', async t => {
  try {
    const { dispatch, getBootstrap, disconnected } = makeCapTP('us', obj => {}, () => harden({}));
    const pr = t.rejects(getBootstrap(), Error, 'rejected after disconnect');
    disconnected();
    await pr;
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
