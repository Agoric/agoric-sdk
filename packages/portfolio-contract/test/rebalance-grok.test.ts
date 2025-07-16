import { multiplyBy, parseRatio } from '@agoric/ertp/src/ratio.js';
import { Far } from '@endo/pass-style';
import test from 'ava';
import {
  grokRebalanceScenarios,
  importText,
  numeral,
  parseCSV,
  withBrand,
  type Dollars,
} from '../tools/rebalance-grok.ts';

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
  const description = 'Open portfolio with USDN position';
  t.log(description);
  t.is(scenarios[description].operationNet, '$0.00');
});

test('grok link to previous scenario', async t => {
  const text = await importText('./move-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  const s1 = scenarios['Withdraw some from Compound'];
  t.is(s1.previous, 'Open with 3 positions');
});

test('grok moves proposal', async t => {
  const text = await importText('./move-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  const { 'Open portfolio with USDN position': scenario } = scenarios;
  t.log(scenario.proposal);
  t.deepEqual(scenario.proposal, { give: { Deposit: '$5,000.00' }, want: {} });
  t.deepEqual(scenario.offerArgs?.flow, [
    {
      amount: '$5,000.00',
      dest: '@agoric',
      src: '<Deposit>',
    },
    {
      amount: '$5,000.00',
      dest: '@noble',
      src: '@agoric',
    },
    {
      amount: '$5,000.00',
      dest: 'USDN',
      src: '@noble',
    },
  ]);
});

test('withBrand handles USDN scenario', async t => {
  const brand = Far('USDC') as unknown as Brand<'nat'>;
  const unit = harden({ brand, value: 1_000_000n });
  const $ = (amt: Dollars) => multiplyBy(unit, parseRatio(numeral(amt), brand));

  const text = await importText('./move-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  const { 'Open portfolio with USDN position': scenario } = scenarios;

  const scenarioB = withBrand(scenario, brand);
  const { offerArgs: args } = scenarioB;

  t.deepEqual('flow' in args && args.flow, [
    {
      src: '<Deposit>',
      dest: '@agoric',
      amount: $('$5,000.00'),
    },
    {
      src: '@agoric',
      dest: '@noble',
      amount: $('$5,000.00'),
    },
    {
      src: '@noble',
      dest: 'USDN',
      amount: $('$5,000.00'),
    },
  ]);
  t.deepEqual(scenarioB.payouts, { Deposit: $('$0.00') });
});

test('withBrand adds fees for Compound', async t => {
  const brand = Far('USDC') as unknown as Brand<'nat'>;

  const text = await importText('./move-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  const { 'Aave -> Compound': scenario } = scenarios;

  const feeBrand = Far('BLD') as unknown as Brand<'nat'>;
  const { offerArgs } = withBrand(scenario, brand, feeBrand);
  assert('flow' in offerArgs);

  const step =
    offerArgs.flow.find(step => step.dest.startsWith('Compound')) ||
    assert.fail();
  t.truthy(step.fee);
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
  t.deepEqual(scenario.proposal.give, { Deposit: '$5,000.00' });
  assert(
    'offerArgs' in scenario &&
      scenario.offerArgs &&
      'flow' in scenario.offerArgs,
  );
  t.log('flow', scenario.offerArgs.flow);
  t.is(scenario.offerArgs.flow.length, 3);
  t.deepEqual(scenario.offerArgs.flow.at(-1), {
    amount: '$5,000.00',
    dest: 'USDN',
    src: '@noble',
  });
});

test('grok after, want', async t => {
  const text = await importText('./move-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  const description = 'Withdraw some from Compound';
  const { [description]: scenario } = scenarios;
  t.log('want', description, scenario.proposal.want);
  t.deepEqual(scenario.proposal.want, {
    Cash: '$2,000.00',
  });
  t.log('after', description, scenario.after);
  t.deepEqual(scenario.after, {
    Aave: '$3,333.33',
    Compound: '$1,333.33',
    USDN: '$3,333.33',
  });
});
