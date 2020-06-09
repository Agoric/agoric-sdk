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

test('home.registry', async t => {
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

test('home.board', async t => {
  try {
    const { board } = E.G(home);
    t.rejects(
      () => E(board).getValue('0000000000'),
      `getting a value for a fake id throws`,
    );

    const myValue = {};
    const myId = await E(board).getId(myValue);
    t.equals(typeof myId, 'string', `board key is string`);

    const valueInBoard = await E(board).getValue(myId);
    t.deepEquals(valueInBoard, myValue, `board contains myValue`);

    const myId2 = await E(board).getId(myValue);
    t.equals(myId2, myId, `board gives the same id for the same value`);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('home.mailboxAdmin', async t => {
  try {
    const { mailboxAdmin, wallet } = E.G(home);
    await E(wallet).makeEmptyPurse('moola', 'externalPurse');

    const purses = await E(wallet).getPurses();
    const purseMap = new Map(purses);
    const sourcePurse = purseMap.get('Fun budget');
    const externalPurse = purseMap.get('externalPurse');

    const issuers = await E(wallet).getIssuers();
    const issuersMap = new Map(issuers);
    const moolaIssuer = issuersMap.get('moola');
    const amountMath = await E(moolaIssuer).getAmountMath();

    t.deepEquals(
      await E(sourcePurse).getCurrentAmount(),
      await E(amountMath).make(1900),
      `balance starts at 1900`,
    );
    t.deepEquals(
      await E(externalPurse).getCurrentAmount(),
      await E(amountMath).make(0),
      `balance for external purse starts at 0`,
    );

    const moola50 = await E(amountMath).make(50);
    const payment = await E(sourcePurse).withdraw(moola50);
    const mailboxId = await E(mailboxAdmin).makeMailbox(externalPurse);

    // Someone else can get the mailbox given the id
    const result = await E(mailboxAdmin).sendPayment(mailboxId, payment);
    t.deepEquals(result, moola50, `result is 50 moola`);
    t.deepEquals(
      await E(externalPurse).getCurrentAmount(),
      moola50,
      `balance for external purse is 50 moola`,
    );
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
