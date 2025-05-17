import { test } from '../tools/prepare-test-env-ava.js';

import {
  legibilizeValue,
  legibilizeMethod,
  extractMethod,
  legibilizeMessageArgs,
} from '../src/lib/kdebug.js';

function testLegibilizeValue(t, body, slots, out) {
  t.is(out, legibilizeValue(JSON.parse(body), slots));
}

test('legibilizeValue behaves not unreasonably', t => {
  testLegibilizeValue(
    t,
    '{"@qclass":"slot","iface":"Alleged: fun","index":0}',
    ['ko26'],
    '@ko26',
  );
  testLegibilizeValue(
    t,
    '[{"@qclass":"undefined"},["hello!"]]',
    [],
    '[undefined, ["hello!"]]',
  );
  testLegibilizeValue(
    t,
    '["bootstrap",[{"alice":{"@qclass":"slot","iface":"Alleged: root","index":0},"bootstrap":{"@qclass":"slot","iface":"Alleged: root","index":1},"comms":{"@qclass":"slot","iface":"Alleged: root","index":2},"timer":{"@qclass":"slot","iface":"Alleged: root","index":3},"vatAdmin":{"@qclass":"slot","iface":"Alleged: root","index":4},"vattp":{"@qclass":"slot","iface":"Alleged: root","index":5}},{"vatAdmin":{"@qclass":"slot","iface":"Alleged: device","index":6}}]]',
    ['ko21', 'ko22', 'ko23', 'ko24', 'ko20', 'ko25', 'kd30'],
    '["bootstrap", [{alice: @ko21, bootstrap: @ko22, comms: @ko23, timer: @ko24, vatAdmin: @ko20, vattp: @ko25}, {vatAdmin: @kd30}]]',
  );
  testLegibilizeValue(
    t,
    '{"@qclass":"whacky","circular":true,"alignment":23,"flavor":"blue"}',
    [],
    '{@qclass: "whacky", circular: true, alignment: 23, flavor: "blue"}',
  );
  testLegibilizeValue(
    t,
    '{"@qclass":"slot","iface":"missing slot","index":0}',
    [],
    '@undefined',
  );

  const sneaky = {
    toString() {
      throw Error('take that you stupid machine');
    },
  };
  const foo = { '@qclass': 'symbol', name: sneaky };
  t.is(legibilizeValue(foo), '<unintelligible value>');

  t.is(legibilizeMethod(foo), '<unintelligible method>');

  const badCapdata = { body: 'bleagh!!' };
  t.is(extractMethod(badCapdata), '<unknown>');
  t.is(legibilizeMessageArgs(badCapdata), '<unintelligible message args>');
});
