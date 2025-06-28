import test from 'ava';
import {
  grokRebalanceScenarios,
  importText,
  parseCSV,
} from '../tools/rebalance-grok.ts';

test('parseCSV test utility', async t => {
  const text = await importText('./rebalance-cases.csv', import.meta.url);
  const data = parseCSV(text);
  t.log('rows:', data.length);
  t.true(
    data.every(row => row.length === 7),
    'every row has cols A-G',
  );
  t.is(data[1][0], 'Description');
  t.is(data[0][1], 'Aave');
  t.is(data[6][4], 'positions net:');
});

test('grok description', async t => {
  const text = await importText('./rebalance-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  t.log(scenarios['Ask for 3 but get only USDN']);
  t.is(scenarios['Ask for 3 but get only USDN'].operationNet, '$0.00');
});

test('grok give', async t => {
  const text = await importText('./rebalance-cases.csv', import.meta.url);
  const scenarios = grokRebalanceScenarios(parseCSV(text));
  const { 'Ask for 3 but get only USDN': scenario } = scenarios;
  t.deepEqual(scenario.proposal.give, {
    Aave: '$3,333.00',
    Compound: '$3,333.00',
    USDN: '$3,333.00',
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
