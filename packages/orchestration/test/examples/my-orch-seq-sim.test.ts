/** @file
 * Orchestration Contract template: Test simulation from sequence diagram.
 *
 * For each (kind of) actor / participant in the diagram (my-orch-sequence.mmd),
 * we have a function to make one.
 *
 * Each arrow in the diagram represents a method call on the receiving object.
 */
import test from 'ava';
import type { ExecutionContext as Ex } from 'ava';

const { freeze } = Object;

type Coins = { denom: string; amount: number }[]; // XXX rough

const makeCosmosAccount = (t: Ex, addr: string) => {
  return freeze({
    async deposit(amt: Coins) {
      t.log('TODO: deposit', amt);
    },
  });
};

const makeUA = () => {
  return freeze({
    signAndBroadcast(t: Ex, amt: Coins, destAddr: string, memo = '') {
      const dest = makeCosmosAccount(t, destAddr);
      return dest.deposit(amt);
    },
  });
};

test('user sends 10 atom', async t => {
  const u1 = makeUA();
  const actual = await u1.signAndBroadcast(
    t,
    [{ denom: 'ATOM', amount: 10 }],
    'cosmos1567',
  );
  t.is(actual, undefined);
});
