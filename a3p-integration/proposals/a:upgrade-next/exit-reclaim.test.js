import test from 'ava';
import { $ } from 'execa';
import { execFileSync } from 'node:child_process';
import { makeAgd, waitForBlock } from './synthetic-chain-excerpt.js';

const offerId = 'bad-invitation-16'; // cf. prepare.sh
const from = 'gov1';

test('exitOffer tool reclaims stuck payment', async t => {
  const showAndExec = (file, args, opts) => {
    console.log('$', file, ...args);
    return execFileSync(file, args, opts);
  };
  const agd = makeAgd({ execFileSync: showAndExec }).withOpts({
    keyringBackend: 'test',
  });

  const addr = await agd.lookup(from);
  t.log(from, 'addr', addr);

  const getBalance = async target => {
    const { balances } = await agd.query(['bank', 'balances', addr]);
    const { amount } = balances.find(({ denom }) => denom === target);
    return Number(amount);
  };

  const before = await getBalance('uist');
  t.log('uist balance before:', before);

  await $`node ./exitOffer.js --id ${offerId} --from ${from}`;

  await waitForBlock(2);
  const after = await getBalance('uist');
  t.log('uist balance after:', after);
  t.true(after > before);
});
