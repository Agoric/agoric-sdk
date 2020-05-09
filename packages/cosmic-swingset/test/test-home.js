import { test } from 'tape-promise/tape';
import { makeFixture, E } from './captp-fixture';

// This runs before all the tests.
let home;
let teardown;
test('setup', async t => {
  try {
    const { homeP, kill } = makeFixture();
    teardown = kill;
    home = await homeP;
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

// Now come the tests that use `home`...
// =========================================

test('registry', async t => {
  try {
    const { registry } = E.G(home);
    const regVal = await E(registry).get('foolobr_19191');
    t.equals(regVal, undefined, 'random registry name is undefined');

    const target = 'something';
    const myRegKey = await E(registry).register('myname', target);
    t.equals(typeof myRegKey, 'string', 'registry key is string');

    const registered = await E(registry).get(myRegKey);
    t.equals(registered, target, 'registry registers target');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

// =========================================
// This runs after all the tests.
test('teardown', async t => {
  try {
    await teardown();
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
