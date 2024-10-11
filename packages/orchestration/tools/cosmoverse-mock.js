export const makeCosmosChain = (prefix, t) => {
  let nonce = 10;
  const balances = new Map();
  const whaleAddress = `${prefix}${(nonce += 1)}`;
  balances.set(whaleAddress, 1_000_000n);
  const { nextLabel: next } = t.context;

  const balanceOf = a => balances.get(a) || 0n;
  const burn = async ({ from, amount }) => {
    const fromPre = balanceOf(from);
    const fromPost = fromPre - amount;
    fromPost >= 0n || assert.fail(`${from} overdrawn: ${fromPre} - ${amount}`);
    balances.set(from, fromPost);
  };

  const mint = async ({ dest, amount }) => {
    const destPre = balanceOf(dest);
    const destPost = destPre + amount;
    balances.set(dest, destPost);
  };

  return harden({
    prefix,
    whaleAddress,
    makeAccount: async () => {
      const address = `${prefix}${(nonce += 1)}`;
      balances.set(address, 0);
      t.log('chain', prefix, 'makeAccount', address);
      return address;
    },
    getBalance: async dest => balances.get(dest),
    send: async ({ amount, from, dest, quiet = false }) => {
      t.true(dest.startsWith(prefix), dest);
      await burn({ from, amount });
      await mint({ dest, amount });
      const label = quiet ? '' : next();
      t.log(label, dest, 'balance +=', amount, '=', balances.get(dest));
    },
  });
};

export const pickChain = (chains, dest) => {
  const pfxLen = dest.indexOf('1');
  const pfx = dest.slice(0, pfxLen);
  const chain = chains[pfx];
  assert(chain, dest);
  return chain;
};

export const ibcTransfer = async (chains, { amount, from, dest, t }) => {
  const { nextLabel: next } = t.context;
  t.log(next(), 'ibc transfer', amount, 'to', dest);
  const chainSrc = pickChain(chains, from);
  const chainDest = pickChain(chains, dest);
  const burn = `${chainSrc.prefix}IBCburn`;
  const quiet = true;
  await chainSrc.send({ amount, from, dest: burn, quiet });
  await chainDest.send({ amount, from: chainDest.whaleAddress, dest, quiet });
};
