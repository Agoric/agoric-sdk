import test from 'ava';
import {
  grokRebalanceScenarios,
  importText,
  parseCSV,
} from '../tools/rebalance-grok.ts';

test('parseCSV test utility', async t => {
  const text = await importText('./move-cases.csv', import.meta.url);
  const data = parseCSV(text);
  t.log('rows:', data.length);
  t.true(
    data.every(row => row.length === 11),
    'every row has cols A-K',
  );
  const [A, B, K] = [0, 1, 10];
  t.is(data[1][A], 'Description');
  t.is(data[0][B], 'Seat: Deposit');
  t.is(data[5][K], 'operation net');
});

test('grok description', async t => {
  const text = await importText('./rebalance-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  t.log(scenarios['Ask for 3 but get only USDN']);
  t.is(scenarios['Ask for 3 but get only USDN'].operationNet, '$0.00');
});

test('grok moves give', async t => {
  const text = await importText('./move-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  const { 'Open portfolio with USDN position': scenario } = scenarios;
  t.deepEqual(scenario.proposal.give, { Deposit: '$3,333.00' });
});

test.skip('grok give', async t => {
  const text = await importText('./rebalance-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  const { 'Ask for 3 but get only USDN': scenario } = scenarios;
  t.deepEqual(scenario.proposal.give, {
    Aave: '$3,333.00',
    Compound: '$3,333.00',
    USDN: '$3,333.00',
  });
});

test('grok empty flow move', async t => {
  const text = await importText('./move-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  const { 'Open empty portfolio': scenario } = scenarios;
  t.deepEqual(Object.keys(scenario.offerArgs || {}), []);
});

test('grok flow move', async t => {
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
    src: 'cosmos:noble-1:noble1deadbeef',
  });
});

test('grok after', async t => {
  const text = await importText('./rebalance-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  const { 'Ask for 3 but get only USDN': scenario } = scenarios;
  t.deepEqual(scenario.after, {
    USDN: '$3,333.00',
  });
});
