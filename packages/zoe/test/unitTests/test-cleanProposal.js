// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { cleanProposal } from '../../src/cleanProposal';
import { setup } from './setupBasicMints';
import buildManualTimer from '../../tools/manualTimer';

test('cleanProposal test', t => {
  const { moola, simoleans } = setup();

  const proposal = harden({
    give: { Asset: simoleans(1) },
    want: { Price: moola(3) },
  });

  const expected = harden({
    give: { Asset: simoleans(1) },
    want: { Price: moola(3) },
    exit: { onDemand: null },
  });

  const actual = cleanProposal(proposal);

  t.deepEqual(actual, expected);
});

test('cleanProposal - all empty', t => {
  const proposal = harden({
    give: harden({}),
    want: harden({}),
    exit: { waived: null },
  });

  const expected = harden({
    give: harden({}),
    want: harden({}),
    exit: { waived: null },
  });

  // cleanProposal no longer fills in empty keywords
  t.deepEqual(cleanProposal(proposal), expected);
});

test('cleanProposal - repeated brands', t => {
  t.plan(3);
  const { moola, simoleans } = setup();
  const timer = buildManualTimer(console.log);

  const proposal = harden({
    want: { Asset2: simoleans(1) },
    give: { Price2: moola(3) },
    exit: { afterDeadline: { timer, deadline: 100n } },
  });

  const expected = harden({
    want: {
      Asset2: simoleans(1),
    },
    give: { Price2: moola(3) },
    exit: { afterDeadline: { timer, deadline: 100n } },
  });
  // cleanProposal no longer fills in empty keywords
  const actual = cleanProposal(proposal);
  t.deepEqual(actual.want, expected.want);
  t.deepEqual(actual.give, expected.give);
  t.deepEqual(actual.exit, expected.exit);
});
