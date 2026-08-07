import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import inviteInstrumentOracle, {
  parseInstrumentOracleArgs,
} from '../src/invite-instrument-oracle.ts';

const oracleAddress = 'agoric1f0h5zgxyg3euxsqzs0506uj4cmu56y30pqx46s' as const;

test('instrument oracle invitation supports four explicit modes', t => {
  t.deepEqual(parseInstrumentOracleArgs(['ymax0', '--send', '--accept']), {
    contract: 'ymax0',
    mode: 'send-and-accept',
  });
  t.deepEqual(
    parseInstrumentOracleArgs(['ymax0', '--send', '--to', 'agoric1operator']),
    {
      contract: 'ymax0',
      mode: 'send-only',
      oracleAddress: 'agoric1operator',
    },
  );
  t.deepEqual(
    parseInstrumentOracleArgs([
      'ymax1',
      '--generate',
      '--to',
      'agoric1operator',
      '--output',
      'invite.json',
    ]),
    {
      contract: 'ymax1',
      mode: 'generate-only',
      oracleAddress: 'agoric1operator',
      output: 'invite.json',
    },
  );
  t.deepEqual(parseInstrumentOracleArgs(['ymax1', '--accept']), {
    contract: 'ymax1',
    mode: 'accept-only',
  });
});

const makeDirectTools = (scriptArgs: string[]) => {
  const events: unknown[] = [];
  const creatorFacet = {
    deliverInstrumentOracleInvitation: async (...args: unknown[]) => {
      events.push(['send', ...args]);
    },
  };
  const makeAccount = async (name: string) => {
    events.push(['account', name]);
    return {
      address: name.endsWith('_CTRL') ? 'agoric1controller' : oracleAddress,
      store: {
        get: () => creatorFacet,
        saveOfferResult: async (...args: unknown[]) => {
          events.push(['accept', ...args]);
        },
      },
    };
  };
  return {
    events,
    tools: {
      scriptArgs,
      makeAccount,
      walletKit: {
        agoricNames: {
          instance: { postalService: 'postalService', ymax0: 'ymax0Instance' },
        },
      },
    } as never,
  };
};

test('send-and-accept retains the direct control-wallet flow', async t => {
  const { events, tools } = makeDirectTools(['ymax0', '--send', '--accept']);
  await inviteInstrumentOracle(tools);
  t.deepEqual(events, [
    ['account', 'YMAX0_INSTRUMENT_ORACLE'],
    ['account', 'YMAX0_CTRL'],
    ['send', oracleAddress, 'postalService'],
    [
      'accept',
      { instance: 'ymax0Instance', description: 'instrumentOracle' },
      'instrumentOracle',
    ],
  ]);
});

test('send-only does not open the oracle wallet', async t => {
  const { events, tools } = makeDirectTools([
    'ymax0',
    '--send',
    '--to',
    oracleAddress,
  ]);
  await inviteInstrumentOracle(tools);
  t.deepEqual(events, [
    ['account', 'YMAX0_CTRL'],
    ['send', oracleAddress, 'postalService'],
  ]);
});

test('accept-only does not open the control wallet', async t => {
  const { events, tools } = makeDirectTools(['ymax0', '--accept']);
  await inviteInstrumentOracle(tools);
  t.deepEqual(events, [
    ['account', 'YMAX0_INSTRUMENT_ORACLE'],
    [
      'accept',
      { instance: 'ymax0Instance', description: 'instrumentOracle' },
      'instrumentOracle',
    ],
  ]);
});
