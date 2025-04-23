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

const makeStrideAccount = (addr: string) => {
  const base = makeCosmosAccount(addr);
  return freeze({
    ...base,
    async deposit(t: Ex, amt: Coins, fwd?: PFM) {
      await base.deposit(t, amt);
      // After receiving ATOM, send ack and convert to stATOM
      if (amt[0].denom === 'ATOM' && fwd?.action === 'Liquid Stake to stATOM') {
        const strideAmt = [{ denom: 'stATOM', amount: amt[0].amount * 0.9 }];
        // Send stATOM to user's Elys account
        await base.send(t, strideAmt, makeCosmosAccount(fwd.to));
      }
    },
  });
};

const makeCosmosAccount = (addr: string) => {
  const self = {
    toString: () => `<${addr}>`,
    getAddress: () => addr,
    async send(
      t: Ex,
      amt: Coins,
      dest: ReturnType<typeof makeCosmosAccount>,
      fwd?: PFM,
    ) {
      t.log(
        addr,
        'sending',
        amt,
        'to',
        `${dest}`,
        fwd ? `fwd: ${JSON.stringify(fwd)}` : '',
      );
      dest.deposit(t, amt, fwd);
    },
    async deposit(t: Ex, amt: Coins, fwd?: PFM) {
      t.log(addr, 'received', amt, fwd ? `fwd: ${JSON.stringify(fwd)}` : '');
      // If we have forwarding instructions, do so
      if (fwd) {
        const { to } = fwd;
        const dest = accountMaker(to)(to, 'stride123');
        await self.send(t, amt, dest);
      }
    },
    async getBalances(t: Ex): Promise<Coins> {
      t.log(addr, 'checking balances');
      return [{ denom: 'stATOM', amount: 9 }]; // Mock balance for demo
    },
  };
  return freeze(self);
};
type CosmosAccount = ReturnType<typeof makeCosmosAccount>;

const accountMaker = (to: string) =>
  to.startsWith('stride1')
    ? makeStrideAccount
    : to.startsWith('agoric1')
      ? makeLocalOrchAccount
      : makeCosmosAccount;

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
        await self.receiveUpcall(t, amt, fwd);
      }
    },
    async receiveUpcall(t: Ex, amt: Coins, fwd?: PFM) {
      t.log('orch hook received', amt);
      // Send back to cosmos account first with forwarding instructions
      await base.send(t, amt, makeStrideAccount(strideAddr), {
        to: 'elys145',
        action: 'Liquid Stake to stATOM',
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
    async openPosition(t: Ex, amt: Coins): Promise<Coins> {
      await signAndBroadcast(t, amt, await myAcct.getAddress());
      // Check final balance
      const destAcct = makeCosmosAccount('elsy176');
      t.log('checking final balance at', `${destAcct}`);
      const balance = await destAcct.getBalances(t);
      t.log('final balance:', balance);
      return balance;
    },
  });
  return self;
};

test('user opens a position with 10 ATOM', async t => {
  const orch = await makeOrchContract();
  const u1 = makeUA(orch);
  const balance = await u1.openPosition(t, [{ denom: 'ATOM', amount: 10 }]);
  t.deepEqual(balance, [{ denom: 'stATOM', amount: 9 }]);
});
