import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { M } from '@agoric/store';

import { cleanProposal } from '../../src/cleanProposal.js';
import { setup } from './setupBasicMints.js';
import buildManualTimer from '../../tools/manualTimer.js';

const proposeGood = (t, proposal, assetKind, expected) =>
  t.deepEqual(
    cleanProposal(harden(proposal), () => assetKind),
    expected,
  );

const proposeBad = (t, proposal, assetKind, message) =>
  t.throws(() => cleanProposal(harden(proposal), () => assetKind), {
    message,
  });

test('cleanProposal test', t => {
  const { moola, simoleans } = setup();

  proposeGood(
    t,
    {
      give: { Asset: simoleans(1n) },
      want: { Price: moola(3n) },
    },
    'nat',
    {
      give: { Asset: simoleans(1n) },
      want: { Price: moola(3n) },
      exit: { onDemand: null },
    },
  );
});

test('cleanProposal - all empty', t => {
  proposeGood(t, {}, 'nat', {
    give: harden({}),
    want: harden({}),
    exit: { onDemand: null },
  });

  proposeGood(
    t,
    {
      give: harden({}),
      want: harden({}),
      exit: { waived: null },
    },
    'nat',
    {
      give: harden({}),
      want: harden({}),
      exit: { waived: null },
    },
  );
});

test('cleanProposal - repeated brands', t => {
  const { moola, simoleans } = setup();
  const timer = buildManualTimer(t.log);

  proposeGood(
    t,
    {
      want: { Asset2: simoleans(1n) },
      give: { Price2: moola(3n) },
      exit: { afterDeadline: { timer, deadline: 100n } },
    },
    'nat',
    {
      want: { Asset2: simoleans(1n) },
      give: { Price2: moola(3n) },
      exit: { afterDeadline: { timer, deadline: 100n } },
    },
  );
});

test('cleanProposal - wrong assetKind', t => {
  const { moola, simoleans } = setup();
  const timer = buildManualTimer(t.log);

  proposeBad(
    t,
    {
      want: { Asset2: simoleans(1n) },
      give: { Price2: moola(3n) },
      exit: { afterDeadline: { timer, deadline: 100n } },
    },
    'set',
    /The amount .* did not have the assetKind of the brand .*/,
  );
});

test('cleanProposal - want patterns', t => {
  const { moola, simoleans } = setup();
  const timer = buildManualTimer(t.log);

  proposeGood(
    t,
    {
      want: { Asset2: M.any() },
      give: { Price2: moola(3n) },
      exit: { afterDeadline: { timer, deadline: 100n } },
    },
    'nat',
    {
      want: { Asset2: M.any() },
      give: { Price2: moola(3n) },
      exit: { afterDeadline: { timer, deadline: 100n } },
    },
  );

  proposeBad(
    t,
    {
      want: M.any(),
      give: { Price2: moola(3n) },
      exit: { afterDeadline: { timer, deadline: 100n } },
    },
    'nat',
    '"keywordRecord" "[match:any]" must be a pass-by-copy record, not "tagged"',
  );

  proposeBad(
    t,
    {
      want: { Asset2: simoleans(1n) },
      give: { Price2: M.any() },
      exit: { afterDeadline: { timer, deadline: 100n } },
    },
    'nat',
    'A passable tagged "match:any" is not a key: "[match:any]"',
  );

  proposeBad(
    t,
    {
      want: { Asset2: simoleans(1n) },
      give: { Price2: M.any() },
      exit: { afterDeadline: { timer, deadline: M.any() } },
    },
    'nat',
    'A passable tagged "match:any" is not a key: "[match:any]"',
  );
});

test('cleanProposal - other wrong stuff', t => {
  const { moola, simoleans } = setup();
  const timer = buildManualTimer(t.log);

  proposeBad(
    t,
    'foo',
    'nat',
    /"proposal" "foo" must be a pass-by-copy record, not "string"/,
  );
  proposeBad(
    t,
    { want: 'foo' },
    'nat',
    /"keywordRecord" "foo" must be a pass-by-copy record, not "string"/,
  );
  proposeBad(
    t,
    { give: 'foo' },
    'nat',
    /"keywordRecord" "foo" must be a pass-by-copy record, not "string"/,
  );
  proposeBad(
    t,
    { want: { lowercase: simoleans(1n) } },
    'nat',
    /keyword "lowercase" must be an ascii identifier starting with upper case./,
  );
  proposeBad(
    t,
    { give: { lowercase: simoleans(1n) } },
    'nat',
    /keyword "lowercase" must be an ascii identifier starting with upper case./,
  );
  proposeBad(
    t,
    { want: { 'Not Ident': simoleans(1n) } },
    'nat',
    /keyword "Not Ident" must be an ascii identifier starting with upper case./,
  );
  proposeGood(t, { give: { ['A'.repeat(100)]: simoleans(1n) } }, 'nat', {
    exit: { onDemand: null },
    give: { ['A'.repeat(100)]: simoleans(1n) },
    want: {},
  });
  proposeBad(
    t,
    { give: { ['A'.repeat(101)]: simoleans(1n) } },
    'nat',
    /keyword "A{101}" exceeded maximum length 100 characters; got 101/,
  );
  proposeBad(
    t,
    { what: { A: simoleans(1n) } },
    'nat',
    /.* - Must only have want:, give:, exit: properties: {"what":.*}/,
  );
  proposeBad(
    t,
    { [Symbol.for('what')]: { 'Not Ident': simoleans(1n) } },
    'nat',
    /cannot serialize Remotables with non-methods like "Symbol\(what\)" in {}/,
  );
  proposeBad(
    t,
    { want: { [Symbol.for('S')]: simoleans(1n) } },
    'nat',
    /cannot serialize Remotables with non-methods like "Symbol\(S\)" in {}/,
  );
  proposeBad(
    t,
    { exit: 'foo' },
    'nat',
    'proposal: exit: string "foo" - Must be a copyRecord',
  );
  proposeBad(
    t,
    { exit: { onDemand: 'foo' } },
    'nat',
    'proposal: exit: onDemand?: "foo" - Must be: null',
  );
  proposeBad(
    t,
    { exit: { afterDeadline: 'foo' } },
    'nat',
    // TODO The outer pattern is here only as a temporary measure to tolerate
    // the property order being sorted and not.
    /"foo" - Must be a copyRecord to match a copyRecord pattern: \{("deadline":.*|,|"timer":.*){3}\}/,
  );
  proposeBad(
    t,
    { exit: { afterDeadline: { timer: 'foo', deadline: 3n } } },
    'nat',
    'proposal: exit: afterDeadline?: timer: "foo" - Must match one of ["[match:remotable]","[match:kind]"]',
  );
  proposeBad(
    t,
    { exit: { afterDeadline: { timer, deadline: 'foo' } } },
    'nat',
    /proposal: exit: afterDeadline\?: deadline: "foo" - Must match/,
  );
  proposeBad(
    t,
    { exit: { afterDeadline: { timer, deadline: 3n, extra: 'foo' } } },
    'nat',
    // TODO The pattern is here only as a temporary measure to tolerate
    // the property order being sorted and not.
    /proposal: exit: afterDeadline\?: \{("deadline":"\[3n\]"|,|"extra":"foo"|,|"timer":"\[Alleged: ManualTimer\]"){5}\} - Must not have unexpected properties: \["extra"\]/,
  );
  proposeBad(
    t,
    { exit: { afterDeadline: { timer } } },
    'nat',
    'proposal: exit: afterDeadline?: {"timer":"[Alleged: ManualTimer]"} - Must have missing properties ["deadline"]',
  );
  proposeBad(
    t,
    { exit: { afterDeadline: { deadline: 3n } } },
    'nat',
    'proposal: exit: afterDeadline?: {"deadline":"[3n]"} - Must have missing properties ["timer"]',
  );
  proposeBad(
    t,
    { exit: { afterDeadline: { timer, deadline: 3 } } },
    'nat',
    /proposal: exit: afterDeadline\?: deadline: 3 - Must match/,
  );
  proposeBad(
    t,
    { exit: { afterDeadline: { timer, deadline: -3n } } },
    'nat',
    /proposal: exit: afterDeadline\?: deadline: "\[-3n\]" - Must match/,
  );
  proposeBad(t, { exit: {} }, 'nat', /exit {} should only have one key/);
  proposeBad(
    t,
    { exit: { onDemand: null, waived: null } },
    'nat',
    /exit {"onDemand":null,"waived":null} should only have one key/,
  );
  proposeBad(
    t,
    {
      want: { Asset: simoleans(1n) },
      give: { Asset: moola(3n) },
    },
    'nat',
    /a keyword cannot be in both 'want' and 'give'/,
  );
});
