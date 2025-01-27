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

const makeOrchContract = (t: Ex, addr = 'agoric1orchFEED') => {
  return freeze({
    async receiveUpcall(amt: Coins) {
      t.log('orch contract received', amt);
    },
  });
};

const makeCosmosAccount = (t: Ex, addr: string, orch?: ReturnType<typeof makeOrchContract>) => {
  return freeze({
    async deposit(amt: Coins) {
      t.log('account received deposit', amt);
      if (addr === 'agoric1orchFEED' && orch) {
        await orch.receiveUpcall(amt);
      }
    },
  });
};

const makeUA = (t: Ex) => {
  return freeze({
    signAndBroadcast(t: Ex, amt: Coins, destAddr: string, memo = '') {
      const dest = makeCosmosAccount(t, destAddr);
      return dest.deposit(amt);
    },
  });
};

test('user sends 10 atom', async t => {
  const orch = makeOrchContract(t);
  const u1 = makeUA(t);
  const actual = await u1.signAndBroadcast(
    t,
    [{ denom: 'ATOM', amount: 10 }],
    'agoric1orchFEED',
  );
  t.is(actual, undefined);
});
