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
type PFM = { to: string; action?: string } | undefined;

const makeCosmosAccount = (addr: string) => {
  return freeze({
    toString: () => `<${addr}>`,
    getAddress: () => addr,
    async send(t: Ex, amt: Coins, dest: CosmosAccount, fwd?: PFM) {
      t.log(addr, 'sending', amt, 'to', dest, fwd ? `fwd: ${JSON.stringify(fwd)}` : '');
      dest.deposit(t, amt, fwd);
    },
    async deposit(t: Ex, amt: Coins, fwd?: PFM) {
      t.log(addr, 'received', amt, fwd ? `fwd: ${JSON.stringify(fwd)}` : '');
    },
  });
};
type CosmosAccount = ReturnType<typeof makeCosmosAccount>;

const makeLocalOrchAccount = (addr: string, strideAddr: string) => {
  const base = makeCosmosAccount(addr);
  let tap = false;
  const self = freeze({
    ...base,
    async monitorTransfers() {
      tap = true;
    },
    async deposit(t: Ex, amt: Coins, fwd?: PFM) {
      await base.deposit(t, amt, fwd);
      if (tap) {
        await self.receiveUpcall(t, amt, { to: strideAddr });
      }
    },
    async receiveUpcall(t: Ex, amt: Coins, fwd?: PFM) {
      t.log('orch hook received', amt);
      // Send back to cosmos account first with forwarding instructions
      if (!fwd?.to) throw Error('forwarding address required');
      await base.send(t, amt, makeCosmosAccount(fwd.to), {
        to: 'stride123',
        action: 'to stATOM, send to ICA 145 on Elys'
      });
    },
  });
  return self;
};

const makeOrchContract = async () => {
  const strideAddr = 'stride123';
  const hookAcct = makeLocalOrchAccount('agoric1orchFEED', strideAddr);
  await hookAcct.monitorTransfers();
  return freeze({
    getHookAccount: async () => hookAcct,
    getStrideAddr: () => strideAddr,
  });
};

const makeUA = (orch: Awaited<ReturnType<typeof makeOrchContract>>) => {
  const myAcct = makeCosmosAccount('cosmos1xyz');
  const hookAcctP = orch.getHookAccount();
  const strideAddr = orch.getStrideAddr();

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
