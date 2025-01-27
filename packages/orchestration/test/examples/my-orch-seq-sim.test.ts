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

const makeCosmosAccount = (addr: string) => {
  return freeze({
    getAddress: () => addr,
    async send(t: Ex, amt: Coins, dest: CosmosAccount) {
      t.log(addr, 'sending', amt, 'to', dest);
      dest.deposit(t, amt);
    },
    async deposit(t: Ex, amt: Coins) {
      t.log(addr, 'received', amt);
    },
  });
};
type CosmosAccount = ReturnType<typeof makeCosmosAccount>;

const makeLocalOrchAccount = (addr: string) => {
  const base = makeCosmosAccount(addr);
  let tap = false;
  const self = freeze({
    ...base,
    async monitorTransfers() {
      tap = true;
    },
    async deposit(t: Ex, amt: Coins) {
      base.deposit(t, amt);
      if (tap) {
        await self.receiveUpcall(t, amt);
      }
    },
    async receiveUpcall(t: Ex, amt: Coins) {
      t.log('orch hook received', amt);
      // Forward to stride chain
      await base.send(t, amt, makeCosmosAccount('stride123'));
    },
  });
  return self;
};

const makeOrchContract = async () => {
  const hookAcct = makeLocalOrchAccount('agoric1orchFEED');
  await hookAcct.monitorTransfers();
  return freeze({
    getHookAccount: async () => hookAcct,
  });
};

const makeUA = (orch: Awaited<ReturnType<typeof makeOrchContract>>) => {
  const myAcct = makeCosmosAccount('cosmos1xyz');
  const hookAcctP = orch.getHookAccount();

  const signAndBroadcast = async (
    t: Ex,
    amt: Coins,
    destAddr: string,
    memo = '',
  ) => {
    if (destAddr !== myAcct.getAddress()) throw Error('unsupported');
    const acct = await hookAcctP;
    return acct.deposit(t, amt);
  };

  const self = freeze({
    async openPosition(t: Ex, amt: Coins) {
      await signAndBroadcast(t, amt, await myAcct.getAddress());
    },
  });
  return self;
};

test('user opens a position with 10 ATOM', async t => {
  const orch = await makeOrchContract();
  const u1 = makeUA(orch);
  const actual = await u1.openPosition(t, [{ denom: 'ATOM', amount: 10 }]);
  t.is(actual, undefined);
});
