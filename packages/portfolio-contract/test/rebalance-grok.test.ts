import test from 'ava';
import {
  grokRebalanceScenarios,
  importText,
  numeral,
  parseCSV,
  withBrand,
  type Dollars,
} from '../tools/rebalance-grok.ts';
import { makeOfferArgsShapes, type MovementDesc } from '../src/type-guards.ts';
import { Far } from '@endo/pass-style';
import { multiplyBy, parseRatio } from '@agoric/ertp/src/ratio.js';

test('parseCSV test utility', async t => {
  const text = await importText('./move-cases.csv', import.meta.url);
  const data = parseCSV(text);
  t.log('rows:', data.length);
  const problems = data.filter(row => row.length !== 12);
  t.deepEqual(problems, [], 'every row has cols A-L');
  const [A, B, L] = [0, 1, 11];
  t.is(data[1][A], 'Description');
  t.is(data[0][B], 'Seat: Deposit');
  t.is(data[5][L], 'operation net');
});

test('grok description', async t => {
  const text = await importText('./move-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  t.log(scenarios['Open portfolio with USDN position']);
  t.is(scenarios['Open portfolio with USDN position'].operationNet, '$0.00');
});

test('grok moves proposal', async t => {
  const text = await importText('./move-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  const { 'Open portfolio with USDN position': scenario } = scenarios;
  t.log(scenario.proposal);
  t.deepEqual(scenario.proposal, { give: { Deposit: '$3,333.00' }, want: {} });
  t.deepEqual(scenario.offerArgs?.flow, [
    {
      amount: '$3,333.00',
      dest: 'agoric.makeAccount()',
      src: 'Deposit',
    },
    {
      amount: '$3,333.00',
      dest: 'noble.makeAccount()',
      src: 'agoric.makeAccount()',
    },
    {
      amount: '$3,333.00',
      dest: {
        open: 'USDN',
      },
      src: 'noble.makeAccount()',
    },
  ]);
});

test('makeOfferArgs handles USDN scenario', async t => {
  const brand = Far('USDC') as unknown as Brand<'nat'>;
  const unit = harden({ brand, value: 1_000_000n });
  const $ = (amt: Dollars) => multiplyBy(unit, parseRatio(numeral(amt), brand));
  const shapes = makeOfferArgsShapes(brand);

  const text = await importText('./move-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  const { 'Open portfolio with USDN position': scenario } = scenarios;

  const x = withBrand(scenario, brand);

  const { offerArgs: args } = x;

  t.deepEqual('flow' in args && args.flow, [
    {
      src: 'Deposit',
      dest: 'agoric.makeAccount()',
      amount: $('$3,333.00'),
    },
    {
      src: 'agoric.makeAccount()',
      dest: 'noble.makeAccount()',
      amount: $('$3,333.00'),
    },
    {
      src: 'noble.makeAccount()',
      dest: { open: 'USDN' },
      amount: $('$3,333.00'),
    },
  ]);
});

test.skip('grok give', async t => {
  const text = await importText('./move-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  const { 'Open with 3 positions': scenario } = scenarios;
  t.deepEqual(scenario.proposal.give, {
    Desposit: '$10,000.00',
  });
});

test('grok empty flow of moves', async t => {
  const text = await importText('./move-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  const { 'Open empty portfolio': scenario } = scenarios;
  t.deepEqual(Object.keys(scenario.offerArgs || {}), []);
});

test('grok flow of 3 moves', async t => {
  const text = await importText('./move-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  const { 'Open portfolio with USDN position': scenario } = scenarios;
  t.deepEqual(scenario.proposal.give, { Deposit: '$3,333.00' });
  assert(
    'offerArgs' in scenario &&
      scenario.offerArgs &&
      'flow' in scenario.offerArgs,
  );
  t.log('flow', scenario.offerArgs.flow);
  t.is(scenario.offerArgs.flow.length, 3);
  t.deepEqual(scenario.offerArgs.flow.at(-1), {
    amount: '$3,333.00',
    dest: { open: 'USDN' },
    src: 'noble.makeAccount()',
  });
});

test('grok after, want', async t => {
  const text = await importText('./move-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  const { 'Withdraw some from Compound': scenario } = scenarios;
  t.log('scenario', scenario);
  t.deepEqual(scenario.after, {
    Aave: '$3,333.33',
    Compound: '$1,333.33',
    USDN: '$3,333.33',
  });
});
