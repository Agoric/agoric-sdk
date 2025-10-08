import { encodeBech32 } from '@agoric/cosmic-proto/address-hooks.js';
import test from '@endo/ses-ava/prepare-endo.js';
import { GenerateAddress } from '../src/noble-fwd-calc.js';

test('GenerateAddress', t => {
  const tests = [
    {
      name: 'base case',
      channel: 'channel-337',
      recipient: 'agoric1yupasge4528pgkszg9v328x4faxtkldsnygwjl',
      fallback: '',
      expected: 'noble1fm7lamf365q2898096h7rk5d6z28ep9le72us3',
    },
    {
      name: 'user1',
      channel: 'channel-123',
      recipient: 'agoric1ydzxwh6f893jvpaslmaz6l8j2ulup9a7x8qvvq',
      fallback: 'noble18qlqfelxhe7tszqqprm2eqdpzt9s6ry025y3j5',
      expected: 'noble1jaa58lk8at2uxwhw2hwv28j454p9azqwh8phvm',
    },
    // ... more cases
  ] as const;

  for (const tc of tests) {
    const actual = GenerateAddress(tc.channel, tc.recipient, tc.fallback);
    t.is(actual.length, 20);

    t.is(encodeBech32('noble', actual), tc.expected);
  }
});
