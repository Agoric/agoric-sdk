import test from "ava";
import { termsWrapper } from "./termsWrapper.js";

test('wrapper-overrides-terms', t => {
  const terms = {
    timer: {
      src: 'chainTimerService',
    },
    issuers: { Moola: {}, Simolean: {} },
    brands: { Moola: {}, Simolean: {} },
  };

  const privateArgs = {
    storageNode: {},
    marshaller: {},
    electorateInvitation: {},
    timer: {
      src: 'manualTimerService',
    },
  };

  const overridenTerms = termsWrapper(terms, privateArgs);
  t.log(overridenTerms);

  t.deepEqual(overridenTerms, {
    ...terms,
    timer: { src: 'manualTimerService' }
  });
});

test.only('test-regex', t => {
  const testString = 'oracleAddresses: [\n' +
    '      "agoricNamesAdmin",\n' +
    '      "agoric180apa567ssxdc7a7vjqklnyfaq94uk3qe9g00j",\n' +
    '      "agoric1w5a2us973uatperzxdfpzzasgaanfgr2ywhhn9",\n' +
    '      "agoric144rrhh4m09mh7aaffhm6xy223ym76gve2x7y78",\n' +
    '      "agoric19d6gnr9fyp6hev4tlrg87zjrzsd5gzr5qlfq2p",\n' +
    '      "agoric1n4fcxsnkxe4gj6e24naec99hzmc4pjfdccy5nj",\n' +
    '    ],';

  const expected = 'oracleAddresses: [gov1, gov2]'

  const regex = /oracleAddresses: \[(.|\n)*\]/g
  const result = testString.replace(regex, expected);
  t.log(result);
  t.pass();
});